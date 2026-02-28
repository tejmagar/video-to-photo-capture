import java.util.Properties
import java.util.Base64

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("rust")
}

val tauriProperties = Properties().apply {
    val propFile = file("tauri.properties")
    if (propFile.exists()) {
        propFile.inputStream().use { load(it) }
    }
}

android {
    compileSdk = 36
    namespace = "tej.videotophoto.capture"
    defaultConfig {
        manifestPlaceholders["usesCleartextTraffic"] = "false"
        applicationId = "tej.videotophoto.capture"
        minSdk = 24
        targetSdk = 36
        versionCode = tauriProperties.getProperty("tauri.android.versionCode", "1").toInt()
        versionName = tauriProperties.getProperty("tauri.android.versionName", "1.0")
    }
    buildTypes {
        getByName("debug") {
            manifestPlaceholders["usesCleartextTraffic"] = "true"
            isDebuggable = true
            isJniDebuggable = true
            isMinifyEnabled = false
            packaging {                
                jniLibs.keepDebugSymbols.add("*/arm64-v8a/*.so")
                jniLibs.keepDebugSymbols.add("*/armeabi-v7a/*.so")
                jniLibs.keepDebugSymbols.add("*/x86/*.so")
                jniLibs.keepDebugSymbols.add("*/x86_64/*.so")
            }
        }
        
        signingConfigs {
            create("release") {
              val isReleaseTask = gradle.startParameter.taskNames.any { it.contains("Release") }
              
              if (isReleaseTask) {
                val keystoreFile = file("${rootProject.projectDir}/release.keystore")
                if (!keystoreFile.exists()) {
                    val keystoreBase64 = System.getenv("KEYSTORE_BASE64")
                        ?: error("KEYSTORE_BASE64 is not set")
                    keystoreFile.parentFile?.mkdirs()
                    val decoded = Base64.getDecoder().decode(keystoreBase64)
                    keystoreFile.writeBytes(decoded)
                }
      
                storeFile = keystoreFile
                storePassword = System.getenv("KEYSTORE_PASSWORD")
                    ?: error("KEYSTORE_PASSWORD is not set")
                keyAlias = System.getenv("KEYSTORE_ALIAS")
                    ?: error("KEYSTORE_ALIAS is not set")
                keyPassword = System.getenv("KEY_PASSWORD")
                    ?: error("KEY_PASSWORD is not set")
              }
            }
        }
    
        buildTypes {
            getByName("release") {
                signingConfig = signingConfigs.getByName("release")
            }
            
            getByName("debug") {
                signingConfig = signingConfigs.getByName("debug")
            }
        }
        
        getByName("release") {
            isMinifyEnabled = true
            proguardFiles(
                *fileTree(".") { include("**/*.pro") }
                    .plus(getDefaultProguardFile("proguard-android-optimize.txt"))
                    .toList().toTypedArray()
            )
        }
    }
    kotlinOptions {
        jvmTarget = "1.8"
    }
    buildFeatures {
        buildConfig = true
    }
}

rust {
    rootDirRel = "../../../"
}

dependencies {
    implementation("androidx.webkit:webkit:1.14.0")
    implementation("androidx.appcompat:appcompat:1.7.1")
    implementation("androidx.activity:activity-ktx:1.10.1")
    implementation("com.google.android.material:material:1.12.0")
    testImplementation("junit:junit:4.13.2")
    androidTestImplementation("androidx.test.ext:junit:1.1.4")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.5.0")
}

apply(from = "tauri.build.gradle.kts")