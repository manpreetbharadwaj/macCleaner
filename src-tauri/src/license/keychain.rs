//! Thin wrapper around macOS Keychain generic passwords, used to store the
//! trial anchor and license credentials (see trial.rs and mod.rs).
//!
//! Deliberately Keychain and not `state.json` (see state.rs): a Keychain
//! item generally survives the app being deleted and reinstalled, since
//! macOS doesn't clean up Keychain entries on app uninstall. That's what
//! lets the trial anchor resist the single most obvious reset trick —
//! delete the app, redownload it, get a fresh trial — without fingerprinting
//! this Mac in any way; it's purely a side effect of using storage that
//! already outlives the app's own lifecycle.

use security_framework::passwords::{delete_generic_password, generic_password, set_generic_password, PasswordOptions};

pub fn read(service: &str, account: &str) -> Option<Vec<u8>> {
    generic_password(PasswordOptions::new_generic_password(service, account)).ok()
}

pub fn write(service: &str, account: &str, value: &[u8]) -> Result<(), String> {
    set_generic_password(service, account, value).map_err(|e| e.to_string())
}

/// Missing-item is not an error here — deactivating/clearing an already-clear item is a no-op.
pub fn clear(service: &str, account: &str) {
    let _ = delete_generic_password(service, account);
}
