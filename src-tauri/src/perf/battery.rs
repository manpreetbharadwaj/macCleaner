//! Battery state for MacBooks. Returns None on Macs without a battery, so
//! the UI hides the section instead of showing an empty widget.
//!
//! Live values (charge, charging state, cycle count, capacities) come from
//! the AppleSmartBattery IORegistry entry via `ioreg` (~20 ms). Apple's own
//! health verdict and "Maximum Capacity" percentage — the exact values
//! System Settings → Battery shows — come from `system_profiler
//! SPPowerDataType`, which is cached for 10 minutes because they change
//! over weeks, not seconds. Nothing here is estimated or scored by us.

use super::dto::BatteryDto;
use plist::{Dictionary, Value};
use std::process::{Command, Stdio};
use std::sync::Mutex;
use std::time::{Duration, Instant};

/// macOS uses 65535 to mean "still calculating" for time estimates.
const UNKNOWN_MINUTES: u64 = 65535;
const HEALTH_TTL: Duration = Duration::from_secs(600);

#[derive(Clone, Default, Debug)]
struct Health {
    condition: Option<String>,
    maximum_capacity_percent: Option<f64>,
}

static HEALTH: Mutex<Option<(Instant, Health)>> = Mutex::new(None);

fn smart_battery() -> Option<Dictionary> {
    let out = Command::new("/usr/sbin/ioreg").args(["-r", "-c", "AppleSmartBattery", "-a"]).stderr(Stdio::null()).output().ok()?;
    parse_ioreg(&out.stdout)
}

fn parse_ioreg(bytes: &[u8]) -> Option<Dictionary> {
    if bytes.is_empty() {
        return None;
    }
    let value = Value::from_reader(std::io::Cursor::new(bytes)).ok()?;
    let dict = value.as_array()?.first()?.as_dictionary()?.clone();
    // Desktop Macs have no AppleSmartBattery entry at all; some report one with BatteryInstalled = false.
    if dict.get("BatteryInstalled").and_then(Value::as_boolean) == Some(false) {
        return None;
    }
    Some(dict)
}

fn int(d: &Dictionary, key: &str) -> Option<u64> {
    d.get(key).and_then(|v| v.as_unsigned_integer().or_else(|| v.as_signed_integer().filter(|n| *n >= 0).map(|n| n as u64)))
}

fn flag(d: &Dictionary, key: &str) -> bool {
    d.get(key).and_then(Value::as_boolean).unwrap_or(false)
}

fn minutes(d: &Dictionary, key: &str) -> Option<u64> {
    int(d, key).filter(|m| *m > 0 && *m < UNKNOWN_MINUTES)
}

fn fetch_health() -> Health {
    let Ok(out) = Command::new("/usr/sbin/system_profiler").args(["SPPowerDataType", "-json"]).stderr(Stdio::null()).output() else {
        return Health::default();
    };
    parse_health(&out.stdout)
}

fn parse_health(bytes: &[u8]) -> Health {
    let Ok(json) = serde_json::from_slice::<serde_json::Value>(bytes) else {
        return Health::default();
    };
    let info = json
        .get("SPPowerDataType")
        .and_then(|v| v.as_array())
        .and_then(|items| items.iter().find_map(|i| i.get("sppower_battery_health_info")));
    let Some(info) = info else {
        return Health::default();
    };
    Health {
        condition: info.get("sppower_battery_health").and_then(|v| v.as_str()).map(str::to_string).filter(|s| !s.is_empty()),
        maximum_capacity_percent: info
            .get("sppower_battery_health_maximum_capacity")
            .and_then(|v| v.as_str())
            .and_then(|s| s.trim().trim_end_matches('%').parse::<f64>().ok()),
    }
}

fn health(force: bool) -> Health {
    if let Ok(guard) = HEALTH.lock() {
        if let Some((at, h)) = guard.as_ref() {
            if !force && at.elapsed() < HEALTH_TTL {
                return h.clone();
            }
        }
    }
    let fresh = fetch_health();
    if let Ok(mut guard) = HEALTH.lock() {
        *guard = Some((Instant::now(), fresh.clone()));
    }
    fresh
}

