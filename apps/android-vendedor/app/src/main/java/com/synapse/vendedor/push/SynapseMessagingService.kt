package com.synapse.vendedor.push
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
class SynapseMessagingService:FirebaseMessagingService(){override fun onMessageReceived(message:RemoteMessage){super.onMessageReceived(message)};override fun onNewToken(token:String){super.onNewToken(token)}}
