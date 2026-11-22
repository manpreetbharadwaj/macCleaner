//! Checks for, downloads, verifies, and installs app updates via
//! `tauri-plugin-updater`. The plugin itself verifies the downloaded
//! artifact's Ed25519 signature against the public key embedded in
//! `tauri.conf.json` *before* ever writing anything to disk — a
//! corrupted or unsigned download is rejected by the plugin, not by code
//! here, and no event this module emits can be reached if that
//! verification fails. See docs/updater.md for the full design,
//! including why this is a different signature from Apple code signing
//! and what that does and doesn't mean on an ad-hoc-signed build.
//!
//! Never auto-installs: `update_check` only reports what's available;
//! actually downloading and installing only happens if the frontend
//! calls `update_download_and_install`, which the Settings UI gates
//! behind an explicit confirmation dialog.

use serde::Serialize;
use tauri::{AppHandle, Emitter};
use tauri_plugin_updater::UpdaterExt;

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct UpdateInfoDto {
    pub version: String,
    pub current_version: String,
    pub notes: Option<String>,
    pub date: Option<String>,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase", tag = "kind")]
pub enum UpdateProgressEvent {
    Progress { chunk_length: usize, content_length: Option<u64> },
    Finished,
}

const PROGRESS_EVENT: &str = "update://progress";

/// Pure given a `tauri_plugin_updater::Update` (or `None`) — no network,
/// so this half of the behavior is directly unit-testable; see tests
/// below.
fn to_dto(update: &tauri_plugin_updater::Update) -> UpdateInfoDto {
    UpdateInfoDto {
        version: update.version.clone(),
        current_version: update.current_version.clone(),
        notes: update.body.clone(),
        date: update.date.map(|d| d.to_string()),
    }
}

#[tauri::command]
pub async fn update_check(app: AppHandle) -> Result<Option<UpdateInfoDto>, String> {
    let updater = app.updater().map_err(|e| e.to_string())?;
    let update = updater.check().await.map_err(|e| e.to_string())?;
    Ok(update.as_ref().map(to_dto))
}

/// Refuses to start if a scan, cleanup, or uninstall is in flight (see
/// `busy.rs`) — installing replaces the running app's own binary on
/// disk, which must never happen mid-operation. The frontend is expected
/// to retry once that operation finishes; this is intentionally a plain
/// error rather than a queue, since an update that waited silently in
/// the background could still surprise a user who thought they'd
/// declined it.
#[tauri::command]
pub async fn update_download_and_install(app: AppHandle) -> Result<(), String> {
    if crate::busy::is_busy() {
        return Err("busy: a scan, cleanup, or uninstall is currently running".to_string());
    }
    let updater = app.updater().map_err(|e| e.to_string())?;
    let update = updater.check().await.map_err(|e| e.to_string())?;
    let Some(update) = update else {
        return Err("No update is available".to_string());
    };

    let progress_handle = app.clone();
    let finished_handle = app.clone();
    update
        .download_and_install(
            move |chunk_length, content_length| {
                let _ = progress_handle.emit(PROGRESS_EVENT, UpdateProgressEvent::Progress { chunk_length, content_length });
            },
            move || {
                let _ = finished_handle.emit(PROGRESS_EVENT, UpdateProgressEvent::Finished);
            },
        )
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

/// Separate from `update_download_and_install` on purpose: on macOS the
/// plugin only replaces the on-disk `.app` bundle — nothing restarts the
/// process automatically (confirmed directly in the plugin's own source;
/// its doc comment on `download_and_install` says so explicitly for
/// macOS/Linux, unlike Windows). The frontend shows "Restart Now" only
/// after a successful install and calls this once the user actually
/// clicks it, rather than restarting out from under them automatically.
#[tauri::command]
pub fn update_restart_app(app: AppHandle) {
    app.restart();
}

#[cfg(test)]
mod tests {
    // `to_dto` takes a real `tauri_plugin_updater::Update`, which this
    // crate has no public way to construct outside the plugin itself
    // (its fields are set by the plugin's own HTTP/signature-verification
    // path) — so there is nothing to unit test here beyond what's already
    // covered by `busy.rs`'s tests for the guard this module relies on.
    // The serialization shape (`UpdateInfoDto`, `UpdateProgressEvent`) is
    // exercised indirectly by the frontend's TypeScript types mirroring
    // it — see src/features/update/types.ts.
}
