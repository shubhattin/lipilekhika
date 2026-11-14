package com.shubhattin.lipilekhika.ui.typinghelp

import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.PlainTooltip
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TooltipAnchorPosition
import androidx.compose.material3.TooltipBox
import androidx.compose.material3.TooltipDefaults
import androidx.compose.material3.rememberTooltipState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.produceState
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.shubhattin.lipilekhika.ui.theme.LocalDarkTheme
import com.shubhattin.lipilekhika.ui.theme.LocalLipiColors
import com.shubhattin.lipilekhika.ui.theme.scriptFont
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/*
 * The small components of the typing help sheet: the tinted cards, the key caps, the typing
 * controls box, the alternate keys dialog, the loading skeleton and the error box.
 */

// ---- tones: each group is coloured by what it holds ----

/** The colours of a group, after the tailwind palette used on the web (`TONES` in TypingHelper) */
class Tone(val base: Color, private val glyphLight: Color, private val glyphDark: Color) {
    /** the glyph colour (the `text-sky-700 dark:text-sky-300` pair) */
    fun glyph(dark: Boolean) = if (dark) glyphDark else glyphLight

    /** the card background (`bg-sky-500/5`) */
    fun card(dark: Boolean) = base.copy(alpha = if (dark) 0.08f else 0.06f)

    /** the card border (`border-sky-500/25`) */
    fun border() = base.copy(alpha = 0.3f)

    companion object {
        val Sky = Tone(Color(0xFF0EA5E9), Color(0xFF0369A1), Color(0xFF7DD3FC))
        val Rose = Tone(Color(0xFFF43F5E), Color(0xFFBE123C), Color(0xFFFDA4AF))
        val Emerald = Tone(Color(0xFF10B981), Color(0xFF047857), Color(0xFF6EE7B7))
        val Violet = Tone(Color(0xFF8B5CF6), Color(0xFF6D28D9), Color(0xFFC4B5FD))
        val Amber = Tone(Color(0xFFF59E0B), Color(0xFFB45309), Color(0xFFFCD34D))
        val Fuchsia = Tone(Color(0xFFD946EF), Color(0xFFA21CAF), Color(0xFFF0ABFC))
    }
}

/** `toneOf` of the web: the tone of a group */
fun toneOf(section: SectionId, group: String): Tone =
    when (section) {
        SectionId.SVARA -> Tone.Sky
        SectionId.VYANJANA -> if (group == "conjuncts") Tone.Emerald else Tone.Rose
        SectionId.OTHER -> if (group == "numerals") Tone.Violet else Tone.Amber
        SectionId.SPECIAL -> if (group == "signs") Tone.Sky else Tone.Fuchsia
    }

/** `SECTION_ACCENT` of the web: the dot colour of a section */
fun accentOf(section: SectionId): Color =
    when (section) {
        SectionId.SVARA -> Tone.Sky.base
        SectionId.VYANJANA -> Tone.Rose.base
        SectionId.OTHER -> Tone.Amber.base
        SectionId.SPECIAL -> Tone.Fuchsia.base
    }

// ---- keys ----

/** The main key, drawn like a key cap (`<kbd>`): a thicker bottom edge */
@Composable
fun KeyCap(
    text: String,
    modifier: Modifier = Modifier,
    background: Color = LocalLipiColors.current.muted,
) {
    val edge = LocalLipiColors.current.border
    Text(
        text,
        modifier =
            modifier
                .clip(RoundedCornerShape(4.dp))
                .background(background)
                .border(1.dp, edge, RoundedCornerShape(4.dp))
                .drawBehind {
                    // the second pixel of the bottom border (`border-b-2`)
                    val y = size.height - 1.5.dp.toPx()
                    drawLine(
                        edge,
                        Offset(2.dp.toPx(), y),
                        Offset(size.width - 2.dp.toPx(), y),
                        1.dp.toPx(),
                    )
                }
                .padding(horizontal = 6.dp, vertical = 1.dp),
        fontFamily = FontFamily.Monospace,
        fontSize = 12.sp,
        lineHeight = 16.sp,
        fontWeight = FontWeight.Bold,
        color = MaterialTheme.colorScheme.onSurface,
    )
}

