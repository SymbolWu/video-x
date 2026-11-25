package com.wuxinbo.videox.api.apis

import com.wuxinbo.videox.api.infrastructure.CollectionFormats.*
import retrofit2.http.*
import retrofit2.Response
import okhttp3.RequestBody
import com.squareup.moshi.Json

import com.wuxinbo.videox.api.models.ArchiveEntry
import com.wuxinbo.videox.api.models.BrowseFacts
import com.wuxinbo.videox.api.models.Category
import com.wuxinbo.videox.api.models.CategoryCreate
import com.wuxinbo.videox.api.models.CategoryVisibility
import com.wuxinbo.videox.api.models.DictionaryChoicePage
import com.wuxinbo.videox.api.models.DictionaryEdit
import com.wuxinbo.videox.api.models.DictionaryEntry
import com.wuxinbo.videox.api.models.DictionaryWrite
import com.wuxinbo.videox.api.models.EditionCheck
import com.wuxinbo.videox.api.models.EditionRestore
import com.wuxinbo.videox.api.models.ErrorResponse
import com.wuxinbo.videox.api.models.Franchise
import com.wuxinbo.videox.api.models.FranchiseCreate
import com.wuxinbo.videox.api.models.FranchisePage
import com.wuxinbo.videox.api.models.FranchisePatch
import com.wuxinbo.videox.api.models.FranchiseProfile
import com.wuxinbo.videox.api.models.ManagementMediaPage
import com.wuxinbo.videox.api.models.MediaDetail
import com.wuxinbo.videox.api.models.MediaPage
import com.wuxinbo.videox.api.models.MediaPatch
import com.wuxinbo.videox.api.models.Person
import com.wuxinbo.videox.api.models.PersonCreate
import com.wuxinbo.videox.api.models.PersonPage
import com.wuxinbo.videox.api.models.PersonPatch
import com.wuxinbo.videox.api.models.PersonProfile
import com.wuxinbo.videox.api.models.RevisionInput
import com.wuxinbo.videox.api.models.ScanResult

interface CatalogApi {
    /**
     * POST api/media/{id}/editions/{editionId}/check
     * 重新检测版本文件
     * 检查登记路径上的原文件，并返回检测结果。
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
     * @param id 作品 ID
     * @param editionId 播放版本 ID
     * @param revisionInput  (optional)
     * @return [EditionCheck]
     */
    @POST("api/media/{id}/editions/{editionId}/check")
    suspend fun checkEditionFile(@Path("id") id: java.util.UUID, @Path("editionId") editionId: java.util.UUID, @Body revisionInput: RevisionInput? = null): Response<EditionCheck>

    /**
     * POST api/categories
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
     * @param categoryCreate  (optional)
     * @return [Category]
     */
    @POST("api/categories")
    suspend fun createCategory(@Body categoryCreate: CategoryCreate? = null): Response<Category>

    /**
     * POST api/dictionary
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
     * @param dictionaryWrite  (optional)
     * @return [ScanResult]
     */
    @POST("api/dictionary")
    suspend fun createDictionaryEntry(@Body dictionaryWrite: DictionaryWrite? = null): Response<ScanResult>

    /**
     * POST api/franchises
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
     * @param franchiseCreate  (optional)
     * @return [Franchise]
     */
    @POST("api/franchises")
    suspend fun createFranchise(@Body franchiseCreate: FranchiseCreate? = null): Response<Franchise>

    /**
     * POST api/people
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
     * @param personCreate  (optional)
     * @return [Person]
     */
    @POST("api/people")
    suspend fun createPerson(@Body personCreate: PersonCreate? = null): Response<Person>

    /**
     * PATCH api/dictionary/{id}
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
     * @param dictionaryEdit  (optional)
     * @return [ScanResult]
     */
    @PATCH("api/dictionary/{id}")
    suspend fun editDictionaryEntry(@Path("id") id: java.util.UUID, @Body dictionaryEdit: DictionaryEdit? = null): Response<ScanResult>

    /**
     * GET api/browse/facts
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
     * @return [BrowseFacts]
     */
    @GET("api/browse/facts")
    suspend fun getBrowseFacts(): Response<BrowseFacts>

    /**
     * GET api/franchises/{id}
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
     * @return [FranchiseProfile]
     */
    @GET("api/franchises/{id}")
    suspend fun getFranchiseProfile(@Path("id") id: java.util.UUID): Response<FranchiseProfile>

