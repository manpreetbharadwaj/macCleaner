//! Secondary, machine-wide trial anchor under `/Users/Shared/` — closes the
//! "create a new macOS user account to get a fresh 48-hour trial" gap
//! documented in `docs/trial-license-abuse-prevention.md` (Recommendation
//! 1). Every macOS user account has its own login Keychain, but
//! `/Users/Shared/` is one filesystem location every local account on the
//! same physical Mac can see.
//!
//! Strictly best-effort and fail-open: nothing here can ever make a Mac's
//! trial *longer* than the Keychain-only anchor in trial.rs already allows
//! on its own (see `reconcile` there — the authoritative start time is
//! always the *earliest* of whatever sources verify). Every failure mode
//! below (missing directory, read-only filesystem, permission denied,
//! corrupt content, a pre-existing symlink) falls back silently to
//! Keychain-only behavior — exactly what this app did before this file
//! existed. No permission prompt is ever triggered: `/Users/Shared` is
//! `drwxrwxrwt` (mode 1777, owner root:wheel) on stock macOS — world-
//! writable, no privilege elevation, verified directly on a real Mac rather
//! than assumed.
//!
//! Tamper resistance comes from two POSIX mechanisms, not from this code:
//! the directory's sticky bit means only a file's own owner (or root) can
//! ever delete or rename it out from under another user, and a file
//! created here at mode 0644 can only ever be *written* by the account that
//! created it — the kernel enforces both, so this module never needs to
//! check ownership itself.
//!
//! `default_path()` has two implementations gated by the `demo_identity`
//! Cargo feature (see `Cargo.toml`): the real `/Users/Shared` path, or an
//! isolated stand-in under the OS temp directory so a demo build can never
//! read, create, or alter the real machine-wide anchor. Everything else in
//! this file (the atomic-create, forced-permissions, and symlink-refusal
//! logic in `read_raw`/`write_raw`) is identical either way — only the path
//! differs.

use std::fs::{self, OpenOptions};
use std::io::{self, Read, Write};
use std::os::unix::fs::{OpenOptionsExt, PermissionsExt};
use std::path::{Path, PathBuf};

pub(super) const FILE_NAME: &str = ".com.macbookcleaner.trial-anchor";

/// The real, production, machine-wide anchor path. Not used at all when
/// the `demo_identity` feature is enabled — see `default_path()` below.
#[cfg(not(feature = "demo_identity"))]
pub(super) fn default_path() -> PathBuf {
    Path::new("/Users/Shared").join(FILE_NAME)
}

/// `demo_identity` build: an isolated stand-in under the OS temp
/// directory, never `/Users/Shared`, so a demo build can never read,
/// create, or alter the real machine-wide trial anchor. This is the one
/// piece of this module that genuinely differs between the two configs —
/// everything else in `shared_anchor.rs` (atomic create, forced
/// permissions, symlink refusal) applies identically either way.
#[cfg(feature = "demo_identity")]
pub(super) fn default_path() -> PathBuf {
    let dir = std::env::temp_dir().join("mbc-demo-shared-anchor");
    // Unlike `/Users/Shared` (always present on a real Mac), this stand-in
    // directory may not exist yet on a fresh checkout — create it so a
    // demo build works without a manual setup step, exactly once, and
    // only in this feature's own isolated location.
    if let Err(e) = fs::create_dir_all(&dir) {
        log::warn!("Could not create the demo shared-anchor directory {dir:?}: {e}");
    }
    dir.join(FILE_NAME)
}

/// `None` covers every failure mode on purpose (missing, a symlink instead
/// of a regular file, permission denied, any I/O error) — the caller
/// treats `None` exactly like "this anchor doesn't exist yet," never as a
/// hard error worth surfacing to the user.
pub(super) fn read_raw(path: &Path) -> Option<Vec<u8>> {
    let meta = fs::symlink_metadata(path).ok()?;
    if !meta.file_type().is_file() {
        log::warn!("Shared trial anchor at {path:?} is not a regular file — ignoring it");
        return None;
    }
    let mut f = OpenOptions::new().read(true).custom_flags(libc::O_NOFOLLOW).open(path).ok()?;
    let mut buf = Vec::new();
    f.read_to_end(&mut buf).ok()?;
    Some(buf)
}

