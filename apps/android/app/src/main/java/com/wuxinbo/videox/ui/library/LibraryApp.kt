package com.wuxinbo.videox.ui.library

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.saveable.rememberSaveableStateHolder
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.blur
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.wuxinbo.videox.LibraryViewModel
import com.wuxinbo.videox.R
import com.wuxinbo.videox.ui.account.LoginView
import com.wuxinbo.videox.ui.collections.FolderDialog
import com.wuxinbo.videox.ui.collections.FolderSheet
import com.wuxinbo.videox.ui.components.Bg
import com.wuxinbo.videox.ui.components.Chip
import com.wuxinbo.videox.ui.components.Dim
import com.wuxinbo.videox.ui.components.Glyph
import com.wuxinbo.videox.ui.components.Pink
import com.wuxinbo.videox.ui.components.SmallButton
import com.wuxinbo.videox.ui.components.TextColor
import com.wuxinbo.videox.ui.detail.FilmDetail
import com.wuxinbo.videox.ui.playback.PlaybackScreen

@Composable
fun LibraryApp(vm: LibraryViewModel = viewModel()) {
    val holder = rememberSaveableStateHolder()
    var search by rememberSaveable { mutableStateOf(false) }
    var sheet by rememberSaveable { mutableStateOf("") }
    var wide by rememberSaveable { mutableStateOf(false) }
    var newFolder by rememberSaveable { mutableStateOf(false) }
    val navs =
        listOf(
            "发现" to R.drawable.vx_discover,
            "片库" to R.drawable.vx_grid,
            "收藏" to R.drawable.vx_heart,
            "我的" to R.drawable.vx_user,
        )
    BackHandler(enabled = vm.detail != null || vm.scope != null || search || vm.nav != "片库") {
        when {
            vm.detail != null -> vm.dismiss()
            vm.scope != null -> vm.backScope()
            search -> {
                search = false
                vm.search("")
            }
            else -> vm.navigate("片库")
        }
    }
    Box(
        Modifier.fillMaxSize()
            .background(Bg)
            .then(if (sheet == "filters" || sheet == "sort") Modifier.blur(4.dp) else Modifier)
            .safeDrawingPadding()
    ) {
        if (vm.profile == null) {
            Column(Modifier.padding(horizontal = 18.dp)) {
                LoginView(vm)
                vm.error?.let { Text(it, color = Pink) }
            }
        } else if (vm.detail != null) {
            key(vm.detail!!.id) { FilmDetail(vm, { sheet = "collection" }) }
        } else
            Column(Modifier.fillMaxSize()) {
                Row(
                    Modifier.fillMaxWidth().height(62.dp).padding(horizontal = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    if (vm.scope != null) SmallButton(R.drawable.vx_arrow, "返回", { vm.backScope() })
                    else
                        Row(
                            Modifier.padding(start = 4.dp, end = 9.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text("v", fontWeight = FontWeight.Black, fontSize = 24.sp)
                            Text("×", color = Pink, fontWeight = FontWeight.Black, fontSize = 22.sp)
                        }
                    Text(
                        vm.scope?.name ?: vm.nav,
                        Modifier.weight(1f),
                        fontSize = 21.sp,
                        fontWeight = FontWeight.SemiBold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    SmallButton(
                        R.drawable.vx_search,
                        "搜索片库",
                        {
                            if (vm.nav != "片库") vm.navigate("片库")
                            search = !search
                            if (!search) vm.search("")
                        },
                    )
                    Box(
                        Modifier.size(44.dp).clickable { vm.navigate("我的") },
                        contentAlignment = Alignment.Center,
                    ) {
                        Box(
                            Modifier.size(31.dp).background(Chip, CircleShape),
                            contentAlignment = Alignment.Center,
                        ) {
                            Text(vm.profile!!.displayName.take(1), fontSize = 12.sp, color = Dim)
                        }
                    }
                }
                if (search)
                    OutlinedTextField(
                        vm.query,
                        vm::search,
                        Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                        placeholder = { Text("搜索影片或演员") },
                        singleLine = true,
                        trailingIcon = {
                            SmallButton(
                                R.drawable.vx_close,
                                "关闭搜索",
                                {
                                    search = false
                                    vm.search("")
                                },
                            )
                        },
                    )
                vm.error?.let {
                    Text(
                        it,
                        color = Pink,
                        modifier = Modifier.clickable { vm.refresh() }.padding(horizontal = 16.dp),
                    )
                }
                Box(Modifier.weight(1f)) {
                    val listKey = "${vm.nav}/${vm.section}/${vm.scope}/${vm.page}"
                    holder.SaveableStateProvider(listKey) {
                        LazyColumn(
                            contentPadding =
                                PaddingValues(start = 16.dp, end = 16.dp, bottom = 18.dp),
                            verticalArrangement = Arrangement.spacedBy(12.dp),
                        ) {
                            if (vm.nav == "我的") {
                                profileContent(vm)
                            } else {
                                if (vm.nav == "发现") {
                                    discoverContent(vm)
                                } else {
                                    libraryBrowseControls(
                                        vm,
                                        wide,
                                        { wide = !wide },
                                        { sheet = it },
                                        { newFolder = true },
                                    )
                                }
                                libraryResults(vm, wide)
                            }
                        }
                    }
                }
                HorizontalDivider(color = Chip)
                Row(Modifier.fillMaxWidth().height(70.dp).background(Color(0xFF17181D))) {
                    navs.forEach { (name, icon) ->
                        Column(
                            Modifier.weight(1f).fillMaxHeight().clickable {
                                search = false
                                vm.navigate(name)
                            },
                            verticalArrangement = Arrangement.Center,
                            horizontalAlignment = Alignment.CenterHorizontally,
                        ) {
                            Glyph(icon, name, 21, if (vm.nav == name) Pink else Dim)
                            Text(
                                name,
                                fontSize = 11.sp,
                                color = if (vm.nav == name) TextColor else Dim,
                            )
                        }
                    }
                }
            }
    }
    if (sheet == "filters" || sheet == "sort") CinemaFilters(vm, sheet == "sort") { sheet = "" }
    if (sheet == "collection" && vm.detail != null)
        FolderSheet(vm, { sheet = "" }, { newFolder = true })
    if (newFolder) FolderDialog(vm) { newFolder = false }
    vm.playback?.let { key(it.sessionId) { PlaybackScreen(vm, it) } }
}
