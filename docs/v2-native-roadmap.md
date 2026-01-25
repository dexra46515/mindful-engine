# V2 Native Roadmap: Screen Time API Integration

## Executive Summary

This document outlines the technical roadmap for integrating Apple's Screen Time APIs into Mindful Balance Engine, transforming it from a behavioral coaching tool into a full parental control application with real enforcement capabilities.

---

## Phase Overview

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| **Phase 1: Preparation** | 2 weeks | Entitlement application, project setup |
| **Phase 2: Core Extensions** | 4 weeks | Swift extensions, basic monitoring |
| **Phase 3: Enforcement** | 3 weeks | App shielding, schedule enforcement |
| **Phase 4: Integration** | 2 weeks | Bridge to React Native, testing |
| **Phase 5: Polish** | 2 weeks | UI refinement, App Store submission |

**Total Estimated Duration:** 13 weeks

---

## Phase 1: Preparation (Weeks 1-2)

### 1.1 Apple Entitlement Application

**Timeline:** Week 1

**Tasks:**
- [ ] Complete company information in `docs/apple-entitlement-request.md`
- [ ] Finalize Privacy Policy at `/privacy`
- [ ] Finalize Terms of Service at `/terms`
- [ ] Record screen capture demo of parental consent flow
- [ ] Create test accounts for Apple review team
- [ ] Submit entitlement request at developer.apple.com

**Deliverable:** Submitted Family Controls entitlement request

### 1.2 Xcode Project Setup

**Timeline:** Week 2

**Tasks:**
- [ ] Create new Xcode project or configure existing Capacitor iOS project
- [ ] Add required capabilities:
  - Family Controls
  - Background Modes (if needed)
  - App Groups (for extension communication)
- [ ] Configure App Groups for data sharing between app and extensions
- [ ] Set up development provisioning profiles with entitlement

**Code Structure:**
```
ios/
├── App/
│   ├── AppDelegate.swift
│   ├── ContentView.swift
│   └── ScreenTimeManager.swift
├── DeviceActivityMonitorExtension/
│   ├── DeviceActivityMonitorExtension.swift
│   └── Info.plist
├── ShieldConfigurationExtension/
│   ├── ShieldConfigurationExtension.swift
│   └── Info.plist
└── ShieldActionExtension/
    ├── ShieldActionExtension.swift
    └── Info.plist
```

---

## Phase 2: Core Extensions (Weeks 3-6)

### 2.1 Authorization Manager

**Timeline:** Week 3

**Purpose:** Handle FamilyControls authorization flow

```swift
// ScreenTimeManager.swift
import FamilyControls
import ManagedSettings
import DeviceActivity

class ScreenTimeManager: ObservableObject {
    static let shared = ScreenTimeManager()
    
    @Published var authorizationStatus: AuthorizationStatus = .notDetermined
    
    let authorizationCenter = AuthorizationCenter.shared
    let store = ManagedSettingsStore()
    let center = DeviceActivityCenter()
    
    enum AuthorizationStatus {
        case notDetermined
        case approved
        case denied
    }
    
    func requestAuthorization() async throws {
        try await authorizationCenter.requestAuthorization(for: .individual)
        await MainActor.run {
            authorizationStatus = .approved
        }
    }
    
    func checkAuthorizationStatus() {
        switch authorizationCenter.authorizationStatus {
        case .notDetermined:
            authorizationStatus = .notDetermined
        case .approved:
            authorizationStatus = .approved
        case .denied:
            authorizationStatus = .denied
        @unknown default:
            authorizationStatus = .notDetermined
        }
    }
}
```

### 2.2 DeviceActivityMonitor Extension

**Timeline:** Weeks 3-4

**Purpose:** Background monitoring of app usage

