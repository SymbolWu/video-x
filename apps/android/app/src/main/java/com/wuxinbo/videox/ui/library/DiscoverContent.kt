package com.wuxinbo.videox.ui.library

import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.*
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
import com.wuxinbo.videox.ui.components.Art
import com.wuxinbo.videox.ui.components.Bg
import com.wuxinbo.videox.ui.components.Dim
import com.wuxinbo.videox.ui.components.Glyph
import com.wuxinbo.videox.ui.components.Panel
import com.wuxinbo.videox.ui.playback.playbackClock

internal fun LazyListScope.discoverContent(vm: LibraryViewModel) {
    vm.movies.firstOrNull()?.let { m ->
        item {
            Box(
                Modifier.fillMaxWidth()
                    .padding(top = 10.dp)
                    .height(270.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .clickable { vm.open(m.id) }
            ) {
                Art(vm, m.backdropId ?: m.posterId, m.title, Modifier.fillMaxSize())
                Box(
                    Modifier.fillMaxSize()
                        .background(
                            Brush.verticalGradient(
                                listOf(Color.Transparent, Color.Black.copy(alpha = .85f))
                            )
                        )
                )
                Column(Modifier.align(Alignment.BottomStart).padding(20.dp)) {
                    Text("片库精选", fontSize = 11.sp, color = Dim)
                    Text(
                        m.title,
                        Modifier.padding(vertical = 7.dp),
                        fontSize = 28.sp,
                        fontWeight = FontWeight.Bold,
                    )
                    Text(
                        listOfNotNull(
                                m.releaseYear?.toString(),
                                m.categoryName,
                                m.durationMs?.let { "${(it+30000)/60000} 分钟" },
                            )
                            .joinToString(" · "),
                        fontSize = 12.sp,
                        color = Dim,
                    )
                    Button(
                        onClick = { vm.open(m.id) },
                        shape = RoundedCornerShape(9.dp),
                        modifier = Modifier.padding(top = 12.dp),
                    ) {
                        Glyph(R.drawable.vx_play, null, 15, Bg)
                        Text("  查看影片")
                    }
                }
            }
        }
    }
    if (vm.continuing.isNotEmpty()) {
        item { Text("继续观看", Modifier.padding(top = 12.dp), fontSize = 18.sp) }
        items(vm.continuing) { m ->
            Row(
                Modifier.fillMaxWidth()
                    .clip(RoundedCornerShape(8.dp))
                    .background(Panel)
                    .clickable { vm.open(m.id) }
                    .padding(10.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Art(
                    vm,
                    m.backdropId ?: m.posterId,
                    m.title,
                    Modifier.size(84.dp, 55.dp).clip(RoundedCornerShape(6.dp)),
                )
                Column(Modifier.weight(1f).padding(horizontal = 10.dp)) {
                    Text(m.title, fontSize = 14.sp)
                    Text("看到 " + playbackClock(m.resumeMs ?: 0L), fontSize = 11.sp, color = Dim)
                }
                Glyph(R.drawable.vx_play)
            }
        }
    }
    item { Text("最近添加", Modifier.padding(top = 12.dp), fontSize = 18.sp) }
}
