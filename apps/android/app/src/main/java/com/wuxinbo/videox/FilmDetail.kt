package com.wuxinbo.videox

import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable fun FilmDetail(vm:LibraryViewModel,collections:()->Unit){
 val m=vm.detail?:return
 var playbackOptions by remember{mutableStateOf(false)}
 Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState())){
    Box(Modifier.fillMaxWidth().height(310.dp)){
      Art(vm,m.backdropId?:m.posterId,m.title,Modifier.fillMaxSize())
      Box(Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(Color.Transparent,Bg))))
      Row(Modifier.fillMaxWidth().padding(12.dp),horizontalArrangement=Arrangement.SpaceBetween){
        Box(Modifier.background(Color.Black.copy(alpha=.4f),CircleShape)){SmallButton(R.drawable.vx_arrow,"返回列表",vm::dismiss)}
        Row(horizontalArrangement=Arrangement.spacedBy(6.dp)){
          if(vm.playPlan?.mode=="resume"||vm.playMessage!=null) Box{Box(Modifier.background(Color.Black.copy(alpha=.4f),CircleShape)){SmallButton(R.drawable.vx_dots,"播放选项",{playbackOptions=true})};DropdownMenu(expanded=playbackOptions,onDismissRequest={playbackOptions=false}){DropdownMenuItem(text={Text("从头播放")},onClick={playbackOptions=false;vm.startPlayer(true)})}}
          Box(Modifier.background(Color.Black.copy(alpha=.4f),CircleShape)){SmallButton(R.drawable.vx_heart,"喜欢影片",{vm.state(favorite=!m.isFavorite)},if(m.isFavorite)Pink else Color.White)}}
      }
      Column(Modifier.align(Alignment.BottomStart).padding(horizontal=22.dp,vertical=12.dp)){
          Text("${m.categoryName} / ${m.releaseYear?:"年份未知"}",fontSize=12.sp,color=Dim)
          Text(m.title,Modifier.padding(vertical=5.dp),fontSize=31.sp,fontWeight=FontWeight.SemiBold)
          Text(listOfNotNull(m.durationMs?.let{durationLabel(it)},if(m.watchedAt!=null)"已看过" else "未看").joinToString(" · "),fontSize=12.sp,color=Dim)
      }
    }
    Column(Modifier.fillMaxWidth().padding(horizontal=22.dp),verticalArrangement=Arrangement.spacedBy(12.dp)){
       Row(Modifier.fillMaxWidth(),verticalAlignment=Alignment.CenterVertically,horizontalArrangement=Arrangement.spacedBy(9.dp)){
         val plan=vm.playPlan;val bound=(m.linkedFileCount?:0)>0
         Button(onClick={m.episodes?.firstOrNull()?.let{vm.open(it.id)}?:vm.startPlayer()},enabled=(bound||!m.episodes.isNullOrEmpty())&&!vm.busy,modifier=Modifier.weight(1f).height(47.dp),shape=RoundedCornerShape(10.dp)){
           Glyph(R.drawable.vx_play,null,16,Bg);Text(" "+if(!m.episodes.isNullOrEmpty())"选择分集" else if(!bound)"尚未关联视频" else if(plan?.mode=="resume")"继续播放 · ${playbackClock(plan.positionMs)}" else if(plan?.completed==true)"重新播放" else "播放影片",fontSize=14.sp)
         }
         Column(Modifier.width(51.dp).clickable(onClick=collections),horizontalAlignment=Alignment.CenterHorizontally){Glyph(R.drawable.vx_folder);Text("收藏夹",fontSize=10.sp,color=Dim)}
       }
       m.episodes.orEmpty().forEach{e->Choice("第 ${e.episodeNumber} 集　${e.title}",false,{vm.open(e.id)},Modifier.fillMaxWidth())}

       (vm.error?:vm.playMessage)?.let{Text(it,color=Pink,fontSize=12.sp)}
       Row(Modifier.fillMaxWidth().padding(vertical=12.dp),verticalAlignment=Alignment.CenterVertically){
        Column(Modifier.weight(1f)){Text("我的评分",color=Dim,fontSize=11.sp);Row{(1..5).forEach{n->Box(Modifier.size(36.dp,44.dp).clickable{vm.state(rating=if(m.rating==n)null else n)},contentAlignment=Alignment.Center){Glyph(if(n<=(m.rating?:0))R.drawable.vx_star_filled else R.drawable.vx_star,"$n 星",19,if(n<=(m.rating?:0)) Gold else Dim)}}}}
        Choice(if(m.watchedAt!=null)"✓ 已看过" else "✓ 标记已看",m.watchedAt!=null,{vm.state(watched=m.watchedAt==null)})
       }
       HorizontalDivider(color=Chip);Text("故事简介",Modifier.padding(top=10.dp),fontSize=16.sp,fontWeight=FontWeight.SemiBold)
       Text(m.summary?:"暂无简介",color=Dim,fontSize=13.sp,lineHeight=22.sp)
       if(m.actors.isNotEmpty()){Text("主要演员",fontSize=16.sp,fontWeight=FontWeight.SemiBold);Row(Modifier.horizontalScroll(rememberScrollState()),horizontalArrangement=Arrangement.spacedBy(14.dp)){m.actors.forEach{p->Column(Modifier.width(70.dp).clickable{vm.explore(Scope(p.fullName,actor=p.id))},horizontalAlignment=Alignment.CenterHorizontally){Art(vm,p.portraitId,p.fullName,Modifier.size(54.dp).clip(CircleShape));Text(p.fullName,Modifier.padding(top=5.dp),color=Dim,fontSize=12.sp,maxLines=2)}}}}
       if(m.franchises.isNotEmpty()){Text("所属系列",fontSize=16.sp,fontWeight=FontWeight.SemiBold);m.franchises.forEach{f->Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(8.dp)).background(Panel).clickable{vm.explore(Scope(f.name,series=f.id))}.padding(8.dp),verticalAlignment=Alignment.CenterVertically){Art(vm,f.coverId,f.name,Modifier.size(64.dp,46.dp));Column(Modifier.weight(1f).padding(start=9.dp)){Text(f.name,fontSize=14.sp);Text("${f.workCount} 部作品 · 查看完整系列",fontSize=11.sp,color=Dim)};Glyph(R.drawable.vx_chevron)}}}
       Spacer(Modifier.height(20.dp))
    }
 }
}
@OptIn(ExperimentalMaterial3Api::class)
@Composable fun FolderSheet(vm:LibraryViewModel,close:()->Unit,create:()->Unit){
 ModalBottomSheet(onDismissRequest=close,containerColor=Panel){Column(Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).padding(18.dp),verticalArrangement=Arrangement.spacedBy(10.dp)){
   Text("加入收藏夹",fontSize=19.sp)
   vm.collections.forEach{f->Choice(f.name+" · "+f.mediaIds.size+" 部影片",vm.detail?.id in f.mediaIds,{vm.toggleCollection(f)},Modifier.fillMaxWidth())}
   TextButton(onClick=create){Text("新建收藏夹")};Button(onClick=close,modifier=Modifier.fillMaxWidth()){Text("完成")}
 }}
}
@Composable fun FolderDialog(vm:LibraryViewModel,close:()->Unit){
 var name by remember{mutableStateOf("")}
 AlertDialog(onDismissRequest=close,title={Text("新建收藏夹")},text={OutlinedTextField(name,{name=it},label={Text("名称")},singleLine=true)},confirmButton={TextButton(enabled=name.isNotBlank()&&!vm.saving,onClick={vm.createCollection(name,close)}){Text("创建")}},dismissButton={TextButton(onClick=close){Text("取消")}})
}
