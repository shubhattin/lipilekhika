package com.shubhattin.lipilekhika.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.ColorScheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontVariation
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.shubhattin.lipilekhika.R

/*
 * The look of the web app: its colour tokens (`docs-and-web-client/src/styles/global.css`, the
 * shadcn names: background, card, primary, muted, accent, border, ...), Geist for the UI text and
 * small corner radii. Like CSS variables, the components read them from `MaterialTheme` and
 * `LipiColors` instead of hard-coding colours.
 */

/** The tokens of the web theme that Material 3 has no slot for */
@Immutable
data class LipiColors(
    /** The page behind the cards */
    val page: Color,
    /** The cards (a step lighter than the page in dark mode, white on a grey page in light) */
    val card: Color,
    val border: Color,
    val muted: Color,
    val mutedForeground: Color,
    val accent: Color,
    val accentForeground: Color,
    val success: Color,
)

private val Blue = Color(0xFF3B82F6)

private val LightScheme =
    lightColorScheme(
        primary = Blue,
        onPrimary = Color.White,
        primaryContainer = Color(0xFFE0F2FE),
        onPrimaryContainer = Color(0xFF1E3A8A),
        secondary = Color(0xFF4B5563),
        onSecondary = Color.White,
        secondaryContainer = Color(0xFFF3F4F6),
        onSecondaryContainer = Color(0xFF4B5563),
        background = Color(0xFFF4F5F7),
        onBackground = Color(0xFF1F2328),
        surface = Color.White,
        onSurface = Color(0xFF1F2328),
        surfaceVariant = Color(0xFFF3F4F6),
        onSurfaceVariant = Color(0xFF6B7280),
        surfaceContainerLowest = Color.White,
        surfaceContainerLow = Color(0xFFF9FAFB),
        surfaceContainer = Color(0xFFF9FAFB),
        surfaceContainerHigh = Color(0xFFF3F4F6),
        surfaceContainerHighest = Color(0xFFE5E7EB),
        outline = Color(0xFFD1D5DB),
        outlineVariant = Color(0xFFE5E7EB),
        error = Color(0xFFEF4444),
        onError = Color.White,
    )

private val DarkScheme =
    darkColorScheme(
        primary = Blue,
        onPrimary = Color.White,
        primaryContainer = Color(0xFF1E3A8A),
        onPrimaryContainer = Color(0xFFBFDBFE),
        secondary = Color(0xFFE5E5E5),
        onSecondary = Color(0xFF171717),
        secondaryContainer = Color(0xFF262626),
        onSecondaryContainer = Color(0xFFE5E5E5),
        background = Color(0xFF111111),
        onBackground = Color(0xFFE5E5E5),
        surface = Color(0xFF1C1C1C),
        onSurface = Color(0xFFE5E5E5),
        surfaceVariant = Color(0xFF262626),
        onSurfaceVariant = Color(0xFFA3A3A3),
        surfaceContainerLowest = Color(0xFF111111),
        surfaceContainerLow = Color(0xFF1C1C1C),
        surfaceContainer = Color(0xFF1F1F1F),
        surfaceContainerHigh = Color(0xFF262626),
        surfaceContainerHighest = Color(0xFF303030),
        outline = Color(0xFF525252),
        outlineVariant = Color(0xFF2C2C2C),
        error = Color(0xFFEF4444),
        onError = Color.White,
    )

private val LightExtra =
    LipiColors(
        page = Color(0xFFF4F5F7),
        card = Color.White,
        border = Color(0xFFE4E6EB),
        muted = Color(0xFFF3F4F6),
        mutedForeground = Color(0xFF6B7280),
        accent = Color(0xFFE0F2FE),
        accentForeground = Color(0xFF1E3A8A),
        success = Color(0xFF16A34A),
    )

private val DarkExtra =
    LipiColors(
        page = Color(0xFF111111),
        card = Color(0xFF1C1C1C),
        border = Color(0xFF2C2C2C),
        muted = Color(0xFF262626),
        mutedForeground = Color(0xFFA3A3A3),
        accent = Color(0xFF1E3A8A),
        accentForeground = Color(0xFFBFDBFE),
        success = Color(0xFF4ADE80),
    )

/** Like a CSS variable scope: `LocalLipiColors.current` inside the theme */
val LocalLipiColors = staticCompositionLocalOf { LightExtra }

/** Is the dark theme on (for the parts that differ beyond the colours) */
val LocalDarkTheme = staticCompositionLocalOf { false }

/** Geist, a variable font: one file, each weight set through its `wght` axis (Android 8+) */
private fun geist(weight: Int) =
    Font(
        R.font.geist,
        FontWeight(weight),
        variationSettings = FontVariation.Settings(FontVariation.weight(weight)),
    )

val Geist = FontFamily(geist(400), geist(500), geist(600), geist(700))

private fun style(size: Int, line: Int, weight: Int = 400, tracking: Double = 0.0) =
    TextStyle(
        fontFamily = Geist,
        fontSize = size.sp,
        lineHeight = line.sp,
        fontWeight = FontWeight(weight),
        letterSpacing = tracking.sp,
    )

/** A denser scale than Material's default, close to the web app's text sizes */
private val LipiTypography =
    Typography(
        displaySmall = style(30, 36, 600),
        headlineMedium = style(26, 32, 600),
        headlineSmall = style(22, 28, 600),
        titleLarge = style(19, 26, 600),
        titleMedium = style(16, 22, 600),
        titleSmall = style(14, 20, 600),
        bodyLarge = style(16, 24),
        bodyMedium = style(14, 20),
        bodySmall = style(12, 16),
        labelLarge = style(14, 20, 500),
        labelMedium = style(12, 16, 500),
        labelSmall = style(11, 14, 500, 0.2),
    )

/** Small radii, like the web (`--radius: 0.375rem`) */
private val LipiShapes =
    Shapes(
        extraSmall = RoundedCornerShape(4.dp),
        small = RoundedCornerShape(6.dp),
        medium = RoundedCornerShape(8.dp),
        large = RoundedCornerShape(10.dp),
        extraLarge = RoundedCornerShape(14.dp),
    )

/** "system", "light" or "dark" */
@Composable
fun isDark(theme: String): Boolean =
    when (theme) {
        "light" -> false
        "dark" -> true
        else -> isSystemInDarkTheme()
    }

@Composable
fun LipiTheme(dark: Boolean, content: @Composable () -> Unit) {
    val scheme: ColorScheme = if (dark) DarkScheme else LightScheme
    CompositionLocalProvider(
        LocalLipiColors provides if (dark) DarkExtra else LightExtra,
        LocalDarkTheme provides dark,
    ) {
        MaterialTheme(
            colorScheme = scheme,
            typography = LipiTypography,
            shapes = LipiShapes,
            content = content,
        )
    }
}
