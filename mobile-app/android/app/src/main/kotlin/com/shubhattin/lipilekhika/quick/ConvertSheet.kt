package com.shubhattin.lipilekhika.quick

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.slideInVertically
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.OpenInNew
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.ContentCopy
import androidx.compose.material.icons.outlined.SwapHoriz
import androidx.compose.material3.Button
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.shubhattin.lipilekhika.core.LipiException
import com.shubhattin.lipilekhika.core.getAllOptions
import com.shubhattin.lipilekhika.core.getNormalizedScriptName
import com.shubhattin.lipilekhika.core.transliterate
import com.shubhattin.lipilekhika.data.Prefs
import com.shubhattin.lipilekhika.data.Presets
import com.shubhattin.lipilekhika.data.ScriptCategory
import com.shubhattin.lipilekhika.data.ScriptDetect
import com.shubhattin.lipilekhika.data.Scripts
import com.shubhattin.lipilekhika.ui.components.IconAction
import com.shubhattin.lipilekhika.ui.components.ScriptPickerSheet
import com.shubhattin.lipilekhika.ui.components.ScriptSelectButton
import com.shubhattin.lipilekhika.ui.theme.LocalLipiColors
import com.shubhattin.lipilekhika.ui.theme.scriptFont
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/** The script to convert to, when [from] is the detected script of the text */
private fun defaultTo(from: String, prefs: Prefs): String {
    val saved = prefs.quickTo?.let { runCatching { getNormalizedScriptName(it) }.getOrNull() }
    if (saved != null && saved != from) return saved
    // Latin text goes to the app's typing script, text in a script to Romanized
    return if (Scripts.meta(from).category == ScriptCategory.LATIN) {
        prefs.fromScript?.takeIf { it != from && it != "Normal" } ?: "Devanagari"
    } else "Romanized"
}

/**
 * The sheet: the text, the two scripts (the source one guessed from the text), the converted text
 * and what to do with it. The app's preset applies.
 */