    /**
     * GET api/media/{id}
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
     * @return [MediaDetail]
     */
    @GET("api/media/{id}")
    suspend fun getMedia(@Path("id") id: java.util.UUID): Response<MediaDetail>

    /**
     * GET api/people/{id}
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
     * @return [PersonProfile]
     */
    @GET("api/people/{id}")
    suspend fun getPersonProfile(@Path("id") id: java.util.UUID): Response<PersonProfile>

    /**
     * GET api/catalog/archive
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
     * @return [kotlin.collections.List<ArchiveEntry>]
     */
    @GET("api/catalog/archive")
    suspend fun listArchive(): Response<kotlin.collections.List<ArchiveEntry>>

    /**
     * GET api/categories
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
     * @return [kotlin.collections.List<Category>]
     */
    @GET("api/categories")
    suspend fun listCategories(): Response<kotlin.collections.List<Category>>

    /**
     * GET api/dictionary
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
     * @return [kotlin.collections.List<DictionaryEntry>]
     */
    @GET("api/dictionary")
    suspend fun listDictionary(): Response<kotlin.collections.List<DictionaryEntry>>


    /**
    * enum for parameter kind
    */
    enum class KindListDictionaryChoices(val value: kotlin.String) {
        @Json(name = "tag") TAG("tag"),
        @Json(name = "studio") STUDIO("studio")
    }


    /**
    * enum for parameter direction
    */
    enum class DirectionListDictionaryChoices(val value: kotlin.String) {
        @Json(name = "asc") ASC("asc"),
        @Json(name = "desc") DESC("desc")
    }

    /**
     * GET api/dictionary/choices
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
     * @param kind 
     * @param q  (optional)
     * @param categoryId  (optional)
     * @param direction  (optional)
     * @param page  (optional, default to 1)
     * @param pageSize  (optional, default to 24)
     * @param ids  (optional)
     * @return [DictionaryChoicePage]
     */
    @GET("api/dictionary/choices")
    suspend fun listDictionaryChoices(@Query("kind") kind: KindListDictionaryChoices, @Query("q") q: kotlin.String? = null, @Query("categoryId") categoryId: java.util.UUID? = null, @Query("direction") direction: DirectionListDictionaryChoices? = null, @Query("page") page: kotlin.Int? = 1, @Query("pageSize") pageSize: kotlin.Int? = 24, @Query("ids") ids: kotlin.String? = null): Response<DictionaryChoicePage>


    /**
    * enum for parameter direction
    */
    enum class DirectionListFranchises(val value: kotlin.String) {
        @Json(name = "asc") ASC("asc"),
        @Json(name = "desc") DESC("desc")
    }


    /**
    * enum for parameter sort
    */
    enum class SortListFranchises(val value: kotlin.String) {
        @Json(name = "createdAt") CREATED_AT("createdAt"),
        @Json(name = "name") NAME("name"),
        @Json(name = "count") COUNT("count")
    }

    /**
     * GET api/franchises
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
     * @param q  (optional)
     * @param categoryId  (optional)
     * @param direction  (optional)
     * @param page  (optional, default to 1)
     * @param pageSize  (optional, default to 24)
     * @param sort  (optional)
     * @return [FranchisePage]
     */
    @GET("api/franchises")
    suspend fun listFranchises(@Query("q") q: kotlin.String? = null, @Query("categoryId") categoryId: java.util.UUID? = null, @Query("direction") direction: DirectionListFranchises? = null, @Query("page") page: kotlin.Int? = 1, @Query("pageSize") pageSize: kotlin.Int? = 24, @Query("sort") sort: SortListFranchises? = null): Response<FranchisePage>


    /**
    * enum for parameter direction
    */
    enum class DirectionListManagementMedia(val value: kotlin.String) {
        @Json(name = "asc") ASC("asc"),
        @Json(name = "desc") DESC("desc")
    }


    /**
    * enum for parameter sort
    */
    enum class SortListManagementMedia(val value: kotlin.String) {
        @Json(name = "createdAt") CREATED_AT("createdAt"),
        @Json(name = "name") NAME("name"),
        @Json(name = "year") YEAR("year"),
        @Json(name = "rating") RATING("rating"),
        @Json(name = "lastPlayed") LAST_PLAYED("lastPlayed")
    }


