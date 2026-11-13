package com.shubhattin.lipilekhika.data

import android.content.Context
import androidx.core.content.edit
import java.io.File

/**
 * The saved settings (like the `localStorage` keys of the web app), read synchronously at start so
 * the first frame already shows them (no layout shift).
 */
class Prefs(context: Context) {
    private val sp = context.getSharedPreferences("lipilekhika", Context.MODE_PRIVATE)

    init {
        migrateFromFlutter(context)
    }

    var fromScript: String?
        get() = sp.getString(FROM_SCRIPT, null)
        set(value) = sp.edit { putString(FROM_SCRIPT, value) }

    var toScript: String?
        get() = sp.getString(TO_SCRIPT, null)
        set(value) = sp.edit { putString(TO_SCRIPT, value) }

    var preset: String?
        get() = sp.getString(PRESET, null)
        set(value) = sp.edit { putString(PRESET, value) }

    var useNativeNumerals: Boolean?
        get() = if (sp.contains(NATIVE_NUMERALS)) sp.getBoolean(NATIVE_NUMERALS, true) else null
        set(value) = sp.edit {
            if (value == null) remove(NATIVE_NUMERALS) else putBoolean(NATIVE_NUMERALS, value)
        }

    var includeInherentVowel: Boolean?
        get() = if (sp.contains(INHERENT_VOWEL)) sp.getBoolean(INHERENT_VOWEL, false) else null
        set(value) = sp.edit {
            if (value == null) remove(INHERENT_VOWEL) else putBoolean(INHERENT_VOWEL, value)
        }

    /** "system", "light" or "dark" */
    var theme: String
        get() = sp.getString(THEME, "system") ?: "system"
        set(value) = sp.edit { putString(THEME, value) }

    /** "Remember text": the source text is kept for the next launch (on unless turned off) */
    var rememberText: Boolean
        get() = sp.getBoolean(REMEMBER_TEXT, true)
        set(value) = sp.edit { putBoolean(REMEMBER_TEXT, value) }

    /** The typing guide was opened once (no more pulsing dot) */
    var typingGuideSeen: Boolean
        get() = sp.getBoolean(TYPING_GUIDE_SEEN, false)
        set(value) = sp.edit { putBoolean(TYPING_GUIDE_SEEN, value) }

    /** The scripts last used in the quick convert sheet */
    var quickFrom: String?
        get() = sp.getString(QUICK_FROM, null)
        set(value) = sp.edit { putString(QUICK_FROM, value) }

    var quickTo: String?
        get() = sp.getString(QUICK_TO, null)
        set(value) = sp.edit { putString(QUICK_TO, value) }

    /**
     * The Flutter app (same app id, it updates to this one) kept its settings in
     * `FlutterSharedPreferences` with a `flutter.` prefix: take them over once.
     */
    private fun migrateFromFlutter(context: Context) {
        if (sp.getBoolean(MIGRATED, false)) return
        val name = "FlutterSharedPreferences"
        val file = File(context.applicationInfo.dataDir, "shared_prefs/$name.xml")
        if (file.exists()) {
            val old = context.getSharedPreferences(name, Context.MODE_PRIVATE)
            sp.edit {
                old.getString("flutter.fromScript", null)?.let { putString(FROM_SCRIPT, it) }
                old.getString("flutter.toScript", null)?.let { putString(TO_SCRIPT, it) }
                old.getString("flutter.currentPreset", null)?.let { putString(PRESET, it) }
                // ThemeMode.index: 0 system, 1 light, 2 dark (an int is kept as a Long)
                val theme = runCatching { old.all["flutter.theme_mode"] as? Number }.getOrNull()
                when (theme?.toInt()) {
                    1 -> putString(THEME, "light")
                    2 -> putString(THEME, "dark")
                }
            }
        }
        sp.edit { putBoolean(MIGRATED, true) }
    }

    private companion object {
        const val FROM_SCRIPT = "fromScript"
        const val TO_SCRIPT = "toScript"
        const val PRESET = "currentPreset"
        const val NATIVE_NUMERALS = "useNativeNumerals"
        const val INHERENT_VOWEL = "includeInherentVowel"
        const val THEME = "theme"
        const val TYPING_GUIDE_SEEN = "typingGuideSeen"
        const val REMEMBER_TEXT = "rememberText"
        const val QUICK_FROM = "quickFrom"
        const val QUICK_TO = "quickTo"
        const val MIGRATED = "migratedFromFlutter"
    }
}

/**
 * The source text kept between launches (the web app keeps it in `localStorage`), in a file of the
 * app. Text longer than [MAX_CHARS] is not kept.
 */
class SavedText(context: Context) {
    private val file = File(context.filesDir, "source_text.txt")

    enum class Result {
        SAVED,
        TOO_LARGE,
    }

    fun load(): String = runCatching { file.readText() }.getOrDefault("")

    fun save(text: String): Result {
        if (text.length > MAX_CHARS) {
            file.delete()
            return Result.TOO_LARGE
        }
        if (text.isEmpty()) {
            file.delete()
            return Result.SAVED
        }
        // write to a temporary file, then rename: a crash never leaves half a text
        val tmp = File(file.parentFile, "${file.name}.tmp")
        tmp.writeText(text)
        tmp.renameTo(file)
        return Result.SAVED
    }

    companion object {
        /** As on the web */
        const val MAX_CHARS = 500_000
    }
}
