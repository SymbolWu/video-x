package com.wuxinbo.videox.ui.playback

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.wuxinbo.videox.api.models.EditionInfo
import com.wuxinbo.videox.ui.components.Choice
import com.wuxinbo.videox.ui.components.Panel
import java.util.UUID

@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun EditionSheet(
    editions: List<EditionInfo>,
    selected: UUID?,
    dismiss: () -> Unit,
    choose: (UUID) -> Unit,
) {
    ModalBottomSheet(onDismissRequest = dismiss, containerColor = Panel) {
        Column(
            Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Text("播放版本", style = MaterialTheme.typography.titleMedium)
            editions.forEach { edition ->
                val label = listOfNotNull(edition.name, edition.height?.let { "${it}p" }).joinToString(" · ")
                Choice(label, selected == edition.id, { choose(edition.id) }, Modifier.fillMaxWidth().heightIn(min = 48.dp))
            }
        }
    }
}
