import org.gradle.api.tasks.testing.logging.TestExceptionFormat
import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins { alias(libs.plugins.android.library) }

group = "com.shubhattin.lipilekhika"

version = "0.1.0"

// The Rust side: packages/kotlin/binding (a member of the Cargo workspace at the repo root)
val repoRoot: File = rootDir.resolve("../..").canonicalFile
val bindingDir: File = rootDir.resolve("binding")
val cargoTargetDir: File =
    providers.environmentVariable("CARGO_TARGET_DIR").map { File(it) }.orNull
        ?: repoRoot.resolve("target")
val hostLibDir: File = cargoTargetDir.resolve("release")
val hostLib: File = hostLibDir.resolve(System.mapLibraryName("lipilekhika_kotlin"))
val rustSources =
    files(
        fileTree(bindingDir.resolve("src")),
        bindingDir.resolve("Cargo.toml"),
        bindingDir.resolve("uniffi.toml"),
        fileTree(repoRoot.resolve("packages/rust/src")),
        repoRoot.resolve("Cargo.lock"),
    )
val abis: List<String> =
    providers
        .gradleProperty("lipilekhika.abis")
        // the default of gradle.properties, also when an app includes this build
        .orElse("arm64-v8a,armeabi-v7a,x86_64")
        .get()
        .split(",")
        .map { it.trim() }
        .filter {
            it.isNotEmpty()
        }

android {
    namespace = "com.shubhattin.lipilekhika.core"
    compileSdk = 36
    ndkVersion = "28.2.13676358"

    defaultConfig {
        minSdk = 24
        consumerProguardFiles("consumer-rules.pro")
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    testOptions { unitTests.all { it.useJUnit() } }
}

kotlin { compilerOptions { jvmTarget.set(JvmTarget.JVM_17) } }

/** The library for this machine (tests on the JVM), and the uniffi-bindgen tool */
val cargoBuildHost =
    tasks.register<Exec>("cargoBuildHost") {
        group = "rust"
        description = "Builds the Rust library for this machine (used by the unit tests)"
        workingDir = repoRoot
        commandLine(
            "cargo",
            "build",
            "--release",
            "-p",
            "kotlin_binding",
            "--features",
            "bindgen",
        )
        inputs.files(rustSources)
        outputs.file(hostLib)
    }

/** An Exec task with an output directory (that the Android build takes as generated sources) */
abstract class RustOutputTask : Exec() {
    @get:OutputDirectory abstract val outputDir: DirectoryProperty
}

/** The Kotlin code of the bindings, generated from the library (gitignored, like Dart's) */
val generateBindings =
    tasks.register<RustOutputTask>("generateBindings") {
        group = "rust"
        description = "Generates the Kotlin code of the UniFFI bindings"
        dependsOn(cargoBuildHost)
        outputDir.set(layout.buildDirectory.dir("generated/uniffi"))
        val out = outputDir.get().asFile
        workingDir = repoRoot
        commandLine(
            hostLibDir.resolve("uniffi-bindgen").path,
            "generate",
            "--library",
            hostLib.path,
            "--language",
            "kotlin",
            "--out-dir",
            out.path,
            "--no-format",
        )
        inputs.file(hostLib)
        doFirst { out.deleteRecursively() }
    }

/** The libraries for the Android ABIs, built with cargo-ndk */
val cargoNdk =
    tasks.register<RustOutputTask>("cargoNdk") {
        group = "rust"
        description = "Builds the Rust library for the Android ABIs ($abis) with cargo-ndk"
        outputDir.set(layout.buildDirectory.dir("rustJniLibs"))
        val out = outputDir.get().asFile
        workingDir = repoRoot
        val ndkDir = androidComponents.sdkComponents.ndkDirectory
        doFirst {
            out.deleteRecursively()
            environment("ANDROID_NDK_HOME", ndkDir.get().asFile.path)
        }
        commandLine(
            buildList {
                addAll(listOf("cargo", "ndk", "--platform", "24"))
                abis.forEach { addAll(listOf("-t", it)) }
                addAll(listOf("-o", out.path, "build", "--release", "-p", "kotlin_binding"))
            }
        )
        inputs.files(rustSources)
        inputs.property("abis", abis)
    }

androidComponents {
    onVariants { variant ->
        variant.sources.kotlin?.addGeneratedSourceDirectory(
            generateBindings,
            RustOutputTask::outputDir,
        )
        variant.sources.jniLibs?.addGeneratedSourceDirectory(cargoNdk, RustOutputTask::outputDir)
    }
}

dependencies {
    // JNA, which the UniFFI code calls the library with (the AAR has its Android libraries)
    implementation("${libs.jna.get()}@aar")

    // the unit tests run on this machine's JVM: the JNA jar has its libraries for desktop
    testImplementation(libs.jna)
    testImplementation(libs.junit)
    testImplementation(libs.kotlin.test.junit)
    testImplementation(libs.snakeyaml.engine)
}

tasks.withType<Test>().configureEach {
    dependsOn(cargoBuildHost)
    systemProperty("jna.library.path", hostLibDir.path)
    systemProperty("lipilekhika.testDataDir", repoRoot.resolve("test_data").path)
    maxHeapSize = "1g"
    // JNA loads the library (Java 22+ warns about native access otherwise)
    if (javaLauncher.get().metadata.languageVersion.asInt() >= 22) {
        jvmArgs("--enable-native-access=ALL-UNNAMED")
    }
    testLogging {
        events("failed", "skipped")
        exceptionFormat = TestExceptionFormat.FULL
    }
    // a one-line summary of the run (Gradle prints nothing when all tests pass)
    addTestListener(
        object : TestListener {
            override fun beforeSuite(suite: TestDescriptor) {}

            override fun beforeTest(testDescriptor: TestDescriptor) {}

            override fun afterTest(testDescriptor: TestDescriptor, result: TestResult) {}

            override fun afterSuite(suite: TestDescriptor, result: TestResult) {
                if (suite.parent == null) {
                    println(
                        "Tests: ${result.testCount}, passed ${result.successfulTestCount}, " +
                            "failed ${result.failedTestCount}, skipped ${result.skippedTestCount}"
                    )
                }
            }
        }
    )
}
