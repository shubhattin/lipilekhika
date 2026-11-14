import type { AstroIntegration } from 'astro';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import {
  findLatestRelease,
  getWindowsDownloadUrl,
  getWindowsPortableDownloadUrl,
  getLinuxParivartakaDownloadUrl,
  getMacDownloadUrl,
  getAndroidApkDownloadUrl,
  getAndroidReleasePage,
  parseTagVersion
} from '../src/lib/github';

interface NetlifyRedirectsOptions {
  /** Additional static redirects to include */
  additionalRedirects?: string[];
}

/**
 * Astro integration to generate Netlify _redirects file at build time
 * with dynamic GitHub release URLs, and `pc-app/latest.json` (`{"version":"1.2.3"}`), where
 * the PC app looks for a newer version (it falls back to the GitHub releases without it).
 *
 * Set GITHUB_TOKEN environment variable to avoid rate limiting.
 */
export function netlifyRedirects(options: NetlifyRedirectsOptions = {}): AstroIntegration {
  return {
    name: 'netlify-redirects',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        logger.info('Generating Netlify _redirects file...');

        const redirects: string[] = [];

        // Use GITHUB_TOKEN env var if available to avoid rate limiting
        const token = process.env.GITHUB_TOKEN;
        if (!token) {
          logger.warn(
            'GITHUB_TOKEN not set. GitHub API calls may be rate limited. Set GITHUB_TOKEN for reliable builds.'
          );
        }

        // Fetch Windows PC app release
        const pcRelease = await findLatestRelease('pc-app@v', 'shubhattin', 'lipilekhika', token);
        if (pcRelease) {
          const windowsUrl = getWindowsDownloadUrl(pcRelease);
          if (windowsUrl) {
            redirects.push(`/redirect/pc-app-release-win-download ${windowsUrl} 302`);
            logger.info(`Windows download: ${pcRelease.tag_name}`);
          }
          const portableUrl = getWindowsPortableDownloadUrl(pcRelease);
          if (portableUrl) {
            redirects.push(`/redirect/pc-app-release-win-portable ${portableUrl} 302`);
          }
          // Lipi Parivartaka on its own, for Linux
          const linuxUrl = getLinuxParivartakaDownloadUrl(pcRelease);
          if (linuxUrl) {
            redirects.push(`/redirect/pc-app-release-linux-parivartaka ${linuxUrl} 302`);
          }
          // macOS: Lipi Lekhika's disk image (the old link of Lipi Parivartaka's zip leads there too)
          const macUrl = getMacDownloadUrl(pcRelease);
          if (macUrl) {
            redirects.push(`/redirect/pc-app-release-macos ${macUrl} 302`);
            redirects.push(`/redirect/pc-app-release-macos-parivartaka ${macUrl} 302`);
          }
          // the latest version, for the PC app's update check (it accepts only `x.y.z`). Only
          // once the release has its installer: a release is published before its files are
          // uploaded, the app would offer a version it can't download yet (without the file it
          // falls back to the GitHub releases, which skips such a release too)
          const version = parseTagVersion(pcRelease.tag_name, 'pc-app@v');
          const hasMsi = pcRelease.assets.some((a) => a.name === `lipilekhika-${version}.msi`);
          if (version && /^\d+\.\d+\.\d+$/.test(version) && hasMsi) {
            const pcAppDir = join(fileURLToPath(dir), 'pc-app');
            mkdirSync(pcAppDir, { recursive: true });
            writeFileSync(
              join(pcAppDir, 'latest.json'),
              JSON.stringify({ version }) + '\n',
              'utf-8'
            );
            logger.info(`pc-app/latest.json: ${version}`);
          } else {
            logger.warn(
              `Not writing pc-app/latest.json: ${pcRelease.tag_name} has no installer yet, or a bad version`
            );
          }
        } else {
          logger.warn('Could not find Windows PC app release');
        }

        // Fetch Android mobile app release
        const mobileRelease = await findLatestRelease(
          'mobile-app@v',
          'shubhattin',
          'lipilekhika',
          token
        );
        if (mobileRelease) {
          // the universal APK, downloaded directly
          const apkUrl = getAndroidApkDownloadUrl(mobileRelease);
          if (apkUrl) {
            redirects.push(`/redirect/mobile-app-release-apk ${apkUrl} 302`);
            logger.info(`Android APK: ${mobileRelease.tag_name}`);
          }
          // the release page with every APK (kept for the links to it)
          const androidUrl = getAndroidReleasePage(mobileRelease);
          if (androidUrl) {
            redirects.push(`/redirect/mobile-app-release-page ${androidUrl} 302`);
          }
        } else {
          logger.warn('Could not find Android mobile app release');
        }

        // Add any additional static redirects
        if (options.additionalRedirects) {
          redirects.push(...options.additionalRedirects);
        }

        if (redirects.length === 0) {
          logger.warn('No redirects to write');
          return;
        }

        // Write the _redirects file to the output directory
        const outputPath = join(fileURLToPath(dir), '_redirects');
        const content = redirects.join('\n') + '\n';
        writeFileSync(outputPath, content, 'utf-8');

        logger.info(`Written ${redirects.length} redirect(s) to _redirects`);
      }
    }
  };
}

export default netlifyRedirects;
