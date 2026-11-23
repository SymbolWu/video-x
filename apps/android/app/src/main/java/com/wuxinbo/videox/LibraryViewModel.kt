package com.wuxinbo.videox

import android.app.Application
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.wuxinbo.videox.api.apis.CatalogApi
import com.wuxinbo.videox.api.models.*
import com.wuxinbo.videox.api.models.Collection as MediaCollection
import com.wuxinbo.videox.core.*
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import okhttp3.HttpUrl.Companion.toHttpUrl
import java.util.UUID

enum class Section(val label: String) { MEDIA("影片"), PEOPLE("演员"), SERIES("系列"), COLLECTIONS("收藏夹") }
data class Scope(val name: String, val actor: UUID? = null, val series: UUID? = null, val collection: UUID? = null)
class LibraryViewModel(application: Application) : AndroidViewModel(application) {
    private val store = SessionStore(application)
    private var token = store.read()
    private var client = VideoXClient(store.server) { token }
    private var request: Job? = null
    private var mutation: Job? = null
    var server by mutableStateOf(store.server); private set
    var profile by mutableStateOf<Profile?>(null); private set
    var busy by mutableStateOf(false); private set
    var saving by mutableStateOf(false); private set
    var error by mutableStateOf<String?>(null); private set
    var section by mutableStateOf(Section.MEDIA); private set
    var categories by mutableStateOf<List<Category>>(emptyList()); private set
    var nav by mutableStateOf("片库"); private set
    var extra by mutableStateOf(FilmConditions()); private set
    var facts by mutableStateOf<BrowseFacts?>(null); private set
    var continuing by mutableStateOf<List<Media>>(emptyList()); private set
    private data class BrowsePosition(val nav:String,val section:Section,val category:UUID?,val extra:FilmConditions,val sort:String,val ascending:Boolean,val page:Int,val query:String,val scope:Scope?,val detail:UUID?)
    private val history=ArrayDeque<BrowsePosition>()
    fun navigate(to:String){
        if(saving)return
        history.clear();detail=null;nav=to;extra=FilmConditions();category=null;ascending=false
        select(Section.MEDIA)
    }
    fun rules(categoryId:UUID?,filters:FilmConditions,order:String,asc:Boolean) {extra=filters;applyFilters(categoryId,order,asc)}
    suspend fun preview(categoryId:UUID?,f:FilmConditions):Int = client.catalog.listMedia(q=query,categoryId=categoryId,episodesOnly=f.episodesOnly.takeIf{it},
        favorite=if(nav=="收藏" && scope==null) true else f.favorite,watched=f.watched,year=f.year,ratingMin=f.rating?.takeIf{it>0},unrated=if(f.rating==0) true else null,
        actorId=scope?.actor,franchiseId=scope?.series,collectionId=scope?.collection,pageSize=1).value().total
    suspend fun artwork(id:UUID)=client.artwork(id)
    fun like(m:Media)=mutate {client.personal.updateMediaState(m.id,MediaStatePatch(m.stateRevision,!m.isFavorite,m.rating,m.watchedAt!=null)).value()}
    var category by mutableStateOf<UUID?>(null); private set
    var query by mutableStateOf(""); private set
    var sort by mutableStateOf("createdAt"); private set
    var ascending by mutableStateOf(false); private set
    var page by mutableStateOf(1); private set
    var total by mutableStateOf(0); private set
    var scope by mutableStateOf<Scope?>(null); private set
    var movies by mutableStateOf<List<Media>>(emptyList()); private set
    var people by mutableStateOf<List<Person>>(emptyList()); private set
    var series by mutableStateOf<List<Franchise>>(emptyList()); private set
    var collections by mutableStateOf<List<MediaCollection>>(emptyList()); private set
    var detail by mutableStateOf<MediaDetail?>(null); private set
    init { if (token != null) runRequest { profile = client.identity.getProfile().value(); initialLoad() } }
    private fun failure(t: Throwable) {
        if (t is CancellationException) throw t
        if (t is ApiFailure && t.status == 401) { store.clear(); token = null; profile = null; detail = null; movies = emptyList(); people = emptyList(); series = emptyList(); collections = emptyList() }
        error = if (t is ApiFailure || t is IllegalArgumentException) t.message else "无法连接服务器，请检查地址和网络"
    }
    private fun runRequest(block: suspend () -> Unit) {
        request?.cancel()
        request = viewModelScope.launch { busy = true; error = null; try { block() } catch(t: Throwable) { failure(t) } finally { busy = false } }
    }
    private suspend fun initialLoad() {facts=client.catalog.getBrowseFacts().value(); categories = client.catalog.listCategories().value(); collections = client.personal.listCollections().value(); load() }
    fun login(address: String, username: String, password: String) = runRequest {
        val url = address.trim().toHttpUrl()
        require(url.encodedPath == "/" && url.query == null && url.fragment == null && url.username.isEmpty() && url.password.isEmpty()) { "请填写服务器根地址，例如 https://media.example.com/" }
        require(url.isHttps || (BuildConfig.DEBUG && url.host in setOf("10.0.2.2", "127.0.0.1", "localhost"))) { "请使用 HTTPS；开发包只允许本机调试地址使用 HTTP" }
        client.cancel(); token = null; store.clear()
        client = VideoXClient(url.toString()) { token }
        val result = client.identity.login(Login(username, password, store.installationId, Login.ClientKind.ANDROID, android.os.Build.MODEL)).value()
        val session = requireNotNull(result.token) { "服务器没有返回移动端会话" }
        store.server = url.toString(); store.save(session); server = store.server; token = session; profile = result.profile
        initialLoad()
    }
    fun logout() {
        if (saving) return
        runRequest {
            client.identity.logout().value()
            store.clear(); token = null; profile = null; detail = null
            movies = emptyList(); people = emptyList(); series = emptyList(); collections = emptyList(); scope = null; query = ""; page = 1
        }
    }
    fun select(next: Section) { if (saving) return; section = next; scope = null; extra=FilmConditions();page = 1; sort = if(next==Section.PEOPLE || next==Section.SERIES) "count" else "createdAt"; query = ""; refresh() }
    fun applyFilters(nextCategory: UUID?, nextSort: String, nextAscending: Boolean) {
        if (saving) return
        require(librarySortOptions(section).any { it.first == nextSort })
        category = nextCategory
        sort = nextSort
        ascending = nextAscending
        page = 1
        refresh()
    }
    fun search(text: String) { query = text; page = 1; refresh() }
    fun move(delta: Int) { page = (page + delta).coerceAtLeast(1); refresh() }
    fun explore(next: Scope?) {
        history.addLast(BrowsePosition(nav,section,category,extra,sort,ascending,page,query,scope,detail?.id))
        nav="片库";detail=null;scope=next;section=Section.MEDIA;category=null;extra=FilmConditions();query="";page=1;sort=if(next?.actor!=null) "year" else "createdAt";ascending=false;refresh()
    }
    fun backScope(){
        val old=history.removeLastOrNull() ?: return navigate("片库")
        nav=old.nav;section=old.section;category=old.category;extra=old.extra;sort=old.sort;ascending=old.ascending;page=old.page;query=old.query;scope=old.scope
        runRequest {load();old.detail?.let { detail=client.catalog.getMedia(it).value();playPlan=null;if((detail?.linkedFileCount?:0)>0)loadPlan(it) }}
    }
    fun refresh() { if (!saving) runRequest { load() } }
    private suspend fun load() {
        if(nav=="发现")continuing=client.catalog.listMedia(resumable=true,sort=CatalogApi.SortListMedia.entries.first{it.value=="lastPlayed"},pageSize=6).value().items
        when (section) {
            Section.MEDIA -> {
                val result = client.catalog.listMedia(q = query, categoryId = category,episodesOnly=extra.episodesOnly.takeIf{it}, favorite=if(nav=="收藏"&&scope==null)true else extra.favorite, watched=extra.watched,year=extra.year,ratingMin=extra.rating?.takeIf{it>0},unrated=if(extra.rating==0)true else null,
                    sort = CatalogApi.SortListMedia.entries.first { it.value == sort },
                    direction = if(ascending) CatalogApi.DirectionListMedia.ASC else CatalogApi.DirectionListMedia.DESC,
                    page = page, pageSize = 24, actorId = scope?.actor, franchiseId = scope?.series, collectionId = scope?.collection).value()
                movies = result.items; total = result.total
            }
            Section.PEOPLE -> {
                val result = client.catalog.listPeople(q = query, categoryId = category,
                    sort = CatalogApi.SortListPeople.entries.first { it.value == sort },
                    direction = if(ascending) CatalogApi.DirectionListPeople.ASC else CatalogApi.DirectionListPeople.DESC, page = page, pageSize = 24).value()
                people = result.items; total = result.total
            }
            Section.SERIES -> {
                val result = client.catalog.listFranchises(q = query, categoryId = category,
                    sort = CatalogApi.SortListFranchises.entries.first { it.value == sort },
                    direction = if(ascending) CatalogApi.DirectionListFranchises.ASC else CatalogApi.DirectionListFranchises.DESC, page = page, pageSize = 24).value()
                series = result.items; total = result.total
            }
            Section.COLLECTIONS -> { collections = client.personal.listCollections().value(); total = collections.size }
        }
    }
    var playPlan by mutableStateOf<PlaybackPlan?>(null); private set
    var playback by mutableStateOf<PlaybackSession?>(null); private set
    var playMessage by mutableStateOf<String?>(null); private set
    private val outbox = PlaybackOutbox(application)
    private val sequence = mutableMapOf<UUID, Int>()
    private fun scopeFor(id: UUID) = "${store.server}/${profile?.id}/$id"
    private suspend fun loadPlan(id: UUID) {
        val scope = scopeFor(id)
        outbox.flush(scope, client.playback, null)
        val result = client.playback.getPlaybackPlan(PlaybackRequest(id, PlaybackRequest.Intent.PLAY)).value()
        if (detail?.id == id) playPlan = result
    }
    fun open(id: UUID) = runRequest {
        playPlan = null; playMessage = null
        collections = client.personal.listCollections().value()
        detail = client.catalog.getMedia(id).value()
        if ((detail?.linkedFileCount ?: 0) > 0) try { loadPlan(id) } catch(e: Exception) {
            if(e is CancellationException) throw e
            playMessage = "文件或断点暂不可用，请检查媒体目录。"
        }
    }
    fun startPlayer(restart: Boolean = false) {
        val id = detail?.id ?: return
        if (busy || playback != null) return
        runRequest {
            outbox.flush(scopeFor(id), client.playback, null)
            val intent = if (restart) PlaybackOpen.Intent.RESTART else if(playPlan?.mode == "resume") PlaybackOpen.Intent.RESUME else PlaybackOpen.Intent.PLAY
            val session = client.playback.openPlayback(PlaybackOpen(id, intent, UUID.randomUUID())).value()
            if (detail?.id != id) { client.playback.closePlayback(session.sessionId); return@runRequest }
            sequence[session.sessionId] = 0
            playMessage = null
            playback = session
        }
    }
    @androidx.annotation.OptIn(androidx.media3.common.util.UnstableApi::class)
    fun mediaSource(session: PlaybackSession): androidx.media3.exoplayer.source.MediaSource {
        val streamPath = "/api/playback/sessions/${session.sessionId}/stream"
        require(session.streamUrl == streamPath)
        val url = store.server.toHttpUrl().resolve(streamPath)!!
        val source = androidx.media3.datasource.DefaultHttpDataSource.Factory()
            .setDefaultRequestProperties(mapOf("Authorization" to "Bearer $token"))
        val item = androidx.media3.common.MediaItem.fromUri(url.toString())
        return androidx.media3.exoplayer.source.ProgressiveMediaSource.Factory(source).createMediaSource(item)
    }
    fun record(s: PlaybackSession, kind: PlaybackEvent.Kind, ms: Long) {
        if (!sequence.containsKey(s.sessionId)) return
        saveEvent(s, kind, ms.coerceIn(0L, s.durationMs))
    }
    private fun saveEvent(s: PlaybackSession, kind: PlaybackEvent.Kind?, position: Long) {
        val scope = scopeFor(s.mediaId)
        val next = (sequence[s.sessionId] ?: return) + 1
        sequence[s.sessionId] = next
        outbox.enqueue(scope, s, next, kind, position)
        viewModelScope.launch {
            try {
                val status = outbox.flush(scope, client.playback, s.sessionId)
                if (playback?.sessionId == s.sessionId && status in listOf("taken_over", "invalid", "closed")) {
                    sequence.remove(s.sessionId)
                    playback = null
                    playMessage = if(status == "taken_over") "已在其他设备继续播放。" else "请重新打开播放器。"
                } else if (kind == null && detail?.id == s.mediaId && playback == null) loadPlan(s.mediaId)
            } catch(e: Exception) {
                if(e is CancellationException) throw e
                playMessage = "观看进度待同步，恢复连接后重试。"
            }
        }
    }
    fun leavePlayer() { playback = null }
    fun closeAttempt(s: PlaybackSession) {
        saveEvent(s, null, 0)
        sequence.remove(s.sessionId)
    }
    fun dismiss() { if (!saving) detail = null }
    private fun mutate(block: suspend () -> Unit) {
        if (saving) return
        request?.cancel()
        mutation = viewModelScope.launch { saving = true; error = null; try { block(); facts=client.catalog.getBrowseFacts().value();load() } catch(t: Throwable) {
            failure(t)
            if(t is ApiFailure && t.status == 409) { val id = detail?.id; if(id != null) runCatching { client.catalog.getMedia(id).value() }.onSuccess { detail = it } }
        } finally { saving = false } }
    }
    fun state(favorite: Boolean? = detail?.isFavorite, rating: Int? = detail?.rating, watched: Boolean? = detail?.watchedAt?.let { true } ?: false) {
        val current = detail ?: return
        mutate { detail = client.personal.updateMediaState(current.id, MediaStatePatch(current.stateRevision, favorite ?: current.isFavorite, rating, watched ?: false)).value() }
    }
    fun createCollection(name: String, onSaved: () -> Unit) = mutate { client.personal.createCollection(CollectionCreate(name.trim())).value(); collections = client.personal.listCollections().value(); onSaved() }
    fun toggleCollection(collection: MediaCollection) {
        val current = detail ?: return
        mutate { val members = if(current.id in collection.mediaIds) collection.mediaIds - current.id else collection.mediaIds + current.id
            client.personal.setCollectionItems(collection.id, CollectionItems(collection.revision, members.toSet())).value()
            collections = client.personal.listCollections().value()
        }
    }
    override fun onCleared() { client.cancel(); super.onCleared() }
}
