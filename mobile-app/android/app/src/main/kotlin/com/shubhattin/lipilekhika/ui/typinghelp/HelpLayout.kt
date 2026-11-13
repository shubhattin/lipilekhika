package com.shubhattin.lipilekhika.ui.typinghelp

import com.shubhattin.lipilekhika.core.KramaDataItem
import com.shubhattin.lipilekhika.core.ListType
import com.shubhattin.lipilekhika.core.getScriptKramaData
import com.shubhattin.lipilekhika.core.getScriptTypingDataMap
import com.shubhattin.lipilekhika.core.transliterate
import java.util.concurrent.ConcurrentHashMap

/*
 * The organized layout of the typing help, a port of the web app's
 * `docs/docs-and-web-client/src/components/typing_help/layout.ts`.
 *
 * The krama list is index aligned across all scripts, so the layout is described once with the
 * `Normal` krama text of each position (`k`, `kh`, ...) and resolved for any script. The typing map
 * and the script comparison both render from the same layout. All the data comes from the library
 * (`getScriptKramaData`, `getScriptTypingDataMap`, `transliterate`), nothing is hard-coded but the
 * layout itself (which letters go in which group), exactly like on the web.
 *
 * This file has no UI: the types are the "props" the composables of the sheet render.
 */

/** One text of a cell: the text and the keys to type it */
data class Glyph(
    val text: String,
    /** the main key to type it */
    val primary: String?,
    /** the other keys which give the same text */
    val alternates: List<String>,
)

/** The compared script's text of a cell (Compare tab) */
data class CompareText(val text: String, val sign: String? = null)

/** One card */
data class Cell(
    val id: String,
    /** the character in the selected script */
    val main: Glyph,
    /** the vowel sign (mAtrA) of a svara */
    val sign: Glyph? = null,
    /** compare mode: the same position in the compared script */
    val other: CompareText? = null,
    /** a short description, for the invisible or special characters */
    val label: String? = null,
)

data class Group(
    val id: String,
    val title: String,
    /** a short description shown with the title */
    val hint: String? = null,
    /** a fixed grid where the column has a meaning (the vargas), empty slots are `null` */
    val columns: Int? = null,
    val cells: List<Cell?>,
) {
    val isNotEmpty: Boolean
        get() = cells.any { it != null }
}

enum class SectionId {
    SVARA,
    VYANJANA,
    OTHER,
    SPECIAL,
}

data class Section(
    val id: SectionId,
    val title: String,
    val hint: String? = null,
    val groups: List<Group>,
)

/** `kqh` -> क + ह, not `kh` -> ख */
data class SeparatorExample(
    val joined: String,
    val joinedText: String,
    val split: String,
    val splitText: String,
)

/** A key for an invisible character (ZWJ, ZWNJ) */
data class Joiner(
    val key: String,
    val name: String,
    val exampleInput: String? = null,
    val exampleOutput: String? = null,
)

/** A key which gives a letter as it is (`QQ` -> Q) */
data class Literal(val key: String, val text: String)

/** The keys which change how the typing works, they are not characters of the script */
data class TypingControls(
    /** `q` keeps two keys apart (brahmic scripts only) */
    val separator: SeparatorExample?,
    val joiners: List<Joiner>,
    val literals: List<Literal>,
) {
    val isNotEmpty: Boolean
        get() = separator != null || joiners.isNotEmpty() || literals.isNotEmpty()
}

data class HelpLayout(
    val script: String,
    val compare: String?,
    /** false for the romanized scripts, which have no separate mAtrA or vyanjana types */
    val brahmic: Boolean,
    /** only in the typing map */
    val controls: TypingControls?,
    val sections: List<Section>,
)

// ---- what goes in which group (the same lists as layout.ts) ----

private class GroupSpec(
    val id: String,
    val title: String,
    /** `Normal` krama text, or `dev:<char>` for the positions without a Normal text */
    val items: List<String>,
    val hint: String? = null,
    val columns: Int? = null,
)

private val SVARA_ITEMS =
    listOf(
        "a",
        "A",
        "i",
        "I",
        "u",
        "U",
        "e",
        "E",
        "ai",
        "o",
        "O",
        "au",
        "R",
        "RR",
        "LR",
        "LRR",
        "aiI",
        "auU",
    )