/** An alternate key, smaller and muted */
@Composable
fun AltKey(text: String) {
    val colors = LocalLipiColors.current
    Text(
        text,
        modifier =
            Modifier.border(1.dp, colors.border.copy(alpha = 0.8f), RoundedCornerShape(3.dp))
                .padding(horizontal = 3.dp),
        fontFamily = FontFamily.Monospace,
        fontSize = 10.sp,
        lineHeight = 16.sp,
        color = colors.mutedForeground,
    )
}

// ---- cards ----

/**
 * One card of the grid (the `card` snippet of the web): the character in the script font, then the
 * keys (typing map) or the same character of the compared script (Compare).
 */
@OptIn(ExperimentalLayoutApi::class, ExperimentalMaterial3Api::class)
@Composable
fun HelpCard(
    cell: Cell?,
    tone: Tone,
    comparing: Boolean,
    showAlternates: Boolean,
    font: FontFamily,
    otherFont: FontFamily,
    modifier: Modifier = Modifier,
) {
    val colors = LocalLipiColors.current
    val shape = RoundedCornerShape(8.dp)

    // an empty slot of the varga grid (a dashed box)
    if (cell == null) {
        val dash = colors.border.copy(alpha = 0.6f)
        Box(
            modifier.drawBehind {
                drawRoundRect(
                    color = dash,
                    cornerRadius = CornerRadius(8.dp.toPx()),
                    style =
                        Stroke(
                            1.dp.toPx(),
                            pathEffect =
                                PathEffect.dashPathEffect(floatArrayOf(6.dp.toPx(), 4.dp.toPx())),
                        ),
                )
            }
        )
        return
    }

    val dark = LocalDarkTheme.current
    val glyphColor = tone.glyph(dark)
    val card: @Composable (Modifier) -> Unit = { m ->
        Column(
            modifier =
                m.clip(shape)
                    .background(tone.card(dark))
                    .border(1.dp, tone.border(), shape)
                    .padding(horizontal = 4.dp, vertical = 8.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            if (isInvisible(cell.main.text)) {
                // ZWJ... render as nothing, show their label
                Text(
                    cell.label ?: "?",
                    textAlign = TextAlign.Center,
                    style = MaterialTheme.typography.labelMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = colors.mutedForeground,
                )
            } else {
                // the character, and the vowel sign (mAtrA) of a svara a bit lighter beside it
                Text(
                    buildAnnotatedString {
                        append(displayText(cell.main.text))
                        if (cell.sign != null) {
                            append("  ")
                            withStyle(SpanStyle(color = glyphColor.copy(alpha = 0.75f))) {
                                append(displayText(cell.sign.text))
                            }
                        }
                    },
                    fontFamily = font,
                    fontSize = 22.sp,
                    lineHeight = 30.sp,
                    color = glyphColor,
                    textAlign = TextAlign.Center,
                )
            }
            if (!comparing) {
                cell.main.primary?.let { KeyCap(it) }
                if (showAlternates && cell.main.alternates.isNotEmpty()) {
                    FlowRow(
                        horizontalArrangement =
                            Arrangement.spacedBy(2.dp, Alignment.CenterHorizontally),
                        verticalArrangement = Arrangement.spacedBy(2.dp),
                    ) {
                        for (alt in cell.main.alternates) AltKey(alt)
                    }
                }
            } else {
                // the same position of the compared script, under a short divider
                Box(Modifier.width(24.dp).height(1.dp).background(colors.border))
                val other = cell.other
                val otherText =
                    if (other != null && other.text.isNotEmpty()) {
                        displayText(other.text) + (other.sign?.let { "  " + displayText(it) } ?: "")
                    } else "—"
                Text(
                    otherText,
                    fontFamily = otherFont,
                    fontSize = 19.sp,
                    lineHeight = 26.sp,
                    color = colors.mutedForeground,
                    textAlign = TextAlign.Center,
                )
                // the other spellings of the compared script (`R^i` beside `RRi` in ITRANS)
                if (showAlternates && other != null && other.alternates.isNotEmpty()) {
                    FlowRow(
                        horizontalArrangement =
                            Arrangement.spacedBy(2.dp, Alignment.CenterHorizontally),
                        verticalArrangement = Arrangement.spacedBy(2.dp),
                    ) {
                        for (alt in other.alternates) AltKey(alt)
                    }
                }
            }
        }
    }

    // the label of the special characters, as a long press tooltip (the `title` of the web)
    if (cell.label != null && !isInvisible(cell.main.text)) {
        TooltipBox(
            positionProvider =
                TooltipDefaults.rememberTooltipPositionProvider(TooltipAnchorPosition.Above),
            tooltip = { PlainTooltip { Text(cell.label) } },
            state = rememberTooltipState(),
            modifier = modifier,
        ) {
            card(Modifier.fillMaxSize())
        }
    } else {
        card(modifier)
    }
}

/** A row of cards with equal widths and the same height, like a css grid row */
@Composable
fun CardRow(
    cells: List<Cell?>,
    columns: Int,
    tone: Tone,
    comparing: Boolean,
    showAlternates: Boolean,
    font: FontFamily,
    otherFont: FontFamily,
    modifier: Modifier = Modifier,
) {
    Row(modifier.height(IntrinsicSize.Min), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        for (i in 0 until columns) {
            if (i < cells.size) {
                HelpCard(
                    cell = cells[i],
                    tone = tone,
                    comparing = comparing,
                    showAlternates = showAlternates,
                    font = font,
                    otherFont = otherFont,
                    modifier = Modifier.weight(1f).fillMaxHeight(),
                )
            } else {
                // the missing cells of the last row keep the width of the others
                Box(Modifier.weight(1f))
            }
        }
    }
}

// ---- section and group titles ----

/** The title of a section: a dot, the name and its hint (the `h3` of the web) */
@Composable
fun SectionTitle(section: Section, modifier: Modifier = Modifier) {
    Row(
        modifier,
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Box(Modifier.size(10.dp).clip(CircleShape).background(accentOf(section.id)))
        Text(section.title, style = MaterialTheme.typography.titleMedium)
        if (section.hint != null) {
            Text(
                section.hint,
                modifier = Modifier.weight(1f, fill = false),
                style = MaterialTheme.typography.bodyMedium,
                color = LocalLipiColors.current.mutedForeground,
            )
        }
    }
}

/** The title of a group (the `h4`): a coloured bar, the name and its hint */
@Composable
fun GroupTitle(group: Group, tone: Tone, modifier: Modifier = Modifier) {
    Row(
        modifier,
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Box(Modifier.size(width = 4.dp, height = 12.dp).clip(CircleShape).background(tone.base))
        Text(group.title, style = MaterialTheme.typography.titleSmall)
        if (group.hint != null) {
            Text(
                group.hint,
                modifier = Modifier.weight(1f, fill = false),
                style = MaterialTheme.typography.bodySmall,
                color = LocalLipiColors.current.mutedForeground,
            )
        }
    }
}

// ---- typing controls ----

/** The keys which change how the typing works, as one compact box (`TypingControls.svelte`) */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun TypingControlsBox(
    controls: TypingControls,
    font: FontFamily,
    twoColumns: Boolean,
    modifier: Modifier = Modifier,
) {
    val colors = LocalLipiColors.current
    val onSurface = MaterialTheme.colorScheme.onSurface
    val code = SpanStyle(fontFamily = FontFamily.Monospace, fontSize = 12.sp)
    val script = SpanStyle(fontFamily = font, fontSize = 14.sp, color = onSurface)

    // `a → b`, where a is typed text and b its result in the script
    fun example(input: String, output: String) = buildAnnotatedString {
        withStyle(code) { append(input) }
        append(" → ")
        withStyle(script) { append(output) }
    }

    // one entry: the key cap, what it does and an optional example
    val items =
        buildList<@Composable () -> Unit> {
            controls.separator?.let { sep ->
                add {
                    ControlItem(
                        key = "q",
                        title = "Keeps two keys apart",
                        example =
                            buildAnnotatedString {
                                append(example(sep.split, sep.splitText))
                                append(", not ")
                                append(example(sep.joined, sep.joinedText))
                            },
                    )
                }
            }
            for (joiner in controls.joiners) {
                add {
                    ControlItem(
                        key = joiner.key,
                        title = joiner.name,
                        example =
                            if (joiner.exampleInput != null && joiner.exampleOutput != null) {
                                example(joiner.exampleInput, joiner.exampleOutput)
                            } else null,
                    )
                }
            }
        }

    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = MaterialTheme.shapes.large,
        color = colors.muted,
        border = BorderStroke(1.dp, colors.border),
    ) {
        Column(Modifier.padding(12.dp)) {
            Row(
                verticalAlignment = Alignment.Bottom,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Text("Typing controls", style = MaterialTheme.typography.titleSmall)
                Text(
                    "keys that change how you type",
                    modifier = Modifier.weight(1f, fill = false),
                    style = MaterialTheme.typography.bodySmall,
                    color = colors.mutedForeground,
                )
            }
            if (items.isNotEmpty()) {
                Column(
                    Modifier.padding(top = 10.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    // two entries per row on a wide screen (`md:grid-cols-2`)
                    for (chunk in items.chunked(if (twoColumns) 2 else 1)) {
                        Row(horizontalArrangement = Arrangement.spacedBy(24.dp)) {
                            for (item in chunk) Box(Modifier.weight(1f)) { item() }
                            if (chunk.size < (if (twoColumns) 2 else 1)) Box(Modifier.weight(1f))
                        }
                    }
                }
            }
            if (controls.literals.isNotEmpty()) {
                HorizontalDivider(
                    Modifier.padding(top = 12.dp, bottom = 10.dp),
                    color = colors.border,
                )
                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp),
                    itemVerticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        "Literal letters",
                        style = MaterialTheme.typography.bodySmall,
                        color = colors.mutedForeground,
                    )
                    for (literal in controls.literals) LiteralChip(literal)
                }
            }
        }
    }
}

