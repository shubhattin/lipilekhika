package com.shubhattin.lipilekhika.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.OpenInNew
import androidx.compose.material.icons.outlined.Code
import androidx.compose.material.icons.outlined.Language
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.shubhattin.lipilekhika.BuildConfig
import com.shubhattin.lipilekhika.R
import com.shubhattin.lipilekhika.ui.theme.LocalLipiColors
import java.util.Calendar

const val WEBSITE_URL = "https://lipilekhika.in"
const val WEB_APP_URL = "https://lipilekhika.in/app"
const val GITHUB_URL = "https://github.com/shubhattin/lipilekhika"

@Composable
fun AboutScreen() {
    val colors = LocalLipiColors.current
    Column(
        Modifier.fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp)
            .navigationBarsPadding(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Image(
            painterResource(R.drawable.app_icon),
            contentDescription = null,
            modifier = Modifier.padding(top = 12.dp).size(72.dp).clip(CircleShape),
        )
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text("Lipi Lekhika", style = MaterialTheme.typography.headlineSmall)
            Text(
                "Script Transliteration and Typing Tool",
                style = MaterialTheme.typography.bodyMedium,
                color = colors.mutedForeground,
            )
            Text(
                "Version ${BuildConfig.VERSION_NAME}",
                style = MaterialTheme.typography.labelMedium,
                color = colors.mutedForeground,
                modifier = Modifier.padding(top = 4.dp),
            )
        }
        Card(Modifier.widthIn(max = 560.dp)) {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("About", style = MaterialTheme.typography.titleSmall)
                Text(
                    "Lipi Lekhika is a transliteration tool that converts text between the Indian Brahmic scripts, the romanizations (IAST, ITRANS, Harvard-Kyoto, SLP1) and Lipi Lekhika's own schemes.",
                    style = MaterialTheme.typography.bodyMedium,
                )
                Text(
                    "Type Indian languages with full speed and accuracy, with English keys.",
                    style = MaterialTheme.typography.bodyMedium,
                )
            }
        }
        Card(Modifier.widthIn(max = 560.dp)) {
            Column {
                Text(
                    "Links",
                    style = MaterialTheme.typography.titleSmall,
                    modifier = Modifier.padding(start = 16.dp, top = 14.dp, bottom = 4.dp),
                )
                LinkRow(Icons.Outlined.Language, "Website", "lipilekhika.in", WEBSITE_URL)
                HorizontalDivider(color = colors.border)
                LinkRow(Icons.Outlined.Code, "GitHub", "shubhattin/lipilekhika", GITHUB_URL)
            }
        }
        Text(
            "© ${Calendar.getInstance().get(Calendar.YEAR)} Shubham Anand Gupta",
            style = MaterialTheme.typography.bodySmall,
            color = colors.mutedForeground,
            textAlign = TextAlign.Center,
        )
    }
}

@Composable
private fun Card(modifier: Modifier = Modifier, content: @Composable () -> Unit) {
    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = MaterialTheme.shapes.large,
        border = BorderStroke(1.dp, LocalLipiColors.current.border),
        color = MaterialTheme.colorScheme.surface,
        content = content,
    )
}

@Composable
private fun LinkRow(icon: ImageVector, title: String, subtitle: String, url: String) {
    val uri = LocalUriHandler.current
    Row(
        Modifier.fillMaxWidth()
            .clickable { uri.openUri(url) }
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Icon(icon, null, tint = MaterialTheme.colorScheme.primary)
        Column(Modifier.weight(1f)) {
            Text(title, style = MaterialTheme.typography.bodyLarge)
            Text(
                subtitle,
                style = MaterialTheme.typography.bodySmall,
                color = LocalLipiColors.current.mutedForeground,
            )
        }
        Icon(
            Icons.AutoMirrored.Outlined.OpenInNew,
            null,
            Modifier.size(18.dp),
            tint = LocalLipiColors.current.mutedForeground,
        )
    }
}
