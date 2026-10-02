//! The Mac's preferred languages, in the user's order — the list macOS
//! itself uses to pick an app's localization. Also reflects a per-app
//! language set in System Settings → General → Language & Region.

#[cfg(target_os = "macos")]
pub fn preferred_languages() -> Vec<String> {
    use objc2_foundation::NSLocale;
    NSLocale::preferredLanguages().iter().map(|s| s.to_string()).collect()
}

#[cfg(not(target_os = "macos"))]
pub fn preferred_languages() -> Vec<String> {
    Vec::new()
}

#[tauri::command]
pub fn get_preferred_languages() -> Vec<String> {
    preferred_languages()
}

#[cfg(test)]
mod tests {
    #[test]
    fn reads_this_macs_languages() {
        let langs = super::preferred_languages();
        println!("preferred languages: {langs:?}");
        assert!(!langs.is_empty());
    }
}
