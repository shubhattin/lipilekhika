package com.shubhattin.lipilekhika.ui.components

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.os.Build
import android.widget.Toast
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Check
import androidx.compose.material.icons.outlined.ContentCopy
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LocalContentColor
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.PlainTooltip
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TooltipAnchorPosition
import androidx.compose.material3.TooltipBox
import androidx.compose.material3.TooltipDefaults
import androidx.compose.material3.rememberTooltipState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.shubhattin.lipilekhika.data.Scripts
import com.shubhattin.lipilekhika.ui.theme.LocalLipiColors
import com.shubhattin.lipilekhika.ui.theme.scriptFont
import kotlinx.coroutines.delay

/*
 * Small building blocks used across the screens. Each `@Composable` function is a component, its
 * parameters are its props, and the `content` lambdas are like children / slots.
 */

/** An icon button with a tooltip on long press (the `title` of the web buttons) */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun IconAction(
    icon: ImageVector,
    label: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    tint: Color = LocalContentColor.current,
    size: Dp = 36.dp,
) {
    TooltipBox(
        positionProvider =
            TooltipDefaults.rememberTooltipPositionProvider(TooltipAnchorPosition.Above),
        tooltip = { PlainTooltip { Text(label) } },
        state = rememberTooltipState(),
    ) {
        IconButton(onClick = onClick, enabled = enabled, modifier = modifier.size(size)) {
            Icon(
                icon,
                contentDescription = label,
                modifier = Modifier.size(19.dp),
                tint = if (enabled) tint else tint.copy(alpha = 0.38f),
            )
        }
    }
}

/** Copies [text]; its icon turns into a check mark for a moment */
@Composable
fun CopyButton(label: String, text: () -> String, enabled: Boolean = true) {
    val context = LocalContext.current
    var copied by remember { mutableStateOf(false) }
    LaunchedEffect(copied) {
        if (copied) {
            delay(1500)
            copied = false
        }
    }
    IconAction(
        icon = if (copied) Icons.Outlined.Check else Icons.Outlined.ContentCopy,
        label = if (copied) "Copied" else label,
        enabled = enabled,
        tint = if (copied) LocalLipiColors.current.success else LocalContentColor.current,
        onClick = {
            copyText(context, text())
            copied = true
        },
    )
}

/** Puts [text] on the clipboard (Android 13+ shows its own confirmation) */
fun copyText(context: Context, text: String) {
    val clipboard = context.getSystemService(ClipboardManager::class.java)
    clipboard.setPrimaryClip(ClipData.newPlainText("Lipi Lekhika", text))
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
        Toast.makeText(context, "Copied", Toast.LENGTH_SHORT).show()
    }
}

/** A small rounded toggle / action chip (the web's "pill") */
@Composable
fun Pill(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    active: Boolean = false,
    activeColor: Color = MaterialTheme.colorScheme.primary,
    contentPadding: PaddingValues = PaddingValues(horizontal = 10.dp, vertical = 5.dp),
    content: @Composable () -> Unit,
) {
    val colors = LocalLipiColors.current
    Surface(
        onClick = onClick,
        modifier = modifier,
        shape = CircleShape,
        color = if (active) activeColor.copy(alpha = 0.12f) else Color.Transparent,
        contentColor = if (active) activeColor else colors.mutedForeground,
        border = BorderStroke(1.dp, if (active) activeColor.copy(alpha = 0.45f) else colors.border),
    ) {
        Row(
            modifier = Modifier.padding(contentPadding),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(5.dp),
        ) {
            content()
        }
    }
}

/** The small uppercase label of a section ("FROM", "TO") */
@Composable
fun SectionLabel(text: String, modifier: Modifier = Modifier) {
    Text(
        text.uppercase(),
        modifier = modifier,
        style = MaterialTheme.typography.labelSmall,
        color = LocalLipiColors.current.mutedForeground,
        letterSpacing = 0.8.sp,
    )
}

/** The circle with a script's first letter */
@Composable
fun ScriptAvatar(script: String, size: Dp = 30.dp, selected: Boolean = false) {
    val meta = Scripts.meta(script)
    val colors = LocalLipiColors.current
    Box(
        modifier =
            Modifier.size(size)
                .clip(CircleShape)
                .background(if (selected) colors.accent else colors.muted)
                .border(1.dp, colors.border, CircleShape),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            meta.avatar,
            fontFamily = scriptFont(script),
            fontSize =
                if (meta.avatar.length > 1 && meta.avatar.all { it.code < 128 }) 11.sp else 15.sp,
            fontWeight = FontWeight.Medium,
            color = if (selected) colors.accentForeground else MaterialTheme.colorScheme.onSurface,
            maxLines = 1,
        )
    }
}

/** A clickable row area without the ripple spreading outside rounded corners */
fun Modifier.roundedClickable(onClick: () -> Unit): Modifier =
    this.clip(androidx.compose.foundation.shape.RoundedCornerShape(8.dp))
        .clickable(onClick = onClick)
