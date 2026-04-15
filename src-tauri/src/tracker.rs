// tracker.rs — Phase 3: Native activity tracking in Rust
// Replaces: electron/tracker.ts (uiohook-napi + active-win)
//
// Architecture:
//   • A background std::thread runs rdev::listen() to catch global mouse/keyboard events
//   • Counts are stored in a Mutex<TrackerCounts>
//   • On start_tracking, a tokio task fires every 60s, reads+resets counts, emits
//     a Tauri "tracking-sample" event to the frontend
//   • Screenshots are captured at random intervals within a 2-min window and
//     sent directly to the backend via HTTP (same as Electron)

use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;
use rdev::{listen, Event, EventType};
use tauri::{AppHandle, Emitter};
use serde::{Deserialize, Serialize};

// ─── Shared counts (accessed from rdev listener thread) ───────────────────────
#[derive(Default)]
pub struct TrackerCounts {
    pub mouse_count: u32,
    pub keyboard_count: u32,
}

// ─── Sample payload sent to React frontend ────────────────────────────────────
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ActivitySample {
    pub session_id: String,
    pub recorded_at: String,
    pub mouse_clicks: u32,
    pub key_presses: u32,
    pub app_name: String,
    pub window_title: String,
    pub domain: String,
    pub idle: bool,
    pub activity_percent: i32,
    pub is_offline: bool,
}

// ─── Screenshot payload ───────────────────────────────────────────────────────
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ScreenshotPayload {
    pub session_id: String,
    pub timestamp: String,
    pub base64: String,
}

// ─── Global input hook — runs on a dedicated thread ─────────────────────────
/// Spawns rdev listener in a background thread.
/// All mouse/keyboard events are counted in `counts`.
pub fn spawn_input_listener(counts: Arc<Mutex<TrackerCounts>>) {
    thread::spawn(move || {
        if let Err(e) = listen(move |event: Event| {
            match event.event_type {
                EventType::KeyPress(_) => {
                    if let Ok(mut c) = counts.lock() {
                        c.keyboard_count += 1;
                    }
                }
                EventType::ButtonPress(_) => {
                    if let Ok(mut c) = counts.lock() {
                        c.mouse_count += 1;
                    }
                }
                _ => {}
            }
        }) {
            eprintln!("[tracker] rdev listen error: {:?}", e);
        }
    });
}

// ─── Active window detection (Windows) ────────────────────────────────────────
/// Returns (app_name, window_title) of the currently focused window.
#[cfg(target_os = "windows")]
pub fn get_active_window() -> (String, String) {
    use std::ptr;
    // SAFETY: Win32 API calls are safe here since we are reading read-only window info
    unsafe {
        // Get handle to foreground window
        let hwnd = winapi_get_foreground_window();
        if hwnd == 0 {
            return ("Unknown".to_string(), "Unknown".to_string());
        }

        let title = get_window_text(hwnd);
        let app_name = get_process_name(hwnd);
        drop(ptr::null::<i32>()); // suppress unused import warning
        (app_name, title)
    }
}

#[cfg(not(target_os = "windows"))]
pub fn get_active_window() -> (String, String) {
    // macOS / Linux stubs — implement in Phase 3 extension
    ("Unknown".to_string(), "Unknown".to_string())
}

// Internal Windows helpers using raw FFI (no external crate needed)
#[cfg(target_os = "windows")]
unsafe fn winapi_get_foreground_window() -> usize {
    #[link(name = "user32")]
    extern "system" {
        fn GetForegroundWindow() -> usize;
    }
    GetForegroundWindow()
}

#[cfg(target_os = "windows")]
unsafe fn get_window_text(hwnd: usize) -> String {
    #[link(name = "user32")]
    extern "system" {
        fn GetWindowTextW(hwnd: usize, lpstring: *mut u16, nmaxcount: i32) -> i32;
    }
    let mut buf = vec![0u16; 512];
    let len = GetWindowTextW(hwnd, buf.as_mut_ptr(), buf.len() as i32);
    String::from_utf16_lossy(&buf[..len.max(0) as usize])
}

