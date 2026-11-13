# Applied to the apps that use this library when they shrink their code (R8).
# The Rust library calls the native methods by their names (Java_<class>_<method>) and throws the
# exceptions by their class names.
-keepclasseswithmembernames,includedescriptorclasses class com.shubhattin.lipilekhika.core.** {
    native <methods>;
}
-keep class com.shubhattin.lipilekhika.core.LipiException** { <init>(java.lang.String); }
