package com.wuxinbo.videox.api.apis

import com.wuxinbo.videox.api.infrastructure.CollectionFormats.*
import retrofit2.http.*
import retrofit2.Response
import okhttp3.RequestBody
import com.squareup.moshi.Json

import com.wuxinbo.videox.api.models.ErrorResponse
import com.wuxinbo.videox.api.models.Health
import com.wuxinbo.videox.api.models.Login
import com.wuxinbo.videox.api.models.LoginResult
import com.wuxinbo.videox.api.models.Profile

interface IdentityApi {
    /**
     * GET api/auth/me
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
     * @return [Profile]
     */
    @GET("api/auth/me")
    suspend fun getProfile(): Response<Profile>

    /**
     * POST api/auth/login
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
     * @param login  (optional)
     * @return [LoginResult]
     */
    @POST("api/auth/login")
    suspend fun login(@Body login: Login? = null): Response<LoginResult>

    /**
     * POST api/auth/logout
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
     * @return [Health]
     */
    @POST("api/auth/logout")
    suspend fun logout(): Response<Health>

}
