import { promises as fs } from 'node:fs';
import { join } from 'node:path';

async function copyFonts() {
  try {
    // Source paths (relative to the lipiparivartaka directory)
    const fontsSourceDir = '../../docs/docs-and-web-client/src/styles/fonts';
    const fontsCssSource = '../../docs/docs-and-web-client/src/styles/fonts.css';

    // Destination paths
    const fontsDestDir = 'src/fonts';
    const fontsCssDest = 'src/fonts.css';

    // Create destination directory if it doesn't exist
    await fs.mkdir(fontsDestDir, { recursive: true });

    // Copy all .woff2 files from source fonts directory to destination
    const allFiles = await fs.readdir(fontsSourceDir);
    const fontFiles = allFiles.filter((file) => file.endsWith('.woff2'));
    for (const fontFile of fontFiles) {
      const sourcePath = join(fontsSourceDir, fontFile);
      const destPath = join(fontsDestDir, fontFile);
      await fs.copyFile(sourcePath, destPath);
      console.log(`Copied ${fontFile} to ${fontsDestDir}`);
    }

    // Copy fonts.css file
    await fs.copyFile(fontsCssSource, fontsCssDest);
    console.log(`Copied fonts.css to ${fontsCssDest}`);

    console.log('Font copying completed successfully!');
  } catch (error) {
    console.error('Error copying fonts:', error);
    process.exit(1);
  }
}

copyFonts();
