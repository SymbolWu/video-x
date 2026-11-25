package com.wuxinbo.videox.ui.library

import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.wuxinbo.videox.LibraryViewModel
import com.wuxinbo.videox.R
import com.wuxinbo.videox.Section
import com.wuxinbo.videox.ui.components.Chip
import com.wuxinbo.videox.ui.components.Dim
import com.wuxinbo.videox.ui.components.Panel
import com.wuxinbo.videox.ui.components.Pink
import com.wuxinbo.videox.ui.components.SmallButton
import com.wuxinbo.videox.ui.components.TextColor
import kotlinx.coroutines.CancellationException

data class FilmConditions(
    val favorite: Boolean? = null,
    val watched: Boolean? = null,
    val year: Int? = null,
    val rating: Int? = null,
    val episodesOnly: Boolean = false,
) {
    val count: Int
        get() =
            listOf(favorite, watched, year, rating).count { it != null } +
                if (episodesOnly) 1 else 0
}

fun librarySortOptions(section: Section) =
    if (section == Section.MEDIA)
        listOf("createdAt" to "添加时间", "name" to "名称", "year" to "发行年份", "rating" to "我的评分")
    else listOf("createdAt" to "添加时间", "name" to "名称", "count" to "作品数量")

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CinemaFilters(vm: LibraryViewModel, sortOnly: Boolean, close: () -> Unit) {
    var f by remember { mutableStateOf(vm.extra) }
    var category by remember { mutableStateOf(vm.category) }
    var order by remember { mutableStateOf(vm.sort) }
    var asc by remember { mutableStateOf(vm.ascending) }
    var count by remember { mutableStateOf<Int?>(vm.total) }
    LaunchedEffect(f, category) {
        if (vm.section == Section.MEDIA) {
            count = null
            try {
                count = vm.preview(category, f)
            } catch (e: CancellationException) {
                throw e
            } catch (_: Exception) {}
        }
    }
    ModalBottomSheet(
        onDismissRequest = close,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        containerColor = Panel,
        contentColor = TextColor,
        dragHandle = {
            Box(Modifier.fillMaxWidth().height(22.dp), contentAlignment = Alignment.Center) {
                Box(Modifier.size(32.dp, 3.dp).background(Dim, RoundedCornerShape(2.dp)))
            }
        },
    ) {
        Column(
            Modifier.fillMaxWidth()
                .heightIn(
                    max =
                        (LocalConfiguration.current.screenHeightDp * (if (sortOnly) .50f else .85f))
                            .dp
                )
        ) {
            Row(
                Modifier.fillMaxWidth().padding(horizontal = 20.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    if (sortOnly) "排序方式" else "筛选${vm.section.label}",
                    Modifier.weight(1f),
                    fontSize = 19.sp,
                )
                SmallButton(R.drawable.vx_close, "关闭", close)
            }
            Column(
                Modifier.weight(1f, fill = false)
                    .verticalScroll(rememberScrollState())
                    .padding(horizontal = 20.dp, vertical = 10.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                if (!sortOnly) {
                    val cats = vm.categories.filter { it.isVisible }
                    Choices(
                        "分类 · 单选",
                        listOf("全部") + cats.map { it.name },
                        cats.indexOfFirst { it.id == category } + 1,
                    ) {
                        category = cats.getOrNull(it - 1)?.id
                    }
                    if (vm.section == Section.MEDIA) {
                        Choices(
                            "观看状态",
                            listOf("全部", "未看", "已看"),
                            listOf(null, false, true).indexOf(f.watched),
                        ) {
                            f = f.copy(watched = listOf(null, false, true)[it])
                        }
                        Choices(
                            "喜欢状态",
                            listOf("全部", "已喜欢", "未喜欢"),
                            listOf(null, true, false).indexOf(f.favorite),
                        ) {
                            f = f.copy(favorite = listOf(null, true, false)[it])
                        }
                        val years = vm.facts?.years.orEmpty()
                        Choices(
                            "发行年份",
                            listOf("全部") + years.map { it.toString() },
                            years.indexOf(f.year) + 1,
                        ) {
                            f = f.copy(year = years.getOrNull(it - 1))
                        }
                        Choices("作品范围", listOf("全部", "仅分集"), if (f.episodesOnly) 1 else 0) {
                            f = f.copy(episodesOnly = it == 1)
                        }
                        Choices(
                            "我的评分",
                            listOf("全部", "未评分") + (1..5).map { "${it} 星及以上" },
                            (f.rating ?: -1) + 1,
                        ) {
                            f = f.copy(rating = (it - 1).takeIf { n -> n >= 0 })
                        }
                    }
                }
                val sorts = librarySortOptions(vm.section)
                Choices("排序依据", sorts.map { it.second }, sorts.indexOfFirst { it.first == order }) {
                    order = sorts[it].first
                    asc = order == "name"
                }
                Choices("排列方向", listOf("降序 ↓", "升序 ↑"), if (asc) 1 else 0) { asc = it == 1 }
            }
            HorizontalDivider(color = Chip)
            Row(
                Modifier.fillMaxWidth().padding(14.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                TextButton(
                    onClick = {
                        category = null
                        f = FilmConditions()
                        order = if (vm.section == Section.MEDIA) "createdAt" else "count"
                        asc = false
                    },
                    modifier = Modifier.width(74.dp),
                ) {
                    Text("重置", color = Dim)
                }
                Button(
                    onClick = {
                        vm.rules(category, f, order, asc)
                        close()
                    },
                    modifier = Modifier.weight(1f).height(48.dp),
                    shape = RoundedCornerShape(10.dp),
                ) {
                    Text(
                        if (vm.section == Section.MEDIA && count != null) "查看 ${count} 部影片  ›"
                        else "应用条件  ›"
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun Choices(title: String, list: List<String>, selected: Int, choose: (Int) -> Unit) {
    Text(title, Modifier.padding(top = 10.dp, bottom = 4.dp), color = Dim, fontSize = 12.sp)
    val columns =
        when (title) {
            "分类 · 单选",
            "发行年份" -> 5
            "观看状态",
            "喜欢状态" -> 3
            "排序依据" -> list.size
            else -> 2
        }
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        list.chunked(columns).forEachIndexed { row, labels ->
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                labels.forEachIndexed { col, label ->
                    val index = row * columns + col
                    val active = index == selected
                    Box(
                        Modifier.weight(1f)
                            .heightIn(min = 44.dp)
                            .clip(RoundedCornerShape(7.dp))
                            .background(if (active) Color(0xFF382D34) else Chip)
                            .clickable { choose(index) }
                            .padding(2.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(
                            label + if (active) " ✓" else "",
                            color = if (active) Pink else TextColor,
                            fontSize = 12.sp,
                        )
                    }
                }
                repeat(columns - labels.size) { Spacer(Modifier.weight(1f)) }
            }
        }
    }
}
