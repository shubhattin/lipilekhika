package com.shubhattin.lipilekhika

import android.app.Application
import com.posthog.android.PostHogAndroid
import com.posthog.android.PostHogAndroidConfig

class LipiApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        setupAnalytics()
    }

    /**
     * PostHog with the app lifecycle events only (installed, updated, opened, backgrounded), like
     * the Flutter app. Off in debug builds and when the release has no key.
     */
    private fun setupAnalytics() {
        val key = BuildConfig.POSTHOG_API_KEY
        if (key.isEmpty() || BuildConfig.DEBUG) return
        val config =
            PostHogAndroidConfig(projectToken = key, host = "https://us.i.posthog.com").apply {
                captureApplicationLifecycleEvents = true
                captureScreenViews = false
                captureDeepLinks = false
                sessionReplay = false
            }
        PostHogAndroid.setup(this, config)
    }
}