```swift
// DeviceActivityMonitorExtension.swift
import DeviceActivity
import ManagedSettings
import FamilyControls

class DeviceActivityMonitorExtension: DeviceActivityMonitor {
    
    let store = ManagedSettingsStore()
    
    // Called when monitoring interval begins
    override func intervalDidStart(for activity: DeviceActivityName) {
        super.intervalDidStart(for: activity)
        
        // Reset daily counters
        UserDefaults(suiteName: "group.app.mindfulbalance")?.set(0, forKey: "todayUsageSeconds")
    }
    
    // Called when monitoring interval ends
    override func intervalDidEnd(for activity: DeviceActivityName) {
        super.intervalDidEnd(for: activity)
        
        // Clear any shields at end of day
        store.shield.applications = nil
        store.shield.applicationCategories = nil
    }
    
    // Called when usage threshold is reached
    override func eventDidReachThreshold(_ event: DeviceActivityEvent.Name, activity: DeviceActivityName) {
        super.eventDidReachThreshold(event, activity: activity)
        
        switch event.rawValue {
        case "warning_80_percent":
            // Send notification via App Groups
            triggerSoftNudge()
            
        case "limit_100_percent":
            // Apply app shields
            applyShields()
            
        default:
            break
        }
    }
    
    private func triggerSoftNudge() {
        // Communicate with main app via App Groups
        let userDefaults = UserDefaults(suiteName: "group.app.mindfulbalance")
        userDefaults?.set(true, forKey: "shouldShowNudge")
        userDefaults?.set(Date(), forKey: "nudgeTriggeredAt")
        
        // Post notification to main app
        DistributedNotificationCenter.default().post(
            name: NSNotification.Name("SoftNudgeTriggered"),
            object: nil
        )
    }
    
    private func applyShields() {
        // Get selected apps from App Groups
        guard let data = UserDefaults(suiteName: "group.app.mindfulbalance")?.data(forKey: "selectedApps"),
              let selection = try? JSONDecoder().decode(FamilyActivitySelection.self, from: data) else {
            return
        }
        
        // Apply shields to selected apps
        store.shield.applications = selection.applicationTokens
        store.shield.applicationCategories = ShieldSettings.ActivityCategoryPolicy.specific(selection.categoryTokens)
    }
}
```

### 2.3 Activity Scheduling

**Timeline:** Week 4

**Purpose:** Set up daily monitoring schedules and thresholds

```swift
// ScheduleManager.swift
import DeviceActivity
import FamilyControls

class ScheduleManager {
    
    let center = DeviceActivityCenter()
    
    struct DailyLimits {
        var totalMinutes: Int
        var warningPercent: Double = 0.8
    }
    
    func startDailyMonitoring(limits: DailyLimits, selection: FamilyActivitySelection) throws {
        // Define the monitoring schedule (full day)
        let schedule = DeviceActivitySchedule(
            intervalStart: DateComponents(hour: 0, minute: 0),
            intervalEnd: DateComponents(hour: 23, minute: 59),
            repeats: true
        )
        
        // Calculate thresholds
        let warningMinutes = Int(Double(limits.totalMinutes) * limits.warningPercent)
        
        // Define events for thresholds
        let events: [DeviceActivityEvent.Name: DeviceActivityEvent] = [
            DeviceActivityEvent.Name("warning_80_percent"): DeviceActivityEvent(
                applications: selection.applicationTokens,
                categories: selection.categoryTokens,
                threshold: DateComponents(minute: warningMinutes)
            ),
            DeviceActivityEvent.Name("limit_100_percent"): DeviceActivityEvent(
                applications: selection.applicationTokens,
                categories: selection.categoryTokens,
                threshold: DateComponents(minute: limits.totalMinutes)
            )
        ]
        
        // Start monitoring
        try center.startMonitoring(
            DeviceActivityName("daily_limit"),
            during: schedule,
            events: events
        )
    }
    
    func startBedtimeMonitoring(start: DateComponents, end: DateComponents, selection: FamilyActivitySelection) throws {
        let schedule = DeviceActivitySchedule(
            intervalStart: start,  // e.g., hour: 21, minute: 0 (9 PM)
            intervalEnd: end,      // e.g., hour: 7, minute: 0 (7 AM)
            repeats: true
        )
        
        // Bedtime triggers immediate shield
        let events: [DeviceActivityEvent.Name: DeviceActivityEvent] = [
            DeviceActivityEvent.Name("bedtime_start"): DeviceActivityEvent(
                applications: selection.applicationTokens,
                categories: selection.categoryTokens,
                threshold: DateComponents(minute: 1)  // Trigger immediately
            )
        ]
        
        try center.startMonitoring(
            DeviceActivityName("bedtime"),
            during: schedule,
            events: events
        )
    }
    
    func stopAllMonitoring() {
        center.stopMonitoring()
    }
}
```

### 2.4 App Picker UI

**Timeline:** Week 5

**Purpose:** Allow parents to select which apps to monitor

