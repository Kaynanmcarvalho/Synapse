package com.synapse.vendedor
import android.app.Application
import androidx.room.Room
import com.synapse.vendedor.data.*
import com.synapse.vendedor.sync.SyncApi
import com.google.firebase.auth.FirebaseAuth
class SessionStore(app:Application){private val prefs=app.getSharedPreferences("auth",android.content.Context.MODE_PRIVATE);fun read():String?=prefs.getString("session",null);fun save(id:String)=prefs.edit().putString("session",id).apply()}
class AuthRepository(private val api:SyncApi,private val sessions:SessionStore){suspend fun login(email:String,password:String){val auth=FirebaseAuth.getInstance();com.google.android.gms.tasks.Tasks.await(auth.signInWithEmailAndPassword(email,password));val token=com.google.android.gms.tasks.Tasks.await(auth.currentUser!!.getIdToken(false)).token.orEmpty();sessions.save(api.session("Bearer $token",mapOf("deviceId" to "android-vendedor","name" to "Android Vendedor","platform" to "android")).id)}}
class PayloadDecoder{fun decode(order:OfflineOrder):Map<String,Any>{val body=com.google.gson.Gson().fromJson(order.payloadJson,Map::class.java) as Map<String,Any>;return body+mapOf("localId" to order.localId,"idempotencyKey" to order.idempotencyKey,"branchId" to order.branchId,"warehouseId" to order.warehouseId,"customerId" to order.customerId,"createdAt" to order.createdAt,"version" to order.version)}}
class SynapseApp:Application(){lateinit var db:SynapseDatabase;lateinit var api:SyncApi;lateinit var sessions:SessionStore;lateinit var auth:AuthRepository;val payloads=PayloadDecoder();override fun onCreate(){super.onCreate();db=Room.databaseBuilder(this,SynapseDatabase::class.java,"synapse-vendedor.db").build();api=retrofit2.Retrofit.Builder().baseUrl("http://10.0.2.2:3333/").addConverterFactory(retrofit2.converter.gson.GsonConverterFactory.create()).build().create(SyncApi::class.java);sessions=SessionStore(this);auth=AuthRepository(api,sessions)}}
