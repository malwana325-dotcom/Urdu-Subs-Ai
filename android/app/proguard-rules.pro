# Commercial R8 / ProGuard keep rules for Urdu Localizer (Capacitor 8)
-keepattributes SourceFile,LineNumberTable,*Annotation*,Signature,InnerClasses,EnclosingMethod

# Keep Capacitor core, bridges, plugins, and custom WebView interfaces
-keep class com.getcapacitor.** { *; }
-keepclassmembers class com.getcapacitor.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keep class * extends com.getcapacitor.Plugin { *; }

# Keep app package & JavascriptInterface methods
-keep class com.urdudubber.app.** { *; }
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep WebView & AndroidX reflection hooks safe
-keepclassmembers class * extends android.webkit.WebViewClient {
    public *;
}
-keepclassmembers class * extends android.webkit.WebChromeClient {
    public *;
}

-dontwarn org.apache.cordova.**
