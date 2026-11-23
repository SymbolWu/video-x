package com.wuxinbo.videox

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.saveable.rememberSaveableStateHolder
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.blur
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.wuxinbo.videox.api.models.Media
import java.util.UUID
import kotlinx.coroutines.CancellationException

internal fun durationLabel(ms:Long)=if(ms<60000)"${ms/1000} 秒" else "${(ms+30000)/60000} 分钟"
internal val Bg=Color(0xFF111214)
internal val Panel=Color(0xFF1D1F25)
internal val Chip=Color(0xFF25272D)
internal val TextColor=Color(0xFFE9E9EC)
internal val Dim=Color(0xFF9A9CA5)
internal val Pink=Color(0xFFEAA1B5)
internal val Lavender=Color(0xFFBAC2FC)
internal val Gold=Color(0xFFDFC69A)
internal val cinemaColors=darkColorScheme(primary=Lavender,onPrimary=Bg,secondary=Pink,background=Bg,surface=Panel,onSurface=TextColor,onBackground=TextColor)
@Composable internal fun Glyph(id:Int,label:String?=null,size:Int=20,color:Color=TextColor){Icon(painterResource(id),label,Modifier.size(size.dp),tint=color)}
@Composable internal fun Art(vm:LibraryViewModel,id:UUID?,label:String,modifier:Modifier){
    val bmp by produceState<android.graphics.Bitmap?>(null,id,vm.server){
        value=null
        if(id!=null)try {value=vm.artwork(id)} catch(e:CancellationException){throw e} catch(_:java.io.IOException){}
    }
    Box(modifier.background(Chip),contentAlignment=Alignment.Center){
        bmp?.let { Image(it.asImageBitmap(),label,Modifier.fillMaxSize(),contentScale=ContentScale.Crop) } ?: Glyph(R.drawable.vx_grid,null,20,Dim.copy(alpha=.55f))
    }
}
@Composable internal fun SmallButton(id:Int,label:String,action:()->Unit,color:Color=TextColor){IconButton(onClick=action,modifier=Modifier.size(44.dp)){Glyph(id,label,20,color)}}
@Composable internal fun Choice(label:String,selected:Boolean,action:()->Unit,modifier:Modifier=Modifier){
    Box(modifier.heightIn(min=42.dp).clip(RoundedCornerShape(7.dp)).background(if(selected) Color(0xFF382D34) else Chip).clickable(onClick=action).padding(horizontal=12.dp,vertical=8.dp),contentAlignment=Alignment.Center){
        Text(label,color=if(selected) Pink else TextColor,fontSize=12.sp,maxLines=2)
    }
}
@Composable fun LibraryApp(vm:LibraryViewModel=viewModel()){
    val holder=rememberSaveableStateHolder()
    var search by rememberSaveable {mutableStateOf(false)}
    var sheet by rememberSaveable {mutableStateOf("")}
    var wide by rememberSaveable {mutableStateOf(false)}
    var newFolder by rememberSaveable {mutableStateOf(false)}
    val navs=listOf("发现" to R.drawable.vx_discover,"片库" to R.drawable.vx_grid,"收藏" to R.drawable.vx_heart,"我的" to R.drawable.vx_user)
    BackHandler(enabled=vm.detail!=null||vm.scope!=null||search||vm.nav!="片库"){
        when{vm.detail!=null->vm.dismiss();vm.scope!=null->vm.backScope();search->{search=false;vm.search("")};else->vm.navigate("片库")}
    }
    Box(Modifier.fillMaxSize().background(Bg).then(if(sheet=="filters"||sheet=="sort")Modifier.blur(4.dp) else Modifier).safeDrawingPadding()){
        if(vm.profile==null){Column(Modifier.padding(horizontal=18.dp)){LoginView(vm);vm.error?.let{Text(it,color=Pink)}}}
        else if(vm.detail!=null){key(vm.detail!!.id){FilmDetail(vm,{sheet="collection"})}}
        else Column(Modifier.fillMaxSize()){
            Row(Modifier.fillMaxWidth().height(62.dp).padding(horizontal=12.dp),verticalAlignment=Alignment.CenterVertically){
                if(vm.scope!=null) SmallButton(R.drawable.vx_arrow,"返回",{vm.backScope()})
                else Row(Modifier.padding(start=4.dp,end=9.dp),verticalAlignment=Alignment.CenterVertically){Text("v",fontWeight=FontWeight.Black,fontSize=24.sp);Text("×",color=Pink,fontWeight=FontWeight.Black,fontSize=22.sp)}
                Text(vm.scope?.name?:vm.nav,Modifier.weight(1f),fontSize=21.sp,fontWeight=FontWeight.SemiBold,maxLines=1,overflow=TextOverflow.Ellipsis)
                SmallButton(R.drawable.vx_search,"搜索片库",{if(vm.nav!="片库")vm.navigate("片库");search=!search;if(!search)vm.search("")})
                Box(Modifier.size(44.dp).clickable{vm.navigate("我的")},contentAlignment=Alignment.Center){Box(Modifier.size(31.dp).background(Chip,CircleShape),contentAlignment=Alignment.Center){Text(vm.profile!!.displayName.take(1),fontSize=12.sp,color=Dim)}}
            }
            if(search) OutlinedTextField(vm.query,vm::search,Modifier.fillMaxWidth().padding(horizontal=16.dp),placeholder={Text("搜索影片或演员")},singleLine=true,trailingIcon={SmallButton(R.drawable.vx_close,"关闭搜索",{search=false;vm.search("")})})
            vm.error?.let{Text(it,color=Pink,modifier=Modifier.clickable{vm.refresh()}.padding(horizontal=16.dp))}
            Box(Modifier.weight(1f)){
                val listKey="${vm.nav}/${vm.section}/${vm.scope}/${vm.page}"
                holder.SaveableStateProvider(listKey){
                    LazyColumn(contentPadding=PaddingValues(start=16.dp,end=16.dp,bottom=18.dp),verticalArrangement=Arrangement.spacedBy(12.dp)){
                        if(vm.nav=="我的"){
                            item { Column(Modifier.fillMaxWidth().padding(start=5.dp,top=28.dp,bottom=14.dp)) {
                                Box(Modifier.size(70.dp).background(Chip,CircleShape),contentAlignment=Alignment.Center){Text(vm.profile!!.displayName.take(1),fontSize=26.sp)}
                                Text(vm.profile!!.displayName,Modifier.padding(top=19.dp),fontWeight=FontWeight.SemiBold,fontSize=22.sp)
                                Row(Modifier.padding(top=24.dp,bottom=12.dp),horizontalArrangement=Arrangement.spacedBy(32.dp)){
                                    listOf("影片" to vm.facts?.films,"喜欢" to vm.facts?.favorites,"已看" to vm.facts?.watched).forEach{(label,value)->Column{Text((value?:0).toString(),fontSize=24.sp);Text(label,color=Dim,fontSize=12.sp)}}
                                }
                            }}
                            item{MenuLine(R.drawable.vx_folder,"我的收藏"){vm.navigate("收藏")};MenuLine(R.drawable.vx_check,"看过的影片"){vm.navigate("片库");vm.rules(null,FilmConditions(watched=true),"createdAt",false)};MenuLine(R.drawable.vx_user,"退出登录",vm::logout)}
                        }else{
                          if(vm.nav=="发现"){
                            vm.movies.firstOrNull()?.let{m->item{Box(Modifier.fillMaxWidth().padding(top=10.dp).height(270.dp).clip(RoundedCornerShape(12.dp)).clickable{vm.open(m.id)}){
                                Art(vm,m.backdropId?:m.posterId,m.title,Modifier.fillMaxSize())
                                Box(Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(Color.Transparent,Color.Black.copy(alpha=.85f)))))
                                Column(Modifier.align(Alignment.BottomStart).padding(20.dp)){Text("片库精选",fontSize=11.sp,color=Dim);Text(m.title,Modifier.padding(vertical=7.dp),fontSize=28.sp,fontWeight=FontWeight.Bold);Text(listOfNotNull(m.releaseYear?.toString(),m.categoryName,m.durationMs?.let{"${(it+30000)/60000} 分钟"}).joinToString(" · "),fontSize=12.sp,color=Dim);Button(onClick={vm.open(m.id)},shape=RoundedCornerShape(9.dp),modifier=Modifier.padding(top=12.dp)){Glyph(R.drawable.vx_play,null,15,Bg);Text("  查看影片")}}
                            }}}
                            if(vm.continuing.isNotEmpty()){item{Text("继续观看",Modifier.padding(top=12.dp),fontSize=18.sp)};items(vm.continuing){m->Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(8.dp)).background(Panel).clickable{vm.open(m.id)}.padding(10.dp),verticalAlignment=Alignment.CenterVertically){Art(vm,m.backdropId?:m.posterId,m.title,Modifier.size(84.dp,55.dp).clip(RoundedCornerShape(6.dp)));Column(Modifier.weight(1f).padding(horizontal=10.dp)){Text(m.title,fontSize=14.sp);Text("看到 "+playbackClock(m.resumeMs?:0L),fontSize=11.sp,color=Dim)};Glyph(R.drawable.vx_play)}}}
                            item{Text("最近添加",Modifier.padding(top=12.dp),fontSize=18.sp)}
                          }else{
                            if(vm.nav=="收藏"&&vm.scope==null){
                              items(vm.collections){f->Row(Modifier.fillMaxWidth().height(104.dp).clickable{vm.explore(Scope(f.name,collection=f.id))},verticalAlignment=Alignment.CenterVertically){Art(vm,f.coverId,f.name,Modifier.size(54.dp,66.dp).clip(RoundedCornerShape(5.dp)));Column(Modifier.weight(1f).padding(start=16.dp)){Text(f.name,fontSize=16.sp);Text(listOfNotNull("${f.mediaIds.size} 部影片",f.description).joinToString(" · "),color=Dim,fontSize=12.sp)};Glyph(R.drawable.vx_chevron)}}
                              item{Row(verticalAlignment=Alignment.CenterVertically){Text("我喜欢的",Modifier.weight(1f),fontSize=17.sp);TextButton(onClick={newFolder=true}){Text("新建收藏夹",fontSize=12.sp)}}}
                            }
                            item{
                              if(vm.nav=="片库"&&vm.scope==null){
                                Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.spacedBy(22.dp)){
                                  listOf(Section.MEDIA,Section.PEOPLE,Section.SERIES).forEach{section->Column(Modifier.clickable{vm.select(section)}.height(45.dp),verticalArrangement=Arrangement.SpaceBetween,horizontalAlignment=Alignment.CenterHorizontally){Text(section.label,Modifier.padding(top=10.dp),fontSize=15.sp,color=if(vm.section==section)TextColor else Dim);if(vm.section==section)Spacer(Modifier.size(18.dp,2.dp).background(Pink))}}
                                };HorizontalDivider(color=Chip)
                              }
                              Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()).padding(top=12.dp),horizontalArrangement=Arrangement.spacedBy(8.dp)){
                                Choice("全部",vm.category==null,{vm.rules(null,vm.extra,vm.sort,vm.ascending)})
                                vm.categories.filter{it.isVisible}.forEach{c->Choice(c.name,vm.category==c.id,{vm.rules(c.id,vm.extra,vm.sort,vm.ascending)})}
                              }
                              Row(Modifier.fillMaxWidth().height(47.dp),verticalAlignment=Alignment.CenterVertically,horizontalArrangement=Arrangement.spacedBy(6.dp)){
                                Text("${vm.total} "+when(vm.section){Section.MEDIA->"部影片";Section.PEOPLE->"位演员";else->"个系列"},Modifier.weight(1f),fontSize=11.sp,color=Dim)
                                if(vm.section==Section.MEDIA)Tool(R.drawable.vx_grid,if(wide)"海报" else "横图"){wide=!wide}
                                Tool(R.drawable.vx_sort,(if(vm.sort=="createdAt")if(vm.ascending)"最早添加" else "最近添加" else librarySortOptions(vm.section).firstOrNull{it.first==vm.sort}?.second.orEmpty())+if(vm.ascending)" ↑" else " ↓"){sheet="sort"}
                                Tool(R.drawable.vx_filter,"筛选"+(vm.extra.count+(if(vm.category!=null)1 else 0)).let{if(it>0)" $it" else ""}){sheet="filters"}
                              }
                            }
                          }
                          when(vm.section){
                           Section.MEDIA->{val columns=if(wide)2 else 3;items((if(vm.nav=="发现")vm.movies.take(6) else vm.movies).chunked(columns)){row->Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.spacedBy(9.dp)){row.forEach{m->FilmCard(vm,m,wide,Modifier.weight(1f))};repeat(columns-row.size){Spacer(Modifier.weight(1f))}}}}
                           Section.PEOPLE->items(vm.people.chunked(3)){row->Row(horizontalArrangement=Arrangement.spacedBy(10.dp)){row.forEach{p->Column(Modifier.weight(1f).clickable{vm.explore(Scope(p.fullName,actor=p.id))},horizontalAlignment=Alignment.CenterHorizontally){Art(vm,p.portraitId,p.fullName,Modifier.fillMaxWidth().aspectRatio(1f).clip(CircleShape));Text(p.fullName,Modifier.padding(top=7.dp),maxLines=1,fontSize=14.sp);Text("${p.categoryName} · ${p.workCount} 部作品",Modifier.padding(bottom=10.dp),fontSize=10.sp,color=Dim)}};repeat(3-row.size){Spacer(Modifier.weight(1f))}}}
                           Section.SERIES->items(vm.series){f->Box(Modifier.fillMaxWidth().aspectRatio(2.17f).clip(RoundedCornerShape(9.dp)).clickable{vm.explore(Scope(f.name,series=f.id))}){Art(vm,f.coverId,f.name,Modifier.fillMaxSize());Box(Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(Color.Transparent,Color.Black.copy(alpha=.82f)))));Column(Modifier.align(Alignment.BottomStart).padding(17.dp)){Text("${f.categoryName} / ${f.workCount} 部作品",color=TextColor,fontSize=11.sp);Text(f.name,Modifier.padding(top=6.dp),fontSize=19.sp,fontWeight=FontWeight.SemiBold)};Box(Modifier.align(Alignment.BottomEnd).padding(16.dp)){Glyph(R.drawable.vx_chevron)}}}
                           else->Unit
                          }
                          if(vm.total==0&&!vm.busy)item{Text("暂无符合条件的资料",Modifier.padding(vertical=32.dp),color=Dim)}
                          if(vm.total>24&&vm.nav!="发现")item{Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.SpaceBetween){TextButton(onClick={vm.move(-1)},enabled=vm.page>1){Text("上一页")};TextButton(onClick={vm.move(1)},enabled=vm.page*24<vm.total){Text("下一页")}}}
                        }
                    }
                }
            }
            HorizontalDivider(color=Chip)
            Row(Modifier.fillMaxWidth().height(70.dp).background(Color(0xFF17181D))){
              navs.forEach{(name,icon)->Column(Modifier.weight(1f).fillMaxHeight().clickable{search=false;vm.navigate(name)},verticalArrangement=Arrangement.Center,horizontalAlignment=Alignment.CenterHorizontally){Glyph(icon,name,21,if(vm.nav==name) Pink else Dim);Text(name,fontSize=11.sp,color=if(vm.nav==name) TextColor else Dim)}}
            }
        }
    }
    if(sheet=="filters"||sheet=="sort") CinemaFilters(vm,sheet=="sort"){sheet=""}
    if(sheet=="collection"&&vm.detail!=null) FolderSheet(vm,{sheet=""},{newFolder=true})
    if(newFolder) FolderDialog(vm){newFolder=false}
    vm.playback?.let{key(it.sessionId){PlaybackScreen(vm,it)}}
}
@Composable private fun Tool(icon:Int,text:String,onClick:()->Unit){ Row(Modifier.heightIn(min=44.dp).clickable(onClick=onClick).padding(horizontal=2.dp),verticalAlignment=Alignment.CenterVertically){Glyph(icon,null,14,Dim);Text(" "+text,fontSize=11.sp,color=Dim)}}
@Composable private fun FilmCard(vm:LibraryViewModel,m:Media,wide:Boolean,modifier:Modifier){
 Column(modifier.clickable{vm.open(m.id)}){
    Box(Modifier.fillMaxWidth().aspectRatio(if(wide)1.6f else 1/1.48f).clip(RoundedCornerShape(9.dp))){
      Art(vm,if(wide)m.backdropId?:m.posterId else m.posterId?:m.backdropId,m.title,Modifier.fillMaxSize())
      Box(Modifier.align(Alignment.TopEnd)){SmallButton(if(m.isFavorite)R.drawable.vx_heart_filled else R.drawable.vx_heart,if(m.isFavorite)"取消喜欢" else "喜欢",{vm.like(m)},if(m.isFavorite)Pink else Color.White)}
      m.durationMs?.let{Badge(durationLabel(it),Modifier.align(Alignment.BottomEnd).padding(5.dp))}
      if(m.watchedAt!=null)Badge("✓ 已看",Modifier.align(Alignment.BottomStart).padding(5.dp))
    }
    Text(m.title,Modifier.padding(top=7.dp),fontSize=14.sp,fontWeight=FontWeight.Medium,maxLines=1,overflow=TextOverflow.Ellipsis)
    Row(Modifier.fillMaxWidth(),verticalAlignment=Alignment.CenterVertically){Text("${m.releaseYear?:"—"} · ${m.categoryName}",Modifier.weight(1f),fontSize=10.sp,color=Dim,maxLines=1);m.rating?.let{Text("★ $it",fontSize=10.sp,color=Gold)}}
 }
}
@Composable private fun Badge(text:String,modifier:Modifier){Text(text,modifier.background(Color.Black.copy(alpha=.57f),RoundedCornerShape(4.dp)).padding(horizontal=4.dp,vertical=1.dp),fontSize=9.sp,lineHeight=13.sp,color=Color.White)}

@Composable private fun MenuLine(icon:Int,label:String,action:()->Unit){
 HorizontalDivider(color=Chip)
 Row(Modifier.fillMaxWidth().height(61.dp).clickable(onClick=action).padding(horizontal=5.dp),verticalAlignment=Alignment.CenterVertically){Glyph(icon,null,18,Dim);Text(label,Modifier.weight(1f).padding(start=12.dp),fontSize=14.sp);Glyph(R.drawable.vx_chevron,null,15,Dim)}
}
