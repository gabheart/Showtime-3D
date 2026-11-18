//! Hardening contra path traversal.
//!
//! Toda gravação em disco passa por `resolve_safe_path`, que:
//!  1. aceita apenas caminhos RELATIVOS compostos por componentes normais
//!     (`Path::components()` — bloqueia `..`, raiz `/`, prefixo `C:` e UNC);
//!  2. restringe o nome de cada componente a `[A-Za-z0-9._-]` (sem `:` de
//!     ADS do NTFS, sem nomes vazios ou só com pontos);
//!  3. aceita só as extensões da lista branca (.glb, .fbx, .json, .log);
//!  4. junta ao diretório base e confere que o resultado continua dentro dele.

use std::path::{Component, Path, PathBuf};

pub const ALLOWED_EXTENSIONS: [&str; 4] = ["glb", "fbx", "json", "log"];

#[derive(Debug, PartialEq, Eq)]
pub enum PathError {
    Empty,
    NotRelative,
    Traversal,
    InvalidName(String),
    ExtensionNotAllowed(String),
    Escapes,
}

impl std::fmt::Display for PathError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            PathError::Empty => write!(f, "caminho vazio"),
            PathError::NotRelative => write!(f, "caminho absoluto não permitido"),
            PathError::Traversal => write!(f, "componente '..' não permitido"),
            PathError::InvalidName(n) => write!(f, "nome inválido: {n}"),
            PathError::ExtensionNotAllowed(e) => write!(f, "extensão não permitida: {e}"),
            PathError::Escapes => write!(f, "caminho sai do diretório base"),
        }
    }
}

fn valid_component(name: &str) -> bool {
    !name.is_empty()
        && name.len() <= 128
        && !name.chars().all(|c| c == '.')
        && name
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || matches!(c, '.' | '_' | '-'))
}

/// Resolve `relative` dentro de `base` com as regras acima.
pub fn resolve_safe_path(base: &Path, relative: &str) -> Result<PathBuf, PathError> {
    if relative.trim().is_empty() {
        return Err(PathError::Empty);
    }
    // Normaliza separador do Windows para que "..\\x" também seja analisado.
    let normalized = relative.replace('\\', "/");
    let rel = Path::new(&normalized);

    let mut clean = PathBuf::new();
    for component in rel.components() {
        match component {
            Component::Normal(part) => {
                let part = part.to_str().ok_or_else(|| PathError::InvalidName("não-UTF8".into()))?;
                if !valid_component(part) {
                    return Err(PathError::InvalidName(part.to_string()));
                }
                clean.push(part);
            }
            Component::CurDir => {}
            Component::ParentDir => return Err(PathError::Traversal),
            Component::RootDir | Component::Prefix(_) => return Err(PathError::NotRelative),
        }
    }
    if clean.as_os_str().is_empty() {
        return Err(PathError::Empty);
    }

    let ext = clean
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_ascii_lowercase())
        .unwrap_or_default();
    if !ALLOWED_EXTENSIONS.contains(&ext.as_str()) {
        return Err(PathError::ExtensionNotAllowed(ext));
    }

    let full = base.join(&clean);
    if !full.starts_with(base) {
        return Err(PathError::Escapes);
    }
    Ok(full)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn base() -> PathBuf {
        PathBuf::from("logs-base")
    }

    #[test]
    fn aceita_arquivo_simples() {
        assert_eq!(
            resolve_safe_path(&base(), "session-abc.json").unwrap(),
            base().join("session-abc.json")
        );
    }

    #[test]
    fn aceita_subpasta() {
        assert!(resolve_safe_path(&base(), "sessions/2026/s1.log").is_ok());
    }

    #[test]
    fn bloqueia_parent_dir() {
        assert_eq!(resolve_safe_path(&base(), "../segredo.json"), Err(PathError::Traversal));
        assert_eq!(resolve_safe_path(&base(), "a/../../b.json"), Err(PathError::Traversal));
        assert_eq!(resolve_safe_path(&base(), "..\\..\\win.json"), Err(PathError::Traversal));
    }

    #[test]
    fn bloqueia_absolutos() {
        assert_eq!(resolve_safe_path(&base(), "/etc/passwd.log"), Err(PathError::NotRelative));
        assert!(resolve_safe_path(&base(), "C:/Windows/x.json").is_err());
        assert!(resolve_safe_path(&base(), "\\\\servidor\\share\\x.json").is_err());
    }

    #[test]
    fn bloqueia_extensoes_fora_da_lista() {
        assert!(matches!(
            resolve_safe_path(&base(), "payload.exe"),
            Err(PathError::ExtensionNotAllowed(_))
        ));
        assert!(matches!(
            resolve_safe_path(&base(), "sem_extensao"),
            Err(PathError::ExtensionNotAllowed(_))
        ));
        assert!(resolve_safe_path(&base(), "modelo.GLB").is_ok());
    }

    #[test]
    fn bloqueia_nomes_perigosos() {
        assert!(resolve_safe_path(&base(), "relatorio.json:stream").is_err()); // ADS NTFS
        assert!(resolve_safe_path(&base(), "a b.json").is_err());
        assert!(resolve_safe_path(&base(), "").is_err());
        assert!(resolve_safe_path(&base(), "./.").is_err());
    }
}
