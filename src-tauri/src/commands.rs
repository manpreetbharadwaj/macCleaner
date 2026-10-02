use crate::dto::{
    AppFootprintDto, FullScanResultDto, PathAccessDto, ScanProgressEvent, ScanWarningDto,
    ScannedFileDto, StorageBreakdownDto, TrashInfoDto,
};
use crate::trash::{TrashOperationResult, TrashRequestItem};
use crate::{app_footprint, applications, browsers, dedup, developer, disk, login_item, scanner};
use crate::{schedule, state};
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter};
use tauri_plugin_notification::{NotificationExt, PermissionState};

const PROGRESS_EVENT: &str = "scan-progress";
const CLEANUP_PROGRESS_EVENT: &str = "cleanup-progress";

fn emit_progress(app: &AppHandle, phase: &str, label: &str, done: bool) {
    let _ = app.emit(
        PROGRESS_EVENT,
        ScanProgressEvent {
            phase: phase.to_string(),
            label: label.to_string(),
            done,
        },
    );
}

fn emit_cleanup_progress(app: &AppHandle, phase: &str, label: &str, done: bool) {
    let _ = app.emit(
        CLEANUP_PROGRESS_EVENT,
        ScanProgressEvent {
            phase: phase.to_string(),
            label: label.to_string(),
            done,
        },
    );
}

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

#[tauri::command]
pub fn get_system_overview() -> crate::dto::SystemOverviewDto {
    disk::get_system_overview()
}

#[tauri::command]
pub fn check_path_access(path: String) -> PathAccessDto {
    let state = scanner::path_access_state(Path::new(&path));
    PathAccessDto {
        path,
        state: state.to_string(),
    }
}

#[tauri::command]
pub fn reveal_in_finder(path: String) -> Result<(), String> {
    std::process::Command::new("open")
        .args(["-R", &path])
        .spawn()
        .map(|_| ())
        .map_err(|e| e.to_string())
}

/// Opens System Settings' Full Disk Access pane. We cannot grant this
/// permission programmatically — only the user can, in System Settings — so
/// this just takes them straight there instead of silently failing.
#[tauri::command]
pub fn open_full_disk_access_settings() -> Result<(), String> {
    std::process::Command::new("open")
        .arg("x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles")
        .spawn()
        .map(|_| ())
        .map_err(|e| e.to_string())
}

/// `include_movies` adds ~/Movies (large video files) for the interactive
/// Large Files view. The headless scheduled scan passes `false`: it only
/// estimates cache-style reclaimable space and has no use for video files.
pub(crate) fn scan_all_files(home: &PathBuf, include_movies: bool) -> (Vec<ScannedFileDto>, Vec<ScanWarningDto>) {
    let mut files = Vec::new();
    let mut warnings = Vec::new();

    let mut file_roots: Vec<(&str, &str, u64, usize, usize)> = vec![
        // (relative path, root label, min size bytes, max depth, max results)
        ("Downloads", "downloads", 1024 * 1024, 8, 800),
        ("Desktop", "desktop", 1024 * 1024, 8, 400),
        ("Documents", "documents", 1024 * 1024, 10, 600),
    ];
    if include_movies {
        file_roots.push(("Movies", "movies", 50 * 1024 * 1024, 6, 300));
    }

    for (relative, label, min_size, max_depth, max_results) in &file_roots {
        let root = home.join(relative);
        let (found, warning) =
            scanner::scan_candidate_files(&root, label, *max_depth, *min_size, *max_results);
        files.extend(found);
        if let Some(w) = warning {
            warnings.push(w);
        }
    }

    let cache_roots: &[(&str, &str, u64, usize)] = &[
        ("Library/Caches", "system-caches", 5 * 1024 * 1024, 60),
        ("Library/Logs", "system-logs", 2 * 1024 * 1024, 40),
    ];

    for (relative, label, min_size, max_results) in cache_roots {
        let root = home.join(relative);
        let (found, warning) = scanner::scan_top_level_sizes(&root, label, *min_size, *max_results);
        files.extend(found);
        if let Some(w) = warning {
            warnings.push(w);
        }
    }

    (files, warnings)
}

