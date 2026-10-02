//! App Cleanup support: finds the files an installed application keeps in
//! the user's Library, sizes them, and (only on explicit user request)
//! uninstalls the `.app` bundle itself.
//!
//! # Safety model
//!
//! - Footprint discovery is read-only. Every leftover path it reports is
//!   under `$HOME/Library`, so cleaning one goes through the normal
//!   `trash::trash_single_item` gauntlet (canonicalization, home scoping,
//!   protected-path denylist, sensitive-keyword re-check) like any other item.
//! - Uninstalling the bundle needs its own validator, because apps live in
//!   `/Applications` — outside `$HOME`, which `trash::validate_path`
//!   (correctly) always refuses. `validate_uninstall_target` is deliberately
//!   much narrower than "anything outside home": the resolved path must be a
//!   `.app` directory that is a *direct child* of `/Applications` or
//!   `~/Applications`, must not be an Apple system app (`com.apple.*`), and
//!   must not be this app itself. The bundle is moved to the Trash (never
//!   deleted), so an uninstall is always recoverable.

use crate::dto::{AppFootprintDto, AppFootprintItemDto};
use crate::scanner::dir_size;
use crate::trash::looks_sensitive;
use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::sync::Mutex;

pub fn read_bundle_id(app_path: &Path) -> Option<String> {
    let value = plist::Value::from_file(app_path.join("Contents/Info.plist")).ok()?;
    value
        .as_dictionary()?
        .get("CFBundleIdentifier")?
        .as_string()
        .map(|s| s.to_string())
}

fn is_system_bundle_id(bundle_id: Option<&str>) -> bool {
    bundle_id.map(|id| id.to_lowercase().starts_with("com.apple.")).unwrap_or(false)
}

fn size_of(path: &Path) -> u64 {
    if path.is_dir() {
        dir_size(path)
    } else {
        std::fs::metadata(path).map(|m| m.len()).unwrap_or(0)
    }
}

/// (kind, label, relative-to-$HOME path, safety). `{id}` is the bundle id,
/// `{name}` the app's display name. Name-based entries are only tried when
/// the name is specific enough (see `name_is_specific`) to avoid matching an
/// unrelated folder that merely shares a generic word.
const LOCATIONS: &[(&str, &str, &str, &str)] = &[
    ("cache", "Cache", "Library/Caches/{id}", "green"),
    ("cache", "Cache", "Library/Caches/{name}", "green"),
    ("web-data", "Network cache", "Library/HTTPStorages/{id}", "green"),
    ("logs", "Logs", "Library/Logs/{id}", "green"),
    ("logs", "Logs", "Library/Logs/{name}", "green"),
    ("saved-state", "Saved window state", "Library/Saved Application State/{id}.savedState", "green"),
    ("web-data", "Website data", "Library/WebKit/{id}", "orange"),
    ("support", "Supporting files", "Library/Application Support/{id}", "orange"),
    ("support", "Supporting files", "Library/Application Support/{name}", "orange"),
    ("preferences", "Preferences", "Library/Preferences/{id}.plist", "orange"),
    ("container", "Sandbox container", "Library/Containers/{id}", "orange"),
];

fn name_is_specific(name: &str) -> bool {
    const GENERIC: &[&str] = &["app", "apps", "data", "cache", "caches", "logs", "support", "utilities", "system", "default"];
    name.trim().chars().count() >= 3 && !GENERIC.contains(&name.trim().to_lowercase().as_str())
}

