package com.shubhattin.lipilekhika.ui

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.automirrored.outlined.OpenInNew
import androidx.compose.material.icons.outlined.Code
import androidx.compose.material.icons.outlined.Info
import androidx.compose.material.icons.outlined.Menu
import androidx.compose.material.icons.outlined.Translate
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.DrawerValue
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalDrawerSheet
import androidx.compose.material3.ModalNavigationDrawer
import androidx.compose.material3.NavigationDrawerItem
import androidx.compose.material3.NavigationDrawerItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Text
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
import com.shubhattin.lipilekhika.R
import com.shubhattin.lipilekhika.state.AppStore
import com.shubhattin.lipilekhika.state.Screen
import com.shubhattin.lipilekhika.ui.screens.AboutScreen
import com.shubhattin.lipilekhika.ui.screens.GITHUB_URL
import com.shubhattin.lipilekhika.ui.screens.TransliterateScreen
import com.shubhattin.lipilekhika.ui.screens.WEB_APP_URL
import com.shubhattin.lipilekhika.ui.theme.LocalLipiColors
import kotlinx.coroutines.launch

/** The app shell: the top bar, the drawer (pages, links, theme) and the current page */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LipiApp(store: AppStore) {
    val drawer = rememberDrawerState(DrawerValue.Closed)
    val scope = rememberCoroutineScope()
    val uri = LocalUriHandler.current

    // the back gesture on About goes back to the main page
    BackHandler(enabled = store.screen != Screen.TRANSLITERATE && !drawer.isOpen) {
        store.screen = Screen.TRANSLITERATE
    }
    BackHandler(enabled = drawer.isOpen) { scope.launch { drawer.close() } }

    ModalNavigationDrawer(
        drawerState = drawer,
        drawerContent = {
            ModalDrawerSheet(drawerContainerColor = MaterialTheme.colorScheme.surface) {
                Row(
                    Modifier.padding(20.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    Image(
                        painterResource(R.drawable.app_icon),
                        null,
                        Modifier.size(44.dp).clip(CircleShape),
                    )
                    Column {
                        Text("Lipi Lekhika", style = MaterialTheme.typography.titleMedium)
                        Text(
                            "Script Transliteration and Typing",
                            style = MaterialTheme.typography.bodySmall,
                            color = LocalLipiColors.current.mutedForeground,
                        )
                    }
                }
                HorizontalDivider(color = LocalLipiColors.current.border)
                Spacer(Modifier.height(8.dp))
                fun go(screen: Screen) {
                    store.screen = screen
                    scope.launch { drawer.close() }
                }
                DrawerItem(
                    Icons.Outlined.Translate,
                    "Transliterate",
                    store.screen == Screen.TRANSLITERATE,
                ) {
                    go(Screen.TRANSLITERATE)
                }
                DrawerItem(Icons.Outlined.Info, "About", store.screen == Screen.ABOUT) {
                    go(Screen.ABOUT)
                }
                HorizontalDivider(
                    Modifier.padding(vertical = 8.dp),
                    color = LocalLipiColors.current.border,
                )
                DrawerItem(Icons.AutoMirrored.Outlined.OpenInNew, "Online App", false) {
                    uri.openUri(WEB_APP_URL)
                }
                DrawerItem(Icons.Outlined.Code, "GitHub", false) { uri.openUri(GITHUB_URL) }
                Spacer(Modifier.weight(1f))
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Theme", style = MaterialTheme.typography.labelLarge)
                    ThemeSwitch(store.theme, store::selectTheme)
                }
            }
        },
    ) {
        Scaffold(
            topBar = {
                CenterAlignedTopAppBar(
                    title = {
                        Text(
                            if (store.screen == Screen.ABOUT) "About" else "Lipi Lekhika",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.SemiBold,
                        )
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
                    colors =
                        TopAppBarDefaults.topAppBarColors(
                            containerColor = MaterialTheme.colorScheme.surface
                        ),
                )
            },
            containerColor = MaterialTheme.colorScheme.background,
        ) { padding ->
            Column(Modifier.padding(top = padding.calculateTopPadding())) {
                HorizontalDivider(color = LocalLipiColors.current.border)
                when (store.screen) {
                    Screen.TRANSLITERATE -> TransliterateScreen(store)
                    Screen.ABOUT -> AboutScreen()
                }
            }
        }
    }
}

@Composable
private fun DrawerItem(icon: ImageVector, label: String, selected: Boolean, onClick: () -> Unit) {
    NavigationDrawerItem(
        icon = { Icon(icon, null, Modifier.size(20.dp)) },
        label = { Text(label, style = MaterialTheme.typography.bodyLarge) },
        selected = selected,
        onClick = onClick,
        shape = MaterialTheme.shapes.medium,
        modifier = Modifier.padding(horizontal = 12.dp),
        colors =
            NavigationDrawerItemDefaults.colors(
                selectedContainerColor = LocalLipiColors.current.accent,
                selectedTextColor = LocalLipiColors.current.accentForeground,
                selectedIconColor = LocalLipiColors.current.accentForeground,
            ),
    )
}

/** Auto / Light / Dark */
@Composable
private fun ThemeSwitch(value: String, onSelect: (String) -> Unit) {
    val choices = listOf("system" to "Auto", "light" to "Light", "dark" to "Dark")
    SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth()) {
        choices.forEachIndexed { i, (key, label) ->
            SegmentedButton(
                selected = value == key,
                onClick = { onSelect(key) },
                shape =
                    SegmentedButtonDefaults.itemShape(i, choices.size, MaterialTheme.shapes.medium),
                icon = {},
            ) {
                Text(label, style = MaterialTheme.typography.labelLarge)
            }
        }
    }
}
