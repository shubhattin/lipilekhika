package com.shubhattin.lipilekhika.quick

import android.content.ClipboardManager
import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.shubhattin.lipilekhika.MainActivity
import com.shubhattin.lipilekhika.data.Prefs
import com.shubhattin.lipilekhika.ui.components.copyText
import com.shubhattin.lipilekhika.ui.theme.LipiTheme
import com.shubhattin.lipilekhika.ui.theme.isDark

/**
 * The quick convert sheet, over the app it was opened from:
 * - the "Lipi Lekhika" action of selected text (`PROCESS_TEXT`): Replace puts the converted text in
 *   place of the selection (when the field is editable), Copy copies it;
 * - the Quick Settings tile ([ClipboardTileService]): converts the clipboard, Copy puts the result
 *   back on it.
 */
class ConvertActivity : ComponentActivity() {
    /** The text to convert (null: the clipboard is not read yet) */
    private var text by mutableStateOf<String?>(null)
    private var fromClipboard = false
    private var editable = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        when (intent.action) {
            Intent.ACTION_PROCESS_TEXT -> {
                text = intent.getCharSequenceExtra(Intent.EXTRA_PROCESS_TEXT)?.toString().orEmpty()
                editable = !intent.getBooleanExtra(Intent.EXTRA_PROCESS_TEXT_READONLY, false)
            }
            ACTION_CONVERT_CLIPBOARD -> fromClipboard = true
            else -> text = ""
        }
        val prefs = Prefs(this)
        setContent {
            LipiTheme(isDark(prefs.theme)) {
                ConvertSheet(
                    text = text,
                    fromClipboard = fromClipboard,
                    canReplace = editable,
                    prefs = prefs,
                    onReplace = { result ->
                        setResult(RESULT_OK, Intent().putExtra(Intent.EXTRA_PROCESS_TEXT, result))
                        finish()
                    },
                    onCopy = { result ->
                        copyText(this, result)
                        finish()
                    },
                    onOpenInApp = { source ->
                        startActivity(
                            Intent(this, MainActivity::class.java)
                                .setAction(Intent.ACTION_SEND)
                                .setType("text/plain")
                                .putExtra(Intent.EXTRA_TEXT, source)
                                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        )
                        finish()
                    },
                    onDismiss = ::finish,
                )
            }
        }
    }

    /** Android 10+ lets an app read the clipboard only while it has the focus */
    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus && fromClipboard && text == null) {
            val clipboard = getSystemService(ClipboardManager::class.java)
            text =
                clipboard.primaryClip
                    ?.takeIf { it.itemCount > 0 }
                    ?.getItemAt(0)
                    ?.coerceToText(this)
                    ?.toString()
                    .orEmpty()
        }
    }

    companion object {
        const val ACTION_CONVERT_CLIPBOARD = "com.shubhattin.lipilekhika.CONVERT_CLIPBOARD"
    }
}
