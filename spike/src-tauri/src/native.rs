// Windows-only queries, kept in one place. Every function has a harmless fallback on other systems.
use serde::Serialize;

#[derive(Clone, PartialEq, Serialize)]
pub struct TaskbarInfo {
    pub edge: String, // "bottom", "top", "left", "right" or "unknown"
    pub auto_hide: bool,
    pub icons_left: bool, // icons start at the left (Windows 10, or Windows 11 set to left alignment)
}

#[cfg(windows)]
pub fn work_area() -> Option<(i32, i32, i32, i32)> {
    use windows_sys::Win32::Foundation::RECT;
    use windows_sys::Win32::UI::WindowsAndMessaging::{SystemParametersInfoW, SPI_GETWORKAREA};
    let mut r = RECT { left: 0, top: 0, right: 0, bottom: 0 };
    let ok = unsafe { SystemParametersInfoW(SPI_GETWORKAREA, 0, &mut r as *mut RECT as *mut _, 0) };
    if ok != 0 { Some((r.left, r.top, r.right, r.bottom)) } else { None }
}

#[cfg(windows)]
pub fn cursor_pos() -> Option<(i32, i32)> {
    use windows_sys::Win32::Foundation::POINT;
    use windows_sys::Win32::UI::WindowsAndMessaging::GetCursorPos;
    let mut p = POINT { x: 0, y: 0 };
    if unsafe { GetCursorPos(&mut p) } != 0 { Some((p.x, p.y)) } else { None }
}

// True while a fullscreen app (video, game) or presentation mode is in front, as Windows itself reports it.
#[cfg(windows)]
pub fn fullscreen_active() -> bool {
    use windows_sys::Win32::UI::Shell::SHQueryUserNotificationState;
    let mut state: i32 = 0;
    let hr = unsafe { SHQueryUserNotificationState(&mut state) };
    // 2 = busy (fullscreen app), 3 = Direct3D fullscreen, 4 = presentation mode
    hr >= 0 && (state == 2 || state == 3 || state == 4)
}

#[cfg(windows)]
pub fn taskbar_info() -> TaskbarInfo {
    use windows_sys::Win32::UI::Shell::{
        SHAppBarMessage, ABE_BOTTOM, ABE_LEFT, ABE_RIGHT, ABE_TOP, ABM_GETSTATE, ABM_GETTASKBARPOS, ABS_AUTOHIDE, APPBARDATA,
    };
    let mut pos: APPBARDATA = unsafe { std::mem::zeroed() };
    pos.cbSize = std::mem::size_of::<APPBARDATA>() as u32;
    let found = unsafe { SHAppBarMessage(ABM_GETTASKBARPOS, &mut pos) } != 0;
    let edge = if !found {
        "unknown"
    } else if pos.uEdge == ABE_BOTTOM {
        "bottom"
    } else if pos.uEdge == ABE_TOP {
        "top"
    } else if pos.uEdge == ABE_LEFT {
        "left"
    } else if pos.uEdge == ABE_RIGHT {
        "right"
    } else {
        "unknown"
    };
    let mut st: APPBARDATA = unsafe { std::mem::zeroed() };
    st.cbSize = std::mem::size_of::<APPBARDATA>() as u32;
    let state = unsafe { SHAppBarMessage(ABM_GETSTATE, &mut st) } as u32;
    TaskbarInfo { edge: edge.to_string(), auto_hide: state & ABS_AUTOHIDE != 0, icons_left: icons_left() }
}

#[cfg(windows)]
fn wide(s: &str) -> Vec<u16> {
    s.encode_utf16().chain(std::iter::once(0)).collect()
}

#[cfg(windows)]
fn reg_dword(root: windows_sys::Win32::System::Registry::HKEY, sub: &str, name: &str) -> Option<u32> {
    use windows_sys::Win32::System::Registry::{RegGetValueW, RRF_RT_REG_DWORD};
    let (sub, name) = (wide(sub), wide(name));
    let mut data: u32 = 0;
    let mut size = std::mem::size_of::<u32>() as u32;
    let rc = unsafe {
        RegGetValueW(root, sub.as_ptr(), name.as_ptr(), RRF_RT_REG_DWORD, std::ptr::null_mut(), &mut data as *mut u32 as *mut _, &mut size)
    };
    if rc == 0 { Some(data) } else { None }
}

#[cfg(windows)]
fn reg_string(root: windows_sys::Win32::System::Registry::HKEY, sub: &str, name: &str) -> Option<String> {
    use windows_sys::Win32::System::Registry::{RegGetValueW, RRF_RT_REG_SZ};
    let (sub, name) = (wide(sub), wide(name));
    let mut buf = [0u16; 64];
    let mut size = (buf.len() * 2) as u32;
    let rc = unsafe { RegGetValueW(root, sub.as_ptr(), name.as_ptr(), RRF_RT_REG_SZ, std::ptr::null_mut(), buf.as_mut_ptr() as *mut _, &mut size) };
    if rc != 0 {
        return None;
    }
    let len = (size as usize / 2).saturating_sub(1).min(buf.len()); // size includes the terminating null
    Some(String::from_utf16_lossy(&buf[..len]))
}

// Windows 10 always left-aligns the icons. Windows 11 (build 22000+) lets the user choose: 0 = left, 1 = centre (default).
#[cfg(windows)]
fn icons_left() -> bool {
    use windows_sys::Win32::System::Registry::{HKEY_CURRENT_USER, HKEY_LOCAL_MACHINE};
    let build = reg_string(HKEY_LOCAL_MACHINE, "SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion", "CurrentBuildNumber")
        .and_then(|s| s.trim().parse::<u32>().ok())
        .unwrap_or(22000);
    if build < 22000 {
        return true;
    }
    reg_dword(HKEY_CURRENT_USER, "Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced", "TaskbarAl") == Some(0)
}

#[cfg(not(windows))]
pub fn work_area() -> Option<(i32, i32, i32, i32)> {
    None
}

#[cfg(not(windows))]
pub fn cursor_pos() -> Option<(i32, i32)> {
    None
}

#[cfg(not(windows))]
pub fn fullscreen_active() -> bool {
    false
}

#[cfg(not(windows))]
pub fn taskbar_info() -> TaskbarInfo {
    TaskbarInfo { edge: "unknown".to_string(), auto_hide: false, icons_left: false }
}
