package com.shubhattin.lipilekhika.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Check
import androidx.compose.material.icons.outlined.ExpandMore
import androidx.compose.material.icons.outlined.Info
import androidx.compose.material.icons.outlined.Tune
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.draw.scale
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
        shape = RoundedCornerShape(18.dp),
        containerColor = LocalLipiColors.current.card,
    )
}

/**
 * The preset and the transliteration options in one card: the preset is always visible (as on the
 * web), the options of the pair of scripts open below it (closed at first).
 */
@Composable
fun OptionsPanel(
    presetKey: String,
    onPreset: (String) -> Unit,
    options: Map<String, Boolean>,
    onToggle: (String, Boolean) -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = LocalLipiColors.current
    var expanded by rememberSaveable { mutableStateOf(false) }
    var infoKey by remember { mutableStateOf<String?>(null) }
    val rotation by animateFloatAsState(if (expanded) 180f else 0f, label = "chevron")
    val on = options.count { it.value }

    LipiCard(modifier) {
        Column {
            PresetRow(presetKey, onPreset)
            HorizontalDivider(color = colors.border)
            Row(
                Modifier.fillMaxWidth()
                    .clickable { expanded = !expanded }
                    .padding(horizontal = 16.dp, vertical = 14.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Icon(Icons.Outlined.Tune, null, Modifier.size(18.dp), tint = colors.mutedForeground)
                Text(
                    "Transliteration options",
                    style = MaterialTheme.typography.titleSmall,
                    modifier = Modifier.weight(1f),
                )
                if (on > 0) {
                    Text(
                        "$on on",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.primary,
                        modifier =
                            Modifier.clip(CircleShape)
                                .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.12f))
                                .padding(horizontal = 8.dp, vertical = 2.dp),
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
                Column(Modifier.padding(bottom = 6.dp)) {
                    if (options.isEmpty()) {
                        Text(
                            "No options for this pair of scripts.",
                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                            style = MaterialTheme.typography.bodySmall,
                            color = colors.mutedForeground,
                        )
                    }
                    for ((key, value) in options) {
                        val info = Options.info(key)
                        Row(
                            Modifier.fillMaxWidth()
                                .clickable { onToggle(key, !value) }
                                .padding(start = 16.dp, end = 8.dp, top = 2.dp, bottom = 2.dp),
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
                                size = 32.dp,
                            )
                            Switch(
                                checked = value,
                                onCheckedChange = { onToggle(key, it) },
                                modifier = Modifier.scale(0.8f),
                                colors =
                                    SwitchDefaults.colors(
                                        uncheckedThumbColor = colors.mutedForeground,
                                        uncheckedTrackColor = colors.muted,
                                        uncheckedBorderColor =
                                            colors.mutedForeground.copy(alpha = 0.5f),
                                    ),
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

/** The preset: its name in a small dropdown, with its description in a dialog */
@Composable
private fun PresetRow(presetKey: String, onSelect: (String) -> Unit) {
    val colors = LocalLipiColors.current
    val preset = Presets.get(presetKey)
    var open by remember { mutableStateOf(false) }
    var info by remember { mutableStateOf(false) }
    Row(
        Modifier.fillMaxWidth().padding(start = 16.dp, end = 8.dp, top = 8.dp, bottom = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Text("Preset", style = MaterialTheme.typography.titleSmall, modifier = Modifier.weight(1f))
        if (preset.key != "none" && preset.description != null) {
            IconAction(
                Icons.Outlined.Info,
                "About this preset",
                { info = true },
                tint = colors.mutedForeground,
                size = 32.dp,
            )
        }
        Box {
            Row(
                Modifier.clip(RoundedCornerShape(10.dp))
                    .border(1.dp, colors.border, RoundedCornerShape(10.dp))
                    .clickable { open = true }
                    .padding(start = 12.dp, end = 8.dp, top = 7.dp, bottom = 7.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                Text(preset.label, style = MaterialTheme.typography.bodyMedium)
                Icon(
                    Icons.Outlined.ExpandMore,
                    null,
                    Modifier.size(18.dp),
                    tint = colors.mutedForeground,
                )
            }
            DropdownMenu(expanded = open, onDismissRequest = { open = false }) {
                for (p in Presets.ALL) {
                    DropdownMenuItem(
                        text = { Text(p.label) },
                        trailingIcon = {
                            if (p.key == preset.key) {
                                Icon(
                                    Icons.Outlined.Check,
                                    null,
                                    tint = MaterialTheme.colorScheme.primary,
                                )
                            }
                        },
                        onClick = {
                            open = false
                            onSelect(p.key)
                        },
                    )
                }
            }
        }
    }
    if (info) InfoDialog(preset.label, preset.description.orEmpty()) { info = false }
}
