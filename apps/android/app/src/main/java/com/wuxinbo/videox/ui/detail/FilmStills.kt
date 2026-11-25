package com.wuxinbo.videox.ui.detail

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.wuxinbo.videox.LibraryViewModel
import com.wuxinbo.videox.R
import com.wuxinbo.videox.ui.components.*
import java.util.UUID
import kotlinx.coroutines.launch

@Composable
internal fun FilmStills(vm: LibraryViewModel, ids: List<UUID>) {
    if (ids.isEmpty()) return
    var opened by rememberSaveable { mutableStateOf<UUID?>(null) }
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("剧照", style = MaterialTheme.typography.titleMedium)
            Text("${ids.size} 张", color = Dim, style = MaterialTheme.typography.labelMedium)
        }
        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            itemsIndexed(ids, key = { _, id -> id }) { index, id ->
                Art(vm, id, "第 ${index + 1} 张剧照", Modifier.width(156.dp).aspectRatio(16f / 9)
                    .clip(RoundedCornerShape(6.dp)).clickable(onClickLabel = "查看大图") { opened = id })
            }
        }
    }
    val initial = ids.indexOf(opened)
    if (initial >= 0) {
        Dialog(onDismissRequest = { opened = null }, properties = DialogProperties(usePlatformDefaultWidth = false)) {
            val pager = rememberPagerState(initialPage = initial) { ids.size }
            val scope = rememberCoroutineScope()
            Surface(modifier = Modifier.fillMaxSize(), color = Bg) {
                Column(Modifier.safeDrawingPadding()) {
                    Row(Modifier.fillMaxWidth().padding(start = 16.dp), verticalAlignment = Alignment.CenterVertically) {
                        Text("剧照 ${pager.currentPage + 1} / ${ids.size}", Modifier.weight(1f))
                        if (ids.size > 1) {
                            IconButton(enabled = pager.currentPage > 0, onClick = {
                                scope.launch { pager.animateScrollToPage(pager.currentPage - 1) }
                            }) { Glyph(R.drawable.vx_arrow, "上一张", 20, LocalContentColor.current) }
                            IconButton(enabled = pager.currentPage < ids.lastIndex, onClick = {
                                scope.launch { pager.animateScrollToPage(pager.currentPage + 1) }
                            }) { Glyph(R.drawable.vx_chevron, "下一张", 20, LocalContentColor.current) }
                        }
                        SmallButton(R.drawable.vx_close, "关闭剧照预览", { opened = null })
                    }
                    HorizontalPager(state = pager, key = { ids[it] }, modifier = Modifier.weight(1f)) { page ->
                        Art(vm, ids[page], "第 ${page + 1} 张剧照", Modifier.fillMaxSize(), ContentScale.Fit)
                    }
                }
            }
        }
    }
}
