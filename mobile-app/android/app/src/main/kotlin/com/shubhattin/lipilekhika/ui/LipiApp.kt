package com.shubhattin.lipilekhika.ui

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.automirrored.outlined.OpenInNew
import androidx.compose.material.icons.outlined.BrightnessAuto
import androidx.compose.material.icons.outlined.Code
import androidx.compose.material.icons.outlined.DarkMode
import androidx.compose.material.icons.outlined.Info
import androidx.compose.material.icons.outlined.LightMode
import androidx.compose.material.icons.outlined.Menu
import androidx.compose.material.icons.outlined.Translate
import androidx.compose.material3.DrawerValue
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalDrawerSheet
import androidx.compose.material3.ModalNavigationDrawer
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.rememberDrawerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.shubhattin.lipilekhika.BuildConfig
import com.shubhattin.lipilekhika.R
import com.shubhattin.lipilekhika.state.AppStore
import com.shubhattin.lipilekhika.state.Screen
import com.shubhattin.lipilekhika.ui.screens.AboutScreen
import com.shubhattin.lipilekhika.ui.screens.GITHUB_URL
import com.shubhattin.lipilekhika.ui.screens.TransliterateScreen
import com.shubhattin.lipilekhika.ui.screens.WEB_APP_URL
import com.shubhattin.lipilekhika.ui.theme.LocalLipiColors
import kotlinx.coroutines.launch

/** The app shell: the top bar, the drawer (pages, links, appearance) and the current page */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LipiApp(store: AppStore) {
    val drawer = rememberDrawerState(DrawerValue.Closed)
    val scope = rememberCoroutineScope()
    val uri = LocalUriHandler.current
    val colors = LocalLipiColors.current

    // the back gesture on About goes back to the main page
    BackHandler(enabled = store.screen != Screen.TRANSLITERATE && !drawer.isOpen) {
        store.screen = Screen.TRANSLITERATE
    }
    BackHandler(enabled = drawer.isOpen) { scope.launch { drawer.close() } }

    ModalNavigationDrawer(
        drawerState = drawer,
        drawerContent = {
            ModalDrawerSheet(
                drawerContainerColor = colors.card,
                drawerShape = RoundedCornerShape(topEnd = 20.dp, bottomEnd = 20.dp),
            ) {
                Column(Modifier.verticalScroll(rememberScrollState()).navigationBarsPadding()) {
                    DrawerContent(
                        store = store,
                        go = { screen ->
                            store.screen = screen
                            scope.launch { drawer.close() }
                        },
                        open = uri::openUri,
                    )
                }
            }
        },
    ) {
        Scaffold(
            topBar = {
                TopAppBar(
                    title = {
                        if (store.screen == Screen.ABOUT) {
                            Text(
                                "About",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.SemiBold,
                            )
                        } else {
                            // the logo and the name, like the web app's header
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(10.dp),
                            ) {
                                Image(
                                    painterResource(R.drawable.app_icon),
                                    null,
                                    Modifier.size(30.dp).clip(CircleShape),
                                )
                                Text(
                                    "Lipi Lekhika",
                                    style = MaterialTheme.typography.titleLarge,
                                    fontWeight = FontWeight.SemiBold,
                                )
                            }
                        }
                    },
                    navigationIcon = {
                        if (store.screen == Screen.ABOUT) {
                            IconButton(onClick = { store.screen = Screen.TRANSLITERATE }) {
                                Icon(Icons.AutoMirrored.Outlined.ArrowBack, "Back")
                            }
                        } else {
                            IconButton(onClick = { scope.launch { drawer.open() } }) {
                                Icon(Icons.Outlined.Menu, "Menu")
                            }
                        }
                    },
                    // the bar is part of the page, not a band of its own
                    colors = TopAppBarDefaults.topAppBarColors(containerColor = colors.page),
                )
            },
            containerColor = colors.page,
        ) { padding ->
            Column(Modifier.padding(top = padding.calculateTopPadding())) {
                when (store.screen) {
                    Screen.TRANSLITERATE -> TransliterateScreen(store)
                    Screen.ABOUT -> AboutScreen()
                }
            }
        }
    }
}

