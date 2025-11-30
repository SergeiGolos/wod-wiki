# WOD Wiki TV - Google Play Store Deployment Guide

## Overview

This document provides a comprehensive guide for preparing, submitting, and maintaining the WOD Wiki TV application on the Google Play Store for Android TV devices.

---

## Pre-Submission Requirements

### Google Play Developer Account

1. **Create/Access Account**
   - Go to [Google Play Console](https://play.google.com/console)
   - Sign up fee: $25 USD (one-time)
   - Account approval: 24-48 hours

2. **Set Up Merchant Account** (if offering in-app purchases)
   - Link Google Payments Merchant Center
   - Provide tax information
   - Set up bank account for payouts

### App Requirements Checklist

| Requirement | Status | Notes |
|-------------|--------|-------|
| Leanback Launcher Support | Required | Must declare `android.software.leanback` |
| D-pad Navigation | Required | All UI navigable without touch |
| Minimum SDK 21 | Required | Android 5.0+ |
| Banner Image | Required | 320×180px for TV launcher |
| No Touch-Only Features | Required | No gestures, multi-touch, etc. |
| Landscape Orientation | Required | TV apps must be landscape |
| 1080p Support | Required | Must render at 1920×1080 |
| 4K Support | Recommended | Support 3840×2160 for 4K TVs |

---

## Android Manifest Configuration

```xml
<!-- android/app/src/main/AndroidManifest.xml -->
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.wodwiki.tv">
    
    <!-- TV Feature Declarations -->
    <uses-feature
        android:name="android.software.leanback"
        android:required="true" />
    
    <!-- Declare that touch screen is NOT required -->
    <uses-feature
        android:name="android.hardware.touchscreen"
        android:required="false" />
    
    <!-- Bluetooth for HR monitors -->
    <uses-feature
        android:name="android.hardware.bluetooth_le"
        android:required="false" />
    
    <!-- Permissions -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.BLUETOOTH" />
    <uses-permission android:name="android.permission.BLUETOOTH_ADMIN" />
    <uses-permission android:name="android.permission.BLUETOOTH_SCAN" />
    <uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    
    <application
        android:name=".MainApplication"
        android:label="@string/app_name"
        android:icon="@mipmap/ic_launcher"
        android:banner="@drawable/tv_banner"
        android:theme="@style/AppTheme"
        android:supportsRtl="true"
        android:allowBackup="true">
        
        <!-- Main TV Activity -->
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:configChanges="keyboard|keyboardHidden|orientation|screenSize|uiMode"
            android:screenOrientation="landscape"
            android:windowSoftInputMode="adjustResize">
            
            <!-- Leanback Launcher Intent Filter -->
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LEANBACK_LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
```

---

## Build Configuration

### App Signing

```groovy
// android/app/build.gradle

android {
    compileSdkVersion 34
    
    defaultConfig {
        applicationId "com.wodwiki.tv"
        minSdkVersion 21
        targetSdkVersion 34
        versionCode 1
        versionName "1.0.0"
        
        // TV-specific config
        vectorDrawables.useSupportLibrary = true
    }
    
    signingConfigs {
        release {
            if (project.hasProperty('WODWIKI_TV_UPLOAD_KEY_FILE')) {
                storeFile file(WODWIKI_TV_UPLOAD_KEY_FILE)
                storePassword WODWIKI_TV_UPLOAD_STORE_PASSWORD
                keyAlias WODWIKI_TV_UPLOAD_KEY_ALIAS
                keyPassword WODWIKI_TV_UPLOAD_KEY_PASSWORD
            }
        }
    }
    
    buildTypes {
        release {
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
            signingConfig signingConfigs.release
        }
    }
    
    // Generate AAB for Play Store
    bundle {
        language {
            enableSplit = true
        }
        density {
            enableSplit = true
        }
        abi {
            enableSplit = true
        }
    }
}
```

### Generate Signing Key

```bash
# Generate upload key (keep this secure!)
keytool -genkeypair -v \
  -keystore wodwiki-tv-upload-key.keystore \
  -alias wodwiki-tv-upload \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000

# Store credentials securely (not in git!)
# Add to ~/.gradle/gradle.properties:
WODWIKI_TV_UPLOAD_KEY_FILE=/path/to/wodwiki-tv-upload-key.keystore
WODWIKI_TV_UPLOAD_STORE_PASSWORD=your_store_password
WODWIKI_TV_UPLOAD_KEY_ALIAS=wodwiki-tv-upload
WODWIKI_TV_UPLOAD_KEY_PASSWORD=your_key_password
```

### Build Release AAB

```bash
# Navigate to TV app
cd tv

# Clean previous builds
cd android && ./gradlew clean && cd ..

# Build release bundle
cd android && ./gradlew bundleRelease

# Output location:
# android/app/build/outputs/bundle/release/app-release.aab
```

---

## Store Listing Assets

### Required Graphics

| Asset | Dimensions | Format | Purpose |
|-------|------------|--------|---------|
| TV Banner | 320×180 px | PNG | Leanback launcher icon |
| TV Screenshots | 1920×1080 px | PNG/JPEG | Store listing (min 4) |
| Feature Graphic | 1024×500 px | PNG/JPEG | Play Store header |
| Hi-res Icon | 512×512 px | PNG | Store icon |
| Promo Video | - | YouTube URL | Optional but recommended |

### TV Banner Design Guidelines

```
┌──────────────────────────────────┐
│                                  │
│     ┌────────────────────┐       │
│     │   WOD Wiki TV      │       │
│     │   [Icon]           │       │
│     │                    │       │
│     │   Workout Timer    │       │
│     └────────────────────┘       │
│                                  │
│  320 × 180 pixels                │
│  PNG with transparency           │
│  Centered logo, readable at      │
│  small sizes                     │
│                                  │
└──────────────────────────────────┘
```

### Screenshot Requirements

Capture screenshots showing:

1. **Home/Connection Screen** - Waiting for cast connection
2. **Workout Display** - Active timer with exercise
3. **Heart Rate View** - Connected HR monitor with live data
4. **Multi-Round Workout** - Progress through rounds
5. **Settings Screen** - HR monitor pairing interface
6. **Workout Complete** - Summary screen with metrics

```bash
# Capture screenshots from emulator
adb exec-out screencap -p > screenshot_home.png
adb exec-out screencap -p > screenshot_workout.png
# ... etc
```

---

## Store Listing Content

### App Title
```
WOD Wiki TV - Workout Timer & Heart Rate
```
(Max 50 characters)

### Short Description
```
Cast workouts from your phone to your TV. Track heart rate, complete workouts, and sync results.
```
(Max 80 characters)

### Full Description

```markdown
Transform your TV into a powerful workout display with WOD Wiki TV!

🏋️ CAST WORKOUTS TO YOUR TV
Connect with the WOD Wiki web app and cast any workout to your television. See your workout timer, current exercise, and progress on the big screen while you train.

⏱️ POWERFUL WORKOUT TIMER
- Large, easy-to-read countdown timer
- Round tracking for AMRAP, EMOM, and interval workouts
- Visual progress indicators
- Rest period notifications

❤️ HEART RATE MONITORING
- Connect Bluetooth heart rate monitors
- Real-time BPM display during workouts
- Support for multiple simultaneous monitors
- Heart rate zones and training intensity

📱 SEAMLESS SYNC
- All workout data syncs back to your phone
- View complete workout history with heart rate data
- Track your progress over time

🎮 TV REMOTE CONTROL
- Control workouts with your TV remote
- Play, pause, and skip with D-pad
- No phone needed during workout

REQUIREMENTS:
- Android TV device (Android 5.0+)
- WOD Wiki web app (free)
- Internet connection
- Bluetooth heart rate monitor (optional)

Perfect for:
- CrossFit WODs
- HIIT training
- Circuit training
- Interval workouts
- Home gym setups

Download now and take your workouts to the next level!
```

### Category
**Health & Fitness**

### Content Rating
**Everyone** (IARC questionnaire required)

### Contact Information
- Email: support@wodwiki.app
- Website: https://wodwiki.app
- Privacy Policy URL: https://wodwiki.app/privacy

---

## Privacy & Compliance

### Privacy Policy Requirements

Your privacy policy must address:

1. **Data Collection**
   - Heart rate data from Bluetooth monitors
   - Workout metrics and timing
   - Device identifiers for casting

2. **Data Usage**
   - How heart rate data is used and stored
   - Sync between TV and web app
   - Analytics (if any)

3. **Data Sharing**
   - Health Connect integration (if applicable)
   - Third-party services

4. **User Rights**
   - Data access and deletion
   - Opt-out procedures

### Sample Privacy Policy Sections

```markdown
## Data We Collect

### Heart Rate Data
When you connect a Bluetooth heart rate monitor, we collect:
- Heart rate measurements (BPM)
- Timestamps of measurements
- Device identifier of the heart rate monitor

This data is:
- Stored locally on your TV during the workout
- Synced to the connected WOD Wiki web app upon workout completion
- Not shared with any third parties
- Can be deleted at any time from the web app

### Workout Data
We collect workout timing and exercise completion data to provide
workout history and progress tracking.

## How to Delete Your Data
To delete your workout and heart rate data:
1. Open the WOD Wiki web app
2. Navigate to Settings > Privacy
3. Select "Delete All Data"
```

### Data Safety Form

Complete in Play Console:

| Question | Answer |
|----------|--------|
| Does your app collect data? | Yes |
| Is data encrypted in transit? | Yes (WSS/HTTPS) |
| Can users request data deletion? | Yes |
| Data types collected | Health info (heart rate), App activity |
| Is data shared? | Not shared externally |

---

## Testing Tracks

### Internal Testing

1. **Create Internal Test Track**
   - Go to Play Console → Testing → Internal testing
   - Create new release
   - Upload AAB file
   - Add tester email addresses (up to 100)

2. **Share Opt-in Link**
   ```
   https://play.google.com/apps/internaltest/[your-app-id]
   ```

3. **Testing Period**: Immediate access

### Closed Testing (Alpha/Beta)

1. **Create Closed Track**
   - Play Console → Testing → Closed testing
   - Create track with name (e.g., "Beta Testers")
   - Upload AAB
   - Configure countries
   - Add testers (email list or Google Group)

2. **Testing Period**: 1-3 days for review

### Open Testing

1. **Create Open Track**
   - Play Console → Testing → Open testing
   - Upload AAB
   - Set tester limit (optional)
   - Configure feedback URL

2. **Testing Period**: 1-3 days for review

---

## Production Release

### Pre-Launch Checklist

- [ ] All testing tracks passed
- [ ] Privacy policy URL active
- [ ] Support email configured
- [ ] All store listing assets uploaded
- [ ] Content rating questionnaire completed
- [ ] Target audience and content declarations done
- [ ] Data safety form completed
- [ ] App signing enrolled (Play App Signing recommended)

### Release Process

1. **Create Production Release**
   ```
   Play Console → Production → Create new release
   ```

2. **Upload App Bundle**
   - Upload `app-release.aab`
   - Review warnings/errors

3. **Release Notes**
   ```
   Version 1.0.0 - Initial Release
   
   🎉 WOD Wiki TV is here!
   
   Features:
   • Cast workouts from WOD Wiki web app
   • Real-time workout timer display
   • Heart rate monitor support (Bluetooth)
   • TV remote control integration
   • Automatic workout sync
   
   Requirements:
   • Android TV (Android 5.0+)
   • WOD Wiki web app account
   ```

4. **Rollout Strategy**
   - Start with staged rollout (10% → 25% → 50% → 100%)
   - Monitor crash reports and reviews
   - Full rollout after 1 week if stable

### Review Timeline

| Review Type | Typical Duration |
|-------------|------------------|
| First submission | 3-7 days |
| Update (no policy changes) | 1-3 days |
| Update (with policy changes) | 3-7 days |
| Appeal | 7-14 days |

---

## Post-Launch

### Monitoring

1. **Android Vitals**
   - Monitor crash rate (target: <1%)
   - ANR rate (target: <0.5%)
   - Excessive wakeups
   - Stuck partial wake locks

2. **User Reviews**
   - Respond to reviews within 24-48 hours
   - Track common issues
   - Use feedback for roadmap

3. **Install Metrics**
   - Daily active users
   - Install/uninstall rate
   - Retention metrics

### Update Strategy

```bash
# Version numbering: MAJOR.MINOR.PATCH
# versionCode: Increment for each release (1, 2, 3, ...)
# versionName: User-visible version (1.0.0, 1.0.1, 1.1.0, ...)

# For patch release (bug fixes):
versionCode 2
versionName "1.0.1"

# For minor release (new features):
versionCode 3
versionName "1.1.0"

# For major release (breaking changes):
versionCode 10
versionName "2.0.0"
```

### CI/CD for Releases

```yaml
# .github/workflows/tv-release.yml
name: TV App Release

on:
  push:
    tags:
      - 'tv-v*'

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Java
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
        working-directory: tv
      
      - name: Decode Keystore
        run: |
          echo "${{ secrets.KEYSTORE_BASE64 }}" | base64 -d > android/app/wodwiki-tv-upload-key.keystore
        working-directory: tv
      
      - name: Build Release AAB
        env:
          WODWIKI_TV_UPLOAD_KEY_FILE: wodwiki-tv-upload-key.keystore
          WODWIKI_TV_UPLOAD_STORE_PASSWORD: ${{ secrets.KEYSTORE_PASSWORD }}
          WODWIKI_TV_UPLOAD_KEY_ALIAS: wodwiki-tv-upload
          WODWIKI_TV_UPLOAD_KEY_PASSWORD: ${{ secrets.KEY_PASSWORD }}
        run: |
          cd android && ./gradlew bundleRelease
        working-directory: tv
      
      - name: Upload to Play Store
        uses: r0adkll/upload-google-play@v1
        with:
          serviceAccountJsonPlainText: ${{ secrets.PLAY_STORE_SERVICE_ACCOUNT }}
          packageName: com.wodwiki.tv
          releaseFiles: tv/android/app/build/outputs/bundle/release/app-release.aab
          track: internal
          status: draft
```

---

## Common Rejection Reasons & Solutions

### 1. Missing Leanback Launcher

**Error**: "Your app does not appear to be designed for TVs"

**Solution**: Ensure manifest has:
```xml
<intent-filter>
    <action android:name="android.intent.action.MAIN" />
    <category android:name="android.intent.category.LEANBACK_LAUNCHER" />
</intent-filter>
```

### 2. Touch-Only Navigation

**Error**: "App requires touch input not available on TV"

**Solution**: 
- Ensure all UI elements focusable
- Test with D-pad only navigation
- Use `TVFocusGuideView` for complex layouts

### 3. Missing TV Banner

**Error**: "Missing TV banner image"

**Solution**:
```xml
<application
    android:banner="@drawable/tv_banner"
    ... >
```

### 4. Privacy Policy Issues

**Error**: "Privacy policy does not meet requirements"

**Solution**:
- Ensure policy URL is accessible (HTTPS)
- Include all data collection types
- Add user data deletion instructions

### 5. Incorrect Content Rating

**Error**: "App content does not match rating"

**Solution**:
- Re-complete IARC questionnaire
- Be accurate about health/fitness content

---

## Support & Resources

### Google Resources

- [Android TV Developer Guide](https://developer.android.com/tv)
- [TV App Quality Checklist](https://developer.android.com/docs/quality-guidelines/tv-app-quality)
- [Play Console Help](https://support.google.com/googleplay/android-developer)
- [Policy Center](https://play.google.com/about/developer-content-policy/)

### Useful Commands Reference

```bash
# Check APK/AAB info
bundletool dump manifest --bundle=app-release.aab

# Test bundle locally
bundletool build-apks --bundle=app-release.aab --output=app.apks
bundletool install-apks --apks=app.apks

# Verify TV compatibility
aapt dump badging app-release.apk | grep -E "leanback|banner"

# Check signing info
jarsigner -verify -verbose -certs app-release.apk
```

---

## Appendix: Complete Release Checklist

### Development Complete
- [ ] All features implemented
- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] E2E tests passing
- [ ] No critical bugs

### Assets Ready
- [ ] TV Banner (320×180)
- [ ] Screenshots (1920×1080) × 4+
- [ ] Feature Graphic (1024×500)
- [ ] Hi-res Icon (512×512)
- [ ] Promo video (optional)

### Store Listing
- [ ] Title (50 chars)
- [ ] Short description (80 chars)
- [ ] Full description (4000 chars)
- [ ] Category selected
- [ ] Contact email
- [ ] Privacy policy URL

### Compliance
- [ ] Privacy policy published
- [ ] Content rating completed
- [ ] Data safety form completed
- [ ] Target audience set

### Technical
- [ ] Release signing key generated
- [ ] AAB builds successfully
- [ ] Tested on TV emulator
- [ ] Tested on real TV device
- [ ] Version code/name updated

### Release
- [ ] Internal testing passed
- [ ] Closed beta passed
- [ ] Release notes written
- [ ] Staged rollout configured
- [ ] Monitoring alerts set up

---

## Contact

For deployment support:
- Internal: #tv-app-deployment Slack channel
- External: support@wodwiki.app
