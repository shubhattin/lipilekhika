//! The check for a newer version, and the update of the Windows installer.
//!
//! The latest version comes from the website (`lipilekhika.in/pc-app/latest.json`, written when
//! the site is built from the latest release). When the website can't be reached, or no longer
//! has the file, it comes from the GitHub releases, where every download is in the end. The
//! website gives the version only: the installer is always downloaded from the GitHub release.

use serde::Deserialize;
use std::env;
use std::io::Write as _;
use std::path::PathBuf;
use std::process::Command;
use std::time::Duration;

/// Current app version from Cargo.toml
pub const CURRENT_VERSION: &str = env!("CARGO_PKG_VERSION");

/// The latest version, written by the website build (`integrations/netlify-redirects.ts`)
const LATEST_JSON_URL: &str = "https://lipilekhika.in/pc-app/latest.json";
/// The repository's releases (every package of the repository has its releases here)
const GITHUB_RELEASES_URL: &str =
  "https://api.github.com/repos/shubhattin/lipilekhika/releases?per_page=100";
const TAG_PREFIX: &str = "pc-app@v";
/// How often the website is tried before the GitHub releases
const WEBSITE_TRIES: u32 = 2;
/// The wait before the website is tried again
const WEBSITE_RETRY_WAIT: Duration = Duration::from_secs(3);
/// The log of the checks, in the app's data directory
const LOG_FILE: &str = "update-check.log";
/// The log is started again when it is larger
const LOG_MAX_BYTES: u64 = 32 * 1024;

/// The version compared with the latest release. Debug builds take `LIPILEKHIKA_TEST_VERSION`
/// (`0.0.1`: an update is offered) to try the update popup.
fn current_version() -> String {
  #[cfg(debug_assertions)]
  if let Ok(v) = std::env::var("LIPILEKHIKA_TEST_VERSION") {
    return v;
  }
  CURRENT_VERSION.to_string()
}

/// Where the latest version came from
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Source {
  Website,
  GitHub,
}

/// Result of a version check
#[derive(Debug, Clone)]
pub struct VersionCheckResult {
  pub update_available: bool,
  pub latest_version: String,
  pub windows_msi_download_url: String,
  #[allow(dead_code)] // in the log
  pub source: Source,
}

/// A version `major.minor.patch`, only digits: a pre-release (`1.2.0-beta.1`) or anything else is
/// not a version to offer
fn parse_version(v: &str) -> Option<(u32, u32, u32)> {
  let mut parts = v.split('.').map(|p| {
    if !p.is_empty() && p.bytes().all(|b| b.is_ascii_digit()) {
      p.parse().ok()
    } else {
      None
    }
  });
  let version = (parts.next()??, parts.next()??, parts.next()??);
  parts.next().is_none().then_some(version)
}

/// Returns true if version_a > version_b
fn is_version_greater(version_a: &str, version_b: &str) -> bool {
  match (parse_version(version_a), parse_version(version_b)) {
    (Some(a), Some(b)) => a > b,
    _ => false,
  }
}

/// The installer of a version, on its GitHub release
fn msi_download_url(version: &str) -> String {
  format!(
    "https://github.com/shubhattin/lipilekhika/releases/download/pc-app%40v{version}/lipilekhika-{version}.msi"
  )
}

/// `latest.json` of the website
#[derive(Deserialize)]
struct LatestJson {
  version: String,
}

/// The fields of a GitHub release that are needed
#[derive(Deserialize)]
struct GitHubRelease {
  tag_name: String,
  #[serde(default)]
  draft: bool,
  #[serde(default)]
  prerelease: bool,
}

/// The latest version in the website's `latest.json`
fn version_of_latest_json(body: &str) -> Result<String, String> {
  let latest: LatestJson = serde_json::from_str(body).map_err(|e| format!("bad JSON: {e}"))?;
  match parse_version(&latest.version) {
    Some(_) => Ok(latest.version),
    None => Err(format!("bad version {:?}", latest.version)),
  }
}

/// The highest version of the published pc-app releases (the list is in the order of the tags'
/// commits, not of the versions)
fn version_of_releases(body: &str) -> Result<String, String> {
  let releases: Vec<GitHubRelease> =
    serde_json::from_str(body).map_err(|e| format!("bad JSON: {e}"))?;
  releases
    .iter()
    .filter(|r| !r.draft && !r.prerelease)
    .filter_map(|r| r.tag_name.strip_prefix(TAG_PREFIX))
    .filter_map(|v| parse_version(v).map(|parsed| (parsed, v)))
    .max_by_key(|(parsed, _)| *parsed)
    .map(|(_, v)| v.to_string())
    .ok_or_else(|| "no pc-app release".to_string())
}

