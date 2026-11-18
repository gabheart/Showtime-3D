// Sem janela de console no executável de release do Windows.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod security;
mod telemetry;

use tauri::Manager;
use telemetry::SessionReport;

/// Único comando exposto ao front-end. Não recebe caminho: só o relatório
/// tipado. Retorna o caminho final gravado (para evidência).
#[tauri::command]
fn save_session_telemetry(app: tauri::AppHandle, report: SessionReport) -> Result<String, String> {
    let log_dir = app
        .path()
        .app_log_dir()
        .map_err(|e| format!("app_log_dir indisponível: {e}"))?;
    let path = telemetry::write_report(&log_dir, &report)?;
    Ok(path.display().to_string())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![save_session_telemetry])
        .run(tauri::generate_context!())
        .expect("erro ao iniciar o Showtime 3D");
}