pub fn footprint(app_path: &Path, home: &Path) -> Result<AppFootprintDto, String> {
    if app_path.extension().and_then(|e| e.to_str()) != Some("app") || !app_path.is_dir() {
        return Err("Not an application bundle".to_string());
    }
    let bundle_id = read_bundle_id(app_path);
    let name = app_path
        .file_stem()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_default();

    let mut seen: HashSet<PathBuf> = HashSet::new();
    let mut items = Vec::new();

    for (kind, label, pattern, safety) in LOCATIONS {
        let relative = if pattern.contains("{id}") {
            match &bundle_id {
                Some(id) => pattern.replace("{id}", id),
                None => continue,
            }
        } else if pattern.contains("{name}") {
            if !name_is_specific(&name) {
                continue;
            }
            pattern.replace("{name}", &name)
        } else {
            pattern.to_string()
        };

        let path = home.join(&relative);
        if !path.exists() || looks_sensitive(&path) {
            continue;
        }
        let canonical = std::fs::canonicalize(&path).unwrap_or_else(|_| path.clone());
        if !seen.insert(canonical) {
            continue; // e.g. {id} and {name} resolved to the same folder
        }
        let size_bytes = size_of(&path);
        if size_bytes == 0 {
            continue;
        }
        items.push(AppFootprintItemDto {
            kind: kind.to_string(),
            label: label.to_string(),
            path: path.to_string_lossy().to_string(),
            size_bytes,
            safety: safety.to_string(),
        });
    }

    items.sort_by(|a, b| b.size_bytes.cmp(&a.size_bytes));

    Ok(AppFootprintDto {
        app_path: app_path.to_string_lossy().to_string(),
        app_bytes: dir_size(app_path),
        is_system_app: is_system_bundle_id(bundle_id.as_deref()),
        bundle_id,
        items,
    })
}

/// The only roots an app may be uninstalled from.
pub fn default_uninstall_roots(home: &Path) -> Vec<PathBuf> {
    vec![PathBuf::from("/Applications"), home.join("Applications")]
}

/// See the module-level safety notes. `roots` and `running_exe` are
/// parameters (rather than read globally) so the validator can be tested
/// against disposable fixture directories.
pub fn validate_uninstall_target(raw: &str, roots: &[PathBuf], running_exe: Option<&Path>) -> Result<PathBuf, String> {
    let requested = Path::new(raw);
    if !requested.is_absolute() {
        return Err("Path must be absolute".to_string());
    }
    let canonical = std::fs::canonicalize(requested).map_err(|_| "This app is no longer at that location".to_string())?;

    if canonical.extension().and_then(|e| e.to_str()) != Some("app") || !canonical.is_dir() {
        return Err("Only .app bundles can be uninstalled".to_string());
    }

    let parent = canonical.parent().ok_or("Invalid application path")?;
    let parent_ok = roots.iter().any(|root| {
        std::fs::canonicalize(root).map(|r| r == parent).unwrap_or(false)
    });
    if !parent_ok {
        return Err("Only apps directly inside an Applications folder can be uninstalled".to_string());
    }

    if canonical.starts_with("/System") {
        return Err("macOS system apps cannot be uninstalled".to_string());
    }
    if is_system_bundle_id(read_bundle_id(&canonical).as_deref()) {
        return Err("Apple apps are part of macOS and are protected".to_string());
    }
    if let Some(exe) = running_exe {
        let exe = std::fs::canonicalize(exe).unwrap_or_else(|_| exe.to_path_buf());
        if exe.starts_with(&canonical) {
            return Err("MacBook Cleaner cannot uninstall itself".to_string());
        }
    }
    Ok(canonical)
}

pub fn uninstall(raw: &str, home: &Path) -> Result<u64, String> {
    let exe = std::env::current_exe().ok();
    let target = validate_uninstall_target(raw, &default_uninstall_roots(home), exe.as_deref())?;
    let bytes = dir_size(&target);
    trash::delete(&target).map_err(|e| format!("Could not move the app to Trash: {e}"))?;
    log::info!("Uninstalled (moved to Trash): {}", target.display());
    Ok(bytes)
}

// --- App icons -------------------------------------------------------------

static ICON_CACHE: Mutex<Option<HashMap<String, Option<String>>>> = Mutex::new(None);

