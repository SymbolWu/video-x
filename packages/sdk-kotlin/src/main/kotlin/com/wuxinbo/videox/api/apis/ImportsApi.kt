package com.wuxinbo.videox.api.apis

import com.wuxinbo.videox.api.infrastructure.CollectionFormats.*
import retrofit2.http.*
import retrofit2.Response
import okhttp3.RequestBody
import com.squareup.moshi.Json

import com.wuxinbo.videox.api.models.ApplyLookup
import com.wuxinbo.videox.api.models.BindFile
import com.wuxinbo.videox.api.models.DirectoryView
import com.wuxinbo.videox.api.models.DownloadDirectory
import com.wuxinbo.videox.api.models.ErrorResponse
import com.wuxinbo.videox.api.models.GroupInput
import com.wuxinbo.videox.api.models.ImportEdit
import com.wuxinbo.videox.api.models.ImportQueue
import com.wuxinbo.videox.api.models.ImportRow
import com.wuxinbo.videox.api.models.ManualFile
import com.wuxinbo.videox.api.models.NewDraft
import com.wuxinbo.videox.api.models.PlanCount
import com.wuxinbo.videox.api.models.PublishEdition
import com.wuxinbo.videox.api.models.RevisionInput
import com.wuxinbo.videox.api.models.RunLookup
import com.wuxinbo.videox.api.models.ScanResult
import com.wuxinbo.videox.api.models.SourceProvider
import com.wuxinbo.videox.api.models.TargetPlan

interface ImportsApi {
    /**
     * POST api/imports/{id}/lookup/apply
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
     * @param applyLookup  (optional)
     * @return [ImportRow]
     */
    @POST("api/imports/{id}/lookup/apply")
    suspend fun applyDraftCandidate(@Path("id") id: java.util.UUID, @Body applyLookup: ApplyLookup? = null): Response<ImportRow>

    /**
     * POST api/imports/{id}/file
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
     * @param bindFile  (optional)
     * @return [ImportRow]
     */
    @POST("api/imports/{id}/file")
    suspend fun bindDraftFile(@Path("id") id: java.util.UUID, @Body bindFile: BindFile? = null): Response<ImportRow>


    /**
    * enum for parameter area
    */
    enum class AreaBrowseStorageDirectory(val value: kotlin.String) {
        @Json(name = "inbox") INBOX("inbox"),
        @Json(name = "volume") VOLUME("volume"),
        @Json(name = "target") TARGET("target")
    }

    /**
     * GET api/storage/browse
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
     * @param summaryOnly  (optional)
     * @param area  (optional)
     * @param target  (optional)
     * @param dir  (optional)
     * @return [DirectoryView]
     */
    @GET("api/storage/browse")
    suspend fun browseStorageDirectory(@Query("summaryOnly") summaryOnly: kotlin.Boolean? = null, @Query("area") area: AreaBrowseStorageDirectory? = null, @Query("target") target: kotlin.String? = null, @Query("dir") dir: kotlin.String? = null): Response<DirectoryView>

    /**
     * POST api/imports/drafts
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
     * @param newDraft  (optional)
     * @return [ImportRow]
     */
    @POST("api/imports/drafts")
    suspend fun createFilelessDraft(@Body newDraft: NewDraft? = null): Response<ImportRow>

    /**
     * PUT api/imports/{id}
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
     * @param importEdit  (optional)
     * @return [ImportRow]
     */
    @PUT("api/imports/{id}")
    suspend fun editImport(@Path("id") id: java.util.UUID, @Body importEdit: ImportEdit? = null): Response<ImportRow>

    /**
     * GET api/imports/{id}
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
     * @return [ImportRow]
     */
    @GET("api/imports/{id}")
    suspend fun getImport(@Path("id") id: java.util.UUID): Response<ImportRow>

    /**
     * POST api/imports/groups
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
     * @param groupInput  (optional)
     * @return [ScanResult]
     */
    @POST("api/imports/groups")
    suspend fun groupDrafts(@Body groupInput: GroupInput? = null): Response<ScanResult>


    /**
    * enum for parameter stage
    */
    enum class StageListImports(val value: kotlin.String) {
        @Json(name = "pending") PENDING("pending"),
        @Json(name = "reviewed") REVIEWED("reviewed"),
        @Json(name = "published") PUBLISHED("published")
    }