```swift
// AppPickerView.swift
import SwiftUI
import FamilyControls

struct AppPickerView: View {
    @State private var selection = FamilyActivitySelection()
    @State private var isPickerPresented = false
    
    var body: some View {
        VStack(spacing: 20) {
            Text("Select Apps to Monitor")
                .font(.headline)
            
            Button("Choose Apps & Categories") {
                isPickerPresented = true
            }
            .familyActivityPicker(isPresented: $isPickerPresented, selection: $selection)
            
            // Show selected count
            if !selection.applicationTokens.isEmpty || !selection.categoryTokens.isEmpty {
                VStack(alignment: .leading) {
                    Text("Selected:")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                    
                    if !selection.applicationTokens.isEmpty {
                        Text("\(selection.applicationTokens.count) apps")
                    }
                    
                    if !selection.categoryTokens.isEmpty {
                        Text("\(selection.categoryTokens.count) categories")
                    }
                }
                .padding()
                .background(Color.secondary.opacity(0.1))
                .cornerRadius(10)
            }
            
            Button("Save Selection") {
                saveSelection()
            }
            .buttonStyle(.borderedProminent)
        }
        .padding()
    }
    
    private func saveSelection() {
        // Store selection in App Groups for extension access
        if let data = try? JSONEncoder().encode(selection) {
            UserDefaults(suiteName: "group.app.mindfulbalance")?.set(data, forKey: "selectedApps")
        }
    }
}
```

---

## Phase 3: Enforcement (Weeks 7-9)

### 3.1 ShieldConfiguration Extension

**Timeline:** Week 7

**Purpose:** Customize the appearance of app shields

```swift
// ShieldConfigurationExtension.swift
import ManagedSettingsUI
import ManagedSettings
import UIKit

class ShieldConfigurationExtension: ShieldConfigurationDataSource {
    
    override func configuration(shielding application: Application) -> ShieldConfiguration {
        return ShieldConfiguration(
            backgroundBlurStyle: .systemUltraThinMaterial,
            backgroundColor: UIColor.systemBackground,
            icon: UIImage(systemName: "hourglass"),
            title: ShieldConfiguration.Label(
                text: "Screen Time Limit Reached",
                color: UIColor.label
            ),
            subtitle: ShieldConfiguration.Label(
                text: "You've reached your daily limit for this app.",
                color: UIColor.secondaryLabel
            ),
            primaryButtonLabel: ShieldConfiguration.Label(
                text: "Request More Time",
                color: UIColor.white
            ),
            primaryButtonBackgroundColor: UIColor.systemBlue,
            secondaryButtonLabel: ShieldConfiguration.Label(
                text: "OK",
                color: UIColor.systemBlue
            )
        )
    }
    
    override func configuration(shielding application: Application, in category: ActivityCategory) -> ShieldConfiguration {
        // Same configuration for category-level shields
        return configuration(shielding: application)
    }
    
    override func configuration(shielding webDomain: WebDomain) -> ShieldConfiguration {
        return ShieldConfiguration(
            backgroundBlurStyle: .systemUltraThinMaterial,
            backgroundColor: UIColor.systemBackground,
            icon: UIImage(systemName: "globe"),
            title: ShieldConfiguration.Label(
                text: "Website Restricted",
                color: UIColor.label
            ),
            subtitle: ShieldConfiguration.Label(
                text: "This website is blocked during restricted hours.",
                color: UIColor.secondaryLabel
            ),
            primaryButtonLabel: ShieldConfiguration.Label(
                text: "Request Access",
                color: UIColor.white
            ),
            primaryButtonBackgroundColor: UIColor.systemBlue
        )
    }
}
```

### 3.2 ShieldAction Extension

**Timeline:** Week 8

**Purpose:** Handle user interactions on shield screens

```swift
// ShieldActionExtension.swift
import ManagedSettingsUI
import ManagedSettings

class ShieldActionExtension: ShieldActionDelegate {
    
    override func handle(action: ShieldAction, for application: Application, completionHandler: @escaping (ShieldActionResponse) -> Void) {
        switch action {
        case .primaryButtonPressed:
            // User tapped "Request More Time"
            sendTimeRequest(for: application)
            completionHandler(.defer)  // Keep shield up while waiting
            
        case .secondaryButtonPressed:
            // User tapped "OK" - just dismiss
            completionHandler(.close)
            
        @unknown default:
            completionHandler(.close)
        }
    }
    
    override func handle(action: ShieldAction, for webDomain: WebDomain, completionHandler: @escaping (ShieldActionResponse) -> Void) {
        switch action {
        case .primaryButtonPressed:
            sendAccessRequest(for: webDomain)
            completionHandler(.defer)
            
        case .secondaryButtonPressed:
            completionHandler(.close)
            
        @unknown default:
            completionHandler(.close)
        }
    }
    
    private func sendTimeRequest(for application: Application) {
        // Store request in App Groups
        let userDefaults = UserDefaults(suiteName: "group.app.mindfulbalance")
        
        let request: [String: Any] = [
            "type": "time_extension",
            "timestamp": Date().timeIntervalSince1970,
            "status": "pending"
        ]
        
        if let data = try? JSONSerialization.data(withJSONObject: request) {
            userDefaults?.set(data, forKey: "pendingTimeRequest")
        }
        
        // Trigger notification to parent app
        DistributedNotificationCenter.default().post(
            name: NSNotification.Name("TimeExtensionRequested"),
            object: nil
        )
    }
    
    private func sendAccessRequest(for webDomain: WebDomain) {
        // Similar implementation for web domain requests
    }
}
```

