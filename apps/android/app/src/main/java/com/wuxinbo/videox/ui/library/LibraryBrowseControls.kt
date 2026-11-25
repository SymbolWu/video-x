package com.wuxinbo.videox.ui.library

import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.wuxinbo.videox.LibraryViewModel
import com.wuxinbo.videox.R
import com.wuxinbo.videox.Scope
import com.wuxinbo.videox.Section
import com.wuxinbo.videox.ui.components.Art
import com.wuxinbo.videox.ui.components.Chip
import com.wuxinbo.videox.ui.components.Choice
import com.wuxinbo.videox.ui.components.Dim
import com.wuxinbo.videox.ui.components.Glyph
import com.wuxinbo.videox.ui.components.Pink
import com.wuxinbo.videox.ui.components.TextColor

internal fun LazyListScope.libraryBrowseControls(
    vm: LibraryViewModel,
    wide: Boolean,
    toggleCovers: () -> Unit,
    openSheet: (String) -> Unit,
    newFolder: () -> Unit,
) {
    if (vm.nav == "收藏" && vm.scope == null) {
        items(vm.collections) { f ->
            Row(
                Modifier.fillMaxWidth().height(104.dp).clickable {
                    vm.explore(Scope(f.name, collection = f.id))
                },
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Art(
                    vm,
                    f.coverId,
                    f.name,
                    Modifier.size(54.dp, 66.dp).clip(RoundedCornerShape(5.dp)),
                )
                Column(Modifier.weight(1f).padding(start = 16.dp)) {
                    Text(f.name, fontSize = 16.sp)
                    Text(
                        listOfNotNull("${f.mediaIds.size} 部影片", f.description).joinToString(" · "),
                        color = Dim,
                        fontSize = 12.sp,
                    )
                }
                Glyph(R.drawable.vx_chevron)
            }
        }
        item {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("我喜欢的", Modifier.weight(1f), fontSize = 17.sp)
                TextButton(onClick = { newFolder() }) { Text("新建收藏夹", fontSize = 12.sp) }
            }
        }
    }
    item {
        if (vm.nav == "片库" && vm.scope == null) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(22.dp)) {
                listOf(Section.MEDIA, Section.PEOPLE, Section.SERIES).forEach { section ->
                    Column(
                        Modifier.clickable { vm.select(section) }.height(45.dp),
                        verticalArrangement = Arrangement.SpaceBetween,
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        Text(
                            section.label,
                            Modifier.padding(top = 10.dp),
                            fontSize = 15.sp,
                            color = if (vm.section == section) TextColor else Dim,
                        )
                        if (vm.section == section)
                            Spacer(Modifier.size(18.dp, 2.dp).background(Pink))
                    }
                }
            }
            HorizontalDivider(color = Chip)
        }
        Row(
            Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()).padding(top = 12.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Choice("全部", vm.category == null, { vm.rules(null, vm.extra, vm.sort, vm.ascending) })
            vm.categories
                .filter { it.isVisible }
                .forEach { c ->
                    Choice(
                        c.name,
                        vm.category == c.id,
                        { vm.rules(c.id, vm.extra, vm.sort, vm.ascending) },
                    )
                }
        }
        Row(
            Modifier.fillMaxWidth().height(47.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            Text(
                "${vm.total} " +
                    when (vm.section) {
                        Section.MEDIA -> "部影片"
                        Section.PEOPLE -> "位演员"
                        else -> "个系列"
                    },
                Modifier.weight(1f),
                fontSize = 11.sp,
                color = Dim,
            )
            if (vm.section == Section.MEDIA)
                Tool(R.drawable.vx_grid, if (wide) "海报" else "横图") { toggleCovers() }
            Tool(
                R.drawable.vx_sort,
                (if (vm.sort == "createdAt") if (vm.ascending) "最早添加" else "最近添加"
                else
                    librarySortOptions(vm.section)
                        .firstOrNull { it.first == vm.sort }
                        ?.second
                        .orEmpty()) + if (vm.ascending) " ↑" else " ↓",
            ) {
                openSheet("sort")
            }
            Tool(
                R.drawable.vx_filter,
                "筛选" +
                    (vm.extra.count + (if (vm.category != null) 1 else 0)).let {
                        if (it > 0) " $it" else ""
                    },
            ) {
                openSheet("filters")
            }
        }
    }
}