async fn get_text(client: &reqwest::Client, url: &str) -> Result<String, String> {
  let response = client
    .get(url)
    .send()
    .await
    .map_err(|e| e.without_url().to_string())?;
  if !response.status().is_success() {
    return Err(format!("HTTP {}", response.status()));
  }
  response
    .text()
    .await
    .map_err(|e| e.without_url().to_string())
}

/// The latest version: from the website, tried [`WEBSITE_TRIES`] times, else from the GitHub
/// releases
async fn fetch_latest(client: &reqwest::Client) -> Result<(String, Source), String> {
  let mut errors = Vec::new();
  for attempt in 0..WEBSITE_TRIES {
    if attempt > 0 {
      tokio::time::sleep(WEBSITE_RETRY_WAIT).await;
    }
    match get_text(client, LATEST_JSON_URL)
      .await
      .and_then(|body| version_of_latest_json(&body))
    {
      Ok(version) => return Ok((version, Source::Website)),
      Err(e) => errors.push(format!("website: {e}")),
    }
  }
  let github = client
    .get(GITHUB_RELEASES_URL)
    .header("Accept", "application/vnd.github+json");
  let body = match github.send().await {
    Ok(r) if r.status().is_success() => r.text().await.map_err(|e| e.without_url().to_string()),
    Ok(r) => Err(format!("HTTP {}", r.status())),
    Err(e) => Err(e.without_url().to_string()),
  };
  match body.and_then(|body| version_of_releases(&body)) {
    Ok(version) => Ok((version, Source::GitHub)),
    Err(e) => {
      errors.push(format!("github: {e}"));
      Err(errors.join("; "))
    }
  }
}

/// Checks for a newer version. Blocking: it runs its own tokio runtime, call it on a background
/// thread (GPUI's background executor). The result goes in the log.
pub fn check_for_updates() -> Result<VersionCheckResult, String> {
  let result = tokio::runtime::Builder::new_current_thread()
    .enable_all()
    .build()
    .map_err(|e| format!("no tokio runtime: {e}"))
    .and_then(|rt| rt.block_on(check_for_updates_inner()));
  match &result {
    Ok(r) => log(&format!(
      "latest {} ({:?}), this is {}",
      r.latest_version,
      r.source,
      current_version()
    )),
    Err(e) => log(&format!("check failed: {e}")),
  }
  result
}

async fn check_for_updates_inner() -> Result<VersionCheckResult, String> {
  let client = reqwest::Client::builder()
    .user_agent(concat!("lipilekhika-pc-app/", env!("CARGO_PKG_VERSION")))
    .connect_timeout(Duration::from_secs(10))
    .timeout(Duration::from_secs(20))
    .build()
    .map_err(|e| e.to_string())?;
  let (latest_version, source) = fetch_latest(&client).await?;
  Ok(VersionCheckResult {
    update_available: is_version_greater(&latest_version, &current_version()),
    windows_msi_download_url: msi_download_url(&latest_version),
    latest_version,
    source,
  })
}

/// Adds a line to the log of the checks (it is started again when it grows too large)
fn log(line: &str) {
  eprintln!("Version check: {line}");
  let path = crate::persistent_state::app_data_path(LOG_FILE);
  let too_large = std::fs::metadata(&path).is_ok_and(|m| m.len() > LOG_MAX_BYTES);
  let file = std::fs::OpenOptions::new()
    .create(true)
    .append(!too_large)
    .write(true)
    .truncate(too_large)
    .open(&path);
  if let Ok(mut file) = file {
    let _ = writeln!(file, "{} {line}", utc_now());
  }
}

/// The time now in UTC, `2026-11-15 10:42:07Z`
fn utc_now() -> String {
  let secs = std::time::SystemTime::now()
    .duration_since(std::time::UNIX_EPOCH)
    .map_or(0, |d| d.as_secs());
  let (days, rest) = (secs / 86_400, secs % 86_400);
  // the date of a day count since 1970 (Howard Hinnant's civil_from_days)
  let z = days as i64 + 719_468;
  let era = z.div_euclid(146_097);
  let doe = z - era * 146_097;
  let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
  let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
  let mp = (5 * doy + 2) / 153;
  let day = doy - (153 * mp + 2) / 5 + 1;
  let month = if mp < 10 { mp + 3 } else { mp - 9 };
  let year = yoe + era * 400 + i64::from(month <= 2);
  format!(
    "{year}-{month:02}-{day:02} {:02}:{:02}:{:02}Z",
    rest / 3600,
    rest % 3600 / 60,
    rest % 60
  )
}

/// Result of the update process
#[derive(Debug, Clone)]
#[allow(dead_code)] // the messages are printed with Debug
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

/// Download and install the update: downloads the MSI to the temp dir and launches the
/// installer. Blocking, like [`check_for_updates`].
pub fn download_and_install_update(download_url: String, version: String) -> UpdateResult {
  match tokio::runtime::Runtime::new() {
    Ok(rt) => rt.block_on(download_and_install_inner(download_url, version)),
    Err(e) => UpdateResult::LaunchFailed(format!("Failed to create runtime: {}", e)),
  }
}

