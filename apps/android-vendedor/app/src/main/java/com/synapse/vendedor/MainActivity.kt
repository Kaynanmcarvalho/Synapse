package com.synapse.vendedor
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.synapse.vendedor.data.*
class MainActivity:ComponentActivity(){override fun onCreate(state:Bundle?){super.onCreate(state);setContent{MaterialTheme{ConflictScreen((application as SynapseApp).db.offlineDao())}}}}
@OptIn(ExperimentalMaterial3Api::class)
@Composable fun ConflictScreen(dao:OfflineDao){val conflicts by dao.conflicts().collectAsState(initial=emptyList());Scaffold(topBar={TopAppBar(title={Text("Pedidos para revisar")})}){padding->LazyColumn(Modifier.padding(padding).padding(16.dp),verticalArrangement=Arrangement.spacedBy(12.dp)){items(conflicts,key={it.localId}){order->Card{Column(Modifier.padding(16.dp)){Text(order.state);Text(order.conflictReason?:"O servidor ajustou o pedido");Text("Pedido ${order.localId.take(8)}")}}}}}}
