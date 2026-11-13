package com.shubhattin.lipilekhika.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.ExpandMore
import androidx.compose.material.icons.outlined.Info
import androidx.compose.material.icons.outlined.Tune
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.unit.dp
import com.shubhattin.lipilekhika.data.Options
import com.shubhattin.lipilekhika.data.Presets
import com.shubhattin.lipilekhika.ui.theme.LocalLipiColors

/** A title and a text in a dialog (the info popovers of the web app) */
@Composable
fun InfoDialog(title: String, text: String, onDismiss: () -> Unit) {
    AlertDialog(
        onDismissRequest = onDismiss,
        confirmButton = { TextButton(onClick = onDismiss) { Text("OK") } },
        title = { Text(title, style = MaterialTheme.typography.titleMedium) },
        text = { Text(text, style = MaterialTheme.typography.bodyMedium) },
        shape = MaterialTheme.shapes.large,
    )
}

/** The preset: always visible (as on the web), with its description in a dialog */
@Composable
fun PresetSelector(presetKey: String, onSelect: (String) -> Unit, modifier: Modifier = Modifier) {
    val colors = LocalLipiColors.current
    val preset = Presets.get(presetKey)
    var open by remember { mutableStateOf(false) }
    var info by remember { mutableStateOf(false) }
    Row(
        modifier,
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Text("Preset", style = MaterialTheme.typography.labelLarge)
        Box {
            Surface(
                onClick = { open = true },
                shape = MaterialTheme.shapes.medium,
                border = BorderStroke(1.dp, colors.border),
                color = MaterialTheme.colorScheme.surface,
            ) {
                Row(
                    Modifier.padding(start = 10.dp, end = 6.dp, top = 6.dp, bottom = 6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(preset.label, style = MaterialTheme.typography.bodyMedium)
                    Icon(
                        Icons.Outlined.ExpandMore,
                        null,
                        Modifier.size(18.dp),
                        tint = colors.mutedForeground,
                    )
                }
            }
            DropdownMenu(expanded = open, onDismissRequest = { open = false }) {
                for (p in Presets.ALL) {
                    DropdownMenuItem(
                        text = { Text(p.label) },
                        onClick = {
                            open = false
                            onSelect(p.key)
                        },
                    )
                }
            }
        }
        if (preset.key != "none" && preset.description != null) {
            IconAction(
                Icons.Outlined.Info,
                "About this preset",
                { info = true },
                tint = colors.mutedForeground,
            )
        }
    }
    if (info) InfoDialog(preset.label, preset.description.orEmpty()) { info = false }
}

/**
 * The transliteration options of the pair of scripts: a card that opens (closed at first), one
 * switch per option with its description in a dialog.
 */
@Composable
fun OptionsPanel(
    options: Map<String, Boolean>,
    onToggle: (String, Boolean) -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = LocalLipiColors.current
    var expanded by rememberSaveable { mutableStateOf(false) }
    var infoKey by remember { mutableStateOf<String?>(null) }
    val rotation by animateFloatAsState(if (expanded) 180f else 0f, label = "chevron")
    val on = options.count { it.value }
    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = MaterialTheme.shapes.large,
        border = BorderStroke(1.dp, colors.border),
        color = MaterialTheme.colorScheme.surface,
    ) {
        Column {
            Row(
                Modifier.fillMaxWidth()
                    .clickable { expanded = !expanded }
                    .padding(horizontal = 14.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                Icon(Icons.Outlined.Tune, null, Modifier.size(18.dp), tint = colors.mutedForeground)
                Text(
                    "Transliteration Options",
                    style = MaterialTheme.typography.titleSmall,
                    modifier = Modifier.weight(1f),
                )
                if (on > 0) {
                    Text(
                        "$on on",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.primary,
                    )
                }
                Icon(
                    Icons.Outlined.ExpandMore,
                    if (expanded) "Close" else "Open",
                    Modifier.rotate(rotation),
                    tint = colors.mutedForeground,
                )
            }
            AnimatedVisibility(expanded) {
                Column {
                    HorizontalDivider(color = colors.border)
                    if (options.isEmpty()) {
                        Text(
                            "No options available for this combination.",
                            modifier = Modifier.padding(14.dp),
                            style = MaterialTheme.typography.bodySmall,
                            color = colors.mutedForeground,
                        )
                    }
                    for ((key, value) in options) {
                        val info = Options.info(key)
                        Row(
                            Modifier.fillMaxWidth()
                                .clickable { onToggle(key, !value) }
                                .padding(start = 14.dp, end = 8.dp, top = 4.dp, bottom = 4.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(
                                info.name,
                                style = MaterialTheme.typography.bodyMedium,
                                modifier = Modifier.weight(1f),
                            )
                            IconAction(
                                Icons.Outlined.Info,
                                "About this option",
                                { infoKey = key },
                                tint = colors.mutedForeground,
                            )
                            Switch(
                                checked = value,
                                onCheckedChange = { onToggle(key, it) },
                                colors =
                                    SwitchDefaults.colors(uncheckedBorderColor = colors.border),
                            )
                        }
                    }
                }
            }
        }
    }
    infoKey?.let { key ->
        val info = Options.info(key)
        InfoDialog(info.name, info.description) { infoKey = null }
    }
}
