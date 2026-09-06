package com.synapse.vendedor.sync
import android.content.Context
import androidx.work.*
import com.google.firebase.auth.FirebaseAuth
import com.synapse.vendedor.data.*
import retrofit2.http.*
import java.time.Instant
import java.util.UUID
data class SyncResponse(val localId:String,val status:String,val orderId:String?,val reason:String?)
data class SessionResponse(val id:String)
interface SyncApi{@POST("api/v1/auth/sessions") suspend fun session(@Header("Authorization") bearer:String,@Body payload:Map<String,String>):SessionResponse;@POST("api/v1/sales/offline-sync/orders") suspend fun order(@Header("Authorization") bearer:String,@Header("X-Device-Session") session:String,@Body payload:Map<String,@JvmSuppressWildcards Any>):SyncResponse;@POST("api/v1/notifications/devices") suspend fun device(@Header("Authorization") bearer:String,@Header("X-Device-Session") session:String,@Body payload:Map<String,String>):Map<String,String>}
class OfflineOrderRepository(private val dao:OfflineDao,private val work:WorkManager){suspend fun create(customerId:String,branchId:String,warehouseId:String,payloadJson:String):OfflineOrder{val id=UUID.randomUUID().toString();val now=Instant.now().toString();return OfflineOrder(id,customerId,branchId,warehouseId,payloadJson,"android-order:$id",now,now,1).also{dao.save(it);work.enqueueUniqueWork("offline-order-sync",ExistingWorkPolicy.KEEP,OneTimeWorkRequestBuilder<OrderSyncWorker>().setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()).build())}}}
class OrderSyncWorker(context:Context,params:WorkerParameters):CoroutineWorker(context,params){override suspend fun doWork():Result{val app=applicationContext as com.synapse.vendedor.SynapseApp;val user=FirebaseAuth.getInstance().currentUser?:return Result.retry();val session=app.sessions.read()?:return Result.retry();val token=com.google.android.gms.tasks.Tasks.await(user.getIdToken(false)).token.orEmpty();for(order in app.db.offlineDao().pending()){try{val response=app.api.order("Bearer $token",session,app.payloads.decode(order));app.db.offlineDao().update(order.localId,response.status,response.reason,Instant.now().toString())}catch(e:Exception){return Result.retry()}};return Result.success()}}
