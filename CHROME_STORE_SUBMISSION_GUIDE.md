# Chrome Web Store Submission Guide

This document contains all the justifications and information needed to submit your LinkedEmpire extension to the Chrome Web Store.

---

## 📋 **PERMISSION JUSTIFICATIONS**

### 1. **activeTab Permission**
**Justification:**
The `activeTab` permission is required to interact with the currently active LinkedIn tab when the user clicks the extension icon. This allows the extension to:
- Read and interact with LinkedIn pages to perform automation tasks (sending connection requests, messages, viewing profiles)
- Access page content only when the user actively invokes the extension
- Ensure the extension only works on LinkedIn pages that the user is actively viewing

**Usage:** The extension uses activeTab to access LinkedIn page content when users perform actions like sending messages, adding connections, or managing campaigns through the extension interface.

---

### 2. **alarms Permission**
**Justification:**
The `alarms` permission is essential for scheduling automated tasks and follow-up actions. The extension uses alarms to:
- Schedule delayed message follow-ups based on user-configured wait times
- Automatically check and update campaign statuses at regular intervals
- Execute campaign sequence steps (connection requests, messages, profile views) at scheduled times
- Manage network updates for lead sequences

**Usage:** 
- Campaign automation: Schedules actions like sending follow-up messages days after initial contact
- Network updates: Periodically checks campaign status and executes next steps in sequences
- Message follow-ups: Delays message sending based on user-defined wait periods (e.g., wait 3 days before follow-up)

**Example:** When a user sets up a campaign to send a follow-up message 3 days after an initial connection request, the extension creates an alarm that triggers after 3 days to execute the follow-up action.

---

### 3. **cookies Permission**
**Justification:**
The `cookies` permission is required to authenticate with LinkedIn on behalf of the user. The extension uses cookies to:
- Access LinkedIn session cookies to maintain user authentication
- Verify that the user is logged into LinkedIn before performing actions
- Ensure all actions are performed in the context of the authenticated user's LinkedIn account
- Maintain session state for API calls to LinkedIn

**Usage:** The extension reads LinkedIn cookies (specifically `.linkedin.com` domain cookies) to:
- Verify user authentication status
- Pass authentication tokens when making API requests to LinkedIn
- Ensure all automation actions are performed as the authenticated user

**Data Handling:** Cookies are only read, never modified. The extension does not store cookie values permanently - they are accessed in real-time when needed for authentication.

---

### 4. **host_permissions (Host Permissions)**
**Justification:**
Host permissions are required for the extension to function properly:

**`*://*.linkedin.com/*` and `https://www.linkedin.com/*`:**
- Required to inject content scripts into LinkedIn pages
- Enables the extension to interact with LinkedIn's interface (sending messages, adding connections, viewing profiles)
- Allows reading LinkedIn page content to extract profile information and connection data
- Necessary for all core functionality as the extension is specifically designed for LinkedIn automation

**`https://app.linkdominator.com/*` and `https://linkedempire.com/*`:**
- Required to communicate with the backend platform API
- Enables synchronization of campaign data, user settings, and automation configurations
- Allows fetching campaign sequences, audience lists, and other data from the platform
- Necessary for storing campaign results and analytics

**Usage:** 
- LinkedIn domains: All automation features (messages, connections, profile views, etc.)
- Platform domains: API communication for campaign management, data synchronization, and user account management

---

### 5. **remote code use (Remote Code)**
**Justification:**
The extension uses remote code execution in a controlled manner:
- Executes JavaScript code on LinkedIn pages to perform automation actions (clicking buttons, filling forms, extracting data)
- Uses `chrome.scripting.executeScript` to inject functionality into LinkedIn tabs
- All code execution is user-initiated and only occurs on LinkedIn domains
- Remote code is used to interact with LinkedIn's dynamic page content that requires JavaScript execution

**Usage:**
- Automating LinkedIn actions: Executing scripts to send messages, add connections, view profiles
- Data extraction: Reading profile information, connection lists, and page content
- Form interaction: Filling and submitting LinkedIn forms programmatically

**Security:** All remote code execution is scoped to LinkedIn domains only and requires user interaction to initiate.

---

### 6. **scripting Permission**
**Justification:**
The `scripting` permission is required to inject and execute JavaScript code on LinkedIn pages. This enables:
- Content script injection to add UI elements and functionality to LinkedIn pages
- Programmatic interaction with LinkedIn's interface (clicking buttons, filling forms, reading data)
- Dynamic content manipulation required for automation features
- Execution of scripts in background tabs for automated actions

**Usage:**
- Content scripts: Injects UI elements and functionality into LinkedIn pages
- Automation scripts: Executes actions like sending messages, adding connections, viewing profiles
- Data extraction: Reads profile information and page content for campaign management

**Scope:** Scripting is only used on LinkedIn domains (`*.linkedin.com`) and is essential for all core extension functionality.

---

### 7. **storage Permission**
**Justification:**
The `storage` permission is required to store user data and campaign information locally. The extension uses storage to:
- Store campaign configurations and sequences locally for faster access
- Save user preferences and settings
- Cache audience lists and connection data
- Store scheduled action information for alarm-based execution
- Maintain state between extension sessions

**Usage:**
- Campaign data: Stores campaign sequences, node models, and execution state
- User settings: Saves user preferences and configuration
- Scheduled actions: Stores information about delayed actions (follow-up messages, campaign steps)
- Session data: Maintains temporary data like call IDs, connection status, and active campaigns

**Data Types Stored:**
- Campaign configurations and sequences
- User preferences and settings
- Scheduled action metadata
- Temporary session data (not sensitive authentication data)

