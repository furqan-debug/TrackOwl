// updater.rs — Phase 5: Auto-updater using tauri-plugin-updater
// Replaces: electron-updater (autoUpdater.checkForUpdatesAndNotify)
//
// Flow:
//   1. On app start (after 10s delay), check GitHub Releases for a newer version
//   2. If update available → show notification + dialog prompt
//   3. User clicks "Update" → download in background, show progress, restart

use tauri::{AppHandle, Emitter};
use tauri_plugin_updater::UpdaterExt;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct UpdateStatus {
    pub available: bool,
    pub version: Option<String>,
    pub notes: Option<String>,
}

/// Check for updates via the endpoint configured in tauri.conf.json.
/// Emits "update-available" event to the frontend if a newer version exists.
/// Call this once on startup (in a background thread after a short delay).
pub async fn check_for_updates(app: AppHandle) {
    // Wait 15s after launch so we don't slow down startup
    tokio::time::sleep(std::time::Duration::from_secs(15)).await;

    let updater = match app.updater() {
        Ok(u) => u,
        Err(e) => {
            eprintln!("[updater] Failed to get updater: {}", e);
            return;
        }
    };

    match updater.check().await {
        Ok(Some(update)) => {
            let status = UpdateStatus {
                available: true,
                version: Some(update.version.clone()),
                notes: update.body.clone(),
            };

            println!(
                "[updater] ✅ Update available: v{} → v{}",
                update.current_version,
                update.version
            );

            // Emit to React frontend — the UI will show an update banner
            let _ = app.emit("update-available", &status);

            // Show native notification
            #[cfg(not(debug_assertions))]
            {
                use tauri_plugin_notification::NotificationExt;
                let _ = app
                    .notification()
                    .builder()
                    .title("DigiReps Tracker — Update Available")
                    .body(format!(
                        "Version {} is ready. Open the app to install.",
                        update.version
                    ))
                    .show();
            }
        }
        Ok(None) => {
            println!("[updater] App is up to date.");
        }
        Err(e) => {
            eprintln!("[updater] Update check failed: {}", e);
        }
    }
}

/// Download and install the pending update.
/// Called when the user confirms the update dialog in the frontend.
/// Emits "update-progress" events (0–100) then restarts the app.
pub async fn install_update(app: AppHandle) -> Result<(), String> {
    let updater = app.updater().map_err(|e| e.to_string())?;

    let update = match updater.check().await.map_err(|e| e.to_string())? {
        Some(u) => u,
        None => return Err("No update available".to_string()),
    };

    println!("[updater] Downloading v{}...", update.version);

    update
        .download_and_install(
            |chunk_length, content_length| {
                if let Some(total) = content_length {
                    let pct = (chunk_length as f64 / total as f64 * 100.0) as u32;
                    let _ = app.emit("update-progress", pct);
                }
            },
            || {
                println!("[updater] Download complete — restarting...");
                let _ = app.emit("update-progress", 100u32);
            },
        )
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}
