# CoffeeMap - iOS App Setup Guide

## Overview
CoffeeMap discovers coffee shops and roasteries you follow on Instagram, maps them to real-world locations, and alerts you when you're nearby.

## Requirements
- Mac with Xcode 15.0+
- iOS 17.0+ device or simulator
- Apple Developer account (free tier works for development)
- Google Places API key (optional, for enhanced location lookup)

## Step 1: Create Xcode Project
1. Open Xcode on your Mac
2. File > New > Project > iOS > App
3. Product Name: **CoffeeMap**
4. Organization Identifier: your reverse domain (e.g., `com.yourname`)
5. Interface: **SwiftUI**
6. Storage: **SwiftData**
7. Choose the `Claude Coffee Map Project` directory as the save location
8. Xcode will create a `CoffeeMap.xcodeproj` file

## Step 2: Add Source Files
1. Delete the auto-generated `ContentView.swift` and `CoffeeMapApp.swift` from Xcode
2. In Xcode's Project Navigator, right-click the `CoffeeMap` group
3. Choose "Add Files to CoffeeMap..."
4. Navigate to the `CoffeeMap/` folder created by this project
5. Select all subfolders: `App`, `Models`, `ViewModels`, `Views`, `Services`, `Utilities`, `Preview Content`, `Resources`
6. Make sure "Create groups" is selected (not "Create folder references")
7. Click Add

## Step 3: Configure Info.plist
1. In Xcode, select your project in the navigator
2. Select the CoffeeMap target
3. Go to the "Info" tab
4. Add the following keys (or verify they match Resources/Info.plist):
   - `Privacy - Location When In Use Usage Description`: "CoffeeMap uses your location to show coffee shops near you and calculate distances."
   - `Privacy - Location Always and When In Use Usage Description`: "CoffeeMap uses your location in the background to alert you when you're near a coffee shop you follow on Instagram."
5. Go to "Signing & Capabilities" tab:
   - Add "Background Modes" capability, check "Location updates"
   - Add "Push Notifications" capability (for local notifications)

## Step 4: Configure Google Places API (Optional)
The app works with Apple's MapKit geocoding alone, but adding Google Places gives much better results for finding coffee shops by Instagram username.

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable "Places API (New)"
4. Create an API key under Credentials
5. Create a file `Secrets.plist` in the CoffeeMap/Resources folder:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>GooglePlacesAPIKey</key>
    <string>YOUR_API_KEY_HERE</string>
</dict>
</plist>
```
6. Add `Secrets.plist` to your `.gitignore` to avoid committing your API key

## Step 5: Get Your Instagram Data
1. Open Instagram app > Settings > Your Activity > Download Your Information
2. Select "Request a download" > "Select types of information"
3. Choose **"Followers and Following"** only (keeps the file small)
4. Format: **JSON**
5. Date range: **All time**
6. Submit request
7. Wait for Instagram email (can take minutes to 48 hours)
8. Download and extract the ZIP
9. Find: `connections/followers_and_following/following.json`
10. Transfer this file to your iPhone (AirDrop, Files app, etc.)

## Step 6: Build and Run
1. Select your iOS device or simulator
2. Build and run (Cmd+R)
3. Complete the onboarding
4. Go to the Import tab
5. Tap "Import File" and select your `following.json`
6. Toggle on accounts that are coffee shops
7. Tap "Find Locations" to geocode them
8. Switch to the Map tab to see your coffee shops!

## Architecture

```
CoffeeMap/
├── App/                    # App entry point, configuration, global state
├── Models/                 # SwiftData models (CoffeeAccount, CoffeeLocation)
├── ViewModels/             # Business logic (Import, Geocoding, Map, Geofence)
├── Views/
│   ├── Map/                # Interactive map with coffee shop pins
│   ├── List/               # Sorted list of coffee shops by distance
│   ├── Detail/             # Account detail with directions & Instagram link
│   ├── Import/             # Instagram data import flow
│   └── Settings/           # Geofencing, data management, onboarding
├── Services/               # Instagram parsing, geocoding, location, geofence
├── Utilities/              # Coffee shop classifier, distance formatting
└── Preview Content/        # SwiftUI preview helpers with sample data
```

## Key Features
- **Instagram Import**: Parses Instagram's JSON data export to find accounts you follow
- **Smart Classification**: Auto-detects coffee-related accounts by username keywords
- **3-Tier Geocoding**: Apple MapKit > Google Places fallback for finding locations
- **Interactive Map**: Browse all your coffee accounts on a real map
- **Distance & Directions**: See how far each shop is, get driving directions
- **Proximity Alerts**: Background geofencing notifies you when near a followed shop
- **Instagram Integration**: Tap to open any account directly in Instagram

## Troubleshooting
- **"Location not found" for many accounts**: Add a Google Places API key for better results
- **No proximity alerts**: Ensure "Always" location permission is granted in Settings
- **Import fails**: Make sure you're selecting the correct `following.json` file from Instagram's data export (not another JSON file)