---

## 📝 **SINGLE PURPOSE DESCRIPTION**

**Single Purpose:**
LinkedEmpire is a LinkedIn automation and lead generation tool that helps users manage their LinkedIn networking activities. The extension provides a single, focused purpose: automating LinkedIn interactions such as sending connection requests, messages, and managing campaigns to help users build and nurture their professional network more efficiently.

---

## 📄 **DETAILED DESCRIPTION** (Minimum 25 characters)

**Recommended Description:**
```
LinkedEmpire is a comprehensive LinkedIn automation and lead generation extension designed to help professionals and businesses grow their network efficiently. 

Key Features:
• Automated Connection Management: Send and manage connection requests with intelligent filtering
• Message Automation: Schedule and send personalized messages to your network
• Campaign Management: Create and execute multi-step LinkedIn campaigns
• Lead Generation: Build and manage your LinkedIn audience with advanced filtering
• Profile Analytics: Track profile views, connection acceptance rates, and engagement metrics
• Auto-Respond: Automatically respond to messages with AI-powered responses
• Follow-up Sequences: Schedule delayed follow-up messages to nurture relationships
• Birthday & Anniversary Wishes: Automatically send personalized wishes to your network

The extension integrates seamlessly with LinkedIn, allowing you to automate repetitive tasks while maintaining authentic engagement. All actions are performed on your behalf using your LinkedIn account, ensuring compliance with LinkedIn's terms of service.

Perfect for sales professionals, recruiters, marketers, and anyone looking to expand their professional network on LinkedIn.
```

---

## 🔒 **DATA USAGE CERTIFICATION**

**Data Collection and Usage:**
- **User Data:** The extension stores campaign configurations, user preferences, and LinkedIn connection data locally in the browser
- **LinkedIn Data:** Accesses LinkedIn profile information, connection lists, and messages only when the user actively uses the extension
- **Platform Communication:** Sends campaign data and analytics to app.linkdominator.com and linkedempire.com for synchronization and account management
- **No Third-Party Sharing:** User data is only shared with the LinkedEmpire platform for account management and is not sold or shared with third parties
- **Authentication:** Uses LinkedIn session cookies for authentication - cookies are read but never modified or stored permanently

**Compliance:**
- All data collection is necessary for core functionality
- User data is stored securely and locally when possible
- Platform communication is encrypted via HTTPS
- Users can manage their data through the LinkedEmpire platform

---

## 📧 **CONTACT EMAIL SETUP**

1. Go to the **Account** tab in Chrome Web Store Developer Dashboard
2. Enter your contact email address (e.g., support@linkedempire.com or your business email)
3. Verify the email address by clicking the verification link sent to your email
4. Ensure the email is monitored for support inquiries from users

---

## ✅ **CHECKLIST BEFORE SUBMISSION**

- [ ] All permission justifications entered in Privacy Practices tab
- [ ] Single purpose description entered
- [ ] Detailed description is at least 25 characters (recommended: 200-500 characters)
- [ ] Data usage certification completed
- [ ] Contact email added and verified in Account tab
- [ ] Extension tested and working correctly
- [ ] Privacy policy URL added (if required)
- [ ] Screenshots and promotional images uploaded
- [ ] Store listing information completed

---

## 📌 **QUICK COPY-PASTE JUSTIFICATIONS**

### activeTab
```
The activeTab permission allows the extension to interact with the currently active LinkedIn tab when users click the extension icon. This enables the extension to read and interact with LinkedIn pages to perform automation tasks like sending connection requests, messages, and viewing profiles. The extension only accesses page content when the user actively invokes it.
```

### alarms
```
The alarms permission is essential for scheduling automated tasks and follow-up actions. The extension uses alarms to schedule delayed message follow-ups based on user-configured wait times, automatically check and update campaign statuses at regular intervals, and execute campaign sequence steps at scheduled times. For example, when a user sets up a campaign to send a follow-up message 3 days after an initial connection request, the extension creates an alarm that triggers after 3 days to execute the follow-up action.
```

### cookies
```
The cookies permission is required to authenticate with LinkedIn on behalf of the user. The extension reads LinkedIn session cookies to verify user authentication, maintain session state for API calls, and ensure all actions are performed in the context of the authenticated user's LinkedIn account. Cookies are only read, never modified, and are not stored permanently.
```

### host_permissions
```
Host permissions are required for core functionality: LinkedIn domains (*.linkedin.com) enable the extension to inject content scripts and interact with LinkedIn's interface for automation features. Platform domains (app.linkdominator.com, linkedempire.com) enable communication with the backend API for campaign management, data synchronization, and user account management.
```

### remote code
```
The extension uses remote code execution to interact with LinkedIn's dynamic page content. Scripts are executed on LinkedIn pages to automate actions like sending messages, adding connections, and viewing profiles. All code execution is user-initiated, scoped to LinkedIn domains only, and requires user interaction to initiate.
```

### scripting
```
The scripting permission enables the extension to inject and execute JavaScript code on LinkedIn pages. This is essential for adding UI elements, programmatically interacting with LinkedIn's interface (clicking buttons, filling forms, reading data), and executing automation features. Scripting is only used on LinkedIn domains and is essential for all core extension functionality.
```

### storage
```
The storage permission stores user data and campaign information locally. This includes campaign configurations and sequences, user preferences, scheduled action information for alarm-based execution, and temporary session data. All data is stored locally in the browser and synchronized with the LinkedEmpire platform for account management.
```

---

**Last Updated:** 2026-01-14
**Extension Name:** LinkedEmpire
**Version:** 1.0.0
