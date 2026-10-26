//! Typed payloads for the Performance tab. Mirrored in
//! src/features/performance/types.ts — keep both in sync. Every value that
//! macOS might not provide is an Option, so the UI can say "Not available"
//! instead of showing a made-up number.

use serde::Serialize;

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct DisplayDto {
    pub name: String,
    pub resolution: Option<String>,
    pub pixels: Option<String>,
    pub built_in: bool,
    pub main: bool,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct OsInfoDto {
    /// "macOS Tahoe" when the version maps to a known release name, else "macOS".
    pub name: String,
    pub version: Option<String>,
    pub build: Option<String>,
    /// Darwin kernel release, e.g. "25.5.0".
    pub kernel: Option<String>,
}

/// Hardware and OS facts that don't change while the app runs — collected
/// once per session and cached (see system_info.rs).
#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct SystemInfoDto {
    /// Family name, e.g. "MacBook Pro".
    pub model_name: Option<String>,
    /// Full marketing name when macOS exposes it, e.g. "MacBook Pro (13-inch, M1, 2020)".
    pub marketing_name: Option<String>,
    /// e.g. "MacBookPro17,1".
    pub model_identifier: Option<String>,
    /// e.g. "Apple M1" or "Intel(R) Core(TM) i7-9750H CPU @ 2.60GHz".
    pub chip: Option<String>,
    pub apple_silicon: bool,
    /// True when this app itself runs under Rosetta translation.
    pub translated: bool,
    pub architecture: String,
    pub physical_cores: Option<u64>,
    pub logical_cores: Option<u64>,
    pub performance_cores: Option<u64>,
    pub efficiency_cores: Option<u64>,
    pub gpu_name: Option<String>,
    pub gpu_cores: Option<u64>,
    pub memory_bytes: Option<u64>,
    pub hostname: Option<String>,
    pub displays: Vec<DisplayDto>,
    pub os: OsInfoDto,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct CpuDto {
    /// Share of total CPU capacity across all cores, 0–100.
    pub total: f64,
    pub user: f64,
    pub system: f64,
    pub idle: f64,
    pub logical_cores: Option<u64>,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct MemoryDto {
    pub total_bytes: u64,
    /// App + Wired + Compressed — the same "Memory Used" Activity Monitor shows.
    pub used_bytes: u64,
    pub app_bytes: u64,
    pub wired_bytes: u64,
    pub compressed_bytes: u64,
    /// File-backed and purgeable memory macOS can reclaim on demand.
    pub cached_bytes: u64,
    pub available_bytes: u64,
    /// "normal" | "warning" | "critical", from kern.memorystatus_vm_pressure_level.
    pub pressure: Option<String>,
    pub swap_total_bytes: Option<u64>,
    pub swap_used_bytes: Option<u64>,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct LiveMetricsDto {
    pub sampled_at_ms: u64,
    pub cpu: Option<CpuDto>,
    pub memory: Option<MemoryDto>,
    pub boot_time_ms: Option<u64>,
    pub uptime_secs: Option<u64>,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ProcessEntryDto {
    /// Stable for the life of the process: "app:<pid>" or "proc:<pid>".
    pub id: String,
    pub pid: i32,
    pub name: String,
    /// "app" (in the Dock), "background" (yours, no Dock icon) or "system" (another user, e.g. root).
    pub kind: String,
    pub bundle_id: Option<String>,
    /// The .app bundle, used for the icon and Reveal in Finder.
    pub bundle_path: Option<String>,
    /// Share of total CPU capacity (all cores), 0–100, summed over `process_count` processes.
    /// None when macOS doesn't let us read it (other users' processes) or on the first sample.
    pub cpu_percent: Option<f64>,
    /// Physical memory footprint (what Activity Monitor shows), summed; None when macOS doesn't let us read it.
    pub memory_bytes: Option<u64>,
    pub started_at_ms: Option<u64>,
    /// How many processes are grouped into this row (an app plus its helpers).
    pub process_count: u32,
    pub is_active: bool,
    pub is_hidden: bool,
    /// This row is MacBook Cleaner itself.
    pub is_self: bool,
    /// "running" | "idle" | "stopped" | "unknown"
    pub status: String,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ProcessListDto {
    pub sampled_at_ms: u64,
    pub entries: Vec<ProcessEntryDto>,
    /// Total processes on the Mac, including ones not listed.
    pub total_processes: u32,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ProcessDetailsDto {
    pub pid: i32,
    pub executable_path: Option<String>,
    pub bundle_version: Option<String>,
    pub thread_count: Option<u64>,
    pub parent_pid: Option<i32>,
    pub owned_by_you: bool,
    pub helper_pids: Vec<i32>,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct BatteryDto {
    pub percent: Option<f64>,
    pub is_charging: bool,
    pub fully_charged: bool,
    pub on_power_adapter: bool,
    /// Minutes, only when macOS has a reliable estimate (not its 65535 "calculating" sentinel).
    pub minutes_to_empty: Option<u64>,
    pub minutes_to_full: Option<u64>,
    pub cycle_count: Option<u64>,
    /// Cycle count the battery itself reports it was designed for, when present.
    pub design_cycle_count: Option<u64>,
    pub design_capacity_mah: Option<u64>,
    pub full_charge_capacity_mah: Option<u64>,
    pub current_capacity_mah: Option<u64>,
    /// Apple's own "Maximum Capacity" percentage, as shown in System Settings.
    pub maximum_capacity_percent: Option<f64>,
    /// Apple's raw condition string, e.g. "Good" (shown as "Normal") or "Service Recommended".
    pub condition: Option<String>,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct AvailableUpdateDto {
    pub name: String,
    pub version: Option<String>,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct QuitResultDto {
    /// "terminated" | "still_running" | "not_found" | "permission_denied"
    pub status: String,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct UpdateStatusDto {
    /// "up-to-date" | "update-available" | "unknown"
    pub state: String,
    pub macos_updates: Vec<AvailableUpdateDto>,
    pub other_updates: Vec<AvailableUpdateDto>,
    /// When macOS last successfully checked for updates.
    pub last_checked_ms: Option<u64>,
}