/// Phase order intentionally matches the existing Scan screen's fixed step
/// list (Analyzing storage → Developer data → Browsers → Applications →
/// Downloads & files → Building recommendations) so that UI is never
/// redesigned — only the timing driving it becomes real.
#[tauri::command]
pub async fn run_full_scan(app: AppHandle) -> Result<FullScanResultDto, String> {
    let home = dirs::home_dir().ok_or_else(|| "Could not determine home directory".to_string())?;

    emit_progress(&app, "overview", "Analyzing storage…", false);
    let overview = disk::get_system_overview();

    // The folder-size breakdown is the slowest part of a scan (it walks
    // every file in the major home folders), so it runs concurrently with
    // all the phases below instead of adding to them.
    let home_for_breakdown = home.clone();
    let breakdown_task = tauri::async_runtime::spawn_blocking(move || measure_home_folders(&home_for_breakdown));

    emit_progress(&app, "developer", "Scanning developer tooling…", false);
    let home_for_dev = home.clone();
    let developer_items = tauri::async_runtime::spawn_blocking(move || {
        developer::scan_developer_storage(&home_for_dev)
    })
    .await
    .map_err(|e| e.to_string())?;

    emit_progress(&app, "browsers", "Scanning browser caches…", false);
    let home_for_browsers = home.clone();
    let browser_items = tauri::async_runtime::spawn_blocking(move || {
        browsers::scan_browser_storage(&home_for_browsers)
    })
    .await
    .map_err(|e| e.to_string())?;

    emit_progress(&app, "applications", "Scanning installed applications…", false);
    let home_for_apps = home.clone();
    let application_items = tauri::async_runtime::spawn_blocking(move || {
        applications::scan_applications(&home_for_apps)
    })
    .await
    .map_err(|e| e.to_string())?;

    emit_progress(&app, "files", "Scanning Downloads, Desktop & Documents…", false);
    let home_for_files = home.clone();
    let (files, warnings) = tauri::async_runtime::spawn_blocking(move || scan_all_files(&home_for_files, true))
        .await
        .map_err(|e| e.to_string())?;
    let files = tauri::async_runtime::spawn_blocking(move || {
        let mut files = files;
        dedup::mark_duplicate_candidates(&mut files);
        files
    })
    .await
    .map_err(|e| e.to_string())?;

    emit_progress(&app, "finalizing", "Calculating reclaimable storage…", false);
    let folders = breakdown_task.await.map_err(|e| e.to_string())?;
    let applications_bytes: u64 = application_items.iter().map(|a| a.size_bytes).sum();
    let breakdown = folders.into_breakdown(applications_bytes, overview.used_bytes);
    emit_progress(&app, "finalizing", "Calculating reclaimable storage…", true);

    log::info!(
        "run_full_scan complete: {} files, {} developer items, {} browsers, {} applications, {} warnings",
        files.len(),
        developer_items.len(),
        browser_items.len(),
        application_items.len(),
        warnings.len(),
    );

    Ok(FullScanResultDto {
        overview,
        files,
        developer: developer_items,
        browsers: browser_items,
        applications: application_items,
        warnings,
        breakdown,
        scanned_at_ms: now_ms(),
    })
}

struct HomeFolderSizes {
    documents: u64,
    photos: u64,
    videos: u64,
    music: u64,
    downloads: u64,
    cache: u64,
    library_other: u64,
}

impl HomeFolderSizes {
    fn into_breakdown(self, applications_bytes: u64, used_bytes: u64) -> StorageBreakdownDto {
        let attributed = applications_bytes
            + self.documents
            + self.photos
            + self.videos
            + self.music
            + self.downloads
            + self.cache
            + self.library_other;
        StorageBreakdownDto {
            applications_bytes,
            documents_bytes: self.documents,
            photos_bytes: self.photos,
            videos_bytes: self.videos,
            music_bytes: self.music,
            downloads_bytes: self.downloads,
            cache_bytes: self.cache,
            library_other_bytes: self.library_other,
            system_data_bytes: used_bytes.saturating_sub(attributed),
        }
    }
}

/// Sizes the major home folders in parallel (one thread each). Unreadable
/// folders (no permission) count as 0 — their space is then honestly
/// reported under System Data rather than guessed at.
fn measure_home_folders(home: &Path) -> HomeFolderSizes {
    let size = |rel: &str| scanner::dir_allocated_size(&home.join(rel));
    std::thread::scope(|s| {
        let documents = s.spawn(|| size("Documents") + size("Desktop"));
        let photos = s.spawn(|| size("Pictures"));
        let videos = s.spawn(|| size("Movies"));
        let music = s.spawn(|| size("Music"));
        let downloads = s.spawn(|| size("Downloads"));
        let cache = s.spawn(|| size("Library/Caches") + size("Library/Logs"));
        let library_other = s.spawn(|| {
            let library = home.join("Library");
            std::fs::read_dir(&library)
                .map(|entries| {
                    entries
                        .flatten()
                        .filter(|e| {
                            let name = e.file_name();
                            name != "Caches" && name != "Logs"
                        })
                        .map(|e| scanner::dir_allocated_size(&e.path()))
                        .sum()
                })
                .unwrap_or(0)
        });
        HomeFolderSizes {
            documents: documents.join().unwrap_or(0),
            photos: photos.join().unwrap_or(0),
            videos: videos.join().unwrap_or(0),
            music: music.join().unwrap_or(0),
            downloads: downloads.join().unwrap_or(0),
            cache: cache.join().unwrap_or(0),
            library_other: library_other.join().unwrap_or(0),
        }
    })
}

