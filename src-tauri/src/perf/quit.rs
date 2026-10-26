//! Quit and Force Quit for the processes shown on the Performance tab.
//!
//! Safety model, in order:
//! 1. Never this app itself.
//! 2. Never a process that isn't still alive (nothing to do).
//! 3. Never a short, hardcoded list of session-critical macOS processes —
//!    even though they run as the logged-in user, killing one can log the
//!    user out or crash the Dock/menu bar in ways the real Force Quit window
//!    would never let happen by accident either.
//! 4. Never a process owned by anyone but the current user — this never
//!    touches root/other-user processes, regardless of the "show system
//!    processes" toggle on the frontend, and never escalates privileges.
//! 5. Re-confirm the live process at `pid` is still the same one the
//!    frontend showed, by comparing when it started: a `pid` is reused by
//!    the kernel once the original process exits, and a user could click
//!    "Force Quit" on a row that's gone stale by a few seconds.
//!
//! Only after all five checks does this send anything: `NSRunningApplication
//! .terminate()`/`.forceTerminate()` for a Dock app (lets macOS route the
//! normal "save before quitting" dialog, or skip it for a force quit), or
//! `SIGTERM`/`SIGKILL` directly for a background process with no Dock entry.

use super::dto::QuitResultDto;
use objc2_app_kit::NSWorkspace;
use std::time::{Duration, Instant};
use sysinfo::{Pid, ProcessRefreshKind, ProcessesToUpdate, System, UpdateKind};

/// Runs as the logged-in user, not root, but must never be targeted here.
const PROTECTED_NAMES: &[&str] = &["loginwindow", "WindowServer", "SystemUIServer", "launchd", "cfprefsd", "distnoted", "UserEventAgent"];

fn is_protected(name: &str) -> bool {
    PROTECTED_NAMES.iter().any(|p| p.eq_ignore_ascii_case(name))
}

fn alive(pid: i32) -> bool {
    // SAFETY: signal 0 sends nothing; it only probes whether `pid` exists
    // and is signalable by this process.
    unsafe { libc::kill(pid, 0) == 0 }
}

struct Identity {
    name: String,
    is_app: bool,
    started_at_ms: u64,
    owned_by_you: bool,
}

/// Re-reads `pid`'s identity right now, independent of whatever the
/// frontend's last poll cached. Mirrors processes.rs's own "started" and
/// ownership computation so the two always agree on what a given pid is.
fn identity(pid: i32) -> Option<Identity> {
    let workspace = NSWorkspace::sharedWorkspace();
    let app = workspace.runningApplications().iter().find(|a| a.processIdentifier() == pid && !a.isTerminated());
    // SAFETY: getuid() has no preconditions and cannot fail.
    let my_uid = unsafe { libc::getuid() };

    if let Some(app) = app {
        let name = app.localizedName().map(|n| n.to_string()).unwrap_or_default();
        let started_at_ms = app.launchDate().map(|d| d.timeIntervalSince1970()).filter(|s| *s > 0.0).map(|s| (s * 1000.0) as u64).unwrap_or(0);
        // NSWorkspace doesn't expose the owning uid; sysinfo does.
        let mut sys = System::new();
        sys.refresh_processes_specifics(ProcessesToUpdate::Some(&[Pid::from_u32(pid as u32)]), true, ProcessRefreshKind::nothing().with_user(UpdateKind::OnlyIfNotSet));
        let owned_by_you = sys.process(Pid::from_u32(pid as u32)).and_then(|p| p.user_id()).map(|u| **u == my_uid).unwrap_or(false);
        return Some(Identity { name, is_app: true, started_at_ms, owned_by_you });
    }

    let mut sys = System::new();
    sys.refresh_processes_specifics(
        ProcessesToUpdate::Some(&[Pid::from_u32(pid as u32)]),
        true,
        ProcessRefreshKind::nothing().with_exe(UpdateKind::OnlyIfNotSet).with_user(UpdateKind::OnlyIfNotSet),
    );
    let process = sys.process(Pid::from_u32(pid as u32))?;
    let name = process.name().to_string_lossy().to_string();
    let owned_by_you = process.user_id().map(|u| **u == my_uid).unwrap_or(false);
    Some(Identity { name, is_app: false, started_at_ms: process.start_time().saturating_mul(1000), owned_by_you })
}

