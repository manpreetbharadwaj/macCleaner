//! Running apps and processes.
//!
//! - Which processes are user-facing apps comes from AppKit's
//!   `NSWorkspace.runningApplications` (the authoritative list behind the
//!   Dock and ⌘-Tab), not from guessing at paths.
//! - Per-process CPU is measured directly: each process's total CPU time
//!   (`proc_pidinfo` PROC_PIDTASKINFO, in Mach time units) is diffed against
//!   the previous sample and divided by the wall-clock interval. `sysinfo`
//!   is used only to enumerate processes (path, owner, start time, status).
//! - Memory is the physical footprint from `proc_pid_rusage` — the figure
//!   Activity Monitor's Memory column shows — falling back to resident size.
//!   macOS doesn't let a normal app read either for processes owned by other
//!   users (root etc.), so those are reported as None, never as 0.
//!
//! Helper processes that live inside an app's bundle (Chrome's renderers,
//! Electron helpers) are summed into that app, so "Google Chrome" shows what
//! Chrome as a whole is using.

use super::dto::{ProcessDetailsDto, ProcessEntryDto, ProcessListDto};
use super::live::now_ms;
use super::sysctl;
use objc2_app_kit::{NSApplicationActivationPolicy, NSWorkspace};
use std::collections::HashMap;
use std::path::Path;
use std::sync::{Mutex, OnceLock};
use std::time::{Duration, Instant};
use sysinfo::{Pid, ProcessRefreshKind, ProcessStatus, ProcessesToUpdate, System, UpdateKind};

struct Group {
    bundle_path: Option<String>,
    pids: Vec<i32>,
}

struct State {
    sys: System,
    groups: HashMap<i32, Group>,
    /// Total CPU time (ns) per pid at `cpu_sampled_at`.
    cpu_ns: HashMap<i32, u64>,
    cpu_sampled_at: Instant,
}

static STATE: Mutex<Option<State>> = Mutex::new(None);

#[derive(Clone, Copy, PartialEq, Eq)]
enum Policy {
    Regular,
    Other,
}

struct RunningApp {
    pid: i32,
    name: Option<String>,
    bundle_id: Option<String>,
    bundle_path: Option<String>,
    launch_ms: Option<u64>,
    active: bool,
    hidden: bool,
    policy: Policy,
}

fn running_apps() -> Vec<RunningApp> {
    let workspace = NSWorkspace::sharedWorkspace();
    let apps = workspace.runningApplications();
    let mut out = Vec::with_capacity(apps.count());
    for app in apps.iter() {
        if app.isTerminated() {
            continue;
        }
        let bundle_path = app
            .bundleURL()
            .and_then(|u| u.path())
            .map(|p| p.to_string())
            .filter(|p| p.ends_with(".app"));
        out.push(RunningApp {
            pid: app.processIdentifier(),
            name: app.localizedName().map(|n| n.to_string()).filter(|n| !n.is_empty()),
            bundle_id: app.bundleIdentifier().map(|b| b.to_string()),
            bundle_path,
            launch_ms: app.launchDate().map(|d| d.timeIntervalSince1970()).filter(|s| *s > 0.0).map(|s| (s * 1000.0) as u64),
            active: app.isActive(),
            hidden: app.isHidden(),
            policy: if app.activationPolicy() == NSApplicationActivationPolicy::Regular { Policy::Regular } else { Policy::Other },
        });
    }
    out
}

fn footprint(pid: i32) -> Option<u64> {
    // SAFETY: zeroed is valid for this plain-integer struct; the kernel
    // writes at most size_of::<rusage_info_v2>() bytes for flavor V2.
    let mut info: libc::rusage_info_v2 = unsafe { std::mem::zeroed() };
    let rc = unsafe { libc::proc_pid_rusage(pid, libc::RUSAGE_INFO_V2, (&mut info as *mut libc::rusage_info_v2).cast()) };
    (rc == 0 && info.ri_phys_footprint > 0).then_some(info.ri_phys_footprint)
}

fn task_info(pid: i32) -> Option<libc::proc_taskinfo> {
    // SAFETY: zeroed is valid for this plain-integer struct; PROC_PIDTASKINFO
    // writes exactly one proc_taskinfo when it succeeds (rc == size).
    let mut info: libc::proc_taskinfo = unsafe { std::mem::zeroed() };
    let size = std::mem::size_of::<libc::proc_taskinfo>() as i32;
    let rc = unsafe { libc::proc_pidinfo(pid, libc::PROC_PIDTASKINFO, 0, (&mut info as *mut libc::proc_taskinfo).cast(), size) };
    (rc == size).then_some(info)
}

fn thread_count(pid: i32) -> Option<u64> {
    task_info(pid).map(|i| i.pti_threadnum as u64).filter(|n| *n > 0)
}