### 3.3 Policy Enforcement

**Timeline:** Week 9

**Purpose:** Apply and manage restrictions

```swift
// PolicyEnforcer.swift
import ManagedSettings
import FamilyControls

class PolicyEnforcer {
    
    let store = ManagedSettingsStore()
    
    struct Policy {
        var dailyLimitMinutes: Int
        var bedtimeStart: DateComponents?
        var bedtimeEnd: DateComponents?
        var blockedCategories: Set<ActivityCategoryToken>
        var blockedApps: Set<ApplicationToken>
    }
    
    func applyShields(for selection: FamilyActivitySelection) {
        store.shield.applications = selection.applicationTokens
        store.shield.applicationCategories = ShieldSettings.ActivityCategoryPolicy.specific(selection.categoryTokens)
    }
    
    func removeShields() {
        store.shield.applications = nil
        store.shield.applicationCategories = nil
    }
    
    func grantTimeExtension(minutes: Int) {
        // Temporarily remove shields
        removeShields()
        
        // Schedule re-application
        DispatchQueue.main.asyncAfter(deadline: .now() + Double(minutes * 60)) { [weak self] in
            // Re-apply shields after extension expires
            if let data = UserDefaults(suiteName: "group.app.mindfulbalance")?.data(forKey: "selectedApps"),
               let selection = try? JSONDecoder().decode(FamilyActivitySelection.self, from: data) {
                self?.applyShields(for: selection)
            }
        }
    }
    
    func setAppRestrictions(selection: FamilyActivitySelection, allowed: Bool) {
        if allowed {
            store.shield.applications = nil
            store.shield.applicationCategories = nil
        } else {
            store.shield.applications = selection.applicationTokens
            store.shield.applicationCategories = ShieldSettings.ActivityCategoryPolicy.specific(selection.categoryTokens)
        }
    }
}
```

---

## Phase 4: Integration (Weeks 10-11)

### 4.1 Capacitor Bridge Plugin

**Timeline:** Week 10

**Purpose:** Bridge Swift Screen Time functionality to React Native

```swift
// ScreenTimePlugin.swift
import Capacitor
import FamilyControls
import DeviceActivity

@objc(ScreenTimePlugin)
public class ScreenTimePlugin: CAPPlugin {
    
    private let manager = ScreenTimeManager.shared
    private let scheduleManager = ScheduleManager()
    private let enforcer = PolicyEnforcer()
    
    @objc func requestAuthorization(_ call: CAPPluginCall) {
        Task {
            do {
                try await manager.requestAuthorization()
                call.resolve(["authorized": true])
            } catch {
                call.reject("Authorization failed", nil, error)
            }
        }
    }
    
    @objc func checkAuthorizationStatus(_ call: CAPPluginCall) {
        manager.checkAuthorizationStatus()
        let status: String
        switch manager.authorizationStatus {
        case .approved:
            status = "approved"
        case .denied:
            status = "denied"
        case .notDetermined:
            status = "notDetermined"
        }
        call.resolve(["status": status])
    }
    
    @objc func startMonitoring(_ call: CAPPluginCall) {
        guard let limitMinutes = call.getInt("dailyLimitMinutes") else {
            call.reject("Missing dailyLimitMinutes parameter")
            return
        }
        
        // Get saved selection from App Groups
        guard let data = UserDefaults(suiteName: "group.app.mindfulbalance")?.data(forKey: "selectedApps"),
              let selection = try? JSONDecoder().decode(FamilyActivitySelection.self, from: data) else {
            call.reject("No apps selected for monitoring")
            return
        }
        
        do {
            try scheduleManager.startDailyMonitoring(
                limits: ScheduleManager.DailyLimits(totalMinutes: limitMinutes),
                selection: selection
            )
            call.resolve(["success": true])
        } catch {
            call.reject("Failed to start monitoring", nil, error)
        }
    }
    
    @objc func stopMonitoring(_ call: CAPPluginCall) {
        scheduleManager.stopAllMonitoring()
        enforcer.removeShields()
        call.resolve(["success": true])
    }
    
    @objc func grantTimeExtension(_ call: CAPPluginCall) {
        guard let minutes = call.getInt("minutes") else {
            call.reject("Missing minutes parameter")
            return
        }
        
        enforcer.grantTimeExtension(minutes: minutes)
        call.resolve(["success": true])
    }
    
    @objc func openAppPicker(_ call: CAPPluginCall) {
        // Present the FamilyActivityPicker
        DispatchQueue.main.async {
            // This would need to present a SwiftUI view
            // Implementation depends on how the app presents native views
            call.resolve(["success": true])
        }
    }
}
```

