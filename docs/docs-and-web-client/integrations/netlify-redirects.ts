import type { AstroIntegration } from 'astro';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { findLatestRelease, getWindowsDownloadUrl, getAndroidReleasePage } from '../src/lib/github';

interface NetlifyRedirectsOptions {
  /** Additional static redirects to include */
  additionalRedirects?: string[];
}

/**
 * Astro integration to generate Netlify _redirects file at build time
 * with dynamic GitHub release URLs.
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
          const androidUrl = getAndroidReleasePage(mobileRelease);
          if (androidUrl) {
            redirects.push(`/redirect/mobile-app-release-page ${androidUrl} 302`);
            logger.info(`Android release page: ${mobileRelease.tag_name}`);
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
