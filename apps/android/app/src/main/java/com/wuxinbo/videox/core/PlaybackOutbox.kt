package com.wuxinbo.videox.core

import android.content.Context
import com.wuxinbo.videox.api.apis.PlaybackApi
import com.wuxinbo.videox.api.models.PlaybackEvent
import com.wuxinbo.videox.api.models.PlaybackSession
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import org.json.JSONObject
import java.util.UUID

/** Each action has a stable ID. Replaying a saved action after process death is harmless. */
class PlaybackOutbox(context: Context) {
    private val prefs = context.getSharedPreferences("playback-events", Context.MODE_PRIVATE)
    private val lock = Mutex()
    fun enqueue(scope: String, session: PlaybackSession, seq: Int, kind: PlaybackEvent.Kind?, position: Long) {
        val key = "$scope/${session.sessionId}/" + seq.toString().padStart(10, '0')
        val saved = JSONObject().put("session", session.sessionId.toString()).put("seq", seq)
            .put("part", session.partId.toString()).put("id", UUID.randomUUID().toString())
            .put("kind", kind?.name ?: "CLOSE").put("position", position)
        val editor = prefs.edit()
        if (kind == PlaybackEvent.Kind.PROGRESS) {
            val previous = prefs.all.keys.filter { it.startsWith("$scope/${session.sessionId}/") }.maxOrNull()
            if (previous != null && prefs.getString(previous, null)?.let { JSONObject(it).getString("kind") } == "PROGRESS") editor.remove(previous)
        }
        editor.putString(key, saved.toString()).apply()
    }
    suspend fun flush(scope: String, api: PlaybackApi, active: UUID?): String = lock.withLock {
        var result = "ack"
        for (key in prefs.all.keys.filter { it.startsWith("$scope/") }.sorted()) {
            val record = prefs.getString(key, null)?.let { JSONObject(it) } ?: continue
            val session = UUID.fromString(record.getString("session"))
            val kind = record.getString("kind")
            val response = if (kind == "CLOSE") api.closePlayback(session) else api.reportPlayback(session, PlaybackEvent(
                UUID.fromString(record.getString("id")), record.getInt("seq"), UUID.fromString(record.getString("part")),
                record.getLong("position"), PlaybackEvent.Kind.valueOf(kind)))
            val status = if (response.code() in listOf(400, 404, 409)) "invalid" else response.value().status
            prefs.edit().remove(key).apply()
            if (session == active && status != "ack" && status != "stale") result = status
        }
        result
    }
}
