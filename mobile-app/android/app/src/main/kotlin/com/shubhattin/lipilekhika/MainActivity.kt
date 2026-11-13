package com.shubhattin.lipilekhika

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.SystemBarStyle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.runtime.DisposableEffect
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import com.shubhattin.lipilekhika.state.AppStore
import com.shubhattin.lipilekhika.ui.LipiApp
import com.shubhattin.lipilekhika.ui.theme.LipiTheme
import com.shubhattin.lipilekhika.ui.theme.isDark

class MainActivity : ComponentActivity() {
    /** The app's state, kept across rotations */
    private val store: AppStore by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)
        if (savedInstanceState == null) handleShare(intent)
        setContent {
            val dark = isDark(store.theme)
            // light or dark status / navigation bar icons, following the theme of the app
            DisposableEffect(dark) {
                val style =
                    if (dark) SystemBarStyle.dark(android.graphics.Color.TRANSPARENT)
                    else
                        SystemBarStyle.light(
                            android.graphics.Color.TRANSPARENT,
                            android.graphics.Color.TRANSPARENT,
                        )
                enableEdgeToEdge(statusBarStyle = style, navigationBarStyle = style)
                onDispose {}
            }
            LipiTheme(dark) { LipiApp(store) }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        handleShare(intent)
    }

    /** "Share → Lipi Lekhika" from another app: the text goes into the source box */
    private fun handleShare(intent: Intent?) {
        if (intent?.action != Intent.ACTION_SEND || intent.type != "text/plain") return
        val text = intent.getCharSequenceExtra(Intent.EXTRA_TEXT)?.toString() ?: return
        store.openSharedText(text)
    }

    override fun onStop() {
        super.onStop()
        store.flushSave()
    }
}
