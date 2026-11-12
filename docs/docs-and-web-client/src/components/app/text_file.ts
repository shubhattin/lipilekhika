/** Reading and saving the `/app` text boxes as plain `.txt` files, all in the browser. */

/** Larger files are refused: every change re-transliterates the whole text. */
export const MAX_TEXT_FILE_BYTES = 10 * 1024 * 1024;

export const TEXT_FILE_ACCEPT = '.txt,text/plain';

export class TextFileError extends Error {}

/** Reads a dropped or picked file as UTF-8 text (a leading BOM is dropped). */
export const readTextFile = async (file: File): Promise<string> => {
  if (file.size > MAX_TEXT_FILE_BYTES) {
    throw new TextFileError(
      `${file.name} is too large (${(file.size / 1024 / 1024).toFixed(1)} MB, at most 10 MB)`
    );
  }
  const text = await file.text();
  // a NUL never appears in text, but early in nearly every binary file (images, .docx, .pdf)
  if (text.slice(0, 8000).includes('\0')) {
    throw new TextFileError(`${file.name} doesn't look like a plain text file`);
  }
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
};

/** Saves `text` as a UTF-8 `.txt` download. */
export const downloadTextFile = (text: string, file_name: string) => {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = file_name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // the download has started by now; give slow browsers a moment before freeing it
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
};

/** `lipilekhika-source-devanagari.txt`, `lipilekhika-output-romanized.txt` */
export const textFileName = (box: 'source' | 'output', script: string) =>
  `lipilekhika-${box}-${script.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.txt`;

/** Whether a drag carries files (not text or a link dragged from the page). */
export const isFileDrag = (e: DragEvent) => !!e.dataTransfer?.types.includes('Files');
