package com.wuxinbo.videox.core

import com.squareup.moshi.Json
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import com.wuxinbo.videox.api.apis.CatalogApi
import com.wuxinbo.videox.api.apis.IdentityApi
import com.wuxinbo.videox.api.apis.PersonalApi
import com.wuxinbo.videox.api.infrastructure.UUIDAdapter
import okhttp3.OkHttpClient
import retrofit2.Converter
import retrofit2.Response
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import java.lang.reflect.Type
import java.util.concurrent.TimeUnit

// Retrofit's default query conversion uses enum.name, not the OpenAPI wire value.
class EnumQueryConverter : Converter.Factory() {
    override fun stringConverter(type: Type, annotations: Array<out Annotation>, retrofit: Retrofit): Converter<*, String>? {
        if (type !is Class<*> || !type.isEnum) return null
        return Converter<Any, String> { value ->
            val entry = value as Enum<*>
            type.getField(entry.name).getAnnotation(Json::class.java)?.name ?: entry.name
        }
    }
}
class ApiFailure(val status: Int, message: String) : Exception(message)
fun <T> Response<T>.value(): T {
    if (isSuccessful) return body() ?: throw ApiFailure(code(), "服务器返回空响应")
    // Do not display arbitrary server/proxy response bodies or credentials.
    throw ApiFailure(code(), when (code()) {
        401 -> "登录已失效或账号密码不正确"
        409 -> "资料已在别处修改，请刷新后重试"
        400 -> "输入不符合要求，请检查后重试"
        403 -> "当前设备或请求没有访问权限"
        else -> "请求失败（${code()}），请稍后重试"
    })
}
class VideoXClient(private val baseUrl: String, token: () -> String?) {
    private val http = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS).readTimeout(20, TimeUnit.SECONDS)
        .followRedirects(false).followSslRedirects(false)
        .addInterceptor { chain ->
            val request = chain.request().newBuilder()
            token()?.let { request.header("Authorization", "Bearer $it") }
            chain.proceed(request.build())
        }.build()
    private val images = object : android.util.LruCache<java.util.UUID, android.graphics.Bitmap>(20 * 1024) {
        override fun sizeOf(key: java.util.UUID, value: android.graphics.Bitmap) = maxOf(1, value.allocationByteCount / 1024)
    }
    suspend fun artwork(id: java.util.UUID): android.graphics.Bitmap? = kotlinx.coroutines.withContext(kotlinx.coroutines.Dispatchers.IO) {
        images.get(id)?.let { return@withContext it }
        val request = okhttp3.Request.Builder().url(baseUrl.trimEnd('/') + "/api/art/" + id).build()
        http.newCall(request).execute().use { response ->
            if (!response.isSuccessful) return@withContext null
            val bytes = response.body?.bytes() ?: return@withContext null
            val bounds=android.graphics.BitmapFactory.Options().apply { inJustDecodeBounds=true }
            android.graphics.BitmapFactory.decodeByteArray(bytes,0,bytes.size,bounds)
            var scale=1
            while(maxOf(bounds.outWidth,bounds.outHeight)/scale>1200) scale*=2
            android.graphics.BitmapFactory.decodeByteArray(bytes,0,bytes.size,android.graphics.BitmapFactory.Options().apply {inSampleSize=scale})?.also {images.put(id,it)}
        }
    }
    private val moshi = Moshi.Builder().add(UUIDAdapter()).addLast(KotlinJsonAdapterFactory()).build()
    private val retrofit = Retrofit.Builder().baseUrl(baseUrl).client(http)
        .addConverterFactory(EnumQueryConverter())
        // Personal-state writes send a complete versioned snapshot. Explicit rating=null clears it.
        // Do not use partially populated generated PATCH models for future metadata editing.
        .addConverterFactory(MoshiConverterFactory.create(moshi).withNullSerialization()).build()
    val identity: IdentityApi = retrofit.create(IdentityApi::class.java)
    val catalog: CatalogApi = retrofit.create(CatalogApi::class.java)
    val playback = retrofit.create(com.wuxinbo.videox.api.apis.PlaybackApi::class.java)
    val personal: PersonalApi = retrofit.create(PersonalApi::class.java)
    fun cancel() = http.dispatcher.cancelAll()
}
