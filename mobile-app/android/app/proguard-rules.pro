# Flutter/Dart specific rules
-keep class io.flutter.** { *; }
-keep class io.flutter.plugins.** { *; }

# Firebase
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }

# Socket.IO
-keep class io.socket.** { *; }
-keep class okhttp3.** { *; }

# Gson / JSON
-keepattributes Signature
-keepattributes *Annotation*
-keep class com.google.gson.** { *; }
-keep class * implements com.google.gson.TypeAdapterFactory
-keep class * implements com.google.gson.JsonSerializer
-keep class * implements com.google.gson.JsonDeserializer

# Prevent stripping Flutter secure storage
-keep class com.it_nomads.fluttersecurestorage.** { *; }