@Composable
private fun ControlItem(key: String, title: String, example: AnnotatedString?) {
    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        KeyCap(key, background = MaterialTheme.colorScheme.surface)
        Column {
            Text(title, style = MaterialTheme.typography.bodyMedium)
            if (example != null) {
                Text(
                    example,
                    style = MaterialTheme.typography.bodySmall,
                    color = LocalLipiColors.current.mutedForeground,
                )
            }
        }
    }
}

/** `QQ → Q` */
@Composable
private fun LiteralChip(literal: Literal) {
    val colors = LocalLipiColors.current
    Text(
        buildAnnotatedString {
            withStyle(SpanStyle(fontFamily = FontFamily.Monospace, fontWeight = FontWeight.Bold)) {
                append(literal.key)
            }
            withStyle(SpanStyle(color = colors.mutedForeground)) { append(" → ") }
            append(literal.text)
        },
        modifier =
            Modifier.clip(MaterialTheme.shapes.small)
                .background(MaterialTheme.colorScheme.surface)
                .border(1.dp, colors.border, MaterialTheme.shapes.small)
                .padding(horizontal = 6.dp, vertical = 2.dp),
        style = MaterialTheme.typography.bodySmall,
    )
}

// ---- the alternate keys dialog ----

/** The example of the alternate keys dialog: ई and its keys in the script */
data class AlternatesExample(val text: String, val keys: List<String>)

