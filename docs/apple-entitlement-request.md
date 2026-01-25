# Apple Family Controls Entitlement Request

## Application for `com.apple.developer.family-controls` Entitlement

---

### 1. Company Information

**Company Name:** Dominic Prabhu (Sole Proprietor)  
**Developer Account:** WN8GUJ2936  
**Contact Email:** dominic@agentbill.io  
**Website:** TBD  
**App Name:** Mindful Balance Engine  
**Bundle ID:** app.lovable.b9bc557477734076b710d1364bf57e42

---

### 2. Executive Summary

We are developing **Mindful Balance Engine**, a parental control and digital wellness application designed to help families manage children's screen time and promote healthy technology habits. Our application requires the Family Controls entitlement to provide parents with effective tools to protect their children from excessive and potentially harmful digital media consumption.

---

### 3. Purpose and Use Case

#### 3.1 Primary Objective

Mindful Balance Engine is a **parental control application** that enables parents and guardians to:

- Monitor and manage their child's device usage
- Set healthy screen time limits and schedules
- Receive alerts when concerning usage patterns are detected
- Enforce age-appropriate restrictions during school hours and bedtime

#### 3.2 Target Users

| User Type | Description |
|-----------|-------------|
| **Parents/Guardians** | Adults who set up and manage policies for their children's devices |
| **Youth (Under 18)** | Children whose device usage is monitored with parental consent |

#### 3.3 Problem We're Solving

Research indicates that excessive screen time, particularly on social media platforms, is linked to:
- Increased anxiety and depression in adolescents
- Sleep disruption from late-night device usage
- Reduced academic performance
- Addictive behavioral patterns (doom-scrolling)

Our application addresses these concerns by providing parents with proactive tools to establish healthy digital boundaries.

---

### 4. Regulatory Compliance: UAE Child Digital Safety (CDS) Law

#### 4.1 Legal Context

Our application is designed to support compliance with the **UAE Child Digital Safety (CDS) Law**, which mandates:

- **Parental oversight** of children's digital activities
- **Age-appropriate content controls** for minors
- **Time-based restrictions** to protect children's wellbeing
- **Transparent monitoring** with clear consent mechanisms

#### 4.2 How Our App Supports Compliance

| CDS Requirement | Our Implementation |
|-----------------|-------------------|
| Parental Control | Family linking system with parent-managed policies |
| Usage Monitoring | Real-time session tracking and behavioral analytics |
| Time Restrictions | Configurable daily limits, session limits, and bedtime schedules |
| Intervention System | Graduated interventions (nudges → friction → blocks) |
| Audit Trail | Complete logging of interventions and policy changes |
| Consent | Explicit family linking with invite code system |

---

### 5. Requested Screen Time API Usage

#### 5.1 FamilyControls Framework

**Purpose:** Establish parental authorization and family sharing relationships.

**Specific Use:**
- Request parental authorization during onboarding
- Verify family group membership
- Ensure only authorized parents can configure restrictions

```swift
// Authorization request flow
AuthorizationCenter.shared.requestAuthorization(for: .individual) { result in
    switch result {
    case .success:
        // Parent authorized - enable monitoring
    case .failure(let error):
        // Handle authorization failure
    }
}
```

#### 5.2 DeviceActivity Framework

**Purpose:** Monitor device usage and trigger interventions at defined thresholds.

**Specific Use:**
- Track cumulative daily screen time
- Detect when usage exceeds parent-defined limits
- Trigger warnings at 80% and 100% of daily limits
- Monitor app category usage (social media, games, etc.)

```swift
// Example: Schedule monitoring for daily limits
let schedule = DeviceActivitySchedule(
    intervalStart: DateComponents(hour: 0, minute: 0),
    intervalEnd: DateComponents(hour: 23, minute: 59),
    repeats: true
)

let center = DeviceActivityCenter()
try center.startMonitoring(.dailyLimit, during: schedule)
```

#### 5.3 ManagedSettings Framework

**Purpose:** Enforce restrictions when limits are exceeded or during restricted periods.

**Specific Use:**
- Shield applications when daily limits are reached
- Enforce bedtime schedules (e.g., 9 PM - 7 AM)
- Block specific app categories during school hours
- Display custom intervention screens

```swift
// Example: Apply shield when limit exceeded
let store = ManagedSettingsStore()
store.shield.applications = selectedApps
store.shield.applicationCategories = .init(including: [.socialNetworking])
```

---

### 6. User Experience Flow

#### 6.1 Parent Setup Flow

```
1. Parent downloads app → Creates account (role: parent)
2. Parent generates invite code for child's device
3. Parent configures policies:
   - Daily screen time limit (e.g., 2 hours)
   - Bedtime schedule (e.g., 9 PM - 7 AM)
   - App categories to monitor
   - Alert thresholds
4. System requests FamilyControls authorization
5. Monitoring begins with parent-defined rules
```

#### 6.2 Child Experience Flow

```
1. Child installs app → Enters parent's invite code
2. Family link established (with parent's approval)
3. App runs in background monitoring usage
4. At 80% of limit → Soft nudge notification
5. At 100% of limit → App shielding activates
6. During bedtime → Scheduled shields applied
7. Child can request more time (parent approves/denies)
```