#[cfg(target_os = "windows")]
unsafe fn get_process_name(hwnd: usize) -> String {
    #[link(name = "user32")]
    extern "system" {
        fn GetWindowThreadProcessId(hwnd: usize, lpdwprocessid: *mut u32) -> u32;
    }
    #[link(name = "kernel32")]
    extern "system" {
        fn OpenProcess(dwdesiredaccess: u32, binherithandle: i32, dwprocessid: u32) -> usize;
        fn CloseHandle(hobject: usize) -> i32;
    }
    #[link(name = "psapi")]
    extern "system" {
        fn GetModuleBaseNameW(hprocess: usize, hmodule: usize, lpbasename: *mut u16, nsize: u32) -> u32;
    }

    let mut pid: u32 = 0;
    GetWindowThreadProcessId(hwnd, &mut pid);
    if pid == 0 {
        return "Unknown".to_string();
    }

    // PROCESS_QUERY_INFORMATION | PROCESS_VM_READ
    let hprocess = OpenProcess(0x0410, 0, pid);
    if hprocess == 0 {
        return "Unknown".to_string();
    }

    let mut name_buf = vec![0u16; 256];
    let len = GetModuleBaseNameW(hprocess, 0, name_buf.as_mut_ptr(), name_buf.len() as u32);
    CloseHandle(hprocess);

    if len == 0 {
        return "Unknown".to_string();
    }
    String::from_utf16_lossy(&name_buf[..len as usize])
        .trim_end_matches(".exe")
        .to_string()
}

// ─── Browser URL extraction (PowerShell UIAutomation) ────────────────────────
const BROWSER_NAMES: &[&str] = &[
    "chrome", "google chrome", "chromium", "firefox", "mozilla firefox",
    "msedge", "microsoft edge", "brave", "opera", "vivaldi", "arc",
];

pub fn get_browser_domain(app_name: &str, title: &str) -> String {
    let lower = app_name.to_lowercase();
    if !BROWSER_NAMES.iter().any(|b| lower.contains(b)) {
        return String::new();
    }

    // Try PowerShell UIAutomation (Windows only)
    #[cfg(target_os = "windows")]
    if let Some(url) = get_url_via_powershell() {
        return url;
    }

    // Fallback: parse domain from window title
    extract_domain_from_title(title)
}

#[cfg(target_os = "windows")]
fn get_url_via_powershell() -> Option<String> {
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x08000000;

    let ps_script = r#"
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
$focused = [System.Windows.Automation.AutomationElement]::FocusedElement
if ($null -eq $focused) { exit 1 }
$parent = $focused
for ($i = 0; $i -lt 8; $i++) {
  $pattern = $null
  try { $pattern = $parent.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern) } catch {}
  if ($pattern) {
    $val = ($pattern).Current.Value
    if ($val -match '^https?://') { Write-Output $val; exit 0 }
  }
  try { $parent = $parent.TreeWalker.RawViewWalker.GetParent($parent) } catch { break }
  if ($null -eq $parent) { break }
}
exit 1
"#;

    let output = std::process::Command::new("powershell")
        .creation_flags(CREATE_NO_WINDOW)
        .args(["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", ps_script])
        .output()
        .ok()?;

    let raw = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if raw.is_empty() { return None; }

    // Extract hostname by simple string parsing (no url crate needed)
    let hostname = if let Some(after_scheme) = raw.strip_prefix("https://").or_else(|| raw.strip_prefix("http://")) {
        after_scheme.split('/').next().unwrap_or(after_scheme)
                     .split('?').next().unwrap_or(after_scheme)
                     .split('#').next().unwrap_or(after_scheme)
    } else {
        raw.as_str()
    };

    Some(hostname.to_string())
}

fn extract_domain_from_title(title: &str) -> String {
    // Strip known browser suffixes
    let suffixes = [" - Google Chrome", " - Microsoft Edge", " - Mozilla Firefox", " — Firefox", " - Brave"];
    let mut t = title.to_string();
    for suffix in &suffixes {
        if t.ends_with(suffix) {
            t = t[..t.len() - suffix.len()].to_string();
            break;
        }
    }
    // Try to extract a domain
    let re_domain = regex_domain(&t);
    re_domain.unwrap_or_default()
}

fn regex_domain(s: &str) -> Option<String> {
    // Simple manual parse: look for word.word pattern
    for word in s.split_whitespace() {
        let w = word.trim_matches(|c: char| !c.is_alphanumeric() && c != '.' && c != '-');
        if w.matches('.').count() >= 1 {
            let parts: Vec<&str> = w.split('.').collect();
            if parts.len() >= 2 && parts.last().map(|p| p.len() >= 2).unwrap_or(false) {
                return Some(w.to_lowercase());
            }
        }
    }
    None
}

