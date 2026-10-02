use serde::Serialize;

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct SystemOverviewDto {
    pub total_bytes: u64,
    pub used_bytes: u64,
    pub free_bytes: u64,
    /// Space macOS considers reclaimable-if-needed (local snapshots, evictable
    /// caches) — already counted inside `free_bytes`, not on top of it. Real
    /// OS-level purgeable space, not this app's identified cleanup candidates.
    pub purgeable_bytes: u64,
    pub volume_name: String,
    pub home_dir: String,
    pub username: String,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ScannedFileDto {
    pub name: String,
    pub path: String,
    pub size_bytes: u64,
    pub modified_ms: Option<u64>,
    pub accessed_ms: Option<u64>,
    pub extension: Option<String>,
    /// Which configured root this file was found under: "downloads" | "desktop" | "documents"
    pub root: String,
    /// Shared id when this file's (size, partial-content-hash) matches another scanned file.
    pub duplicate_group: Option<String>,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct DevItemDto {
    /// Stable identifier, e.g. "xcode-derived-data", used by the frontend classifier.
    pub kind: String,
    pub tool: String,
    pub label: String,
    pub path: String,
    pub size_bytes: u64,
    pub modified_ms: Option<u64>,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct BrowserItemDto {
    pub browser_id: String,
    pub name: String,
    pub cache_bytes: u64,
    pub accessible: bool,
    pub cache_path: String,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct AppItemDto {
    pub name: String,
    pub path: String,
    pub size_bytes: u64,
    pub version: Option<String>,
    pub bundle_id: Option<String>,
    pub last_used_ms: Option<u64>,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct PathAccessDto {
    pub path: String,
    /// "accessible" | "denied" | "not-found"
    pub state: String,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ScanWarningDto {
    pub path: String,
    pub message: String,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ScanProgressEvent {
    pub phase: String,
    pub label: String,
    pub done: bool,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct FullScanResultDto {
    pub overview: SystemOverviewDto,
    pub files: Vec<ScannedFileDto>,
    pub developer: Vec<DevItemDto>,
    pub browsers: Vec<BrowserItemDto>,
    pub applications: Vec<AppItemDto>,
    pub warnings: Vec<ScanWarningDto>,
    pub breakdown: StorageBreakdownDto,
    pub scanned_at_ms: u64,
}

/// Real folder totals for the Storage screen's category view. Every number
/// here is measured, never estimated — except `system_data_bytes`, which is
/// honestly derived as "used space we could not attribute to a folder we
/// sized" (the same idea macOS's own "System Data" bucket uses). Any folder
/// we could not read (no Full Disk Access) simply contributes 0 and its
/// space lands in `system_data_bytes` instead of being invented.
#[derive(Serialize, Clone, Debug, Default)]
#[serde(rename_all = "camelCase")]
pub struct StorageBreakdownDto {
    pub applications_bytes: u64,
    pub documents_bytes: u64,
    pub photos_bytes: u64,
    pub videos_bytes: u64,
    pub music_bytes: u64,
    pub downloads_bytes: u64,
    pub cache_bytes: u64,
    pub library_other_bytes: u64,
    pub system_data_bytes: u64,
}

/// One location on disk that belongs to an installed application.
#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct AppFootprintItemDto {
    /// "cache" | "logs" | "support" | "preferences" | "container" | "saved-state" | "web-data"
    pub kind: String,
    pub label: String,
    pub path: String,
    pub size_bytes: u64,
    /// "green" (regenerated automatically) | "orange" (holds settings/user data)
    pub safety: String,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct AppFootprintDto {
    pub app_path: String,
    pub app_bytes: u64,
    pub bundle_id: Option<String>,
    /// True for Apple-signed system apps (bundle id `com.apple.*`) — the UI
    /// never offers uninstall for these and the native side refuses anyway.
    pub is_system_app: bool,
    pub items: Vec<AppFootprintItemDto>,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct TrashInfoDto {
    /// None when ~/.Trash could not be read (macOS requires Full Disk Access).
    pub size_bytes: Option<u64>,
    pub item_count: Option<u64>,
}
