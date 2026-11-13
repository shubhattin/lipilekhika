package com.shubhattin.lipilekhika.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.shubhattin.lipilekhika.state.TypingExamples
import com.shubhattin.lipilekhika.ui.theme.LocalLipiColors
import com.shubhattin.lipilekhika.ui.theme.scriptFont

/** The two typing options, with what they type in [script] (`1 → १`, `k → क instead of क्`) */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TypingOptionsSheet(
    script: String,
    useNativeNumerals: Boolean,
    includeInherentVowel: Boolean,
    onNativeNumerals: (Boolean) -> Unit,
    onInherentVowel: (Boolean) -> Unit,
    onDismiss: () -> Unit,
) {
    val examples = remember(script) { TypingExamples.of(script) }
    val font = scriptFont(script)
    val muted = LocalLipiColors.current.mutedForeground
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        shape = RoundedCornerShape(topStart = 14.dp, topEnd = 14.dp),
        containerColor = MaterialTheme.colorScheme.surface,
    ) {
        Column(
            Modifier.padding(horizontal = 18.dp).padding(bottom = 18.dp).navigationBarsPadding()
        ) {
            Text("Typing Options", style = MaterialTheme.typography.titleMedium)
            OptionSwitch(
                title = "Use Native Numerals",
                subtitle = "Convert numbers to script numerals",
                example =
                    examples.numerals?.let {
                        buildAnnotatedString {
                            append("(1 → ")
                            withStyle(SpanStyle(fontFamily = font)) { append(it.on) }
                            append(")")
                        }
                    },
                checked = useNativeNumerals,
                onChange = onNativeNumerals,
            )
            OptionSwitch(
                title = "Include Inherent Vowel",
                subtitle = "Add inherent vowel (schwa) to consonants",
                example =
                    examples.vowel?.let {
                        buildAnnotatedString {
                            append("(k → ")
                            withStyle(SpanStyle(fontFamily = font)) { append(it.on) }
                            append(" instead of ")
                            withStyle(SpanStyle(fontFamily = font)) { append(it.off) }
                            append(")")
                        }
                    },
                checked = includeInherentVowel,
                onChange = onInherentVowel,
            )
            if (examples.vowel != null || examples.numerals != null) {
                Text(
                    "Quick toggles for both sit at the bottom of the text box.",
                    style = MaterialTheme.typography.bodySmall,
                    color = muted,
                    modifier = Modifier.padding(top = 6.dp),
                )
            }
        }
    }
}

@Composable
private fun OptionSwitch(
    title: String,
    subtitle: String,
    example: androidx.compose.ui.text.AnnotatedString?,
    checked: Boolean,
    onChange: (Boolean) -> Unit,
) {
    val muted = LocalLipiColors.current.mutedForeground
    Row(
        Modifier.fillMaxWidth().padding(vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(Modifier.weight(1f)) {
            Text(title, style = MaterialTheme.typography.bodyLarge)
            Text(subtitle, style = MaterialTheme.typography.bodySmall, color = muted)
            if (example != null)
                Text(example, style = MaterialTheme.typography.bodySmall, color = muted)
        }
        Switch(checked = checked, onCheckedChange = onChange)
    }
}

/**
 * The quick toggles at the bottom of the text box: `k → क` (inherent vowel) and `1 → १` (native
 * numerals), each showing what the key types now. Only the ones that change something in the
 * script.
 */
@Composable
fun TypingOptionChips(
    script: String,
    useNativeNumerals: Boolean,
    includeInherentVowel: Boolean,
    onNativeNumerals: (Boolean) -> Unit,
    onInherentVowel: (Boolean) -> Unit,
    modifier: Modifier = Modifier,
) {
    val examples = remember(script) { TypingExamples.of(script) }
    val font = scriptFont(script)
    Row(modifier, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        examples.vowel?.let {
            Pill(
                onClick = { onInherentVowel(!includeInherentVowel) },
                active = includeInherentVowel,
            ) {
                Text(
                    buildAnnotatedString {
                        append("k → ")
                        withStyle(SpanStyle(fontFamily = font)) {
                            append(if (includeInherentVowel) it.on else it.off)
                        }
                    },
                    fontSize = 13.sp,
                )
            }
        }
        examples.numerals?.let {
            Pill(onClick = { onNativeNumerals(!useNativeNumerals) }, active = useNativeNumerals) {
                Text(
                    buildAnnotatedString {
                        append("1 → ")
                        if (useNativeNumerals)
                            withStyle(SpanStyle(fontFamily = font)) { append(it.on) }
                        else append(it.off)
                    },
                    fontSize = 13.sp,
                )
            }
        }
    }
}