/** ई with its keys (I, ee, ii) in the script, found like the web does, from the typing layout */
private fun alternatesExample(script: String): AlternatesExample? {
    val cell =
        loadLayout(script).sections.firstOrNull()?.groups?.firstOrNull()?.cells?.firstOrNull {
            it?.id == "I"
        }
    val primary = cell?.main?.primary ?: return null
    return AlternatesExample(
        cell.main.text,
        listOf(primary) + cell.main.alternates.filter { !it.startsWith(".") },
    )
}

/** The info dialog of "Show alternate keys" (the popover of the web) */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun AlternatesInfoDialog(script: String, onDismiss: () -> Unit) {
    val colors = LocalLipiColors.current
    val example by
        produceState<AlternatesExample?>(null, script) {
            value =
                withContext(Dispatchers.Default) {
                    runCatching { alternatesExample(script) }.getOrNull()
                }
        }
    AlertDialog(
        onDismissRequest = onDismiss,
        confirmButton = { TextButton(onClick = onDismiss) { Text("Got it") } },
        title = { Text("Alternate keys", style = MaterialTheme.typography.titleMedium) },
        shape = MaterialTheme.shapes.large,
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text(
                    "Other keys for the same letter. The first one is the main key.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = colors.mutedForeground,
                )
                example?.let { ex ->
                    FlowRow(
                        modifier =
                            Modifier.fillMaxWidth()
                                .clip(MaterialTheme.shapes.medium)
                                .background(colors.muted)
                                .border(1.dp, colors.border, MaterialTheme.shapes.medium)
                                .padding(horizontal = 12.dp, vertical = 8.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalArrangement = Arrangement.spacedBy(4.dp),
                        itemVerticalAlignment = Alignment.CenterVertically,
                    ) {
                        ex.keys.forEachIndexed { i, key ->
                            if (i == 1)
                                Text(
                                    "or",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = colors.mutedForeground,
                                )
                            if (i == 0) KeyCap(key, background = MaterialTheme.colorScheme.surface)
                            else AltKey(key)
                        }
                        Text("→", color = colors.mutedForeground)
                        Text(
                            ex.text,
                            fontFamily = scriptFont(script),
                            fontSize = 24.sp,
                            lineHeight = 32.sp,
                        )
                    }
                }
                Text(
                    buildAnnotatedString {
                        append(
                            "All of them work while typing. When converting text, some alternates need the "
                        )
                        withStyle(
                            SpanStyle(
                                fontWeight = FontWeight.Medium,
                                color = MaterialTheme.colorScheme.onSurface,
                            )
                        ) {
                            append("Use Typing Characters")
                        }
                        append(" option.")
                    },
                    style = MaterialTheme.typography.bodySmall,
                    color = colors.mutedForeground,
                )
            }
        },
    )
}

