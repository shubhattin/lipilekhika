package com.shubhattin.lipilekhika.ui.typinghelp

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.toggleable
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.Info
import androidx.compose.material.icons.outlined.Keyboard
import androidx.compose.material.icons.outlined.Map
import androidx.compose.material.icons.outlined.SwapHoriz
import androidx.compose.material3.Checkbox
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.shubhattin.lipilekhika.ui.components.IconAction
import com.shubhattin.lipilekhika.ui.components.Pill
import com.shubhattin.lipilekhika.ui.components.ScriptPickerSheet
import com.shubhattin.lipilekhika.ui.components.ScriptSelectButton
import com.shubhattin.lipilekhika.ui.theme.LocalLipiColors
import com.shubhattin.lipilekhika.ui.theme.scriptFont
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/*
 * The typing help: every character of a script with the keys to type it, organized like the old
 * Lipi Lekhika charts and coloured by group. Same dialog as the web app's `TypingHelper.svelte`
 * (the data is built in `HelpLayout.kt`, the small parts are in `HelpParts.kt`).
 */

/** The two tabs (`Tabs.Root` of the web) */
private enum class HelpTab {
    TYPING,
    COMPARE,
}

/** Which script picker is open */
private enum class Picking {
    SCRIPT,
    COMPARE,
}

/** The layout being loaded, the loaded one or the error (the `{#await}` of the web) */
private sealed interface LayoutState {
    data object Loading : LayoutState

    data class Ready(val layout: HelpLayout) : LayoutState

    data class Failed(val message: String) : LayoutState
}

/** The typing guide of a script, as a full height bottom sheet */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TypingHelpSheet(script: String, onDismiss: () -> Unit) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val scope = rememberCoroutineScope()

    // the state of the dialog, like `$state` of the web (the script `Normal` has no typing)
    var current by rememberSaveable {
        mutableStateOf(if (script == "Normal") "Devanagari" else script)
    }
    var compare by rememberSaveable { mutableStateOf("Romanized") }
    var tab by rememberSaveable { mutableStateOf(HelpTab.TYPING) }
    var showAlternates by rememberSaveable { mutableStateOf(true) }
    var picking by remember { mutableStateOf<Picking?>(null) }
    var infoOpen by remember { mutableStateOf(false) }

    // the layout of the selected scripts: from the cache at once, else built off the main thread
    val compareWith = if (tab == HelpTab.COMPARE) compare else null
    var state by
        remember(current, compareWith) {
            mutableStateOf<LayoutState>(
                peekLayout(current, compareWith)?.let { LayoutState.Ready(it) }
                    ?: LayoutState.Loading
            )
        }
    LaunchedEffect(current, compareWith) {
        if (state is LayoutState.Loading) {
            state =
                withContext(Dispatchers.Default) {
                    try {
                        LayoutState.Ready(loadLayout(current, compareWith))
                    } catch (e: Exception) {
                        LayoutState.Failed(e.message ?: e.toString())
                    }
                }
        }
    }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        sheetMaxWidth = 900.dp,
        shape = RoundedCornerShape(topStart = 14.dp, topEnd = 14.dp),
        containerColor = MaterialTheme.colorScheme.surface,
    ) {
        BoxWithConstraints(Modifier.weight(1f).fillMaxWidth().navigationBarsPadding()) {
            // `sm:` of the web
            val wide = maxWidth >= 640.dp
            Column(Modifier.fillMaxSize()) {
                HelpHeader(
                    onClose = {
                        scope.launch { sheetState.hide() }.invokeOnCompletion { onDismiss() }
                    }
                )
                HelpControls(
                    wide = wide,
                    script = current,
                    compare = compare,
                    tab = tab,
                    showAlternates = showAlternates,
                    onTab = { tab = it },
                    onShowAlternates = { showAlternates = it },
                    onPick = { picking = it },
                    onInfo = { infoOpen = true },
                )
                HorizontalDivider(color = LocalLipiColors.current.border)
                when (val s = state) {
                    LayoutState.Loading ->
                        Box(Modifier.weight(1f).fillMaxWidth().clipToBounds()) {
                            HelpSkeleton(Modifier.padding(16.dp))
                        }
                    is LayoutState.Failed ->
                        Box(Modifier.weight(1f).fillMaxWidth().padding(16.dp)) {
                            HelpError(s.message)
                        }
                    is LayoutState.Ready ->
                        key(s.layout) {
                            HelpContent(
                                layout = s.layout,
                                showAlternates = showAlternates,
                                wide = wide,
                                modifier = Modifier.weight(1f),
                            )
                        }
                }
            }
        }
    }

    when (picking) {
        Picking.SCRIPT ->
            ScriptPickerSheet(
                current = current,
                withNormal = false,
                title = "Typing help for",
                onSelect = {
                    current = it
                    picking = null
                },
                onDismiss = { picking = null },
            )
        Picking.COMPARE ->
            ScriptPickerSheet(
                current = compare,
                withNormal = true,
                title = "Compare with",
                onSelect = {
                    compare = it
                    picking = null
                },
                onDismiss = { picking = null },
            )
        null -> {}
    }
    if (infoOpen) AlternatesInfoDialog(script = current, onDismiss = { infoOpen = false })
}

