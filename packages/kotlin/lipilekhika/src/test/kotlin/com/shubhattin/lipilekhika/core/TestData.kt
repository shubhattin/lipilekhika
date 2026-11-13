package com.shubhattin.lipilekhika.core

import java.io.File
import org.snakeyaml.engine.v2.api.Load
import org.snakeyaml.engine.v2.api.LoadSettings

/** The shared test data of all the packages (`test_data/`, see CONTRIBUTING.md) */
object TestData {
    val dir: File =
        File(
            System.getProperty("lipilekhika.testDataDir")
                ?: error("the system property lipilekhika.testDataDir is not set (run with Gradle)")
        )

    /** The vedic svaras, see [skipTamilExtendedVedic] */
    private val VEDIC_SVARAS = listOf("॒", "॑", "᳚", "᳛")

    /** The `.yaml` files under [root], sorted, without the folders named in [skipFolders] */
    fun yamlFiles(root: File, skipFolders: Set<String> = emptySet()): List<File> {
        check(root.isDirectory) { "test data folder not found: $root (run bun run gen:test-data)" }
        return root
            .walkTopDown()
            .onEnter { it == root || it.name !in skipFolders }
            .filter { it.isFile && it.extension == "yaml" }
            .sortedBy { it.relativeTo(root).path }
            .toList()
    }

    /** The items of a test data file (a YAML list of maps) */
    @Suppress("UNCHECKED_CAST")
    fun load(file: File): List<Map<String, Any?>> {
        val data = Load(LoadSettings.builder().build()).loadFromString(file.readText())
        return (data as List<Map<String, Any?>>?).orEmpty()
    }

    /**
     * The generated (`auto-*`) data has wrong vedic svara tails for Tamil-Extended (from the old
     * implementation): those cases are not checked, like in the other packages.
     */
    fun skipTamilExtendedVedic(file: File, to: String, result: String): Boolean =
        file.name.startsWith("auto") &&
            to == "Tamil-Extended" &&
            VEDIC_SVARAS.any { result.contains(it) }

    /** Types [text] key by key (each code point is a key) in [script], returns the text typed */
    fun emulateTyping(text: String, script: String, options: TypingContextOptions? = null): String =
        createTypingContext(script, options).use { ctx ->
            var result = ""
            var i = 0
            while (i < text.length) {
                val next = text.offsetByCodePoints(i, 1)
                result = ctx.takeKeyInput(text.substring(i, next)).applyTo(result)
                i = next
            }
            result
        }
}

/** A case of the transliteration test data */
data class TransliterationCase(
    val index: Any?,
    val from: String,
    val to: String,
    val input: String,
    val output: String,
    val reversible: Boolean,
    val todo: Boolean,
    val options: Map<String, Boolean>?,
) {
    companion object {
        @Suppress("UNCHECKED_CAST")
        fun of(item: Map<String, Any?>) =
            TransliterationCase(
                index = item["index"] ?: "unknown",
                from = item["from"] as String,
                to = item["to"] as String,
                input = item["input"] as String,
                output = item["output"] as String,
                reversible = item["reversible"] as Boolean? ?: false,
                todo = item["todo"] as Boolean? ?: false,
                options = item["options"] as Map<String, Boolean>?,
            )
    }
}
