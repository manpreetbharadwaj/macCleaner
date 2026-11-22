//! A single, process-wide counter of "operations the updater must not
//! interrupt" — a full scan, a trash/delete batch, or an app uninstall.
//! The updater checks this immediately before it would start overwriting
//! the running app's own binary; anything already past that point (the
//! scan/trash commands themselves) is unaffected by an update becoming
//! available mid-run.

use std::sync::atomic::{AtomicUsize, Ordering};

static ACTIVE_OPERATIONS: AtomicUsize = AtomicUsize::new(0);

/// True while at least one guarded operation (scan, trash, uninstall) is
/// in flight on this process.
pub fn is_busy() -> bool {
    ACTIVE_OPERATIONS.load(Ordering::SeqCst) > 0
}

/// RAII guard: increments on creation, decrements on drop (including on
/// panic/early return), so a scan or trash command's whole body — however
/// it exits — is covered by a single `let _guard = busy::enter();` at its
/// top.
pub struct Guard;

impl Drop for Guard {
    fn drop(&mut self) {
        ACTIVE_OPERATIONS.fetch_sub(1, Ordering::SeqCst);
    }
}

pub fn enter() -> Guard {
    ACTIVE_OPERATIONS.fetch_add(1, Ordering::SeqCst);
    Guard
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Mutex;

    // The counter is a process-wide static, so these tests must not run
    // concurrently with each other (or with anything else touching it) —
    // a single mutex here forces cargo test to serialize just this module.
    static TEST_LOCK: Mutex<()> = Mutex::new(());

    #[test]
    fn not_busy_with_no_guards_held() {
        let _lock = TEST_LOCK.lock().unwrap();
        assert!(!is_busy());
    }

    #[test]
    fn busy_while_a_guard_is_held_then_not_busy_after_its_dropped() {
        let _lock = TEST_LOCK.lock().unwrap();
        assert!(!is_busy());
        {
            let _guard = enter();
            assert!(is_busy());
        }
        assert!(!is_busy());
    }

    #[test]
    fn nested_guards_keep_busy_true_until_the_outermost_is_dropped() {
        let _lock = TEST_LOCK.lock().unwrap();
        assert!(!is_busy());
        let outer = enter();
        let inner = enter();
        assert!(is_busy());
        drop(inner);
        assert!(is_busy(), "must still be busy while the outer guard is held");
        drop(outer);
        assert!(!is_busy());
    }
}
