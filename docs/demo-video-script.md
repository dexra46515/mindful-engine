# Apple Review Demo Video Script

## Video Overview

**Title:** Mindful Balance Engine - Parental Control Flow Demo  
**Duration:** ~90 seconds  
**Purpose:** Demonstrate legitimate parental control use case for Family Controls entitlement  
**Audience:** Apple App Review Team

---

## Storyboard

### Scene 1: Introduction (0:00 - 0:10)

**Visual:** App logo with tagline
**Text Overlay:** "Mindful Balance Engine - Parental Control for Digital Wellness"
**Narration:** "Mindful Balance Engine helps parents protect their children from excessive screen time."

---

### Scene 2: Parent Setup (0:10 - 0:25)

**Visual:** Parent's device showing signup flow

```
┌─────────────────────────────┐
│     Create Account          │
│                             │
│  Email: parent@email.com    │
│  Password: ••••••••         │
│                             │
│  I am a: [✓] Parent         │
│          [ ] Youth          │
│          [ ] Adult          │
│                             │
│     [Create Account]        │
└─────────────────────────────┘
```

**Text Overlay:** "Step 1: Parent creates account"
**Narration:** "First, the parent creates an account and selects their role."

---

### Scene 3: Generate Invite Code (0:25 - 0:35)

**Visual:** Parent dashboard with invite code generation

```
┌─────────────────────────────┐
│     Family Dashboard        │
│                             │
│  Link Your Child's Device   │
│                             │
│  ┌─────────────────────┐    │
│  │     ABC-123-XYZ     │    │
│  └─────────────────────┘    │
│                             │
│  Share this code with your  │
│  child to link devices      │
│                             │
│     [Generate New Code]     │
└─────────────────────────────┘
```

**Text Overlay:** "Step 2: Parent generates invite code"
**Narration:** "The parent generates a unique invite code to share with their child."

---

### Scene 4: Child Device Setup (0:35 - 0:50)

**Visual:** Child's device showing code entry

```
┌─────────────────────────────┐
│     Join Family             │
│                             │
│  Enter the code from your   │
│  parent's device:           │
│                             │
│  ┌─────────────────────┐    │
│  │     ABC-123-XYZ     │    │
│  └─────────────────────┘    │
│                             │
│     [Link to Family]        │
│                             │
│  By continuing, you agree   │
│  to parental monitoring     │
└─────────────────────────────┘
```

**Text Overlay:** "Step 3: Child enters code on their device"
**Narration:** "The child enters the code, with clear notice that monitoring will be enabled."

---

### Scene 5: iOS Authorization Prompt (0:50 - 1:05)

**Visual:** iOS FamilyControls authorization dialog

```
┌─────────────────────────────┐
│                             │
│  "Mindful Balance Engine"   │
│  would like to access       │
│  Screen Time                 │
│                             │
│  This will allow the app    │
│  to monitor and manage      │
│  app usage on this device.  │
│                             │
│  ┌─────────┐ ┌───────────┐  │
│  │ Don't   │ │  Allow    │  │
│  │ Allow   │ │           │  │
│  └─────────┘ └───────────┘  │
│                             │
└─────────────────────────────┘
```

**Text Overlay:** "Step 4: iOS requests explicit authorization"
**Narration:** "iOS displays the standard FamilyControls authorization prompt. The child must explicitly approve monitoring."

---

### Scene 6: Parent Configures Policies (1:05 - 1:20)

**Visual:** Parent's policy configuration screen

```
┌─────────────────────────────┐
│     Set Limits for Emma     │
│                             │
│  Daily Screen Time          │
│  ┌──────────────────────┐   │
│  │ ◀──────●────────▶   │   │
│  │      2 hours         │   │
│  └──────────────────────┘   │
│                             │
│  Bedtime Schedule           │
│  Start: 9:00 PM             │
│  End:   7:00 AM             │
│                             │
│  Apps to Monitor            │
│  [✓] Social Media           │
│  [✓] Games                  │
│  [ ] Education              │
│                             │
│     [Save Policies]         │
└─────────────────────────────┘
```

**Text Overlay:** "Step 5: Parent sets limits and schedules"
**Narration:** "The parent configures daily limits, bedtime schedules, and which app categories to monitor."

---

### Scene 7: Monitoring in Action (1:20 - 1:35)

**Visual:** Split screen - Child using device / Parent dashboard