async fn download_and_install_inner(download_url: String, version: String) -> UpdateResult {
  // Get MSI path in temp directory
  let temp_dir = env::temp_dir();
  let msi_filename = format!("lipilekhika-{}.msi", version);
  let msi_path = temp_dir.join(&msi_filename);

  // Check if file already exists
  if msi_path.exists() {
    println!(
      "MSI file already exists at {:?}, trying to install...",
      msi_path
    );

    // Try to install existing file
    if launch_installer_wizard(&msi_path) {
      return UpdateResult::InstallerLaunched;
    }

    // Install failed, try redownloading once
    println!("Install from existing file failed, redownloading...");
    match download_file(&download_url, &msi_path).await {
      Ok(_) => {
        println!("Redownload successful, trying install again...");
        if launch_installer_wizard(&msi_path) {
          return UpdateResult::InstallerLaunched;
        } else {
          eprintln!("Install failed after redownload");
          return UpdateResult::LaunchFailed(
            "Failed to launch installer after redownload".to_string(),
          );
        }
      }
      Err(e) => {
        eprintln!("Redownload failed: {}", e);
        return UpdateResult::DownloadFailed(format!("Redownload failed: {}", e));
      }
    }
  }

  // File doesn't exist, download it
  println!("Downloading MSI to {:?}...", msi_path);
  match download_file(&download_url, &msi_path).await {
    Ok(_) => {
      println!("Download successful, launching installer...");
    }
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
  fn test_parse_version() {
    assert_eq!(parse_version("1.2.3"), Some((1, 2, 3)));
    assert_eq!(parse_version("0.0.10"), Some((0, 0, 10)));
    assert_eq!(parse_version("1.2"), None);
    assert_eq!(parse_version("1.2.3.4"), None);
    assert_eq!(parse_version("1.2.0-beta.1"), None);
    assert_eq!(parse_version("v1.2.3"), None);
    assert_eq!(parse_version("1..3"), None);
    assert_eq!(parse_version("1.2.+3"), None);
    assert_eq!(parse_version(""), None);
  }

  #[test]
  fn test_version_comparison() {
    assert!(is_version_greater("0.0.6", "0.0.5"));
    assert!(is_version_greater("0.1.0", "0.0.9"));
    assert!(is_version_greater("1.0.0", "0.9.9"));
    assert!(is_version_greater("1.0.10", "1.0.9"));
    assert!(!is_version_greater("0.0.5", "0.0.5"));
    assert!(!is_version_greater("0.0.4", "0.0.5"));
    assert!(!is_version_greater("2.0.0-beta", "1.0.0"));
  }

  #[test]
  fn test_latest_json() {
    assert_eq!(
      version_of_latest_json(r#"{"version":"1.1.3"}"#),
      Ok("1.1.3".to_string())
    );
    // more fields may come later
    assert_eq!(
      version_of_latest_json(r#"{"version":"1.1.3","tag":"pc-app@v1.1.3"}"#),
      Ok("1.1.3".to_string())
    );
    assert!(version_of_latest_json(r#"{"version":"1.1.3/../x"}"#).is_err());
    assert!(version_of_latest_json("<html>Page not found</html>").is_err());
    assert!(version_of_latest_json("{}").is_err());
  }

  #[test]
  fn test_releases() {
    // in the order of the tags' commits: the highest version is not always first
    let body = r#"[
      {"tag_name":"rust-lib@v1.2.0","draft":false,"prerelease":false},
      {"tag_name":"pc-app@v1.1.0","draft":false,"prerelease":false},
      {"tag_name":"pc-app@v1.1.2","draft":false,"prerelease":false,"author":null},
      {"tag_name":"pc-app@v1.2.0-beta.1","draft":false,"prerelease":false},
      {"tag_name":"pc-app@v1.3.0","draft":false,"prerelease":true},
      {"tag_name":"pc-app@v1.4.0","draft":true,"prerelease":false},
      {"tag_name":"pc-app@v1.0.11","draft":false,"prerelease":false}
    ]"#;
    assert_eq!(version_of_releases(body), Ok("1.1.2".to_string()));
    assert!(version_of_releases("[]").is_err());
    assert!(version_of_releases(r#"{"message":"API rate limit exceeded"}"#).is_err());
  }

  #[test]
  fn test_msi_url() {
    assert_eq!(
      msi_download_url("1.1.2"),
      "https://github.com/shubhattin/lipilekhika/releases/download/pc-app%40v1.1.2/lipilekhika-1.1.2.msi"
    );
  }

  #[test]
  fn test_utc_now() {
    let now = utc_now();
    assert_eq!(now.len(), "2026-11-15 10:42:07Z".len());
    assert!(now.starts_with("20"));
  }
}
