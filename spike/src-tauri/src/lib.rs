use serde::Serialize;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::TrayIconBuilder,
    AppHandle, Emitter, Manager, PhysicalPosition, PhysicalSize, WebviewUrl, WebviewWindow,
    WebviewWindowBuilder,
};

const STRIP_CSS_HEIGHT: f64 = 140.0;

#[derive(Default, Clone, Copy)]
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
}

struct AppState {
    rect: Mutex<CatRect>,
    settings: Mutex<Settings>,
}

struct TrayItems {
    vis: MenuItem<tauri::Wry>,
    pause: MenuItem<tauri::Wry>,
    ct: MenuItem<tauri::Wry>,
}

#[cfg(windows)]
fn work_area() -> Option<(i32, i32, i32, i32)> {
    use windows_sys::Win32::Foundation::RECT;
    use windows_sys::Win32::UI::WindowsAndMessaging::{SystemParametersInfoW, SPI_GETWORKAREA};
    let mut r = RECT { left: 0, top: 0, right: 0, bottom: 0 };
    let ok = unsafe { SystemParametersInfoW(SPI_GETWORKAREA, 0, &mut r as *mut RECT as *mut _, 0) };
    if ok != 0 { Some((r.left, r.top, r.right, r.bottom)) } else { None }
}

#[cfg(not(windows))]
fn work_area() -> Option<(i32, i32, i32, i32)> { None }

#[cfg(windows)]
fn cursor_pos() -> Option<(i32, i32)> {
    use windows_sys::Win32::Foundation::POINT;
    use windows_sys::Win32::UI::WindowsAndMessaging::GetCursorPos;
    let mut p = POINT { x: 0, y: 0 };
    if unsafe { GetCursorPos(&mut p) } != 0 { Some((p.x, p.y)) } else { None }
}

#[cfg(not(windows))]
fn cursor_pos() -> Option<(i32, i32)> { None }

fn place(win: &WebviewWindow) {
    if let (Some((l, _t, r, b)), Ok(sf)) = (work_area(), win.scale_factor()) {
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
    if !s.visible || s.click_through {
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
        .inner_size(360.0, 400.0)
        .resizable(false)
        .build();
}

#[tauri::command]
fn set_cat_rect(state: tauri::State<Arc<AppState>>, x: f64, y: f64, w: f64, h: f64) {
    *state.rect.lock().unwrap() = CatRect { x, y, w, h };
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

#[tauri::command]
fn quit_app(app: AppHandle) {
    app.exit(0);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(Arc::new(AppState {
            rect: Mutex::new(CatRect::default()),
            settings: Mutex::new(Settings { visible: true, paused: false, click_through: false }),
        }))
        .invoke_handler(tauri::generate_handler![set_cat_rect, get_settings, toggle_setting, quit_app])
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
                    "quit" => app.exit(0),
                    _ => {}
                })
                .build(app)?;

            // Poll cursor POSITION only (never input). Clicks are enabled only while the cursor is over the cat.
            let st = app.state::<Arc<AppState>>().inner().clone();
            let w = win.clone();
            std::thread::spawn(move || {
                let mut ignoring = true;
                let area_key = |w: &WebviewWindow| (work_area(), w.scale_factor().map(|f| f.to_bits()).unwrap_or(0));
                let mut last_area = area_key(&w);
                let mut last_check = Instant::now();
                loop {
                    // Every 2s: if the work area or display scaling changed, move the strip back onto the screen.
                    if last_check.elapsed() >= Duration::from_secs(2) {
                        last_check = Instant::now();
                        let key = area_key(&w);
                        if key != last_area {
                            last_area = key;
                            place(&w);
                        }
                    }
                    let s = *st.settings.lock().unwrap();
                    if !s.visible || s.click_through {
                        if !ignoring && w.set_ignore_cursor_events(true).is_ok() {
                            ignoring = true;
                        }
                        std::thread::sleep(Duration::from_millis(250));
                        continue;
                    }
                    std::thread::sleep(Duration::from_millis(40));
                    let (Some((cx, cy)), Ok(pos), Ok(sf)) =
                        (cursor_pos(), w.outer_position(), w.scale_factor())
                    else { continue };
                    let r = *st.rect.lock().unwrap();
                    let rx = pos.x as f64 + r.x * sf;
                    let ry = pos.y as f64 + r.y * sf;
                    let inside = (cx as f64) >= rx
                        && (cx as f64) < rx + r.w * sf
                        && (cy as f64) >= ry
                        && (cy as f64) < ry + r.h * sf;
                    if inside == ignoring && w.set_ignore_cursor_events(!inside).is_ok() {
                        ignoring = !inside;
                    }
                }
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Desktop Cat");
}
