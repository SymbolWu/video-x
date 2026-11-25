package com.wuxinbo.videox.ui.library

import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.wuxinbo.videox.LibraryViewModel
import com.wuxinbo.videox.R
import com.wuxinbo.videox.Scope
import com.wuxinbo.videox.Section
import com.wuxinbo.videox.ui.components.Art
import com.wuxinbo.videox.ui.components.Dim
import com.wuxinbo.videox.ui.components.Glyph
import com.wuxinbo.videox.ui.components.TextColor

internal fun LazyListScope.libraryResults(vm: LibraryViewModel, wide: Boolean) {
    when (vm.section) {
        Section.MEDIA -> {
            val columns = if (wide) 2 else 3
            items((if (vm.nav == "发现") vm.movies.take(6) else vm.movies).chunked(columns)) { row ->
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(9.dp)) {
                    row.forEach { m -> FilmCard(vm, m, wide, Modifier.weight(1f)) }
                    repeat(columns - row.size) { Spacer(Modifier.weight(1f)) }
                }
            }
        }
        Section.PEOPLE ->
            items(vm.people.chunked(3)) { row ->
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    row.forEach { p ->
                        Column(
                            Modifier.weight(1f).clickable {
                                vm.explore(Scope(p.fullName, actor = p.id))
                            },
                            horizontalAlignment = Alignment.CenterHorizontally,
                        ) {
                            Art(
                                vm,
                                p.portraitId,
                                p.fullName,
                                Modifier.fillMaxWidth().aspectRatio(1f).clip(CircleShape),
                            )
                            Text(
                                p.fullName,
                                Modifier.padding(top = 7.dp),
                                maxLines = 1,
                                fontSize = 14.sp,
                            )
                            Text(
                                "${p.categoryName} · ${p.workCount} 部作品",
                                Modifier.padding(bottom = 10.dp),
                                fontSize = 10.sp,
                                color = Dim,
                            )
                        }
                    }
                    repeat(3 - row.size) { Spacer(Modifier.weight(1f)) }
                }
            }
        Section.SERIES ->
            items(vm.series) { f ->
                Box(
                    Modifier.fillMaxWidth()
                        .aspectRatio(2.17f)
                        .clip(RoundedCornerShape(9.dp))
                        .clickable { vm.explore(Scope(f.name, series = f.id)) }
                ) {
                    Art(vm, f.coverId, f.name, Modifier.fillMaxSize())
                    Box(
                        Modifier.fillMaxSize()
                            .background(
                                Brush.verticalGradient(
                                    listOf(Color.Transparent, Color.Black.copy(alpha = .82f))
                                )
                            )
                    )
                    Column(Modifier.align(Alignment.BottomStart).padding(17.dp)) {
                        Text(
                            "${f.categoryName} / ${f.workCount} 部作品",
                            color = TextColor,
                            fontSize = 11.sp,
                        )
                        Text(
                            f.name,
                            Modifier.padding(top = 6.dp),
                            fontSize = 19.sp,
                            fontWeight = FontWeight.SemiBold,
                        )
                    }
                    Box(Modifier.align(Alignment.BottomEnd).padding(16.dp)) {
                        Glyph(R.drawable.vx_chevron)
                    }
                }
            }
        else -> Unit
    }
    if (vm.total == 0 && !vm.busy)
        item { Text("暂无符合条件的资料", Modifier.padding(vertical = 32.dp), color = Dim) }
    if (vm.total > 24 && vm.nav != "发现")
        item {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                TextButton(onClick = { vm.move(-1) }, enabled = vm.page > 1) { Text("上一页") }
                TextButton(onClick = { vm.move(1) }, enabled = vm.page * 24 < vm.total) {
                    Text("下一页")
                }
            }
        }
}