@Composable
private fun DrawerContent(store: AppStore, go: (Screen) -> Unit, open: (String) -> Unit) {
    val colors = LocalLipiColors.current
    Row(
        Modifier.padding(start = 20.dp, end = 20.dp, top = 24.dp, bottom = 18.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Image(
            painterResource(R.drawable.app_icon),
            null,
            Modifier.size(46.dp).clip(CircleShape),
        )
        Column {
            Text("Lipi Lekhika", style = MaterialTheme.typography.titleMedium)
            Text(
                "Script transliteration and typing",
                style = MaterialTheme.typography.bodySmall,
                color = colors.mutedForeground,
            )
        }
    }
    DrawerItem(Icons.Outlined.Translate, "Transliterate", store.screen == Screen.TRANSLITERATE) {
        go(Screen.TRANSLITERATE)
    }
    DrawerItem(Icons.Outlined.Info, "About", store.screen == Screen.ABOUT) { go(Screen.ABOUT) }

    DrawerHeading("Links")
    DrawerItem(Icons.AutoMirrored.Outlined.OpenInNew, "Online app", false) { open(WEB_APP_URL) }
    DrawerItem(Icons.Outlined.Code, "GitHub", false) { open(GITHUB_URL) }

    DrawerHeading("Appearance")
    ThemeTiles(store.theme, store::selectTheme)

    Spacer(Modifier.height(20.dp))
    HorizontalDivider(Modifier.padding(horizontal = 20.dp), color = colors.border)
    Text(
        "Version ${BuildConfig.VERSION_NAME}",
        style = MaterialTheme.typography.bodySmall,
        color = colors.mutedForeground,
        modifier = Modifier.padding(horizontal = 20.dp, vertical = 14.dp),
    )
}

@Composable
private fun DrawerHeading(text: String) {
    Text(
        text,
        style = MaterialTheme.typography.labelMedium,
        color = LocalLipiColors.current.mutedForeground,
        modifier = Modifier.padding(start = 24.dp, top = 20.dp, bottom = 6.dp),
    )
}

/** A row of the drawer; the current page is tinted (not a heavy filled block) */
@Composable
private fun DrawerItem(icon: ImageVector, label: String, selected: Boolean, onClick: () -> Unit) {
    val primary = MaterialTheme.colorScheme.primary
    val fg = if (selected) primary else MaterialTheme.colorScheme.onSurface
    Row(
        Modifier.fillMaxWidth()
            .padding(horizontal = 12.dp, vertical = 1.dp)
            .clip(RoundedCornerShape(12.dp))
            .background(
                if (selected) primary.copy(alpha = 0.12f)
                else androidx.compose.ui.graphics.Color.Transparent
            )
            .clickable(onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Icon(
            icon,
            null,
            Modifier.size(20.dp),
            tint = if (selected) primary else LocalLipiColors.current.mutedForeground,
        )
        Text(
            label,
            style = MaterialTheme.typography.bodyLarge,
            color = fg,
            fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal,
        )
    }
}

/** Auto / Light / Dark as three tiles with an icon each */
@Composable
private fun ThemeTiles(value: String, onSelect: (String) -> Unit) {
    val choices =
        listOf(
            Triple("system", "Auto", Icons.Outlined.BrightnessAuto),
            Triple("light", "Light", Icons.Outlined.LightMode),
            Triple("dark", "Dark", Icons.Outlined.DarkMode),
        )
    val colors = LocalLipiColors.current
    val primary = MaterialTheme.colorScheme.primary
    Row(
        Modifier.fillMaxWidth().padding(horizontal = 16.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        for ((key, label, icon) in choices) {
            val selected = value == key
            val shape = RoundedCornerShape(14.dp)
            Column(
                Modifier.weight(1f)
                    .clip(shape)
                    .background(
                        if (selected) primary.copy(alpha = 0.12f)
                        else colors.muted.copy(alpha = 0.5f)
                    )
                    .border(
                        if (selected) 1.5.dp else 1.dp,
                        if (selected) primary else colors.border,
                        shape,
                    )
                    .clickable { onSelect(key) }
                    .padding(vertical = 12.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                Icon(
                    icon,
                    null,
                    Modifier.size(22.dp),
                    tint = if (selected) primary else colors.mutedForeground,
                )
                Text(
                    label,
                    style = MaterialTheme.typography.labelMedium,
                    color = if (selected) primary else MaterialTheme.colorScheme.onSurface,
                )
            }
        }
    }
}