    /**
    * enum for parameter resolution
    */
    enum class ResolutionListManagementMedia(val value: kotlin.String) {
        @Json(name = "2160p") _2160P("2160p"),
        @Json(name = "1080p") _1080P("1080p"),
        @Json(name = "720p") _720P("720p"),
        @Json(name = "576p") _576P("576p"),
        @Json(name = "480p") _480P("480p"),
        @Json(name = "below360p") BELOW360P("below360p"),
        @Json(name = "unknown") UNKNOWN("unknown")
    }


    /**
    * enum for parameter chineseSubtitles
    */
    enum class ChineseSubtitlesListManagementMedia(val value: kotlin.String) {
        @Json(name = "supported") SUPPORTED("supported"),
        @Json(name = "unsupported") UNSUPPORTED("unsupported"),
        @Json(name = "unknown") UNKNOWN("unknown")
    }

    /**
     * GET api/manage/media
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
     * @param q  (optional)
     * @param categoryId  (optional)
     * @param direction  (optional)
     * @param page  (optional, default to 1)
     * @param pageSize  (optional, default to 24)
     * @param favorite  (optional)
     * @param watched  (optional)
     * @param year  (optional)
     * @param ratingMin  (optional)
     * @param unrated  (optional)
     * @param resumable  (optional)
     * @param episodesOnly  (optional)
     * @param includeEpisodes  (optional)
     * @param sort  (optional)
     * @param actorId  (optional)
     * @param franchiseId  (optional)
     * @param collectionId  (optional)
     * @param resolution Resolution tier of the default edition. (optional)
     * @param chineseSubtitles Catalog&#39;s Chinese support flag, as recorded in the film&#39;s metadata. (optional)
     * @return [ManagementMediaPage]
     */
    @GET("api/manage/media")
    suspend fun listManagementMedia(@Query("q") q: kotlin.String? = null, @Query("categoryId") categoryId: java.util.UUID? = null, @Query("direction") direction: DirectionListManagementMedia? = null, @Query("page") page: kotlin.Int? = 1, @Query("pageSize") pageSize: kotlin.Int? = 24, @Query("favorite") favorite: kotlin.Boolean? = null, @Query("watched") watched: kotlin.Boolean? = null, @Query("year") year: kotlin.Int? = null, @Query("ratingMin") ratingMin: kotlin.Int? = null, @Query("unrated") unrated: kotlin.Boolean? = null, @Query("resumable") resumable: kotlin.Boolean? = null, @Query("episodesOnly") episodesOnly: kotlin.Boolean? = null, @Query("includeEpisodes") includeEpisodes: kotlin.Boolean? = null, @Query("sort") sort: SortListManagementMedia? = null, @Query("actorId") actorId: java.util.UUID? = null, @Query("franchiseId") franchiseId: java.util.UUID? = null, @Query("collectionId") collectionId: java.util.UUID? = null, @Query("resolution") resolution: ResolutionListManagementMedia? = null, @Query("chineseSubtitles") chineseSubtitles: ChineseSubtitlesListManagementMedia? = null): Response<ManagementMediaPage>


    /**
    * enum for parameter direction
    */
    enum class DirectionListMedia(val value: kotlin.String) {
        @Json(name = "asc") ASC("asc"),
        @Json(name = "desc") DESC("desc")
    }


    /**
    * enum for parameter sort
    */
    enum class SortListMedia(val value: kotlin.String) {
        @Json(name = "createdAt") CREATED_AT("createdAt"),
        @Json(name = "name") NAME("name"),
        @Json(name = "year") YEAR("year"),
        @Json(name = "rating") RATING("rating"),
        @Json(name = "lastPlayed") LAST_PLAYED("lastPlayed")
    }

