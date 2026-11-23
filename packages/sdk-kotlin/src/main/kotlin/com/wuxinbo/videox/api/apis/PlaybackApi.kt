package com.wuxinbo.videox.api.apis

import com.wuxinbo.videox.api.infrastructure.CollectionFormats.*
import retrofit2.http.*
import retrofit2.Response
import okhttp3.RequestBody
import com.squareup.moshi.Json

import com.wuxinbo.videox.api.models.ErrorResponse
import com.wuxinbo.videox.api.models.PlaybackAck
import com.wuxinbo.videox.api.models.PlaybackEvent
import com.wuxinbo.videox.api.models.PlaybackOpen
import com.wuxinbo.videox.api.models.PlaybackPlan
import com.wuxinbo.videox.api.models.PlaybackRequest
import com.wuxinbo.videox.api.models.PlaybackSession

interface PlaybackApi {
    /**
     * POST api/playback/sessions/{id}/close
     * 
     * 
     * Responses:
     *  - 200: Default Response
     *  - 400: Default Response
     *  - 401: Default Response
     *  - 404: Default Response
     *  - 409: Default Response
     *
     * @param id 
     * @return [PlaybackAck]
     */
    @POST("api/playback/sessions/{id}/close")
    suspend fun closePlayback(@Path("id") id: java.util.UUID): Response<PlaybackAck>

    /**
     * POST api/playback/plans
     * 
     * 
     * Responses:
     *  - 200: Default Response
     *  - 400: Default Response
     *  - 401: Default Response
     *  - 404: Default Response
     *  - 409: Default Response
     *
     * @param playbackRequest  (optional)
     * @return [PlaybackPlan]
     */
    @POST("api/playback/plans")
    suspend fun getPlaybackPlan(@Body playbackRequest: PlaybackRequest? = null): Response<PlaybackPlan>

    /**
     * POST api/playback/sessions
     * 
     * 
     * Responses:
     *  - 200: Default Response
     *  - 400: Default Response
     *  - 401: Default Response
     *  - 404: Default Response
     *  - 409: Default Response
     *
     * @param playbackOpen  (optional)
     * @return [PlaybackSession]
     */
    @POST("api/playback/sessions")
    suspend fun openPlayback(@Body playbackOpen: PlaybackOpen? = null): Response<PlaybackSession>

    /**
     * POST api/playback/sessions/{id}/events
     * 
     * 
     * Responses:
     *  - 200: Default Response
     *  - 400: Default Response
     *  - 401: Default Response
     *  - 404: Default Response
     *  - 409: Default Response
     *
     * @param id 
     * @param playbackEvent  (optional)
     * @return [PlaybackAck]
     */
    @POST("api/playback/sessions/{id}/events")
    suspend fun reportPlayback(@Path("id") id: java.util.UUID, @Body playbackEvent: PlaybackEvent? = null): Response<PlaybackAck>

}
