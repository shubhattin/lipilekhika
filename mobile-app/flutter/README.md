# Lipi Lekhika mobile app (Flutter, old)

The first version of the Android app (up to `mobile-app@v0.2.7`), written in Flutter with the Dart package ([`packages/dart`](../../packages/dart)). It is kept here for reference; the app is now the native one in [`mobile-app/android`](../android) (Kotlin, Jetpack Compose).

- `release_mobile_app.yml` is the **old CI build pipeline** of this Flutter app (split APKs, a universal APK and an AAB). It is not active here: copy it to `.github/workflows/` to use it again. Its paths point to this folder.
- Its changelog (up to 0.2.7) is in [`mobile-app/CHANGELOG.md`](../CHANGELOG.md).

```sh
flutter pub get
flutter run            # on a connected device or emulator
dart format .          # format
```

The Dart bindings have to be generated first, see [`packages/dart`](../../packages/dart) (`rebuild.sh`).