**Left Panel (Child's View):**
```
┌─────────────────────────────┐
│  ⏱️ 1h 45m used today       │
│                             │
│  ┌─────────────────────┐    │
│  │                     │    │
│  │   [Social Media     │    │
│  │    App Running]     │    │
│  │                     │    │
│  └─────────────────────┘    │
│                             │
│  15 minutes remaining       │
└─────────────────────────────┘
```

**Right Panel (Parent's View):**
```
┌─────────────────────────────┐
│  Emma's Activity            │
│                             │
│  Today: 1h 45m / 2h         │
│  ████████████████░░░ 87%    │
│                             │
│  Current: Social Media      │
│  Risk Level: Medium ⚠️      │
│                             │
│  Recent: Approaching limit  │
└─────────────────────────────┘
```

**Text Overlay:** "Real-time monitoring with transparency"
**Narration:** "Both parent and child can see usage in real-time. The child always knows monitoring is active."

---

### Scene 8: Intervention Flow (1:35 - 1:50)

**Visual:** Child's device showing graduated interventions

**Frame 1 - Soft Nudge:**
```
┌─────────────────────────────┐
│  ┌───────────────────────┐  │
│  │ ⏰ Time Check          │  │
│  │ You've used 1h 45m    │  │
│  │ 15 minutes remaining  │  │
│  │         [Got it]      │  │
│  └───────────────────────┘  │
└─────────────────────────────┘
```

**Frame 2 - App Shield (when limit reached):**
```
┌─────────────────────────────┐
│                             │
│     🛡️ Screen Time Limit    │
│                             │
│  You've reached your daily  │
│  limit for Social Media     │
│                             │
│  ┌─────────────────────┐    │
│  │  Request More Time  │    │
│  └─────────────────────┘    │
│                             │
│  Time resets at midnight    │
│                             │
└─────────────────────────────┘
```

**Text Overlay:** "Graduated interventions with app shielding"
**Narration:** "When limits are reached, apps are shielded. The child can request more time from the parent."

---

### Scene 9: Time Request Flow (1:50 - 2:05)

**Visual:** Request flow between devices

**Child's Device:**
```
┌─────────────────────────────┐
│     Request More Time       │
│                             │
│  How much time do you need? │
│                             │
│  [ ] 15 minutes             │
│  [✓] 30 minutes             │
│  [ ] 1 hour                 │
│                             │
│  Reason (optional):         │
│  ┌─────────────────────┐    │
│  │ Finishing homework  │    │
│  └─────────────────────┘    │
│                             │
│     [Send Request]          │
└─────────────────────────────┘
```

**Parent's Device (Notification):**
```
┌─────────────────────────────┐
│  📱 Time Request from Emma  │
│                             │
│  Requesting: 30 minutes     │
│  Reason: Finishing homework │
│                             │
│  [Deny]         [Approve]   │
└─────────────────────────────┘
```

**Text Overlay:** "Child can request time, parent approves"
**Narration:** "Children can request additional time with a reason. Parents approve or deny remotely."

---

### Scene 10: Closing (2:05 - 2:15)

**Visual:** App logo with key points

```
┌─────────────────────────────┐
│                             │
│     Mindful Balance         │
│        Engine               │
│                             │
│  ✓ Explicit parental        │
│    authorization required   │
│                             │
│  ✓ Child always aware       │
│    monitoring is active     │
│                             │
│  ✓ Transparent policies     │
│    visible to all parties   │
│                             │
│  ✓ Built for families,      │
│    not surveillance         │
│                             │
└─────────────────────────────┘
```

**Text Overlay:** "Protecting families, not surveilling them"
**Narration:** "Mindful Balance Engine - legitimate parental controls built with transparency and consent."

---

## Production Notes

### Required Test Accounts for Apple Review

| Account Type | Email | Password | Role |
|--------------|-------|----------|------|
| Parent | parent-test@example.com | [secure password] | Parent |
| Youth | youth-test@example.com | [secure password] | Youth (linked to parent) |

### Key Points to Emphasize

1. **Explicit Consent:** FamilyControls authorization prompt is shown
2. **Transparency:** Child always knows monitoring is active
3. **Legitimate Use:** Only for parent-child relationships
4. **No Surveillance:** Aggregated time data only, no content tracking
5. **User Control:** Child can request more time, see their own data

### Technical Requirements

- Record on iPhone 14 Pro or newer
- iOS 17+ to show latest FamilyControls UI
- Portrait orientation
- 1080p minimum resolution
- Clear audio narration
- Captions for accessibility

---

## Video File Naming

`MindfulBalanceEngine_ParentalControl_Demo_v1.mp4`

---

*Script Version: 1.0*  
*Last Updated: January 2025*
