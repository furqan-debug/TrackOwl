// lib.rs — Trackora (Tauri v2)
// Phases 2-5: IPC, native tracking, SQLite cache, notifications, auto-updater
// Phase 6+: Direct Supabase REST API — no Express backend needed

mod tracker;
mod cache;
mod updater;

use tauri::Manager;
use tauri_plugin_notification::NotificationExt;
use serde::{Deserialize, Serialize};
use serde_json;
use chrono;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;

// ─── Shared App State ─────────────────────────────────────────────────────────
pub struct AppState {
    pub active_session_id: Option<String>,
    /// User's Supabase JWT — stored as Arc so cache.rs sync loop can read it
    pub auth_token: Arc<Mutex<Option<String>>>,
    pub supabase_url: String,
    pub supabase_anon_key: String,
    pub user_id: Option<String>,
    pub org_id: Option<String>,
    pub tracking_running: Arc<Mutex<bool>>,
    pub counts: Arc<Mutex<tracker::TrackerCounts>>,
    pub db: Arc<Mutex<Option<rusqlite::Connection>>>,
    pub is_idle_monitoring: Arc<Mutex<bool>>,
    pub last_idle_limit: Arc<Mutex<u32>>,
    pub close_behavior: Arc<Mutex<String>>,
}

impl Default for AppState {
    fn default() -> Self {
        let db = cache::init_db()
            .map(Some)
            .unwrap_or_else(|e| { eprintln!("[cache] DB init error: {}", e); None });

        Self {
            active_session_id: None,
            auth_token: Arc::new(Mutex::new(None)),
            supabase_url: std::env::var("VITE_SUPABASE_URL")
                .unwrap_or_else(|_| "https://lgmggbnaoyoapxqsfgzv.supabase.co".to_string()),
            supabase_anon_key: std::env::var("VITE_SUPABASE_ANON_KEY")
                .unwrap_or_else(|_| "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxnbWdnYm5hb3lvYXB4cXNmZ3p2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NTMxNDIsImV4cCI6MjA4ODEyOTE0Mn0.GkzsADYd-kpJYTgY9EZGwgy5kvN6nyYmfVoLUHRJQI4".to_string()),
            user_id: None,
            org_id: None,
            tracking_running: Arc::new(Mutex::new(false)),
            counts: Arc::new(Mutex::new(tracker::TrackerCounts::default())),
            db: Arc::new(Mutex::new(db)),
            is_idle_monitoring: Arc::new(Mutex::new(false)),
            last_idle_limit: Arc::new(Mutex::new(10)),
            close_behavior: Arc::new(Mutex::new("quit".to_string())),
        }
    }
}

// ─── Supabase API config (passed around instead of a bare URL string) ─────────
#[derive(Clone, Debug)]
pub struct SupabaseConfig {
    pub url: String,
    pub anon_key: String,
}