/// Creates `path` (mode 0644, forced regardless of umask) if it doesn't
/// exist yet, or overwrites it in place if this process's user owns it.
///
/// Creation uses `O_CREAT | O_EXCL` (Rust's `create_new`), which is atomic
/// at the kernel level: if two processes race to create this file for the
/// first time (e.g. two near-simultaneous first launches), exactly one
/// wins and the other gets `AlreadyExists` and falls through to the
/// overwrite path below — there is no window where either sees a
/// half-written file. The same atomicity is what makes this safe against a
/// symlink planted at this path ahead of time: `O_CREAT | O_EXCL` fails
/// with `AlreadyExists` the instant *anything* (including a symlink) is
/// already there, so a planted symlink is never followed on creation.
///
/// If a different macOS user already owns the file, the final `open` call
/// below fails with `PermissionDenied` — enforced by the kernel via the
/// file's own 0644 bits (owner-write-only), not by anything this function
/// checks itself. The caller must treat that failure as "can't update it,
/// but it's still readable," not as an error to show the user.
pub(super) fn write_raw(path: &Path, bytes: &[u8]) -> io::Result<()> {
    match OpenOptions::new().write(true).create_new(true).mode(0o644).custom_flags(libc::O_NOFOLLOW).open(path) {
        Ok(mut f) => {
            f.write_all(bytes)?;
            // `.mode()` on create is `requested & !umask` at the kernel
            // level — force the exact bits afterward so a restrictive
            // umask can never make this file unreadable to other accounts,
            // which would silently defeat the entire point of this file.
            fs::set_permissions(path, fs::Permissions::from_mode(0o644))?;
            return Ok(());
        }
        Err(e) if e.kind() == io::ErrorKind::AlreadyExists => {}
        Err(e) => return Err(e),
    }

    let meta = fs::symlink_metadata(path)?;
    if !meta.file_type().is_file() {
        return Err(io::Error::new(io::ErrorKind::InvalidData, "refusing to write through a non-regular file at the shared trial anchor path"));
    }
    let mut f = OpenOptions::new().write(true).truncate(true).custom_flags(libc::O_NOFOLLOW).open(path)?;
    f.write_all(bytes)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    /// A fresh, disposable directory under the OS temp dir — never
    /// `/Users/Shared` itself, so these tests can never touch a production
    /// trial record. Each test gets its own directory (pid + nanos) so
    /// parallel test runs can't collide.
    fn unique_test_dir() -> PathBuf {
        let nanos = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos();
        let dir = std::env::temp_dir().join(format!("mbc-shared-anchor-test-{}-{nanos}", std::process::id()));
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn write_then_read_round_trips() {
        let dir = unique_test_dir();
        let path = dir.join("anchor");
        write_raw(&path, b"hello").unwrap();
        assert_eq!(read_raw(&path), Some(b"hello".to_vec()));
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn a_second_write_overwrites_in_place_when_we_own_the_file() {
        let dir = unique_test_dir();
        let path = dir.join("anchor");
        write_raw(&path, b"first").unwrap();
        write_raw(&path, b"second-value").unwrap();
        assert_eq!(read_raw(&path), Some(b"second-value".to_vec()));
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn created_file_is_world_readable_and_owner_write_only_regardless_of_umask() {
        let dir = unique_test_dir();
        let path = dir.join("anchor");
        write_raw(&path, b"x").unwrap();
        let mode = fs::metadata(&path).unwrap().permissions().mode() & 0o777;
        assert_eq!(mode, 0o644, "must be world-readable (so another macOS user account can see it) and owner-write-only (so only its creator can change it)");
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn a_missing_file_reads_as_none_not_an_error() {
        let dir = unique_test_dir();
        let path = dir.join("does-not-exist");
        assert_eq!(read_raw(&path), None);
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn a_symlink_at_the_path_is_never_followed_for_read_or_write() {
        let dir = unique_test_dir();
        let real_secret = dir.join("secret");
        fs::write(&real_secret, b"not a trial anchor").unwrap();
        let link_path = dir.join("anchor");
        std::os::unix::fs::symlink(&real_secret, &link_path).unwrap();

        assert_eq!(read_raw(&link_path), None, "must refuse to read through a pre-existing symlink");
        assert!(write_raw(&link_path, b"x").is_err(), "must refuse to write through a pre-existing symlink");
        assert_eq!(fs::read(&real_secret).unwrap(), b"not a trial anchor", "the symlink target must be left untouched");
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn concurrent_first_creation_is_atomic_the_loser_sees_already_exists() {
        // `create_new` maps to O_CREAT|O_EXCL, which the kernel guarantees
        // is atomic — this test can't literally race two OS threads against
        // the same syscall deterministically, but it does confirm the
        // property the atomicity depends on: a second create_new attempt
        // against an existing path always fails with `AlreadyExists`,
        // rather than silently truncating it (which would be the unsafe,
        // non-atomic alternative).
        let dir = unique_test_dir();
        let path = dir.join("anchor");
        write_raw(&path, b"winner").unwrap();
        let second = OpenOptions::new().write(true).create_new(true).mode(0o644).open(&path);
        assert!(matches!(second, Err(e) if e.kind() == io::ErrorKind::AlreadyExists));
        assert_eq!(read_raw(&path), Some(b"winner".to_vec()), "the loser's attempt must never alter the winner's content");
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    #[cfg(not(feature = "demo_identity"))]
    fn default_path_points_at_users_shared_not_a_per_user_location() {
        assert_eq!(default_path(), PathBuf::from("/Users/Shared").join(FILE_NAME));
    }

    #[test]
    #[cfg(feature = "demo_identity")]
    fn default_path_is_isolated_from_users_shared_in_a_demo_build() {
        // The exact property that makes demo_identity safe for the
        // filesystem anchor: a demo build's path must never equal, or sit
        // inside, the real production location.
        let path = default_path();
        assert_ne!(path, PathBuf::from("/Users/Shared").join(FILE_NAME));
        assert!(!path.starts_with("/Users/Shared"), "a demo build's shared-anchor path must never be under /Users/Shared: {path:?}");
    }
}
