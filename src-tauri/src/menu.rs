//! The macOS menu bar, localized. Rebuilt whenever the app language changes
//! (no restart), using the same locale files as the UI.

use crate::i18n::{supported, tr};
use tauri::menu::{Menu, PredefinedMenuItem, Submenu};
use tauri::{AppHandle, Runtime};

const APP: &str = "MacBook Cleaner";

pub fn build<R: Runtime>(app: &AppHandle<R>, lang: &str) -> tauri::Result<Menu<R>> {
    let t = |key: &str| tr(lang, &format!("native.menu.{key}"), &[("app", APP.to_string())]);
    let app_menu = Submenu::with_items(
        app,
        APP,
        true,
        &[
            &PredefinedMenuItem::about(app, Some(&t("about")), None)?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::services(app, Some(&t("services")))?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::hide(app, Some(&t("hide")))?,
            &PredefinedMenuItem::hide_others(app, Some(&t("hideOthers")))?,
            &PredefinedMenuItem::show_all(app, Some(&t("showAll")))?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::quit(app, Some(&t("quit")))?,
        ],
    )?;
    let edit = Submenu::with_items(
        app,
        t("edit"),
        true,
        &[
            &PredefinedMenuItem::undo(app, Some(&t("undo")))?,
            &PredefinedMenuItem::redo(app, Some(&t("redo")))?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::cut(app, Some(&t("cut")))?,
            &PredefinedMenuItem::copy(app, Some(&t("copy")))?,
            &PredefinedMenuItem::paste(app, Some(&t("paste")))?,
            &PredefinedMenuItem::select_all(app, Some(&t("selectAll")))?,
        ],
    )?;
    let view = Submenu::with_items(app, t("view"), true, &[&PredefinedMenuItem::fullscreen(app, Some(&t("fullScreen")))?])?;
    let window = Submenu::with_items(
        app,
        t("window"),
        true,
        &[
            &PredefinedMenuItem::minimize(app, Some(&t("minimize")))?,
            &PredefinedMenuItem::maximize(app, Some(&t("zoom")))?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::close_window(app, Some(&t("closeWindow")))?,
        ],
    )?;
    Menu::with_items(app, &[&app_menu, &edit, &view, &window])
}

pub fn apply<R: Runtime>(app: &AppHandle<R>, lang: &str) -> Result<(), String> {
    let menu = build(app, lang).map_err(|e| e.to_string())?;
    app.set_menu(menu).map(|_| ()).map_err(|e| e.to_string())
}

/// Called by the UI after it resolves/changes the language. Synchronous on
/// purpose: Tauri runs sync commands on the main thread, where AppKit menus live.
#[tauri::command]
pub fn set_app_language(app: AppHandle, code: String) -> Result<(), String> {
    let lang = if supported().contains(&code.as_str()) { code } else { "en".to_string() };
    apply(&app, &lang)
}