// ─── Response types ────────────────────────────────────────────────────────────
/// Supabase PostgREST returns an array on insert with Prefer: return=representation
#[derive(Serialize, Deserialize, Debug, Clone)]
struct SupabaseSessionRow {
    pub id: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct TrackingResult {
    pub status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub session_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

// ─── Supabase REST helpers ─────────────────────────────────────────────────────

pub fn supabase_post(
    cfg: &SupabaseConfig,
    table: &str,
    body: &str,
    auth_token: Option<&str>,
    prefer: Option<&str>,
) -> Result<String, String> {
    let url = format!("{}/rest/v1/{}", cfg.url, table);

    let agent = ureq::AgentBuilder::new()
        .timeout(std::time::Duration::from_secs(10))
        .build();

    let mut req = agent.post(&url)
        .set("apikey", &cfg.anon_key)
        .set("Content-Type", "application/json");

    if let Some(token) = auth_token {
        req = req.set("Authorization", &format!("Bearer {}", token));
    }
    if let Some(p) = prefer {
        req = req.set("Prefer", p);
    }

    match req.send_string(body) {
        Ok(resp) => resp.into_string().map_err(|e| e.to_string()),
        Err(ureq::Error::Status(code, resp)) => {
            let body = resp.into_string().unwrap_or_else(|_| "Unknown error body".to_string());
            Err(format!("Supabase POST error ({}): {}", code, body))
        }
        Err(e) => Err(format!("Supabase POST transport error: {}", e)),
    }
}

/// PATCH a Supabase PostgREST row by filter.
/// `filter` e.g. `"id=eq.my-uuid"`
pub fn supabase_patch(
    cfg: &SupabaseConfig,
    table: &str,
    filter: &str,
    body: &str,
    auth_token: Option<&str>,
) -> Result<String, String> {
    let url = format!("{}/rest/v1/{}?{}", cfg.url, table, filter);

    let agent = ureq::AgentBuilder::new()
        .timeout(std::time::Duration::from_secs(10))
        .build();

    let mut req = agent.patch(&url)
        .set("apikey", &cfg.anon_key)
        .set("Content-Type", "application/json");

    if let Some(token) = auth_token {
        req = req.set("Authorization", &format!("Bearer {}", token));
    }

    match req.send_string(body) {
        Ok(resp) => resp.into_string().map_err(|e| e.to_string()),
        Err(ureq::Error::Status(code, resp)) => {
            let body = resp.into_string().unwrap_or_else(|_| "Unknown error body".to_string());
            Err(format!("Supabase PATCH error ({}): {}", code, body))
        }
        Err(e) => Err(format!("Supabase PATCH transport error: {}", e)),
    }
}

/// Robust stop and sync logic used on exit or manual stop.
fn stop_and_sync_internal(state_handle: &Mutex<AppState>) {
    let (cfg, token, session_id, running, db_arc, auth_token_arc) = {
        let mut s = state_handle.lock().unwrap();
        let token = s.auth_token.lock().unwrap().clone();
        let cfg = SupabaseConfig { 
            url: s.supabase_url.clone(), 
            anon_key: s.supabase_anon_key.clone() 
        };
        let sid = s.active_session_id.take();
        (cfg, token, sid, Arc::clone(&s.tracking_running), Arc::clone(&s.db), Arc::clone(&s.auth_token))
    };
    
    *running.lock().unwrap() = false;
    if let Some(sid) = session_id {
        println!("[lib] 🛑 Stopping session via RPC: {}", sid);
        let body = serde_json::json!({ "p_session_id": sid }).to_string();
        let _ = supabase_post(&cfg, "rpc/rpc_stop_session", &body, token.as_deref(), None);
    }

    println!("[lib] 🔄 Final sync of cached samples...");
    cache::sync_from_arc(&db_arc, &cfg, &auth_token_arc);
}

/// GET from a Supabase PostgREST endpoint.
pub fn supabase_get(
    cfg: &SupabaseConfig,
    table: &str,
    filter: &str,
    auth_token: Option<&str>,
) -> Result<String, String> {
    let url = format!("{}/rest/v1/{}?{}", cfg.url, table, filter);

    let agent = ureq::AgentBuilder::new()
        .timeout(std::time::Duration::from_secs(10))
        .build();

    let mut req = agent.get(&url)
        .set("apikey", &cfg.anon_key);

    if let Some(token) = auth_token {
        req = req.set("Authorization", &format!("Bearer {}", token));
    }

    req.call()
        .map_err(|e| format!("Supabase GET error: {}", e))
        .and_then(|resp| resp.into_string().map_err(|e| e.to_string()))
}

// ─── IPC Commands ─────────────────────────────────────────────────────────────

/// invoke('start_tracking', { projectId, userId, token })
/// Creates a session row in Supabase and starts tracker threads.
#[tauri::command]
fn start_tracking(
    app: tauri::AppHandle,
    state: tauri::State<'_, Mutex<AppState>>,
    project_id: String,
    user_id: String,
    token: String,
) -> TrackingResult {
    // Check if tracking is already running to prevent duplicate loops
    {
        let is_running = state.lock().unwrap().tracking_running.lock().unwrap().clone();
        if is_running {
            return TrackingResult { 
                status: "running".to_string(), 
                session_id: state.lock().unwrap().active_session_id.clone(), 
                error: None 
            };
        }
    }
    
    let (cfg, counts, running, auth_arc, db_arc): (SupabaseConfig, Arc<Mutex<tracker::TrackerCounts>>, Arc<Mutex<bool>>, Arc<Mutex<Option<String>>>, Arc<Mutex<Option<rusqlite::Connection>>>) = {
        let mut s = state.lock().unwrap();
        *s.auth_token.lock().unwrap() = Some(token.clone());
        (
            SupabaseConfig { url: s.supabase_url.clone(), anon_key: s.supabase_anon_key.clone() },
            Arc::clone(&s.counts),
            Arc::clone(&s.tracking_running),
            Arc::clone(&s.auth_token),
            Arc::clone(&s.db),
        )
    };
    
    // ─── Phase 1: Clean/Start Session Atomic ─────────────────────────────────────
    // We now use an RPC function to ensure atomicity (closes old sessions and starts new one)

    // Fetch organization_id from the project to ensure correct scoping for multi-org users
    let org_id: Option<String> = match crate::supabase_get(
        &cfg,
        "projects",
        &format!("id=eq.{}&select=organization_id", project_id),
        Some(&token),
    ) {
        Ok(resp_body) => {
            let json_rows: serde_json::Value = serde_json::from_str(&resp_body).unwrap_or(serde_json::json!([]));
            let id = json_rows.get(0).and_then(|r| r.get("organization_id")).and_then(|v| v.as_str()).map(|s| s.to_string());
            println!("[lib] 🔍 Organization lookup for project {}: {:?}", project_id, id);
            id
        }
        Err(e) => {
            println!("[lib] ❌ Organization lookup FAILED for project {}: {}", project_id, e);
            None
        }
    };

    // Get public IP
    let ip_address: Option<String> = ureq::get("https://api.ipify.org")
        .call()
        .ok()
        .and_then(|r| r.into_string().ok());

    let body = serde_json::json!({
        "p_user_id": user_id,
        "p_project_id": project_id,
        "p_organization_id": org_id,
        "p_ip_address": ip_address,
    }).to_string();

    match supabase_post(&cfg, "rpc/rpc_start_session", &body, Some(&token), None) {
        Ok(resp_body) => {
            // RPC returns the JSON result directly: {"id": "...", "started_at": "..."}
            let row: Result<SupabaseSessionRow, _> = serde_json::from_str(&resp_body);
            match row {
                Ok(row) => {
                    let session_id: String = row.id.clone();
                    {
                        let mut s = state.lock().unwrap();
                        s.active_session_id = Some(session_id.clone());
                        s.user_id = Some(user_id.clone());
                        s.org_id = org_id.clone();
                        *s.tracking_running.lock().unwrap() = true;
                    }

                    // Reset counters
                    { let mut c = counts.lock().unwrap(); c.mouse_count = 0; c.keyboard_count = 0; }

                    // Start native trackers
                    tracker::start_sample_loop(
                        app.clone(), Arc::clone(&counts), session_id.clone(),
                        cfg.clone(), Arc::clone(&running), 60_000,
                        Arc::clone(&db_arc), Arc::clone(&auth_arc),
                    );
                    tracker::start_screenshot_loop(
                        app.clone(), session_id.clone(), cfg.clone(), Arc::clone(&running), 
                        Arc::clone(&auth_arc), org_id, user_id.clone()
                    );

                    // 30s offline sync loop
                    cache::start_sync_loop(cfg.clone(), Arc::clone(&auth_arc), Arc::clone(&running));

                    TrackingResult { status: "running".to_string(), session_id: Some(session_id), error: None }
                }
                Err(e) => TrackingResult {
                    status: "error".to_string(), session_id: None,
                    error: Some(format!("Failed to parse RPC response: {} (Body: {})", e, resp_body)),
                },
            }
        }
        Err(msg) => TrackingResult { status: "error".to_string(), session_id: None, error: Some(msg.to_string()) },
    }
}

/// invoke('stop_tracking')
#[tauri::command]
fn stop_tracking(state: tauri::State<'_, Mutex<AppState>>) -> TrackingResult {
    let (cfg, auth_arc, session_id, running, db_arc): (SupabaseConfig, Arc<Mutex<Option<String>>>, Option<String>, Arc<Mutex<bool>>, Arc<Mutex<Option<rusqlite::Connection>>>) = {
        let mut s = state.lock().unwrap();
        (
            SupabaseConfig { url: s.supabase_url.clone(), anon_key: s.supabase_anon_key.clone() },
            Arc::clone(&s.auth_token),
            s.active_session_id.take(),
            Arc::clone(&s.tracking_running),
            Arc::clone(&s.db),
        )
    };

    *running.lock().unwrap() = false;

    // Final sync from cache to Supabase
    cache::sync_from_arc(&db_arc, &cfg, &auth_arc);

    if let Some(sid) = session_id {
        let token = auth_arc.lock().unwrap().clone();
        let body = serde_json::json!({ "p_session_id": sid }).to_string();
        let _ = supabase_post(&cfg, "rpc/rpc_stop_session", &body, token.as_deref(), None);
    }

    TrackingResult { status: "stopped".to_string(), session_id: None, error: None }
}

/// invoke('pause_tracking')
#[tauri::command]
fn pause_tracking(state: tauri::State<'_, Mutex<AppState>>) -> TrackingResult {
    *state.lock().unwrap().tracking_running.lock().unwrap() = false;
    TrackingResult { status: "paused".to_string(), session_id: None, error: None }
}

/// invoke('resume_tracking')
#[tauri::command]
fn resume_tracking(
    app: tauri::AppHandle,
    state: tauri::State<'_, Mutex<AppState>>,
) -> TrackingResult {
    let (cfg, session_id, counts, running, auth_arc, db_arc, user_id, org_id): (SupabaseConfig, Option<String>, Arc<Mutex<tracker::TrackerCounts>>, Arc<Mutex<bool>>, Arc<Mutex<Option<String>>>, Arc<Mutex<Option<rusqlite::Connection>>>, Option<String>, Option<String>) = {
        let s = state.lock().unwrap();
        // Guard against duplicate loops
        if *s.tracking_running.lock().unwrap() {
            return TrackingResult { 
                status: "running".to_string(), 
                session_id: s.active_session_id.clone(), 
                error: None 
            };
        }
        (
            SupabaseConfig { url: s.supabase_url.clone(), anon_key: s.supabase_anon_key.clone() },
            s.active_session_id.clone(),
            Arc::clone(&s.counts),
            Arc::clone(&s.tracking_running),
            Arc::clone(&s.auth_token),
            Arc::clone(&s.db),
            s.user_id.clone(),
            s.org_id.clone(),
        )
    };

    let sid: String = match session_id {
        Some(id) => id,
        None => return TrackingResult {
            status: "error".to_string(), session_id: None,
            error: Some("No active session to resume".to_string()),
        },
    };

    *running.lock().unwrap() = true;

    tracker::start_sample_loop(
        app.clone(), Arc::clone(&counts), sid.clone(),
        cfg.clone(), Arc::clone(&running), 60_000, Arc::clone(&db_arc), Arc::clone(&auth_arc),
    );
    tracker::start_screenshot_loop(
        app.clone(), sid.clone(), cfg.clone(), Arc::clone(&running), 
        Arc::clone(&auth_arc), org_id, user_id.unwrap_or_default()
    );
    cache::start_sync_loop(cfg.clone(), Arc::clone(&auth_arc), Arc::clone(&running));

    TrackingResult { status: "running".to_string(), session_id: Some(sid), error: None }
}

/// invoke('show_notification_cmd', { title, body })
#[tauri::command]
fn show_notification_cmd(app: tauri::AppHandle, title: String, body: String) -> Result<(), String> {
    use tauri_plugin_notification::NotificationExt;
    app.notification().builder().title(title).body(body).show().map_err(|e: tauri_plugin_notification::Error| e.to_string())
}

/// invoke('install_update')
#[tauri::command]
async fn install_update(app: tauri::AppHandle) -> Result<(), String> {
    updater::install_update(app).await
}

/// invoke('set_auth_token', { token })
#[tauri::command]
fn set_auth_token(state: tauri::State<'_, Mutex<AppState>>, token: String) -> Result<(), String> {
    *state.lock().unwrap().auth_token.lock().unwrap() = Some(token);
    Ok(())
}

/// invoke('get_inactivity_status')
#[tauri::command]
fn get_inactivity_status(state: tauri::State<'_, Mutex<AppState>>) -> bool {
    let s = state.lock().unwrap();
    let mut c = s.counts.lock().unwrap();
    let active = c.mouse_count > 0 || c.keyboard_count > 0;
    c.mouse_count = 0;
    c.keyboard_count = 0;
    active
}

/// invoke('show_idle_dialog')
#[tauri::command]
fn show_idle_dialog(app: tauri::AppHandle, limit: u32) {
    use tauri::Manager;
    use tauri_plugin_dialog::{DialogExt, MessageDialogKind};

    if let Some(window) = app.get_webview_window("main") {
        let window: tauri::WebviewWindow = window;
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
        let _ = window.request_user_attention(Some(tauri::UserAttentionType::Critical));
    }
    
    app.dialog()
        .message(format!("You have been inactive for {} minutes. Tracking is paused.\n\nPlease resume from the app when you are back.", limit))
        .title("Inactivity Detected")
        .kind(MessageDialogKind::Warning)
        .show(|_| {});
}

/// invoke('start_idle_monitoring', { limit })
#[tauri::command]
fn start_idle_monitoring(state: tauri::State<'_, Mutex<AppState>>, limit: u32) {
    let s = state.lock().unwrap();
    *s.is_idle_monitoring.lock().unwrap() = true;
    *s.last_idle_limit.lock().unwrap() = limit;
    // Reset counts so we only detect new movement
    let mut c = s.counts.lock().unwrap();
    c.mouse_count = 0;
    c.keyboard_count = 0;
}

/// invoke('stop_idle_monitoring')
#[tauri::command]
fn stop_idle_monitoring(state: tauri::State<'_, Mutex<AppState>>) {
    let s = state.lock().unwrap();
    *s.is_idle_monitoring.lock().unwrap() = false;
}

/// invoke('get_location')
#[tauri::command]
fn get_location() -> Result<String, String> {
    // Try ipapi.co first
    if let Ok(resp) = ureq::get("https://ipapi.co/json/").timeout(std::time::Duration::from_secs(5)).call() {
        if let Ok(json) = resp.into_json::<serde_json::Value>() {
            if let (Some(city), Some(country)) = (json["city"].as_str(), json["country_name"].as_str()) {
                return Ok(format!("{}, {}", city, country));
            }
        }
    }
    
    // Fallback to ipwho.is
    if let Ok(resp) = ureq::get("https://ipwho.is/").timeout(std::time::Duration::from_secs(5)).call() {
        if let Ok(json) = resp.into_json::<serde_json::Value>() {
            if let (Some(city), Some(country)) = (json["city"].as_str(), json["country"].as_str()) {
                return Ok(format!("{}, {}", city, country));
            }
        }
    }

    Err("Could not detect location".to_string())
}

#[tauri::command]
fn set_close_behavior(behavior: String, state: tauri::State<'_, Mutex<AppState>>) {
    let s = state.lock().unwrap();
    let mut b = s.close_behavior.lock().unwrap();
    *b = behavior;
    println!("[lib] ⚙️ Close behavior set to: {}", *b);
}

// ─── App entry point ──────────────────────────────────────────────────────────
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let state = AppState::default();
    let counts = Arc::clone(&state.counts);

    tauri::Builder::default()
        .manage(Mutex::new(state))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(move |app: &mut tauri::App| {
            tracker::spawn_input_listener(Arc::clone(&counts));

            let app_handle = app.handle().clone();
            
            // --- System Tray ---
            let quit_i = tauri::menu::MenuItem::with_id(app, "quit", "Quit Trackora", true, None::<&str>)?;
            let show_i = tauri::menu::MenuItem::with_id(app, "show", "Show Window", true, None::<&str>)?;
            let menu = tauri::menu::Menu::with_items(app, &[&show_i, &quit_i])?;

            let _tray = tauri::tray::TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .on_menu_event(move |app, event| {
                    match event.id.as_ref() {
                        "quit" => {
                            let state_handle = app.state::<Mutex<AppState>>();
                            stop_and_sync_internal(&state_handle);
                            app.exit(0);
                        }
                        "show" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                        _ => {}
                    }
                })
                .build(app)?;

            tauri::async_runtime::spawn(async move {
                updater::check_for_updates(app_handle).await;
            });

            // --- BACKGROUND IDLE WATCHER ---
            let app_handle_watcher = app.handle().clone();
            std::thread::spawn(move || {
                loop {
                    std::thread::sleep(std::time::Duration::from_millis(500));
                    
                    let state = app_handle_watcher.state::<Mutex<AppState>>();
                    let (monitoring, limit) = {
                        let s = state.lock().unwrap();
                        let monitoring = *s.is_idle_monitoring.lock().unwrap();
                        let limit = *s.last_idle_limit.lock().unwrap();
                        (monitoring, limit)
                    };

                    if monitoring {
                        let active = {
                            let s = state.lock().unwrap();
                            let mut c = s.counts.lock().unwrap();
                            let active = c.mouse_count > 0 || c.keyboard_count > 0;
                            if active {
                                c.mouse_count = 0;
                                c.keyboard_count = 0;
                            }
                            active
                        };

                        if active {
                            {
                                let s = state.lock().unwrap();
                                *s.is_idle_monitoring.lock().unwrap() = false;
                            }
                            show_idle_dialog(app_handle_watcher.clone(), limit);
                        }
                    }
                }
            });

            #[cfg(debug_assertions)]
            {
                let window = app.get_webview_window("main").unwrap();
                window.open_devtools();
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            start_tracking,
            stop_tracking,
            pause_tracking,
            resume_tracking,
            show_notification_cmd,
            install_update,
            set_auth_token,
            get_inactivity_status,
            show_idle_dialog,
            start_idle_monitoring,
            stop_idle_monitoring,
            get_location,
            set_close_behavior,
        ])
        .on_window_event(|window: &tauri::Window, event: &tauri::WindowEvent| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                let state_handle = window.state::<Mutex<AppState>>();
                let behavior = {
                    let s = state_handle.lock().unwrap();
                    let b = s.close_behavior.lock().unwrap();
                    b.clone()
                };

                if behavior == "minimize" {
                    api.prevent_close();
                    let _ = window.hide();
                    println!("[lib] 🔽 Minimized to tray");
                } else {
                    // Default 'quit' behavior
                    println!("[lib] 🛑 Closing requested (Quit behavior)");
                    api.prevent_close(); // Prevent immediate close so we can sync
                    stop_and_sync_internal(&state_handle);
                    window.app_handle().exit(0); // Now exit
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running Trackora");
}
