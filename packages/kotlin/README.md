# Lipi Lekhika for Kotlin (internal)

Kotlin (and Java) bindings of the Rust library ([`packages/rust`](../rust)), for the native Android app. Not published to any registry.

- `binding/`: the Rust crate (`kotlin_binding`, a member of the Cargo workspace). [UniFFI](https://mozilla.github.io/uniffi-rs/) generates the Kotlin code that calls it (through JNA) from the built library.
- `lipilekhika/`: an Android library module. The generated code (package `com.shubhattin.lipilekhika.core.ffi`, gitignored) and the public API around it (package `com.shubhattin.lipilekhika.core`).

## Usage

```kotlin
import com.shubhattin.lipilekhika.core.*

transliterate("नमस्ते", "Devanagari", "Telugu")                      // నమస్తే
transliterate("सोऽहम्", "Hindi", "Normal", mapOf("all_to_normal:replace_avagraha_with_a" to true))
getAllOptions("Devanagari", "Normal")                                // the option keys of a pair
getScriptListData()                                                  // scripts, languages, aliases

// typing key by key (the realtime typing of the apps)
createTypingContext("Devanagari", TypingContextOptions(includeInherentVowel = true)).use { ctx ->
    var text = ""
    for (key in listOf("n", "a", "m")) text = ctx.takeKeyInput(key).applyTo(text)
}
```

- A script name that is not known (or an option key) throws an `InvalidScriptException` (`UnknownOptionException`), both `LipiException`s.
- `TypingDiff.toDeleteCharsCount` counts code points. A Kotlin `String` counts UTF-16 units, and a character outside the BMP (Brahmi, Siddham, ...) is 2 of them: use `diff.deleteCountIn(text)` or `diff.applyTo(text)`.
- From Java the functions are static methods of `Lipilekhika` and `LipilekhikaTyping`. Java does not see the Kotlin type aliases, so it imports `TypingContext`, `TypingDiff`, `LipiException`, ... from `com.shubhattin.lipilekhika.core.ffi`.

An app uses it as a Gradle included build (`includeBuild("../../packages/kotlin")` in its settings, then `implementation("com.shubhattin.lipilekhika:lipilekhika")`). The library brings JNA and its R8 keep rules.

## Building and testing

See the [Kotlin package section of CONTRIBUTING.md](../../CONTRIBUTING.md#kotlin-package-packageskotlin).