fn build(d: &Dictionary, h: Health) -> BatteryDto {
    let current = int(d, "CurrentCapacity");
    let max = int(d, "MaxCapacity");
    // On Apple silicon CurrentCapacity/MaxCapacity are already percentages
    // (MaxCapacity = 100); on Intel they're mAh. The ratio works for both.
    let percent = match (current, max) {
        (Some(c), Some(m)) if m > 0 => Some(((c as f64 / m as f64) * 100.0).clamp(0.0, 100.0).round()),
        _ => None,
    };
    let raw_max = int(d, "AppleRawMaxCapacity").or(max.filter(|m| *m > 100));
    let raw_current = int(d, "AppleRawCurrentCapacity").or(current.filter(|_| max.unwrap_or(0) > 100));
    let charging = flag(d, "IsCharging");
    let on_adapter = flag(d, "ExternalConnected");

    BatteryDto {
        percent,
        is_charging: charging,
        fully_charged: flag(d, "FullyCharged"),
        on_power_adapter: on_adapter,
        minutes_to_empty: if on_adapter { None } else { minutes(d, "AvgTimeToEmpty").or_else(|| minutes(d, "TimeRemaining")) },
        minutes_to_full: if charging { minutes(d, "AvgTimeToFull") } else { None },
        cycle_count: int(d, "CycleCount"),
        design_cycle_count: int(d, "DesignCycleCount9C").filter(|c| *c > 0),
        design_capacity_mah: int(d, "DesignCapacity").filter(|c| *c > 0),
        full_charge_capacity_mah: int(d, "NominalChargeCapacity").or(raw_max).filter(|c| *c > 0),
        current_capacity_mah: raw_current,
        maximum_capacity_percent: h.maximum_capacity_percent,
        condition: h.condition,
    }
}

pub fn battery(force_health: bool) -> Option<BatteryDto> {
    let dict = smart_battery()?;
    Some(build(&dict, health(force_health)))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn no_battery_entry_means_none() {
        assert!(parse_ioreg(b"").is_none());
        let empty = br#"<?xml version="1.0" encoding="UTF-8"?><plist version="1.0"><array/></plist>"#;
        assert!(parse_ioreg(empty).is_none());
        let not_installed = br#"<?xml version="1.0" encoding="UTF-8"?><plist version="1.0"><array><dict><key>BatteryInstalled</key><false/></dict></array></plist>"#;
        assert!(parse_ioreg(not_installed).is_none());
    }

    #[test]
    fn calculating_sentinel_is_hidden() {
        let xml = br#"<?xml version="1.0" encoding="UTF-8"?><plist version="1.0"><array><dict>
            <key>CurrentCapacity</key><integer>50</integer><key>MaxCapacity</key><integer>100</integer>
            <key>AvgTimeToEmpty</key><integer>65535</integer><key>ExternalConnected</key><false/>
            <key>CycleCount</key><integer>12</integer></dict></array></plist>"#;
        let b = build(&parse_ioreg(xml).unwrap(), Health::default());
        assert_eq!(b.percent, Some(50.0));
        assert_eq!(b.minutes_to_empty, None);
        assert_eq!(b.cycle_count, Some(12));
        assert_eq!(b.condition, None);
    }

    #[test]
    fn intel_style_mah_capacities() {
        let xml = br#"<?xml version="1.0" encoding="UTF-8"?><plist version="1.0"><array><dict>
            <key>CurrentCapacity</key><integer>2500</integer><key>MaxCapacity</key><integer>5000</integer>
            <key>DesignCapacity</key><integer>6000</integer></dict></array></plist>"#;
        let b = build(&parse_ioreg(xml).unwrap(), Health::default());
        assert_eq!(b.percent, Some(50.0));
        assert_eq!(b.full_charge_capacity_mah, Some(5000));
        assert_eq!(b.current_capacity_mah, Some(2500));
    }

    #[test]
    fn parses_apple_health() {
        let json = br#"{"SPPowerDataType":[{"_name":"spbattery_information","sppower_battery_health_info":{"sppower_battery_cycle_count":539,"sppower_battery_health":"Good","sppower_battery_health_maximum_capacity":"81%"}}]}"#;
        let h = parse_health(json);
        assert_eq!(h.condition.as_deref(), Some("Good"));
        assert_eq!(h.maximum_capacity_percent, Some(81.0));
        assert!(parse_health(br#"{"SPPowerDataType":[]}"#).condition.is_none());
    }

    #[test]
    fn reads_this_mac() {
        println!("{:#?}", battery(true));
    }
}
