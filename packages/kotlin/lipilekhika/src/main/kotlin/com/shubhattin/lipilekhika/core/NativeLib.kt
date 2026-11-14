package com.shubhattin.lipilekhika.core

import java.lang.ref.PhantomReference
import java.lang.ref.ReferenceQueue
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicBoolean

/**
 * The native methods of the Rust library (`packages/kotlin/binding`, through JNI). Its functions
 * are named `Java_com_shubhattin_lipilekhika_core_NativeLib_<method>`.
 *
 * They throw the [LipiException]s. The typing context methods are in [TypingContext].
 */
internal object NativeLib {
    init {
        System.loadLibrary("lipilekhika_kotlin")
    }

    /** [optionKeys] and [optionValues]: the custom options, both `null` for none */
    @JvmStatic
    external fun transliterate(
        text: String,
        fromScript: String,
        toScript: String,
        optionKeys: Array<String>?,
        optionValues: BooleanArray?,
    ): String

    @JvmStatic external fun preloadScriptData(scriptName: String)

    /** `1` (true), `0` (false), `-1` (no schwa deletion property) */
    @JvmStatic external fun getSchwaStatusForScript(scriptName: String): Int

    @JvmStatic external fun getAllOptions(fromScript: String, toScript: String): Array<String>

    @JvmStatic external fun getNormalizedScriptName(scriptName: String): String

    /** `[scripts, langs, langScriptMap, scriptAlternatesMap]`, the maps as `[k, v, k, v, ...]` */
    @JvmStatic external fun getScriptListData(): Array<Array<String>>

    @JvmStatic external fun defaultAutoContextClearTimeMs(): Long

    @JvmStatic external fun defaultUseNativeNumerals(): Boolean

    @JvmStatic external fun defaultIncludeInherentVowel(): Boolean

    /** A new typing context (the options apply when [hasOptions]), the pointer to it */
    @JvmStatic
    external fun typingContextNew(
        typingScript: String,
        hasOptions: Boolean,
        autoContextClearTimeMs: Long,
        useNativeNumerals: Boolean,
        includeInherentVowel: Boolean,
    ): Long

    /** Frees a typing context of [typingContextNew] (once) */
    @JvmStatic external fun typingContextFree(handle: Long)

    /** `[commonKramaMap, scriptSpecificKramaMap]`, items `[text, ListType ordinal, mappings...]` */
    @JvmStatic external fun getScriptTypingDataMap(script: String): Array<Array<Array<String>>>

    /** The items `[text, ListType ordinal]` */
    @JvmStatic external fun getScriptKramaData(script: String): Array<Array<String>>

    @JvmStatic external fun getScriptInputTexts(script: String): Array<String>
}

/**
 * Runs the cleanup of an object after it is garbage collected, unless [Cleanable.clean] ran it
 * before. (`java.lang.ref.Cleaner` needs Android 13, this works on all versions.)
 */
internal object NativeCleaner {
    private val queue = ReferenceQueue<Any>()

    /** The registered references (kept reachable until they are cleaned) */
    private val pending: MutableSet<Cleanable> = ConcurrentHashMap.newKeySet()

    class Cleanable internal constructor(owner: Any, private val action: Runnable) :
        PhantomReference<Any>(owner, queue) {
        private val cleaned = AtomicBoolean(false)

        /** Runs the cleanup now, at most once */
        fun clean() {
            if (cleaned.compareAndSet(false, true)) {
                pending.remove(this)
                clear()
                action.run()
            }
        }
    }

    /** [action] must not reference [owner], else it is never collected */
    fun register(owner: Any, action: Runnable): Cleanable =
        Cleanable(owner, action).also { pending.add(it) }

    init {
        Thread(
                {
                    while (true) {
                        // a failing cleanup (or an interrupt) does not stop the others
                        try {
                            (queue.remove() as Cleanable).clean()
                        } catch (_: Throwable) {}
                    }
                },
                "lipilekhika-cleaner",
            )
            .apply { isDaemon = true }
            .start()
    }
}
