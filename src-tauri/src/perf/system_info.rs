//! Static hardware/OS facts, collected once per app session and cached.
//!
//! Most come from sysctl (instant). Two things macOS only exposes elsewhere:
//! the marketing model name (IORegistry `product-name`, Apple silicon only)
//! and GPU/display details (`system_profiler`, ~0.5 s) — each run exactly
//! once, never on a timer. Only the specific fields below are parsed; the
//! serial number, hardware UUID and similar identifiers are never read out.

use super::dto::{DisplayDto, OsInfoDto, SystemInfoDto};
use super::sysctl;
use serde_json::Value;
use std::process::{Command, Stdio};
use std::sync::OnceLock;

static CACHE: OnceLock<SystemInfoDto> = OnceLock::new();

pub fn system_info() -> SystemInfoDto {
    CACHE.get_or_init(collect).clone()
}

/// Release names Apple has published. Unknown future versions fall back to plain "macOS".
pub fn macos_name(version: Option<&str>) -> String {
    let major = version.and_then(|v| v.split('.').next()).and_then(|m| m.parse::<u32>().ok());
    let name = match major {
        Some(11) => "Big Sur",
        Some(12) => "Monterey",
        Some(13) => "Ventura",
        Some(14) => "Sonoma",
        Some(15) => "Sequoia",
        Some(26) => "Tahoe",
        _ => return "macOS".to_string(),
    };
    format!("macOS {name}")
}

pub fn os_info() -> OsInfoDto {
    let version = sysctl::read_string("kern.osproductversion");
    OsInfoDto {
        name: macos_name(version.as_deref()),
        version,
        build: sysctl::read_string("kern.osversion"),
        kernel: sysctl::read_string("kern.osrelease"),
    }
}

/// "MacBook Pro (13-inch, M1, 2020)" from the device tree — Apple silicon Macs only.
fn marketing_name() -> Option<String> {
    let out = Command::new("/usr/sbin/ioreg")
        .args(["-ar", "-k", "product-name", "-d", "1", "-p", "IODeviceTree"])
        .stderr(Stdio::null())
        .output()
        .ok()?;
    let value = plist::Value::from_reader(std::io::Cursor::new(out.stdout)).ok()?;
    let data = value.as_array()?.first()?.as_dictionary()?.get("product-name")?.as_data()?;
    let name = String::from_utf8_lossy(data).trim_end_matches('\0').trim().to_string();
    (!name.is_empty()).then_some(name)
}

/// "MacBookPro17,1" → "MacBook Pro" — used only when system_profiler is unavailable.
fn family_from_identifier(identifier: &str) -> Option<String> {
    let family = identifier.split(|c: char| c.is_ascii_digit()).next()?;
    let name = match family {
        "MacBookPro" => "MacBook Pro",
        "MacBookAir" => "MacBook Air",
        "MacBook" => "MacBook",
        "Macmini" => "Mac mini",
        "MacPro" => "Mac Pro",
        "iMac" => "iMac",
        "iMacPro" => "iMac Pro",
        _ => return None,
    };
    Some(name.to_string())
}

fn str_field(v: &Value, key: &str) -> Option<String> {
    v.get(key).and_then(|x| x.as_str()).map(|s| s.trim().to_string()).filter(|s| !s.is_empty())
}

struct ProfilerFacts {
    machine_name: Option<String>,
    gpu_name: Option<String>,
    gpu_cores: Option<u64>,
    displays: Vec<DisplayDto>,
}