### 4.2 JavaScript Interface

**Timeline:** Week 10

```typescript
// src/sdk/native/screenTime.ts
import { Capacitor, registerPlugin } from '@capacitor/core';

interface ScreenTimePlugin {
  requestAuthorization(): Promise<{ authorized: boolean }>;
  checkAuthorizationStatus(): Promise<{ status: 'approved' | 'denied' | 'notDetermined' }>;
  startMonitoring(options: { dailyLimitMinutes: number }): Promise<{ success: boolean }>;
  stopMonitoring(): Promise<{ success: boolean }>;
  grantTimeExtension(options: { minutes: number }): Promise<{ success: boolean }>;
  openAppPicker(): Promise<{ success: boolean }>;
}

const ScreenTime = registerPlugin<ScreenTimePlugin>('ScreenTimePlugin');

export class ScreenTimeManager {
  static isAvailable(): boolean {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';
  }

  static async requestAuthorization(): Promise<boolean> {
    if (!this.isAvailable()) {
      console.warn('[ScreenTime] Not available on this platform');
      return false;
    }
    
    try {
      const result = await ScreenTime.requestAuthorization();
      return result.authorized;
    } catch (error) {
      console.error('[ScreenTime] Authorization failed:', error);
      return false;
    }
  }

  static async checkStatus(): Promise<'approved' | 'denied' | 'notDetermined'> {
    if (!this.isAvailable()) {
      return 'notDetermined';
    }
    
    const result = await ScreenTime.checkAuthorizationStatus();
    return result.status;
  }

  static async startMonitoring(dailyLimitMinutes: number): Promise<boolean> {
    if (!this.isAvailable()) return false;
    
    try {
      const result = await ScreenTime.startMonitoring({ dailyLimitMinutes });
      return result.success;
    } catch (error) {
      console.error('[ScreenTime] Failed to start monitoring:', error);
      return false;
    }
  }

  static async stopMonitoring(): Promise<boolean> {
    if (!this.isAvailable()) return false;
    
    try {
      const result = await ScreenTime.stopMonitoring();
      return result.success;
    } catch (error) {
      console.error('[ScreenTime] Failed to stop monitoring:', error);
      return false;
    }
  }

  static async grantTimeExtension(minutes: number): Promise<boolean> {
    if (!this.isAvailable()) return false;
    
    try {
      const result = await ScreenTime.grantTimeExtension({ minutes });
      return result.success;
    } catch (error) {
      console.error('[ScreenTime] Failed to grant extension:', error);
      return false;
    }
  }

  static async openAppPicker(): Promise<boolean> {
    if (!this.isAvailable()) return false;
    
    try {
      const result = await ScreenTime.openAppPicker();
      return result.success;
    } catch (error) {
      console.error('[ScreenTime] Failed to open picker:', error);
      return false;
    }
  }
}
```

### 4.3 Integration with Existing Engine

**Timeline:** Week 11

**Purpose:** Connect native Screen Time to existing risk/intervention system

