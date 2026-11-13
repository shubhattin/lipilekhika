# Applied to the apps that use this library when they shrink their code (R8).
# JNA and the generated UniFFI code find their classes, fields and methods by reflection.
-dontwarn java.awt.**
-keep class com.sun.jna.** { *; }
-keepclassmembers class * extends com.sun.jna.** { public *; }
-keep class com.shubhattin.lipilekhika.core.ffi.** { *; }
