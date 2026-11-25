package com.wuxinbo.videox.ui.playback

import android.content.Context
import android.content.ContextWrapper
import androidx.activity.ComponentActivity
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.PlayerView
import com.wuxinbo.videox.LibraryViewModel
import com.wuxinbo.videox.api.models.PlaybackEvent
import com.wuxinbo.videox.api.models.PlaybackSession
import androidx.compose.ui.text.style.TextOverflow
import java.util.UUID
import kotlin.math.abs
import kotlinx.coroutines.delay

private fun Context.activity(): ComponentActivity? =
    when (this) {
        is ComponentActivity -> this
        is ContextWrapper -> baseContext.activity()
        else -> null
    }

internal fun playbackClock(ms: Long): String = "%d:%02d".format(ms / 60000, ms / 1000 % 60)

@androidx.annotation.OptIn(androidx.media3.common.util.UnstableApi::class)
@Composable
fun PlaybackScreen(vm: LibraryViewModel, session: PlaybackSession) {
    val context = LocalContext.current
    val player = remember(session.sessionId) { ExoPlayer.Builder(context).build() }
    var aligned by remember(session.sessionId) { mutableStateOf(false) }
    var error by remember(session.sessionId) { mutableStateOf<String?>(null) }
    var showEditions by remember(session.sessionId) { mutableStateOf(false) }
    var nextEdition by remember(session.sessionId) { mutableStateOf<UUID?>(null) }
    var resumeOnDismiss by remember(session.sessionId) { mutableStateOf(false) }
    val editions = vm.detail?.editions.orEmpty()
    val currentEdition = editions.find { it.id == vm.chosenEdition }
    DisposableEffect(player) {
        var started = false
        var finished = false
        val listener =
            object : Player.Listener {
                override fun onPlaybackStateChanged(state: Int) {
                    if (state == Player.STATE_READY && !aligned && error == null) {
                        val actual = player.currentPosition
                        if (
                            abs(actual - session.positionMs) > 2000 ||
                                (session.positionMs > 0 && actual == 0L)
                        ) {
                            error = "未能定位到保存的断点，请退出后重试。"
                            return
                        }
                        aligned = true
                        player.play()
                    }
                    if (state == Player.STATE_ENDED && started && !finished) {
                        finished = true
                        vm.record(session, PlaybackEvent.Kind.ENDED, player.currentPosition)
                        vm.leavePlayer()
                    }
                }

                override fun onIsPlayingChanged(playing: Boolean) {
                    if (playing && aligned && !started) {
                        started = true
                        vm.record(session, PlaybackEvent.Kind.START, player.currentPosition)
                    }
                }

                override fun onPlayWhenReadyChanged(ready: Boolean, reason: Int) {
                    if (!ready && started && !finished && error == null)
                        vm.record(session, PlaybackEvent.Kind.PAUSE, player.currentPosition)
                }

                override fun onPositionDiscontinuity(
                    old: Player.PositionInfo,
                    new: Player.PositionInfo,
                    reason: Int,
                ) {
                    if (started && reason == Player.DISCONTINUITY_REASON_SEEK)
                        vm.record(session, PlaybackEvent.Kind.SEEK, new.positionMs)
                }

                override fun onPlayerError(e: PlaybackException) {
                    error = "当前设备无法读取或解码此文件，已保留最近保存的断点。"
                }
            }
        player.addListener(listener)
        player.setMediaSource(vm.mediaSource(session), session.positionMs.toLong())
        player.prepare()
        val lifecycle = context.activity()?.lifecycle
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_PAUSE) player.pause()
        }
        lifecycle?.addObserver(observer)
        onDispose {
            lifecycle?.removeObserver(observer)
            player.removeListener(listener)
            if (started && !finished && error == null)
                vm.record(session, PlaybackEvent.Kind.PAUSE, player.currentPosition)
            if (vm.playback?.sessionId == session.sessionId) vm.leavePlayer()
            vm.closeAttempt(session)
            player.release()
            if (vm.detail?.id == session.mediaId) {
                nextEdition?.let { vm.chooseEdition(it, startPlayback = true) }
            }
        }
    }
    LaunchedEffect(player) {
        while (true) {
            delay(10000)
            if (aligned && player.isPlaying)
                vm.record(session, PlaybackEvent.Kind.PROGRESS, player.currentPosition)
        }
    }
    Dialog(
        onDismissRequest = vm::leavePlayer,
        properties = DialogProperties(usePlatformDefaultWidth = false),
    ) {
        Surface(Modifier.fillMaxSize(), color = Color(0xFF090A0C), contentColor = Color.White) {
            Column(Modifier.fillMaxSize().safeDrawingPadding()) {
                Row(
                    Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        vm.detail?.title ?: "播放",
                        style = MaterialTheme.typography.titleMedium,
                        modifier = Modifier.weight(1f),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    if (editions.size > 1) {
                        TextButton(onClick = {
                            resumeOnDismiss = player.playWhenReady
                            player.pause()
                            showEditions = true
                        }) { Text("版本 · " + (currentEdition?.name ?: "选择"), maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.widthIn(max = 116.dp)) }
                    }
                    TextButton(onClick = vm::leavePlayer) { Text("退出播放") }
                }
                Box(Modifier.fillMaxWidth().weight(1f), contentAlignment = Alignment.Center) {
                    AndroidView(
                        factory = { PlayerView(it).apply { this.player = player } },
                        update = { it.useController = aligned },
                        modifier = Modifier.fillMaxSize(),
                    )
                }
                if (showEditions) {
                    val dismiss = {
                        showEditions = false
                        if (resumeOnDismiss && aligned && error == null) player.play()
                    }
                    EditionSheet(editions, vm.chosenEdition, dismiss) { id ->
                        if (id == vm.chosenEdition) dismiss()
                        else {
                            nextEdition = id
                            showEditions = false
                            vm.leavePlayer()
                        }
                    }
                }
                (error ?: vm.playMessage)?.let { Text(it, modifier = Modifier.padding(16.dp)) }
            }
        }
    }
}