private val VARGA_SPECS =
    listOf(
        GroupSpec("ka", "Ka-varga", listOf("k", "kh", "g", "gh", "G"), "velar", 5),
        GroupSpec("cha", "Cha-varga", listOf("ch", "Ch", "j", "jh", "J"), "palatal", 5),
        GroupSpec("Ta", "Ṭa-varga", listOf("T", "Th", "D", "Dh", "N"), "retroflex", 5),
        GroupSpec("ta", "Ta-varga", listOf("t", "th", "d", "dh", "n"), "dental", 5),
        GroupSpec("pa", "Pa-varga", listOf("p", "ph", "b", "bh", "m"), "labial", 5),
    )

private val VYANJANA_REST_SPECS =
    listOf(
        GroupSpec("antahstha", "Antaḥstha", listOf("y", "r", "l", "v"), "semivowels"),
        GroupSpec("ushma", "Ūṣma", listOf("sh", "Sh", "s", "h"), "sibilants"),
        GroupSpec("extra", "Additional", listOf("L", "Lz", "rz", "nz")),
        GroupSpec(
            "nukta",
            "Nukta forms",
            listOf("kz", "khz", "gz", "jz", "Dz", "Dhz", "phz", "yz"),
            "for Urdu and Persian sounds",
        ),
    )

/** Typed as a sequence of keys, `x` is a key of its own for क्ष */
private class Conjunct(val seq: String, val keys: List<String>)

private val CONJUNCTS =
    listOf(
        Conjunct("kSh", listOf("kSh")),
        Conjunct("tr", listOf("tr")),
        Conjunct("jJ", listOf("jJ", "jY")),
        Conjunct("shr", listOf("shr")),
    )

private val OTHER_SPECS =
    listOf(
        GroupSpec(
            "yogavaha",
            "Ayogavāha",
            listOf("M", "MM", "H"),
            "anusvāra, candrabindu, visarga",
        ),
        // `dev:` positions: the halant and the nukta have no Normal text
        GroupSpec("symbols", "Symbols", listOf("AUM", "`", "dev:्", "dev:़", "°")),
        GroupSpec(
            "numerals",
            "Numerals",
            listOf("0", "1", "2", "3", "4", "5", "6", "7", "8", "9"),
            "plain digits follow the \"native numerals\" setting, .1 always gives the native digit",
        ),
        GroupSpec("punctuation", "Punctuation", listOf(".", "..")),
        GroupSpec("vedic", "Vedic accents", listOf("↓", "↑", "↑↑", "↑↑↑")),
    )

private const val ZWJ = "\u200D"

private val CHAR_LABELS =
    mapOf(
        ZWJ to "Zero width joiner",
        "\u200C" to "Zero width non-joiner",
        "्" to "Halant",
        "़" to "Nukta",
        "ऽ" to "Avagraha",
        "॰" to "Abbreviation sign",
    )

private val COMBINING_START = Regex("^\\p{M}")
private val ASCII = Regex("^[\\x20-\\x7e]+$")
private val INVISIBLE = Regex("^[\\p{Cf}\\p{Z}\\s]+$")

/** Dotted circle base for the combining signs, so a lone mAtrA or halant stays visible */
fun displayText(text: String): String =
    if (COMBINING_START.containsMatchIn(text)) "◌$text" else text

private fun isAscii(s: String) = ASCII.containsMatchIn(s)

/** The format characters (ZWJ...) render as nothing, show their label instead */
fun isInvisible(text: String): Boolean = INVISIBLE.containsMatchIn(text)

/** The `Normal` text of the position is the main key, when it can be typed */
private fun glyph(text: String, keys: List<String>, normalText: String? = null): Glyph {
    val primary =
        if (normalText != null && isAscii(normalText) && keys.contains(normalText)) normalText
        else keys.firstOrNull(::isAscii) ?: keys.firstOrNull()
    return Glyph(text, primary, keys.filter { it != primary })
}

// ---- caches (the data of a script does not change) ----

private val kramaCache = ConcurrentHashMap<String, List<KramaDataItem>>()

private fun kramaOf(script: String): List<KramaDataItem> =
    kramaCache[script] ?: getScriptKramaData(script).also { kramaCache[script] = it }

private data class LayoutKey(val script: String, val compare: String?)

private val layoutCache = ConcurrentHashMap<LayoutKey, HelpLayout>()

/** The layout when it was built before, so the sheet can show it at once */
fun peekLayout(script: String, compare: String? = null): HelpLayout? =
    layoutCache[LayoutKey(script, compare)]

