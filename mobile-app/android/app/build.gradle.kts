import com.android.build.api.variant.FilterConfiguration
import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.compose)
}

val appVersionName = providers.gradleProperty("app.versionName").get()
val appVersionCode = providers.gradleProperty("app.versionCode").get().toInt()

/** Split APKs, one per ABI (the release workflow passes -Papp.splitAbi=true) */
val splitAbi = providers.gradleProperty("app.splitAbi").orNull == "true"

/** The version code of a split APK: ABI × 1000 + versionCode, as the Flutter app numbered them */
val abiVersionCodes = mapOf("armeabi-v7a" to 1, "arm64-v8a" to 2, "x86_64" to 4)

// the release signing key, from the environment (CI); without it a release build is signed with
// the debug key (so it can be installed locally)
val keystorePath: String? = System.getenv("ANDROID_KEYSTORE_PATH")

android {
    namespace = "com.shubhattin.lipilekhika"
    compileSdk = 37

    defaultConfig {
        applicationId = "com.shubhattin.lipilekhika"
        minSdk = 24
        targetSdk = 36
        versionCode = appVersionCode
        versionName = appVersionName
        // PostHog (app lifecycle events only), off when the key is not set
        buildConfigField(
            "String",
            "POSTHOG_API_KEY",
            "\"${System.getenv("MOBILE_APP_POSTHOG_KEY").orEmpty()}\"",
        )
    }

    signingConfigs {
        create("release") {
            if (keystorePath != null) {
                storeFile = file(keystorePath)
                storePassword = System.getenv("ANDROID_KEYSTORE_PASSWORD")
                keyAlias = System.getenv("ANDROID_KEY_ALIAS")
                keyPassword = System.getenv("ANDROID_KEY_PASSWORD")
            }
        }
    }

    buildTypes {
        debug {
            // installs next to the released app
            applicationIdSuffix = ".debug"
            versionNameSuffix = "-debug"
        }
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
            signingConfig =
                if (keystorePath != null) signingConfigs.getByName("release")
                else signingConfigs.getByName("debug")
        }
    }

    splits {
        abi {
            isEnable = splitAbi
            reset()
            include(*abiVersionCodes.keys.toTypedArray())
            isUniversalApk = true
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    // the fonts of the scripts are the ones the desktop app bundles (Noto, Satisar Sharada)
    sourceSets["main"].assets.directories.add("../../../desktop-client/assets/fonts")

    packaging {
        jniLibs {
            // the Rust library is loaded with System.loadLibrary (no extraction needed:
            // uncompressed and 16 KB aligned)
            useLegacyPackaging = false
            // other libraries have an x86 build too, the Rust library is not built for x86:
            // without this the Play Store would offer the app to x86 devices, where it would not
            // start
            excludes += "lib/x86/**"
        }
    }
}

kotlin { compilerOptions { jvmTarget.set(JvmTarget.JVM_17) } }

androidComponents {
    onVariants { variant ->
        variant.outputs.forEach { output ->
            val abi = output.filters.find { it.filterType == FilterConfiguration.FilterType.ABI }
            val abiCode = abi?.let { abiVersionCodes[it.identifier] }
            if (abiCode != null) output.versionCode.set(abiCode * 1000 + appVersionCode)
        }
    }
}

dependencies {
    implementation(libs.lipilekhika)

    implementation(platform(libs.compose.bom))
    implementation(libs.compose.ui)
    implementation(libs.compose.foundation)
    implementation(libs.compose.material3)
    implementation(libs.compose.material.icons)
    implementation(libs.compose.ui.tooling.preview)
    debugImplementation(libs.compose.ui.tooling)

    implementation(libs.activity.compose)
    implementation(libs.core.ktx)
    implementation(libs.core.splashscreen)
    implementation(libs.lifecycle.viewmodel.compose)
    implementation(libs.lifecycle.runtime.compose)
    implementation(libs.posthog.android)

    testImplementation(libs.junit)
}
