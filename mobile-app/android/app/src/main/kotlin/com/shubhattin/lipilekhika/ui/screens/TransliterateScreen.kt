package com.shubhattin.lipilekhika.ui.screens

import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
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
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.text.input.TextFieldLineLimits
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.MenuBook
import androidx.compose.material.icons.automirrored.outlined.Redo
import androidx.compose.material.icons.automirrored.outlined.Undo
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.FileOpen
import androidx.compose.material.icons.outlined.Keyboard
import androidx.compose.material.icons.outlined.KeyboardHide
import androidx.compose.material.icons.outlined.MoreVert
import androidx.compose.material.icons.outlined.Save
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material.icons.outlined.SwapVert
import androidx.compose.material.icons.outlined.Sync
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedIconButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
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
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.shubhattin.lipilekhika.data.TextFiles
import com.shubhattin.lipilekhika.state.AppStore
import com.shubhattin.lipilekhika.state.SourceNote
import com.shubhattin.lipilekhika.ui.components.CopyButton
import com.shubhattin.lipilekhika.ui.components.IconAction
import com.shubhattin.lipilekhika.ui.components.OptionsPanel
import com.shubhattin.lipilekhika.ui.components.Pill
import com.shubhattin.lipilekhika.ui.components.PresetSelector
import com.shubhattin.lipilekhika.ui.components.ScriptPickerSheet
import com.shubhattin.lipilekhika.ui.components.ScriptSelectButton
import com.shubhattin.lipilekhika.ui.components.SectionLabel
import com.shubhattin.lipilekhika.ui.components.TypingOptionChips
import com.shubhattin.lipilekhika.ui.components.TypingOptionsSheet
import com.shubhattin.lipilekhika.ui.theme.LocalLipiColors
import com.shubhattin.lipilekhika.ui.theme.scriptFont
import com.shubhattin.lipilekhika.ui.typinghelp.TypingHelpSheet

/** The sheets this screen can show (one at a time) */
private enum class Sheet {
    FROM,
    TO,
    TYPING_OPTIONS,
    TYPING_HELP,
}

/**
 * The transliteration page: the source box (with realtime typing), the output and the options, the
 * same parts as the web app's /app. Two columns side by side on a wide screen.
 */
@Composable
fun TransliterateScreen(store: AppStore) {
    var sheet by rememberSaveable { mutableStateOf<Sheet?>(null) }
    val context = LocalContext.current
    val resolver = context.contentResolver

    // the system file pickers (like <input type="file"> and a download)
    val openFile =
        rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
            if (uri != null) store.openFile(resolver, uri)
        }
    var textToSave by remember { mutableStateOf("") }
    val saveFile =
        rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument("text/plain")) {
            uri ->
            if (uri != null) {
                store.saveFile(resolver, uri, textToSave) { ok ->
                    Toast.makeText(
                            context,
                            if (ok) "Saved" else "Couldn't save the file",
                            Toast.LENGTH_SHORT,
                        )
                        .show()
                }
            }
        }
    val actions =
        TextActions(
            open = { openFile.launch(arrayOf("text/plain")) },
            saveSource = {
                textToSave = store.source.text.toString()
                saveFile.launch(TextFiles.fileName("source", store.fromScript))
            },
            saveOutput = {
                textToSave = store.output
                saveFile.launch(TextFiles.fileName("output", store.toScript))
            },
        )

    BoxWithConstraints(Modifier.fillMaxSize()) {
        val wide = maxWidth >= 720.dp
        // like the web's clamp(200px, 50dvh - 90px, 480px)
        val boxHeight = (maxHeight.value * 0.5f - 60).coerceIn(190f, 460f).dp

        Column(
            Modifier.fillMaxSize()
                .verticalScroll(rememberScrollState())
                .imePadding()
                .padding(horizontal = 12.dp, vertical = 10.dp)
                .navigationBarsPadding(),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            if (wide) {
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    SourcePanel(store, boxHeight, actions, { sheet = it }, Modifier.weight(1f))
                    OutputPanel(
                        store,
                        boxHeight,
                        actions,
                        { sheet = it },
                        Modifier.weight(1f),
                        showSwap = true,
                    )
                }
            } else {
                SourcePanel(store, boxHeight, actions, { sheet = it })
                OutputPanel(store, boxHeight, actions, { sheet = it }, showSwap = true)
            }
            Column(
                Modifier.widthIn(max = 720.dp).fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                PresetSelector(store.presetKey, store::selectPreset)
                OptionsPanel(store.options, store::setOption)
            }
            Spacer(Modifier.height(8.dp))
        }
    }

    when (sheet) {
        Sheet.FROM ->
            ScriptPickerSheet(
                current = store.fromScript,
                withNormal = false,
                title = "Type in (from)",
                onSelect = {
                    store.selectFrom(it)
                    sheet = null
                },
                onDismiss = { sheet = null },
            )
        Sheet.TO ->
            ScriptPickerSheet(
                current = store.toScript,
                withNormal = true,
                title = "Convert to",
                onSelect = {
                    store.selectTo(it)
                    sheet = null
                },
                onDismiss = { sheet = null },
            )
        Sheet.TYPING_OPTIONS ->
            TypingOptionsSheet(
                script = store.fromScript,
                useNativeNumerals = store.useNativeNumerals,
                includeInherentVowel = store.includeInherentVowel,
                onNativeNumerals = store::setNativeNumerals,
                onInherentVowel = store::setInherentVowel,
                onDismiss = { sheet = null },
            )
        Sheet.TYPING_HELP ->
            TypingHelpSheet(script = store.fromScript, onDismiss = { sheet = null })
        null -> {}
    }
}