// ---- header and controls ----

/** The title bar: the icon, "Typing help" and a close button */
@Composable
private fun HelpHeader(onClose: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().padding(start = 16.dp, end = 6.dp, bottom = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Icon(
            Icons.Outlined.Keyboard,
            null,
            Modifier.size(22.dp),
            tint = MaterialTheme.colorScheme.primary,
        )
        Text("Typing help", Modifier.weight(1f), style = MaterialTheme.typography.titleMedium)
        IconAction(Icons.Outlined.Close, "Close", onClose)
    }
}

/**
 * The row under the title: the script, the tabs and "Show alternate keys" (or the compared script).
 * On a narrow screen the tabs take a full row, as on the web.
 */
@Composable
private fun HelpControls(
    wide: Boolean,
    script: String,
    compare: String,
    tab: HelpTab,
    showAlternates: Boolean,
    onTab: (HelpTab) -> Unit,
    onShowAlternates: (Boolean) -> Unit,
    onPick: (Picking) -> Unit,
    onInfo: () -> Unit,
) {
    val muted = LocalLipiColors.current.mutedForeground
    val modifier =
        Modifier.fillMaxWidth().padding(start = 16.dp, end = 12.dp, top = 4.dp, bottom = 12.dp)
    if (wide) {
        Row(
            modifier,
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            ScriptSelectButton(
                script,
                onClick = { onPick(Picking.SCRIPT) },
                modifier = Modifier.width(220.dp),
            )
            ModeTabs(tab, onTab, Modifier.width(280.dp))
            if (tab == HelpTab.COMPARE) {
                Text("with", style = MaterialTheme.typography.bodyMedium, color = muted)
                ScriptSelectButton(
                    compare,
                    onClick = { onPick(Picking.COMPARE) },
                    modifier = Modifier.width(220.dp),
                )
            } else {
                Spacer(Modifier.weight(1f))
                AlternatesToggle(showAlternates, onShowAlternates, narrow = false, onInfo = onInfo)
            }
        }
    } else {
        Column(modifier, verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                ScriptSelectButton(
                    script,
                    onClick = { onPick(Picking.SCRIPT) },
                    modifier = Modifier.weight(1f),
                )
                if (tab == HelpTab.TYPING) {
                    AlternatesToggle(
                        showAlternates,
                        onShowAlternates,
                        narrow = true,
                        onInfo = onInfo,
                    )
                }
            }
            ModeTabs(tab, onTab, Modifier.fillMaxWidth())
            if (tab == HelpTab.COMPARE) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Text("with", style = MaterialTheme.typography.bodyMedium, color = muted)
                    ScriptSelectButton(
                        compare,
                        onClick = { onPick(Picking.COMPARE) },
                        modifier = Modifier.weight(1f),
                    )
                }
            }
        }
    }
}