#### 6.3 Intervention Escalation

| Stage | Trigger | Action |
|-------|---------|--------|
| **Soft Nudge** | 80% of daily limit | Notification with usage summary |
| **Medium Friction** | 100% of daily limit | Modal with countdown, can dismiss once |
| **Hard Block** | Continued use after limit | App shielding via ManagedSettings |
| **Parent Alert** | Pattern detected | Push notification to parent device |

---

### 7. Privacy and Data Handling

#### 7.1 Data We Collect

| Data Type | Purpose | Storage |
|-----------|---------|---------|
| Session duration | Calculate daily usage | Encrypted cloud database |
| App open/close times | Detect usage patterns | Encrypted cloud database |
| Intervention responses | Measure effectiveness | Encrypted cloud database |
| Family relationships | Link parent-child accounts | Encrypted cloud database |

#### 7.2 Data We Do NOT Collect

- ❌ Specific content viewed within apps
- ❌ Messages or communications
- ❌ Location data
- ❌ Photos or media files
- ❌ Browsing history details
- ❌ Keystrokes or input data

#### 7.3 Data Protection Measures

- All data encrypted in transit (TLS 1.3) and at rest (AES-256)
- Row-Level Security ensures users only access their own data
- Parent accounts can only view linked child data
- Data retention policies aligned with GDPR requirements
- Users can request complete data deletion

---

### 8. Differentiation from Misuse Cases

We understand Apple's concern about preventing surveillance and stalkerware. Our application is fundamentally different:

| Stalkerware Characteristics | Our Application |
|----------------------------|-----------------|
| Installed secretly | Requires explicit family linking with invite codes |
| Tracks adults without consent | Only monitors minors with parental authorization |
| Collects detailed content | Only aggregates usage time, no content access |
| Hidden operation | Visible app with clear status indicators |
| No user control | Youth can see their own usage and request more time |

#### 8.1 Consent Mechanisms

1. **Parental Consent:** Parent must create account and generate invite code
2. **Device Authorization:** iOS FamilyControls authorization prompt required
3. **Visible Monitoring:** Child always knows monitoring is active
4. **Transparency:** Both parent and child can view policies and usage data

---

### 9. Technical Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    User Interface                        │
│              (React Native / Capacitor)                  │
├─────────────────────────────────────────────────────────┤
│                  Behavioral Engine                       │
│    • Risk calculation    • Policy evaluation            │
│    • Intervention logic  • Family management            │
├─────────────────────────────────────────────────────────┤
│              Native Swift Extensions                     │
│  ┌─────────────────┐  ┌─────────────────────────────┐  │
│  │ DeviceActivity  │  │ ShieldConfiguration         │  │
│  │ Monitor         │  │ Provider                    │  │
│  │ Extension       │  │ Extension                   │  │
│  └─────────────────┘  └─────────────────────────────┘  │
├─────────────────────────────────────────────────────────┤
│                 iOS Screen Time APIs                     │
│  • FamilyControls  • DeviceActivity  • ManagedSettings  │
└─────────────────────────────────────────────────────────┘
```

---

### 10. App Store Compliance

We commit to full compliance with:

- **App Store Review Guidelines** (Section 5.1.1 - Data Collection and Storage)
- **App Store Review Guidelines** (Section 5.1.2 - Data Use and Sharing)
- **Human Interface Guidelines** for Screen Time
- **App Tracking Transparency** requirements
- **Kids Category Guidelines** (if applicable)

---

### 11. Supporting Documentation

We can provide upon request:

- [ ] Privacy Policy document
- [ ] Terms of Service document
- [ ] Data Processing Agreement
- [ ] GDPR compliance documentation
- [ ] Security audit reports
- [ ] App demonstration video
- [ ] Test account credentials for review

---

### 12. Contact for Review

**Primary Contact:**  
Name: Dominic Prabhu  
Role: Founder & CEO  
Email: dominic@agentbill.io  
Phone: +44 7466 400071

**Technical Contact:**  
Name: Dominic Prabhu  
Role: Founder & Lead Developer  
Email: dominic@agentbill.io

---

### 13. Declaration

We hereby declare that:

1. This application will be used exclusively for legitimate parental control purposes
2. All monitoring requires explicit parental authorization via FamilyControls
3. We will not use these APIs for surveillance of adults
4. We will comply with all Apple guidelines and applicable laws
5. We will implement all required consent mechanisms
6. We will maintain transparency with all users about data collection

**Authorized Signature:**

_________________________  
Dominic Prabhu  
Founder & CEO  
January 2025

---

## Submission Checklist

Before submitting to Apple:

- [ ] Complete all bracketed fields with actual company information
- [ ] Review and update bundle ID if changed
- [ ] Attach privacy policy document
- [ ] Prepare demo video showing parental control flow
- [ ] Create test accounts for Apple review team
- [ ] Verify compliance with latest App Store guidelines

## Submission Portal

Submit this request at: https://developer.apple.com/contact/request/family-controls-entitlement

---

*Document Version: 1.0*  
*Last Updated: January 2025*  
*Classification: Confidential - For Apple Review Only*
