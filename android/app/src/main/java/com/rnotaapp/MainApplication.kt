package com.rnotaapp

import android.app.Application
import java.io.File

import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeHost
import com.facebook.react.defaults.DefaultReactHost
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative

class MainApplication : Application(), ReactApplication {

  override val reactNativeHost: ReactNativeHost =
    object : DefaultReactNativeHost(this) {

      override fun getPackages() = PackageList(this).packages

      override fun getJSMainModuleName() = "index"

      override fun getUseDeveloperSupport() = BuildConfig.DEBUG

      override fun getJSBundleFile(): String? {
        if (BuildConfig.DEBUG) {
          android.util.Log.d("OTA", "using Debug build")
          return super.getJSBundleFile()
        }

        val path = filesDir.absolutePath + "/ota/current/index.bundle"
        val file = File(path)

        if (file.exists() && file.length() > 0) {
          android.util.Log.d("OTA", "Loading OTA bundle: $path")
          return path
        }

        android.util.Log.d("OTA", "Fallback to default bundle")
        return super.getJSBundleFile()
      }
    }

  override val reactHost: ReactHost by lazy {
    DefaultReactHost.getDefaultReactHost(
      applicationContext,
      reactNativeHost // ✅ THIS LINE FIXES EVERYTHING
    )
  }

  override fun onCreate() {
    super.onCreate()
    loadReactNative(this)
  }
}