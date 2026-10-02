//! macOS update status, read from the results of macOS's *own* background
//! Software Update check (`/Library/Preferences/com.apple.SoftwareUpdate.plist`,
//! world-readable). This app never contacts Apple's servers itself and
//! never runs `softwareupdate`, which needs the network and can take minutes.
//!
//! If the file is missing or unreadable the status is "unknown" and the UI
//! offers to open System Settings → Software Update instead of guessing.

use super::dto::{AvailableUpdateDto, UpdateStatusDto};
use super::sysctl;
use plist::Value;
use std::time::UNIX_EPOCH;

const PLIST: &str = "/Library/Preferences/com.apple.SoftwareUpdate.plist";

pub fn status() -> UpdateStatusDto {
    let current = sysctl::read_string("kern.osproductversion");
    match Value::from_file(PLIST) {
        Ok(v) => from_plist(&v, current.as_deref()),
        Err(_) => UpdateStatusDto { state: "unknown".to_string(), macos_updates: vec![], other_updates: vec![], last_checked_ms: None },
    }
}

fn from_plist(v: &Value, current_version: Option<&str>) -> UpdateStatusDto {
    let dict = v.as_dictionary();
    let last_checked_ms = dict
        .and_then(|d| d.get("LastSuccessfulDate").or_else(|| d.get("LastFullSuccessfulDate")))
        .and_then(Value::as_date)
        .and_then(|d| std::time::SystemTime::from(d).duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_millis() as u64);

    let mut macos_updates = Vec::new();
    let mut other_updates = Vec::new();
    for item in dict.and_then(|d| d.get("RecommendedUpdates")).and_then(Value::as_array).into_iter().flatten() {
        let Some(item) = item.as_dictionary() else { continue };
        let name = item.get("Display Name").and_then(Value::as_string).unwrap_or("").trim().to_string();
        if name.is_empty() {
            continue;
        }
        let version = item.get("Display Version").and_then(Value::as_string).map(str::to_string);
        // A stale entry for the version that's already installed isn't an update.
        if version.is_some() && version.as_deref() == current_version {
            continue;
        }
        let identifier = item.get("Identifier").and_then(Value::as_string).unwrap_or("");
        let is_macos = item.get("MobileSoftwareUpdate").and_then(Value::as_boolean) == Some(true)
            || identifier.starts_with("MSU_UPDATE")
            || name.starts_with("macOS");
        let entry = AvailableUpdateDto { name, version };
        if is_macos {
            macos_updates.push(entry);
        } else {
            other_updates.push(entry);
        }
    }

    // Without a record of a successful check we can't claim "up to date".
    let state = if !macos_updates.is_empty() {
        "update-available"
    } else if last_checked_ms.is_some() {
        "up-to-date"
    } else {
        "unknown"
    };
    UpdateStatusDto { state: state.to_string(), macos_updates, other_updates, last_checked_ms }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn parse(xml: &str) -> Value {
        Value::from_reader(std::io::Cursor::new(xml.as_bytes())).unwrap()
    }

    #[test]
    fn classifies_updates() {
        let v = parse(r#"<?xml version="1.0" encoding="UTF-8"?><plist version="1.0"><dict>
            <key>LastSuccessfulDate</key><date>2026-10-01T04:51:22Z</date>
            <key>RecommendedUpdates</key><array>
              <dict><key>Display Name</key><string>Safari</string><key>Display Version</key><string>27.0</string><key>Identifier</key><string>Safari27</string></dict>
              <dict><key>Display Name</key><string>macOS Tahoe 26.7.1</string><key>Display Version</key><string>26.7.1</string><key>MobileSoftwareUpdate</key><true/><key>Identifier</key><string>MSU_UPDATE_x</string></dict>
              <dict><key>Display Name</key><string>macOS Tahoe 26.5.2</string><key>Display Version</key><string>26.5.2</string><key>MobileSoftwareUpdate</key><true/></dict>
            </array></dict></plist>"#);
        let s = from_plist(&v, Some("26.5.2"));
        assert_eq!(s.state, "update-available");
        assert_eq!(s.macos_updates.len(), 1);
        assert_eq!(s.macos_updates[0].version.as_deref(), Some("26.7.1"));
        assert_eq!(s.other_updates.len(), 1);
        assert!(s.last_checked_ms.is_some());
    }

    #[test]
    fn needs_a_successful_check_to_say_up_to_date() {
        let none = parse(r#"<?xml version="1.0" encoding="UTF-8"?><plist version="1.0"><dict/></plist>"#);
        assert_eq!(from_plist(&none, None).state, "unknown");
        let checked = parse(r#"<?xml version="1.0" encoding="UTF-8"?><plist version="1.0"><dict><key>LastSuccessfulDate</key><date>2026-10-01T04:51:22Z</date></dict></plist>"#);
        assert_eq!(from_plist(&checked, None).state, "up-to-date");
    }

    #[test]
    fn reads_this_mac() {
        println!("{:#?}", status());
    }
}
