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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.wuxinbo.videox.LibraryViewModel
import com.wuxinbo.videox.R
import com.wuxinbo.videox.api.models.Media
import com.wuxinbo.videox.ui.components.Art
import com.wuxinbo.videox.ui.components.Chip
import com.wuxinbo.videox.ui.components.Dim
import com.wuxinbo.videox.ui.components.Glyph
import com.wuxinbo.videox.ui.components.Gold
import com.wuxinbo.videox.ui.components.Pink
import com.wuxinbo.videox.ui.components.SmallButton
import com.wuxinbo.videox.ui.components.durationLabel

@Composable
internal fun Tool(icon: Int, text: String, onClick: () -> Unit) {
    Row(
        Modifier.heightIn(min = 44.dp).clickable(onClick = onClick).padding(horizontal = 2.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Glyph(icon, null, 14, Dim)
        Text(" " + text, fontSize = 11.sp, color = Dim)
    }
}

@Composable
internal fun FilmCard(vm: LibraryViewModel, m: Media, wide: Boolean, modifier: Modifier) {
    Column(modifier.clickable { vm.open(m.id) }) {
        Box(
            Modifier.fillMaxWidth()
                .aspectRatio(if (wide) 1.6f else 1 / 1.48f)
                .clip(RoundedCornerShape(9.dp))
        ) {
            Art(
                vm,
                if (wide) m.backdropId ?: m.posterId else m.posterId ?: m.backdropId,
                m.title,
                Modifier.fillMaxSize(),
            )
            Box(Modifier.align(Alignment.TopEnd)) {
                SmallButton(
                    if (m.isFavorite) R.drawable.vx_heart_filled else R.drawable.vx_heart,
                    if (m.isFavorite) "取消喜欢" else "喜欢",
                    { vm.like(m) },
                    if (m.isFavorite) Pink else Color.White,
                )
            }
            m.durationMs?.let {
                Badge(durationLabel(it), Modifier.align(Alignment.BottomEnd).padding(5.dp))
            }
            if (m.watchedAt != null)
                Badge("✓ 已看", Modifier.align(Alignment.BottomStart).padding(5.dp))
        }
        Text(
            m.title,
            Modifier.padding(top = 7.dp),
            fontSize = 14.sp,
            fontWeight = FontWeight.Medium,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Text(
                "${m.releaseYear?:"—"} · ${m.categoryName}",
                Modifier.weight(1f),
                fontSize = 10.sp,
                color = Dim,
                maxLines = 1,
            )
            m.rating?.let { Text("★ $it", fontSize = 10.sp, color = Gold) }
        }
    }
}

@Composable
private fun Badge(text: String, modifier: Modifier) {
    Text(
        text,
        modifier
            .background(Color.Black.copy(alpha = .57f), RoundedCornerShape(4.dp))
            .padding(horizontal = 4.dp, vertical = 1.dp),
        fontSize = 9.sp,
        lineHeight = 13.sp,
        color = Color.White,
    )
}

@Composable
internal fun MenuLine(icon: Int, label: String, action: () -> Unit) {
    HorizontalDivider(color = Chip)
    Row(
        Modifier.fillMaxWidth()
            .height(61.dp)
            .clickable(onClick = action)
            .padding(horizontal = 5.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Glyph(icon, null, 18, Dim)
        Text(label, Modifier.weight(1f).padding(start = 12.dp), fontSize = 14.sp)
        Glyph(R.drawable.vx_chevron, null, 15, Dim)
    }
}