@Composable
fun ConvertSheet(
    text: String?,
    fromClipboard: Boolean,
    canReplace: Boolean,
    prefs: Prefs,
    onReplace: (String) -> Unit,
    onCopy: (String) -> Unit,
    onOpenInApp: (String) -> Unit,
    onDismiss: () -> Unit,
) {
    val colors = LocalLipiColors.current
    var from by remember { mutableStateOf<String?>(null) }
    var to by remember { mutableStateOf<String?>(null) }
    var output by remember { mutableStateOf("") }
    var picker by remember { mutableStateOf<String?>(null) } // "from" or "to"

    // once the text is there: guess its script (like an onMount)
    LaunchedEffect(text) {
        if (text != null && from == null) {
            val detected = ScriptDetect.detect(text)
            from = detected
            to = defaultTo(detected, prefs)
        }
    }
    LaunchedEffect(text, from, to) {
        val f = from ?: return@LaunchedEffect
        val t = to ?: return@LaunchedEffect
        val source = text.orEmpty()
        output =
            withContext(Dispatchers.Default) {
                try {
                    val options =
                        Presets.apply(
                            Presets.get(prefs.preset ?: "none"),
                            getAllOptions(f, t),
                            f,
                            t,
                        )
                    transliterate(source, f, t, options.ifEmpty { null })
                } catch (_: LipiException) {
                    ""
                }
            }
    }

    // the dimmed app behind; a tap on it closes the sheet
    Box(
        Modifier.fillMaxSize()
            .background(Color.Black.copy(alpha = 0.35f))
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null,
                onClick = onDismiss,
            ),
        contentAlignment = Alignment.BottomCenter,
    ) {
        AnimatedVisibility(visible = true, enter = slideInVertically { it }) {
            Surface(
                modifier =
                    Modifier.widthIn(max = 640.dp)
                        .fillMaxWidth()
                        // a tap inside does not close it
                        .clickable(
                            interactionSource = remember { MutableInteractionSource() },
                            indication = null,
                        ) {},
                shape = RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp),
                color = MaterialTheme.colorScheme.surface,
                border = BorderStroke(1.dp, colors.border),
            ) {
                Column(
                    Modifier.padding(16.dp).navigationBarsPadding(),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            if (fromClipboard) "Convert clipboard" else "Lipi Lekhika",
                            style = MaterialTheme.typography.titleMedium,
                            modifier = Modifier.weight(1f),
                        )
                        IconAction(Icons.Outlined.Close, "Close", onDismiss)
                    }
                    when {
                        text == null ->
                            Text("Reading the clipboard…", color = colors.mutedForeground)
                        text.isEmpty() ->
                            Text(
                                if (fromClipboard) "The clipboard has no text."
                                else "No text was selected.",
                                color = colors.mutedForeground,
                            )
                        else -> {
                            val f = from ?: return@Column
                            val t = to ?: return@Column
                            Text(
                                text,
                                fontFamily = scriptFont(f),
                                fontSize = 15.sp,
                                maxLines = 3,
                                overflow = TextOverflow.Ellipsis,
                                color = colors.mutedForeground,
                            )
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(6.dp),
                            ) {
                                ScriptSelectButton(f, { picker = "from" }, Modifier.weight(1f))
                                IconAction(
                                    Icons.Outlined.SwapHoriz,
                                    "Swap scripts",
                                    {
                                        from = t
                                        to = f
                                        prefs.quickTo = f
                                    },
                                )
                                ScriptSelectButton(t, { picker = "to" }, Modifier.weight(1f))
                            }
                            Surface(
                                shape = MaterialTheme.shapes.large,
                                color = colors.muted,
                                border = BorderStroke(1.dp, colors.border),
                                modifier = Modifier.fillMaxWidth(),
                            ) {
                                Box(
                                    Modifier.heightIn(min = 64.dp, max = 240.dp)
                                        .verticalScroll(rememberScrollState())
                                        .padding(12.dp)
                                ) {
                                    SelectionContainer {
                                        Text(
                                            output,
                                            fontFamily = scriptFont(t),
                                            fontSize = 18.sp,
                                            lineHeight = 28.sp,
                                        )
                                    }
                                }
                            }
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                            ) {
                                TextButton(onClick = { onOpenInApp(text) }) {
                                    Icon(
                                        Icons.AutoMirrored.Outlined.OpenInNew,
                                        null,
                                        Modifier.size(16.dp),
                                    )
                                    Spacer(Modifier.size(6.dp))
                                    Text("Open in app")
                                }
                                Spacer(Modifier.weight(1f))
                                if (canReplace) {
                                    OutlinedButton(
                                        onClick = { onCopy(output) },
                                        enabled = output.isNotEmpty(),
                                    ) {
                                        Icon(Icons.Outlined.ContentCopy, null, Modifier.size(16.dp))
                                        Spacer(Modifier.size(6.dp))
                                        Text("Copy")
                                    }
                                    Button(
                                        onClick = { onReplace(output) },
                                        enabled = output.isNotEmpty(),
                                    ) {
                                        Text("Replace")
                                    }
                                } else {
                                    Button(
                                        onClick = { onCopy(output) },
                                        enabled = output.isNotEmpty(),
                                    ) {
                                        Icon(Icons.Outlined.ContentCopy, null, Modifier.size(16.dp))
                                        Spacer(Modifier.size(6.dp))
                                        Text("Copy")
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    when (picker) {
        "from" ->
            ScriptPickerSheet(
                current = from.orEmpty(),
                withNormal = true,
                title = "Convert from",
                onSelect = {
                    from = it
                    picker = null
                },
                onDismiss = { picker = null },
            )
        "to" ->
            ScriptPickerSheet(
                current = to.orEmpty(),
                withNormal = true,
                title = "Convert to",
                onSelect = {
                    to = it
                    prefs.quickTo = it
                    picker = null
                },
                onDismiss = { picker = null },
            )
    }
}
