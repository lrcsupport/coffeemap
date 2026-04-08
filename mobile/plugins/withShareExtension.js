const { withXcodeProject, withInfoPlist } = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

const EXTENSION_NAME = 'CoffeeMapShare';
const EXTENSION_BUNDLE_ID = 'com.coffeemap.app.share';

/**
 * Expo Config Plugin: adds the iOS Share Extension target to the Xcode project.
 * Run `npx expo prebuild` after adding this plugin to app.json.
 */
function withShareExtension(config) {
  // Step 1: Add URL scheme to main app Info.plist
  config = withInfoPlist(config, (config) => {
    const urlScheme = 'coffeemap';
    if (!config.modResults.CFBundleURLTypes) {
      config.modResults.CFBundleURLTypes = [];
    }
    const existing = config.modResults.CFBundleURLTypes.find(
      (t) => t.CFBundleURLSchemes && t.CFBundleURLSchemes.includes(urlScheme)
    );
    if (!existing) {
      config.modResults.CFBundleURLTypes.push({
        CFBundleURLName: 'com.coffeemap.app',
        CFBundleURLSchemes: [urlScheme],
      });
    }
    return config;
  });

  // Step 2: Add Share Extension target to Xcode project
  config = withXcodeProject(config, async (config) => {
    const xcodeProject = config.modResults;
    const projectRoot = config.modRequest.projectRoot;
    const iosPath = path.join(projectRoot, 'ios');
    const extensionDir = path.join(iosPath, EXTENSION_NAME);

    // Create extension directory in ios/
    if (!fs.existsSync(extensionDir)) {
      fs.mkdirSync(extensionDir, { recursive: true });
    }

    // Copy Share Extension files
    const sourceDir = path.join(projectRoot, 'share-extension');
    const filesToCopy = ['ShareViewController.swift', 'Info.plist'];
    for (const file of filesToCopy) {
      const src = path.join(sourceDir, file);
      const dest = path.join(extensionDir, file);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
      }
    }

    // Create a minimal storyboard for the share extension
    const storyboard = `<?xml version="1.0" encoding="UTF-8"?>
<document type="com.apple.InterfaceBuilder3.CocoaTouch.Storyboard.XIB" version="3.0" toolsVersion="13122.16" targetRuntime="AppleSDK" propertyAccessControl="none" useAutolayout="YES" useTraitCollections="YES" useSafeAreas="YES" colorMatched="YES" initialViewController="j1y-V4-xli">
    <scenes>
        <scene sceneID="ceB-am-kn3">
            <objects>
                <viewController id="j1y-V4-xli" customClass="ShareViewController" customModuleProvider="target" sceneMemberID="viewController"/>
            </objects>
        </scene>
    </scenes>
</document>`;
    fs.writeFileSync(path.join(extensionDir, 'MainInterface.storyboard'), storyboard);

    // Add the Share Extension target to the Xcode project
    const targetUuid = xcodeProject.generateUuid();
    const groupUuid = xcodeProject.generateUuid();

    // Add a new PBXGroup for the extension
    const extensionGroup = xcodeProject.addPbxGroup(
      ['ShareViewController.swift', 'Info.plist', 'MainInterface.storyboard'],
      EXTENSION_NAME,
      EXTENSION_NAME
    );

    // Add the extension target
    const target = xcodeProject.addTarget(
      EXTENSION_NAME,
      'app_extension',
      EXTENSION_NAME,
      EXTENSION_BUNDLE_ID
    );

    // Add build source files
    if (target && target.uuid) {
      xcodeProject.addBuildPhase(
        ['ShareViewController.swift'],
        'PBXSourcesBuildPhase',
        'Sources',
        target.uuid
      );

      xcodeProject.addBuildPhase(
        ['MainInterface.storyboard'],
        'PBXResourcesBuildPhase',
        'Resources',
        target.uuid
      );

      // Set build settings for the extension
      const configurations = xcodeProject.pbxXCBuildConfigurationSection();
      for (const key in configurations) {
        if (typeof configurations[key] === 'object' &&
            configurations[key].buildSettings &&
            configurations[key].name &&
            configurations[key].baseConfigurationReference === undefined) {
          const bs = configurations[key].buildSettings;
          if (bs.PRODUCT_BUNDLE_IDENTIFIER === `"${EXTENSION_BUNDLE_ID}"` ||
              bs.PRODUCT_BUNDLE_IDENTIFIER === EXTENSION_BUNDLE_ID) {
            bs.SWIFT_VERSION = '5.0';
            bs.TARGETED_DEVICE_FAMILY = '"1,2"';
            bs.IPHONEOS_DEPLOYMENT_TARGET = '17.0';
            bs.CODE_SIGN_STYLE = 'Automatic';
            bs.INFOPLIST_FILE = `${EXTENSION_NAME}/Info.plist`;
          }
        }
      }
    }

    return config;
  });

  return config;
}

module.exports = withShareExtension;