// ─── 60-second sample loop ────────────────────────────────────────────────────
/// Emits "tracking-sample" Tauri events every `interval_ms`.
/// Writes to SQLite cache first, then syncs to Supabase /rest/v1/activity_samples.
pub fn start_sample_loop(
    app: AppHandle,
    counts: Arc<Mutex<TrackerCounts>>,
    session_id: String,
    cfg: crate::SupabaseConfig,
    running: Arc<Mutex<bool>>,
    interval_ms: u64,
    db: Arc<Mutex<Option<rusqlite::Connection>>>,
    auth_token: Arc<Mutex<Option<String>>>,
) {
    thread::spawn(move || {
        loop {
            if !*running.lock().unwrap() { break; }

            let (mouse, keyboard) = {
                let mut c = counts.lock().unwrap();
                let m = c.mouse_count;
                let k = c.keyboard_count;
                c.mouse_count = 0;
                c.keyboard_count = 0;
                (m, k)
            };

            let (app_name, window_title) = get_active_window();
            let domain = get_browser_domain(&app_name, &window_title);
            let idle = mouse == 0 && keyboard == 0;

            // Simple activity percentage calculation:
            // 60-second window, 1 point for any activity
            let activity_percent = if !idle { 100 } else { 0 };

            let sample = ActivitySample {
                session_id: session_id.clone(),
                recorded_at: chrono::Utc::now().to_rfc3339(),
                mouse_clicks: mouse,
                key_presses: keyboard,
                app_name,
                window_title,
                domain,
                idle,
                activity_percent,
                is_offline: false,
            };

            // Emit to React UI
            let _ = app.emit("tracking-sample", &sample);

            // Cache first, then sync to Supabase
            let mut db_exists = false;
            {
                let db_guard = db.lock().unwrap();
                if let Some(conn) = db_guard.as_ref() {
                    db_exists = true;
                    if let Err(e) = crate::cache::cache_sample(conn, &sample) {
                        eprintln!("[tracker] cache write error: {}", e);
                    }
                }
            } // Lock is dropped here

            if db_exists {
                crate::cache::sync_from_arc(&db, &cfg, &auth_token);
            } else {
                // No DB — post the single sample directly to Supabase REST
                let body = serde_json::json!([{
                    "session_id":      sample.session_id,
                    "recorded_at":     sample.recorded_at,
                    "mouse_clicks":    sample.mouse_clicks,
                    "key_presses":     sample.key_presses,
                    "app_name":        sample.app_name,
                    "window_title":    sample.window_title,
                    "domain":          sample.domain,
                    "idle":            sample.idle,
                    "activity_percent": sample.activity_percent,
                    "is_offline":      sample.is_offline,
                }]).to_string();
                let token = auth_token.lock().unwrap().clone();
                let _ = crate::supabase_post(&cfg, "activity_samples", &body, token.as_deref(), None);
            }
            thread::sleep(Duration::from_millis(interval_ms));
        }
    });
}

// ─── Screenshot loop ───────────────────────────────────────────────────────────
const SCREENSHOT_WINDOW_MS: u64 = 10 * 60 * 1000; // 10 minutes
const SCREENSHOTS_PER_WINDOW: usize = 3;