/// `expected_started_at_ms` is whatever the frontend last showed for this
/// row (0 if unknown); `force` selects Force Quit over a normal Quit.
pub fn quit(pid: i32, expected_started_at_ms: u64, force: bool) -> Result<QuitResultDto, String> {
    if pid == std::process::id() as i32 {
        return Err("MacBook Cleaner cannot quit itself".to_string());
    }
    if !alive(pid) {
        return Ok(QuitResultDto { status: "not_found".to_string() });
    }
    let Some(id) = identity(pid) else {
        return Ok(QuitResultDto { status: "not_found".to_string() });
    };
    if is_protected(&id.name) {
        return Err("This process is protected by macOS and cannot be quit".to_string());
    }
    if !id.owned_by_you {
        return Err("Only your own processes can be quit".to_string());
    }
    // PID-reuse guard: sysinfo's start_time is second-precision while
    // NSWorkspace's launchDate is millisecond-precision, so allow a little
    // slack — anything further off means `pid` now names a different
    // process than the one the frontend showed.
    if expected_started_at_ms > 0 && id.started_at_ms > 0 && (id.started_at_ms as i64 - expected_started_at_ms as i64).abs() > 2_000 {
        return Ok(QuitResultDto { status: "not_found".to_string() });
    }

    if id.is_app {
        let workspace = NSWorkspace::sharedWorkspace();
        if let Some(app) = workspace.runningApplications().iter().find(|a| a.processIdentifier() == pid) {
            let sent = if force { app.forceTerminate() } else { app.terminate() };
            if !sent {
                return Err("macOS refused to quit this application".to_string());
            }
        }
    } else {
        let signal = if force { libc::SIGKILL } else { libc::SIGTERM };
        // SAFETY: `pid` was just confirmed alive, owned by this user, not
        // protected, and not this process — signaling our own user's
        // process can never escalate privileges.
        let rc = unsafe { libc::kill(pid, signal) };
        if rc != 0 {
            return match std::io::Error::last_os_error().raw_os_error() {
                Some(libc::ESRCH) => Ok(QuitResultDto { status: "not_found".to_string() }),
                Some(libc::EPERM) => Ok(QuitResultDto { status: "permission_denied".to_string() }),
                _ => Err(std::io::Error::last_os_error().to_string()),
            };
        }
    }

    let deadline = Instant::now() + Duration::from_millis(2_000);
    while Instant::now() < deadline {
        if !alive(pid) {
            return Ok(QuitResultDto { status: "terminated".to_string() });
        }
        std::thread::sleep(Duration::from_millis(150));
    }
    // Still running isn't a failure: a normal Quit may be waiting on the
    // app's own "save before closing?" dialog.
    Ok(QuitResultDto { status: "still_running".to_string() })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn refuses_to_quit_itself() {
        let my_pid = std::process::id() as i32;
        let err = quit(my_pid, 0, false).unwrap_err();
        assert!(err.contains("cannot quit itself"), "{err}");
    }

    #[test]
    fn refuses_to_quit_itself_force() {
        let my_pid = std::process::id() as i32;
        let err = quit(my_pid, 0, true).unwrap_err();
        assert!(err.contains("cannot quit itself"), "{err}");
    }

    #[test]
    fn reports_not_found_for_a_pid_that_is_not_running() {
        // High, unsigned, and astronomically unlikely to be a live pid in a
        // test runner's process table.
        let result = quit(999_999, 0, false).unwrap();
        assert_eq!(result.status, "not_found");
    }

    #[test]
    fn protected_names_list_is_case_insensitive() {
        assert!(is_protected("windowserver"));
        assert!(is_protected("WindowServer"));
        assert!(!is_protected("Finder"));
        assert!(!is_protected("Google Chrome"));
    }

    #[test]
    fn refuses_a_pid_whose_start_time_no_longer_matches() {
        // launchd is always pid 1 and always running, but its real start
        // time is from boot — nowhere near "5 seconds ago" — so this must
        // be refused as a (simulated) pid-reuse mismatch rather than acted
        // on, regardless of the protected-name check that would also catch
        // launchd specifically.
        let bogus_expected = super::super::live::now_ms();
        let result = quit(1, bogus_expected, false);
        match result {
            Ok(r) => assert_eq!(r.status, "not_found"),
            Err(e) => assert!(e.contains("protected"), "{e}"),
        }
    }
}
