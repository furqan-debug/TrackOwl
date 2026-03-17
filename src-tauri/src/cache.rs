// cache.rs — Phase 4: Offline SQLite cache for activity samples
// Replaces: electron/cache.ts (JSON file)  +  electron/api.ts (sync loop)
//
// Flow:
//   1. Every 60-second sample is written to SQLite cache FIRST (resilient)
//   2. A background 30s sync loop reads unsynced rows and POSTs to /api/heartbeats
//   3. On success, rows are marked synced
//   4. Rows synced >7 days ago are pruned automatically

use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;
use rusqlite::{Connection, OptionalExtension, params};
use serde::{Deserialize, Serialize};

use crate::tracker::ActivitySample;

// ─── Row types ─────────────────────────────────────────────────────────────────
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct CachedSample {
    pub id: i64,
    pub session_id: String,
    pub timestamp: String,
    pub mouse_count: u32,
    pub keyboard_count: u32,
    pub app_name: String,
    pub window_title: String,
    pub domain: String,
    pub idle_flag: bool,
    pub synced: bool,
}

// ─── DB path ───────────────────────────────────────────────────────────────────
fn db_path() -> PathBuf {
    // Use the OS appdata directory via APPDATA env var (works on Windows)
    let base = std::env::var("APPDATA")
        .map(PathBuf::from)
        .unwrap_or_else(|_| std::env::temp_dir());
    base.join("digireps-tracker").join("tracker_cache.sqlite")
}

// ─── Initialize DB (creates table if not exists) ──────────────────────────────
pub fn init_db() -> rusqlite::Result<Connection> {
    let path = db_path();
    // Ensure parent directory exists
    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }

    let conn = Connection::open(&path)?;
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS activity_samples (
            id             INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id     TEXT    NOT NULL,
            timestamp      TEXT    NOT NULL,
            mouse_count    INTEGER NOT NULL DEFAULT 0,
            keyboard_count INTEGER NOT NULL DEFAULT 0,
            app_name       TEXT    NOT NULL DEFAULT '',
            window_title   TEXT    NOT NULL DEFAULT '',
            domain         TEXT    NOT NULL DEFAULT '',
            idle_flag      INTEGER NOT NULL DEFAULT 0,
            synced         INTEGER NOT NULL DEFAULT 0
        );
        CREATE INDEX IF NOT EXISTS idx_synced ON activity_samples(synced);",
    )?;
    Ok(conn)
}

// ─── Public API ────────────────────────────────────────────────────────────────
/// Insert a new sample (synced=0, will be picked up by sync loop)
pub fn cache_sample(conn: &Connection, sample: &ActivitySample) -> rusqlite::Result<()> {
    conn.execute(
        "INSERT INTO activity_samples
             (session_id, timestamp, mouse_count, keyboard_count, app_name, window_title, domain, idle_flag, synced)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 0)",
        params![
            sample.session_id,
            sample.timestamp,
            sample.mouse_count,
            sample.keyboard_count,
            sample.app_name,
            sample.window_title,
            sample.domain,
            sample.idle_flag as i32,
        ],
    )?;
    Ok(())
}

/// Fetch up to 50 unsynced samples
pub fn get_unsynced_samples(conn: &Connection) -> rusqlite::Result<Vec<CachedSample>> {
    let mut stmt = conn.prepare(
        "SELECT id, session_id, timestamp, mouse_count, keyboard_count,
                app_name, window_title, domain, idle_flag, synced
         FROM activity_samples
         WHERE synced = 0
         ORDER BY id ASC
         LIMIT 50",
    )?;

    let rows = stmt.query_map([], |row| {
        Ok(CachedSample {
            id: row.get(0)?,
            session_id: row.get(1)?,
            timestamp: row.get(2)?,
            mouse_count: row.get::<_, u32>(3)?,
            keyboard_count: row.get::<_, u32>(4)?,
            app_name: row.get(5)?,
            window_title: row.get(6)?,
            domain: row.get(7)?,
            idle_flag: row.get::<_, i32>(8)? != 0,
            synced: row.get::<_, i32>(9)? != 0,
        })
    })?;

    rows.collect()
}

