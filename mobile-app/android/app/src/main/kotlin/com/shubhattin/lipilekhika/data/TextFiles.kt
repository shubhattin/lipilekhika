package com.shubhattin.lipilekhika.data

import android.content.ContentResolver
import android.net.Uri
import android.provider.OpenableColumns
import java.util.Locale

/**
 * Opening and saving `.txt` files, with the rules of the web app (`components/app/text_file.ts`)
 */
object TextFiles {
    /** The largest file opened */
    const val MAX_BYTES = 10 * 1024 * 1024

    sealed interface ReadResult {
        data class Ok(val text: String, val name: String) : ReadResult

        data class Error(val message: String) : ReadResult
    }

    /** The file name of a document */
    fun displayName(resolver: ContentResolver, uri: Uri): String =
        runCatching {
            resolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use {
                if (it.moveToFirst()) it.getString(0) else null
            }
        }
            .getOrNull() ?: uri.lastPathSegment ?: "the file"

    /**
     * Reads a text file as UTF-8: at most [MAX_BYTES], not a binary file (a NUL in the first 8000
     * characters), without a leading BOM.
     */
    fun read(resolver: ContentResolver, uri: Uri): ReadResult {
        val name = displayName(resolver, uri)
        return try {
            val bytes =
                resolver.openInputStream(uri)?.use { input ->
                    val buffer = input.readNBytesCompat(MAX_BYTES + 1)
                    buffer
                } ?: return ReadResult.Error("Couldn't read $name")
            if (bytes.size > MAX_BYTES) {
                val size = sizeOf(resolver, uri) ?: bytes.size.toLong()
                return ReadResult.Error(
                    "$name is too large (${String.format(Locale.ROOT, "%.1f", size / 1048576.0)} MB, at most 10 MB)"
                )
            }
            var text = bytes.toString(Charsets.UTF_8)
            if (text.take(8000).contains('\u0000')) {
                return ReadResult.Error("$name doesn't look like a plain text file")
            }
            if (text.startsWith('\uFEFF')) text = text.substring(1)
            ReadResult.Ok(text, name)
        } catch (_: Exception) {
            ReadResult.Error("Couldn't read $name")
        }
    }

    /** Writes [text] as UTF-8 (no BOM). False when it could not be written. */
    fun write(resolver: ContentResolver, uri: Uri, text: String): Boolean =
        try {
            resolver.openOutputStream(uri, "wt")?.use {
                it.write(text.toByteArray(Charsets.UTF_8))
            } != null
        } catch (_: Exception) {
            false
        }

    /**
     * The file name a text is saved as: `lipilekhika-<box>-<script>.txt` (eg.
     * `lipilekhika-source-devanagari.txt`, `lipilekhika-output-harvard-kyoto.txt`).
     */
    fun fileName(box: String, script: String): String {
        val slug = script.lowercase().replace(Regex("[^a-z0-9]+"), "-").trim('-')
        return "lipilekhika-$box-$slug.txt"
    }

    private fun sizeOf(resolver: ContentResolver, uri: Uri): Long? = runCatching {
        resolver.query(uri, arrayOf(OpenableColumns.SIZE), null, null, null)?.use {
            if (it.moveToFirst() && !it.isNull(0)) it.getLong(0) else null
        }
    }
        .getOrNull()

    /** `readNBytes` is only there from Android 13 (Java 11 API) */
    private fun java.io.InputStream.readNBytesCompat(max: Int): ByteArray {
        val out = java.io.ByteArrayOutputStream()
        val buf = ByteArray(64 * 1024)
        while (out.size() < max) {
            val n = read(buf, 0, minOf(buf.size, max - out.size()))
            if (n < 0) break
            out.write(buf, 0, n)
        }
        return out.toByteArray()
    }
}
