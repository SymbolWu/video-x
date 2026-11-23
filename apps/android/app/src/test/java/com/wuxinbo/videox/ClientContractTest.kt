package com.wuxinbo.videox

import com.wuxinbo.videox.api.apis.CatalogApi
import com.wuxinbo.videox.api.models.MediaStatePatch
import com.wuxinbo.videox.core.VideoXClient
import kotlinx.coroutines.runBlocking
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.Assert.*
import org.junit.Test
import java.util.UUID
import java.util.concurrent.TimeUnit

class ClientContractTest {
    @Test fun queryEnumsUseWireValuesAndBearerIsPresent() = runBlocking {
        MockWebServer().use { server ->
            server.enqueue(MockResponse().setBody("""{"items":[],"page":1,"pageSize":24,"total":0}"""))
            val response = VideoXClient(server.url("/").toString()) { "test-session" }.catalog.listMedia(sort = CatalogApi.SortListMedia.CREATED_AT, direction = CatalogApi.DirectionListMedia.ASC)
            assertTrue(response.isSuccessful)
            val request = server.takeRequest(2, TimeUnit.SECONDS)!!
            assertEquals("createdAt", request.requestUrl!!.queryParameter("sort"))
            assertEquals("asc", request.requestUrl!!.queryParameter("direction"))
            assertEquals("Bearer test-session", request.getHeader("Authorization"))
        }
    }
    @Test fun clearingRatingSendsNullAndPreservesOtherPersonalStates() = runBlocking {
        MockWebServer().use { server ->
            server.enqueue(MockResponse().setResponseCode(409).setBody("{}"))
            val id = UUID.fromString("50000000-0000-4000-8000-000000000001")
            VideoXClient(server.url("/").toString()) { "test-session" }.personal.updateMediaState(id, MediaStatePatch(3, true, null, false))
            val request = server.takeRequest(2, TimeUnit.SECONDS)!!
            val body = request.body.readUtf8()
            assertEquals("/api/media/$id/state", request.path)
            assertTrue(body.contains("\"rating\":null"))
            assertTrue(body.contains("\"isFavorite\":true"))
            assertTrue(body.contains("\"watched\":false"))
            assertTrue(body.contains("\"expectedRevision\":3"))
        }
    }
    @Test fun redirectDoesNotForwardCredentials() = runBlocking {
        MockWebServer().use { server -> MockWebServer().use { destination ->
            server.enqueue(MockResponse().setResponseCode(302).addHeader("Location", destination.url("/api/auth/me")))
            val response = VideoXClient(server.url("/").toString()) { "secret" }.identity.getProfile()
            assertEquals(302, response.code())
            assertEquals(0, destination.requestCount)
        } }
    }
    @Test fun nullableFieldsAndUuidDecodeFromServer() = runBlocking {
        MockWebServer().use { server ->
            server.enqueue(MockResponse().setBody("""[{"id":"20000000-0000-4000-8000-000000000001","name":"未分类","parentId":null,"isVisible":true,"revision":1}]"""))
            val result = VideoXClient(server.url("/").toString()) { null }.catalog.listCategories().body()!!
            assertEquals(UUID.fromString("20000000-0000-4000-8000-000000000001"), result.single().id)
            assertNull(result.single().parentId)
        }
    }
}