/** What the file buttons do (the launchers live in the screen) */
private class TextActions(
    val open: () -> Unit,
    val saveSource: () -> Unit,
    val saveOutput: () -> Unit,
)

/** A bordered box, the web's card */
@Composable
private fun Panel(modifier: Modifier = Modifier, content: @Composable () -> Unit) {
    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = MaterialTheme.shapes.large,
        color = MaterialTheme.colorScheme.surface,
        border = BorderStroke(1.dp, LocalLipiColors.current.border),
        content = content,
    )
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun SourcePanel(
    store: AppStore,
    boxHeight: Dp,
    actions: TextActions,
    openSheet: (Sheet) -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = LocalLipiColors.current
    val from = store.fromScript
    val typing = store.typingEnabled && from != "Normal"
    val text = store.source.text
    val canUndo = store.source.undoState.canUndo
    val canRedo = store.source.undoState.canRedo
    val replaced =
        store.replaced?.takeIf { it.after.length == text.length && it.after == text.toString() }
    var menu by remember { mutableStateOf(false) }

    Column(modifier, verticalArrangement = Arrangement.spacedBy(6.dp)) {
        SectionLabel("From")
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            ScriptSelectButton(from, { openSheet(Sheet.FROM) }, Modifier.weight(1f))
            if (from != "Normal") {
                HelpPill(seen = store.typingGuideSeen) {
                    store.markTypingGuideSeen()
                    openSheet(Sheet.TYPING_HELP)
                }
            }
        }
        Panel {
            Column {
                // toolbar
                Row(
                    Modifier.fillMaxWidth().padding(start = 12.dp, end = 4.dp, top = 2.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        "Source",
                        style = MaterialTheme.typography.labelLarge,
                        color = colors.mutedForeground,
                    )
                    CopyButton(
                        "Copy source text",
                        { store.source.text.toString() },
                        enabled = text.isNotEmpty(),
                    )
                    Box {
                        IconAction(Icons.Outlined.MoreVert, "More", { menu = true })
                        DropdownMenu(expanded = menu, onDismissRequest = { menu = false }) {
                            DropdownMenuItem(
                                text = { Text("Open .txt file…") },
                                leadingIcon = { Icon(Icons.Outlined.FileOpen, null) },
                                onClick = {
                                    menu = false
                                    actions.open()
                                },
                            )
                            DropdownMenuItem(
                                text = { Text("Save as .txt") },
                                leadingIcon = { Icon(Icons.Outlined.Save, null) },
                                enabled = text.isNotEmpty(),
                                onClick = {
                                    menu = false
                                    actions.saveSource()
                                },
                            )
                        }
                    }
                    Spacer(Modifier.weight(1f))
                    Pill(onClick = store::toggleTyping, active = store.typingEnabled) {
                        Icon(
                            if (store.typingEnabled) Icons.Outlined.Keyboard
                            else Icons.Outlined.KeyboardHide,
                            contentDescription = null,
                            modifier = Modifier.size(15.dp),
                        )
                        Text("Typing", style = MaterialTheme.typography.labelMedium)
                    }
                    IconAction(
                        Icons.Outlined.Settings,
                        "Typing options",
                        { openSheet(Sheet.TYPING_OPTIONS) },
                    )
                }
                HorizontalDivider(color = colors.border)
                // the text box
                Box(Modifier.fillMaxWidth().height(boxHeight)) {
                    val font = scriptFont(from)
                    BasicTextField(
                        state = store.source,
                        modifier =
                            Modifier.fillMaxSize()
                                .padding(horizontal = 12.dp, vertical = 10.dp)
                                .onFocusChanged { if (!it.isFocused) store.clearTypingContext() },
                        inputTransformation = if (typing) store.typingTransformation else null,
                        textStyle =
                            TextStyle(
                                fontFamily = font,
                                fontSize = 18.sp,
                                lineHeight = 28.sp,
                                color = MaterialTheme.colorScheme.onSurface,
                            ),
                        cursorBrush = SolidColor(MaterialTheme.colorScheme.primary),
                        // while typing in a script, a password-type keyboard: no suggestions or
                        // autocorrect, and each key comes on its own (the typing needs that)
                        keyboardOptions =
                            KeyboardOptions(
                                keyboardType =
                                    if (typing) KeyboardType.Password else KeyboardType.Text,
                                autoCorrectEnabled = false,
                                capitalization = KeyboardCapitalization.None,
                            ),
                        lineLimits = TextFieldLineLimits.MultiLine(),
                        decorator = { field ->
                            if (text.isEmpty()) {
                                Text(
                                    if (typing) "Type with English letters to write in $from…"
                                    else "Enter text to transliterate…",
                                    style = MaterialTheme.typography.bodyLarge,
                                    color = colors.mutedForeground,
                                )
                            }
                            field()
                        },
                    )
                }
                // the strip at the bottom of the box
                Row(
                    Modifier.fillMaxWidth().padding(start = 8.dp, end = 4.dp, bottom = 4.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(2.dp),
                ) {
                    if (typing) {
                        TypingOptionChips(
                            script = from,
                            useNativeNumerals = store.useNativeNumerals,
                            includeInherentVowel = store.includeInherentVowel,
                            onNativeNumerals = store::setNativeNumerals,
                            onInherentVowel = store::setInherentVowel,
                        )
                    }
                    Spacer(Modifier.weight(1f))
                    IconAction(
                        Icons.AutoMirrored.Outlined.Undo,
                        "Undo",
                        store::undo,
                        enabled = canUndo,
                    )
                    IconAction(
                        Icons.AutoMirrored.Outlined.Redo,
                        "Redo",
                        store::redo,
                        enabled = canRedo,
                    )
                    when {
                        replaced != null ->
                            TextButton(
                                onClick = store::undoReplace,
                                contentPadding = PaddingValues(horizontal = 10.dp),
                            ) {
                                Text(if (replaced.by == "clear") "Undo clear" else "Undo open")
                            }
                        text.isEmpty() ->
                            TextButton(
                                onClick = actions.open,
                                contentPadding = PaddingValues(horizontal = 10.dp),
                            ) {
                                Icon(Icons.Outlined.FileOpen, null, Modifier.size(16.dp))
                                Spacer(Modifier.width(4.dp))
                                Text("Open .txt")
                            }
                        else ->
                            IconAction(
                                Icons.Outlined.Close,
                                "Clear source text (and the kept copy)",
                                store::clear,
                            )
                    }
                }
            }
        }
        SourceNoteText(store.note)
    }
}