fn icon_file(app_path: &Path) -> Option<PathBuf> {
    let resources = app_path.join("Contents/Resources");
    let value = plist::Value::from_file(app_path.join("Contents/Info.plist")).ok();
    let declared = value
        .as_ref()
        .and_then(|v| v.as_dictionary())
        .and_then(|d| d.get("CFBundleIconFile").or_else(|| d.get("CFBundleIconName")))
        .and_then(|v| v.as_string())
        .map(|s| s.to_string());

    let mut candidates = Vec::new();
    if let Some(name) = declared {
        if name.ends_with(".icns") {
            candidates.push(resources.join(&name));
        } else {
            candidates.push(resources.join(format!("{name}.icns")));
        }
    }
    candidates.push(resources.join("AppIcon.icns"));
    candidates.into_iter().find(|p| p.is_file())
}

/// Converts the app's .icns to a small PNG with the built-in `sips` tool and
/// returns it as a `data:` URL. Cached per path for the life of the process.
/// Returns None (UI falls back to a monogram) when the app ships its icon
/// only inside an asset catalog, or conversion fails.
pub fn icon_data_url(app_path: &Path) -> Option<String> {
    let key = app_path.to_string_lossy().to_string();
    if let Some(cache) = ICON_CACHE.lock().ok()?.as_ref() {
        if let Some(hit) = cache.get(&key) {
            return hit.clone();
        }
    }

    let result = (|| {
        if app_path.extension().and_then(|e| e.to_str()) != Some("app") {
            return None;
        }
        let icns = icon_file(app_path)?;
        let out = std::env::temp_dir().join(format!(
            "macbook-cleaner-icon-{}-{}.png",
            std::process::id(),
            key.bytes().fold(0u64, |h, b| h.wrapping_mul(31).wrapping_add(b as u64))
        ));
        let status = Command::new("/usr/bin/sips")
            .args(["-s", "format", "png", "-Z", "96"])
            .arg(&icns)
            .arg("--out")
            .arg(&out)
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status()
            .ok()?;
        if !status.success() {
            return None;
        }
        let bytes = std::fs::read(&out).ok()?;
        let _ = std::fs::remove_file(&out);
        Some(format!("data:image/png;base64,{}", base64_encode(&bytes)))
    })();

    if let Ok(mut guard) = ICON_CACHE.lock() {
        guard.get_or_insert_with(HashMap::new).insert(key, result.clone());
    }
    result
}

