//! Live CPU and memory figures straight from the Mach kernel — the same
//! counters Activity Monitor reads. Each call is a couple of syscalls; no
//! processes are spawned, so this is cheap enough to poll every few seconds.

use super::dto::{CpuDto, LiveMetricsDto, MemoryDto};
use super::sysctl;
use std::sync::{Mutex, OnceLock};
use std::time::{Duration, SystemTime, UNIX_EPOCH};

/// `mach_host_self()` hands out a new send right on every call; ask once.
#[allow(deprecated)]
fn host() -> libc::mach_port_t {
    static HOST: OnceLock<libc::mach_port_t> = OnceLock::new();
    // SAFETY: no arguments; returns the host port for this task.
    *HOST.get_or_init(|| unsafe { libc::mach_host_self() })
}

/// Cumulative ticks since boot: [user, system, idle, nice].
fn cpu_ticks() -> Option<[u64; 4]> {
    let mut info = libc::host_cpu_load_info { cpu_ticks: [0; 4] };
    let mut count = libc::HOST_CPU_LOAD_INFO_COUNT;
    // SAFETY: `info` is exactly HOST_CPU_LOAD_INFO_COUNT integers long, as the flavor requires.
    let rc = unsafe { libc::host_statistics(host(), libc::HOST_CPU_LOAD_INFO, (&mut info as *mut libc::host_cpu_load_info).cast(), &mut count) };
    if rc != libc::KERN_SUCCESS {
        return None;
    }
    let t = info.cpu_ticks;
    Some([
        t[libc::CPU_STATE_USER as usize] as u64,
        t[libc::CPU_STATE_SYSTEM as usize] as u64,
        t[libc::CPU_STATE_IDLE as usize] as u64,
        t[libc::CPU_STATE_NICE as usize] as u64,
    ])
}

static LAST_TICKS: Mutex<Option<[u64; 4]>> = Mutex::new(None);

/// CPU usage since the previous call. The very first call takes a second
/// sample 250 ms later, so it never reports the since-boot average.
fn cpu() -> Option<CpuDto> {
    let mut now = cpu_ticks()?;
    let mut last = LAST_TICKS.lock().ok()?;
    let prev = match *last {
        Some(p) => p,
        None => {
            let first = now;
            std::thread::sleep(Duration::from_millis(250));
            now = cpu_ticks()?;
            first
        }
    };
    *last = Some(now);

    let d: Vec<u64> = (0..4).map(|i| now[i].wrapping_sub(prev[i])).collect();
    let total = (d[0] + d[1] + d[2] + d[3]) as f64;
    if total <= 0.0 {
        return None;
    }
    let pct = |v: u64| (v as f64 / total * 1000.0).round() / 10.0;
    let user = pct(d[0] + d[3]);
    let system = pct(d[1]);
    let idle = pct(d[2]);
    Some(CpuDto {
        total: ((user + system) * 10.0).round().min(1000.0) / 10.0,
        user,
        system,
        idle,
        logical_cores: sysctl::read_u64("hw.logicalcpu"),
    })
}

#[repr(C)]
#[derive(Copy, Clone)]
struct XswUsage {
    total: u64,
    avail: u64,
    used: u64,
    pagesize: u32,
    encrypted: u32,
}

fn memory() -> Option<MemoryDto> {
    let total = sysctl::read_u64("hw.memsize")?;
    let page = sysctl::read_u64("hw.pagesize").unwrap_or(4096);

    // SAFETY: zeroed is a valid bit pattern for this plain-integer struct;
    // `count` tells the kernel how many 32-bit words it may write.
    let mut vm: libc::vm_statistics64 = unsafe { std::mem::zeroed() };
    let mut count = libc::HOST_VM_INFO64_COUNT;
    let rc = unsafe { libc::host_statistics64(host(), libc::HOST_VM_INFO64, (&mut vm as *mut libc::vm_statistics64).cast(), &mut count) };
    if rc != libc::KERN_SUCCESS {
        return None;
    }

    let pages = |n: u64| n.saturating_mul(page);
    // Activity Monitor's definitions:
    //   App Memory = internal (anonymous) pages − purgeable pages
    //   Wired      = wired pages
    //   Compressed = pages occupied by the compressor
    //   Cached Files = file-backed (external) + purgeable pages
    let app = pages((vm.internal_page_count as u64).saturating_sub(vm.purgeable_count as u64));
    let wired = pages(vm.wire_count as u64);
    let compressed = pages(vm.compressor_page_count as u64);
    let cached = pages(vm.external_page_count as u64 + vm.purgeable_count as u64);
    let used = (app + wired + compressed).min(total);

    let pressure = sysctl::read::<i32>("kern.memorystatus_vm_pressure_level").and_then(|level| match level {
        1 => Some("normal".to_string()),
        2 => Some("warning".to_string()),
        4 => Some("critical".to_string()),
        _ => None,
    });
    let swap = sysctl::read::<XswUsage>("vm.swapusage");

    Some(MemoryDto {
        total_bytes: total,
        used_bytes: used,
        app_bytes: app,
        wired_bytes: wired,
        compressed_bytes: compressed,
        cached_bytes: cached,
        available_bytes: total.saturating_sub(used),
        pressure,
        swap_total_bytes: swap.map(|s| s.total),
        swap_used_bytes: swap.map(|s| s.used),
    })
}

pub fn now_ms() -> u64 {
    SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_millis() as u64).unwrap_or(0)
}

pub fn live_metrics() -> LiveMetricsDto {
    let now = now_ms();
    let boot = sysctl::boot_time_ms();
    LiveMetricsDto {
        sampled_at_ms: now,
        cpu: cpu(),
        memory: memory(),
        boot_time_ms: boot,
        uptime_secs: boot.filter(|b| *b <= now).map(|b| (now - b) / 1000),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn live_metrics_are_sane() {
        let m = live_metrics();
        println!("{m:#?}");
        let cpu = m.cpu.expect("cpu");
        assert!((0.0..=100.0).contains(&cpu.total));
        assert!(((cpu.user + cpu.system + cpu.idle) - 100.0).abs() < 1.0, "{cpu:?}");
        let mem = m.memory.expect("memory");
        assert!(mem.total_bytes > 1_000_000_000);
        assert!(mem.used_bytes > 0 && mem.used_bytes <= mem.total_bytes);
        assert_eq!(mem.used_bytes + mem.available_bytes, mem.total_bytes);
        assert!(m.uptime_secs.unwrap() > 0);
    }
}
