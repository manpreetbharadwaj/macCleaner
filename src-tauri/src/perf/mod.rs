//! Performance tab: live CPU/memory, running apps, battery, Mac and macOS
//! information. Everything is read locally from macOS; nothing here touches
//! the network or is written to disk. The frontend polls only while the
//! Performance screen is visible (see src/features/performance/usePerformancePolling.ts).

pub mod battery;
pub mod dto;
pub mod live;
pub mod processes;
pub mod sysctl;
pub mod system_info;
pub mod updates;

use dto::{BatteryDto, LiveMetricsDto, ProcessDetailsDto, ProcessListDto, SystemInfoDto, UpdateStatusDto};

// All commands are async + spawn_blocking: Tauri runs synchronous commands
// on the main thread, and none of this should ever stall the UI.

async fn blocking<T: Send + 'static>(f: impl FnOnce() -> T + Send + 'static) -> Result<T, String> {
    tauri::async_runtime::spawn_blocking(f).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn perf_system_info() -> Result<SystemInfoDto, String> {
    blocking(system_info::system_info).await
}

#[tauri::command]
pub async fn perf_live_metrics() -> Result<LiveMetricsDto, String> {
    blocking(live::live_metrics).await
}

#[tauri::command]
pub async fn perf_processes(include_system: bool) -> Result<ProcessListDto, String> {
    blocking(move || processes::list(include_system)).await
}

#[tauri::command]
pub async fn perf_process_details(pid: i32) -> Result<Option<ProcessDetailsDto>, String> {
    blocking(move || processes::details(pid)).await
}

/// `refresh_health` bypasses the 10-minute cache of Apple's battery health verdict (manual Refresh button).
#[tauri::command]
pub async fn perf_battery(refresh_health: bool) -> Result<Option<BatteryDto>, String> {
    blocking(move || battery::battery(refresh_health)).await
}

#[tauri::command]
pub async fn perf_update_status() -> Result<UpdateStatusDto, String> {
    blocking(updates::status).await
}

/// Opens System Settings → General → Software Update. Never installs anything itself.
#[tauri::command]
pub fn perf_open_software_update() -> Result<(), String> {
    std::process::Command::new("/usr/bin/open")
        .arg("x-apple.systempreferences:com.apple.Software-Update-Settings.extension")
        .spawn()
        .map(|_| ())
        .map_err(|e| e.to_string())
}

#[cfg(test)]
mod overhead {
    /// CPU time this process has consumed, in ms (user + system).
    fn cpu_ms() -> f64 {
        let mut u: libc::rusage = unsafe { std::mem::zeroed() };
        // SAFETY: fills `u` for the calling process.
        unsafe { libc::getrusage(libc::RUSAGE_SELF, &mut u) };
        let t = |tv: libc::timeval| tv.tv_sec as f64 * 1000.0 + tv.tv_usec as f64 / 1000.0;
        t(u.ru_utime) + t(u.ru_stime)
    }

    fn measure(name: &str, n: usize, mut f: impl FnMut()) -> f64 {
        f(); // warm up / prime
        let start = cpu_ms();
        let wall = std::time::Instant::now();
        for _ in 0..n {
            f();
        }
        let per = (cpu_ms() - start) / n as f64;
        println!("{name:<22} {per:>7.2} ms CPU per call ({:.1} ms wall)", wall.elapsed().as_secs_f64() * 1000.0 / n as f64);
        per
    }

    /// `cargo test --release --lib perf::overhead -- --ignored --nocapture`
    #[test]
    #[ignore]
    fn polling_cost() {
        let live = measure("live metrics", 20, || drop(super::live::live_metrics()));
        let procs = measure("process list", 10, || drop(super::processes::list(false)));
        let batt = measure("battery (cached health)", 10, || drop(super::battery::battery(false)));
        // Focused-window cadence: live every 2 s, processes every 3 s, battery every 30 s.
        let per_sec = live / 2.0 + procs / 3.0 + batt / 30.0;
        println!("=> average monitoring cost: {:.2} ms CPU per second = {:.2}% of one core", per_sec, per_sec / 10.0);
    }
}
