package com.wuxinbo.videox.api.apis

import com.wuxinbo.videox.api.infrastructure.CollectionFormats.*
import retrofit2.http.*
import retrofit2.Response
import okhttp3.RequestBody
import com.squareup.moshi.Json

import com.wuxinbo.videox.api.models.ErrorResponse
import com.wuxinbo.videox.api.models.RuntimeStatus

interface OperationsApi {
    /**
     * GET api/system/status
     * 
     * 
     * Responses:
     *  - 200: Default Response
     *  - 400: Default Response
     *  - 401: Default Response
     *  - 403: Default Response
     *  - 404: Default Response
     *  - 409: Default Response
     *  - 413: Default Response
     *  - 415: Default Response
     *  - 429: Default Response
     *  - 500: Default Response
     *
     * @return [RuntimeStatus]
     */
    @GET("api/system/status")
    suspend fun readRuntimeStatus(): Response<RuntimeStatus>

}
