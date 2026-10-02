//! Native-side localization: the menu bar and background notifications.
//!
//! Uses the very same locale files as the UI (embedded at build time by
//! build.rs), and the same resolution rules as src/i18n/resolve.ts: a
//! manually chosen language wins; "system" follows the Mac's preferred
//! languages; anything unsupported falls back to English.

use serde_json::Value;
use std::collections::HashMap;
use std::sync::OnceLock;

include!(concat!(env!("OUT_DIR"), "/locales.rs"));

const FALLBACK: &str = "en";

fn tables() -> &'static HashMap<&'static str, Value> {
    static TABLES: OnceLock<HashMap<&'static str, Value>> = OnceLock::new();
    TABLES.get_or_init(|| LOCALES.iter().filter_map(|(code, json)| serde_json::from_str(json).ok().map(|v| (*code, v))).collect())
}

pub fn supported() -> Vec<&'static str> {
    LOCALES.iter().map(|(c, _)| *c).collect()
}

fn lookup<'a>(table: &'a Value, key: &str) -> Option<&'a str> {
    key.split('.').try_fold(table, |node, part| node.get(part))?.as_str()
}

/// Translated text for `key` in `lang`, with {{name}} placeholders filled. Falls back to English, then the key.
pub fn tr(lang: &str, key: &str, params: &[(&str, String)]) -> String {
    let t = tables();
    let raw = t
        .get(lang)
        .and_then(|v| lookup(v, key))
        .or_else(|| t.get(FALLBACK).and_then(|v| lookup(v, key)))
        .unwrap_or(key);
    params.iter().fold(raw.to_string(), |s, (name, value)| s.replace(&format!("{{{{{name}}}}}"), value))
}

/// Same rules as normalizeLocale() in src/i18n/resolve.ts.
pub fn normalize(tag: &str, supported: &[&str]) -> Option<String> {
    let cleaned = tag.trim().replace('_', "-");
    if cleaned.is_empty() {
        return None;
    }
    let parts: Vec<&str> = cleaned.split('-').collect();
    let lang = parts[0].to_lowercase();
    let find = |want: &str| supported.iter().find(|s| s.eq_ignore_ascii_case(want)).map(|s| s.to_string());

    if lang == "zh" {
        let rest: Vec<String> = parts[1..].iter().map(|p| p.to_lowercase()).collect();
        let traditional = rest.iter().any(|p| p == "hant" || p == "tw" || p == "hk" || p == "mo");
        return find(if traditional { "zh-TW" } else { "zh-CN" }).or_else(|| find("zh"));
    }
    if let Some(exact) = find(&cleaned) {
        return Some(exact);
    }
    if let Some(region) = parts.iter().skip(1).find(|p| (p.len() == 2 && p.chars().all(|c| c.is_ascii_alphabetic())) || (p.len() == 3 && p.chars().all(|c| c.is_ascii_digit()))) {
        if let Some(found) = find(&format!("{lang}-{region}")) {
            return Some(found);
        }
    }
    find(&lang)
}

pub fn resolve(preference: Option<&str>, system: &[String], supported: &[&str]) -> String {
    if let Some(p) = preference.filter(|p| *p != "system") {
        if let Some(code) = normalize(p, supported) {
            return code;
        }
    }
    system.iter().find_map(|tag| normalize(tag, supported)).unwrap_or_else(|| FALLBACK.to_string())
}

/// The language the user sees: their saved choice, or the Mac's language.
pub fn current_language() -> String {
    let state = crate::state::load_state();
    let pref = crate::state::get_str(&state, &["settings", "language"]).map(String::from);
    resolve(pref.as_deref(), &crate::locale::preferred_languages(), &supported())
}

/// "4.2 GB" / "4,2 GB" / "4,2 Go" — decimal separator and unit from the locale file.
pub fn format_gb(lang: &str, bytes: u64, decimals: usize) -> String {
    let gb = bytes as f64 / 1_000_000_000.0;
    let number = format!("{gb:.decimals$}").replace('.', &tr(lang, "native.number.decimal", &[]));
    tr(lang, "native.number.gb", &[("value", number)])
}

#[cfg(test)]
mod tests {
    use super::*;

    const S: &[&str] = &["en", "de", "fr", "es", "it", "pt", "nl", "pl", "hi", "ja", "ko", "zh-CN", "zh-TW", "ar", "tr", "ru"];

    #[test]
    fn normalizes_like_the_ui() {
        assert_eq!(normalize("en-US", S).as_deref(), Some("en"));
        assert_eq!(normalize("pt-BR", S).as_deref(), Some("pt"));
        assert_eq!(normalize("zh-Hans-CN", S).as_deref(), Some("zh-CN"));
        assert_eq!(normalize("zh-Hant-TW", S).as_deref(), Some("zh-TW"));
        assert_eq!(normalize("zh-HK", S).as_deref(), Some("zh-TW"));
        assert_eq!(normalize("sv-SE", S), None);
    }

    #[test]
    fn resolves_preferences() {
        let sys = |v: &[&str]| v.iter().map(|s| s.to_string()).collect::<Vec<_>>();
        assert_eq!(resolve(Some("system"), &sys(&["de-DE"]), S), "de");
        assert_eq!(resolve(Some("system"), &sys(&["sv-SE"]), S), "en");
        assert_eq!(resolve(Some("fr"), &sys(&["en-US"]), S), "fr");
        assert_eq!(resolve(None, &sys(&["sv-SE", "ja-JP"]), S), "ja");
    }

    #[test]
    fn translates_with_fallback() {
        assert_eq!(tr("en", "native.menu.quit", &[("app", "MacBook Cleaner".into())]), "Quit MacBook Cleaner");
        assert_eq!(tr("xx", "native.menu.quit", &[("app", "X".into())]), "Quit X");
        assert_eq!(format_gb("en", 4_230_000_000, 1), "4.2 GB");
    }

    #[test]
    fn every_embedded_locale_covers_native_strings() {
        let mut langs = supported();
        langs.sort();
        let mut expected = S.to_vec();
        expected.sort();
        assert_eq!(langs, expected, "build.rs should embed every locale file");
        let en = &tables()["en"];
        for lang in S {
            let table = &tables()[lang];
            for group in ["menu", "notifications", "number"] {
                for key in en["native"][group].as_object().unwrap().keys() {
                    let full = format!("native.{group}.{key}");
                    let got = lookup(table, &full).unwrap_or_else(|| panic!("{lang} is missing {full}"));
                    for placeholder in ["{{app}}", "{{size}}", "{{count}}", "{{value}}"] {
                        if lookup(en, &full).unwrap().contains(placeholder) {
                            assert!(got.contains(placeholder), "{lang} {full} lost {placeholder}");
                        }
                    }
                }
            }
        }
        assert_eq!(format_gb("de", 4_230_000_000, 1), "4,2 GB");
        assert_eq!(format_gb("fr", 4_230_000_000, 1), "4,2 Go");
        assert_eq!(tr("de", "native.menu.quit", &[("app", "MacBook Cleaner".into())]), "MacBook Cleaner beenden");
    }
}
