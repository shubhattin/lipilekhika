package com.shubhattin.lipilekhika.ui.theme

import android.content.res.AssetManager
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily

/**
 * The font of each script, bundled in the app (the files of `desktop-client/assets/fonts`, added to
 * the assets by the build), so the old scripts (Brahmi, Siddham, ...) show offline too. The same
 * choice as the web app (`styles/fonts.css`).
 */
object ScriptFonts {
    private val FILES =
        mapOf(
            "Devanagari" to "NotoSansDevanagari.ttf",
            "Purna-Devanagari" to "NotoSansDevanagari.ttf",
            "Telugu" to "NotoSansTelugu.ttf",
            "Tamil" to "NotoSansTamil.ttf",
            // the supplement has only the extra marks, the Tamil letters come from the system font
            "Tamil-Extended" to "NotoSansTamilSupplement.ttf",
            "Bengali" to "NotoSansBengali.ttf",
            "Assamese" to "NotoSansBengali.ttf",
            "Kannada" to "NotoSansKannada.ttf",
            "Gujarati" to "NotoSansGujarati.ttf",
            "Malayalam" to "NotoSansMalayalam.ttf",
            "Odia" to "NotoSansOriya.ttf",
            "Sinhala" to "NotoSansSinhala.ttf",
            "Gurumukhi" to "NotoSansGurmukhi.ttf",
            "Brahmi" to "NotoSansBrahmi.ttf",
            "Granth" to "NotoSansGrantha.ttf",
            "Modi" to "NotoSansModi.ttf",
            "Sharada" to "SatisarSharada.ttf",
            "Siddham" to "NotoSansSiddham.ttf",
        )

    /** Noto Sans has all the combining marks of the romanizations (r̥, m̐, ...) */
    private const val LATIN = "NotoSans.ttf"

    private val cache = HashMap<String, FontFamily>()

    fun family(assets: AssetManager, script: String): FontFamily {
        val file = FILES[script] ?: LATIN
        return synchronized(cache) {
            cache.getOrPut(file) { FontFamily(Font(file, assets)) }
        }
    }
}

/** The font family of a script (a script name, see `getNormalizedScriptName`) */
@Composable
fun scriptFont(script: String): FontFamily {
    val assets = LocalContext.current.assets
    return remember(script) { ScriptFonts.family(assets, script) }
}