    /**
     * GET api/media
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
     * @param q  (optional)
     * @param categoryId  (optional)
     * @param direction  (optional)
     * @param page  (optional, default to 1)
     * @param pageSize  (optional, default to 24)
     * @param favorite  (optional)
     * @param watched  (optional)
     * @param year  (optional)
     * @param ratingMin  (optional)
     * @param unrated  (optional)
     * @param resumable  (optional)
     * @param episodesOnly  (optional)
     * @param includeEpisodes  (optional)
     * @param sort  (optional)
     * @param actorId  (optional)
     * @param franchiseId  (optional)
     * @param collectionId  (optional)
     * @return [MediaPage]
     */
    @GET("api/media")
    suspend fun listMedia(@Query("q") q: kotlin.String? = null, @Query("categoryId") categoryId: java.util.UUID? = null, @Query("direction") direction: DirectionListMedia? = null, @Query("page") page: kotlin.Int? = 1, @Query("pageSize") pageSize: kotlin.Int? = 24, @Query("favorite") favorite: kotlin.Boolean? = null, @Query("watched") watched: kotlin.Boolean? = null, @Query("year") year: kotlin.Int? = null, @Query("ratingMin") ratingMin: kotlin.Int? = null, @Query("unrated") unrated: kotlin.Boolean? = null, @Query("resumable") resumable: kotlin.Boolean? = null, @Query("episodesOnly") episodesOnly: kotlin.Boolean? = null, @Query("includeEpisodes") includeEpisodes: kotlin.Boolean? = null, @Query("sort") sort: SortListMedia? = null, @Query("actorId") actorId: java.util.UUID? = null, @Query("franchiseId") franchiseId: java.util.UUID? = null, @Query("collectionId") collectionId: java.util.UUID? = null): Response<MediaPage>


    /**
    * enum for parameter direction
    */
    enum class DirectionListPeople(val value: kotlin.String) {
        @Json(name = "asc") ASC("asc"),
        @Json(name = "desc") DESC("desc")
    }


    /**
    * enum for parameter sort
    */
    enum class SortListPeople(val value: kotlin.String) {
        @Json(name = "createdAt") CREATED_AT("createdAt"),
        @Json(name = "name") NAME("name"),
        @Json(name = "count") COUNT("count")
    }

    /**
     * GET api/people
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
     * @param q  (optional)
     * @param categoryId  (optional)
     * @param direction  (optional)
     * @param page  (optional, default to 1)
     * @param pageSize  (optional, default to 24)
     * @param sort  (optional)
     * @return [PersonPage]
     */
    @GET("api/people")
    suspend fun listPeople(@Query("q") q: kotlin.String? = null, @Query("categoryId") categoryId: java.util.UUID? = null, @Query("direction") direction: DirectionListPeople? = null, @Query("page") page: kotlin.Int? = 1, @Query("pageSize") pageSize: kotlin.Int? = 24, @Query("sort") sort: SortListPeople? = null): Response<PersonPage>

    /**
     * POST api/media/{id}/editions/{editionId}/restore
     * 恢复被替换的版本
     * 检测原文件通过后，将原版本恢复到播放列表。
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
     * @param id 作品 ID
     * @param editionId 播放版本 ID
     * @param revisionInput  (optional)
     * @return [EditionRestore]
     */
    @POST("api/media/{id}/editions/{editionId}/restore")
    suspend fun restoreEditionFile(@Path("id") id: java.util.UUID, @Path("editionId") editionId: java.util.UUID, @Body revisionInput: RevisionInput? = null): Response<EditionRestore>

    /**
     * PATCH api/categories/{id}/visibility
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
     * @param categoryVisibility  (optional)
     * @return [Category]
     */
    @PATCH("api/categories/{id}/visibility")
    suspend fun setCategoryVisibility(@Path("id") id: java.util.UUID, @Body categoryVisibility: CategoryVisibility? = null): Response<Category>

    /**
     * PATCH api/franchises/{id}
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
     * @param franchisePatch  (optional)
     * @return [Franchise]
     */
    @PATCH("api/franchises/{id}")
    suspend fun updateFranchise(@Path("id") id: java.util.UUID, @Body franchisePatch: FranchisePatch? = null): Response<Franchise>

    /**
     * PATCH api/media/{id}
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
     * @param mediaPatch  (optional)
     * @return [MediaDetail]
     */
    @PATCH("api/media/{id}")
    suspend fun updateMedia(@Path("id") id: java.util.UUID, @Body mediaPatch: MediaPatch? = null): Response<MediaDetail>

    /**
     * PATCH api/people/{id}
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
     * @param personPatch  (optional)
     * @return [Person]
     */
    @PATCH("api/people/{id}")
    suspend fun updatePerson(@Path("id") id: java.util.UUID, @Body personPatch: PersonPatch? = null): Response<Person>

}
