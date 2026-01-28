export interface GitHubRelease {
  id: number;
  tag_name: string;
  name: string;
  draft: boolean;
  prerelease: boolean;
  published_at: string;
  assets: GitHubAsset[];
}

export interface GitHubAsset {
  id: number;
  name: string;
  browser_download_url: string;
  size: number;
}

/**
 * Fetch releases from GitHub repository
 */
export async function fetchReleases(
  owner: string,
  repo: string,
  token?: string
): Promise<GitHubRelease[]> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'lipilekhika-website'
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/releases?per_page=50`,
    { headers }
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch releases: ${response.status}`);
  }
  return response.json();
}

/**
 * Parse version from tag name with given prefix
 * Returns the version string after the prefix, or null if not matching
 */
export function parseTagVersion(tag: string, prefix: string): string | null {
  if (tag.startsWith(prefix)) {
    return tag.slice(prefix.length);
  }
  return null;
}

/**
 * Compare two semantic versions
 * Returns true if version_a > version_b
 */
function isVersionGreater(versionA: string, versionB: string): boolean {
  const parseVersion = (v: string): [number, number, number] | null => {
    const parts = v.split('.').map((p) => parseInt(p, 10));
    if (parts.length >= 3 && parts.every((p) => !isNaN(p))) {
      return [parts[0], parts[1], parts[2]];
    } else if (parts.length === 2 && parts.every((p) => !isNaN(p))) {
      return [parts[0], parts[1], 0];
    }
    return null;
  };

  const a = parseVersion(versionA);
  const b = parseVersion(versionB);

  if (!a || !b) return false;

  if (a[0] !== b[0]) return a[0] > b[0];
  if (a[1] !== b[1]) return a[1] > b[1];
  return a[2] > b[2];
}

/**
 * Find the latest stable release matching the given tag prefix
 * @param tagPrefix - The prefix to match (e.g., "pc-app@v", "android-app@v")
 * @param owner - GitHub repository owner (default: "shubhattin")
 * @param repo - GitHub repository name (default: "lipilekhika")
 * @param token - Optional GitHub token to avoid rate limiting
 * @returns The latest release object or null if not found
 */
export async function findLatestRelease(
  tagPrefix: string,
  owner: string = 'shubhattin',
  repo: string = 'lipilekhika',
  token?: string
): Promise<GitHubRelease | null> {
  try {
    const releases = await fetchReleases(owner, repo, token);

    // Filter and sort releases by version (descending)
    const matchingReleases = releases
      .filter((release) => {
        // Skip drafts and pre-releases
        if (release.draft || release.prerelease) return false;

        const version = parseTagVersion(release.tag_name, tagPrefix);
        if (!version) return false;

        // Skip alpha/beta versions
        const versionLower = version.toLowerCase();
        if (versionLower.includes('alpha') || versionLower.includes('beta')) return false;

        return true;
      })
      .sort((a, b) => {
        const versionA = parseTagVersion(a.tag_name, tagPrefix)!;
        const versionB = parseTagVersion(b.tag_name, tagPrefix)!;
        return isVersionGreater(versionA, versionB) ? -1 : 1;
      });

    return matchingReleases[0] || null;
  } catch (error) {
    console.error('Failed to fetch releases:', error);
    return null;
  }
}

/**
 * Get download URL for Windows MSI installer
 * @param release - The GitHub release object
 * @returns Download URL or null if not found
 */
export function getWindowsDownloadUrl(release: GitHubRelease): string | null {
  const version = parseTagVersion(release.tag_name, 'pc-app@v');
  if (!version) return null;

  return `https://github.com/shubhattin/lipilekhika/releases/download/pc-app%40v${version}/lipilekhika-${version}.msi`;
}

/**
 * Get download URL for Android APK
 * @param release - The GitHub release object
 * @returns Download URL or null if not found
 */
export function getAndroidReleasePage(release: GitHubRelease): string | null {
  const version = parseTagVersion(release.tag_name, 'mobile-app@v');
  if (!version) return null;

  return `https://github.com/shubhattin/lipilekhika/releases/mobile-app%40v${version}`;
}
