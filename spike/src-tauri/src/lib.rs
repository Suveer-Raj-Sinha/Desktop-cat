mod native;
mod persistence;
mod watcher;

use tauri_plugin_autostart::ManagerExt;

use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::TrayIconBuilder,
    AppHandle, Emitter, Manager, PhysicalPosition, PhysicalSize, WebviewUrl, WebviewWindow,
    WebviewWindowBuilder,
};

const STRIP_CSS_HEIGHT: f64 = 140.0;

#[derive(Default, Clone, Copy, Deserialize)]
struct CatRect {
    x: f64,
    y: f64,
    w: f64,
    h: f64,
}

#[derive(Clone, Copy, Serialize)]
struct Settings {
    visible: bool,
    paused: bool,
    click_through: bool,
    auto_hidden: bool,      // stepped aside because a fullscreen app is in front
    hide_in_fullscreen: bool, // the user's preference for doing that
}

struct AppState {
    rects: Mutex<Vec<CatRect>>,
    settings: Mutex<Settings>,
}

struct TrayItems {
    vis: MenuItem<tauri::Wry>,
    pause: MenuItem<tauri::Wry>,
    ct: MenuItem<tauri::Wry>,
}

fn place(win: &WebviewWindow) {
    if let (Some((l, _t, r, b)), Ok(sf)) = (native::work_area(), win.scale_factor()) {
        let h = (STRIP_CSS_HEIGHT * sf).round() as i32;
        let _ = win.set_size(PhysicalSize::new((r - l) as u32, h as u32));
        let _ = win.set_position(PhysicalPosition::new(l, b - h));
    }
}

// Single place where settings change: updates state, tray labels, native input mode, and notifies windows.
fn update(app: &AppHandle, f: impl FnOnce(&mut Settings)) {
    let s = {
        let st = app.state::<Arc<AppState>>();
        let mut g = st.settings.lock().unwrap();
        f(&mut g);
        let v = *g;
        v
    };
    let t = app.state::<TrayItems>();
    let _ = t.vis.set_text(if s.visible { "Hide cat" } else { "Show cat" });
    let _ = t.pause.set_text(if s.paused { "Resume" } else { "Pause" });
    let _ = t.ct.set_text(if s.click_through { "Switch to interactive mode" } else { "Switch to click-through mode" });
    if !s.visible || s.click_through || s.auto_hidden {
        if let Some(w) = app.get_webview_window("main") {
            let _ = w.set_ignore_cursor_events(true);
        }
    }
    let _ = app.emit("settings-changed", s);
}

fn open_control(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("control") {
        let _ = w.show();
        let _ = w.set_focus();
        return;
    }
    let _ = WebviewWindowBuilder::new(app, "control", WebviewUrl::App("control.html".into()))
        .title("Desktop Cat")
        .inner_size(640.0, 680.0)
        .resizable(false)
        .build();
}

// The areas (cat, dropped find) where clicks should reach the page; everywhere else clicks pass through.
#[tauri::command]
fn set_hit_rects(state: tauri::State<Arc<AppState>>, rects: Vec<CatRect>) {
    *state.rects.lock().unwrap() = rects.into_iter().take(4).collect();
}

#[tauri::command]
fn get_settings(state: tauri::State<Arc<AppState>>) -> Settings {
    *state.settings.lock().unwrap()
}

#[tauri::command]
fn toggle_setting(app: AppHandle, what: String) {
    match what.as_str() {
        "visible" => update(&app, |s| s.visible = !s.visible),
        "paused" => update(&app, |s| s.paused = !s.paused),
        "click_through" => update(&app, |s| s.click_through = !s.click_through),
        _ => {}
    }
}

// Lets the overlay write its latest progress before the process ends.
fn quit_gracefully(app: &AppHandle) {
    let a = app.clone();
    std::thread::spawn(move || {
        let _ = a.emit("cat-before-quit", ());
        std::thread::sleep(Duration::from_millis(500));
        a.exit(0);
    });
}

#[tauri::command]
fn quit_app(app: AppHandle) {
    quit_gracefully(&app);
}

#[tauri::command]
fn get_autostart(app: AppHandle) -> Result<bool, String> {
    app.autolaunch().is_enabled().map_err(|e| e.to_string())
}

#[tauri::command]
fn set_autostart(app: AppHandle, enabled: bool) -> Result<(), String> {
    let manager = app.autolaunch();
    let result = if enabled { manager.enable() } else { manager.disable() };
    result.map_err(|e| e.to_string())
}

#[tauri::command]
fn apply_saved_settings(app: AppHandle, click_through: bool) {
    update(&app, |s| s.click_through = click_through);
}

// The user's choice to hide the cat while a fullscreen app is in front. Turning it off brings the cat straight back.
#[tauri::command]
fn set_hide_in_fullscreen(app: AppHandle, enabled: bool) {
    update(&app, |s| {
        s.hide_in_fullscreen = enabled;
        if !enabled {
            s.auto_hidden = false;
        }
    });
}

#[tauri::command]
fn get_platform_info() -> native::TaskbarInfo {
    native::taskbar_info()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_autostart::init(tauri_plugin_autostart::MacosLauncher::LaunchAgent, None))
        .manage(Arc::new(AppState {
            rects: Mutex::new(Vec::new()),
            settings: Mutex::new(Settings { visible: true, paused: false, click_through: false, auto_hidden: false, hide_in_fullscreen: true }),
        }))
        .invoke_handler(tauri::generate_handler![
            set_hit_rects,
            get_settings,
            toggle_setting,
            quit_app,
            apply_saved_settings,
            set_hide_in_fullscreen,
            get_platform_info,
            get_autostart,
            set_autostart,
            persistence::load_game,
            persistence::save_game,
            persistence::reset_game,
            persistence::quarantine_save
        ])
        .setup(|app| {
            let win = app.get_webview_window("main").expect("main window");
            place(&win);
            let _ = win.set_ignore_cursor_events(true);

            let open = MenuItem::with_id(app, "open", "Open control panel", true, None::<&str>)?;
            let vis = MenuItem::with_id(app, "vis", "Hide cat", true, None::<&str>)?;
            let pause = MenuItem::with_id(app, "pause", "Pause", true, None::<&str>)?;
            let ct = MenuItem::with_id(app, "ct", "Switch to click-through mode", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Exit Desktop Cat", true, None::<&str>)?;
            let sep1 = PredefinedMenuItem::separator(app)?;
            let sep2 = PredefinedMenuItem::separator(app)?;
            let menu = Menu::with_items(app, &[&open, &sep1, &vis, &pause, &ct, &sep2, &quit])?;
            app.manage(TrayItems { vis, pause, ct });

            TrayIconBuilder::new()
                .icon(app.default_window_icon().expect("icon").clone())
                .tooltip("Desktop Cat")
                .menu(&menu)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "open" => {
                        let a = app.clone();
                        std::thread::spawn(move || open_control(&a));
                    }
                    "vis" => update(app, |s| s.visible = !s.visible),
                    "pause" => update(app, |s| s.paused = !s.paused),
                    "ct" => update(app, |s| s.click_through = !s.click_through),
                    "quit" => quit_gracefully(app),
                    _ => {}
                })
                .build(app)?;

            watcher::start(app.handle().clone(), win.clone(), app.state::<Arc<AppState>>().inner().clone());
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Desktop Cat");
}