fn profiler_facts() -> Option<ProfilerFacts> {
    let out = Command::new("/usr/sbin/system_profiler")
        .args(["SPHardwareDataType", "SPDisplaysDataType", "-json", "-detailLevel", "mini"])
        .stderr(Stdio::null())
        .output()
        .ok()?;
    let json: Value = serde_json::from_slice(&out.stdout).ok()?;

    let hardware = json.get("SPHardwareDataType").and_then(|h| h.get(0));
    let machine_name = hardware.and_then(|h| str_field(h, "machine_name"));

    let gpus = json.get("SPDisplaysDataType").and_then(|d| d.as_array()).cloned().unwrap_or_default();
    let gpu = gpus.first();
    let gpu_name = gpu.and_then(|g| str_field(g, "sppci_model"));
    let gpu_cores = gpu.and_then(|g| str_field(g, "sppci_cores")).and_then(|c| c.parse().ok());

    let mut displays = Vec::new();
    for g in &gpus {
        for d in g.get("spdisplays_ndrvs").and_then(|x| x.as_array()).into_iter().flatten() {
            let name = str_field(d, "_name").unwrap_or_else(|| "Display".to_string());
            let resolution = str_field(d, "_spdisplays_resolution").or_else(|| str_field(d, "spdisplays_resolution"));
            let pixels = str_field(d, "_spdisplays_pixels");
            let built_in = str_field(d, "spdisplays_connection_type").as_deref() == Some("spdisplays_internal");
            let main = str_field(d, "spdisplays_main").as_deref() == Some("spdisplays_yes");
            displays.push(DisplayDto { name, resolution, pixels, built_in, main });
        }
    }
    Some(ProfilerFacts { machine_name, gpu_name, gpu_cores, displays })
}

fn collect() -> SystemInfoDto {
    let model_identifier = sysctl::read_string("hw.model");
    let apple_silicon = sysctl::read::<i32>("hw.optional.arm64") == Some(1);
    let translated = sysctl::read::<i32>("sysctl.proc_translated") == Some(1);
    let two_levels = sysctl::read_u64("hw.nperflevels") == Some(2);
    let profiler = profiler_facts();

    let model_name = profiler
        .as_ref()
        .and_then(|p| p.machine_name.clone())
        .or_else(|| model_identifier.as_deref().and_then(family_from_identifier));

    SystemInfoDto {
        model_name,
        marketing_name: if apple_silicon { marketing_name() } else { None },
        model_identifier,
        chip: sysctl::read_string("machdep.cpu.brand_string"),
        apple_silicon,
        translated,
        architecture: if apple_silicon { "arm64".to_string() } else { "x86_64".to_string() },
        physical_cores: sysctl::read_u64("hw.physicalcpu"),
        logical_cores: sysctl::read_u64("hw.logicalcpu"),
        performance_cores: two_levels.then(|| sysctl::read_u64("hw.perflevel0.physicalcpu")).flatten(),
        efficiency_cores: two_levels.then(|| sysctl::read_u64("hw.perflevel1.physicalcpu")).flatten(),
        gpu_name: profiler.as_ref().and_then(|p| p.gpu_name.clone()),
        gpu_cores: profiler.as_ref().and_then(|p| p.gpu_cores),
        memory_bytes: sysctl::read_u64("hw.memsize"),
        hostname: sysctl::read_string("kern.hostname"),
        displays: profiler.map(|p| p.displays).unwrap_or_default(),
        os: os_info(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn names_known_releases_only() {
        assert_eq!(macos_name(Some("15.3.1")), "macOS Sequoia");
        assert_eq!(macos_name(Some("26.5.2")), "macOS Tahoe");
        assert_eq!(macos_name(Some("99.0")), "macOS");
        assert_eq!(macos_name(None), "macOS");
    }

    #[test]
    fn family_names() {
        assert_eq!(family_from_identifier("MacBookPro17,1").as_deref(), Some("MacBook Pro"));
        assert_eq!(family_from_identifier("Macmini9,1").as_deref(), Some("Mac mini"));
        assert_eq!(family_from_identifier("Mac14,9"), None);
    }

    #[test]
    fn collects_real_info() {
        let info = system_info();
        println!("{info:#?}");
        assert!(info.memory_bytes.unwrap() > 0);
        assert!(info.chip.is_some());
        assert!(info.os.version.is_some());
    }
}
