# Android SDK Configuration — hq-mobapp

## Supported: Android 8.0 (API 26) → Android 16 (API 36)

After `flutter pub get`, run once to generate android/ folder, then update:

### android/app/build.gradle
```groovy
android {
    compileSdk 36
    defaultConfig {
        applicationId "ph.healthqueue.app"
        minSdk 26        // Android 8.0 minimum
        targetSdk 36     // Android 16 target
    }
}
```

### AndroidManifest.xml — required permissions
```xml
<uses-permission android:name="android.permission.INTERNET" />
```
For local dev only (HTTP not HTTPS):
```xml
<application android:usesCleartextTraffic="true" ...>
```
Remove cleartext for production — use HTTPS.

### Package compatibility (all support Android 8-16)
- flutter_secure_storage ^9.0.0 — needs API 23+  ✅
- http, provider, google_fonts, intl, flutter_dotenv — pure Dart ✅
- shared_preferences ^2.2.3 — API 16+ ✅
- url_launcher ^6.2.6 — API 16+ ✅