/// Mach time units → nanoseconds (1:1 on Intel, 125:3 on Apple silicon).
#[allow(deprecated)]
fn timebase() -> (u64, u64) {
    static TB: OnceLock<(u64, u64)> = OnceLock::new();
    *TB.get_or_init(|| {
        let mut info = libc::mach_timebase_info { numer: 0, denom: 0 };
        // SAFETY: writes the two fields of `info`.
        let rc = unsafe { libc::mach_timebase_info(&mut info) };
        if rc != 0 || info.denom == 0 {
            (1, 1)
        } else {
            (info.numer as u64, info.denom as u64)
        }
    })
}

/// Total CPU time this process has used, in nanoseconds. None for processes macOS won't let us inspect.
fn cpu_time_ns(pid: i32) -> Option<u64> {
    let info = task_info(pid)?;
    let (numer, denom) = timebase();
    let ticks = info.pti_total_user.saturating_add(info.pti_total_system) as u128;
    Some((ticks * numer as u128 / denom as u128) as u64)
}

fn status_label(status: ProcessStatus) -> &'static str {
    match status {
        ProcessStatus::Run => "running",
        ProcessStatus::Sleep | ProcessStatus::Idle => "idle",
        ProcessStatus::Stop => "stopped",
        _ => "unknown",
    }
}

fn file_stem(path: &str) -> Option<String> {
    Path::new(path).file_stem().map(|s| s.to_string_lossy().to_string())
}

fn refresh(state: &mut State) {
    let kind = ProcessRefreshKind::nothing()
        .with_memory()
        .with_exe(UpdateKind::OnlyIfNotSet)
        .with_user(UpdateKind::OnlyIfNotSet);
    state.sys.refresh_processes_specifics(ProcessesToUpdate::All, true, kind);
}

#[derive(Default)]
struct Acc {
    cpu: f64,
    cpu_known: bool,
    memory: u64,
    memory_known: bool,
    pids: Vec<i32>,
}

pub fn list(include_system: bool) -> ProcessListDto {
    let mut guard = match STATE.lock() {
        Ok(g) => g,
        Err(poisoned) => poisoned.into_inner(),
    };
    if guard.is_none() {
        let mut state = State { sys: System::new(), groups: HashMap::new(), cpu_ns: HashMap::new(), cpu_sampled_at: Instant::now() };
        // Per-process CPU is a difference between two samples; take the first one now.
        refresh(&mut state);
        state.cpu_ns = state.sys.processes().keys().filter_map(|p| cpu_time_ns(p.as_u32() as i32).map(|t| (p.as_u32() as i32, t))).collect();
        state.cpu_sampled_at = Instant::now();
        std::thread::sleep(Duration::from_millis(300));
        *guard = Some(state);
    }
    let state = guard.as_mut().expect("initialized above");
    refresh(state);
    let sampled_at = Instant::now();
    let elapsed_ns = sampled_at.duration_since(state.cpu_sampled_at).as_nanos().max(1) as f64;
    let mut cpu_now: HashMap<i32, u64> = HashMap::new();

    let cores = sysctl::read_u64("hw.logicalcpu").unwrap_or(1).max(1) as f64;
    // SAFETY: getuid() has no preconditions and cannot fail.
    let my_uid = unsafe { libc::getuid() };
    let my_pid = std::process::id() as i32;

    let apps = running_apps();
    // Outermost bundles first, so a helper .app nested inside Chrome.app is grouped under Chrome.
    let mut leaders: Vec<&RunningApp> = apps.iter().filter(|a| a.bundle_path.is_some()).collect();
    leaders.sort_by_key(|a| a.bundle_path.as_ref().map(|p| p.len()).unwrap_or(usize::MAX));
    let by_pid: HashMap<i32, &RunningApp> = apps.iter().map(|a| (a.pid, a)).collect();

    let mut grouped: HashMap<i32, Acc> = HashMap::new();
    let mut singles: Vec<(i32, Acc)> = Vec::new();

    for (pid, process) in state.sys.processes() {
        let pid = pid.as_u32() as i32;
        if pid == 0 {
            continue; // kernel_task
        }
        let own = process.user_id().map(|u| **u == my_uid).unwrap_or(false);
        if !own && !include_system {
            continue;
        }
        let exe = process.exe().map(|p| p.to_string_lossy().to_string());
        let leader = exe.as_deref().and_then(|exe| {
            leaders.iter().find(|a| a.bundle_path.as_deref().is_some_and(|b| exe.starts_with(&format!("{b}/"))))
        });
        let mem = if own { footprint(pid).or_else(|| Some(process.memory()).filter(|m| *m > 0)) } else { Some(process.memory()).filter(|m| *m > 0) };
        let cpu_total = cpu_time_ns(pid);
        let cpu = match (cpu_total, state.cpu_ns.get(&pid)) {
            (Some(now), Some(prev)) if now >= *prev => Some((now - prev) as f64 / (elapsed_ns * cores) * 100.0),
            _ => None,
        };
        if let Some(t) = cpu_total {
            cpu_now.insert(pid, t);
        }

        let acc = match leader {
            Some(app) if state.sys.process(Pid::from_u32(app.pid as u32)).is_some() => grouped.entry(app.pid).or_default(),
            _ => {
                singles.push((pid, Acc::default()));
                &mut singles.last_mut().expect("just pushed").1
            }
        };
        if let Some(c) = cpu {
            acc.cpu += c;
            acc.cpu_known = true;
        }
        if let Some(m) = mem {
            acc.memory += m;
            acc.memory_known = true;
        }
        acc.pids.push(pid);
    }

    let mut entries = Vec::new();
    let mut groups = HashMap::new();
    let total_processes = state.sys.processes().len() as u32;

    let mut push = |leader_pid: i32, acc: Acc, app: Option<&RunningApp>| {
        let Some(process) = state.sys.process(Pid::from_u32(leader_pid as u32)) else { return };
        let own = process.user_id().map(|u| **u == my_uid).unwrap_or(false);
        let exe = process.exe().map(|p| p.to_string_lossy().to_string());
        let bundle_path = app.and_then(|a| a.bundle_path.clone());
        let kind = match app {
            Some(a) if a.policy == Policy::Regular => "app",
            _ if own => "background",
            _ => "system",
        };
        let name = app
            .and_then(|a| a.name.clone())
            .or_else(|| bundle_path.as_deref().and_then(file_stem))
            .or_else(|| exe.as_deref().and_then(|e| Path::new(e).file_name().map(|f| f.to_string_lossy().to_string())))
            .unwrap_or_else(|| process.name().to_string_lossy().to_string());
        let started = app.and_then(|a| a.launch_ms).or_else(|| Some(process.start_time() * 1000).filter(|t| *t > 0));
        let cpu = (acc.cpu * 10.0).round() / 10.0;
        entries.push(ProcessEntryDto {
            id: format!("{}:{leader_pid}", if kind == "app" { "app" } else { "proc" }),
            pid: leader_pid,
            name,
            kind: kind.to_string(),
            bundle_id: app.and_then(|a| a.bundle_id.clone()),
            bundle_path: bundle_path.clone(),
            cpu_percent: acc.cpu_known.then(|| cpu.clamp(0.0, 100.0)),
            memory_bytes: acc.memory_known.then_some(acc.memory),
            started_at_ms: started,
            process_count: acc.pids.len() as u32,
            is_active: app.map(|a| a.active).unwrap_or(false),
            is_hidden: app.map(|a| a.hidden).unwrap_or(false),
            is_self: acc.pids.contains(&my_pid),
            status: status_label(process.status()).to_string(),
        });
        groups.insert(leader_pid, Group { bundle_path, pids: acc.pids });
    };

    for (pid, acc) in grouped {
        let app = by_pid.get(&pid).copied();
        push(pid, acc, app);
    }
    for (pid, acc) in singles {
        let app = by_pid.get(&pid).copied();
        push(pid, acc, app);
    }

    state.groups = groups;
    state.cpu_ns = cpu_now;
    state.cpu_sampled_at = sampled_at;
    ProcessListDto { sampled_at_ms: now_ms(), entries, total_processes }
}