fn base64_encode(bytes: &[u8]) -> String {
    const TABLE: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut out = String::with_capacity(bytes.len().div_ceil(3) * 4);
    for chunk in bytes.chunks(3) {
        let b = [chunk[0], *chunk.get(1).unwrap_or(&0), *chunk.get(2).unwrap_or(&0)];
        let n = ((b[0] as u32) << 16) | ((b[1] as u32) << 8) | b[2] as u32;
        out.push(TABLE[(n >> 18) as usize & 63] as char);
        out.push(TABLE[(n >> 12) as usize & 63] as char);
        out.push(if chunk.len() > 1 { TABLE[(n >> 6) as usize & 63] as char } else { '=' });
        out.push(if chunk.len() > 2 { TABLE[n as usize & 63] as char } else { '=' });
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::sync::atomic::{AtomicU64, Ordering};

    static COUNTER: AtomicU64 = AtomicU64::new(0);

    fn scratch(label: &str) -> PathBuf {
        let n = COUNTER.fetch_add(1, Ordering::SeqCst);
        let dir = std::env::temp_dir().join(format!("macbook-cleaner-apps-{label}-{}-{n}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    fn make_app(dir: &Path, name: &str, bundle_id: &str) -> PathBuf {
        let app = dir.join(format!("{name}.app"));
        fs::create_dir_all(app.join("Contents/MacOS")).unwrap();
        fs::write(app.join("Contents/MacOS/bin"), b"binary").unwrap();
        let plist = format!(
            r#"<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><dict><key>CFBundleIdentifier</key><string>{bundle_id}</string></dict></plist>"#
        );
        fs::write(app.join("Contents/Info.plist"), plist).unwrap();
        app
    }

    #[test]
    fn base64_matches_known_vectors() {
        assert_eq!(base64_encode(b""), "");
        assert_eq!(base64_encode(b"f"), "Zg==");
        assert_eq!(base64_encode(b"fo"), "Zm8=");
        assert_eq!(base64_encode(b"foo"), "Zm9v");
        assert_eq!(base64_encode(b"foobar"), "Zm9vYmFy");
    }

    #[test]
    fn allows_third_party_app_directly_in_applications_root() {
        let root = scratch("ok");
        let app = make_app(&root, "Thing", "com.example.thing");
        let result = validate_uninstall_target(app.to_str().unwrap(), &[root.clone()], None);
        assert!(result.is_ok(), "{result:?}");
    }

    #[test]
    fn rejects_apple_apps() {
        let root = scratch("apple");
        let app = make_app(&root, "Safari", "com.apple.Safari");
        let result = validate_uninstall_target(app.to_str().unwrap(), &[root.clone()], None);
        assert!(result.unwrap_err().contains("protected"));
    }

    #[test]
    fn rejects_nested_apps_and_non_app_paths() {
        let root = scratch("nested");
        let folder = root.join("Utilities");
        fs::create_dir_all(&folder).unwrap();
        let nested = make_app(&folder, "Nested", "com.example.nested");
        assert!(validate_uninstall_target(nested.to_str().unwrap(), &[root.clone()], None).is_err());
        assert!(validate_uninstall_target(folder.to_str().unwrap(), &[root.clone()], None).is_err());
        assert!(validate_uninstall_target(root.to_str().unwrap(), &[root.clone()], None).is_err());
    }

    #[test]
    fn rejects_apps_outside_allowed_roots() {
        let root = scratch("roots");
        let elsewhere = scratch("elsewhere");
        let app = make_app(&elsewhere, "Thing", "com.example.thing");
        assert!(validate_uninstall_target(app.to_str().unwrap(), &[root], None).is_err());
    }

    #[test]
    fn rejects_symlink_pointing_outside_roots() {
        let root = scratch("symlink-root");
        let elsewhere = scratch("symlink-target");
        let real = make_app(&elsewhere, "Real", "com.example.real");
        let link = root.join("Link.app");
        std::os::unix::fs::symlink(&real, &link).unwrap();
        assert!(validate_uninstall_target(link.to_str().unwrap(), &[root], None).is_err());
    }

    #[test]
    fn refuses_to_uninstall_itself() {
        let root = scratch("self");
        let app = make_app(&root, "MacBook Cleaner", "com.macbookcleaner.app");
        let exe = app.join("Contents/MacOS/bin");
        let result = validate_uninstall_target(app.to_str().unwrap(), &[root], Some(&exe));
        assert!(result.unwrap_err().contains("itself"));
    }

    #[test]
    fn footprint_finds_library_leftovers_and_labels_safety() {
        let apps = scratch("fp-apps");
        let home = scratch("fp-home");
        let app = make_app(&apps, "Thing", "com.example.thing");
        let cache = home.join("Library/Caches/com.example.thing");
        fs::create_dir_all(&cache).unwrap();
        fs::write(cache.join("blob"), vec![0u8; 2048]).unwrap();
        let prefs = home.join("Library/Preferences");
        fs::create_dir_all(&prefs).unwrap();
        fs::write(prefs.join("com.example.thing.plist"), vec![0u8; 64]).unwrap();

        let fp = footprint(&app, &home).unwrap();
        assert_eq!(fp.bundle_id.as_deref(), Some("com.example.thing"));
        assert!(!fp.is_system_app);
        let cache_item = fp.items.iter().find(|i| i.kind == "cache").expect("cache found");
        assert_eq!(cache_item.safety, "green");
        assert_eq!(cache_item.size_bytes, 2048);
        let pref_item = fp.items.iter().find(|i| i.kind == "preferences").expect("prefs found");
        assert_eq!(pref_item.safety, "orange");
    }

    #[test]
    fn generic_names_are_not_matched_by_name() {
        assert!(!name_is_specific("App"));
        assert!(!name_is_specific("Logs"));
        assert!(name_is_specific("Slack"));
    }
}