// ---- loading and error ----

/** The grey boxes shown while the layout loads (the Skeleton of the web) */
@Composable
fun HelpSkeleton(modifier: Modifier = Modifier) {
    val pulse by
        rememberInfiniteTransition(label = "skeleton")
            .animateFloat(
                initialValue = 0.5f,
                targetValue = 1f,
                animationSpec = infiniteRepeatable(tween(900), RepeatMode.Reverse),
                label = "pulse",
            )
    val box = LocalLipiColors.current.border
    Column(modifier.alpha(pulse), verticalArrangement = Arrangement.spacedBy(24.dp)) {
        for (count in listOf(10, 15, 8)) {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Box(
                    Modifier.size(width = 128.dp, height = 20.dp)
                        .clip(MaterialTheme.shapes.medium)
                        .background(box)
                )
                // rows of 5, like the web's skeleton grid
                for (row in 0 until (count + 4) / 5) {
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        for (i in 0 until 5) {
                            val shown = row * 5 + i < count
                            Box(
                                Modifier.weight(1f)
                                    .height(56.dp)
                                    .clip(MaterialTheme.shapes.medium)
                                    .background(if (shown) box else Color.Transparent)
                            )
                        }
                    }
                }
            }
        }
    }
}

/** "Could not load the typing help" and the reason */
@Composable
fun HelpError(message: String, modifier: Modifier = Modifier) {
    val error = MaterialTheme.colorScheme.error
    Column(
        modifier
            .fillMaxWidth()
            .clip(MaterialTheme.shapes.large)
            .background(error.copy(alpha = 0.05f))
            .border(1.dp, error.copy(alpha = 0.3f), MaterialTheme.shapes.large)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        Text(
            "Could not load the typing help",
            style = MaterialTheme.typography.labelLarge,
            color = error,
        )
        Text(
            message,
            style = MaterialTheme.typography.bodySmall,
            color = LocalLipiColors.current.mutedForeground,
        )
    }
}

/** Max width of the fixed 5 column varga grids (`max-w-xl`) */
val VargaMaxWidth: Dp = 576.dp