@Composable
private fun SourceNoteText(note: SourceNote?) {
    val colors = LocalLipiColors.current
    val (message, error) =
        when (note) {
            SourceNote.Restored ->
                "Restored from your last visit. Clear removes it from this device." to false
            SourceNote.TooLong ->
                "This text is too long to keep on this device, so it won't be here next time. Save it as .txt to keep it." to
                    false
            is SourceNote.FileError -> note.message to true
            null -> return
        }
    Text(
        message,
        style = MaterialTheme.typography.bodySmall,
        color = if (error) MaterialTheme.colorScheme.error else colors.mutedForeground,
        modifier = Modifier.padding(horizontal = 4.dp),
    )
}

@Composable
private fun OutputPanel(
    store: AppStore,
    boxHeight: Dp,
    actions: TextActions,
    openSheet: (Sheet) -> Unit,
    modifier: Modifier = Modifier,
    showSwap: Boolean,
) {
    val colors = LocalLipiColors.current
    val output = store.output
    Column(modifier, verticalArrangement = Arrangement.spacedBy(6.dp)) {
        SectionLabel("To")
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            ScriptSelectButton(store.toScript, { openSheet(Sheet.TO) }, Modifier.weight(1f))
            if (showSwap) {
                OutlinedIconButton(
                    onClick = store::swap,
                    modifier = Modifier.size(40.dp),
                    border = BorderStroke(1.dp, colors.border),
                ) {
                    Icon(Icons.Outlined.SwapVert, "Swap scripts and text", Modifier.size(20.dp))
                }
            }
        }
        Panel {
            Column {
                Row(
                    Modifier.fillMaxWidth().padding(start = 12.dp, end = 8.dp, top = 2.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        "Output",
                        style = MaterialTheme.typography.labelLarge,
                        color = colors.mutedForeground,
                    )
                    CopyButton("Copy output text", { store.output }, enabled = output.isNotEmpty())
                    IconAction(
                        Icons.Outlined.Save,
                        "Save as .txt",
                        actions.saveOutput,
                        enabled = output.isNotEmpty(),
                    )
                    Spacer(Modifier.weight(1f))
                    if (!store.autoConvert) {
                        FilledTonalButton(
                            onClick = store::convertNow,
                            contentPadding = PaddingValues(horizontal = 12.dp),
                            modifier = Modifier.height(32.dp),
                        ) {
                            Icon(Icons.Outlined.Sync, null, Modifier.size(16.dp))
                            Spacer(Modifier.width(4.dp))
                            Text("Convert", style = MaterialTheme.typography.labelMedium)
                        }
                        Spacer(Modifier.width(6.dp))
                    }
                    Text(
                        "Auto",
                        style = MaterialTheme.typography.labelMedium,
                        color = colors.mutedForeground,
                    )
                    Spacer(Modifier.width(4.dp))
                    Switch(
                        checked = store.autoConvert,
                        onCheckedChange = { store.toggleAutoConvert() },
                        modifier = Modifier.offset(y = 0.dp),
                    )
                }
                HorizontalDivider(color = colors.border)
                Box(
                    Modifier.fillMaxWidth()
                        .height(boxHeight)
                        .background(colors.muted.copy(alpha = 0.5f))
                        .verticalScroll(rememberScrollState())
                        .padding(horizontal = 12.dp, vertical = 10.dp)
                ) {
                    if (output.isEmpty()) {
                        Text(
                            "The output shows here",
                            style = MaterialTheme.typography.bodyLarge,
                            color = colors.mutedForeground,
                        )
                    } else {
                        SelectionContainer {
                            Text(
                                output,
                                fontFamily = scriptFont(store.toScript),
                                fontSize = 18.sp,
                                lineHeight = 28.sp,
                            )
                        }
                    }
                }
            }
        }
    }
}

/** "Help": the typing guide, with a pulsing dot until it was opened once */
@Composable
private fun HelpPill(seen: Boolean, onClick: () -> Unit) {
    val sky = androidx.compose.ui.graphics.Color(0xFF0EA5E9)
    Box {
        Pill(onClick = onClick, active = true, activeColor = sky) {
            Icon(Icons.AutoMirrored.Outlined.MenuBook, null, Modifier.size(15.dp))
            Text("Help", style = MaterialTheme.typography.labelMedium)
        }
        if (!seen) {
            val pulse = rememberInfiniteTransition(label = "pulse")
            val alpha by
                pulse.animateFloat(
                    0.35f,
                    1f,
                    infiniteRepeatable(tween(900), RepeatMode.Reverse),
                    label = "dot",
                )
            Box(
                Modifier.align(Alignment.TopEnd)
                    .offset(x = 2.dp, y = (-2).dp)
                    .size(8.dp)
                    .alpha(alpha)
                    .background(sky, CircleShape)
            )
        }
    }
}