    /**
    * enum for parameter status
    */
    enum class StatusListImports(val value: kotlin.String) {
        @Json(name = "episode") EPISODE("episode"),
        @Json(name = "all") ALL("all"),
        @Json(name = "pending") PENDING("pending"),
        @Json(name = "missing") MISSING("missing"),
        @Json(name = "blocked") BLOCKED("blocked"),
        @Json(name = "failed") FAILED("failed"),
        @Json(name = "unbound") UNBOUND("unbound"),
        @Json(name = "lookupFailed") LOOKUP_FAILED("lookupFailed"),
        @Json(name = "retrieved") RETRIEVED("retrieved"),
        @Json(name = "reviewed") REVIEWED("reviewed"),
        @Json(name = "published") PUBLISHED("published")
    }

    /**
     * GET api/imports
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
     * @param groupId  (optional)
     * @param stage  (optional)
     * @param q  (optional)
     * @param page  (optional, default to 1)
     * @param pageSize  (optional, default to 24)
     * @param status  (optional)
     * @return [ImportQueue]
     */
    @GET("api/imports")
    suspend fun listImports(@Query("groupId") groupId: java.util.UUID? = null, @Query("stage") stage: StageListImports? = null, @Query("q") q: kotlin.String? = null, @Query("page") page: kotlin.Int? = 1, @Query("pageSize") pageSize: kotlin.Int? = 24, @Query("status") status: StatusListImports? = null): Response<ImportQueue>

    /**
     * GET api/sources
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
     * @return [kotlin.collections.List<SourceProvider>]
     */
    @GET("api/sources")
    suspend fun listSourceProviders(): Response<kotlin.collections.List<SourceProvider>>

    /**
     * POST api/imports/{id}/lookup
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
     * @param runLookup  (optional)
     * @return [ScanResult]
     */
    @POST("api/imports/{id}/lookup")
    suspend fun lookupDraftMetadata(@Path("id") id: java.util.UUID, @Body runLookup: RunLookup? = null): Response<ScanResult>

    /**
     * POST api/imports/manual
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
     * @param manualFile  (optional)
     * @return [ScanResult]
     */
    @POST("api/imports/manual")
    suspend fun manualFile(@Body manualFile: ManualFile? = null): Response<ScanResult>

    /**
     * POST api/imports/targets
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
     * @param targetPlan  (optional)
     * @return [PlanCount]
     */
    @POST("api/imports/targets")
    suspend fun planStorageTargets(@Body targetPlan: TargetPlan? = null): Response<PlanCount>

    /**
     * POST api/imports/{id}/publish
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
     * @param revisionInput  (optional)
     * @return [ImportRow]
     */
    @POST("api/imports/{id}/publish")
    suspend fun publishImport(@Path("id") id: java.util.UUID, @Body revisionInput: RevisionInput? = null): Response<ImportRow>

    /**
     * POST api/imports/{id}/publish-edition
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
     * @param publishEdition  (optional)
     * @return [ImportRow]
     */
    @POST("api/imports/{id}/publish-edition")
    suspend fun publishImportAsEdition(@Path("id") id: java.util.UUID, @Body publishEdition: PublishEdition? = null): Response<ImportRow>

    /**
     * POST api/imports/{id}/review
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
     * @param revisionInput  (optional)
     * @return [ImportRow]
     */
    @POST("api/imports/{id}/review")
    suspend fun reviewImport(@Path("id") id: java.util.UUID, @Body revisionInput: RevisionInput? = null): Response<ImportRow>

    /**
     * POST api/imports/scan
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
     * @return [ScanResult]
     */
    @POST("api/imports/scan")
    suspend fun scanLocalFiles(): Response<ScanResult>

    /**
     * PUT api/storage/inbox
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
     * @param downloadDirectory  (optional)
     * @return [DirectoryView]
     */
    @PUT("api/storage/inbox")
    suspend fun setDownloadDirectory(@Body downloadDirectory: DownloadDirectory? = null): Response<DirectoryView>

    /**
     * DELETE api/imports/groups/{id}
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
     * @return [ScanResult]
     */
    @DELETE("api/imports/groups/{id}")
    suspend fun ungroupDrafts(@Path("id") id: java.util.UUID): Response<ScanResult>

    /**
     * PUT api/imports/groups/{id}
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
     * @param groupInput  (optional)
     * @return [ScanResult]
     */
    @PUT("api/imports/groups/{id}")
    suspend fun updateDraftGroup(@Path("id") id: java.util.UUID, @Body groupInput: GroupInput? = null): Response<ScanResult>

}
