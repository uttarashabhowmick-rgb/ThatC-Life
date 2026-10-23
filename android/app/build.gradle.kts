plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}
android {
    namespace = "life.thatc.tv"
    compileSdk = 34
    defaultConfig {
        applicationId = "life.thatc.tv"
        minSdk = 22          // Fire OS 5 (Fire TV Stick Gen 1/2) and up
        targetSdk = 33       // Fire OS 7/8
        versionCode = 1
        versionName = "1.0"
        val url = (project.findProperty("thatcUrl") as String?) ?: "http://10.0.2.2:8787/tv/"
        buildConfigField("String", "THATC_URL", "\"$url\"")
    }
    buildFeatures { buildConfig = true }
    compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
    kotlinOptions { jvmTarget = "17" }
}
dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.appcompat:appcompat:1.7.0")
}