/** [buildLayout], remembered. Blocking: call it off the main thread. */
fun loadLayout(script: String, compare: String? = null): HelpLayout =
    layoutCache.getOrPut(LayoutKey(script, compare)) { buildLayout(script, compare) }

private fun keyOf(text: String, type: ListType) = "$text\u0000${type.name}"

private fun isBrahmic(k: List<KramaDataItem>, indexOfK: Int) =
    indexOfK >= 0 && indexOfK < k.size && k[indexOfK].listType == ListType.VYANJANA

/**
 * Builds the layout of [script], with the texts of [compare] beside it when given (the Compare
 * tab). Blocking (FFI calls): run it off the main thread.
 */
fun buildLayout(script: String, compare: String? = null): HelpLayout {
    val krama = kramaOf(script)
    val typingMap = getScriptTypingDataMap(script)
    val normal = kramaOf("Normal")
    val dev = kramaOf("Devanagari")
    val cmp = compare?.let { kramaOf(it) }
    val comparing = cmp != null

    fun indexOf(id: String): Int =
        if (id.startsWith("dev:")) dev.indexOfFirst { it.text == id.substring(4) }
        else normal.indexOfFirst { it.text == id }

    val keysMap = HashMap<String, List<String>>()
    for (item in typingMap.commonKramaMap) keysMap[keyOf(item.text, item.listType)] = item.mappings

    // the typing map entries already shown, the rest ends up in "Other characters"
    val shownEntries = HashSet<String>()
    // the cells already shown, a second position with the same text (or text pair) is skipped
    val seenCells = HashSet<String>()

    fun glyphAt(i: Int): Glyph? {
        val row = krama.getOrNull(i) ?: return null
        if (row.text.isEmpty()) return null
        val keys = keysMap[keyOf(row.text, row.listType)] ?: emptyList()
        return glyph(row.text, keys, normal.getOrNull(i)?.text)
    }

    fun markShown(i: Int) {
        krama.getOrNull(i)?.let { shownEntries.add(keyOf(it.text, it.listType)) }
    }

    val indexOfK = indexOf("k")
    val brahmic = isBrahmic(krama, indexOfK)

    fun cellAt(id: String, withSign: Boolean = false): Cell? {
        val i = indexOf(id)
        if (i == -1) return null
        val main = glyphAt(i) ?: return null

        var sign: Glyph? = null
        if (withSign && krama.getOrNull(i + 1)?.listType == ListType.MATRA) sign = glyphAt(i + 1)

        var other: CompareText? = null
        if (cmp != null) {
            val otherText = cmp.getOrNull(i)?.text ?: ""
            val next = cmp.getOrNull(i + 1)
            val otherSign =
                if (withSign && next?.listType == ListType.MATRA && next.text.isNotEmpty())
                    next.text
                else null
            other = CompareText(otherText, otherSign)
        }

        // a character which can not be typed has nothing to show in the typing map
        if (!comparing && main.primary == null) return null

        val dedupeKey =
            listOf(main.text, sign?.text, other?.text, other?.sign).joinToString("\u0000") {
                it ?: ""
            }
        if (!seenCells.add(dedupeKey)) return null
        markShown(i)
        if (sign != null) markShown(i + 1)

        return Cell(id, main, sign, other, CHAR_LABELS[main.text])
    }

    fun buildGroup(spec: GroupSpec, withSign: Boolean = false): Group {
        val cells = spec.items.map { cellAt(it, withSign) }
        return Group(
            id = spec.id,
            title = spec.title,
            hint = spec.hint,
            columns = spec.columns,
            // keep the empty slots only where the column has a meaning
            cells = if (spec.columns != null) cells else cells.filterNotNull(),
        )
    }

    // Svara
    val svaraGroup = buildGroup(GroupSpec("svara", "Svara", SVARA_ITEMS), withSign = brahmic)

    // Vyanjana
    val vargaGroups = VARGA_SPECS.map { buildGroup(it) }
    val restGroups = VYANJANA_REST_SPECS.map { buildGroup(it) }

    // the inherent `a` gives the bare conjunct in the brahmic scripts, the romanized ones have none
    fun conjunctText(seq: String, to: String, toBrahmic: Boolean): String {
        val text = transliterate(seq + "a", "Normal", to)
        return if (toBrahmic) text else text.replace(Regex("a$"), "")
    }

    val cmpBrahmic = cmp != null && isBrahmic(cmp, indexOfK)
    val conjunctCells = CONJUNCTS.map { c ->
        val text = conjunctText(c.seq, script, brahmic)
        val type = if (brahmic) ListType.VYANJANA else ListType.ANYA
        val ownKeys = keysMap[keyOf(text, type)] ?: emptyList()
        if (ownKeys.isNotEmpty()) shownEntries.add(keyOf(text, type))
        Cell(
            id = "conj-${c.seq}",
            main = Glyph(text, c.keys.first(), c.keys.drop(1) + ownKeys),
            other = compare?.let { CompareText(conjunctText(c.seq, it, cmpBrahmic)) },
        )
    }
    val conjunctGroup =
        Group(
            id = "conjuncts",
            title = "Common conjuncts",
            hint = "typed as a sequence of consonants",
            cells = conjunctCells,
        )

    // Other
    val otherGroups = OTHER_SPECS.map { buildGroup(it) }

    // Special (typing map only)
    val specialGroups = ArrayList<Group>()
    var controls: TypingControls? = null
    if (!comparing) {
        val specific = typingMap.scriptSpecificKramaMap
        if (brahmic) {
            specialGroups +=
                Group(
                    id = "signs",
                    title = "Standalone mātrā signs",
                    hint = "a vowel sign on its own, without a consonant before it",
                    cells =
                        svaraGroup.cells.mapNotNull { cell ->
                            val sign = cell?.sign
                            if (cell != null && sign?.primary != null) Cell("sign-${cell.id}", sign)
                            else null
                        },
                )
        }

        // the joiners and the literal letters are typing controls, not characters of the script
        specialGroups +=
            Group(
                id = "extra",
                title = "Extra characters",
                hint = "beyond the common set",
                cells =
                    specific.mapIndexedNotNull { idx, item ->
                        if (isAscii(item.text) || isInvisible(item.text)) null
                        else
                            Cell(
                                "specific-$idx",
                                glyph(item.text, item.mappings),
                                label = CHAR_LABELS[item.text],
                            )
                    },
            )

        specialGroups +=
            Group(
                id = "unlisted",
                title = "Other characters",
                cells =
                    typingMap.commonKramaMap.mapIndexedNotNull { idx, item ->
                        if (
                            keyOf(item.text, item.listType) in shownEntries ||
                                item.listType == ListType.MATRA
                        )
                            null
                        else
                            Cell(
                                "unlisted-$idx",
                                glyph(item.text, item.mappings),
                                label = CHAR_LABELS[item.text],
                            )
                    },
            )

        fun t(text: String) = transliterate(text, "Normal", script)
        val k = t("k")
        controls =
            TypingControls(
                separator =
                    if (brahmic) SeparatorExample("kh", t("kha"), "kqh", k + t("ha")) else null,
                joiners =
                    specific
                        .filter { isInvisible(it.text) && it.mappings.isNotEmpty() }
                        .map { item ->
                            val withExample = brahmic && item.text == ZWJ
                            Joiner(
                                key = item.mappings.first(),
                                name = CHAR_LABELS[item.text] ?: "Invisible character",
                                exampleInput = if (withExample) "k.qSh" else null,
                                exampleOutput = if (withExample) k + ZWJ + t("Sha") else null,
                            )
                        },
                literals =
                    specific
                        .filter {
                            isAscii(it.text) &&
                                it.mappings.isNotEmpty() &&
                                it.mappings.first() != it.text
                        }
                        .map { Literal(it.mappings.first(), it.text) },
            )
    }

    val sections =
        listOf(
            Section(
                SectionId.SVARA,
                "Svara",
                if (brahmic) "vowels with their mātrā signs" else "vowels",
                listOf(svaraGroup),
            ),
            Section(
                SectionId.VYANJANA,
                "Vyañjana",
                "consonants",
                vargaGroups + restGroups + conjunctGroup,
            ),
            Section(SectionId.OTHER, "Other", null, otherGroups),
            Section(SectionId.SPECIAL, "Special", null, specialGroups),
        )

    return HelpLayout(
        script = script,
        compare = compare,
        brahmic = brahmic,
        controls = controls,
        sections =
            sections
                .map { s -> s.copy(groups = s.groups.filter { it.isNotEmpty }) }
                .filter { it.groups.isNotEmpty() },
    )
}
