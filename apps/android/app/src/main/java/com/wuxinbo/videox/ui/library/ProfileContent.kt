package com.wuxinbo.videox.ui.library

import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.wuxinbo.videox.LibraryViewModel
import com.wuxinbo.videox.R
import com.wuxinbo.videox.ui.components.Chip
import com.wuxinbo.videox.ui.components.Dim

internal fun LazyListScope.profileContent(vm: LibraryViewModel) {
    item {
        Column(Modifier.fillMaxWidth().padding(start = 5.dp, top = 28.dp, bottom = 14.dp)) {
            Box(
                Modifier.size(70.dp).background(Chip, CircleShape),
                contentAlignment = Alignment.Center,
            ) {
                Text(vm.profile!!.displayName.take(1), fontSize = 26.sp)
            }
            Text(
                vm.profile!!.displayName,
                Modifier.padding(top = 19.dp),
                fontWeight = FontWeight.SemiBold,
                fontSize = 22.sp,
            )
            Row(
                Modifier.padding(top = 24.dp, bottom = 12.dp),
                horizontalArrangement = Arrangement.spacedBy(32.dp),
            ) {
                listOf(
                        "影片" to vm.facts?.films,
                        "喜欢" to vm.facts?.favorites,
                        "已看" to vm.facts?.watched,
                    )
                    .forEach { (label, value) ->
                        Column {
                            Text((value ?: 0).toString(), fontSize = 24.sp)
                            Text(label, color = Dim, fontSize = 12.sp)
                        }
                    }
            }
        }
    }
    item {
        MenuLine(R.drawable.vx_folder, "我的收藏") { vm.navigate("收藏") }
        MenuLine(R.drawable.vx_check, "看过的影片") {
            vm.navigate("片库")
            vm.rules(null, FilmConditions(watched = true), "createdAt", false)
        }
        MenuLine(R.drawable.vx_user, "退出登录", vm::logout)
    }
}
