// Background watcher: reads the pointer POSITION (never input), keeps the strip on screen, turns clicks on only over the
// cat, tells the page about taskbar changes, and steps aside while a fullscreen app is in front.
use crate::{native, place, update, AppState};
use serde::Serialize;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter, WebviewWindow};

#[derive(Clone, Serialize)]
struct CursorPayload {
    near: bool,
    x: f64,
    y: f64,
}

// Runs the watcher on its own thread and restarts it if it ever panics, so click handling can't silently die.
pub fn start(app: AppHandle, win: WebviewWindow, st: Arc<AppState>) {
    std::thread::spawn(move || loop {
        let (a, w, s) = (app.clone(), win.clone(), st.clone());
        if std::thread::spawn(move || run(a, w, s)).join().is_err() {
            eprintln!("Desktop Cat: the watcher thread stopped unexpectedly; restarting it");
        }
        std::thread::sleep(Duration::from_secs(1));
    });
}

fn run(app: AppHandle, w: WebviewWindow, st: Arc<AppState>) {
    let area_key = |w: &WebviewWindow| (native::work_area(), w.scale_factor().map(|f| f.to_bits()).unwrap_or(0));
    let mut last_area = area_key(&w);
    let mut last_platform = native::taskbar_info();
    let mut ignoring = true;
    let mut was_near = false;
    let mut last_xy = (i32::MIN, i32::MIN);
    let mut last_emit = Instant::now();
    let mut last_display = Instant::now();
    let mut last_fullscreen = Instant::now();
    loop {
        // Every 2 s: if the work area, display scaling or taskbar changed, move the strip back where it belongs.
        if last_display.elapsed() >= Duration::from_secs(2) {
            last_display = Instant::now();
            let key = area_key(&w);
            if key != last_area {
                last_area = key;
                place(&w);
            }
            let info = native::taskbar_info();
            if info != last_platform {
                last_platform = info.clone();
                let _ = app.emit("platform-changed", info);
            }
        }
        let s = *st.settings.lock().unwrap();
        // Every second: step aside while a fullscreen app (video, game, presentation) is in front.
        if last_fullscreen.elapsed() >= Duration::from_secs(1) {
            last_fullscreen = Instant::now();
            let fullscreen = s.hide_in_fullscreen && native::fullscreen_active();
            if fullscreen != s.auto_hidden {
                update(&app, |s| s.auto_hidden = fullscreen);
            }
        }
        if !s.visible || s.click_through || s.auto_hidden {
            if !ignoring && w.set_ignore_cursor_events(true).is_ok() {
                ignoring = true;
            }
            std::thread::sleep(Duration::from_millis(250));
            continue;
        }
        // Poll quickly only while the pointer is near the strip; otherwise a relaxed rate is plenty.
        std::thread::sleep(Duration::from_millis(if was_near { 40 } else { 120 }));
        let (Some((cx, cy)), Ok(pos), Ok(sf)) = (native::cursor_pos(), w.outer_position(), w.scale_factor()) else {
            continue;
        };
        if let Ok(size) = w.outer_size() {
            let rel_x = (cx - pos.x) as f64 / sf;
            let rel_y = (cy - pos.y) as f64 / sf;
            let near = rel_x >= 0.0 && rel_x < size.width as f64 / sf && rel_y >= -150.0 && rel_y < size.height as f64 / sf + 20.0;
            if near {
                let moved = cx.abs_diff(last_xy.0) > 8 || cy.abs_diff(last_xy.1) > 8;
                if !was_near || (moved && last_emit.elapsed() >= Duration::from_millis(120)) {
                    let _ = app.emit("cat-cursor", CursorPayload { near: true, x: rel_x, y: rel_y });
                    last_xy = (cx, cy);
                    last_emit = Instant::now();
                }
            } else if was_near {
                let _ = app.emit("cat-cursor", CursorPayload { near: false, x: 0.0, y: 0.0 });
            }
            was_near = near;
        }
        let rects = st.rects.lock().unwrap().clone();
        let inside = rects.iter().any(|r| {
            let rx = pos.x as f64 + r.x * sf;
            let ry = pos.y as f64 + r.y * sf;
            (cx as f64) >= rx && (cx as f64) < rx + r.w * sf && (cy as f64) >= ry && (cy as f64) < ry + r.h * sf
        });
        if inside == ignoring && w.set_ignore_cursor_events(!inside).is_ok() {
            ignoring = !inside;
        }
    }
}
