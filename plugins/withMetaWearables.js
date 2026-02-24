const { withInfoPlist, withXcodeProject, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

function withMetaWearablesInfoPlist(config) {
  return withInfoPlist(config, (config) => {
    config.modResults.MWDAT = {
      MetaAppID: '3313036418873896',
      ClientToken: 'AR|3313036418873896|e469bd54ec0883499a248f0045329a5b',
      TeamID: '$(DEVELOPMENT_TEAM)',
    };

    config.modResults.NSBluetoothAlwaysUsageDescription =
      config.modResults.NSBluetoothAlwaysUsageDescription ||
      'This app needs Bluetooth to connect to your Ray-Ban Meta glasses.';

    config.modResults.NSBluetoothPeripheralUsageDescription =
      config.modResults.NSBluetoothPeripheralUsageDescription ||
      'This app uses Bluetooth to communicate with your Ray-Ban Meta glasses.';

    config.modResults.NSCameraUsageDescription =
      config.modResults.NSCameraUsageDescription ||
      'This app needs camera access to record video.';

    config.modResults.NSMicrophoneUsageDescription =
      config.modResults.NSMicrophoneUsageDescription ||
      'This app needs microphone access to record audio.';

    config.modResults.NSLocalNetworkUsageDescription =
      config.modResults.NSLocalNetworkUsageDescription ||
      'This app uses the local network to communicate with Meta wearable devices.';

    if (!config.modResults.UIBackgroundModes) {
      config.modResults.UIBackgroundModes = [];
    }
    const bgModes = config.modResults.UIBackgroundModes;
    if (!bgModes.includes('bluetooth-peripheral')) bgModes.push('bluetooth-peripheral');
    if (!bgModes.includes('external-accessory')) bgModes.push('external-accessory');

    if (!config.modResults.UISupportedExternalAccessoryProtocols) {
      config.modResults.UISupportedExternalAccessoryProtocols = [];
    }
    const protocols = config.modResults.UISupportedExternalAccessoryProtocols;
    if (!protocols.includes('com.meta.ar.wearable')) {
      protocols.push('com.meta.ar.wearable');
    }

    return config;
  });
}

function withMetaWearablesSPM(config) {
  return withXcodeProject(config, async (config) => {
    console.log('[withMetaWearables] SPM package: https://github.com/facebook/meta-wearables-dat-ios');
    console.log('[withMetaWearables] Add meta-wearables-dat-ios SPM package in Xcode:');
    console.log('  1. File > Add Package Dependencies');
    console.log('  2. URL: https://github.com/facebook/meta-wearables-dat-ios');
    console.log('  3. Version: 0.4.0+');
    console.log('  4. Add MWDATCore and MWDATCamera to your target');
    return config;
  });
}

function withMetaWearablesNativeModule(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const iosPath = config.modRequest.platformProjectRoot;
      const projectName = config.modRequest.projectName || 'MetaWearableRecorder';
      const modulesDir = path.join(iosPath, projectName);

      if (!fs.existsSync(modulesDir)) {
        fs.mkdirSync(modulesDir, { recursive: true });
      }

      const swiftBridgeCode = `import Foundation
import React

#if canImport(MWDATCore)
import MWDATCore
#endif

#if canImport(MWDATCamera)
import MWDATCamera
#endif

@objc(MetaWearablesModule)
class MetaWearablesModule: RCTEventEmitter {

  private var hasListeners = false

  #if canImport(MWDATCore)
  private var wearables: WearablesInterface { Wearables.shared }
  private var deviceSelector: AutoDeviceSelector?
  private var streamSession: StreamSession?
  private var listenerTokens: [AnyListenerToken] = []
  #endif

  override init() {
    super.init()
    #if canImport(MWDATCore)
    Wearables.configure()
    print("[MetaWearablesModule] SDK configured")
    #else
    print("[MetaWearablesModule] MWDATCore not available")
    #endif
  }

  @objc override static func requiresMainQueueSetup() -> Bool { return true }

  override func supportedEvents() -> [String]! {
    return [
      "onRegistrationStateChange",
      "onStreamStateChange",
      "onStreamError",
      "onStreamStatus",
      "onVideoFrame",
      "onDeviceChange",
    ]
  }

  override func startObserving() { hasListeners = true }
  override func stopObserving() { hasListeners = false }

  private func emit(_ event: String, body: [String: Any]) {
    if hasListeners {
      sendEvent(withName: event, body: body)
    }
  }

  // MARK: - Registration

  @objc(startRegistration:rejecter:)
  func startRegistration(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    #if canImport(MWDATCore)
    Task { @MainActor in
      do {
        try await wearables.startRegistration()

        Task {
          for await state in wearables.registrationStateStream() {
            let stateStr: String
            switch state {
            case .registered: stateStr = "registered"
            case .registering: stateStr = "registering"
            case .unregistered: stateStr = "unregistered"
            @unknown default: stateStr = "unknown"
            }
            self.emit("onRegistrationStateChange", body: ["status": stateStr])
          }
        }

        resolve(["status": "registering"])
      } catch {
        reject("REGISTRATION_ERROR", error.localizedDescription, error)
      }
    }
    #else
    reject("UNSUPPORTED", "MWDATCore not available", nil)
    #endif
  }

  @objc(handleUrl:resolver:rejecter:)
  func handleUrl(_ url: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    #if canImport(MWDATCore)
    guard let parsedUrl = URL(string: url) else {
      reject("INVALID_URL", "Invalid URL", nil)
      return
    }
    Task { @MainActor in
      let handled = Wearables.shared.handleUrl(parsedUrl)
      resolve(["handled": handled])
    }
    #else
    reject("UNSUPPORTED", "MWDATCore not available", nil)
    #endif
  }

  @objc(getRegistrationState:rejecter:)
  func getRegistrationState(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    #if canImport(MWDATCore)
    Task { @MainActor in
      for await state in wearables.registrationStateStream() {
        let stateStr: String
        switch state {
        case .registered: stateStr = "registered"
        case .registering: stateStr = "registering"
        case .unregistered: stateStr = "unregistered"
        @unknown default: stateStr = "unknown"
        }
        resolve(["status": stateStr])
        break
      }
    }
    #else
    resolve(["status": "unregistered"])
    #endif
  }

  @objc(unregister:rejecter:)
  func unregister(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    #if canImport(MWDATCore)
    Task { @MainActor in
      do {
        try await wearables.startUnregistration()
        resolve(["status": "unregistered"])
      } catch {
        reject("UNREGISTER_ERROR", error.localizedDescription, error)
      }
    }
    #else
    reject("UNSUPPORTED", "MWDATCore not available", nil)
    #endif
  }

  // MARK: - Permissions

  @objc(checkPermission:resolver:rejecter:)
  func checkPermission(_ type: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    #if canImport(MWDATCore)
    Task { @MainActor in
      do {
        let permission: Permission = .camera
        let status = try await wearables.checkPermissionStatus(permission)
        resolve(["granted": status == .granted])
      } catch {
        reject("PERMISSION_ERROR", error.localizedDescription, error)
      }
    }
    #else
    resolve(["granted": false])
    #endif
  }

  @objc(requestPermission:resolver:rejecter:)
  func requestPermission(_ type: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    #if canImport(MWDATCore)
    Task { @MainActor in
      do {
        let permission: Permission = .camera
        let status = try await wearables.requestPermission(permission)
        resolve(["granted": status == .granted])
      } catch {
        reject("PERMISSION_ERROR", error.localizedDescription, error)
      }
    }
    #else
    resolve(["granted": false])
    #endif
  }

  // MARK: - Device Discovery

  @objc(startDeviceDiscovery:rejecter:)
  func startDeviceDiscovery(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    #if canImport(MWDATCore)
    Task { @MainActor in
      self.deviceSelector = AutoDeviceSelector(wearables: wearables)

      Task {
        guard let selector = self.deviceSelector else { return }
        for await device in selector.activeDeviceStream() {
          if let device = device {
            self.emit("onDeviceChange", body: [
              "connected": true,
              "deviceId": device.nameOrId(),
              "name": device.nameOrId(),
            ])
          } else {
            self.emit("onDeviceChange", body: [
              "connected": false,
              "deviceId": "",
              "name": "",
            ])
          }
        }
      }

      resolve(["started": true])
    }
    #else
    reject("UNSUPPORTED", "MWDATCore not available", nil)
    #endif
  }

  // MARK: - Streaming

  @objc(startStream:resolver:rejecter:)
  func startStream(_ configDict: NSDictionary, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    #if canImport(MWDATCore) && canImport(MWDATCamera)
    Task { @MainActor in
      let resolutionStr = configDict["resolution"] as? String ?? "low"
      let frameRate = configDict["frameRate"] as? Int ?? 24

      let resolution: StreamingResolution
      switch resolutionStr {
      case "high": resolution = .medium
      case "medium": resolution = .low
      default: resolution = .low
      }

      let config = StreamSessionConfig(
        videoCodec: .raw,
        resolution: resolution,
        frameRate: frameRate
      )

      if self.deviceSelector == nil {
        self.deviceSelector = AutoDeviceSelector(wearables: wearables)
      }

      guard let selector = self.deviceSelector else {
        reject("NO_DEVICE_SELECTOR", "Device selector not initialized", nil)
        return
      }

      let session = StreamSession(streamSessionConfig: config, deviceSelector: selector)
      self.streamSession = session

      self.listenerTokens.removeAll()

      let stateToken = session.statePublisher.listen { [weak self] state in
        guard let self = self else { return }
        let stateStr: String
        switch state {
        case .stopped: stateStr = "stopped"
        case .waitingForDevice: stateStr = "waiting_for_device"
        case .starting: stateStr = "starting"
        case .streaming: stateStr = "streaming"
        case .stopping: stateStr = "stopping"
        case .paused: stateStr = "paused"
        @unknown default: stateStr = "unknown"
        }
        self.emit("onStreamStateChange", body: ["state": stateStr])
      }
      self.listenerTokens.append(stateToken)

      let errorToken = session.errorPublisher.listen { [weak self] error in
        guard let self = self else { return }
        self.emit("onStreamError", body: [
          "code": String(describing: error),
          "message": error.localizedDescription,
        ])
      }
      self.listenerTokens.append(errorToken)

      let frameToken = session.videoFramePublisher.listen { [weak self] _ in
        guard let self = self else { return }
        self.emit("onVideoFrame", body: [
          "timestamp": Date().timeIntervalSince1970 * 1000,
          "hasImage": true,
        ])
      }
      self.listenerTokens.append(frameToken)

      await session.start()
      resolve(["started": true])
    }
    #else
    reject("UNSUPPORTED", "MWDATCamera not available", nil)
    #endif
  }

  @objc(stopStream:rejecter:)
  func stopStream(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    #if canImport(MWDATCamera)
    Task { @MainActor in
      if let session = self.streamSession {
        await session.stop()
        self.streamSession = nil
        self.listenerTokens.removeAll()
      }
      resolve(["stopped": true])
    }
    #else
    resolve(["stopped": true])
    #endif
  }

  @objc(capturePhoto:resolver:rejecter:)
  func capturePhoto(_ format: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    #if canImport(MWDATCamera)
    guard let session = self.streamSession else {
      reject("NO_SESSION", "No active stream session", nil)
      return
    }

    let photoFormat: PhotoFormat = format == "heic" ? .heic : .jpeg
    session.capturePhoto(format: photoFormat)

    let photoToken = session.photoDataPublisher.listen { photoData in
      let base64 = photoData.data.base64EncodedString()
      resolve(["data": base64, "format": format])
    }
    self.listenerTokens.append(photoToken)
    #else
    reject("UNSUPPORTED", "MWDATCamera not available", nil)
    #endif
  }

  @objc(isSDKAvailable:rejecter:)
  func isSDKAvailable(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    #if canImport(MWDATCore)
    resolve(["available": true])
    #else
    resolve(["available": false])
    #endif
  }

  @objc(cleanup:rejecter:)
  func cleanup(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    #if canImport(MWDATCamera)
    Task { @MainActor in
      if let session = self.streamSession {
        await session.stop()
        self.streamSession = nil
      }
      self.listenerTokens.removeAll()
      self.deviceSelector = nil
      resolve(["cleaned": true])
    }
    #else
    resolve(["cleaned": true])
    #endif
  }
}
`;

      const objcBridgeCode = `#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE(MetaWearablesModule, RCTEventEmitter)

RCT_EXTERN_METHOD(startRegistration:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(handleUrl:(NSString *)url resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(getRegistrationState:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(unregister:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(checkPermission:(NSString *)type resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(requestPermission:(NSString *)type resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(startDeviceDiscovery:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(startStream:(NSDictionary *)config resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(stopStream:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(capturePhoto:(NSString *)format resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(isSDKAvailable:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(cleanup:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)

@end
`;

      fs.writeFileSync(path.join(modulesDir, 'MetaWearablesModule.swift'), swiftBridgeCode);
      fs.writeFileSync(path.join(modulesDir, 'MetaWearablesModule.m'), objcBridgeCode);

      console.log('[withMetaWearables] Native module files written to:', modulesDir);
      return config;
    },
  ]);
}

function withMetaWearables(config) {
  config = withMetaWearablesInfoPlist(config);
  config = withMetaWearablesSPM(config);
  config = withMetaWearablesNativeModule(config);
  return config;
}

module.exports = withMetaWearables;