/** The two tabs "Typing map" and "Compare" (`Tabs.List`) */
@Composable
private fun ModeTabs(tab: HelpTab, onTab: (HelpTab) -> Unit, modifier: Modifier = Modifier) {
    val colors = LocalLipiColors.current
    Row(
        modifier
            .height(38.dp)
            .clip(MaterialTheme.shapes.medium)
            .background(colors.muted)
            .border(1.dp, colors.border, MaterialTheme.shapes.medium)
            .padding(3.dp),
        horizontalArrangement = Arrangement.spacedBy(2.dp),
    ) {
        ModeTab(
            "Typing map",
            Icons.Outlined.Map,
            tab == HelpTab.TYPING,
            { onTab(HelpTab.TYPING) },
            Modifier.weight(1f),
        )
        ModeTab(
            "Compare",
            Icons.Outlined.SwapHoriz,
            tab == HelpTab.COMPARE,
            { onTab(HelpTab.COMPARE) },
            Modifier.weight(1f),
        )
    }
}

@Composable
private fun ModeTab(
    label: String,
    icon: ImageVector,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier,
) {
    val colors = LocalLipiColors.current
    Surface(
        onClick = onClick,
        modifier = modifier.height(32.dp),
        shape = MaterialTheme.shapes.small,
        color = if (selected) MaterialTheme.colorScheme.surface else Color.Transparent,
        contentColor =
            if (selected) MaterialTheme.colorScheme.onSurface else colors.mutedForeground,
        border = if (selected) BorderStroke(1.dp, colors.border) else null,
    ) {
        Row(
            Modifier.padding(horizontal = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp, Alignment.CenterHorizontally),
        ) {
            Icon(icon, null, Modifier.size(15.dp))
            Text(label, style = MaterialTheme.typography.labelLarge, maxLines = 1)
        }
    }
}

