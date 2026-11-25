package com.wuxinbo.videox.ui.collections

import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.wuxinbo.videox.LibraryViewModel
import com.wuxinbo.videox.ui.components.Choice
import com.wuxinbo.videox.ui.components.Panel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FolderSheet(vm: LibraryViewModel, close: () -> Unit, create: () -> Unit) {
    ModalBottomSheet(onDismissRequest = close, containerColor = Panel) {
        Column(
            Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Text("加入收藏夹", fontSize = 19.sp)
            vm.collections.forEach { f ->
                Choice(
                    f.name + " · " + f.mediaIds.size + " 部影片",
                    vm.detail?.id in f.mediaIds,
                    { vm.toggleCollection(f) },
                    Modifier.fillMaxWidth(),
                )
            }
            TextButton(onClick = create) { Text("新建收藏夹") }
            Button(onClick = close, modifier = Modifier.fillMaxWidth()) { Text("完成") }
        }
    }
}

@Composable
fun FolderDialog(vm: LibraryViewModel, close: () -> Unit) {
    var name by remember { mutableStateOf("") }
    AlertDialog(
        onDismissRequest = close,
        title = { Text("新建收藏夹") },
        text = {
            OutlinedTextField(name, { name = it }, label = { Text("名称") }, singleLine = true)
        },
        confirmButton = {
            TextButton(
                enabled = name.isNotBlank() && !vm.saving,
                onClick = { vm.createCollection(name, close) },
            ) {
                Text("创建")
            }
        },
        dismissButton = { TextButton(onClick = close) { Text("取消") } },
    )
}