```typescript
// src/sdk/native/screenTimeIntegration.ts
import { ScreenTimeManager } from './screenTime';
import { SDK } from '@/sdk';

export class ScreenTimeIntegration {
  /**
   * Initialize Screen Time for a youth user
   */
  static async initializeForYouth(dailyLimitMinutes: number): Promise<boolean> {
    // Request authorization
    const authorized = await ScreenTimeManager.requestAuthorization();
    if (!authorized) {
      console.warn('[Integration] Screen Time authorization denied');
      return false;
    }

    // Start monitoring with the policy limit
    return ScreenTimeManager.startMonitoring(dailyLimitMinutes);
  }

  /**
   * Handle intervention from backend
   */
  static async handleIntervention(intervention: {
    type: 'soft_nudge' | 'medium_friction' | 'hard_block';
    id: string;
  }): Promise<void> {
    if (intervention.type === 'hard_block') {
      // Native Screen Time will handle the shield
      // Just acknowledge the intervention
      await SDK.interventions.acknowledge(intervention.id);
    }
  }

  /**
   * Handle time extension request from child
   */
  static async handleTimeExtensionRequest(
    requestId: string,
    approved: boolean,
    minutes?: number
  ): Promise<void> {
    if (approved && minutes) {
      await ScreenTimeManager.grantTimeExtension(minutes);
    }
    // Update request status in backend
    // This would call your edge function
  }

  /**
   * Sync policies from backend to native
   */
  static async syncPolicies(policies: {
    dailyLimitMinutes: number;
    bedtimeStart?: string;
    bedtimeEnd?: string;
  }): Promise<void> {
    // Stop existing monitoring
    await ScreenTimeManager.stopMonitoring();
    
    // Restart with new limits
    await ScreenTimeManager.startMonitoring(policies.dailyLimitMinutes);
    
    // TODO: Handle bedtime schedule
  }
}
```

---

## Phase 5: Polish (Weeks 12-13)

### 5.1 Testing Checklist

**Timeline:** Week 12

- [ ] Unit tests for all Swift extensions
- [ ] Integration tests for Capacitor bridge
- [ ] End-to-end tests for complete flow:
  - [ ] Parent authorization
  - [ ] App selection
  - [ ] Monitoring start/stop
  - [ ] Threshold triggers
  - [ ] Shield display
  - [ ] Time extension requests
  - [ ] Bedtime enforcement
- [ ] Test on multiple iOS versions (16.0+)
- [ ] Test on multiple device types
- [ ] Battery impact testing
- [ ] Memory usage profiling

### 5.2 App Store Preparation

**Timeline:** Week 13

**Metadata:**
- [ ] App Store screenshots showing parental consent flow
- [ ] Video preview demonstrating key features
- [ ] App description emphasizing parental control use case
- [ ] Privacy nutrition labels accurately completed
- [ ] Age rating: 4+ (parental control app)

**Review Notes:**
```
This app uses the Family Controls entitlement for legitimate parental control purposes.

Key points for review:
1. FamilyControls authorization is required before any monitoring begins
2. Only parents can configure monitoring policies
3. Children are always informed that monitoring is active
4. No content surveillance - only aggregated usage time

Test Accounts:
- Parent: parent-test@example.com / [password]
- Youth: youth-test@example.com / [password]

The parent account has generated invite code "TEST-2025" for linking.
```

### 5.3 Launch Checklist

- [ ] Privacy Policy live at public URL
- [ ] Terms of Service live at public URL
- [ ] Support email configured
- [ ] Crash reporting enabled
- [ ] Analytics configured (privacy-compliant)
- [ ] Backend scaled for launch traffic
- [ ] App Store listing complete
- [ ] Marketing website ready

---

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Entitlement rejection | Medium | Critical | Prepare thorough documentation, legitimate use case |
| API changes | Low | High | Design abstraction layer, monitor Apple announcements |
| Extension crashes | Medium | Medium | Comprehensive error handling, graceful degradation |
| Battery drain | Medium | Medium | Optimize monitoring frequency, use efficient scheduling |
| User confusion | Low | Medium | Clear onboarding, in-app tutorials |

---

## Resources

### Apple Documentation
- [FamilyControls Framework](https://developer.apple.com/documentation/familycontrols)
- [DeviceActivity Framework](https://developer.apple.com/documentation/deviceactivity)
- [ManagedSettings Framework](https://developer.apple.com/documentation/managedsettings)
- [Screen Time API WWDC Sessions](https://developer.apple.com/videos/)

### Sample Code
- [Apple Screen Time Sample](https://developer.apple.com/documentation/familycontrols/building_a_screen_time_app)

### Entitlement Request
- [Family Controls Request Form](https://developer.apple.com/contact/request/family-controls-entitlement)

---

*Document Version: 1.0*  
*Last Updated: January 2025*
*Author: Mindful Balance Engine Team*
