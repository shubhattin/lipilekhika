package com.shubhattin.lipilekhika.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Check
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.ExpandMore
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material.icons.outlined.SwapHoriz
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.shubhattin.lipilekhika.data.ScriptCategory
import com.shubhattin.lipilekhika.data.ScriptMeta
import com.shubhattin.lipilekhika.data.Scripts
import com.shubhattin.lipilekhika.ui.theme.LocalLipiColors
import kotlinx.coroutines.launch

/** The button that shows the selected script and opens the picker */
@Composable
fun ScriptSelectButton(
    script: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    prefix: String? = null,
) {
    val colors = LocalLipiColors.current
    val meta = Scripts.meta(script)
    Surface(
        onClick = onClick,
        modifier = modifier,
        shape = MaterialTheme.shapes.medium,
        color = MaterialTheme.colorScheme.surface,
        border = BorderStroke(1.dp, colors.border),
    ) {
        Row(
            modifier = Modifier.padding(start = 6.dp, end = 8.dp, top = 5.dp, bottom = 5.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            ScriptAvatar(script, size = 28.dp)
            if (prefix != null) {
                Text(
                    prefix,
                    style = MaterialTheme.typography.bodySmall,
                    color = colors.mutedForeground,
                )
            }
            Text(
                script,
                style = MaterialTheme.typography.titleSmall,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.weight(1f),
            )
            if (meta.custom) CustomBadge()
            Icon(
                Icons.Outlined.ExpandMore,
                contentDescription = null,
                modifier = Modifier.size(18.dp),
                tint = colors.mutedForeground,
            )
        }
    }
}

/** Lipi Lekhika's own schemes (Normal, Romanized) */
@Composable
private fun CustomBadge() {
    val colors = LocalLipiColors.current
    Text(
        "custom",
        modifier =
            Modifier.clip(CircleShape)
                .background(colors.muted)
                .padding(horizontal = 6.dp, vertical = 1.dp),
        style = MaterialTheme.typography.labelSmall,
        fontSize = 10.sp,
        color = colors.mutedForeground,
    )
}

/** A row of the list: either a section header or a script */
private sealed interface PickerRow {
    data class Header(val category: ScriptCategory, val count: Int) : PickerRow

    data class Item(val meta: ScriptMeta) : PickerRow
}

/**
 * The script picker: a search box ("hi", "tamil", "kṛṣṇa", "latin" all work, as on the web), tabs
 * that jump to a section, and the list grouped in sections. The current script is scrolled into
 * view when it opens.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ScriptPickerSheet(
    current: String,
    withNormal: Boolean,
    onSelect: (String) -> Unit,
    onDismiss: () -> Unit,
    title: String = "Choose a script",
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val scope = rememberCoroutineScope()
    var query by rememberSaveable { mutableStateOf("") }
    val all = remember(withNormal) { Scripts.list(withNormal) }
    val found = remember(query, all) { Scripts.filter(all, query) }
    val rows =
        remember(found) {
            ScriptCategory.entries.flatMap { cat ->
                val items = found.filter { it.category == cat }
                if (items.isEmpty()) emptyList()
                else listOf(PickerRow.Header(cat, items.size)) + items.map { PickerRow.Item(it) }
            }
        }
    val listState = rememberLazyListState()
    // the section of the first row in view (the tab shown as active)
    val activeCategory by
        remember(rows) {
            derivedStateOf {
                rows.take(listState.firstVisibleItemIndex + 1).lastOrNull()?.let {
                    when (it) {
                        is PickerRow.Header -> it.category
                        is PickerRow.Item -> it.meta.category
                    }
                }
            }
        }
    LaunchedEffect(Unit) {
        val index = rows.indexOfFirst { it is PickerRow.Item && it.meta.name == current }
        if (index > 2) listState.scrollToItem(index - 2)
    }

    fun select(name: String) {
        scope.launch { sheetState.hide() }.invokeOnCompletion { onSelect(name) }
    }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        shape = RoundedCornerShape(topStart = 14.dp, topEnd = 14.dp),
        containerColor = MaterialTheme.colorScheme.surface,
    ) {
        Column(Modifier.fillMaxWidth().fillMaxHeight(0.85f).navigationBarsPadding()) {
            Text(
                title,
                style = MaterialTheme.typography.titleMedium,
                modifier = Modifier.padding(horizontal = 16.dp),
            )
            OutlinedTextField(
                value = query,
                onValueChange = { query = it },
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
                placeholder = { Text("Search script or language…") },
                leadingIcon = { Icon(Icons.Outlined.Search, null, Modifier.size(18.dp)) },
                trailingIcon = {
                    if (query.isNotEmpty()) {
                        IconButton(onClick = { query = "" }) {
                            Icon(Icons.Outlined.Close, "Clear search", Modifier.size(18.dp))
                        }
                    }
                },
                singleLine = true,
                shape = MaterialTheme.shapes.medium,
                textStyle = MaterialTheme.typography.bodyMedium,
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                colors =
                    OutlinedTextFieldDefaults.colors(
                        unfocusedBorderColor = LocalLipiColors.current.border
                    ),
            )
            // the section tabs
            Row(
                modifier = Modifier.padding(horizontal = 12.dp),
                horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                for (cat in ScriptCategory.entries) {
                    val count = found.count { it.category == cat }
                    Pill(
                        onClick = {
                            val index = rows.indexOfFirst {
                                it is PickerRow.Header && it.category == cat
                            }
                            if (index >= 0) scope.launch { listState.animateScrollToItem(index) }
                        },
                        active = activeCategory == cat && count > 0,
                        modifier = Modifier.height(30.dp),
                    ) {
                        Text("${cat.short} $count", style = MaterialTheme.typography.labelMedium)
                    }
                }
            }
            Spacer(Modifier.height(6.dp))
            if (rows.isEmpty()) {
                Text(
                    "No script found",
                    modifier = Modifier.padding(24.dp).align(Alignment.CenterHorizontally),
                    color = LocalLipiColors.current.mutedForeground,
                )
            }
            LazyColumn(
                state = listState,
                contentPadding = PaddingValues(start = 8.dp, end = 8.dp, bottom = 16.dp),
                modifier = Modifier.fillMaxWidth(),
            ) {
                items(
                    rows,
                    key = {
                        when (it) {
                            is PickerRow.Header -> "h-${it.category}"
                            is PickerRow.Item -> it.meta.name
                        }
                    },
                ) { row ->
                    when (row) {
                        is PickerRow.Header ->
                            Text(
                                row.category.title,
                                modifier =
                                    Modifier.padding(start = 10.dp, top = 12.dp, bottom = 4.dp),
                                style = MaterialTheme.typography.labelMedium,
                                color = LocalLipiColors.current.mutedForeground,
                            )
                        is PickerRow.Item ->
                            ScriptRow(row.meta, row.meta.name == current) { select(row.meta.name) }
                    }
                }
            }
        }
    }
}

@Composable
private fun ScriptRow(meta: ScriptMeta, selected: Boolean, onClick: () -> Unit) {
    val colors = LocalLipiColors.current
    Row(
        modifier =
            Modifier.fillMaxWidth()
                .roundedClickable(onClick)
                .background(
                    if (selected) MaterialTheme.colorScheme.primary.copy(alpha = 0.10f)
                    else MaterialTheme.colorScheme.surface
                )
                .padding(horizontal = 10.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        ScriptAvatar(meta.name, size = 34.dp, selected = selected)
        Column(Modifier.weight(1f)) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                Text(
                    meta.name,
                    style = MaterialTheme.typography.bodyLarge,
                    fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal,
                )
                if (meta.custom) CustomBadge()
            }
            if (meta.hint != null) {
                Text(
                    meta.hint,
                    style = MaterialTheme.typography.bodySmall,
                    color = colors.mutedForeground,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        }
        if (selected) {
            Icon(Icons.Outlined.Check, "Selected", tint = MaterialTheme.colorScheme.primary)
        } else {
            Spacer(Modifier.width(24.dp))
        }
    }
}

/**
 * The two scripts in one bar, like a translate app: `[from] ⇄ [to]`. Each side opens its picker,
 * the button in the middle swaps them (and the texts).
 */
@Composable
fun ScriptBar(
    from: String,
    to: String,
    onFrom: () -> Unit,
    onTo: () -> Unit,
    onSwap: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = LocalLipiColors.current
    LipiCard(modifier) {
        Row(
            Modifier.padding(6.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            ScriptSide("From", from, onFrom, Modifier.weight(1f))
            Box(
                Modifier.size(38.dp)
                    .clip(CircleShape)
                    .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.12f))
                    .clickable(onClick = onSwap),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    Icons.Outlined.SwapHoriz,
                    "Swap scripts and text",
                    Modifier.size(20.dp),
                    tint = MaterialTheme.colorScheme.primary,
                )
            }
            ScriptSide("To", to, onTo, Modifier.weight(1f))
        }
    }
}

/** One side of the [ScriptBar]: the avatar, a small label and the script name */
@Composable
private fun ScriptSide(label: String, script: String, onClick: () -> Unit, modifier: Modifier) {
    val colors = LocalLipiColors.current
    Row(
        modifier
            .clip(RoundedCornerShape(12.dp))
            .clickable(onClick = onClick)
            .padding(horizontal = 8.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        ScriptAvatar(script, size = 32.dp)
        Column(Modifier.weight(1f)) {
            Text(label, style = MaterialTheme.typography.labelSmall, color = colors.mutedForeground)
            Text(
                // a zero width space after the hyphen: the line can break there (and not
                // inside a word, "Tamil-Exte nded")
                script.replace("-", "-\u200B"),
                style = MaterialTheme.typography.titleSmall,
                // a long name (Tamil-Extended, Purna-Devanagari) goes on two lines at its hyphen
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
        }
        Icon(Icons.Outlined.ExpandMore, null, Modifier.size(16.dp), tint = colors.mutedForeground)
    }
}
