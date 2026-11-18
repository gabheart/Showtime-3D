//! PoC Opção B — comando `save_session_telemetry(report: SessionReport)`.
//!
//! O payload chega do WebView como JSON, é desserializado e validado com
//! serde (`deny_unknown_fields` + checagem de faixas) e gravado em
//! `app_log_dir()/sessions/<session_id>.json`. O nome do arquivo NUNCA vem
//! direto do front-end: é derivado do `session_id` validado e ainda passa por
//! `security::resolve_safe_path`.

use serde::{Deserialize, Serialize};
use std::path::Path;

use crate::security::resolve_safe_path;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct SessionReport {
    pub session_id: String,
    pub app_version: String,
    pub duration_s: f64,
    pub fps_avg: f64,
    pub fps_low_1pct: f64,
    pub frame_time_ms_max: f64,
    pub draw_calls_peak: u32,
    pub geometries: u32,
    pub textures: u32,
    pub js_heap_mb: Option<f64>,
    pub audio_state: String,
    pub events: Vec<String>,
}

fn in_range(name: &str, v: f64, min: f64, max: f64) -> Result<(), String> {
    if v.is_finite() && v >= min && v <= max {
        Ok(())
    } else {
        Err(format!("{name} fora da faixa [{min}, {max}]: {v}"))
    }
}

impl SessionReport {
    pub fn validate(&self) -> Result<(), String> {
        let id_ok = !self.session_id.is_empty()
            && self.session_id.len() <= 64
            && self
                .session_id
                .chars()
                .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_');
        if !id_ok {
            return Err("session_id inválido (use [A-Za-z0-9_-], até 64 chars)".into());
        }
        if self.app_version.len() > 32 {
            return Err("app_version muito longo".into());
        }
        in_range("duration_s", self.duration_s, 0.0, 86_400.0)?;
        in_range("fps_avg", self.fps_avg, 0.0, 1_000.0)?;
        in_range("fps_low_1pct", self.fps_low_1pct, 0.0, 1_000.0)?;
        in_range("frame_time_ms_max", self.frame_time_ms_max, 0.0, 60_000.0)?;
        if let Some(heap) = self.js_heap_mb {
            in_range("js_heap_mb", heap, 0.0, 65_536.0)?;
        }
        if !["running", "suspended", "closed", "interrupted", "none"].contains(&self.audio_state.as_str()) {
            return Err(format!("audio_state desconhecido: {}", self.audio_state));
        }
        if self.events.len() > 200 || self.events.iter().any(|e| e.len() > 200) {
            return Err("events excede o limite (200 itens × 200 chars)".into());
        }
        Ok(())
    }
}

/// Lógica de gravação separada do comando Tauri para ser testável sem WebView.
pub fn write_report(log_dir: &Path, report: &SessionReport) -> Result<std::path::PathBuf, String> {
    report.validate()?;
    let relative = format!("sessions/{}.json", report.session_id);
    let target = resolve_safe_path(log_dir, &relative).map_err(|e| e.to_string())?;
    if let Some(parent) = target.parent() {
        std::fs::create_dir_all(parent).map_err(|e| format!("não foi possível criar diretório: {e}"))?;
    }
    let json = serde_json::to_string_pretty(report).map_err(|e| e.to_string())?;
    std::fs::write(&target, json).map_err(|e| format!("falha ao gravar: {e}"))?;
    Ok(target)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample() -> SessionReport {
        SessionReport {
            session_id: "s-test_01".into(),
            app_version: "0.1.0".into(),
            duration_s: 120.0,
            fps_avg: 59.8,
            fps_low_1pct: 41.2,
            frame_time_ms_max: 33.0,
            draw_calls_peak: 210,
            geometries: 140,
            textures: 35,
            js_heap_mb: Some(180.0),
            audio_state: "running".into(),
            events: vec!["0s início".into()],
        }
    }

    #[test]
    fn grava_relatorio_valido() {
        let dir = std::env::temp_dir().join(format!("showtime-test-{}", std::process::id()));
        let path = write_report(&dir, &sample()).unwrap();
        assert!(path.starts_with(&dir));
        let back: SessionReport = serde_json::from_str(&std::fs::read_to_string(&path).unwrap()).unwrap();
        assert_eq!(back.session_id, "s-test_01");
        std::fs::remove_dir_all(dir).ok();
    }

    #[test]
    fn rejeita_session_id_com_traversal() {
        let mut r = sample();
        r.session_id = "../../evil".into();
        assert!(r.validate().is_err());
    }

    #[test]
    fn rejeita_valores_fora_da_faixa() {
        let mut r = sample();
        r.fps_avg = f64::NAN;
        assert!(r.validate().is_err());
        let mut r = sample();
        r.duration_s = -1.0;
        assert!(r.validate().is_err());
    }

    #[test]
    fn rejeita_campos_desconhecidos() {
        let json = r#"{"session_id":"a","app_version":"1","duration_s":1,"fps_avg":1,
            "fps_low_1pct":1,"frame_time_ms_max":1,"draw_calls_peak":1,"geometries":1,
            "textures":1,"js_heap_mb":null,"audio_state":"none","events":[],"path":"../x"}"#;
        assert!(serde_json::from_str::<SessionReport>(json).is_err());
    }
}
