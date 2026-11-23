package com.wuxinbo.videox.api.apis

import com.wuxinbo.videox.api.infrastructure.CollectionFormats.*
import retrofit2.http.*
import retrofit2.Response
import okhttp3.RequestBody
import com.squareup.moshi.Json

import com.wuxinbo.videox.api.models.Collection
import com.wuxinbo.videox.api.models.CollectionCreate
import com.wuxinbo.videox.api.models.CollectionItems
import com.wuxinbo.videox.api.models.CollectionPatch
import com.wuxinbo.videox.api.models.ErrorResponse
import com.wuxinbo.videox.api.models.MediaDetail
import com.wuxinbo.videox.api.models.MediaStatePatch

interface PersonalApi {
    /**
     * POST api/collections
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
     * @param collectionCreate  (optional)
     * @return [Collection]
     */
    @POST("api/collections")
    suspend fun createCollection(@Body collectionCreate: CollectionCreate? = null): Response<Collection>

    /**
     * PATCH api/collections/{id}
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
     * @param id 
     * @param collectionPatch  (optional)
     * @return [Collection]
     */
    @PATCH("api/collections/{id}")
    suspend fun editCollection(@Path("id") id: java.util.UUID, @Body collectionPatch: CollectionPatch? = null): Response<Collection>

    /**
     * GET api/collections
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
     * @return [kotlin.collections.List<Collection>]
     */
    @GET("api/collections")
    suspend fun listCollections(): Response<kotlin.collections.List<Collection>>

    /**
     * PUT api/collections/{id}/items
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
     * @param id 
     * @param collectionItems  (optional)
     * @return [Collection]
     */
    @PUT("api/collections/{id}/items")
    suspend fun setCollectionItems(@Path("id") id: java.util.UUID, @Body collectionItems: CollectionItems? = null): Response<Collection>

    /**
     * PATCH api/media/{id}/state
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
     * @param id 
     * @param mediaStatePatch  (optional)
     * @return [MediaDetail]
     */
    @PATCH("api/media/{id}/state")
    suspend fun updateMediaState(@Path("id") id: java.util.UUID, @Body mediaStatePatch: MediaStatePatch? = null): Response<MediaDetail>

}