/// Moves each requested item to the macOS Trash (never a permanent delete —
/// see trash.rs). One item's failure never aborts the rest: every item gets
/// its own validated attempt and its own result. Disk overview is captured
/// tightly before/after so the frontend can report "moved to Trash" and
/// "freed on disk" as the two distinct, honest numbers they are — moving a
/// file to Trash on the same volume does not free space until Trash is
/// emptied.
#[tauri::command]
pub async fn trash_items(app: AppHandle, items: Vec<TrashRequestItem>) -> Result<TrashOperationResult, String> {
    let home = dirs::home_dir().ok_or_else(|| "Could not determine home directory".to_string())?;
    let total = items.len();

    emit_cleanup_progress(&app, "preparing", "Preparing cleanup…", false);
    let overview_before = disk::get_system_overview();

    let mut results = Vec::with_capacity(total);
    for (index, item) in items.into_iter().enumerate() {
        emit_cleanup_progress(
            &app,
            "moving",
            &format!("Processing {} of {total}: {}", index + 1, item.name),
            false,
        );
        let home_for_item = home.clone();
        let result = tauri::async_runtime::spawn_blocking(move || {
            crate::trash::trash_single_item(&home_for_item, &item)
        })
        .await
        .map_err(|e| e.to_string())?;
        results.push(result);
    }

    emit_cleanup_progress(&app, "verifying", "Verifying results…", false);
    let overview_after = disk::get_system_overview();
    emit_cleanup_progress(&app, "done", "Cleanup complete.", true);

    let success_count = results.iter().filter(|r| r.success).count();
    let failure_count = results.len() - success_count;
    log::info!(
        "trash_items complete: {} requested, {success_count} succeeded, {failure_count} failed",
        results.len(),
    );

    Ok(TrashOperationResult {
        results,
        overview_before,
        overview_after,
    })
}

/// Returns the full persisted app-state blob (settings/schedule/history/
/// scanEvents) — see state.rs. The frontend owns the shape; Rust only reads
/// a handful of fields out of it for the background scan job.
#[tauri::command]
pub fn get_app_state() -> serde_json::Value {
    state::load_state()
}

/// Persists the full app-state blob as-is (last-writer-wins — the frontend
/// always sends its complete current copy, matching how it previously
/// wrote the whole blob to localStorage in one shot).
#[tauri::command]
pub fn save_app_state(state: serde_json::Value) -> Result<(), String> {
    crate::state::save_state(&state)
}

/// Installs/replaces the LaunchAgent for the given frequency + time-of-day
/// and returns the freshly computed `nextRunAt` (RFC3339) so the UI can
/// show a real value immediately, without waiting for a background run.
#[tauri::command]
pub fn install_schedule(frequency: String, time_of_day: String) -> Result<String, String> {
    schedule::install(&frequency, &time_of_day)?;
    let next = schedule::calculate_next_run_at(&frequency, &time_of_day, chrono::Local::now())
        .map(|d| d.to_rfc3339())
        .ok_or_else(|| "Could not compute next run time".to_string())?;
    Ok(next)
}

/// Unloads and removes the LaunchAgent (called when the user disables
/// scheduling). Safe to call even if nothing is currently installed.
#[tauri::command]
pub fn remove_schedule() -> Result<(), String> {
    schedule::remove()
}

/// Whether a schedule LaunchAgent is currently loaded — diagnostic only,
/// shown in the Schedule screen so "should be enabled" and "is actually
/// installed" can never silently drift apart without the user noticing.
#[tauri::command]
pub fn get_schedule_status() -> bool {
    schedule::is_installed()
}

/// Re-points the installed LaunchAgent at the current executable if the app
/// has moved since it was installed (e.g. dragged to a new location) —
/// a no-op if nothing changed or nothing is installed. Called once at
/// normal startup when a schedule is enabled.
#[tauri::command]
pub fn heal_schedule_path(frequency: String, time_of_day: String) {
    schedule::reinstall_if_path_changed(&frequency, &time_of_day);
}

