package com.wuxinbo.videox.ui.components

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
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.wuxinbo.videox.LibraryViewModel
import com.wuxinbo.videox.R
import java.util.UUID
import kotlinx.coroutines.CancellationException

internal fun durationLabel(ms: Long) = if (ms < 60000) "${ms/1000} 秒" else "${(ms+30000)/60000} 分钟"

internal val Bg = Color(0xFF111214)
internal val Panel = Color(0xFF1D1F25)
internal val Chip = Color(0xFF25272D)
internal val TextColor = Color(0xFFE9E9EC)
internal val Dim = Color(0xFF9A9CA5)
internal val Pink = Color(0xFFEAA1B5)
internal val Lavender = Color(0xFFBAC2FC)
internal val Gold = Color(0xFFDFC69A)
internal val cinemaColors =
    darkColorScheme(
        primary = Lavender,
        onPrimary = Bg,
        secondary = Pink,
        background = Bg,
        surface = Panel,
        onSurface = TextColor,
        onBackground = TextColor,
    )

@Composable
internal fun Glyph(id: Int, label: String? = null, size: Int = 20, color: Color = TextColor) {
    Icon(painterResource(id), label, Modifier.size(size.dp), tint = color)
}

@Composable
internal fun Art(
    vm: LibraryViewModel,
    id: UUID?,
    label: String,
    modifier: Modifier,
    contentScale: ContentScale = ContentScale.Crop,
) {
    val bmp by
        produceState<android.graphics.Bitmap?>(null, id, vm.server) {
            value = null
            if (id != null)
                try {
                    value = vm.artwork(id)
                } catch (e: CancellationException) {
                    throw e
                } catch (_: java.io.IOException) {}
        }
    Box(modifier.background(Chip), contentAlignment = Alignment.Center) {
        bmp?.let {
            Image(
                it.asImageBitmap(),
                label,
                Modifier.fillMaxSize(),
                contentScale = contentScale,
            )
        } ?: Glyph(R.drawable.vx_grid, null, 20, Dim.copy(alpha = .55f))
    }
}

@Composable
internal fun SmallButton(id: Int, label: String, action: () -> Unit, color: Color = TextColor) {
    IconButton(onClick = action, modifier = Modifier.size(48.dp)) { Glyph(id, label, 20, color) }
}

@Composable
internal fun Choice(
    label: String,
    selected: Boolean,
    action: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier
            .heightIn(min = 48.dp)
            .clip(RoundedCornerShape(7.dp))
            .background(if (selected) Color(0xFF382D34) else Chip)
            .clickable(onClick = action)
            .padding(horizontal = 12.dp, vertical = 8.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(label, color = if (selected) Pink else TextColor, fontSize = 12.sp, maxLines = 2)
    }
}
