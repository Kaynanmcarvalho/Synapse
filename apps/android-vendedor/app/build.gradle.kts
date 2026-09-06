plugins { id("com.android.application"); id("org.jetbrains.kotlin.android"); id("org.jetbrains.kotlin.plugin.compose"); id("com.google.devtools.ksp") }
android { namespace="com.synapse.vendedor"; compileSdk=35
 defaultConfig { applicationId="com.synapse.vendedor"; minSdk=26; targetSdk=35; versionCode=1; versionName="0.1.0" }
 buildFeatures { compose=true }; compileOptions { sourceCompatibility=JavaVersion.VERSION_17; targetCompatibility=JavaVersion.VERSION_17 }; kotlinOptions { jvmTarget="17" }
}
if (file("google-services.json").exists()) apply(plugin="com.google.gms.google-services")
dependencies {
 implementation(platform("com.google.firebase:firebase-bom:33.7.0")); implementation("com.google.firebase:firebase-auth-ktx"); implementation("com.google.firebase:firebase-firestore-ktx"); implementation("com.google.firebase:firebase-messaging-ktx")
 implementation("androidx.activity:activity-compose:1.10.0"); implementation("androidx.compose.material3:material3:1.3.1"); implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.7")
 implementation("androidx.room:room-runtime:2.6.1"); implementation("androidx.room:room-ktx:2.6.1"); ksp("androidx.room:room-compiler:2.6.1"); implementation("androidx.work:work-runtime-ktx:2.10.0")
 implementation("com.squareup.retrofit2:retrofit:2.11.0"); implementation("com.squareup.retrofit2:converter-gson:2.11.0")
 testImplementation("junit:junit:4.13.2")
}