pub fn details(pid: i32) -> Option<ProcessDetailsDto> {
    let guard = STATE.lock().ok()?;
    let state = guard.as_ref()?;
    let process = state.sys.process(Pid::from_u32(pid as u32))?;
    // SAFETY: getuid() has no preconditions.
    let my_uid = unsafe { libc::getuid() };
    let group = state.groups.get(&pid);
    let pids: Vec<i32> = group.map(|g| g.pids.clone()).unwrap_or_else(|| vec![pid]);
    let threads: Vec<u64> = pids.iter().filter_map(|p| thread_count(*p)).collect();
    let bundle_version = group
        .and_then(|g| g.bundle_path.as_deref())
        .and_then(|b| plist::Value::from_file(Path::new(b).join("Contents/Info.plist")).ok())
        .and_then(|v| v.as_dictionary().and_then(|d| d.get("CFBundleShortVersionString")).and_then(|s| s.as_string()).map(str::to_string));

    Some(ProcessDetailsDto {
        pid,
        executable_path: process.exe().map(|p| p.to_string_lossy().to_string()),
        bundle_version,
        thread_count: (!threads.is_empty()).then(|| threads.iter().sum()),
        parent_pid: process.parent().map(|p| p.as_u32() as i32),
        owned_by_you: process.user_id().map(|u| **u == my_uid).unwrap_or(false),
        helper_pids: pids.into_iter().filter(|p| *p != pid).collect(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn lists_real_processes() {
        let list = super::list(false);
        let apps: Vec<_> = list.entries.iter().filter(|e| e.kind == "app").collect();
        for a in apps.iter().take(8) {
            println!("{:<28} cpu {:>5.1?}%  mem {:>10?}  procs {:>3}  started {:?}", a.name, a.cpu_percent, a.memory_bytes.map(|m| m / 1_000_000), a.process_count, a.started_at_ms);
        }
        assert!(list.total_processes > 10);
        assert!(list.entries.iter().all(|e| e.kind != "system"));
        let with_sys = super::list(true);
        assert!(with_sys.entries.len() > list.entries.len());
        if let Some(first) = list.entries.first() {
            assert!(details(first.pid).is_some());
        }
    }
}
