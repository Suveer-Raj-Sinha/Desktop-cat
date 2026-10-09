use std::fs;
use std::io::Write;
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Manager};

const FILE: &str = "save.json";
const TMP: &str = "save.json.tmp";
const BAK: &str = "save.json.bak";
const MAX_BYTES: usize = 1_000_000;

// One file operation at a time, so a write can never overlap a read or a reset.
static IO: Mutex<()> = Mutex::new(());

fn dir(app: &AppHandle) -> Result<PathBuf, String> {
    let d = app.path().app_local_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&d).map_err(|e| e.to_string())?;
    Ok(d)
}

fn stamp() -> u64 {
    SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_secs()).unwrap_or(0)
}

// Returns the newest readable save text, falling back to the backup. The page validates the contents.
#[tauri::command]
pub async fn load_game(app: AppHandle) -> Result<Option<String>, String> {
    let _g = IO.lock().unwrap();
    let d = dir(&app)?;
    for name in [FILE, BAK] {
        let p = d.join(name);
        match fs::read_to_string(&p) {
            Ok(s) => {
                if serde_json::from_str::<serde_json::Value>(&s).is_ok() {
                    return Ok(Some(s));
                }
                let _ = fs::rename(&p, d.join(format!("{name}.corrupt-{}", stamp())));
            }
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => {}
            Err(e) => return Err(e.to_string()),
        }
    }
    Ok(None)
}

// Atomic write: write a temp file, flush it to disk, keep the previous save as a backup, then swap it in.
#[tauri::command]
pub async fn save_game(app: AppHandle, data: String) -> Result<(), String> {
    if data.len() > MAX_BYTES {
        return Err("save data is too large".into());
    }
    serde_json::from_str::<serde_json::Value>(&data).map_err(|e| format!("invalid JSON: {e}"))?;
    let _g = IO.lock().unwrap();
    let d = dir(&app)?;
    let target = d.join(FILE);
    let tmp = d.join(TMP);
    {
        let mut f = fs::File::create(&tmp).map_err(|e| e.to_string())?;
        f.write_all(data.as_bytes()).map_err(|e| e.to_string())?;
        f.sync_all().map_err(|e| e.to_string())?;
    }
    if target.exists() {
        let _ = fs::copy(&target, d.join(BAK));
    }
    fs::rename(&tmp, &target).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn reset_game(app: AppHandle) -> Result<(), String> {
    let _g = IO.lock().unwrap();
    let d = dir(&app)?;
    for name in [FILE, BAK, TMP] {
        match fs::remove_file(d.join(name)) {
            Ok(()) => {}
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => {}
            Err(e) => return Err(e.to_string()),
        }
    }
    Ok(())
}

// Sets an unusable save aside (never deletes it) so a fresh one can be started.
#[tauri::command]
pub async fn quarantine_save(app: AppHandle) -> Result<(), String> {
    let _g = IO.lock().unwrap();
    let d = dir(&app)?;
    let p = d.join(FILE);
    if p.exists() {
        fs::rename(&p, d.join(format!("{FILE}.unreadable-{}", stamp()))).map_err(|e| e.to_string())?;
    }
    Ok(())
}
