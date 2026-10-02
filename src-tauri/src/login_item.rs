//! "Launch at Login" via a per-user LaunchAgent with `RunAtLoad` — the same
//! no-root, no-extra-dependency mechanism schedule.rs uses for scheduled
//! scans. The plist is only written, never bootstrapped: bootstrapping a
//! `RunAtLoad` job would launch a second copy of the app immediately.
//! launchd picks it up at the next login.

use std::fs;
use std::path::PathBuf;

pub const LABEL: &str = "com.macbookcleaner.app.login";

fn plist_path() -> Option<PathBuf> {
    dirs::home_dir().map(|h| h.join("Library/LaunchAgents").join(format!("{LABEL}.plist")))
}

fn build_plist_xml(executable: &str) -> String {
    format!(
        r#"<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>{LABEL}</string>
    <key>ProgramArguments</key>
    <array>
        <string>{executable}</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>ProcessType</key>
    <string>Interactive</string>
</dict>
</plist>
"#
    )
}

pub fn is_enabled() -> bool {
    plist_path().map(|p| p.exists()).unwrap_or(false)
}

pub fn set_enabled(enabled: bool) -> Result<bool, String> {
    let path = plist_path().ok_or("Could not determine LaunchAgents directory")?;
    if !enabled {
        let _ = fs::remove_file(&path);
        log::info!("Launch at login disabled");
        return Ok(false);
    }

    let exe = std::env::current_exe().map_err(|e| e.to_string())?;
    match crate::diagnostics::classify_install_location(&exe) {
        crate::diagnostics::InstallLocation::Stable => {}
        crate::diagnostics::InstallLocation::NotABundle => {
            return Err("Launch at login is only available in the installed app, not in a development build.".to_string())
        }
        _ => {
            return Err("MacBook Cleaner is running from a disk image or your Downloads folder. Move it to Applications first, then turn this on.".to_string())
        }
    }

    if let Some(dir) = path.parent() {
        fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    }
    fs::write(&path, build_plist_xml(&exe.to_string_lossy())).map_err(|e| e.to_string())?;
    log::info!("Launch at login enabled -> {}", exe.display());
    Ok(true)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn plist_runs_at_load_with_the_given_executable() {
        let xml = build_plist_xml("/Applications/MacBook Cleaner.app/Contents/MacOS/macbook-cleaner");
        assert!(xml.contains("<key>RunAtLoad</key>\n    <true/>"));
        assert!(xml.contains("/Applications/MacBook Cleaner.app/Contents/MacOS/macbook-cleaner"));
        assert!(xml.contains(LABEL));
        assert!(!xml.contains("--background-scan"), "login item must launch the normal GUI, not the headless scan");
    }
}
