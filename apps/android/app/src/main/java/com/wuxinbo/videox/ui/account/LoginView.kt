package com.wuxinbo.videox.ui.account

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import com.wuxinbo.videox.LibraryViewModel

@Composable
fun LoginView(vm: LibraryViewModel) {
    var address by rememberSaveable { mutableStateOf(vm.server) }
    var username by rememberSaveable { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    Column(
        Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).padding(top = 36.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Text("连接我的片库", style = MaterialTheme.typography.headlineSmall)
        OutlinedTextField(
            address,
            { address = it },
            label = { Text("服务器地址") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
        )
        OutlinedTextField(
            username,
            { username = it },
            label = { Text("账号") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
        )
        OutlinedTextField(
            password,
            { password = it },
            label = { Text("密码") },
            visualTransformation = PasswordVisualTransformation(),
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
        )
        Button(
            onClick = {
                vm.login(address, username, password)
                password = ""
            },
            enabled = !vm.busy && username.isNotBlank() && password.isNotEmpty(),
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text("进入片库")
        }
        Text("连接自己的 video-x 服务，影片与个人状态会在设备间同步。", color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}