pub fn start_screenshot_loop(
    app: AppHandle,
    session_id: String,
    cfg: crate::SupabaseConfig,
    running: Arc<Mutex<bool>>,
    auth_token: Arc<Mutex<Option<String>>>,
    organization_id: Option<String>,
    user_id: String,
) {
    thread::spawn(move || {
        // --- 1. Capture one screenshot immediately on start ---
        if let Some(base64_data) = capture_screenshot() {
            let captured_at = chrono::Utc::now();
            let recorded_at = captured_at.to_rfc3339();
            
            // Hierarchical structure: organization_id / user_id / screenshots / session_id / filename
            let org_slug = organization_id.clone().unwrap_or_else(|| "unknown".to_string());
            let timestamp_num = captured_at.timestamp_millis();
            let filename = format!("{}/{}/{}.jpg", org_slug, user_id, timestamp_num);
            
            let storage_url = format!("{}/storage/v1/object/screenshots/{}", cfg.url, filename);
            println!("[tracker] 📸 CAPTURING INITIAL SCREENSHOT: Path={}", filename);

            use base64::Engine;
            if let Ok(image_bytes) = base64::engine::general_purpose::STANDARD.decode(&base64_data) {
                let s_token = auth_token.lock().unwrap().clone();
                let agent = ureq::AgentBuilder::new()
                    .timeout(std::time::Duration::from_secs(15))
                    .build();
                let mut req = agent.post(&storage_url)
                    .set("apikey", &cfg.anon_key)
                    .set("Content-Type", "image/jpeg");
                
                if let Some(token) = &s_token {
                    req = req.set("Authorization", &format!("Bearer {}", token));
                }

                if let Ok(_) = req.send_bytes(image_bytes.as_slice()) {
                    let _ = app.emit("screenshot-captured", {});
                    let body = serde_json::json!({
                        "session_id": session_id,
                        "recorded_at": recorded_at,
                        "file_url": filename, // Store relative path
                    }).to_string();
                    let _ = crate::supabase_post(&cfg, "screenshots", &body, s_token.as_deref(), None);
                }
            }
        }

        // --- 2. Enter random capture loop ---
        loop {
            if !*running.lock().unwrap() { break; }
            let window_start = std::time::Instant::now();

            // Generate random capture times within the window
            let mut capture_times: Vec<u64> = (0..SCREENSHOTS_PER_WINDOW)
                .map(|_| rand_ms(SCREENSHOT_WINDOW_MS))
                .collect();
            capture_times.sort();

            let mut last_sleep_end = 0;

            for &time_ms in &capture_times {
                if !*running.lock().unwrap() { break; }
                
                let to_sleep = time_ms.saturating_sub(last_sleep_end);
                if to_sleep > 0 {
                    thread::sleep(Duration::from_millis(to_sleep));
                }
                last_sleep_end = time_ms;

                if !*running.lock().unwrap() { break; }

                if let Some(base64_data) = capture_screenshot() {
                    let captured_at = chrono::Utc::now();
                    let recorded_at = captured_at.to_rfc3339();
                    
                    let org_slug = organization_id.clone().unwrap_or_else(|| "unknown".to_string());
                    let timestamp_num = captured_at.timestamp_millis();
                    let filename = format!("{}/{}/{}.jpg", org_slug, user_id, timestamp_num);
                    
                    let storage_url = format!("{}/storage/v1/object/screenshots/{}", cfg.url, filename);
                    println!("[tracker] 📸 CAPTURING RANDOM SCREENSHOT ({} of {}): Path={}", 
                        capture_times.iter().position(|&t| t == time_ms).unwrap_or(0) + 1,
                        SCREENSHOTS_PER_WINDOW,
                        filename
                    );

                    {
                        use base64::Engine;
                        if let Ok(image_bytes) = base64::engine::general_purpose::STANDARD.decode(&base64_data) {
                            let s_token = auth_token.lock().unwrap().clone();

                            let agent = ureq::AgentBuilder::new()
                                .timeout(std::time::Duration::from_secs(15))
                                .build();
                            let mut req = agent.post(&storage_url)
                                .set("apikey", &cfg.anon_key)
                                .set("Content-Type", "image/jpeg");
                            
                            if let Some(token) = &s_token {
                                req = req.set("Authorization", &format!("Bearer {}", token));
                            }

                            let upload_res = req.send_bytes(image_bytes.as_slice());

                            if upload_res.is_ok() {
                                let _ = app.emit("screenshot-captured", {});
                                let body = serde_json::json!({
                                    "session_id": session_id,
                                    "recorded_at": recorded_at,
                                    "file_url": filename,
                                }).to_string();
                                
                                let _ = crate::supabase_post(&cfg, "screenshots", &body, s_token.as_deref(), None);
                            }
                        }
                    }
                }
            }

            if !*running.lock().unwrap() { break; }

            // Wait out the remainder of the window
            let used = window_start.elapsed().as_millis() as u64;
            let remaining = SCREENSHOT_WINDOW_MS.saturating_sub(used);
            if remaining > 0 {
                thread::sleep(Duration::from_millis(remaining));
            }
        }
    });
}

fn rand_ms(max: u64) -> u64 {
    // Simple LCG-based "random" — no rand crate needed
    use std::time::{SystemTime, UNIX_EPOCH};
    let seed = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.subsec_nanos())
        .unwrap_or(12345) as u64;
    (seed.wrapping_mul(6364136223846793005).wrapping_add(1442695040888963407)) % max
}

fn capture_screenshot() -> Option<String> {
    use screenshots::Screen;
    use base64::{Engine, engine::general_purpose::STANDARD};
    use image::codecs::jpeg::JpegEncoder;
    use image::ImageEncoder;

    let screens = Screen::all().ok()?;
    let screen = screens.into_iter().next()?;
    let image = screen.capture().ok()?;

    // Aggressive downscaling: Max width 1600px
    let (orig_width, orig_height) = image.dimensions();
    let final_image = if orig_width > 1600 {
        let new_width = 1600;
        let new_height = (orig_height as f32 * (1600.0 / orig_width as f32)) as u32;
        image::imageops::resize(&image, new_width, new_height, image::imageops::FilterType::Lanczos3)
    } else {
        image
    };

    let (width, height) = final_image.dimensions();
    let mut jpeg_bytes: Vec<u8> = Vec::new();
    
    // Quality 60 is aggressive but preserves readability for UI/text
    let encoder = JpegEncoder::new_with_quality(std::io::Cursor::new(&mut jpeg_bytes), 60);
    encoder.write_image(
        final_image.as_raw(),
        width,
        height,
        image::ColorType::Rgba8.into(),
    ).ok()?;

    Some(STANDARD.encode(&jpeg_bytes))
}