/// Best-effort notification permission read. IMPORTANT, verified by reading
/// tauri-plugin-notification 2.4.0's desktop backend source: on macOS this
/// always returns "granted" — the plugin does not currently query real
/// UNUserNotificationCenter authorization status on desktop. Exposed
/// honestly as-is; the frontend does not claim OS-level certainty from
/// this value alone (see docs/scheduled-scans.md).
#[tauri::command]
pub fn get_notification_permission_state(app: AppHandle) -> Result<String, String> {
    match app.notification().permission_state() {
        Ok(PermissionState::Granted) => Ok("granted".to_string()),
        Ok(PermissionState::Denied) => Ok("denied".to_string()),
        Ok(_) => Ok("prompt".to_string()),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub fn request_notification_permission(app: AppHandle) -> Result<String, String> {
    match app.notification().request_permission() {
        Ok(PermissionState::Granted) => Ok("granted".to_string()),
        Ok(PermissionState::Denied) => Ok("denied".to_string()),
        Ok(_) => Ok("prompt".to_string()),
        Err(e) => Err(e.to_string()),
    }
}

/// Opens an allowlisted https link in the default browser — see external_url.rs.
#[tauri::command]
pub fn open_external_url(url: String) -> Result<(), String> {
    crate::external_url::open(&url)
}

#[tauri::command]
pub fn open_notification_settings() -> Result<(), String> {
    std::process::Command::new("open")
        .arg("x-apple.systempreferences:com.apple.preference.notifications")
        .spawn()
        .map(|_| ())
        .map_err(|e| e.to_string())
}

/// Consumes (clears) the route a notification click resolved to, if any —
/// called once by the frontend after it mounts. See native_notifications.rs
/// for the full native click -> pending route -> frontend handoff.
#[tauri::command]
pub fn get_pending_notification_route() -> Option<String> {
    crate::native_notifications::take_pending_route()
}

// --- App Cleanup — see app_footprint.rs ---

#[tauri::command]
pub async fn get_app_footprint(path: String) -> Result<AppFootprintDto, String> {
    let home = dirs::home_dir().ok_or_else(|| "Could not determine home directory".to_string())?;
    tauri::async_runtime::spawn_blocking(move || app_footprint::footprint(Path::new(&path), &home))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn get_app_icon(path: String) -> Option<String> {
    tauri::async_runtime::spawn_blocking(move || app_footprint::icon_data_url(Path::new(&path)))
        .await
        .ok()
        .flatten()
}

/// Moves a validated third-party `.app` bundle to the Trash. Returns the
/// bundle's size. Leftover Library files are cleaned separately through the
/// normal `trash_items` path, so they get the standard home-scoped checks.
#[tauri::command]
pub async fn uninstall_app(path: String) -> Result<u64, String> {
    let home = dirs::home_dir().ok_or_else(|| "Could not determine home directory".to_string())?;
    tauri::async_runtime::spawn_blocking(move || app_footprint::uninstall(&path, &home))
        .await
        .map_err(|e| e.to_string())?
}

/// Opens a Quick Look preview so the user can check a file before removing
/// it. Restricted to existing paths inside the home directory.
#[tauri::command]
pub fn quick_look(path: String) -> Result<(), String> {
    let home = dirs::home_dir().ok_or_else(|| "Could not determine home directory".to_string())?;
    let canonical = std::fs::canonicalize(&path).map_err(|_| "File no longer exists".to_string())?;
    let home_canonical = std::fs::canonicalize(&home).unwrap_or(home);
    if !canonical.starts_with(&home_canonical) {
        return Err("Preview is only available for files in your home folder".to_string());
    }
    std::process::Command::new("/usr/bin/qlmanage")
        .arg("-p")
        .arg(&canonical)
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .spawn()
        .map(|_| ())
        .map_err(|e| e.to_string())
}

/// Read-only: how much is sitting in the Trash. MacBook Cleaner never
/// empties the Trash itself — that's the one irreversible step, so it stays
/// with the user in Finder.
#[tauri::command]
pub async fn get_trash_info() -> TrashInfoDto {
    tauri::async_runtime::spawn_blocking(|| {
        let Some(trash) = dirs::home_dir().map(|h| h.join(".Trash")) else {
            return TrashInfoDto { size_bytes: None, item_count: None };
        };
        match std::fs::read_dir(&trash) {
            Ok(entries) => {
                let count = entries.flatten().filter(|e| e.file_name() != ".DS_Store").count() as u64;
                TrashInfoDto { size_bytes: Some(scanner::dir_allocated_size(&trash)), item_count: Some(count) }
            }
            Err(_) => TrashInfoDto { size_bytes: None, item_count: None },
        }
    })
    .await
    .unwrap_or(TrashInfoDto { size_bytes: None, item_count: None })
}

#[tauri::command]
pub fn open_trash() -> Result<(), String> {
    let trash = dirs::home_dir().ok_or("Could not determine home directory")?.join(".Trash");
    std::process::Command::new("open")
        .arg(trash)
        .spawn()
        .map(|_| ())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_launch_at_login() -> bool {
    login_item::is_enabled()
}

#[tauri::command]
pub fn set_launch_at_login(enabled: bool) -> Result<bool, String> {
    login_item::set_enabled(enabled)
}
