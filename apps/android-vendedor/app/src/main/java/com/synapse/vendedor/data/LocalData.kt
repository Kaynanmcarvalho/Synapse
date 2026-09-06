package com.synapse.vendedor.data
import androidx.room.*
@Entity data class Customer(@PrimaryKey val id:String,val name:String,val updatedAt:String,val version:Long)
@Entity data class Product(@PrimaryKey val id:String,val name:String,val priceCents:Long,val allowedStock:Long,val updatedAt:String,val version:Long)
@Entity data class Price(@PrimaryKey val productId:String,val cents:Long,val source:String,val updatedAt:String,val version:Long)
@Entity data class AllowedStock(@PrimaryKey val productId:String,val quantity:Long,val updatedAt:String,val version:Long)
@Entity data class OfflineOrder(@PrimaryKey val localId:String,val customerId:String,val branchId:String,val warehouseId:String,val payloadJson:String,val idempotencyKey:String,val createdAt:String,val updatedAt:String,val version:Long,val state:String="PENDING",val conflictReason:String?=null)
@Dao interface OfflineDao { @Query("SELECT * FROM OfflineOrder WHERE state IN ('PENDING','RETRY') ORDER BY createdAt") suspend fun pending():List<OfflineOrder>; @Query("SELECT * FROM OfflineOrder WHERE state IN ('CONFLICT','REJECTED') ORDER BY updatedAt DESC") fun conflicts():kotlinx.coroutines.flow.Flow<List<OfflineOrder>>; @Insert(onConflict=OnConflictStrategy.REPLACE) suspend fun save(order:OfflineOrder); @Query("UPDATE OfflineOrder SET state=:state, conflictReason=:reason, updatedAt=:at, version=version+1 WHERE localId=:id") suspend fun update(id:String,state:String,reason:String?,at:String) }
@Database(entities=[Customer::class,Product::class,Price::class,AllowedStock::class,OfflineOrder::class],version=1,exportSchema=true) abstract class SynapseDatabase:RoomDatabase(){abstract fun offlineDao():OfflineDao}