/// Mark a list of sample IDs as synced
pub fn mark_synced(conn: &Connection, ids: &[i64]) -> rusqlite::Result<()> {
    if ids.is_empty() { return Ok(()); }
    for id in ids {
        conn.execute("UPDATE activity_samples SET synced = 1 WHERE id = ?1", params![id])?;
    }
    // Prune synced rows older than 7 days
    let cutoff = chrono::Utc::now()
        .checked_sub_signed(chrono::Duration::days(7))
        .map(|dt| dt.to_rfc3339())
        .unwrap_or_default();
    conn.execute(
        "DELETE FROM activity_samples WHERE synced = 1 AND timestamp < ?1",
        params![cutoff],
    )?;
    Ok(())
}

// ─── Sync loop — fires every 30s ───────────────────────────────────────────────
/// Spawns a background thread that reads unsynced samples from SQLite and
/// POSTs them to /api/heartbeats on the backend.
pub fn start_sync_loop(
    api_url: String,
    auth_token: Arc<Mutex<Option<String>>>,
    running: Arc<Mutex<bool>>,
) {
    thread::spawn(move || {
        let conn = match init_db() {
            Ok(c) => c,
            Err(e) => { eprintln!("[cache] Failed to open DB: {}", e); return; }
        };

        loop {
            thread::sleep(Duration::from_secs(30));
            if !*running.lock().unwrap() { break; }

            sync_once(&conn, &api_url, &auth_token);
        }
    });
}

/// One sync pass — call this after caching a sample for immediate upload attempt
pub fn sync_once(conn: &Connection, api_url: &str, auth_token: &Arc<Mutex<Option<String>>>) {
    let samples = match get_unsynced_samples(conn) {
        Ok(s) => s,
        Err(e) => { eprintln!("[cache] get_unsynced error: {}", e); return; }
    };
    if samples.is_empty() { return; }

    let token = auth_token.lock().unwrap().clone().unwrap_or_default();

    // Build payload (same shape as Electron's heartbeats payload)
    let payload: Vec<serde_json::Value> = samples.iter().map(|s| {
        serde_json::json!({
            "session_id": s.session_id,
            "timestamp": s.timestamp,
            "mouse_count": s.mouse_count,
            "keyboard_count": s.keyboard_count,
            "app_name": s.app_name,
            "window_title": s.window_title,
            "domain": s.domain,
            "idle_flag": s.idle_flag,
        })
    }).collect();

    let body = serde_json::json!(payload).to_string();
    let url = format!("{}/api/heartbeats", api_url);

    match http_post_with_auth(&url, &body, &token) {
        Ok(_) => {
            let ids: Vec<i64> = samples.iter().map(|s| s.id).collect();
            if let Err(e) = mark_synced(conn, &ids) {
                eprintln!("[cache] mark_synced error: {}", e);
            } else {
                println!("[cache] ✅ Synced {} samples", ids.len());
            }
        }
        Err(e) => {
            eprintln!("[cache] sync failed (will retry): {}", e);
        }
    }
}

/// HTTP POST with Authorization header support
fn http_post_with_auth(url: &str, body: &str, token: &str) -> Result<String, String> {
    use std::io::{Read, Write};
    use std::net::TcpStream;

    let url_str = url.replace("http://", "");
    let parts: Vec<&str> = url_str.splitn(2, '/').collect();
    let host_port = parts[0];
    let path = format!("/{}", parts.get(1).unwrap_or(&""));
    let host = host_port.split(':').next().unwrap_or("localhost");

    let auth_header = if !token.is_empty() {
        format!("Authorization: Bearer {}\r\n", token)
    } else {
        String::new()
    };

    let request = format!(
        "POST {} HTTP/1.1\r\nHost: {}\r\nContent-Type: application/json\r\n{}Content-Length: {}\r\nConnection: close\r\n\r\n{}",
        path, host, auth_header, body.len(), body
    );

    let stream = TcpStream::connect(host_port)
        .map_err(|e| format!("Cannot connect: {}", e))?;
    stream.set_write_timeout(Some(Duration::from_secs(5))).ok();
    stream.set_read_timeout(Some(Duration::from_secs(10))).ok();

    let mut stream = stream;
    stream.write_all(request.as_bytes()).map_err(|e| e.to_string())?;

    let mut response = String::new();
    stream.read_to_string(&mut response).map_err(|e| e.to_string())?;

    let body_start = response.find("\r\n\r\n").map(|i| i + 4).unwrap_or(0);
    let status_code: u16 = response.lines().next().unwrap_or("")
        .split_whitespace().nth(1)
        .and_then(|s| s.parse().ok())
        .unwrap_or(0);

    if status_code >= 200 && status_code < 300 {
        Ok(response[body_start..].to_string())
    } else {
        Err(format!("HTTP {}", status_code))
    }
}
