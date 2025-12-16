# Building Android APK for HashNHedge

## Prerequisites

1. **Node.js** (v18 or higher)
   - Download from: https://nodejs.org/
   - Install and restart your terminal

2. **Java JDK** (JDK 11 or higher)
   - Required for Android builds
   - Download from: https://adoptium.net/ or use Android Studio's bundled JDK

3. **Android SDK** (optional, but recommended)
   - Android Studio: https://developer.android.com/studio
   - Or install command-line tools only

## Quick Build

Run the automated build script:

```powershell
.\build-android-apk.ps1
```

## Manual Build Steps

If you prefer to build manually:

### Step 1: Install Dependencies
```powershell
npm install
```

### Step 2: Build Web Assets
```powershell
npm run build
```
This creates a `dist` folder with the compiled web app.

### Step 3: Sync Capacitor
```powershell
npx cap sync android
```
This copies the web assets to the Android project.

### Step 4: Build APK
```powershell
cd android
.\gradlew.bat assembleRelease
```

The APK will be located at:
```
android\app\build\outputs\apk\release\app-release.apk
```

## Debug APK (for testing)

To build a debug APK instead:
```powershell
cd android
.\gradlew.bat assembleDebug
```

Debug APK location:
```
android\app\build\outputs\apk\debug\app-debug.apk
```

## Troubleshooting

### Node.js not found
- Install Node.js from https://nodejs.org/
- Restart your terminal/PowerShell after installation
- Verify with: `node --version`

### Gradle build fails
- Make sure Java JDK is installed
- Set JAVA_HOME environment variable
- Try: `cd android && .\gradlew.bat clean` then rebuild

### Capacitor sync fails
- Make sure `dist` folder exists (run `npm run build` first)
- Check `capacitor.config.ts` has correct `webDir: 'dist'`

### APK not found
- Check `android\app\build\outputs\apk\` directory
- Look for both `release` and `debug` folders
- Run `.\gradlew.bat clean` and rebuild if needed

## Signing the APK (for Play Store)

To sign your APK for Google Play Store release, you'll need to:
1. Generate a keystore
2. Configure signing in `android/app/build.gradle`
3. Build signed APK

See Android documentation for details.