/** The "Show alternate keys" checkbox ("Alternates" when narrow) and its info button */
@Composable
private fun AlternatesToggle(
    checked: Boolean,
    onChange: (Boolean) -> Unit,
    narrow: Boolean,
    onInfo: () -> Unit,
) {
    val muted = LocalLipiColors.current.mutedForeground
    Row(verticalAlignment = Alignment.CenterVertically) {
        Row(
            Modifier.clip(MaterialTheme.shapes.small)
                .toggleable(value = checked, role = Role.Checkbox, onValueChange = onChange)
                .padding(start = 4.dp, end = 6.dp, top = 8.dp, bottom = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            // the row handles the click, so the box needs no 48dp touch target of its own
            Checkbox(checked = checked, onCheckedChange = null)
            Text(
                if (narrow) "Alternates" else "Show alternate keys",
                style = MaterialTheme.typography.bodyMedium,
                color = muted,
                maxLines = 1,
            )
        }
        IconAction(Icons.Outlined.Info, "About alternate keys", onInfo, tint = muted, size = 32.dp)
    }
}

// ---- the content: section pills and the cards ----

/** One row of the list of the cards: the sheet is a single lazy list, not nested grids */
private sealed interface HelpItem {
    val key: String

    data class SectionHead(val section: Section, val first: Boolean) : HelpItem {
        override val key = "s-${section.id}"
    }

    data class GroupHead(val section: Section, val group: Group, val tone: Tone) : HelpItem {
        override val key = "g-${section.id}-${group.id}"
    }

    /** one row of a group's grid (`fixed`: the 5 column vargas) */
    data class Cards(
        override val key: String,
        val cells: List<Cell?>,
        val columns: Int,
        val tone: Tone,
        val fixed: Boolean,
        val lastInGroup: Boolean,
    ) : HelpItem

    data object Controls : HelpItem {
        override val key = "controls"
    }
}

private class HelpRows(val items: List<HelpItem>, val sectionIndex: Map<SectionId, Int>)

/**
 * Flattens the layout into list rows for the available width: the grids are cut in rows of as many
 * cards as fit (`grid-cols-[repeat(auto-fill,minmax(4.75rem,1fr))]` of the web).
 */
private fun buildRows(layout: HelpLayout, width: Dp): HelpRows {
    val gap = 6f
    val items = ArrayList<HelpItem>()
    val sectionIndex = HashMap<SectionId, Int>()
    layout.sections.forEachIndexed { sIdx, section ->
        sectionIndex[section.id] = items.size
        items += HelpItem.SectionHead(section, first = sIdx == 0)
        for (group in section.groups) {
            val tone = toneOf(section.id, group.id)
            // the group title is left out when it is the section's own
            if (group.title != section.title) items += HelpItem.GroupHead(section, group, tone)
            val fixed = group.columns != null
            val columns =
                group.columns
                    // the svara cards also hold the mAtrA sign, so they are wider
                    ?: (((width.value + gap) / ((if (group.id == "svara") 104f else 76f) + gap))
                            .toInt())
                        .coerceAtLeast(2)
            val chunks = group.cells.chunked(columns)
            chunks.forEachIndexed { i, cells ->
                items +=
                    HelpItem.Cards(
                        "r-${section.id}-${group.id}-$i",
                        cells,
                        columns,
                        tone,
                        fixed,
                        i == chunks.lastIndex,
                    )
            }
        }
    }
    if (layout.controls?.isNotEmpty == true) items += HelpItem.Controls
    return HelpRows(items, sectionIndex)
}

/** The jump pills (the sticky `nav` of the web) over the list of sections */
@Composable
private fun HelpContent(
    layout: HelpLayout,
    showAlternates: Boolean,
    wide: Boolean,
    modifier: Modifier = Modifier,
) {
    val colors = LocalLipiColors.current
    val scope = rememberCoroutineScope()
    val listState = rememberLazyListState()
    val comparing = layout.compare != null
    val font = scriptFont(layout.script)
    val otherFont = scriptFont(layout.compare ?: layout.script)

    BoxWithConstraints(modifier.fillMaxWidth()) {
        // the rows depend on the width, the pills jump to the first row of a section
        val rows = remember(layout, maxWidth) { buildRows(layout, maxWidth - 32.dp) }
        Column(Modifier.fillMaxSize()) {
            // always in view (sticky), the section pills scroll the list (`jumpTo`)
            Row(
                Modifier.fillMaxWidth()
                    .horizontalScroll(rememberScrollState())
                    .padding(horizontal = 12.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                for (section in layout.sections) {
                    SectionPill(section) {
                        val index = rows.sectionIndex[section.id]
                        if (index != null) scope.launch { listState.animateScrollToItem(index) }
                    }
                }
            }
            HorizontalDivider(color = colors.border)

            LazyColumn(
                state = listState,
                modifier = Modifier.weight(1f).fillMaxWidth(),
                contentPadding =
                    PaddingValues(start = 16.dp, end = 16.dp, top = 12.dp, bottom = 32.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                items(rows.items, key = { it.key }) { item ->
                    when (item) {
                        is HelpItem.SectionHead ->
                            SectionTitle(
                                item.section,
                                Modifier.padding(
                                    top = if (item.first) 0.dp else 22.dp,
                                    bottom = 6.dp,
                                ),
                            )
                        is HelpItem.GroupHead -> GroupTitle(item.group, item.tone)
                        is HelpItem.Cards ->
                            CardRow(
                                cells = item.cells,
                                columns = item.columns,
                                tone = item.tone,
                                comparing = comparing,
                                showAlternates = showAlternates,
                                font = font,
                                otherFont = otherFont,
                                modifier =
                                    (if (item.fixed) Modifier.widthIn(max = VargaMaxWidth)
                                        else Modifier)
                                        .fillMaxWidth()
                                        .padding(bottom = if (item.lastInGroup) 10.dp else 0.dp),
                            )
                        HelpItem.Controls ->
                            layout.controls?.let {
                                TypingControlsBox(
                                    it,
                                    font = font,
                                    twoColumns = wide,
                                    modifier = Modifier.padding(top = 16.dp),
                                )
                            }
                    }
                }
            }
        }
    }
}

/** A jump pill: a dot in the section colour and its name */
@Composable
private fun SectionPill(section: Section, onClick: () -> Unit) {
    Pill(onClick = onClick, contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)) {
        Box(Modifier.size(8.dp).clip(CircleShape).background(accentOf(section.id)))
        Text(
            section.title,
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurface,
        )
    }
}
