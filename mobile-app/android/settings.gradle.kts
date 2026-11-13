pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "lipilekhika-android"

include(":app")

// The Kotlin package (Rust bindings): `com.shubhattin.lipilekhika:lipilekhika` comes from here
includeBuild("../../packages/kotlin")
