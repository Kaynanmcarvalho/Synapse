package com.synapse.vendedor.push

import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import com.google.android.gms.tasks.Tasks
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.synapse.vendedor.SynapseApp
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

class SynapseMessagingService : FirebaseMessagingService() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    override fun onMessageReceived(message: RemoteMessage) {
        val manager = getSystemService(NotificationManager::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            manager.createNotificationChannel(
                NotificationChannel(CHANNEL, "Alertas do Synapse", NotificationManager.IMPORTANCE_DEFAULT),
            )
        }
        val notification = android.app.Notification.Builder(this, CHANNEL)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(message.notification?.title ?: "Synapse")
            .setContentText(message.notification?.body)
            .setAutoCancel(true)
            .build()
        manager.notify(message.data["entityKey"]?.hashCode() ?: message.messageId.hashCode(), notification)
    }

    override fun onNewToken(token: String) {
        val app = application as SynapseApp
        val session = app.sessions.read() ?: return
        val user = FirebaseAuth.getInstance().currentUser ?: return
        scope.launch {
            runCatching {
                val idToken = Tasks.await(user.getIdToken(false)).token.orEmpty()
                app.api.device("Bearer $idToken", session, mapOf("token" to token, "platform" to "android"))
            }
        }
    }

    companion object { private const val CHANNEL = "synapse-alerts" }
}
