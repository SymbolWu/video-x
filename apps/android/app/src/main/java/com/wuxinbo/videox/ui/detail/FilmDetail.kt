package com.wuxinbo.videox.ui.detail

import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
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
import com.wuxinbo.videox.api.models.MediaDetail
import com.wuxinbo.videox.ui.components.Art
import com.wuxinbo.videox.ui.components.Bg
import com.wuxinbo.videox.ui.components.Chip
import com.wuxinbo.videox.ui.components.Choice
import com.wuxinbo.videox.ui.components.Dim
import com.wuxinbo.videox.ui.components.Glyph
import com.wuxinbo.videox.ui.components.Gold
import com.wuxinbo.videox.ui.playback.EditionSheet
import com.wuxinbo.videox.ui.components.Pink
import com.wuxinbo.videox.ui.components.SmallButton
import com.wuxinbo.videox.ui.components.durationLabel
import com.wuxinbo.videox.ui.playback.playbackClock

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FilmDetail(vm: LibraryViewModel, collections: () -> Unit) {
    val film = vm.detail ?: return
    var versionsOpen by rememberSaveable(film.id) { mutableStateOf(false) }
    if (versionsOpen) {
        EditionSheet(film.editions.orEmpty(), vm.chosenEdition, { versionsOpen = false }) { edition ->
            versionsOpen = false
            vm.chooseEdition(edition)
        }
    }
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState())) {
        FilmHeading(vm, film)
        Column(
            Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            PlaybackActions(vm, film, onVersions = { versionsOpen = true })
            (vm.error ?: vm.playMessage)?.let { Text(it, color = Pink) }
            film.episodes.orEmpty().forEach { episode ->
                Choice(
                    "第 ${episode.episodeNumber} 集　${episode.title}",
                    false,
                    { vm.open(episode.id) },
                    Modifier.fillMaxWidth(),
                )
            }
            HorizontalDivider(color = Chip)
            Row(
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                OutlinedButton(onClick = collections) { Text("收藏夹") }
                TextButton(onClick = { vm.state(watched = film.watchedAt == null) }) {
                    Text(if (film.watchedAt == null) "标记已看" else "✓ 已看过")
                }
            }
            Text("我的评分", style = MaterialTheme.typography.labelMedium, color = Dim)
            Row {
                (1..5).forEach { star ->
                    IconButton(
                        onClick = { vm.state(rating = if (film.rating == star) null else star) }
                    ) {
                        val selected = star <= (film.rating ?: 0)
                        Glyph(
                            if (selected) R.drawable.vx_star_filled else R.drawable.vx_star,
                            "$star 星",
                            22,
                            if (selected) Gold else Dim,
                        )
                    }
                }
            }
            film.summary
                ?.takeIf { it.isNotBlank() }
                ?.let {
                    Text("故事简介", style = MaterialTheme.typography.titleMedium)
                    Text(it, color = Dim, style = MaterialTheme.typography.bodyMedium)
                }
            key(film.id) { FilmStills(vm, film.stillIds.orEmpty().toList()) }
            FilmCredits(vm, film)
        }
    }
}

@Composable
private fun FilmHeading(vm: LibraryViewModel, film: MediaDetail) {
    val image = film.backdropId ?: film.posterId
    Box(Modifier.fillMaxWidth()) {
        if (image != null) {
            Art(vm, image, film.title, Modifier.fillMaxWidth().height(240.dp))
            Box(
                Modifier.matchParentSize()
                    .background(Brush.verticalGradient(listOf(Color.Transparent, Bg)))
            )
        }
        Column(
            Modifier.fillMaxWidth()
                .then(if (image != null) Modifier.heightIn(min = 240.dp) else Modifier)
                .padding(horizontal = 16.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.SpaceBetween,
        ) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Box(Modifier.background(Bg.copy(alpha = .75f), CircleShape)) {
                    SmallButton(R.drawable.vx_arrow, "返回片库", vm::dismiss)
                }
                Box(Modifier.background(Bg.copy(alpha = .75f), CircleShape)) {
                    SmallButton(
                        R.drawable.vx_heart,
                        if (film.isFavorite) "取消喜欢" else "喜欢影片",
                        { vm.state(favorite = !film.isFavorite) },
                        if (film.isFavorite) Pink else Color.White,
                    )
                }
            }
            Column(
                Modifier.padding(vertical = 10.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                Text(
                    film.title,
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.SemiBold,
                )
                Text(
                    listOfNotNull(
                            film.categoryName,
                            film.releaseYear?.toString(),
                            film.durationMs?.let(::durationLabel),
                        )
                        .joinToString(" · "),
                    color = Dim,
                    style = MaterialTheme.typography.bodySmall,
                )
            }
        }
    }
}

@Composable
private fun PlaybackActions(vm: LibraryViewModel, film: MediaDetail, onVersions: () -> Unit) {
    val episode = film.episodes?.firstOrNull()
    val bound = (film.linkedFileCount ?: 0) > 0
    val plan = vm.playPlan
    val label =
        when {
            episode != null -> "播放第 ${episode.episodeNumber} 集"
            !bound -> "尚未关联视频"
            plan?.mode == "resume" -> "继续播放 · ${playbackClock(plan.positionMs)}"
            plan?.completed == true -> "重新播放"
            else -> "播放影片"
        }
    if (film.editions.orEmpty().size > 1) {
        val edition = film.editions.orEmpty().find { it.id == vm.chosenEdition }
        OutlinedButton(onClick = onVersions, enabled = !vm.busy) {
            Text("播放版本 · " + (edition?.name ?: "选择版本"))
        }
    }
    Row(
        Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Button(
            onClick = { if (episode != null) vm.open(episode.id) else vm.startPlayer() },
            enabled = (episode != null || bound) && !vm.busy,
            modifier = Modifier.weight(1f),
        ) {
            Glyph(R.drawable.vx_play, null, 16, Bg)
            Spacer(Modifier.width(6.dp))
            Text(label)
        }
        if (episode == null && bound && (plan?.mode == "resume" || vm.playMessage != null)) {
            TextButton(onClick = { vm.startPlayer(true) }, enabled = !vm.busy) { Text("从头播放") }
        }
    }
}

@Composable
private fun FilmCredits(vm: LibraryViewModel, film: MediaDetail) {
    if (film.actors.isNotEmpty()) {
        Text("主要演员", style = MaterialTheme.typography.titleMedium)
        LazyRow(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            items(film.actors, key = { it.id }) { person ->
                Column(
                    Modifier.width(72.dp).clickable {
                        vm.explore(Scope(person.fullName, actor = person.id))
                    },
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Art(
                        vm,
                        person.portraitId,
                        person.fullName,
                        Modifier.size(54.dp).clip(CircleShape),
                    )
                    Text(
                        person.fullName,
                        Modifier.padding(top = 4.dp),
                        color = Dim,
                        maxLines = 2,
                        fontSize = 12.sp,
                    )
                }
            }
        }
    }
    if (film.franchises.isNotEmpty()) {
        Text("所属系列", style = MaterialTheme.typography.titleMedium)
        film.franchises.forEach { series ->
            ListItem(
                headlineContent = { Text(series.name) },
                supportingContent = { Text("${series.workCount} 部作品") },
                leadingContent = { Art(vm, series.coverId, series.name, Modifier.size(52.dp)) },
                modifier = Modifier.clickable { vm.explore(Scope(series.name, series = series.id)) },
            )
        }
    }
}
