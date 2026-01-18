use octocrab::Octocrab;
use std::env;
use std::process::Command;

/// Current app version from Cargo.toml
pub const CURRENT_VERSION: &str = env!("CARGO_PKG_VERSION");
// pub const CURRENT_VERSION: &str = "0.0.1";

/// Result of a version check
#[derive(Debug, Clone)]
pub struct VersionCheckResult {
  pub update_available: bool,
  pub latest_version: Option<String>,
  pub windows_msi_download_url: Option<String>,
}

impl Default for VersionCheckResult {
  fn default() -> Self {
    Self {
      update_available: false,
      latest_version: None,
      windows_msi_download_url: None,
    }
  }
}

fn parse_pc_app_tag(tag: &str) -> Option<&str> {
  if tag.starts_with("pc-app@v") {
    Some(&tag[8..]) // Skip "pc-app@"
  } else {
    None
  }
}

/// Compare two semantic versions
/// Returns true if version_a > version_b
fn is_version_greater(version_a: &str, version_b: &str) -> bool {
  let parse_version = |v: &str| -> Option<(u32, u32, u32)> {
    let parts: Vec<&str> = v.split('.').collect();
    if parts.len() >= 3 {
      Some((
        parts[0].parse().ok()?,
        parts[1].parse().ok()?,
        parts[2].parse().ok()?,
      ))
    } else if parts.len() == 2 {
      Some((parts[0].parse().ok()?, parts[1].parse().ok()?, 0))
    } else {
      None
    }
  };

  match (parse_version(version_a), parse_version(version_b)) {
    (Some((a_major, a_minor, a_patch)), Some((b_major, b_minor, b_patch))) => {
      if a_major != b_major {
        a_major > b_major
      } else if a_minor != b_minor {
        a_minor > b_minor
      } else {
        a_patch > b_patch
      }
    }
    _ => false,
  }
}

/// Check for updates by fetching releases from GitHub
/// This function is designed to work with iced's Task::future by spawning
/// the tokio-dependent octocrab call in a dedicated tokio runtime on a blocking thread
pub async fn check_for_updates() -> VersionCheckResult {
  // Use smol::unblock to run the tokio-based octocrab code on a blocking thread pool
  // This avoids conflicts between iced's smol runtime and octocrab's tokio dependency
  smol::unblock(|| {
    // Create a new tokio runtime for this blocking call
    match tokio::runtime::Runtime::new() {
      Ok(rt) => rt.block_on(check_for_updates_inner()),
      Err(e) => {
        eprintln!("Failed to create tokio runtime: {}", e);
        VersionCheckResult::default()
      }
    }
  })
  .await
}

async fn check_for_updates_inner() -> VersionCheckResult {
  let result = check_for_updates_fetch().await;
  match result {
    Ok(r) => r,
    Err(e) => {
      eprintln!("Version check failed: {}", e);
      VersionCheckResult::default()
    }
  }
}

async fn check_for_updates_fetch()
-> Result<VersionCheckResult, Box<dyn std::error::Error + Send + Sync>> {
  let octocrab = Octocrab::builder().build()?;

  // Fetch releases from the repository (already in descending order)
  let releases = octocrab
    .repos("shubhattin", "lipilekhika")
    .releases()
    .list()
    .per_page(50)
    .send()
    .await?;

  // Find the first stable pc-app release
  // Releases are already ordered in descending order, so first match is latest
  for release in releases.items {
    // Skip drafts and pre-releases
    if release.draft || release.prerelease {
      continue;
    }

    let tag = &release.tag_name;
    // Skip alpha/beta versions
    if let Some(version) = parse_pc_app_tag(tag) {
      let version_lower = version.to_lowercase();
      if version_lower.contains("alpha") || version_lower.contains("beta") {
        continue;
      }

      // Found the latest stable release
      let update_available = is_version_greater(version, CURRENT_VERSION);

      return Ok(VersionCheckResult {
        update_available,
        latest_version: Some(version.to_string()),
        windows_msi_download_url: Some(
          format!(
            "https://github.com/shubhattin/lipilekhika/releases/download/pc-app%40v{}/lipilekhika-{}.msi",
            version, version
          )
          .to_string(),
        ),
      });
    }
  }

  // No matching release found
  Ok(VersionCheckResult::default())
}
use std::path::PathBuf;

/// Result of the update process
#[derive(Debug, Clone)]
pub enum UpdateResult {
  /// Installer launched successfully, app should exit
  InstallerLaunched,
  /// Download failed
  DownloadFailed(String),
  /// Installer launch failed
  LaunchFailed(String),
  /// No update URL available
  #[allow(dead_code)]
  NoUpdateUrl,
}

/// Download and install the update
/// This is an async function that downloads the MSI to temp dir and launches the installer
pub async fn download_and_install_update(download_url: String, version: String) -> UpdateResult {
  smol::unblock(move || match tokio::runtime::Runtime::new() {
    Ok(rt) => rt.block_on(download_and_install_inner(download_url, version)),
    Err(e) => UpdateResult::LaunchFailed(format!("Failed to create runtime: {}", e)),
  })
  .await
}

async fn download_and_install_inner(download_url: String, version: String) -> UpdateResult {
  // Download MSI to temp directory
  let temp_dir = env::temp_dir();
  let msi_filename = format!("lipilekhika-{}.msi", version);
  let msi_path = temp_dir.join(&msi_filename);

  // Download the file
  match download_file(&download_url, &msi_path).await {
    Ok(_) => {}
    Err(e) => return UpdateResult::DownloadFailed(format!("Download failed: {}", e)),
  }

  // Launch the installer wizard
  if launch_installer_wizard(&msi_path) {
    UpdateResult::InstallerLaunched
  } else {
    UpdateResult::LaunchFailed("Failed to launch installer wizard".to_string())
  }
}

async fn download_file(
  url: &str,
  dest_path: &PathBuf,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
  let response = reqwest::get(url).await?;

  if !response.status().is_success() {
    return Err(format!("HTTP error: {}", response.status()).into());
  }

  let bytes = response.bytes().await?;
  std::fs::write(dest_path, bytes)?;

  Ok(())
}

/// Launch the MSI installer wizard (not silent)
/// Returns true if the installer was launched successfully
pub fn launch_installer_wizard(msi_path: &PathBuf) -> bool {
  match Command::new("msiexec.exe").arg("/i").arg(msi_path).spawn() {
    Ok(_) => {
      println!("Installer wizard launched successfully");
      true
    }
    Err(e) => {
      eprintln!("Failed to launch installer: {}", e);
      false
    }
  }
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn test_parse_pc_app_tag() {
    assert_eq!(parse_pc_app_tag("pc-app@v0.0.5"), Some("0.0.5"));
    assert_eq!(parse_pc_app_tag("pc-app@v1.2.3"), Some("1.2.3"));
    assert_eq!(parse_pc_app_tag("v1.0.0"), None);
    assert_eq!(parse_pc_app_tag("other-tag@v1.0.0"), None);
  }

  #[test]
  fn test_version_comparison() {
    assert!(is_version_greater("0.0.6", "0.0.5"));
    assert!(is_version_greater("0.1.0", "0.0.9"));
    assert!(is_version_greater("1.0.0", "0.9.9"));
    assert!(!is_version_greater("0.0.5", "0.0.5"));
    assert!(!is_version_greater("0.0.4", "0.0.5"));
  }
}
