package com.wuxinbo.videox

import android.os.Bundle
import androidx.activity.enableEdgeToEdge
import androidx.activity.SystemBarStyle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge(
            statusBarStyle = SystemBarStyle.dark(android.graphics.Color.TRANSPARENT),
            navigationBarStyle = SystemBarStyle.dark(android.graphics.Color.TRANSPARENT)
        )
        setContent {
            MaterialTheme(colorScheme = cinemaColors) {
                Surface(Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) { LibraryApp() }
            }
        }
    }
}
@Composable fun LoginView(vm: LibraryViewModel) {
    var address by rememberSaveable { mutableStateOf(vm.server) }
    var username by rememberSaveable { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    Column(Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).padding(top = 36.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Text("连接我的片库", style = MaterialTheme.typography.headlineSmall)
        OutlinedTextField(address, { address = it }, label = { Text("服务器地址") }, singleLine = true, modifier = Modifier.fillMaxWidth())
        OutlinedTextField(username, { username = it }, label = { Text("账号") }, singleLine = true, modifier = Modifier.fillMaxWidth())
        OutlinedTextField(password, { password = it }, label = { Text("密码") }, visualTransformation = PasswordVisualTransformation(), singleLine = true, modifier = Modifier.fillMaxWidth())
        Button(onClick = { vm.login(address, username, password); password = "" }, enabled = !vm.busy && username.isNotBlank() && password.isNotEmpty(), modifier = Modifier.fillMaxWidth()) { Text("进入片库") }
        Text("连接自己的 video-x 服务，影片与个人状态会在设备间同步。", color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}
