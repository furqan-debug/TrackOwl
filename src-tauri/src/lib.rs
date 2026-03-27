// lib.rs — Trackora (Tauri v2)
// Phases 2-5: IPC, native tracking, SQLite cache, notifications, auto-updater
// Phase 6+: Direct Supabase REST API — no Express backend needed

mod tracker;
mod cache;
mod updater;

use tauri::Manager;
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};

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

    let mut req = ureq::post(&url)
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

    let mut req = ureq::patch(&url)
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

/// GET from a Supabase PostgREST endpoint.
pub fn supabase_get(
    cfg: &SupabaseConfig,
    table: &str,
    filter: &str,
    auth_token: Option<&str>,
) -> Result<String, String> {
    let url = format!("{}/rest/v1/{}?{}", cfg.url, table, filter);

    let mut req = ureq::get(&url)
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
    let (cfg, counts, running, auth_arc, db_arc) = {
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
    
    // Self-healing: Close any other open sessions for this user before starting a new one.
    // PostgREST: filter is user_id=eq.X&ended_at=is.null
    let cleanup_body = serde_json::json!({ "ended_at": chrono::Utc::now().to_rfc3339() }).to_string();
    let _ = crate::supabase_patch(
        &cfg, 
        "sessions", 
        &format!("user_id=eq.{}&ended_at=is.null", user_id), 
        &cleanup_body, 
        Some(&token)
    );

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

    // Insert session row — PostgREST returns array with Prefer: return=representation
    let now = chrono::Utc::now().to_rfc3339();
    let body = serde_json::json!({
        "user_id": user_id,
        "project_id": project_id,
        "started_at": now,
        "organization_id": org_id,
        "ip_address": ip_address,
    }).to_string();

    match supabase_post(&cfg, "sessions", &body, Some(&token), Some("return=representation")) {
        Ok(resp_body) => {
            // PostgREST returns an array: [{...}]
            let rows: Result<Vec<SupabaseSessionRow>, _> = serde_json::from_str(&resp_body);
            match rows.ok().and_then(|mut v| v.pop()) {
                Some(row) => {
                    let session_id = row.id.clone();
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
                        Arc::clone(&auth_arc), org_id, user_id
                    );

                    // 30s offline sync loop
                    cache::start_sync_loop(cfg.clone(), Arc::clone(&auth_arc), Arc::clone(&running));

                    TrackingResult { status: "running".to_string(), session_id: Some(session_id), error: None }
                }
                None => TrackingResult {
                    status: "error".to_string(), session_id: None,
                    error: Some(format!("Unexpected response from Supabase: {}", resp_body)),
                },
            }
        }
        Err(msg) => TrackingResult { status: "error".to_string(), session_id: None, error: Some(msg) },
    }
}

/// invoke('stop_tracking')
#[tauri::command]
fn stop_tracking(state: tauri::State<'_, Mutex<AppState>>) -> TrackingResult {
    let (cfg, token, session_id, running) = {
        let mut s = state.lock().unwrap();
        let token = s.auth_token.lock().unwrap().clone();
        let cfg = SupabaseConfig { 
            url: s.supabase_url.clone(), 
            anon_key: s.supabase_anon_key.clone() 
        };
        (cfg, token, s.active_session_id.take(), Arc::clone(&s.tracking_running))
    };

    *running.lock().unwrap() = false;

    if let Some(sid) = session_id {
        let ended = chrono::Utc::now().to_rfc3339();
        let body = serde_json::json!({ "ended_at": ended }).to_string();
        let _ = supabase_patch(&cfg, "sessions", &format!("id=eq.{}", sid), &body, token.as_deref());
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
    let (cfg, session_id, counts, running, auth_arc, db_arc, user_id, org_id) = {
        let s = state.lock().unwrap();
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

    let sid = match session_id {
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
    app.notification().builder().title(title).body(body).show().map_err(|e| e.to_string())
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
        .setup(move |app| {
            tracker::spawn_input_listener(Arc::clone(&counts));

            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                updater::check_for_updates(app_handle).await;
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
        ])
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                // When 'X' is clicked, try to stop tracking
                let state_handle = window.state::<Mutex<AppState>>();
                let (cfg, token, session_id, running) = {
                    let mut s = state_handle.lock().unwrap();
                    let token = s.auth_token.lock().unwrap().clone();
                    let cfg = SupabaseConfig { 
                        url: s.supabase_url.clone(), 
                        anon_key: s.supabase_anon_key.clone() 
                    };
                    (cfg, token, s.active_session_id.take(), Arc::clone(&s.tracking_running))
                };
                
                *running.lock().unwrap() = false;
                if let Some(sid) = session_id {
                    let ended = chrono::Utc::now().to_rfc3339();
                    let body = serde_json::json!({ "ended_at": ended }).to_string();
                    let _ = supabase_patch(&cfg, "sessions", &format!("id=eq.{}", sid), &body, token.as_deref());
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running Trackora");
}
