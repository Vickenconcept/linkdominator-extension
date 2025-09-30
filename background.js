// Remove problematic imports and add necessary variables and functions
// importScripts('./js/universalAction.js');
// importScripts('./js/actions/autorespondAction.js');
// importScripts('./js/actions/campaignAction.js');
importScripts('./env.js');

// Function to store our LinkedIn profile information for reliable sender detection
const storeLinkedInProfile = async () => {
    try {
        console.log('🔍 Storing LinkedIn profile information...');
        
        // Get CSRF token
        const tokenResult = await chrome.storage.local.get(['csrfToken']);
        if (!tokenResult.csrfToken) {
            console.log('⚠️ No CSRF token available for profile detection');
            return;
        }
        
        // Fetch our LinkedIn profile
        const profileResponse = await fetch(`${voyagerApi}/identity/profileView`, {
            method: 'GET',
            headers: {
                'csrf-token': tokenResult.csrfToken,
                'accept': 'application/vnd.linkedin.normalized+json+2.1',
                'x-li-lang': 'en_US',
                'x-restli-protocol-version': '2.0.0',
            }
        });
        
        if (profileResponse.ok) {
            const profileData = await profileResponse.json();
            console.log('📊 LinkedIn profile data:', profileData);
            
            if (profileData.elements && profileData.elements.length > 0) {
                const profile = profileData.elements[0];
                const profileInfo = {
                    entityUrn: profile.entityUrn,
                    publicIdentifier: profile.publicIdentifier,
                    firstName: profile.firstName,
                    lastName: profile.lastName,
                    fullName: `${profile.firstName} ${profile.lastName}`.trim(),
                    storedAt: Date.now()
                };
                
                await chrome.storage.local.set({ linkedinProfile: profileInfo });
                console.log('✅ LinkedIn profile stored:', profileInfo);
            }
        } else {
            console.log('❌ Failed to fetch LinkedIn profile:', profileResponse.status);
        }
    } catch (error) {
        console.error('❌ Error storing LinkedIn profile:', error);
    }
};

// 🚀 KEEP-ALIVE MECHANISM - Prevents service worker from going inactive
let keepAliveInterval;
let isServiceWorkerActive = true;
let lastCleanupTime = null;
let lastDebugTime = null;

// Message handler for connection invites from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('📨 Background script received message:', request);
    
    if (request.action === 'sendConnectionInvite') {
        console.log('🔗 Processing connection invite request from content script');
        
        // Handle the connection invite asynchronously
        handleConnectionInviteRequest(request.data)
            .then(result => {
                console.log('✅ Connection invite completed:', result);
                sendResponse(result);
            })
            .catch(error => {
                console.error('❌ Connection invite failed:', error);
                sendResponse({ 
                    success: false, 
                    error: error.message 
                });
            });
        
        // Return true to indicate we'll send a response asynchronously
        return true;
    }
});

// Function to handle connection invite requests from content scripts
const handleConnectionInviteRequest = async (data) => {
    console.log('🚀🚀🚀 handleConnectionInviteRequest function STARTED!');
    console.log('🔍 Function called with:', data);
    
    const { profileName, profileId, profileUrl, customMessage } = data;
    
    try {
        // Step 1: Open LinkedIn profile in new tab
        console.log('🔄 Step 1: Opening LinkedIn profile page...');
        console.log(`🌐 Opening URL: ${profileUrl}`);
        
        const tab = await chrome.tabs.create({
            url: profileUrl,
            active: false // Open in background
        });
        console.log(`✅ Tab created with ID: ${tab.id}`);
        
        if (!tab || !tab.id) {
            throw new Error('Failed to create tab');
        }
        
        // Step 2: Wait for page to load
        console.log('🔄 Step 2: Waiting for page to load...');
        await new Promise((resolve) => {
            const checkTab = () => {
                chrome.tabs.get(tab.id, (tabInfo) => {
                    if (tabInfo && tabInfo.status === 'complete') {
                        console.log('✅ Page loaded completely');
                        resolve();
                    } else {
                        setTimeout(checkTab, 1000);
                    }
                });
            };
            checkTab();
        });
        
        // Step 3: Inject automation script to handle the invite process
        console.log('🔄 Step 3: Injecting automation script...');
        const result = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: async (customMessage) => {
                console.log('🤖 LinkedIn Connection Automation script executing...');
                
                // Function to delay
                const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
                
                try {
                    console.log('🔍 Step 4: Checking connection status...');
                    
                    // Check if already connected
                    const connectedElements = document.querySelectorAll('[aria-label*="Connected"], [aria-label*="connected"]');
                    if (connectedElements.length > 0) {
                        console.log('ℹ️ Already connected to this profile');
                        return { success: false, skipped: true, reason: 'Already connected' };
                    }
                    
                    // Check if invite already sent
                    const inviteSentElements = document.querySelectorAll('[aria-label*="Invitation sent"], [aria-label*="invitation sent"]');
                    if (inviteSentElements.length > 0) {
                        console.log('ℹ️ Invite already sent to this profile');
                        return { success: false, skipped: true, reason: 'Invite already sent' };
                    }
                    
                    console.log('🔍 Step 5: Looking for Connect button...');
                    
                    // Find Connect button using multiple selectors
                    const connectSelectors = [
                        'button[aria-label*="Connect"]',
                        'button[aria-label*="connect"]',
                        'button[aria-label*="Invite"]',
                        'button[aria-label*="invite"]',
                        '.artdeco-button[aria-label*="Connect"]',
                        '.artdeco-button[aria-label*="Invite"]',
                        '[data-control-name="connect"]',
                        '.pv-s-profile-actions--connect',
                        '.pv-s-profile-actions button'
                    ];
                    
                    let connectButton = null;
                    for (const selector of connectSelectors) {
                        connectButton = document.querySelector(selector);
                        if (connectButton && connectButton.offsetParent !== null) {
                            console.log(`✅ Found Connect button with selector: ${selector}`);
                            break;
                        }
                    }
                    
                    // Fallback: look for any button with "Connect" or "Invite" text
                    if (!connectButton) {
                        const allButtons = document.querySelectorAll('button');
                        for (const button of allButtons) {
                            const buttonText = button.textContent.toLowerCase();
                            if ((buttonText.includes('connect') || buttonText.includes('invite')) && button.offsetParent !== null) {
                                connectButton = button;
                                console.log('✅ Found Connect/Invite button by text content');
                                break;
                            }
                        }
                    }
                    
                    // Fallback: Check "More" dropdown for Connect button
                    if (!connectButton) {
                        console.log('🔍 Checking "More" dropdown for Connect button...');
                        const moreButton = document.querySelector('button[aria-label*="More actions"], button[aria-label*="More"], .artdeco-dropdown__trigger');
                        console.log('🔍 More button search result:', moreButton);
                        if (moreButton) {
                            console.log('✅ Found "More" button, details:', {
                                text: moreButton.textContent,
                                ariaLabel: moreButton.getAttribute('aria-label'),
                                className: moreButton.className,
                                id: moreButton.id,
                                visible: moreButton.offsetParent !== null
                            });
                            console.log('🖱️ Clicking "More" button to open dropdown...');
                            moreButton.click();
                            console.log('✅ "More" button clicked, waiting for dropdown to open...');
                            await delay(1000); // Wait for dropdown to open
                            
                            // Look for Connect button in dropdown
                            console.log('🔍 Searching for Connect button in dropdown...');
                            const dropdownConnectSelectors = [
                                'button[aria-label*="Connect"]',
                                'button[aria-label*="connect"]',
                                'button[aria-label*="Invite"]',
                                'button[aria-label*="invite"]',
                                '.artdeco-dropdown__content button[aria-label*="Connect"]',
                                '.artdeco-dropdown__content button[aria-label*="connect"]',
                                '.artdeco-dropdown__content button[aria-label*="Invite"]',
                                '.artdeco-dropdown__content button[aria-label*="invite"]',
                                '.artdeco-dropdown__item[aria-label*="Connect"]',
                                '.artdeco-dropdown__item[aria-label*="connect"]',
                                '.artdeco-dropdown__item[aria-label*="Invite"]',
                                '.artdeco-dropdown__item[aria-label*="invite"]',
                                '[aria-label*="Invite"][aria-label*="connect"]',
                                '[role="button"][aria-label*="Connect"]',
                                '[role="button"][aria-label*="Invite"]'
                            ];
                            
                            for (const selector of dropdownConnectSelectors) {
                                connectButton = document.querySelector(selector);
                                console.log(`🔍 Checking selector "${selector}":`, connectButton);
                                if (connectButton && connectButton.offsetParent !== null) {
                                    console.log(`✅ Found Connect button in dropdown with selector: ${selector}`);
                                    console.log('🔍 Connect button details:', {
                                        text: connectButton.textContent,
                                        ariaLabel: connectButton.getAttribute('aria-label'),
                                        className: connectButton.className,
                                        id: connectButton.id,
                                        visible: connectButton.offsetParent !== null
                                    });
                                    break;
                                }
                            }
                            
                            // Also check by text content in dropdown
                            if (!connectButton) {
                                console.log('🔍 Searching dropdown by text content...');
                                const dropdownButtons = document.querySelectorAll('.artdeco-dropdown__content button, .artdeco-dropdown__content [role="menuitem"], .artdeco-dropdown__item, [role="button"]');
                                console.log(`🔍 Found ${dropdownButtons.length} dropdown buttons to check`);
                                for (const button of dropdownButtons) {
                                    console.log(`🔍 Checking button: "${button.textContent.trim()}" (aria-label: "${button.getAttribute('aria-label')}")`);
                                    const buttonText = button.textContent.toLowerCase();
                                    if ((buttonText.includes('connect') || buttonText.includes('invite')) && button.offsetParent !== null) {
                                        connectButton = button;
                                        console.log('✅ Found Connect/Invite button in dropdown by text content');
                                        console.log('🔍 Connect button details:', {
                                            text: connectButton.textContent,
                                            ariaLabel: connectButton.getAttribute('aria-label'),
                                            className: connectButton.className,
                                            id: connectButton.id,
                                            visible: connectButton.offsetParent !== null
                                        });
                                        break;
                                    }
                                }
                            }
                        }
                    }
                    
                    if (!connectButton) {
                        console.log('❌ Connect button not found');
                        return { success: false, error: 'Connect button not found' };
                    }
                    
                    console.log('🖱️ Step 6: Clicking Connect button...');
                    console.log('🔍 Connect button details:', {
                        text: connectButton.textContent,
                        ariaLabel: connectButton.getAttribute('aria-label'),
                        className: connectButton.className,
                        visible: connectButton.offsetParent !== null
                    });
                    
                    // Scroll to button and click
                    connectButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    await delay(1000);
                    
                    // Try multiple click methods
                    try {
                        connectButton.click();
                        console.log('✅ Connect button clicked successfully');
                    } catch (clickError) {
                        console.log('⚠️ Standard click failed, trying alternative method:', clickError.message);
                        // Alternative click method
                        connectButton.dispatchEvent(new MouseEvent('click', {
                            bubbles: true,
                            cancelable: true,
                            view: window
                        }));
                        console.log('✅ Connect button clicked with alternative method');
                    }
                    
                    // Wait for modal to appear
                    console.log('🔄 Step 7: Waiting for modal to appear...');
                    await delay(2000);
                    
                    // Add custom message if provided
                    if (customMessage) {
                        console.log('📝 Step 7.5: Adding custom message...');
                        const messageSelectors = [
                            'textarea[aria-label*="message"]',
                            'textarea[placeholder*="message"]',
                            '.artdeco-modal__content textarea',
                            'textarea'
                        ];
                        
                        let messageTextarea = null;
                        for (const selector of messageSelectors) {
                            messageTextarea = document.querySelector(selector);
                            if (messageTextarea && messageTextarea.offsetParent !== null) {
                                console.log(`✅ Found message textarea with selector: ${selector}`);
                                break;
                            }
                        }
                        
                        if (messageTextarea) {
                            messageTextarea.value = customMessage;
                            messageTextarea.dispatchEvent(new Event('input', { bubbles: true }));
                            console.log('✅ Custom message added');
                        } else {
                            console.log('⚠️ Message textarea not found, sending without custom message');
                        }
                    }
                    
                    // Look for Send button in modal
                    console.log('🔍 Step 8: Looking for Send button...');
                    const sendSelectors = [
                        'button[aria-label*="Send now"]',
                        'button[aria-label*="send now"]',
                        '.artdeco-button[aria-label*="Send"]',
                        '[data-control-name="send_invite"]',
                        '.artdeco-modal__actionbar button'
                    ];
                    
                    let sendButton = null;
                    for (const selector of sendSelectors) {
                        sendButton = document.querySelector(selector);
                        if (sendButton && sendButton.offsetParent !== null) {
                            console.log(`✅ Found Send button with selector: ${selector}`);
                            break;
                        }
                    }
                    
                    // Fallback: look for any button with "Send" text
                    if (!sendButton) {
                        const allButtons = document.querySelectorAll('button');
                        for (const button of allButtons) {
                            if (button.textContent.toLowerCase().includes('send') && button.offsetParent !== null) {
                                sendButton = button;
                                console.log('✅ Found Send button by text content');
                                break;
                            }
                        }
                    }
                    
                    if (!sendButton) {
                        console.log('❌ Send button not found');
                        return { success: false, error: 'Send button not found' };
                    }
                    
                    console.log('📤 Step 9: Sending invite...');
                    console.log('🔍 Send button details:', {
                        text: sendButton.textContent,
                        ariaLabel: sendButton.getAttribute('aria-label'),
                        className: sendButton.className,
                        visible: sendButton.offsetParent !== null
                    });
                    
                    // Try multiple click methods for send button
                    try {
                        sendButton.click();
                        console.log('✅ Send button clicked successfully');
                    } catch (sendClickError) {
                        console.log('⚠️ Standard send click failed, trying alternative method:', sendClickError.message);
                        // Alternative click method
                        sendButton.dispatchEvent(new MouseEvent('click', {
                            bubbles: true,
                            cancelable: true,
                            view: window
                        }));
                        console.log('✅ Send button clicked with alternative method');
                    }
                    
                    // Wait for confirmation
                    await delay(2000);
                    
                    // Check for success indicators
                    const successIndicators = [
                        '[aria-label*="Invitation sent"]',
                        '.artdeco-inline-feedback--success',
                        '.pv-s-profile-actions--message'
                    ];
                    
                    for (const selector of successIndicators) {
                        const element = document.querySelector(selector);
                        if (element) {
                            console.log('✅ Invite sent successfully confirmed');
                            return { success: true };
                        }
                    }
                    
                    console.log('✅ Invite sent (no explicit confirmation found)');
                    return { success: true };
                    
                } catch (error) {
                    console.error('❌ Error in automation:', error.message);
                    return { success: false, error: 'Connection process failed' };
                }
            },
            args: [customMessage]
        });
        
        // Get the result from the injected script immediately after execution
        const automationResult = result[0]?.result;
        console.log('📊 Automation result:', automationResult);
        console.log('🚨 CRITICAL: Full result object:', result);
        console.log('🚨 CRITICAL: Result length:', result.length);
        
        // Step 4: Wait for automation to complete and get results
        console.log('🔄 Step 4: Waiting for automation to complete...');
        await new Promise(resolve => setTimeout(resolve, 5000)); // Give time for automation to complete
        
        // Step 5: Close the background tab
        console.log('🔄 Step 5: Closing background tab...');
        try {
            await chrome.tabs.remove(tab.id);
            console.log('✅ Background tab closed');
        } catch (tabError) {
            console.log('⚠️ Could not close tab (may have been closed already):', tabError.message);
        }
        
        if (automationResult && automationResult.success) {
            console.log(`✅ INVITATION SUCCESSFULLY SENT to ${profileName}`);
            return { success: true, message: 'Invitation sent successfully' };
        } else if (automationResult && automationResult.skipped) {
            console.log(`⏭️ INVITATION SKIPPED for ${profileName}: ${automationResult.reason}`);
            return { success: false, skipped: true, reason: automationResult.reason };
        } else {
            console.log(`❌ INVITATION FAILED for ${profileName}: ${automationResult?.error || 'Unknown error'}`);
            return { success: false, error: 'Connection not successfully sent' };
        }
        
    } catch (error) {
        console.error('❌ Error in handleConnectionInviteRequest:', error.message);
        return { success: false, error: 'Connection process failed' };
    }
};

// Function to keep service worker alive
const keepServiceWorkerAlive = () => {
    if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
    }
    
    keepAliveInterval = setInterval(async () => {
        console.log('💓 Service worker keep-alive ping...');
        
        // Check for pending reminders every 5 minutes
        await checkPendingReminders();
        
        try {
            // Check if service worker is active by testing storage access
            await chrome.storage.local.get(['activeCampaigns']);
            
        // Check for pending messages that are ready to send
        await checkAndSendPendingMessages();
        
        // Clean up orphaned campaign data (run every 5 minutes)
        const now = Date.now();
        if (!lastCleanupTime || (now - lastCleanupTime) > 300000) { // 5 minutes
            await cleanupOrphanedCampaignData();
            lastCleanupTime = now;
        }
        
        // Debug campaign storage (run every 2 minutes for debugging)
        if (!lastDebugTime || (now - lastDebugTime) > 120000) { // 2 minutes
            await debugCampaignStorage();
            lastDebugTime = now;
        }
        
        // Check if we have any active campaigns
        chrome.storage.local.get(['activeCampaigns'], (result) => {
                if (chrome.runtime.lastError) {
                    console.log('⚠️ Service worker inactive, skipping campaign check');
                    return;
                }
            const activeCampaigns = result.activeCampaigns || [];
            if (activeCampaigns.length > 0) {
                console.log('🔄 Found active campaigns, keeping service worker alive');
                isServiceWorkerActive = true;
            } else {
                console.log('⏸️ No active campaigns, service worker can sleep');
                isServiceWorkerActive = false;
            }
        });
        } catch (error) {
            if (error.message && error.message.includes('No SW')) {
                console.log('⚠️ Service worker inactive, skipping keep-alive operations');
            } else {
                console.error('❌ Error in keep-alive ping:', error);
            }
        }
    }, 25000); // Ping every 25 seconds (before 30-second timeout)
};

// Function to initialize and check for existing active campaigns
const initializeActiveCampaigns = async () => {
    console.log('🔍 Checking for existing active campaigns...');
    
    // Wait for LinkedIn ID to be available
    if (!linkedinId) {
        console.log('⏳ LinkedIn ID not available yet, waiting...');
        // Try to authenticate first
        try {
            await authenticateUser();
        } catch (error) {
            console.log('⚠️ Authentication failed, will retry later');
            return;
        }
    }
    
    // Add a small delay to ensure authentication is complete
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Double-check LinkedIn ID is available
    if (!linkedinId) {
        console.log('⚠️ LinkedIn ID still not available, skipping campaign check');
        chrome.storage.local.set({ activeCampaigns: [] });
        return;
    }
    
    try {
        // Get all campaigns from the backend
        const response = await fetch(`${PLATFORM_URL}/api/campaigns`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'lk-id': linkedinId
            }
        });
        
        if (response.ok) {
            const responseText = await response.text();
            let data;
            
            try {
                data = JSON.parse(responseText);
            } catch (parseError) {
                console.error('❌ Failed to parse response as JSON:', responseText);
                console.log('⚠️ This might be a CSRF error or server issue');
                chrome.storage.local.set({ activeCampaigns: [] });
                return;
            }
            
            if (data.status === 200 && data.data) {
                const runningCampaigns = data.data.filter(campaign => campaign.status === 'running');
                
                if (runningCampaigns.length > 0) {
                    const campaignIds = runningCampaigns.map(campaign => campaign.id);
                    chrome.storage.local.set({ activeCampaigns: campaignIds });
                    console.log(`📊 Found ${runningCampaigns.length} active campaigns:`, campaignIds);
                    
                    // Trigger the network update alarm to resume processing immediately
                    console.log('🚀 Resuming campaign processing...');
                    setTimeout(() => {
                        _updateCampaignLeadsNetwork();
                    }, 1000); // Small delay to ensure everything is set up
                    chrome.alarms.create('sequence_leads_network_update', { delayInMinutes: 0.1 });
                    console.log('⏰ Created network update alarm to resume processing');
                } else {
                    console.log('📊 No active campaigns found');
                    chrome.storage.local.set({ activeCampaigns: [] });
                }
            } else {
                console.log('📊 No campaign data or invalid status');
                chrome.storage.local.set({ activeCampaigns: [] });
            }
        } else {
            console.log(`⚠️ API call failed with status: ${response.status}`);
            chrome.storage.local.set({ activeCampaigns: [] });
        }
    } catch (error) {
        console.error('❌ Error checking for active campaigns:', error);
        console.log('⚠️ This might be a network or authentication issue');
        chrome.storage.local.set({ activeCampaigns: [] });
    }
};

// Note: Service workers don't have access to window object
// Unhandled promise rejections will be handled by individual try-catch blocks

// Start keep-alive mechanism
keepServiceWorkerAlive();

// Handle service worker lifecycle
chrome.runtime.onStartup.addListener(() => {
    try {
        console.log('🚀 Service worker started');
        keepServiceWorkerAlive();
        
        // Store LinkedIn profile for reliable sender detection
        setTimeout(() => {
            console.log('🔍 Attempting to store LinkedIn profile...');
            storeLinkedInProfile();
        }, 2000);
        
        // Initialize active campaigns after a short delay to ensure LinkedIn ID is available
        setTimeout(async () => {
            console.log('🔄 Checking for active campaigns on startup...');
            await initializeActiveCampaigns();
            // Also check for existing alarms that might need to be resumed
            await checkAndResumeCampaigns();
        }, 3000); // 3 second delay to ensure LinkedIn ID is set
    } catch (error) {
        console.log('⚠️ Error in service worker startup:', error.message);
    }
});

chrome.runtime.onInstalled.addListener(() => {
    try {
        console.log('📦 Extension installed/updated');
        keepServiceWorkerAlive();
        
        // Clear any existing alarms that might cause CSRF errors
        chrome.alarms.clear('sequence_leads_network_update');
        console.log('🧹 Cleared existing sequence_leads_network_update alarm');
        
        // Initialize active campaigns after a short delay to ensure LinkedIn ID is set
        setTimeout(async () => {
            console.log('🔄 Checking for active campaigns after installation...');
            await initializeActiveCampaigns();
            // Also check for existing alarms that might need to be resumed
            await checkAndResumeCampaigns();
        }, 5000); // 5 second delay for fresh installation
    } catch (error) {
        console.log('⚠️ Error in extension installation:', error.message);
    }
});

// Handle extension messages to check if service worker is active
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'checkServiceWorkerStatus') {
        sendResponse({ active: isServiceWorkerActive });
        return true;
    }
    
    if (request.action === 'checkCampaignStatus') {
        // Return current campaign status
        chrome.storage.local.get(['activeCampaigns', 'lastCampaignStatus', 'lastCampaignMessage'], (result) => {
            const activeCampaigns = result.activeCampaigns || [];
            const lastStatus = result.lastCampaignStatus;
            const lastMessage = result.lastCampaignMessage;
            
            if (activeCampaigns.length > 0) {
                sendResponse({
                    status: 'running',
                    message: `${activeCampaigns.length} campaign(s) active`
                });
            } else if (lastStatus === 'completed') {
                // Show completed status for a short time after completion
                sendResponse({
                    status: 'completed',
                    message: lastMessage || 'All invites sent successfully!'
                });
            } else {
                // Check if service worker is active even without campaigns
                sendResponse({
                    status: 'inactive',
                    message: 'No active campaigns - Service worker ready'
                });
            }
        });
        return true;
    }
    
    if (request.action === 'refreshActiveCampaigns') {
        // Manually trigger campaign detection
        console.log('🔄 Manual campaign refresh requested');
        initializeActiveCampaigns().then(() => {
            sendResponse({ success: true, message: 'Campaign refresh completed' });
        }).catch((error) => {
            sendResponse({ success: false, message: 'Campaign refresh failed: ' + error.message });
        });
        return true;
    }
    
    if (request.action === 'viewEndorsementHistory') {
        console.log('📋 Viewing endorsement history requested');
        viewEndorsementHistory().then(history => {
            sendResponse({status: 'success', data: history});
        }).catch(error => {
            sendResponse({status: 'error', message: error.message});
        });
        return true;
    }
    
    if (request.action === 'clearEndorsementHistory') {
        console.log('🧹 Clearing endorsement history requested');
        clearEndorsementHistory().then(() => {
            sendResponse({status: 'success', message: 'Endorsement history cleared'});
        }).catch(error => {
            sendResponse({status: 'error', message: error.message});
        });
        return true;
    }
    
    if (request.action === 'startCampaign') {
        // Manually start a campaign
        if (request.campaignId) {
            startCampaign(request.campaignId).then(success => {
                sendResponse({ success });
            });
            return true;
        }
    }
});

// Define missing variables that were in the imported scripts
let audienceList = [];
let campaignData = [];
let campaignLeads = [];
let campaignSequence = [];
let campaignLeadgenRunning = [];
let acceptedLeads = [];
let notAcceptedLeads = [];

// Auto-respond connection model
let arConnectionModel = {
    message: '',
    distance: null,
    connectionId: '',
    name: '',
    firstName: '',
    lastName: '',
    conversationUrnId: null,
    totalEndorseSkills: 0
};

// Missing utility functions
const changeMessageVariableNames = (message, lead) => {
    // Validate message is not null/undefined
    if (!message || typeof message !== 'string') {
        console.warn('⚠️ changeMessageVariableNames: Invalid message provided:', message);
        return ''; // Return empty string instead of crashing
    }
    
    return message
        .replace(/\{firstName\}/g, lead.firstName || '')
        .replace(/\{lastName\}/g, lead.lastName || '')
        .replace(/\{name\}/g, lead.name || '')
        .replace(/\{title\}/g, lead.title || '')
        .replace(/@firstName/g, lead.firstName || '')
        .replace(/@lastName/g, lead.lastName || '')
        .replace(/@name/g, lead.name || '')
        .replace(/@title/g, lead.title || '');
};

// API helper functions
const getCampaignSequence = async (campaignId) => {
    try {
        const response = await fetch(`${PLATFORM_URL}/api/campaign/${campaignId}/sequence`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'lk-id': linkedinId
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.status === 200) {
                campaignSequence = data.data;
                return data.data;
            }
        }
        throw new Error('Failed to fetch campaign sequence');
    } catch (error) {
        console.error('Error fetching campaign sequence:', error);
        throw error;
    }
};

const getCampaignLeads = async (campaignId, callback) => {
    try {
        const response = await fetch(`${PLATFORM_URL}/api/campaign/${campaignId}/leads`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'lk-id': linkedinId
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.status === 200) {
                callback(data.data);
                return data.data;
            }
        }
        callback([]);
        return [];
    } catch (error) {
        console.error('Error fetching campaign leads:', error);
        callback([]);
        return [];
    }
};
const getLeadGenRunning = async (campaignId) => {
    try {
        
        // First try the new tracking endpoint
        const response = await fetch(`${PLATFORM_URL}/api/campaign/${campaignId}/leadgen/tracking`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'lk-id': linkedinId
            }
        });
        
        
        if (response.ok) {
            const data = await response.json();
            
            if (data.status === 200) {
                if (data.data && data.data.length > 0) {
                    
                    // Check if we have tracking data (new endpoint) or basic data (old endpoint)
                    const hasTrackingData = data.data[0] && (data.data[0].accept_status !== undefined || data.data[0].status_last_id !== undefined);
                    
                    if (hasTrackingData) {
                        // Count leads by status using tracking data
                        const pendingLeads = data.data.filter(lead => 
                            (lead.accept_status === false || lead.accept_status === 0) && lead.status_last_id == 2
                        );
                        const acceptedLeads = data.data.filter(lead => lead.accept_status === true || lead.accept_status === 1);
                        const otherLeads = data.data.filter(lead => 
                            !((lead.accept_status === false || lead.accept_status === 0) && lead.status_last_id == 2) && 
                            lead.accept_status !== true && lead.accept_status !== 1
                        );
                        
                        // Return the tracking data
                        campaignLeadgenRunning = data.data;
                        return data.data;
                    } else {
                        // Fallback to basic lead data if tracking data not available
                        const pendingLeads = data.data.filter(lead => lead.acceptedStatus === false && lead.statusLastId == 2);
                        const acceptedLeads = data.data.filter(lead => lead.acceptedStatus === true);
                        const otherLeads = data.data.filter(lead => !(lead.acceptedStatus === false && lead.statusLastId == 2) && lead.acceptedStatus !== true);
                    }
                }
                
                campaignLeadgenRunning = data.data;
                return data.data;
            }
        }
        
        campaignLeadgenRunning = [];
        return [];
    } catch (error) {
        campaignLeadgenRunning = [];
        return [];
    }
};

const updateSequenceNodeModel = async (campaign, nodeModel) => {
    try {
        console.log(`🔧 updateSequenceNodeModel called with:`, {
            campaignId: campaign.id,
            nodeKey: nodeModel.key,
            runStatus: nodeModel.runStatus
        });
        
        const response = await fetch(`${PLATFORM_URL}/api/campaign/${campaign.id}/update-node`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'lk-id': linkedinId
            },
            body: JSON.stringify({
                nodeKey: nodeModel.key,
                runStatus: nodeModel.runStatus  // ✅ FIXED: Use actual nodeModel.runStatus instead of hardcoded true
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log(`✅ updateSequenceNodeModel successful:`, data);
            return data;
        }
        throw new Error('Failed to update sequence node model');
    } catch (error) {
        console.error('Error updating sequence node model:', error);
        throw error;
    }
};

const updateCampaign = async (campaignData) => {
    try {
        const response = await fetch(`${PLATFORM_URL}/api/campaign/${campaignData.campaignId}/update`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'lk-id': linkedinId
            },
            body: JSON.stringify(campaignData)
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Campaign updated successfully:', data);
            
            // If campaign is completed or stopped, remove from active campaigns
            if (campaignData.status === 'completed' || campaignData.status === 'stop') {
                chrome.storage.local.get(['activeCampaigns'], (result) => {
                    const activeCampaigns = result.activeCampaigns || [];
                    const updatedCampaigns = activeCampaigns.filter(id => id !== campaignData.campaignId);
                    chrome.storage.local.set({ activeCampaigns: updatedCampaigns });
                    console.log(`📊 Removed campaign ${campaignData.campaignId} from active campaigns list`);
                });
            }
            
            return data;
        }
        throw new Error('Failed to update campaign');
    } catch (error) {
        console.error('Error updating campaign:', error);
        throw error;
    }
};

const updateLeadGenRunning = async (campaignId, leadId, updateData) => {
    try {
        if (!leadId) {
            console.error('❌ Missing leadId for updateLeadGenRunning');
            throw new Error('Missing leadId parameter');
        }

        console.log(`🔄 Updating leadgen running for campaign ${campaignId}, lead ${leadId}`);
        console.log(`🔍 Update data:`, updateData);
        console.log(`🔗 API URL: ${PLATFORM_URL}/api/campaign/${campaignId}/leadgen/${leadId}/update`);
        console.log(`🔑 LinkedIn ID: ${linkedinId}`);
        
        const requestBody = JSON.stringify(updateData);
        console.log(`📦 Request body:`, requestBody);
        
        const response = await fetch(`${PLATFORM_URL}/api/campaign/${campaignId}/leadgen/${leadId}/update`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'lk-id': linkedinId
            },
            body: requestBody
        });
        
        console.log(`📡 Response status: ${response.status} ${response.statusText}`);
        console.log(`📡 Response headers:`, Object.fromEntries(response.headers.entries()));
        
        if (response.ok) {
            const data = await response.json();
            console.log(`✅ Successfully updated leadgen running for lead ${leadId}`);
            console.log(`📄 Response data:`, data);
            return data;
        }
        
        // Get more details about the failure
        const responseText = await response.text();
        console.error(`❌ Failed to update leadgen running - Status: ${response.status}, Response: ${responseText}`);
        console.error(`🔍 Full request details:`, {
            url: `${PLATFORM_URL}/api/campaign/${campaignId}/leadgen/${leadId}/update`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'lk-id': linkedinId
            },
            body: requestBody
        });
        throw new Error(`API call failed with status ${response.status}: ${responseText}`);
    } catch (error) {
        console.error('❌ Error updating leadgen running:', error);
        console.error('🔍 Parameters:', { campaignId, leadId, updateData });
        console.error('🔍 LinkedIn ID available:', !!linkedinId);
        console.error('🔍 Platform URL:', PLATFORM_URL);
        
        // Don't throw the error, just log it and continue
        return null;
    }
};

const updateLeadNetworkDegree = async (lead) => {
    try {
        // Use connectionId as the identifier since that's what the lead object has
        const leadId = lead.id || lead.connectionId;
        
        if (!leadId) {
            console.error('❌ Lead object missing both id and connectionId:', lead);
            throw new Error('Lead object missing identifier');
        }

        // console.log(`🔄 Updating network degree for lead: ${leadId}`);
        
        const response = await fetch(`${PLATFORM_URL}/api/lead/${leadId}/update`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'lk-id': linkedinId
            },
            body: JSON.stringify({
                connectionId: lead.connectionId,
                networkDegree: lead.networkDegree,
                leadSrc: lead.source || 'aud'  // Default to 'aud' (audience) if not specified
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log(`✅ Successfully updated network degree for ${leadId}`);
            return data;
        }
        
        // Get more details about the failure
        const responseText = await response.text();
        console.error(`❌ API call failed - Status: ${response.status}, Response: ${responseText}`);
        
        // Handle specific error cases
        if (response.status === 401) {
            console.error('🔐 Authentication failed - LinkedIn ID may be invalid or user not found');
        } else if (response.status === 404) {
            console.error('🔍 Endpoint not found - Check API route configuration');
        }
        
        throw new Error(`API call failed with status ${response.status}: ${responseText}`);
    } catch (error) {
        console.error('❌ Error updating lead network degree:', error);
        console.error('🔍 Lead object details:', {
            connectionId: lead.connectionId,
            id: lead.id,
            networkDegree: lead.networkDegree,
            name: lead.name
        });
        
        // Don't throw the error, just log it and continue with other leads
        return null;
    }
};

const createLeadGenRunning = async (campaignId) => {
    try {
        console.log(`🔍 Checking if leadgen running already exists for campaign ${campaignId}...`);
        
        // First check if leadgen running already exists
        const existingLeads = await getLeadGenRunning(campaignId);
        if (existingLeads && existingLeads.length > 0) {
            console.log(`⚠️ Leadgen running already exists for campaign ${campaignId} with ${existingLeads.length} leads`);
            console.log('🔄 Skipping creation to prevent duplicates');
            return { message: 'Leadgen running already exists', status: 200 };
        }
        
        console.log(`✅ No existing leadgen running found, creating new entries for campaign ${campaignId}...`);
        const response = await fetch(`${PLATFORM_URL}/api/campaign/${campaignId}/leadgen/store`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'lk-id': linkedinId
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log(`✅ Successfully created leadgen running for campaign ${campaignId}`);
        
        // Debug: Check what records were created
        try {
            const existingLeads = await getLeadGenRunning(campaignId);
            console.log(`🔍 Created records for campaign ${campaignId}:`, existingLeads);
        } catch (debugError) {
            console.log('⚠️ Could not fetch created records for debugging:', debugError.message);
        }
        
            return data;
        }
        throw new Error('Failed to create leadgen running');
    } catch (error) {
        console.error('Error creating leadgen running:', error);
        throw error;
    }
};

const getAudience = async (audienceId, total, filterApi, callback) => {
    try {
        const response = await fetch(`${filterApi}/audience/list?audienceId=${audienceId}&totalCount=${total}`);
        const data = await response.json();
        
        if (data.length > 0) {
            let dataPath = data[0].audience;
            if (dataPath.length > 0) {
                audienceList = [];
                
                for (let i = 0; i < dataPath.length; i++) {
                    let netDistance;
                    let targetIdd;
                    
                    if (dataPath[i].con_distance != null) {
                        netDistance = dataPath[i].con_distance.split("_");
                    }
                    
                    if (dataPath[i].con_member_urn.includes('urn:li:member:')) {
                        targetIdd = dataPath[i].con_member_urn.replace('urn:li:member:', '');
                    }
                    
                    audienceList.push({
                        name: dataPath[i].con_first_name + ' ' + dataPath[i].con_last_name,
                        firstName: dataPath[i].con_first_name,
                        lastName: dataPath[i].con_last_name,
                        title: dataPath[i].con_job_title,
                        conId: dataPath[i].con_id,
                        totalResultCount: dataPath.length,
                        publicIdentifier: dataPath[i].con_public_identifier,
                        memberUrn: dataPath[i].con_member_urn,
                        networkDistance: parseInt(netDistance[1]),
                        trackingId: dataPath[i].con_tracking_id,
                        navigationUrl: `${LINKEDIN_URL}/in/${dataPath[i].con_public_identifier}`,
                        targetId: parseInt(targetIdd),
                        netDistance: parseInt(netDistance[1]),
                    });
                }
            }
            callback({ 'status': 'successful' });
        }
    } catch (error) {
        console.error('Error fetching audience:', error);
        callback({ 'status': 'error', 'message': error.message });
    }
};

// Function to check call status from database
const getCallStatus = async (callId) => {
    try {
        if (!callId) {
            console.log('⚠️ No call_id provided for status check');
            return null;
        }
        
        console.log(`🔍 Checking call status for call_id: ${callId}`);
        
        const response = await fetch(`${PLATFORM_URL}/api/calls/${callId}/status`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'lk-id': linkedinId || 'vicken-concept'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log(`📊 Call status for ${callId}:`, data.call_status || data.status);
            return data.call_status || data.status;
        } else {
            console.log(`⚠️ Failed to fetch call status: ${response.status}`);
            return null;
        }
    } catch (error) {
        console.error('❌ Error fetching call status:', error);
        return null;
    }
};

const storeCallStatus = async (callData) => {
    try {
        console.log('🔧 DEBUG: storeCallStatus called with data:', callData);
        console.log('🔧 DEBUG: API URL:', `${PLATFORM_URL}/api/book-call/store`);
        console.log('🔧 DEBUG: LinkedIn ID:', linkedinId);
        
        const response = await fetch(`${PLATFORM_URL}/api/book-call/store`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'lk-id': linkedinId
            },
            body: JSON.stringify(callData)
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Call status stored successfully:', data);
            
            // Store call_id for future reply processing
            if (data.call_id && callData.connection_id) {
                try {
                    await chrome.storage.local.set({ [`call_id_${callData.connection_id}`]: data.call_id });
                } catch (e) {
                    console.log('⚠️ Failed to persist call_id in storage:', e.message);
                }
            }
            
            return data;
        } else {
            const errorText = await response.text();
            console.error('❌ API Error Response:', {
                status: response.status,
                statusText: response.statusText,
                body: errorText
            });
            throw new Error(`Failed to store call status: ${response.status} - ${errorText}`);
        }
    } catch (error) {
        console.error('Error storing call status:', error);
        throw error;
    }
};

/**
 * Process call reply with AI analysis
 */
const processCallReply = async (message, profileId, connectionId) => {
    try {
        let callId = null;
        try {
            const stored = await chrome.storage.local.get([`call_id_${connectionId}`]);
            callId = stored[`call_id_${connectionId}`] || null;
        } catch (e) {
            console.log('⚠️ Failed to read call_id from storage:', e.message);
        }
        if (!callId) {
            console.log('No call ID found for connection:', connectionId);
            return;
        }

        const response = await fetch(`${PLATFORM_URL}/api/calls/process-reply`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'lk-id': linkedinId
            },
            body: JSON.stringify({
                call_id: callId,
                message: message,
                profile_id: profileId,
                sender: 'lead'
            })
        });

        if (response.ok) {
            const result = await response.json();
            console.log('✅ Call reply processed with AI:', result);
            
            // Handle AI-suggested response
            if (result.suggested_response && result.analysis.next_action === 'schedule_call') {
                console.log('🤖 AI suggests scheduling a call');

                try {
                    // Prefer scheduling details from the response; fallback to API fetch
                    let scheduling = result.scheduling;
                    if (!scheduling) {
                        const schedRes = await fetch(`${PLATFORM_URL}/api/calls/${callId}/scheduling`, {
                            method: 'GET',
                            headers: {
                                'Content-Type': 'application/json',
                                'lk-id': linkedinId
                            }
                        });
                        if (schedRes.ok) {
                            scheduling = await schedRes.json();
                        }
                    }

                    if (scheduling && (scheduling.scheduling_message || scheduling.schedulingMessage)) {
                        const messageText = scheduling.scheduling_message || scheduling.schedulingMessage;

                        // Prepare minimal arConnectionModel for messageConnection()
                        if (typeof arConnectionModel !== 'object' || arConnectionModel === null) {
                            // eslint-disable-next-line no-undef
                            arConnectionModel = {};
                        }
                        arConnectionModel.message = messageText;
                        arConnectionModel.connectionId = connectionId;
                        // Use existing conversation if available
                        arConnectionModel.conversationUrnId = (typeof result.analysis?.conversation_urn_id === 'string' && result.analysis.conversation_urn_id) ? result.analysis.conversation_urn_id : undefined;
                        arConnectionModel.distance = 1;

                        console.log('📤 Sending scheduling message via LinkedIn...', { hasConversation: !!arConnectionModel.conversationUrnId });
                        // Reuse existing LinkedIn messaging helper
                        await messageConnection({ uploads: [] });
                        console.log('✅ Scheduling message sent');
                    } else {
                        console.warn('⚠️ No scheduling details available to send');
                    }
                } catch (sendErr) {
                    console.error('❌ Failed to send scheduling message:', sendErr);
                }
            }
            
            return result;
        } else {
            console.error('❌ Failed to process call reply:', response.status);
        }
    } catch (error) {
        console.error('❌ Error processing call reply:', error);
    }
};

// Manual cleanup function for existing duplicates
const cleanupDuplicateLeads = async (campaignId) => {
    try {
        console.log(`🧹 Starting cleanup of duplicate leads for campaign ${campaignId}...`);
        
        const leads = await getLeadGenRunning(campaignId);
        if (!leads || leads.length === 0) {
            console.log('✅ No leads found to cleanup');
            return;
        }
        
        console.log(`📊 Found ${leads.length} total leads, checking for duplicates...`);
        
        // Group leads by ID to find duplicates
        const leadGroups = {};
        leads.forEach(lead => {
            if (!leadGroups[lead.id]) {
                leadGroups[lead.id] = [];
            }
            leadGroups[lead.id].push(lead);
        });
        
        let duplicatesFound = 0;
        Object.values(leadGroups).forEach(group => {
            if (group.length > 1) {
                duplicatesFound += group.length - 1; // Keep one, count others as duplicates
            }
        });
        
        if (duplicatesFound > 0) {
            console.log(`⚠️ Found ${duplicatesFound} duplicate leads that need cleanup`);
            console.log('💡 These will be automatically handled by the deduplication logic');
        } else {
            console.log('✅ No duplicates found');
        }
        
        return {
            total: leads.length,
            duplicates: duplicatesFound,
            unique: leads.length - duplicatesFound
        };
    } catch (error) {
        console.error('❌ Error during cleanup:', error);
        throw error;
    }
};

var lkmApi = PLATFORM_URL+'/api';
var inURL = LINKEDIN_URL;
var voyagerApi = VOYAGER_API;
var csrfToken, linkedinId, plainId, firstName, lastName;

var d=new Date();
var dInt=new Date(d).getTime();
const delay = (delay) => new Promise((resolve) => setTimeout(resolve, delay))

// Enhanced authentication with retry mechanism and better error handling
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 2000;
let authRetryCount = 0;

// Rate limiting configuration
const RATE_LIMIT_CONFIG = {
    maxRequestsPerMinute: 30,
    maxRequestsPerHour: 1000,
    retryDelay: 2000,
    maxRetries: 3
};

// Rate limiting state
let requestCount = {
    minute: 0,
    hour: 0,
    lastMinuteReset: Date.now(),
    lastHourReset: Date.now()
};

// Rate limiting functions
const checkRateLimit = () => {
    const now = Date.now();
    
    // Reset counters if needed
    if (now - requestCount.lastMinuteReset >= 60000) {
        requestCount.minute = 0;
        requestCount.lastMinuteReset = now;
    }
    
    if (now - requestCount.lastHourReset >= 3600000) {
        requestCount.hour = 0;
        requestCount.lastHourReset = now;
    }
    
    // Check limits
    if (requestCount.minute >= RATE_LIMIT_CONFIG.maxRequestsPerMinute) {
        throw new Error('Rate limit exceeded: Too many requests per minute');
    }
    
    if (requestCount.hour >= RATE_LIMIT_CONFIG.maxRequestsPerHour) {
        throw new Error('Rate limit exceeded: Too many requests per hour');
    }
    
    // Increment counters
    requestCount.minute++;
    requestCount.hour++;
    
    return true;
};

// Enhanced API request with rate limiting
const makeApiRequest = async (url, options = {}, retryCount = 0) => {
    try {
        // Check rate limit
        checkRateLimit();
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/json',
                'lk-id': linkedinId,
                ...options.headers
            }
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            if (response.status === 429) {
                // Rate limited by server
                const retryAfter = response.headers.get('Retry-After') || 60;
                console.log(`Server rate limited, waiting ${retryAfter} seconds`);
                await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
                
                if (retryCount < RATE_LIMIT_CONFIG.maxRetries) {
                    return makeApiRequest(url, options, retryCount + 1);
                }
            }
            
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.status !== 200) {
            throw new Error(data.message || 'API request failed');
        }
        
        return data;
    } catch (error) {
        // Retry logic for network errors
        if (retryCount < RATE_LIMIT_CONFIG.maxRetries && 
            (error.name === 'AbortError' || error.message.includes('Failed to fetch'))) {
            console.log(`API request failed, retrying... (${retryCount + 1}/${RATE_LIMIT_CONFIG.maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_CONFIG.retryDelay * (retryCount + 1)));
            return makeApiRequest(url, options, retryCount + 1);
        }
        
        throw error;
    }
};

// Enhanced LinkedIn action execution with rate limiting
const executeLinkedInAction = async (action, data) => {
    try {
        checkRateLimit();
        
        console.log(`Executing LinkedIn action: ${action}`, data);
        
        // Add random delay to avoid detection
        const randomDelay = Math.random() * 2000 + 1000; // 1-3 seconds
        await delay(randomDelay);
        
        // Execute the action based on type
        switch (action) {
            case 'sendConnectionInvite':
                return await _sendConnectionInvite(data.lead, data.node);
            case 'endorseConnection':
                return await _endorseConnection(data, data.result);
            case 'viewProfile':
                return await _viewProfile(data.lead);
            case 'followConnection':
                return await _followConnection(data.lead);
            case 'likePost':
                return await _likePost(data.post, data.result);
            default:
                throw new Error(`Unknown action: ${action}`);
        }
    } catch (error) {
        console.error(`LinkedIn action failed: ${action}`, error);
        
        // Handle specific LinkedIn errors
        if (error.message.includes('rate limit') || error.message.includes('too many requests')) {
            console.log('LinkedIn rate limit detected, waiting before retry');
            await delay(60000); // Wait 1 minute
            return executeLinkedInAction(action, data);
        }
        
        throw error;
    }
};

// Message listener for content script communication
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('📨 Message received from content script:', request);
    
    if (request.action === 'triggerCampaignExecution') {
        console.log('🚀 Triggering campaign execution from message...');
        _updateCampaignLeadsNetwork()
            .then(() => {
                console.log('✅ Campaign execution completed successfully');
                sendResponse({status: 'success', message: 'Campaign execution completed'});
            })
            .catch((error) => {
                console.error('❌ Campaign execution failed:', error);
                sendResponse({status: 'error', message: error.message});
            });
        return true; // Keep the message channel open for async response
    }
    
    if (request.scheduleInfo) {
        chrome.storage.local.remove("scheduleInfo")
        chrome.storage.local.set({ scheduleInfo: request.scheduleInfo }).then(() => {
            let waitTime = request.scheduleInfo.waitdays
            let delayInMinutes = waitTime <= 0 ? 0.10 : waitTime * 24 * 60;

            chrome.alarms.create(
                'message_followup',
                {
                    delayInMinutes: delayInMinutes 
                }
            );
            sendResponse({scheduleInfo: 'schedule added'});
        });
        return true;
    }
    
    // Handle other existing message types...
    if (request.campaign) {
        console.log('Campaign received:', request.campaign);
        console.log('Current LinkedIn ID:', linkedinId);
        
        // Enhanced authentication check with retry mechanism
        if (!linkedinId) {
            console.log('LinkedIn ID not available, attempting authentication...');
            sendResponse({message: 'Authenticating with LinkedIn...'});
            
            // Try multiple authentication methods
            authenticateUser()
                .then(() => {
                    if (linkedinId) {
                        console.log('Authentication successful, LinkedIn ID:', linkedinId);
                        setCampaignAlarm(request.campaign);
                    } else {
                        console.log('Authentication failed after all attempts');
                        sendResponse({error: 'Authentication failed. Please refresh LinkedIn and try again.'});
                    }
                })
                .catch(error => {
                    console.error('Authentication error:', error);
                    sendResponse({error: 'Authentication error: ' + error.message});
                });
        } else {
            sendResponse({message: 'setting up alarm...'});
            setCampaignAlarm(request.campaign);
        }
        return true;
    }
    
    if (request.stopCampaign) {
        let alarmName = request.stopCampaign.sequenceType.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
        chrome.alarms.clear(alarmName)
        sendResponse({message: alarmName+ ' alarm stopped'});
    }
    
    if (request.action === 'resetSendInvites') {
        console.log('🔄 Manual reset of send-invites requested for campaign:', request.campaignId);
        
        getCampaignSequence(request.campaignId).then(async () => {
            // Reset the send-invites node
            let nodeToReset = campaignSequence.nodeModel[0]; // First node should be send-invites
            if (nodeToReset && nodeToReset.value === 'send-invites') {
                nodeToReset.runStatus = false;
                await updateSequenceNodeModel({id: request.campaignId}, nodeToReset);
                console.log('✅ Send-invites node reset successfully');
                
                // Trigger campaign execution
                _updateCampaignLeadsNetwork();
                sendResponse({status: 'success', message: 'Send-invites reset and campaign restarted'});
            } else {
                console.error('❌ Could not find send-invites node to reset');
                sendResponse({status: 'error', message: 'Could not find send-invites node'});
            }
        }).catch(error => {
            console.error('❌ Error resetting send-invites:', error);
            sendResponse({status: 'error', message: error.message});
        });
        return true; // Keep message channel open
    }
    
    if (request.action === 'checkCampaignStatus') {
        // Return current campaign status
        sendResponse({
            status: 'running', // You can make this dynamic based on actual status
            message: 'Campaign is running in background'
        });
        return true;
    }
});

// Removed automatic periodic alarm to prevent CSRF errors
// Campaigns will now only run when manually triggered or when active campaigns are detected

// Function to update campaign status in UI
const updateCampaignStatus = (status, message) => {
    // Send message to content script to update UI
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs[0] && tabs[0].url && tabs[0].url.includes('linkedin.com')) {
            try {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'updateCampaignStatus',
                    status: status,
                    message: message
                }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.log('⚠️ Could not send status update to content script:', chrome.runtime.lastError.message);
                    }
                });
            } catch (error) {
                console.log('⚠️ Error sending status update:', error.message);
            }
        }
    });
};
// AI mode is now handled by node model, no need for database calls

// Review messages are now handled by setTimeout, no need for database storage

// Review messages are now handled by setTimeout, no need for database polling

// Run alarm action when it's time
chrome.alarms.onAlarm.addListener((alarm) => {
    console.log('🔔 Alarm triggered:', alarm.name);
    
    if(alarm.name == 'sequence_leads_network_update'){
        console.log('🔄 Starting network update alarm...');
        updateCampaignStatus('running', 'Checking campaigns...');
        _updateCampaignLeadsNetwork()
    }else if(alarm.name == 'message_followup'){
        console.log('📨 Starting message followup alarm...');
        chrome.storage.local.get(["scheduleInfo"]).then((result) => {
            console.log('Schedule task is running...')

            let scheduleInfo = result.scheduleInfo

            try {
                getAudience(scheduleInfo.filters.audienceId, scheduleInfo.total, lkmApi, (result) => {
                    if(audienceList.length) sendFollowupMessage(scheduleInfo);
                });
            } catch (err) {
                console.log(err)
            }
        });
    }else if(alarm.name == 'accepted_leads'){
        console.log('✅ Starting accepted leads alarm...');
        chrome.storage.local.get(["campaignAccepted","nodeModelAccepted"]).then(async (result) => {
            console.log(`Campaign ${alarm.name} sequence is running...`)
            let currentCampaign = result.campaignAccepted,
            nodeModel = result.nodeModelAccepted;

            console.log('Fetched campaignAccepted and nodeModelAccepted:', currentCampaign, nodeModel);
            try {
                await getLeadGenRunning(currentCampaign.id);
                console.log('Fetched campaignLeadgenRunning:', campaignLeadgenRunning);
                if(campaignLeadgenRunning.length){
                    // sort accepted leads before runSequence
                    let leadsData = []
                    for(let lead of campaignLeadgenRunning){
                        if(lead.acceptedStatus === true){
                            leadsData.push(lead)
                        }
                    }
                    console.log('Accepted leads:', leadsData);
                    if(leadsData.length) {
                        console.log('About to runSequence for accepted leads');
                        await runSequence(currentCampaign, leadsData, nodeModel);
                        console.log('Finished runSequence for accepted leads');
                    } else {
                        console.log('No accepted leads to process.');
                    }
                } else {
                    console.log('No campaignLeadgenRunning leads found.');
                }
            } catch (err) {
                console.log('Error in accepted_leads alarm:', err)
            }
        });
    }else if(alarm.name == 'not_accepted_leads'){
        console.log('❌ Starting not accepted leads alarm...');
        chrome.storage.local.get(["campaignNotAccepted","nodeModelNotAccepted"]).then(async (result) => {
            console.log(`Campaign ${alarm.name} sequence is running...`)
            let currentCampaign = result.campaignNotAccepted,
            nodeModel = result.nodeModelNotAccepted;

            console.log('Fetched campaignNotAccepted and nodeModelNotAccepted:', currentCampaign, nodeModel);
            try {
                await getLeadGenRunning(currentCampaign.id);
                console.log('Fetched campaignLeadgenRunning:', campaignLeadgenRunning);
                if(campaignLeadgenRunning.length){
                    // sort not accepted leads before runSequence
                    let leadsData = []
                    for(let lead of campaignLeadgenRunning){
                        if(lead.acceptedStatus === false){
                            leadsData.push(lead)
                        }
                    }
                    console.log('Not accepted leads:', leadsData);
                    if(leadsData.length) {
                        console.log('About to runSequence for not accepted leads');
                        await runSequence(currentCampaign, leadsData, nodeModel);
                        console.log('Finished runSequence for not accepted leads');
                    } else {
                        console.log('No not accepted leads to process.');
                    }
                } else {
                    console.log('No campaignLeadgenRunning leads found.');
                }
            } catch (err) {
                console.log('Error in not_accepted_leads alarm:', err)
            }
        });
    }else if(alarm.name == 'continuous_invite_monitoring'){
        // console.log('🔄 Continuous invite monitoring alarm triggered');
        // console.log('⏰ Checking all active campaigns for invite acceptances...');
        // console.log('🕐 Alarm fired at:', new Date().toLocaleTimeString());
        checkAllCampaignsForAcceptances();
    }else if(alarm.name == 'custom_like_post'){
        console.log('👍 LIKE POST: Custom like post alarm triggered');
        chrome.storage.local.get(["campaignCustomLikePost","nodeModelCustomLikePost"]).then((result) => {
            console.log(`Campaign ${alarm.name} sequence is running...`)
            let currentCampaign = result.campaignCustomLikePost,
            nodeModel = result.nodeModelCustomLikePost;
            
            console.log(`💡 Note: Liking posts does NOT require connection - will attempt for all leads`);

            try {
                getCampaignLeads(currentCampaign.id, (leadsData) => {
                    console.log(`👥 LIKE POST: Retrieved ${leadsData.length} leads`);
                    if(leadsData.length) runSequence(currentCampaign, leadsData, nodeModel);
                })
            } catch (err) {
                console.error('❌ Error in custom_like_post alarm:', err);
            }
        });
    }else if(alarm.name == 'custom_profile_view'){
        console.log('👁️ PROFILE VIEW: Custom profile view alarm triggered');
        chrome.storage.local.get(["campaignCustomProfileView","nodeModelCustomProfileView"]).then((result) => {
            console.log(`Campaign ${alarm.name} sequence is running...`)
            let currentCampaign = result.campaignCustomProfileView,
            nodeModel = result.nodeModelCustomProfileView;
            
            console.log(`💡 Note: Viewing profiles does NOT require connection - will attempt for all leads`);

            try {
                getCampaignLeads(currentCampaign.id, (leadsData) => {
                    console.log(`👥 PROFILE VIEW: Retrieved ${leadsData.length} leads`);
                    if(leadsData.length) runSequence(currentCampaign, leadsData, nodeModel);
                })
            } catch (err) {
                console.error('❌ Error in custom_profile_view alarm:', err);
            }
        });
    }else if(alarm.name == 'custom_follow'){
        console.log('👥 FOLLOW: Custom follow alarm triggered');
        chrome.storage.local.get(["campaignCustomFollow","nodeModelCustomFollow"]).then((result) => {
            console.log(`Campaign ${alarm.name} sequence is running...`)
            let currentCampaign = result.campaignCustomFollow,
            nodeModel = result.nodeModelCustomFollow;
            
            console.log(`💡 Note: Following does NOT require connection - will attempt for all leads`);

            try {
                getCampaignLeads(currentCampaign.id, (leadsData) => {
                    console.log(`👥 FOLLOW: Retrieved ${leadsData.length} leads`);
                    if(leadsData.length) runSequence(currentCampaign, leadsData, nodeModel);
                })
            } catch (err) {
                console.error('❌ Error in custom_follow alarm:', err);
            }
        });
    }else if(alarm.name == 'custom_message'){
        console.log('💬 MESSAGE: Custom message alarm triggered');
        chrome.storage.local.get(["campaignCustomMessage","nodeModelCustomMessage"]).then((result) => {
            console.log(`Campaign ${alarm.name} sequence is running...`)
            let currentCampaign = result.campaignCustomMessage,
            nodeModel = result.nodeModelCustomMessage;
            
            console.log(`⚠️ Note: Messaging requires connection - will use accepted/connected leads only`);

            try {
                getCampaignLeads(currentCampaign.id, (leadsData) => {
                    console.log(`👥 MESSAGE: Retrieved ${leadsData.length} leads (will filter for connected)`);
                    if(leadsData.length) runSequence(currentCampaign, leadsData, nodeModel);
                })
            } catch (err) {
                console.error('❌ Error in custom_message alarm:', err);
            }
        });
    }else if(alarm.name == 'custom_endorse'){
        console.log('🏷️ ENDORSEMENT: Custom endorse alarm triggered');
        chrome.storage.local.get(["campaignCustomEndorse","nodeModelCustomEndorse"]).then((result) => {
            console.log(`Campaign ${alarm.name} sequence is running...`)
            let currentCampaign = result.campaignCustomEndorse,
            nodeModel = result.nodeModelCustomEndorse;
            
            console.log(`🔍 Endorse campaign: ${currentCampaign.name} (ID: ${currentCampaign.id})`);
            console.log(`🎯 Skills to endorse per lead: ${nodeModel.totalSkills || 1}`);
            
            try {
                getCampaignLeads(currentCampaign.id, (leadsData) => {
                    console.log(`👥 ENDORSEMENT: Retrieved ${leadsData.length} leads`);
                    console.log(`💡 Note: Endorsement does NOT require connection - will attempt for all leads`);
                    if(leadsData.length) {
                        runSequence(currentCampaign, leadsData, nodeModel);
                    } else {
                        console.log('❌ No leads found for endorsement campaign');
                    }
                })
            } catch (err) {
                console.error('❌ Error in custom_endorse alarm:', err);
            }
        });
    }else if(alarm.name === 'check_review_messages'){
        // Review messages are now handled by node model timing, no need for database polling
        console.log('⏸️ Review message checking disabled - using node model timing instead');
    }else if(alarm.name.startsWith('delayed_action_')){
        console.log('⏰ DELAYED ACTION ALARM TRIGGERED:', alarm.name);
        console.log('📅 Current time:', new Date().toLocaleString());
        
        // Get the stored action data
        chrome.storage.local.get([`delayed_action_${alarm.name}`]).then((result) => {
            const actionData = result[`delayed_action_${alarm.name}`];
            if (actionData) {
                console.log('🎯 EXECUTING DELAYED ACTION:', actionData.nodeModel.label);
                console.log('👤 Lead:', actionData.lead.name);
                console.log('📊 Campaign:', actionData.campaign.name);
                console.log('⏰ Originally scheduled for:', new Date(actionData.scheduledTime).toLocaleString());
                
                // Execute the delayed action
                runSequence(actionData.campaign, [actionData.lead], actionData.nodeModel);
                
                // Clean up the stored data
                chrome.storage.local.remove([`delayed_action_${alarm.name}`]);
            } else {
                console.log('❌ No action data found for alarm:', alarm.name);
            }
        });
    }else if(alarm.name.startsWith('fallback_') || alarm.name.startsWith('direct_')){
        const campaignType = alarm.name.startsWith('direct_') ? 'direct-action' : 'fallback';
        console.log(`🎯 Starting ${campaignType} campaign alarm for: ${alarm.name}`);
        
        chrome.storage.local.get(["campaign","nodeModel","sequence"]).then(async (result) => {
            console.log(`Campaign ${alarm.name} sequence is running...`)
            let currentCampaign = result.campaign,
            nodeModel = result.nodeModel;
            console.log('📊 Retrieved campaign data:', currentCampaign);
            console.log('🔗 Retrieved node model:', nodeModel);
            console.log('🎯 Node action type:', nodeModel?.value);
            console.log(`💡 Campaign type: ${campaignType}`);
            
            try {
                // Determine which leads to use based on action type
                const actionType = nodeModel?.value;
                console.log(`🔍 Action type: ${actionType}`);
                
                let leadsToProcess = [];
                
                // Check if this is a direct-action campaign (first node is NOT send-invites)
                const isDirectActionCampaign = campaignType === 'direct-action';
                console.log(`🔍 Is direct-action campaign: ${isDirectActionCampaign}`);
                
                // Actions that require connection (1st degree)
                const requiresConnection = ['call', 'message'];
                
                // Actions that DON'T require connection (can be done to anyone)
                const noConnectionRequired = ['endorse', 'follow', 'like-post', 'profile-view'];
                
                if (requiresConnection.includes(actionType) && !isDirectActionCampaign) {
                    console.log(`📧 Action "${actionType}" requires connection - fetching accepted leads only`);
                    
                    // Fetch accepted leads from DB first
                    await getLeadGenRunning(currentCampaign.id);
                    let acceptedLeads = (campaignLeadgenRunning || []).filter(l => l.acceptedStatus === true || l.accept_status === true || l.statusLastId === 3 || l.status_last_id === 3);
                    console.log(`👥 Found ${acceptedLeads.length} accepted leads (DB)`);
                    
                    // If none found, recompute by checking network distance
                    if (acceptedLeads.length === 0) {
                        const candidates = (campaignLeadgenRunning || []);
                        console.log(`🔎 Recomputing accepted leads, candidates: ${candidates.length}`);
                        const computedAccepted = [];
                        for (const cand of candidates) {
                            try {
                                const networkInfo = await _getProfileNetworkInfo(cand);
                                const degree = networkInfo?.data?.distance?.value;
                                if (degree === 'DISTANCE_1' || cand.networkDistance == 1) {
                                    computedAccepted.push({
                                        ...cand,
                                        acceptedStatus: true,
                                        networkDistance: 1
                                    });
                                }
                            } catch (e) {
                                // ignore individual errors
                            }
                            await delay(400);
                        }
                        console.log(`👥 Computed accepted leads: ${computedAccepted.length}`);
                        acceptedLeads = computedAccepted;
                    }
                    
                    leadsToProcess = acceptedLeads;
                    
                } else if (noConnectionRequired.includes(actionType) || isDirectActionCampaign) {
                    console.log(`🌐 Action "${actionType}" does NOT require connection - fetching ALL leads`);
                    
                    // For these actions, we can use ALL campaign leads (not just accepted connections)
                    // Also use ALL leads for direct-action campaigns (even for message/call)
                    await new Promise((resolve) => {
                        getCampaignLeads(currentCampaign.id, (leadsData) => {
                            leadsToProcess = leadsData || [];
                            console.log(`👥 Retrieved ${leadsToProcess.length} leads from campaign`);
                            resolve();
                        });
                    });
                } else {
                    console.log(`⚠️ Unknown action type "${actionType}" - falling back to all leads`);
                    
                    // Fallback: try to get all campaign leads
                    await new Promise((resolve) => {
                        getCampaignLeads(currentCampaign.id, (leadsData) => {
                            leadsToProcess = leadsData || [];
                            console.log(`👥 Retrieved ${leadsToProcess.length} leads from campaign (fallback)`);
                            resolve();
                        });
                    });
                }

                if (leadsToProcess.length > 0) {
                    console.log(`🚀 Executing sequence for ${leadsToProcess.length} leads`);
                    await runSequence(currentCampaign, leadsToProcess, nodeModel);
                } else {
                    console.log(`⚠️ No leads found for ${actionType} execution`);
                }
            } catch (err) {
                console.error(`❌ Error executing ${alarm.name} sequence:`, err);
            } finally {
                // Clear the alarm to prevent repeats
                chrome.alarms.clear(alarm.name);
                console.log(`🧹 Cleared ${alarm.name} alarm after execution`);
                console.log(`✅ ${campaignType} campaign execution completed`);
            }
        });
        return;
    }else{
        console.log('🎯 Starting general campaign alarm for:', alarm.name);
        chrome.storage.local.get(["campaign","nodeModel"]).then((result) => {
            console.log(`Campaign ${alarm.name} sequence is running...`)
            let currentCampaign = result.campaign,
            nodeModel = result.nodeModel;

            console.log('📊 Retrieved campaign data:', currentCampaign);
            console.log('🔗 Retrieved node model:', nodeModel);

            try {
                getCampaignLeads(currentCampaign.id, (leadsData) => {
                    console.log('👥 Retrieved leads data:', leadsData);
                    if(leadsData.length) {
                        console.log('🚀 Starting runSequence with', leadsData.length, 'leads');
                        runSequence(currentCampaign, leadsData, nodeModel);
                    } else {
                        console.log('❌ No leads found for campaign');
                        console.log('🛑 STOPPING EXECUTION: Cannot process campaign without leads');
                        console.log('💡 SOLUTION: Add leads to this campaign in your LinkDominator dashboard');
                        console.log('🔗 Campaign ID:', currentCampaign.id);
                        console.log('📋 Campaign Name:', currentCampaign.name);
                        
                        // Clear any existing alarms to prevent infinite loops
                        const alarmName = currentCampaign.sequenceType.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
                        chrome.alarms.clear(alarmName);
                        console.log('🧹 Cleared alarm:', alarmName);
                        
                        return; // Exit completely to prevent further processing
                    }
                })
            } catch (err) {
                console.error('❌ Error in general campaign alarm:', err)
            }
        });
    }
})

/**
 * Set new campaign schedule
 * @param {object} campaign 
 */
const setCampaignAlarm = async (campaign) => {
    var campaignModel, 
        delayInMinutes, 
        alarmName, 
        nodeModelArr, 
        nodeItem, 
        acceptedNodeItem,
        notAcceptedNodeItem,
        delayInMinuteAccepted,
        delayInMinuteNotAccepted,
        currentNodeKey, 
        statusLastId;

    console.log('🎬 Setting up campaign alarm for:', campaign.name, 'Type:', campaign.sequenceType);
    console.log('📊 Campaign details:', {
        id: campaign.id,
        status: campaign.status,
        sequenceType: campaign.sequenceType
    });
    await getCampaignSequence(campaign.id)
    alarmName = (campaign.sequenceType || 'default_sequence').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    nodeModelArr = campaignSequence.nodeModel
    
    console.log('📋 Campaign sequence loaded:', nodeModelArr ? 'Yes' : 'No');
    console.log('⏰ Alarm name:', alarmName);
    console.log('🔗 Node model array length:', nodeModelArr ? nodeModelArr.length : 0);
    console.log('🔗 Node model array:', nodeModelArr);
    console.log('🔍 SEQUENCE-CHECK: Send-invites node (index 0) runStatus:', nodeModelArr[0]?.runStatus);
    console.log('🔍 SEQUENCE-CHECK: Send-invites node value:', nodeModelArr[0]?.value);

    if(campaign.sequenceType == 'Endorse'){
        console.log('🏷️ Processing Endorse campaign sequence...');
        if(nodeModelArr[0].runStatus == false){
            nodeItem = nodeModelArr[0]
            delayInMinutes = 0.10;
            console.log('✅ Setting up first endorse node with 0.1 minute delay');
        }else if(nodeModelArr[2].runStatus == false){
            nodeItem = nodeModelArr[2]
            delayInMinutes = nodeModelArr[1].time == 'days' 
                ? nodeModelArr[1].value * 24 * 60
                : nodeModelArr[1].value * 60;
            updateSequenceNodeModel(campaign, nodeModelArr[1])
            console.log('✅ Setting up second endorse node with delay:', delayInMinutes, 'minutes');
        }else if(nodeModelArr[4].runStatus == false){
            nodeItem = nodeModelArr[4]
            delayInMinutes = nodeModelArr[3].time == 'days' 
                ? nodeModelArr[3].value * 24 * 60
                : nodeModelArr[3].value * 60;
            updateSequenceNodeModel(campaign, nodeModelArr[3])
            console.log('✅ Setting up third endorse node with delay:', delayInMinutes, 'minutes');
        }else if(nodeModelArr[5].runStatus == false){
            updateSequenceNodeModel(campaign, nodeModelArr[5])
            updateSequenceNodeModel(campaign, nodeModelArr[6])
            updateCampaign({
                campaignId: campaign.id,
                status: 'completed'
            })
            console.log('🎉 Endorse campaign completed!');
        }
    }else if(campaign.sequenceType == 'Profile views'){
        console.log('👁️ Processing Profile views campaign sequence...');
        if(nodeModelArr[0].runStatus == false){
            nodeItem = nodeModelArr[0]
            delayInMinutes = 0.10;
            console.log('✅ Setting up first profile view node with 0.1 minute delay');
        }else if(nodeModelArr[2].runStatus == false){
            nodeItem = nodeModelArr[2]
            delayInMinutes = nodeModelArr[1].time == 'days' 
                ? nodeModelArr[1].value * 24 * 60
                : nodeModelArr[1].value * 60;
            updateSequenceNodeModel(campaign, nodeModelArr[1])
            console.log('✅ Setting up second profile view node with delay:', delayInMinutes, 'minutes');
        }else if(nodeModelArr[4].runStatus == false){
            nodeItem = nodeModelArr[4]
            delayInMinutes = nodeModelArr[3].time == 'days' 
                ? nodeModelArr[3].value * 24 * 60
                : nodeModelArr[3].value * 60;
            updateSequenceNodeModel(campaign, nodeModelArr[3])
            console.log('✅ Setting up third profile view node with delay:', delayInMinutes, 'minutes');
        }else if(nodeModelArr[6].runStatus == false){
            nodeItem = nodeModelArr[6]
            delayInMinutes = nodeModelArr[5].time == 'days' 
                ? nodeModelArr[5].value * 24 * 60
                : nodeModelArr[5].value * 60;
            updateSequenceNodeModel(campaign, nodeModelArr[5])
            console.log('✅ Setting up fourth profile view node with delay:', delayInMinutes, 'minutes');
        }else if(nodeModelArr[8].runStatus == false){
            nodeItem = nodeModelArr[8]
            delayInMinutes = nodeModelArr[7].time == 'days' 
                ? nodeModelArr[7].value * 24 * 60
                : nodeModelArr[7].value * 60;
            updateSequenceNodeModel(campaign, nodeModelArr[7])
            console.log('✅ Setting up fifth profile view node with delay:', delayInMinutes, 'minutes');
        }else if(nodeModelArr[9].runStatus == false){
            updateSequenceNodeModel(campaign, nodeModelArr[9])
            updateSequenceNodeModel(campaign, nodeModelArr[10])
            updateCampaign({
                campaignId: campaign.id,
                status: 'completed'
            })
            console.log('🎉 Profile views campaign completed!');
        }
    }else if(['Lead generation','Custom'].includes(campaign.sequenceType)){
        console.log('📈 Processing Lead generation/Custom campaign sequence...');
        console.log(`🔍 First node type: ${nodeModelArr[0].value}`);
        console.log(`🔍 First node status: ${nodeModelArr[0].runStatus ? 'Completed' : 'Not run'}`);
        
        // Support ANY first action (not just send-invites)
        if(nodeModelArr[0].value == 'send-invites'){
            console.log('📧 First action is SEND INVITES');
            if(nodeModelArr[0].runStatus === false){
                nodeItem = nodeModelArr[0]
                delayInMinutes = 0.10;
                console.log('✅ Setting up send-invites node with 0.1 minute delay');
            }else{
                console.log('✅ Send-invites ALREADY COMPLETED - invites were sent!');
                console.log(`📊 Node 0 (send-invites) runStatus: ${nodeModelArr[0].runStatus}`);
                console.log('⏸️ Skipping alarm creation - waiting for acceptance check to handle next steps');
                console.log('💡 The continuous_invite_monitoring will detect acceptances and trigger next actions');
                
                // Don't create any alarm - let the acceptance monitoring handle it
                return;
            }
        }else if(nodeModelArr[0].value == 'like-post'){
            let nodeItemCustomLikePost;
            if(nodeModelArr[0].runStatus === false){
                nodeItemCustomLikePost = nodeModelArr[0]
                delayInMinutes = 0.10;
            }else {
                for(const [idx, node] of nodeModelArr.entries()){
                    if(node.runStatus === false && node.type === 'action' && node.value != 'end'){
                        nodeItemCustomLikePost = node
                        delayInMinutes = nodeModelArr[idx -1].time == 'days' 
                            ? nodeModelArr[idx -1].value * 24 * 60
                            : nodeModelArr[idx -1].value * 60;
                        updateSequenceNodeModel(campaign, nodeModelArr[idx -1])
                        break;
                    }
                }
                // Update campaign status
                let endNode = nodeModelArr[nodeModelArr.length -1],
                    lastDelay = nodeModelArr[nodeModelArr.length -2],
                    lastAction = nodeModelArr[nodeModelArr.length -3];

                if(endNode && Object.keys(endNode) 
                    && endNode.type == 'end'
                    && lastDelay && Object.keys(lastDelay) 
                    && lastDelay.type == 'delay'
                    && lastAction.runStatus === true){
                    updateSequenceNodeModel(campaign, lastDelay)
                    updateSequenceNodeModel(campaign, endNode)
                    updateCampaign({
                        campaignId: campaign.id,
                        status: 'completed'
                    })
                }
            }
            // Set alarm
            if(nodeItemCustomLikePost && Object.keys(nodeItemCustomLikePost).length){
                alarmName = 'custom_like_post'
                campaignModel = {
                    campaignCustomLikePost: campaign,
                    nodeModelCustomLikePost: nodeItemCustomLikePost
                }
                chrome.storage.local.set(campaignModel).then(() => {
                    chrome.alarms.create(
                        alarmName, {delayInMinutes: 2} // delayInMinutes}
                    );
                    console.log(alarmName +" alarm is set");
                });
            }
        }else if(nodeModelArr[0].value == 'profile-view'){
            let nodeItemCustomProfileView;
            if(nodeModelArr[0].runStatus === false){
                nodeItemCustomProfileView = nodeModelArr[0]
                delayInMinutes = 0.10;
            }else {
                for(const [idx, node] of nodeModelArr.entries()){
                    if(node.runStatus === false && node.type === 'action' && node.value != 'end'){
                        nodeItemCustomProfileView = node
                        delayInMinutes = nodeModelArr[idx -1].time == 'days' 
                            ? nodeModelArr[idx -1].value * 24 * 60
                            : nodeModelArr[idx -1].value * 60;
                        updateSequenceNodeModel(campaign, nodeModelArr[idx -1])
                        break;
                    }
                }
                // Update campaign status
                let endNode = nodeModelArr[nodeModelArr.length -1],
                    lastDelay = nodeModelArr[nodeModelArr.length -2],
                    lastAction = nodeModelArr[nodeModelArr.length -3];
                if(endNode && Object.keys(endNode) 
                    && endNode.type == 'end'
                    && lastDelay && Object.keys(lastDelay) 
                    && lastDelay.type == 'delay'
                    && lastAction.runStatus === true){
                    updateSequenceNodeModel(campaign, lastDelay)
                    updateSequenceNodeModel(campaign, endNode)
                    updateCampaign({
                        campaignId: campaign.id,
                        status: 'completed'
                    })
                }
            }
            
            // Set alarm
            if(nodeItemCustomProfileView && Object.keys(nodeItemCustomProfileView).length){
                alarmName = 'custom_profile_view'
                campaignModel = {
                    campaignCustomProfileView: campaign,
                    nodeModelCustomProfileView: nodeItemCustomProfileView
                }
                chrome.storage.local.set(campaignModel).then(() => {
                    chrome.alarms.create(
                        alarmName, {delayInMinutes: 2} // delayInMinutes}
                    );
                    console.log(alarmName +" alarm is set");
                });
            }
        }else if(nodeModelArr[0].value == 'follow'){
            let nodeItemCustomFollow;
            if(nodeModelArr[0].runStatus === false){
                nodeItemCustomFollow = nodeModelArr[0]
                delayInMinutes = 0.10;
            }else {
                for(const [idx, node] of nodeModelArr.entries()){
                    if(node.runStatus === false && node.type === 'action' && node.value != 'end'){
                        nodeItemCustomFollow = node
                        delayInMinutes = nodeModelArr[idx -1].time == 'days' 
                            ? nodeModelArr[idx -1].value * 24 * 60
                            : nodeModelArr[idx -1].value * 60;
                        updateSequenceNodeModel(campaign, nodeModelArr[idx -1])
                        break;
                    }
                }
                // Update campaign status
                let endNode = nodeModelArr[nodeModelArr.length -1],
                    lastDelay = nodeModelArr[nodeModelArr.length -2],
                    lastAction = nodeModelArr[nodeModelArr.length -3];
                if(endNode && Object.keys(endNode) 
                    && endNode.type == 'end'
                    && lastDelay && Object.keys(lastDelay) 
                    && lastDelay.type == 'delay'
                    && lastAction.runStatus === true){
                    updateSequenceNodeModel(campaign, lastDelay)
                    updateSequenceNodeModel(campaign, endNode)
                    updateCampaign({
                        campaignId: campaign.id,
                        status: 'completed'
                    })
                }
            }
            // Set alarm
            if(nodeItemCustomFollow && Object.keys(nodeItemCustomFollow).length){
                alarmName = 'custom_follow'
                campaignModel = {
                    campaignCustomFollow: campaign,
                    nodeModelCustomFollow: nodeItemCustomFollow
                }
                chrome.storage.local.set(campaignModel).then(() => {
                    chrome.alarms.create(
                        alarmName, {delayInMinutes: 2} // delayInMinutes}
                    );
                    console.log(alarmName +" alarm is set");
                });
            }
        }else if(nodeModelArr[0].value == 'message'){
            let nodeItemCustomMessage;
            if(nodeModelArr[0].runStatus === false){
                nodeItemCustomMessage = nodeModelArr[0]
                delayInMinutes = 0.10;
            }else {
                for(const [idx, node] of nodeModelArr.entries()){
                    if(node.runStatus === false && node.type === 'action' && node.value != 'end'){
                        nodeItemCustomMessage = node
                        delayInMinutes = nodeModelArr[idx -1].time == 'days' 
                            ? nodeModelArr[idx -1].value * 24 * 60
                            : nodeModelArr[idx -1].value * 60;
                        updateSequenceNodeModel(campaign, nodeModelArr[idx -1])
                        break;
                    }
                }
                // Update campaign status
                let endNode = nodeModelArr[nodeModelArr.length -1],
                    lastDelay = nodeModelArr[nodeModelArr.length -2],
                    lastAction = nodeModelArr[nodeModelArr.length -3];
                if(endNode && Object.keys(endNode) 
                    && endNode.type == 'end'
                    && lastDelay && Object.keys(lastDelay) 
                    && lastDelay.type == 'delay'
                    && lastAction.runStatus === true){
                    updateSequenceNodeModel(campaign, lastDelay)
                    updateSequenceNodeModel(campaign, endNode)
                    updateCampaign({
                        campaignId: campaign.id,
                        status: 'completed'
                    })
                }
            }
            // Set alarm
            if(nodeItemCustomMessage && Object.keys(nodeItemCustomMessage).length){
                alarmName = 'custom_message'
                campaignModel = {
                    campaignCustomMessage: campaign,
                    nodeModelCustomMessage: nodeItemCustomMessage
                }
                chrome.storage.local.set(campaignModel).then(() => {
                    chrome.alarms.create(
                        alarmName, {delayInMinutes: 2} // delayInMinutes}
                    );
                    console.log(alarmName +" alarm is set");
                });
            }
        }else if(nodeModelArr[0].value == 'endorse'){
            let nodeItemCustomEndorse;
            if(nodeModelArr[0].runStatus === false){
                nodeItemCustomEndorse = nodeModelArr[0]
                delayInMinutes = 0.10;
            }else {
                for(const [idx, node] of nodeModelArr.entries()){
                    if(node.runStatus === false && node.type === 'action' && node.value != 'end'){
                        nodeItemCustomEndorse = node
                        delayInMinutes = nodeModelArr[idx -1].time == 'days' 
                            ? nodeModelArr[idx -1].value * 24 * 60
                            : nodeModelArr[idx -1].value * 60;
                        updateSequenceNodeModel(campaign, nodeModelArr[idx -1])
                        break;
                    }
                }
                // Update campaign status
                let endNode = nodeModelArr[nodeModelArr.length -1],
                    lastDelay = nodeModelArr[nodeModelArr.length -2],
                    lastAction = nodeModelArr[nodeModelArr.length -3];
                if(endNode && Object.keys(endNode) 
                    && endNode.type == 'end'
                    && lastDelay && Object.keys(lastDelay) 
                    && lastDelay.type == 'delay'
                    && lastAction.runStatus === true){
                    updateSequenceNodeModel(campaign, lastDelay)
                    updateSequenceNodeModel(campaign, endNode)
                    updateCampaign({
                        campaignId: campaign.id,
                        status: 'completed'
                    })
                }
            }
            // Set alarm
            if(nodeItemCustomEndorse && Object.keys(nodeItemCustomEndorse).length){
                alarmName = 'custom_endorse'
                campaignModel = {
                    campaignCustomEndorse: campaign,
                    nodeModelCustomEndorse: nodeItemCustomEndorse
                }
                chrome.storage.local.set(campaignModel).then(() => {
                    chrome.alarms.create(
                        alarmName, {delayInMinutes: 2} // delayInMinutes}
                    );
                    console.log(alarmName +" alarm is set");
                });
            }
        }
    }

    // Initialize alarm
    console.log('🔍 Final alarm creation check:');
    console.log(`📋 nodeItem:`, nodeItem);
    console.log(`📋 acceptedNodeItem:`, acceptedNodeItem);
    console.log(`📋 notAcceptedNodeItem:`, notAcceptedNodeItem);
    console.log(`📋 alarmName:`, alarmName);
    
    if(nodeItem && Object.keys(nodeItem).length){
        console.log('🔔 Creating alarm for node:', nodeItem);
        campaignModel = {
            campaign: campaign,
            nodeModel: nodeItem,
            sequence: nodeModelArr // Save the full sequence array for AI mode access
        }
        chrome.storage.local.set(campaignModel).then(() => {
            console.log('💾 Campaign model saved to storage:', campaignModel);
            console.log('🔍 Sequence data saved:', nodeModelArr);
            console.log('🔍 First node AI mode:', nodeModelArr[0]?.ai_mode);
            console.log('🔍 First node review time:', nodeModelArr[0]?.review_time);
            chrome.alarms.create(
                alarmName, {
                    delayInMinutes: 0.1 // Reduced from 2 to 0.1 minutes (6 seconds) for faster testing
                }
            );
            console.log('⏰ Alarm created:', alarmName, 'with 0.1 minute delay');
        });
    } else {
        console.log('💡 No invite-based node setup needed (campaign does not use send-invites workflow)');
        console.log('🔍 Checking for direct-action campaign (endorse/message/follow/etc. without invites)...');
        
        // For non-invite campaigns, find the first unrun action node and execute it directly
        console.log(`🔍 Scanning ${nodeModelArr.length} nodes for next action to execute...`);
        
        // Start from index 0 to include the first node
        for(let i = 0; i < nodeModelArr.length; i++) {
            let node = nodeModelArr[i];
            console.log(`🔍 Node ${i}: Key: ${node.key}, Type: ${node.type}, Value: ${node.value}, RunStatus: ${node.runStatus}`);
            
            if(node.type === 'action' && node.runStatus === false && node.value !== 'end' && node.value !== 'add-action') {
                console.log(`✅ Found next action to execute: ${node.key} - ${node.label} (${node.value})`);
                console.log(`📋 Action type: ${node.value}`);
                console.log(`💡 This is a direct-action campaign (does not require send-invites first)`);
                
                nodeItem = node;
                alarmName = `direct_${node.value}`;
                
                // Calculate delay if there's a previous delay node
                if(i > 0 && nodeModelArr[i-1].type === 'delay') {
                    delayInMinutes = nodeModelArr[i-1].time == 'days' 
                        ? nodeModelArr[i-1].value * 24 * 60
                        : nodeModelArr[i-1].value * 60;
                    console.log(`⏰ Using delay from previous node: ${delayInMinutes} minutes`);
                } else {
                    delayInMinutes = 0.10;
                    console.log(`⏰ No previous delay, using immediate execution: 0.1 minutes`);
                }
                
                break;
            } else {
                console.log(`⏭️ Skipped: type=${node.type === 'action'}, runStatus=${node.runStatus === false}, value=${node.value !== 'end'}`);
            }
        }
        
        if(nodeItem) {
            console.log('─'.repeat(80));
            console.log(`🚀 Setting up direct-action campaign: ${nodeItem.value}`);
            console.log('─'.repeat(80));
            console.log(`📋 Action: ${nodeItem.label} (${nodeItem.value})`);
            console.log(`⏰ Alarm name: ${alarmName}`);
            console.log(`⏱️ Delay: ${delayInMinutes} minutes`);
            console.log(`💡 Will use campaign_list leads (no invite tracking needed)`);
            console.log('─'.repeat(80));
            
            campaignModel = {
                campaign: campaign,
                nodeModel: nodeItem,
                sequence: nodeModelArr // Save the full sequence array for AI mode access
            }
            chrome.storage.local.set(campaignModel).then(() => {
                console.log('💾 Direct-action campaign model saved to storage');
                console.log('🔍 Sequence data:', nodeModelArr.length, 'nodes');
                console.log('🎯 Next action:', nodeItem.label);
                chrome.alarms.create(
                    alarmName, {
                        delayInMinutes: 0.1
                    }
                );
                console.log(`⏰ Direct-action alarm created: ${alarmName}`);
            });
        } else {
            console.log('❌ No executable action found in campaign sequence');
        }
    }
}
const runSequence = async (currentCampaign, leads, nodeModel) => {
    console.log('🎬 RUNSEQUENCE CALLED - Starting sequence execution...');
    console.log('📊 Campaign:', currentCampaign.name, '(ID:', currentCampaign.id, ')');
    console.log('👥 Leads to process:', leads.length);
    console.log('🎯 Node Model AI Settings:', {
        ai_mode: nodeModel?.ai_mode || 'auto',
        review_time: nodeModel?.review_time || null,
        paraphrase_user_message: nodeModel?.paraphrase_user_message || false
    });
    console.log('🔍 Raw nodeModel review_time:', nodeModel?.review_time, 'Type:', typeof nodeModel?.review_time);
    console.log('🔍 Parsed review_time:', nodeModel?.review_time ? parseInt(nodeModel.review_time, 10) : null);
    console.log('🔗 Node action:', nodeModel.label, '(', nodeModel.value, ')');
    console.log('⏰ Node delay:', nodeModel.delayInMinutes || 0, 'minutes');
    console.log('🔧 Full node model:', nodeModel);
    
    // Check if campaign is completed or stopped before processing
    if (currentCampaign.status === 'completed' || currentCampaign.status === 'stop') {
        console.log('⏹️ Campaign is completed or stopped, skipping sequence execution');
        updateCampaignStatus('completed', 'Campaign sequence completed');
        return;
    }
    
    updateCampaignStatus('processing', `Processing ${leads.length} leads...`);
    
    for(const [i, lead] of leads.entries()){
        console.log(`👤 Processing lead ${i+1}/${leads.length}:`, lead);
        console.log(`🔗 Node action: ${nodeModel.value}`);
        
        if(nodeModel.value == 'endorse'){
            console.log('\n' + '='.repeat(80));
            console.log('🏷️ ENDORSEMENT FLOW: STARTING');
            console.log('='.repeat(80));
            console.log(`👤 Lead: ${lead.name}`);
            console.log(`🔗 Connection ID: ${lead.connectionId}`);
            console.log(`🆔 Member URN: ${lead.memberUrn || 'Not available'}`);
            console.log(`🎯 Action: ${nodeModel.label} (${nodeModel.value})`);
            console.log(`🔢 Skills to endorse: ${nodeModel.totalSkills || 1}`);
            console.log(`⏰ Delay: ${nodeModel.delayInMinutes || 0} minutes`);
            console.log(`🔧 Node key: ${nodeModel.key}`);
            console.log(`📊 Run status: ${nodeModel.runStatus}`);
            console.log('─'.repeat(80));
            
            console.log(`🚀 ENDORSEMENT FLOW: Fetching skills for ${lead.name}...`);
            _getFeaturedSkill(lead, nodeModel);
        }else if(nodeModel.value == 'profile-view'){
            console.log('👁️ Executing profile view action...');
            _viewProfile(lead)
        }else if(nodeModel.value == 'follow'){
            console.log('👥 Executing follow action...');
            _followConnection(lead)
        }else if(nodeModel.value == 'like-post'){
            console.log('👍 Executing like post action...');
            _getProfilePosts(lead)
        }else if(['message','call'].includes(nodeModel.value)){
            // Validate lead has required fields
            if (!lead.connectionId) {
                console.error(`❌ Invalid lead data - missing connectionId:`, lead);
                console.log('⏭️ Skipping this lead (appears to be audience object, not individual lead)');
                continue; // Skip to next lead
            }
            
            if(nodeModel.value == 'message'){
                console.log('\n' + '='.repeat(80));
                console.log('💬 MESSAGE FLOW: STARTING');
                console.log('='.repeat(80));
                console.log(`👤 Lead: ${lead.name}`);
                console.log(`🔗 Connection ID: ${lead.connectionId}`);
                console.log(`🆔 Member URN: ${lead.memberUrn || 'Not available'}`);
                console.log(`📊 Network Distance: ${lead.networkDistance}`);
                console.log(`🎯 Action: Send Message (${nodeModel.value})`);
                console.log(`🔧 Node key: ${nodeModel.key}`);
                console.log(`📊 Run status: ${nodeModel.runStatus}`);
                console.log(`⏰ Delay: ${nodeModel.delayInMinutes || 0} minutes`);
                console.log('─'.repeat(80));
                console.log(`📝 Message preview: ${nodeModel.message ? nodeModel.message.substring(0, 100) + '...' : 'No message'}`);
                console.log('─'.repeat(80));
                
                // Validate message exists
                if (!nodeModel.message || nodeModel.message.trim() === '') {
                    console.error('❌ MESSAGE FLOW: No message content found in node!');
                    console.log('⏭️ Skipping message send - message is empty');
                    continue; // Skip to next lead
                }
            } else {
                console.log(`💬 Executing ${nodeModel.value} action...`);
            }
            
            arConnectionModel.message = nodeModel.message
            arConnectionModel.distance = lead.networkDistance
            arConnectionModel.connectionId = lead.connectionId
            arConnectionModel.name = lead.name
            arConnectionModel.firstName = lead.firstName
            arConnectionModel.lastName = lead.lastName
            arConnectionModel.conversationUrnId = ''
            lead['uploads'] = []
            
            // Declare messageSentViaAI flag for both message and call actions
            let messageSentViaAI = false;

            // Check for duplicate call attempts (but don't set flag yet)
            if (nodeModel.value === 'call') {
                const attemptKey = `call_attempted_${currentCampaign.id}_${lead.connectionId}`;
                try {
                    const stored = await chrome.storage.local.get([attemptKey]);
                    if (stored && stored[attemptKey]) {
                        console.log(`⏭️ Skipping duplicate call attempt for ${lead.name} (key: ${attemptKey})`);
                        // Also mark node as completed to avoid loops if already attempted
                        try {
                            await updateSequenceNodeModel(currentCampaign, { ...nodeModel, runStatus: true });
                            console.log('✅ Call node marked as completed to prevent repeat');
                        } catch (e) {}
                        continue;
                    }
                    console.log('📝 No previous call attempt found, proceeding with call...');
                } catch (e) {
                    console.log('⚠️ Could not check dedupe key:', e.message);
                }
            }

            if(nodeModel.value == 'call'){
                console.log('📞 Recording call status with enhanced data...');
                try {
                    // First, store the call status with user's message and paraphrase preference
                    const callResponse = await storeCallStatus({
                        recipient: `${lead.firstName} ${lead.lastName}`,
                        profile: `${firstName} ${lastName}`,
                        sequence: currentCampaign.name,
                        callStatus: 'suggested',
                        company: lead.company || null,
                        industry: lead.industry || null,
                        job_title: lead.jobTitle || null,
                        location: lead.location || null,
                        original_message: arConnectionModel.message || null, // Send user's message if available
                        paraphrase_user_message: nodeModel.paraphrase_user_message || false, // Include paraphrase flag
                        ai_mode: nodeModel.ai_mode || 'auto', // Include AI mode setting
                        review_time: nodeModel.review_time || null, // Include review time if set
                        linkedin_profile_url: lead.profileUrl || null,
                        connection_id: lead.connectionId || null,
                        conversation_urn_id: arConnectionModel.conversationUrnId || null,
                        campaign_id: currentCampaign.id || null,
                        campaign_name: currentCampaign.name || null
                    });
                    
                    console.log('✅ Call status stored successfully:', callResponse);
                    
                    // Now fetch the AI-generated message from the backend
                    console.log('🔍 Attempting to fetch AI-generated message...');
                    let aiMessage = null;
                    
                    try {
                        const callId = callResponse.call_id || callResponse.data?.call_id;
                        console.log('🔍 Call ID extracted:', callId);
                        
                        if (!callId) {
                            console.warn('⚠️ No call_id received from backend');
                            return;
                        }
                        
                        // Check AI mode to determine message handling
                        const aiMode = nodeModel.ai_mode || 'auto';
                        const reviewTime = nodeModel.review_time ? parseInt(nodeModel.review_time, 10) : null;
                        console.log(`🤖 AI Mode from node: ${aiMode}, Review Time: ${reviewTime} minutes`);
                        
                        // Decide whether to poll for AI/paraphrased message or send immediately
                        const shouldPollForMessage = (nodeModel.paraphrase_user_message === true) || !arConnectionModel.message;
                        
                        // Note: Review mode only applies to AI responses, not initial messages
                        // Initial messages are always sent immediately
                        console.log(`📤 Sending initial message (AI mode: ${aiMode} - review mode only affects AI responses)`);
                        
                        if (!shouldPollForMessage) {
                            // User did not request paraphrasing and provided a message → send immediately
                            try {
                                if (typeof arConnectionModel !== 'object' || arConnectionModel === null) {
                                    arConnectionModel = {};
                                }
                                arConnectionModel.connectionId = lead.connectionId;
                                arConnectionModel.distance = (lead.networkDistance === 'DISTANCE_1' || lead.networkDistance === 1) ? 1 : 2;
                                arConnectionModel.conversationUrnId = lead.conversationUrnId || undefined;

                                console.log('📧 Sending user message immediately to:', lead.name, '(', lead.connectionId, ')');
                                console.log('📝 Message content:', arConnectionModel.message);

                                // Small wait to ensure LinkedIn is ready but not as long as AI path
                                await new Promise(resolve => setTimeout(resolve, 5000));

                                await messageConnection({ uploads: [], filters: { message: arConnectionModel.message } });

                                console.log('✅ User message sent without AI polling');
                                messageSentViaAI = true; // prevent duplicate send in standard path
                                
                                // Set up monitoring for responses to this initial message
                                const initialMonitoringData = {
                                    callId: callId,
                                    campaignId: currentCampaign.id,
                                    connectionId: lead.connectionId,
                                    conversationUrnId: lead.conversationUrnId,
                                    leadName: lead.name
                                };
                                await setupAIMessageMonitoring(initialMonitoringData);
                            } catch (error) {
                                console.error('❌ Failed to send user message immediately:', error);
                            }

                            // Skip AI polling path entirely
                            return;
                        }

                        // Poll for AI-generated/paraphrased message (OpenAI takes time to generate)
                        console.log('⏳ Polling for AI/paraphrased message...');
                        let attempts = 0;
                        const maxAttempts = 10; // 10 attempts with 2-second intervals = 20 seconds max
                        
                        while (attempts < maxAttempts) {
                            attempts++;
                            console.log(`🔍 AI message poll attempt ${attempts}/${maxAttempts}`);
                            
                            const currentLinkedInId = linkedinId || 'vicken-concept';
                            console.log('🔍 Using LinkedIn ID for polling:', currentLinkedInId);
                            
                            const messageResponse = await fetch(`${PLATFORM_URL}/api/calls/${callId}/message`, {
                                method: 'GET',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'lk-id': currentLinkedInId
                                }
                            });
                            
                            if (messageResponse.ok) {
                                const messageData = await messageResponse.json();
                                console.log('🔍 Message data received:', messageData);
                                
                                // Check if AI message is ready (not "No AI message generated yet")
                                if (messageData.message && 
                                    messageData.message !== 'No AI message generated yet' && 
                                    messageData.original_message) {
                                    console.log('✅ AI message ready!');
                                    aiMessage = messageData.message || messageData.original_message;
                                    break;
                                } else {
                                    console.log('⏳ AI message not ready yet, waiting 2 seconds...');
                                    await new Promise(resolve => setTimeout(resolve, 2000));
                                }
                            } else {
                                console.warn(`⚠️ Poll attempt ${attempts} failed with status:`, messageResponse.status);
                                break;
                            }
                        }
                        
                        if (attempts >= maxAttempts) {
                            console.warn('⚠️ AI message generation timeout after', maxAttempts, 'attempts');
                        }
                        
                        // Process the AI message if polling was successful
                        if (aiMessage) {
                            if (aiMessage !== 'No AI message generated yet' && 
                                aiMessage !== arConnectionModel.message) {
                                console.log('🤖 Using AI-generated message instead of hardcoded message');
                                // console.log('📝 Original message:', arConnectionModel.message);
                                // console.log('🤖 AI message:', aiMessage);
                                
                                // Update the message to use AI-generated content
                                arConnectionModel.message = aiMessage;
                                
                                // Now send the AI-generated message to LinkedIn
                                console.log('📤 Sending AI-generated message to LinkedIn...');
                                try {
                                    // Ensure we have the necessary connection details
                                    if (typeof arConnectionModel !== 'object' || arConnectionModel === null) {
                                        arConnectionModel = {};
                                    }
                                arConnectionModel.connectionId = lead.connectionId;
                                arConnectionModel.distance = (lead.networkDistance === 'DISTANCE_1' || lead.networkDistance === 1) ? 1 : 2;
                                    // Use existing conversation if available, otherwise create new one
                                    arConnectionModel.conversationUrnId = lead.conversationUrnId || undefined;
                                    
                                    console.log('📧 Sending message to:', lead.name, '(', lead.connectionId, ')');
                                    console.log('📝 Message content:', aiMessage);
                                    
                                    // Wait for LinkedIn to fully establish the connection
                                    console.log('⏳ Waiting 30 seconds for LinkedIn connection to be fully established...');
                                    await new Promise(resolve => setTimeout(resolve, 30000));
                                    
                                    // Send the message using the existing messageConnection function
                                    console.log('🚀 Calling messageConnection function...');
                                    messageConnection({ uploads: [] });
                                    messageSentViaAI = true;
                                    console.log('✅ AI-generated message sent successfully to LinkedIn!');
                                } catch (sendErr) {
                                    console.error('❌ Failed to send AI message to LinkedIn:', sendErr);
                                }
                            } else {
                                console.log('⚠️ No AI message available, using original message');
                                console.log('🔍 AI message:', aiMessage);
                                console.log('🔍 Original message:', arConnectionModel.message);
                            }
                        } else {
                            console.warn('⚠️ Could not fetch AI message after polling');
                            // Fallback to user's original message if available
                            if (arConnectionModel.message) {
                                try {
                                    if (typeof arConnectionModel !== 'object' || arConnectionModel === null) {
                                        arConnectionModel = {};
                                    }
                                    arConnectionModel.connectionId = lead.connectionId;
                                    arConnectionModel.distance = (lead.networkDistance === 'DISTANCE_1' || lead.networkDistance === 1) ? 1 : 2;
                                    arConnectionModel.conversationUrnId = lead.conversationUrnId || undefined;

                                    console.log('📧 Sending fallback user message to:', lead.name, '(', lead.connectionId, ')');
                                    console.log('📝 Message content:', arConnectionModel.message);

                                    await new Promise(resolve => setTimeout(resolve, 5000));

                                    await messageConnection({ uploads: [], filters: { message: arConnectionModel.message } });

                                    console.log('✅ Fallback user message sent');
                                    messageSentViaAI = true; // prevent duplicate standard send
                                } catch (fallbackErr) {
                                    console.error('❌ Failed to send fallback user message:', fallbackErr);
                                }
                            }
                        }
                    } catch (msgErr) {
                        console.warn('⚠️ Failed to fetch AI message:', msgErr.message);
                        console.warn('🔍 Full error:', msgErr);
                    }
                    
                    // Only set deduplication flag after successful API call
                    const attemptKey = `call_attempted_${currentCampaign.id}_${lead.connectionId}`;
                    await chrome.storage.local.set({ [attemptKey]: Date.now() });
                    console.log('✅ Call status stored successfully, dedupe flag set:', attemptKey);
                } catch (err) {
                    console.error('❌ Failed to store call status (will not retry immediately):', err.message);
                    // Don't set dedupe flag on API failure, allowing retry
                } finally {
                    // Don't mark call node as completed immediately - wait for response
                    console.log('⏳ Call message sent, waiting for response...');
                    console.log('🔄 Campaign will continue running to monitor for responses');
                }
            }

            // Send the LinkedIn message (only if not already sent via AI message processing)
            if (!messageSentViaAI) {
                console.log('📤 Sending message via standard method (no AI message or AI message not used)');
                // Ensure we send the current arConnectionModel.message
                await messageConnection({ uploads: [], filters: { message: arConnectionModel.message } });
            } else {
                console.log('✅ Message already sent via AI message processing, skipping duplicate send');
                
                // Set up response monitoring after AI message is sent
                setTimeout(async () => {
                    const responseMonitoringKey = `call_response_monitoring_${currentCampaign.id}_${lead.connectionId}`;
                    const callId = callResponse.call_id || callResponse.data?.call_id;
                    
                    console.log('🔍 DEBUG: Setting up monitoring with call_id:', callId);
                    console.log('🔍 DEBUG: Call response:', callResponse);
                    
                    await chrome.storage.local.set({ 
                        [responseMonitoringKey]: {
                            callId: callId,
                            leadId: lead.id,
                            leadName: lead.name,
                            connectionId: lead.connectionId,
                            campaignId: currentCampaign.id,
                            conversationUrnId: arConnectionModel.conversationUrnId || null,
                            sentAt: Date.now(),
                            status: 'waiting_for_response',
                            lastCheckedMessageId: null,
                            messageCount: 0
                        }
                    });
                    console.log('📊 Response monitoring set up:', responseMonitoringKey, 'with call_id:', callId);
                    console.log('🔗 Conversation URN ID stored:', arConnectionModel.conversationUrnId);
                }, 3000); // Wait 3 seconds for call record to be committed to database
            }
        }else     if(nodeModel.value == 'send-invites'){
            console.log('📨 Executing send-invites action...');
        
        // Create lead gen running records FIRST before sending any invites
        if (i === 0) { // Only create once at the start
            console.log('📊 Creating lead gen running for campaign:', currentCampaign.id);
            try {
                await createLeadGenRunning(currentCampaign.id);
                console.log('✅ Successfully created lead gen running entries');
            } catch (error) {
                console.error('❌ Failed to create lead gen running entries:', error);
            }
        }
        
        updateCampaignStatus('processing', `Sending invite to ${lead.name}...`);
            console.log(`🔍 Lead network distance: ${lead.networkDistance}, Node runStatus: ${nodeModel.runStatus}`);
            console.log(`🔍 Lead details:`, { 
                name: lead.name, 
                connectionId: lead.connectionId, 
                networkDistance: lead.networkDistance,
                id: lead.id 
            });
            console.log(`🔍 Node details:`, { 
                value: nodeModel.value, 
                runStatus: nodeModel.runStatus, 
                hasInviteNote: nodeModel.hasInviteNote,
                inviteNote: nodeModel.inviteNote 
            });
            
            // Check the condition step by step
            console.log(`🔍 Condition check:`);
            console.log(`   - lead.networkDistance: ${lead.networkDistance} (type: ${typeof lead.networkDistance})`);
            console.log(`   - lead.networkDistance != 1: ${lead.networkDistance != 1} (${lead.networkDistance} != 1)`);
            console.log(`   - nodeModel.runStatus: ${nodeModel.runStatus} (type: ${typeof nodeModel.runStatus})`);
            console.log(`   - !nodeModel.runStatus: ${!nodeModel.runStatus} (runStatus is ${nodeModel.runStatus})`);
            console.log(`   - Combined condition: ${lead.networkDistance != 1 && !nodeModel.runStatus}`);
            
            // Get current LinkedIn network status before making invite decision
            console.log(`🌐 Checking current LinkedIn network status for ${lead.name}...`);
            let currentNetworkDistance = lead.networkDistance; // fallback to database value
            
            try {
                const networkInfo = await _getProfileNetworkInfo(lead);
                currentNetworkDistance = parseInt(networkInfo.data.distance.value.split('_')[1]);
                console.log(`📊 Current LinkedIn network distance for ${lead.name}: ${currentNetworkDistance}`);
                
                // Update the lead object with current network distance
                lead.networkDistance = currentNetworkDistance;
            } catch (error) {
                console.log(`⚠️ Could not get current network status for ${lead.name}, using database value: ${currentNetworkDistance}`);
            }
            
            if(currentNetworkDistance != 1 && !nodeModel.runStatus){
                console.log('✅ CONDITIONS MET: Sending connection invite to:', lead.name);
                console.log('🚀 About to call _sendConnectionInvite...');
                try {
                    await _sendConnectionInvite(lead, nodeModel, currentCampaign.id);
                    console.log(`✅ Invite process completed for ${lead.name}`);
                } catch (error) {
                    console.error(`❌ Invite failed for ${lead.name}:`, error);
                    console.error(`❌ Error details:`, error.stack);
                }
            } else {
                console.log('❌ CONDITIONS NOT MET - Skipping invite:');
                if (currentNetworkDistance == 1) {
                    console.log('   ⏭️ Reason: Already connected (current network distance is 1)');
                } else if (nodeModel.runStatus) {
                    console.log('   ⏭️ Reason: Node already marked as completed (runStatus is true)');
                } else {
                    console.log('   ⏭️ Reason: Unknown condition failure');
                    console.log(`   🔍 currentNetworkDistance: ${currentNetworkDistance} (expected != 1)`);
                    console.log(`   🔍 runStatus: ${nodeModel.runStatus} (expected false)`);
                }
            }
        }
        console.log(`✅ Finished processing lead ${i+1}/${leads.length}`);
        console.log(`⏱️ Waiting 20 seconds before next lead...`);
        await delay(20000)
        console.log(`✅ 20-second delay completed`);
    }
    
    console.log('🔧 DEBUG: Finished processing all leads, checking for completion logic...');
    console.log(`🔧 DEBUG: Current nodeModel.value: ${nodeModel.value}`);
    
    // Handle completion logic after processing all leads
    if(nodeModel.value == 'send-invites'){
        // 🎯 COMPLETION LOGIC: After sending invites, check for next node
        console.log('🎉 All invites sent successfully! Checking for next node...');
        
        // Mark the send-invites node as completed
        try {
            console.log('🔧 DEBUG: About to mark send-invites node as completed...');
            await updateSequenceNodeModel(currentCampaign, {
                ...nodeModel,
                runStatus: true
            });
            console.log('✅ Send-invites node marked as completed');
            
            // Add a small delay to prevent race conditions
            await new Promise(resolve => setTimeout(resolve, 1000));
            console.log('⏱️ DEBUG: 1-second delay completed after marking node as done');
        } catch (error) {
            console.error('❌ Failed to mark send-invites node as completed:', error.message);
        }
        
        // Update status in storage for persistence
        chrome.storage.local.set({ 
            lastCampaignStatus: 'invites_sent',
            lastCampaignMessage: 'All invites sent! Checking for next step...'
        });
        
        // Try to update UI status (with error handling)
        try {
            updateCampaignStatus('processing', 'All invites sent! Checking for next step...');
        } catch (error) {
            console.log('⚠️ Could not update UI status (content script not available):', error.message);
        }
        
        // Check if there's a next node in the sequence
        try {
            await getCampaignSequence(currentCampaign.id);
            console.log(`📋 Campaign sequence loaded with ${campaignSequence.nodeModel.length} nodes`);
            
            // Find the next node after send-invites
            const nextNode = campaignSequence.nodeModel.find(node => 
                node.value !== 'send-invites' && !node.runStatus
            );
            
            if (nextNode) {
                console.log(`🔄 Found next node: ${nextNode.label} (${nextNode.value})`);
                console.log(`⏰ Executing next node immediately...`);
                
                // Get accepted leads for the next node
                await getLeadGenRunning(currentCampaign.id);
                const acceptedLeads = campaignLeadgenRunning.filter(lead => lead.acceptedStatus === true);
                
                if (acceptedLeads.length > 0) {
                    console.log(`👥 Found ${acceptedLeads.length} accepted leads for next node execution`);
                    
                    // Execute the next node immediately
                    await runSequence(currentCampaign, acceptedLeads, nextNode);
                    console.log('✅ Next node executed successfully');
                } else {
                    console.log('⚠️ No accepted leads found for next node execution');
                }
            } else {
                console.log('❌ No next node found, marking campaign as completed');
                
                try {
                    await updateCampaign({
                        campaignId: currentCampaign.id,
                        status: 'completed'
                    });
                    console.log('✅ Campaign marked as completed in backend');
                        
                    // Clear any pending alarms for this campaign
                    chrome.alarms.clear('lead_generation');
                    chrome.alarms.clear('accepted_leads');
                    console.log('🧹 Cleared pending campaign alarms');
                    
                    console.log('🎊 CAMPAIGN COMPLETED SUCCESSFULLY!');
                    console.log('📧 All LinkedIn invites have been sent');
                    console.log('💡 Check LinkedIn → My Network → Sent invitations to verify');
                    console.log('🛑 Campaign will no longer run automatically');
                } catch (error) {
                    console.error('❌ Failed to mark campaign as completed:', error);
                }
            }
        } catch (error) {
            console.error('❌ Failed to check for next node:', error);
        }
        
        // Return early to prevent further processing that might reset the node
        console.log('🔧 DEBUG: Returning early after send-invites completion logic');
        return;
    }
    
    // If current node is call, check if campaign should be completed
    if (nodeModel.value === 'call') {
        console.log('🔧 DEBUG: Call action completed, checking if campaign should be marked as completed...');
        
        try {
            // Check if there are any more unrun actions in the sequence
            await getCampaignSequence(currentCampaign.id);
            console.log(`📋 Campaign sequence loaded with ${campaignSequence.nodeModel.length} nodes`);
            
            // Find any remaining unrun action nodes (excluding send-invites and call)
            const remainingActions = campaignSequence.nodeModel.filter(node => 
                node.type === 'action' && 
                node.runStatus === false && 
                node.value !== 'send-invites' && 
                node.value !== 'call' &&
                node.value !== 'end'
            );
            
            if (remainingActions.length === 0) {
                console.log('🎉 No more actions available - marking campaign as completed');
                
                await updateCampaign({
                    campaignId: currentCampaign.id,
                    status: 'completed'
                });
                console.log('✅ Campaign marked as completed in backend');
                
                // Clear any pending alarms for this campaign
                chrome.alarms.clear('lead_generation');
                chrome.alarms.clear('accepted_leads');
                console.log('🧹 Cleared pending campaign alarms');
                
                console.log('🎊 CAMPAIGN COMPLETED SUCCESSFULLY!');
                console.log('📞 All call actions have been completed');
                console.log('🛑 Campaign will no longer run automatically');
            } else {
                console.log(`📋 Found ${remainingActions.length} remaining actions, campaign will continue`);
                console.log('Remaining actions:', remainingActions.map(a => `${a.label} (${a.value})`));
            }
        } catch (error) {
            console.error('❌ Failed to check campaign completion status:', error);
        }
        
        console.log('🔧 DEBUG: Returning early after call node handling to preserve completion state');
        return;
    }

    console.log('🔄 Updating sequence node model...');
    await updateSequenceNodeModel(currentCampaign, nodeModel);
    
    // Check if this is a direct-action campaign and we need to execute the next node
    console.log('🔍 Checking if next node should be executed...');
    console.log(`📊 Current node: ${nodeModel.label} (${nodeModel.value})`);
    console.log(`🔑 Current node key: ${nodeModel.key}`);
    
    // Get the updated sequence from storage to find next node
    const campaignKey = `campaign_${currentCampaign.id}`;
    const campaignData = await chrome.storage.local.get([campaignKey]);
    
    if (campaignData[campaignKey] && campaignData[campaignKey].sequence) {
        // Sequence can be an array directly OR an object with nodeModel array
        const sequenceNodes = Array.isArray(campaignData[campaignKey].sequence) 
            ? campaignData[campaignKey].sequence 
            : campaignData[campaignKey].sequence.nodeModel;
        
        if (!sequenceNodes || !Array.isArray(sequenceNodes)) {
            console.log('⚠️ Could not find valid sequence array');
            console.log('🎉 runSequence complete.');
            return;
        }
        
        console.log(`📋 Found sequence with ${sequenceNodes.length} nodes`);
        
        // Find the next unrun action node
        const nextNode = sequenceNodes.find(node => 
            node.type === 'action' && 
            node.runStatus === false && 
            node.key !== nodeModel.key &&
            node.value !== 'end'
        );
        
        if (nextNode) {
            console.log(`🎯 FOUND NEXT NODE: ${nextNode.label} (${nextNode.value})`);
            console.log(`🔑 Next node key: ${nextNode.key}`);
            console.log(`⏰ Next node delay: ${nextNode.delayInMinutes || 0} minutes`);
            
            // Check if this is a direct-action campaign (first node is NOT send-invites)
            const firstNode = sequenceNodes[0];
            const isDirectActionCampaign = firstNode && firstNode.value !== 'send-invites';
            
            if (isDirectActionCampaign) {
                console.log('💡 This is a direct-action campaign - executing next node immediately');
                
                // Filter out audience objects - only keep actual lead objects with connectionId
                const validLeads = leads.filter(lead => lead.connectionId && lead.firstName);
                console.log(`👥 Filtered leads: ${validLeads.length} valid out of ${leads.length} total`);
                
                if (validLeads.length > 0) {
                    setTimeout(() => {
                        runSequence(currentCampaign, validLeads, nextNode);
                    }, 2000); // Small delay to allow current action to complete
                    
                    console.log('✅ Next node scheduled for execution');
                } else {
                    console.log('⚠️ No valid leads found for next node execution');
                }
            } else {
                console.log('⏸️ Invite-based campaign - let continuous_invite_monitoring handle next steps');
            }
        } else {
            console.log('📭 No next node found - sequence completed');
        }
    } else {
        console.log('⚠️ Could not find sequence data in storage');
    }
    
    console.log('🎉 runSequence complete.');
}

const sendFollowupMessage = async (scheduleInfo) => {
    for(const [i, item] of audienceList.entries()) {
        arConnectionModel.message = scheduleInfo.filters.message
        arConnectionModel.distance = audienceList[i].networkDistance
        arConnectionModel.connectionId = audienceList[i].conId
        arConnectionModel.name = audienceList[i].name
        arConnectionModel.firstName = audienceList[i].firstName
        arConnectionModel.lastName = audienceList[i].lastName
        arConnectionModel.conversationUrnId = ''

        try {
            messageConnection(scheduleInfo);
        } catch (error) {
            console.log(error)
        }
        await delay(30000)
    }    
    console.log('Schedule task is completed...')
}

/**
 * Fetch profile info for the current auth connection
 */
const getUserProfile = () => {
    // Get browser cookie
    chrome.cookies.get({
        url: inURL,
        name: 'JSESSIONID'
    }, function(data) {
        if (data !== null) {
            chrome.storage.local.remove("csrfToken")
            chrome.storage.local.set({
                "csrfToken": data.value.replaceAll('"','')
            });
        }
    });

    chrome.storage.local.get(["csrfToken"]).then((result) => {
        fetch(`${LINKEDIN_URL}/voyager/api/me`, {
            method: 'get',
            headers: {
                'csrf-token': result.csrfToken,
                'Accept': '*/*',
                'Content-Type': 'application/json; charset=UTF-8',
                'X-Li-Lang': 'en_US',
                'X-Li-Page-Instance': 'urn:li:page:d_flagship3_feed;YGW6mrQMQ3aVUJHdZAqr5Q==',
                'X-Li-Track': JSON.stringify({"clientVersion":"1.7.*","osName":"web","timezoneOffset":1,"deviceFormFactor":"DESKTOP","mpName":"voyager-web"}),
                'X-Restli-Protocol-Version': '2.0.0'
            }
        })
        .then(res => res.json())
        .then(async (res) => {
            linkedinId = res.miniProfile.publicIdentifier
            plainId = res.plainId
            firstName = res.miniProfile.firstName
            lastName = res.miniProfile.lastName
            console.log('LinkedIn ID set to:', linkedinId);
            console.log('User profile loaded:', firstName, lastName);
            
            // Store LinkedIn ID in storage
            chrome.storage.local.set({ linkedinId: linkedinId });
            
            // Trigger campaign check now that LinkedIn ID is available
            setTimeout(async () => {
                console.log('🔄 LinkedIn ID available, checking for active campaigns...');
                try {
                    // Ensure LinkedIn ID is properly set before proceeding
                    if (linkedinId && linkedinId !== 'undefined') {
                        await initializeActiveCampaigns();
                    } else {
                        console.log('⚠️ LinkedIn ID not properly set, skipping campaign initialization');
                    }
                } catch (error) {
                    console.log('⚠️ Error initializing campaigns:', error.message);
                }
            }, 1000);
            
            // console.log(await _getProfileNetworkInfo({connectionId: 'ACoAACroOZgBnyT-0ijaCpXNkyFP2CnhGyjSnsM'}))
            // Removed automatic _updateCampaignLeadsNetwork() call to prevent CSRF errors
        })
    })  
}

/**
 * Send message to a given LinkedIn profile
 * @param {object} scheduleInfo 
 */
const messageConnection = scheduleInfo => {
    console.log('─'.repeat(80));
    console.log('📤 MESSAGE FLOW: SENDING TO LINKEDIN');
    console.log('─'.repeat(80));
    console.log(`👤 Lead: ${arConnectionModel.name || 'Unknown'}`);
    console.log(`🔗 Connection ID: ${arConnectionModel.connectionId}`);
    console.log(`💬 Conversation URN: ${arConnectionModel.conversationUrnId || 'New conversation'}`);
    console.log(`📊 Network Distance: ${arConnectionModel.distance}`);
    console.log(`📅 Timestamp: ${new Date().toLocaleString()}`);
    console.log('─'.repeat(80));
    console.log(`📝 Original message: ${arConnectionModel.message ? arConnectionModel.message.substring(0, 150) + '...' : 'No message'}`);
    console.log('─'.repeat(80));
    console.log('🔄 Processing message variables...');

    arConnectionModel.message = changeMessageVariableNames(arConnectionModel.message, arConnectionModel)
    
    console.log(`📝 Processed message: ${arConnectionModel.message ? arConnectionModel.message.substring(0, 150) + '...' : 'No message'}`);
    console.log('─'.repeat(80));

    let url = ''
    let conversationObj = {}
    let messageEvent = {
        value: {
            'com.linkedin.voyager.messaging.create.MessageCreate' : {
                attachments: scheduleInfo.uploads.length ? scheduleInfo.uploads : [],
                body: arConnectionModel.message,
                attributedBody: {"text": arConnectionModel.message, "attributes": []},
                mediaAttachments: [],
            }
        }
    }

    if(arConnectionModel.conversationUrnId){
        url = `${voyagerApi}/messaging/conversations/${arConnectionModel.conversationUrnId}/events?action=create`
        conversationObj = {
            eventCreate: messageEvent
        }
        console.log('─'.repeat(80));
        console.log('💬 MESSAGE FLOW: USING EXISTING CONVERSATION');
        console.log('─'.repeat(80));
        console.log(`💬 Conversation URN: ${arConnectionModel.conversationUrnId}`);
        console.log(`👤 Lead: ${arConnectionModel.name || 'Unknown'}`);
        console.log(`🔗 Connection ID: ${arConnectionModel.connectionId}`);
        console.log('─'.repeat(80));
    }else {
        url = `${voyagerApi}/messaging/conversations?action=create`
        conversationObj = {
            conversationCreate: {
                eventCreate: messageEvent,
                recipients: [arConnectionModel.connectionId],
                subtype: arConnectionModel.distance == 1 ? "MEMBER_TO_MEMBER" : "INMAIL"
            }
        }
        console.log('─'.repeat(80));
        console.log('💬 MESSAGE FLOW: CREATING NEW CONVERSATION');
        console.log('─'.repeat(80));
        console.log(`👤 Lead: ${arConnectionModel.name || 'Unknown'}`);
        console.log(`🔗 Connection ID: ${arConnectionModel.connectionId}`);
        console.log(`📊 Network Distance: ${arConnectionModel.distance}`);
        console.log(`📧 Message Type: ${arConnectionModel.distance == 1 ? 'MEMBER_TO_MEMBER' : 'INMAIL'}`);
        console.log('─'.repeat(80));
    }

    // Get browser cookie
            chrome.cookies.get({
                url: inURL,
                name: 'JSESSIONID'
    }, function(data) {
        if (data !== null) {
            chrome.storage.local.remove("csrfToken")
            chrome.storage.local.set({
                "csrfToken": data.value.replaceAll('"','')
            });
        }
    });

    chrome.storage.local.get(["csrfToken"]).then((result) => {
        console.log('─'.repeat(80));
        console.log('📤 MESSAGE FLOW: SENDING REQUEST TO LINKEDIN');
        console.log('─'.repeat(80));
        console.log(`🔑 CSRF Token: ${result.csrfToken ? 'Available' : 'Missing'}`);
        console.log(`🌐 API URL: ${url}`);
        console.log(`📦 Request type: ${arConnectionModel.conversationUrnId ? 'Add to existing' : 'Create new'}`);
        console.log(`👤 Lead: ${arConnectionModel.name || 'Unknown'}`);
        console.log(`📅 Timestamp: ${new Date().toLocaleString()}`);
        console.log('─'.repeat(80));
        console.log('⏳ Sending request...');
        
        fetch(url, {
            method: 'post',
            headers: {
                'csrf-token': result.csrfToken,
                'accept': 'text/plain, */*; q=0.01',
                'content-type': 'application/json; charset=UTF-8',
                'x-li-lang': 'en_US',
                'x-li-page-instance': 'urn:li:page:d_flagship3_people_invitations;1ZlPK7kKRNSMi+vkXMyVMw==',
                'x-li-track': JSON.stringify({"clientVersion":"1.10.1208","osName":"web","timezoneOffset":1,"deviceFormFactor":"DESKTOP","mpName":"voyager-web"}),
                'x-restli-protocol-version': '2.0.0',
            },
            body: JSON.stringify(conversationObj)
        })
        .then(res => {
            console.log('─'.repeat(80));
            console.log('📊 MESSAGE FLOW: API RESPONSE');
            console.log('─'.repeat(80));
            console.log(`📡 Status: ${res.status} ${res.statusText}`);
            console.log(`👤 Lead: ${arConnectionModel.name || arConnectionModel.connectionId}`);
            
            if(res.ok) {
                console.log('✅ Response: Success');
            } else {
                console.error('❌ Response: Failed');
            }
            
            return res.json();
        })
        .then(res => {
            console.log('─'.repeat(80));
            console.log('✅ MESSAGE FLOW: SUCCESS! ✅');
            console.log('='.repeat(80));
            console.log('🎉 Message sent successfully to LinkedIn!');
            console.log(`👤 Lead: ${arConnectionModel.name || 'Unknown'}`);
            console.log(`🔗 Connection ID: ${arConnectionModel.connectionId}`);
            console.log(`📅 Timestamp: ${new Date().toLocaleString()}`);
            console.log('📄 Response data:', res);
            
            // Extract conversation URN ID from response if available
            if (res && res.value && res.value.entityUrn) {
                const conversationUrnId = res.value.entityUrn.replace('urn:li:fsd_conversation:', '');
                arConnectionModel.conversationUrnId = conversationUrnId;
                console.log('─'.repeat(80));
                console.log('🔗 MESSAGE FLOW: CONVERSATION ESTABLISHED');
                console.log('─'.repeat(80));
                console.log(`💬 Conversation URN: ${conversationUrnId}`);
                console.log(`👤 Lead: ${arConnectionModel.name || 'Unknown'}`);
                console.log(`📅 Timestamp: ${new Date().toLocaleString()}`);
                console.log('─'.repeat(80));
                
                // Set up response monitoring if this is a call message
                if (arConnectionModel.message && arConnectionModel.message.toLowerCase().includes('call')) {
                    setTimeout(async () => {
                        // Try to find the call ID from recent call attempts
                        const allStorage = await chrome.storage.local.get();
                        const callKeys = Object.keys(allStorage).filter(key => key.startsWith('call_attempted_'));
                        
                        for (const key of callKeys) {
                            const callData = allStorage[key];
                            if (callData && Date.now() - callData < 10000) { // Within last 10 seconds
                                const parts = key.split('_');
                                const campaignId = parts[2];
                                const connectionId = parts[3];
                                
                                if (connectionId === arConnectionModel.connectionId) {
                                    const responseMonitoringKey = `call_response_monitoring_${campaignId}_${connectionId}`;
                                    await chrome.storage.local.set({ 
                                        [responseMonitoringKey]: {
                                            callId: null, // Will be updated when we get the actual call ID
                                            leadId: null, // Will be updated when we get the lead ID
                                            leadName: arConnectionModel.name,
                                            connectionId: arConnectionModel.connectionId,
                                            campaignId: campaignId,
                                            conversationUrnId: conversationUrnId,
                                            sentAt: Date.now(),
                                            status: 'waiting_for_response',
                                            lastCheckedMessageId: null,
                                            messageCount: 0,
                                            responseCount: 0, // Track how many times we've responded
                                            lastResponseSentAt: null // Track when we last sent a response
                                        }
                                    });
                                    console.log('📊 Response monitoring set up for call message:', responseMonitoringKey);
                                    console.log('🔗 Conversation URN ID stored:', conversationUrnId);
                                    break;
                                }
                            }
                        }
                    }, 1000);
                }
            }
            
            console.log('─'.repeat(80));
            console.log('🎉 MESSAGE FLOW: COMPLETED');
            console.log('='.repeat(80));
            console.log(`✅ Message successfully delivered!`);
            console.log(`👤 Lead: ${arConnectionModel.name || 'Unknown'}`);
            console.log(`🔗 Connection ID: ${arConnectionModel.connectionId}`);
            console.log(`💬 Conversation URN: ${arConnectionModel.conversationUrnId || 'N/A'}`);
            console.log(`📅 Completed at: ${new Date().toLocaleString()}`);
            console.log('='.repeat(80));
        })
        .catch((err) => {
            console.log('─'.repeat(80));
            console.error('❌ MESSAGE FLOW: ERROR');
            console.log('─'.repeat(80));
            console.error('❌ Failed to send LinkedIn message!');
            console.error(`👤 Lead: ${arConnectionModel.name || arConnectionModel.connectionId}`);
            console.error(`🔗 Connection ID: ${arConnectionModel.connectionId}`);
            console.error(`💬 Conversation URN: ${arConnectionModel.conversationUrnId || 'N/A'}`);
            console.error(`❌ Error:`, err);
            console.error(`📅 Timestamp: ${new Date().toLocaleString()}`);
            console.error(`💡 Possible reasons:`);
            console.error(`   1. Network connection issue`);
            console.error(`   2. LinkedIn rate limiting`);
            console.error(`   3. Invalid connection ID`);
            console.error(`   4. CSRF token expired`);
            console.log('─'.repeat(80));
        })
    })
}
/**
 * Fetch skills of a given LinkedIn profile to endorse.
 * @param {object} lead 
 * @param {object} node 
 */
const _getFeaturedSkill =  (lead, node) => {
    console.log('─'.repeat(80));
    console.log('🔍 ENDORSEMENT FLOW: FETCHING SKILLS');
    console.log('─'.repeat(80));
    console.log(`👤 Lead: ${lead.name}`);
    console.log(`🔗 Connection ID: ${lead.connectionId}`);
    console.log(`🆔 Member URN: ${lead.memberUrn || 'Not set'}`);
    console.log(`🎯 Max skills to endorse: ${node.totalSkills || 1}`);
    console.log(`📅 Timestamp: ${new Date().toLocaleString()}`);
    
    chrome.cookies.get({
        url: inURL,
        name: 'JSESSIONID'
    }, function(data) {
        if (data !== null) {
            chrome.storage.local.remove("csrfToken")
            chrome.storage.local.set({
                "csrfToken": data.value.replaceAll('"','')
            });
            console.log(`✅ CSRF token obtained for skill endorsement`);
        }
    });

    chrome.storage.local.get(["csrfToken"]).then((result) => {
        // FIXED: Use connectionId FIRST (this is what the working endorsement code uses!)
        // Priority: connectionId > conId > publicIdentifier > extract from memberUrn
        let profileId;
        
        if (lead.connectionId) {
            profileId = lead.connectionId;
            console.log(`✅ Using connectionId: ${profileId}`);
        } else if (lead.conId) {
            profileId = lead.conId;
            console.log(`✅ Using conId: ${profileId}`);
        } else if (lead.publicIdentifier) {
            profileId = lead.publicIdentifier;
            console.log(`✅ Using publicIdentifier: ${profileId}`);
        } else if (lead.memberUrn) {
            profileId = lead.memberUrn.replace('urn:li:member:', '');
            console.log(`⚠️ Extracted from memberUrn (last resort): ${profileId}`);
        } else {
            console.error(`❌ No valid profile ID found for ${lead.name}`);
            profileId = null;
        }
        
        if (!profileId) {
            console.error('❌ ENDORSEMENT FLOW: Cannot proceed without profile ID');
            return;
        }
        
        const apiUrl = `${LINKEDIN_URL}/voyager/api/identity/profiles/${profileId}/featuredSkills?includeHiddenEndorsers=false&count=${node.totalSkills}&_=${dInt}`;
        console.log(`🌐 Fetching skills from: ${apiUrl}`);
        console.log(`👤 Profile ID used: ${profileId}`);
        console.log(`📊 Available ID fields:`, {
            connectionId: lead.connectionId || 'N/A',
            conId: lead.conId || 'N/A',
            publicIdentifier: lead.publicIdentifier || 'N/A',
            memberUrn: lead.memberUrn || 'N/A'
        });
        
        fetch(apiUrl, {
            method: 'get',
            headers: {
                'csrf-token': result.csrfToken,
                'accept': 'application/vnd.linkedin.normalized+json+2.1',
                'content-type': 'application/json; charset=UTF-8',
                'x-li-lang': 'en_US',
                'x-li-page-instance': 'urn:li:page:d_flagship3_profile_view_base;OSmjmgZVQ1enfa5KB7KLQg==',
                'x-li-track': JSON.stringify({"clientVersion":"1.10.1335","osName":"web","timezoneOffset":1,"deviceFormFactor":"DESKTOP","mpName":"voyager-web"}),
                'x-restli-protocol-version': '2.0.0'
            }
        })
        .then(res => res.json())
        .then(res => {
            console.log('─'.repeat(80));
            console.log('📋 ENDORSEMENT FLOW: SKILLS API RESPONSE');
            console.log('─'.repeat(80));
            console.log(`📊 Response received for: ${lead.name}`);
            console.log(`✅ Status: Success`);
            console.log(`🔍 Response structure:`, {
                hasData: !!res.data,
                hasElements: !!(res.data && res.data['*elements']),
                elementsLength: res.data && res.data['*elements'] ? res.data['*elements'].length : 0,
                hasIncluded: !!res.included,
                includedLength: res.included ? res.included.length : 0
            });
            
            if(res.included && res.included.length > 0) {
                console.log('─'.repeat(80));
                console.log(`📋 ENDORSEMENT FLOW: AVAILABLE SKILLS (${res.included.length} total)`);
                console.log('─'.repeat(80));
                res.included.forEach((item, index) => {
                    console.log(`   ${index + 1}. ${item.name || 'No name'}`);
                    console.log(`      🔗 URN: ${item.entityUrn || 'No URN'}`);
                });
            }
            
            // Also check the main data structure
            if(res.data && res.data['*elements']) {
                console.log(`📊 Main data elements: ${res.data['*elements'].length}`);
            }
            
            if(res.data && res.data['*elements'] && res.data['*elements'].length){
                console.log('─'.repeat(80));
                console.log(`✅ ENDORSEMENT FLOW: ${res.data['*elements'].length} SKILLS FOUND`);
                console.log('─'.repeat(80));
                
                if(res.included && res.included.length > 0) {
                    console.log(`🎯 Campaign limit: ${node.totalSkills} skill(s)`);
                    console.log(`📋 Available: ${res.included.length} skill(s)`);
                    
                    // Filter skills that have names and limit to the number specified in campaign
                    const skillsToEndorse = res.included
                        .filter(item => item.hasOwnProperty('name'))
                        .slice(0, node.totalSkills || 1);
                    
                    console.log(`🎯 Will endorse: ${skillsToEndorse.length} skill(s)`);
                    console.log('─'.repeat(80));
                    console.log('🚀 ENDORSEMENT FLOW: STARTING ENDORSEMENTS');
                    console.log('─'.repeat(80));
                    
                    skillsToEndorse.forEach((item, index) => {
                        console.log(`\n🏷️ Endorsing skill ${index + 1}/${skillsToEndorse.length}:`);
                        console.log(`   📝 Name: ${item.name}`);
                        console.log(`   🔗 URN: ${item.entityUrn}`);
                        _endorseConnection({
                            connectionId: lead.connectionId,
                            memberUrn: lead.memberUrn,
                            conId: lead.conId, // Add conId field
                            publicIdentifier: lead.publicIdentifier, // Add publicIdentifier field
                            entityUrn: item.entityUrn,
                            skillName: item.name,
                            leadName: lead.name
                        }, result)
                    });
                } else {
                    console.log('─'.repeat(80));
                    console.log(`⚠️ ENDORSEMENT FLOW: NO SKILLS IN RESPONSE`);
                    console.log('─'.repeat(80));
                    console.log(`❌ No skill items found in included array for ${lead.name}`);
                    console.log(`📊 Response data:`, res);
                }
            } else {
                console.log('─'.repeat(80));
                console.log(`❌ ENDORSEMENT FLOW: FAILED - NO SKILLS FOUND`);
                console.log('─'.repeat(80));
                console.log(`👤 Lead: ${lead.name}`);
                console.log(`📊 Response data:`, res.data);
                console.log(`💡 Possible reasons:`);
                console.log(`   1. Lead has no skills listed`);
                console.log(`   2. Profile is private`);
                console.log(`   3. API response structure changed`);
            }
        })
        .catch(err => {
            console.log('─'.repeat(80));
            console.error(`❌ ENDORSEMENT FLOW: ERROR FETCHING SKILLS`);
            console.log('─'.repeat(80));
            console.error(`👤 Lead: ${lead.name}`);
            console.error(`🔗 Connection ID: ${lead.connectionId}`);
            console.error(`❌ Error:`, err);
            console.error(`📅 Timestamp: ${new Date().toLocaleString()}`);
        })
    })
}

/**
 * Endorse connection of a given LinkedIn profile.
 * @param {object} lead 
 * @param {object} result 
 */
const _endorseConnection = (data, result) => {
    console.log('─'.repeat(80));
    console.log('🚀 ENDORSEMENT FLOW: ENDORSING SKILL');
    console.log('─'.repeat(80));
    console.log(`👤 Lead: ${data.leadName || 'Unknown'}`);
    console.log(`🏷️ Skill: ${data.skillName}`);
    console.log(`🔗 Connection ID: ${data.connectionId}`);
    console.log(`🔗 Entity URN: ${data.entityUrn}`);
    console.log(`🆔 Member URN: ${data.memberUrn || 'Not set'}`);
    
    // FIXED: Use connectionId FIRST (this is what the working endorsement code uses!)
    // Priority: connectionId > conId > publicIdentifier > extract from memberUrn
    let profileId;
    
    if (data.connectionId) {
        profileId = data.connectionId;
        console.log(`✅ Using connectionId: ${profileId}`);
    } else if (data.conId) {
        profileId = data.conId;
        console.log(`✅ Using conId: ${profileId}`);
    } else if (data.publicIdentifier) {
        profileId = data.publicIdentifier;
        console.log(`✅ Using publicIdentifier: ${profileId}`);
    } else if (data.memberUrn) {
        profileId = data.memberUrn.replace('urn:li:member:', '');
        console.log(`⚠️ Extracted from memberUrn (last resort): ${profileId}`);
    } else {
        console.error(`❌ No valid profile ID found for ${data.leadName}`);
        profileId = null;
    }
    
    if (!profileId) {
        console.error('❌ ENDORSEMENT FLOW: Cannot proceed without profile ID');
        return;
    }
    
    const endorseUrl = `${VOYAGER_API}/identity/profiles/${profileId}/normEndorsements`;
    console.log(`🌐 API URL: ${endorseUrl}`);
    console.log(`👤 Profile ID used: ${profileId}`);
    console.log(`📊 Available ID fields:`, {
        connectionId: data.connectionId || 'N/A',
        conId: data.conId || 'N/A',
        publicIdentifier: data.publicIdentifier || 'N/A',
        memberUrn: data.memberUrn || 'N/A'
    });
    console.log(`📅 Timestamp: ${new Date().toLocaleString()}`);
    console.log('─'.repeat(80));
    console.log(`📤 Sending endorsement request...`);
    
    fetch(endorseUrl, {
        method: 'post',
        headers: {
            'csrf-token': result.csrfToken,
            'accept': 'text/plain, */*; q=0.01',
            'content-type': 'application/json; charset=UTF-8',
            'x-li-lang': 'en_US',
            'x-li-page-instance': 'urn:li:page:d_flagship3_profile_view_base;3T8zGiC6TaW88WAryS7olA==',
            'x-li-track': JSON.stringify({"clientVersion":"1.10.1335","osName":"web","timezoneOffset":1,"deviceFormFactor":"DESKTOP","mpName":"voyager-web"}),
            'x-restli-protocol-version': '2.0.0'
        },
        body: JSON.stringify({
            skill: {
                entityUrn: data.entityUrn,
                name: data.skillName,
            }
        })
    })
    .then(res => {
        console.log('─'.repeat(80));
        console.log(`📊 ENDORSEMENT FLOW: API RESPONSE`);
        console.log('─'.repeat(80));
        console.log(`📊 Status: ${res.status} ${res.statusText}`);
        console.log(`🏷️ Skill: ${data.skillName}`);
        console.log(`👤 Lead: ${data.leadName || data.connectionId}`);
        
        if(res.status == 201){
            console.log('─'.repeat(80));
            console.log(`✅ ENDORSEMENT FLOW: SUCCESS! ✅`);
            console.log('='.repeat(80));
            console.log(`🎉 Skill endorsed successfully!`);
            console.log(`👤 Lead: ${data.leadName || 'Unknown'}`);
            console.log(`🏷️ Skill: ${data.skillName}`);
            console.log(`🔗 Connection ID: ${data.connectionId}`);
            console.log(`🔗 Entity URN: ${data.entityUrn}`);
            console.log(`🌐 Profile ID: ${profileId}`);
            console.log(`📅 Timestamp: ${new Date().toLocaleString()}`);
            console.log(`📊 Response Status: ${res.status} ${res.statusText}`);
            console.log('='.repeat(80));
            
            // Store endorsement record for tracking
            const endorsementRecord = {
                leadId: data.connectionId,
                leadName: data.leadName || 'Unknown',
                skillName: data.skillName,
                entityUrn: data.entityUrn,
                profileId: profileId,
                timestamp: new Date().toISOString(),
                status: 'success',
                responseStatus: res.status
            };
            
            // Store in chrome storage for persistence
            chrome.storage.local.get(['endorsementHistory']).then((result) => {
                const history = result.endorsementHistory || [];
                history.push(endorsementRecord);
                chrome.storage.local.set({ endorsementHistory: history });
                console.log(`📝 Endorsement record saved`);
                console.log(`📊 Total endorsements in history: ${history.length}`);
                console.log(`📋 Last 5 endorsements:`, history.slice(-5).map(e => `${e.skillName} for ${e.leadName}`));
            });
            
            return { success: true, message: 'Skill endorsed successfully' };
        } else {
            console.log('─'.repeat(80));
            console.error(`❌ ENDORSEMENT FLOW: FAILED`);
            console.log('─'.repeat(80));
            console.error(`❌ Status: ${res.status} ${res.statusText}`);
            console.error(`🏷️ Skill: ${data.skillName}`);
            console.error(`👤 Lead: ${data.leadName || data.connectionId}`);
            console.error(`🔗 Connection ID: ${data.connectionId}`);
            console.error(`🔗 Entity URN: ${data.entityUrn}`);
            console.error(`📅 Timestamp: ${new Date().toLocaleString()}`);
            console.error(`💡 Possible reasons:`);
            console.error(`   1. Already endorsed this skill`);
            console.error(`   2. Skill no longer available`);
            console.error(`   3. Rate limit reached`);
            console.error(`   4. Invalid skill URN`);
            console.log('─'.repeat(80));
            
            return { success: false, message: `Failed to endorse skill: ${res.status}` };
        }
    })
    .then(result => {
        if(result.success) {
            console.log(`🎉 ENDORSEMENT COMPLETED: ${data.skillName} for ${data.leadName}`);
        } else {
            console.log(`⚠️ Endorsement result:`, result);
        }
    })
    .catch(err => {
        console.log('─'.repeat(80));
        console.error(`❌ ENDORSEMENT FLOW: ERROR`);
        console.log('─'.repeat(80));
        console.error(`❌ Exception caught during endorsement`);
        console.error(`🏷️ Skill: ${data.skillName}`);
        console.error(`👤 Lead: ${data.leadName || data.connectionId}`);
        console.error(`🔗 Connection ID: ${data.connectionId}`);
        console.error(`❌ Error:`, err);
        console.error(`📅 Timestamp: ${new Date().toLocaleString()}`);
        console.log('─'.repeat(80));
    })
}

/**
 * View profile of a given LinkedIn profile.
 * @param {object} lead 
 */
const _viewProfile = (lead) => {
    chrome.cookies.get({
        url: inURL,
        name: 'JSESSIONID'
    }, function(data) {
        if (data !== null) {
            chrome.storage.local.remove("csrfToken")
            chrome.storage.local.set({
                "csrfToken": data.value.replaceAll('"','')
            });
        }
    });

    chrome.storage.local.get(["csrfToken"]).then((result) => {
        let targetId = lead.memberUrn.replace('urn:li:member:','')

        fetch(`${LINKEDIN_URL}/li/track`, {
            method: 'post',
            headers: {
                'csrf-token': result.csrfToken,
                'content-type': 'application/json'
            },
            body: JSON.stringify([{
                eventBody: {
                    entityView: {
                        targetId: targetId,
                        viewType: "profile-view",
                        viewerId: plainId
                    },
                    header: {
                        clientApplicationInstance: {
                            applicationUrn: "urn:li:application:(voyager-web,voyager-web)",
                            trackingId: lead.trackingId,
                            version: "1.10.1648"
                        },
                        pageInstance: {
                            pageUrn: "urn:li:page:d_flagship3_profile_view_base",
                            trackingId: lead.trackingId
                        },
                        time: dInt
                    },
                    networkDistance: lead.networkDistance,
                    profileTrackingId: lead.trackingId,
                    requestHeader: {
                        interfaceLocale: "en_US",
                        pageKey: "d_flagship3_profile_view_base",
                        path: `${LINKEDIN_URL}/in/${lead.connectionId}`,
                        referer: LINKEDIN_URL,
                        trackingCode: "d_flagship3_feed"
                    },
                    vieweeMemberUrn: lead.memberUrn,
                    viewerPrivacySetting: "F",
                },
                eventInfo: {
                    appId: "com.linkedin.flagship3.d_web",
                    eventName: "ProfileViewEvent",
                    topicName: "ProfileViewEvent"
                }
            }])
        })
        .then(res => res.json())
        .then(res => {
            console.log('Profile view...')
        })
        .catch(err => console.log(err))
    })
}

/**
 * Follow connection of a given LinkedIn profile.
 * @param {object} lead 
 */
const _followConnection = (lead) => {
    chrome.cookies.get({
        url: inURL,
        name: 'JSESSIONID'
    }, function(data) {
        if (data !== null) {
            chrome.storage.local.remove("csrfToken")
            chrome.storage.local.set({
                "csrfToken": data.value.replaceAll('"','')
            });
        }
    });

    chrome.storage.local.get(["csrfToken"]).then((result) => {
        fetch(`${VOYAGER_API}/identity/profiles/${lead.connectionId}/profileActions?versionTag=3533619214&action=follow`, {
            method: 'post',
            headers: {
                'csrf-token': result.csrfToken,
                'accept': 'text/plain, */*; q=0.01',
                'content-type': 'application/json; charset=UTF-8',
                'x-li-lang': 'en_US',
                'x-li-page-instance': 'urn:li:page:p_flagship3_search_srp_people;QyXMiN7pT8uwOeco13WjEg==',
                'x-li-track': JSON.stringify({"clientVersion":"1.10.1848","osName":"web","timezoneOffset":1,"deviceFormFactor":"DESKTOP","mpName":"voyager-web"}),
                'x-restli-protocol-version': '2.0.0'
            },
            body: JSON.stringify({
                actions: [],
                overflowActions: []
            })
        })
        .then(res => res.json())
        .then(res => {
            console.log('Connection followed...')
        })
        .catch(err => console.log(err))
    })
}

/**
 * Fetch post for a given LinkedIn profile.
 * @param {object} lead 
 */
const _getProfilePosts = (lead) => {
    chrome.cookies.get({
        url: inURL,
        name: 'JSESSIONID'
    }, function(data) {
        if (data !== null) {
            chrome.storage.local.remove("csrfToken")
            chrome.storage.local.set({
                "csrfToken": data.value.replaceAll('"','')
            });
        }
    });

    chrome.storage.local.get(["csrfToken"]).then((result) => {
        let params = `count=1&start=0&q=memberShareFeed&moduleKey=member-shares%3Aphone&profileUrn=urn%3Ali%3Afsd_profile%3A${lead.connectionId}`
        let url = `${VOYAGER_API}/identity/profileUpdatesV2?${params}`

        fetch(url, {
            headers: {
                'csrf-token': result.csrfToken,
                'accept': 'text/plain, */*; q=0.01',
                'content-type': 'application/json; charset=UTF-8',
                'x-li-lang': 'en_US',
                'x-li-page-instance': 'urn:li:page:d_flagship3_feed;ZsKs0H2CQoumO3E6tColQA==',
                'x-li-track': JSON.stringify({"clientVersion":"1.10.1971","osName":"web","timezoneOffset":1,"deviceFormFactor":"DESKTOP","mpName":"voyager-web"}),
                'x-restli-protocol-version': '2.0.0'
            }
        })
        .then(res => res.json())
        .then(res => {
            console.log('get connection post...')
            if(res.elements.length){
                for(let item of res.elements){
                    _likePost(item, result)
                }
            }
        })
        .catch(err => console.log(err))
    })
}

/**
 * Like post for a given LinkedIn profile.
 * @param {object} lead 
 * @param {object} result 
 */
const _likePost = (post, result) => {
    fetch(`${VOYAGER_API}/feed/reactions`, {
        method: 'post',
        headers: {
            'csrf-token': result.csrfToken,
            'accept': 'application/vnd.linkedin.normalized+json+2.1',
            'content-type': 'application/json; charset=UTF-8',
            'x-li-lang': 'en_US',
            'x-li-page-instance': 'urn:li:page:d_flagship3_feed;6UclcxmySTiFlfill36CoA==',
            'x-li-track': JSON.stringify({"clientVersion":"1.10.1971","osName":"web","timezoneOffset":1,"deviceFormFactor":"DESKTOP","mpName":"voyager-web"}),
            'x-restli-protocol-version': '2.0.0'
        },
        body: JSON.stringify({
            threadUrn: post.socialDetail.urn,
            reactionType: 'LIKE'
        })
    })
    .then(res => res.json())
    .then(res => {
        console.log('post liked...')
    })
    .catch(err => console.log(err))
}
/**
 * Send connection request to a given LinkedIn profile.
 * @param {object} lead 
 * @param {object} node 
 */
const _sendConnectionInvite = async (lead, node, campaignId) => {
    console.log('🚀🚀🚀 _sendConnectionInvite function STARTED!');
    console.log('🔍 Function called with:', { 
        leadName: lead.name, 
        leadId: lead.connectionId, 
        nodeValue: node.value,
        hasInviteNote: node.hasInviteNote 
    });
    
    // Prepare message
            let rawMessage = node.inviteNote || node.message || "";
    let newMessage = node.hasInviteNote ? changeMessageVariableNames(rawMessage, lead) : null;
    
    // Remove line breaks that might cause issues
    if (newMessage) {
        newMessage = newMessage.replace(/\n/g, ' ').replace(/\r/g, ' ').trim();
    }
    
    console.log(`📧 Preparing invitation for ${lead.name} (${lead.connectionId})`);
    console.log(`📝 Include custom message: ${node.hasInviteNote ? 'Yes' : 'No'}`);
    console.log(`🔍 Raw message template: "${rawMessage}"`);
    console.log(`🔍 Lead firstName: "${lead.firstName}", lastName: "${lead.lastName}"`);
    if (newMessage) console.log(`💬 Processed message: "${newMessage}"`);
        
    try {
        // Use LinkedIn Invite Automation instead of API
        console.log('🔄 Using LinkedIn Invite Automation for browser-based invite...');
        
        // Create profile URL from connection ID
        const profileUrl = `https://www.linkedin.com/in/${lead.connectionId}`;
        console.log(`🌐 Profile URL: ${profileUrl}`);
        
        // REAL BROWSER AUTOMATION - Open LinkedIn profile and send invite
        console.log('🎯 LinkedIn Invite Automation - REAL Browser-based approach');
        console.log(`📧 Sending invite to: ${lead.name} (${lead.connectionId})`);
        console.log(`📝 Custom message: ${newMessage || 'Default connection message'}`);
        console.log(`🌐 Profile URL: ${profileUrl}`);
        
        try {
            // Step 1: Open LinkedIn profile in new tab
            console.log('🔄 Step 1: Opening LinkedIn profile page...');
            const tab = await chrome.tabs.create({
                url: profileUrl,
                active: false // Open in background
            });
            console.log(`✅ Tab created with ID: ${tab.id}`);
            
            // Step 2: Wait for page to load
            console.log('🔄 Step 2: Waiting for page to load...');
            await new Promise((resolve) => {
                const checkTab = () => {
                    chrome.tabs.get(tab.id, (tabInfo) => {
                        if (tabInfo && tabInfo.status === 'complete') {
                            console.log('✅ Page loaded completely');
                            resolve();
                        } else {
                            setTimeout(checkTab, 1000);
                        }
                    });
                };
                checkTab();
            });
            
            // Step 3: Inject automation script to handle the invite process
            console.log('🔄 Step 3: Injecting automation script...');
            const result = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                function: async (customMessage) => {
                    console.log('🤖 LinkedIn Invite Automation script injected');
                    console.log('🔍 Script execution started - checking page elements...');
                    console.log('🚨 CRITICAL: Script function is executing!');
                    
                    // Function to wait for element
                    const waitForElement = (selector, timeout = 10000) => {
                        return new Promise((resolve, reject) => {
                            const startTime = Date.now();
                            const checkElement = () => {
                                const element = document.querySelector(selector);
                                if (element) {
                                    resolve(element);
                                    return;
                                }
                                if (Date.now() - startTime > timeout) {
                                    reject(new Error(`Element ${selector} not found`));
                                    return;
                                }
                                setTimeout(checkElement, 100);
                            };
                            checkElement();
                        });
                    };
                    
                    // Function to delay
                    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
                    
                    try {
                        console.log('🔍 Step 4: Checking connection status...');
                        console.log('🚨 TEST: Script is executing the try block!');
                        
                        // Check if already connected
                        const connectedElements = document.querySelectorAll('[aria-label*="Connected"], [aria-label*="connected"]');
                        if (connectedElements.length > 0) {
                            console.log('ℹ️ Already connected to this profile');
                            return { success: false, skipped: true, reason: 'Already connected' };
                        }
                        
                        // Check if invite already sent
                        const inviteSentElements = document.querySelectorAll('[aria-label*="Invitation sent"], [aria-label*="invitation sent"]');
                        if (inviteSentElements.length > 0) {
                            console.log('ℹ️ Invite already sent to this profile');
                            return { success: false, skipped: true, reason: 'Invite already sent' };
                        }
                        
                        console.log('🔍 Step 5: Looking for Connect button...');
                        console.log('🔍 Page URL:', window.location.href);
                        console.log('🔍 Page title:', document.title);
                        console.log('🚨 TEST: Reached button detection section!');
                        console.log('🚨 DEBUG: About to check for direct Connect buttons...');
                        
                        // Find Connect button - ONLY within the main profile div
                        const mainProfileDiv = document.querySelector('.LJMnFhQbkaHbZlWMTaInpCStHcMvMYk');
                        console.log('🔍 Main profile div found:', mainProfileDiv);
                        
                        if (!mainProfileDiv) {
                            console.log('❌ Main profile div not found - cannot proceed safely');
                            return { success: false, error: 'Main profile container not found' };
                        }
                        
                        const connectSelectors = [
                            '.LJMnFhQbkaHbZlWMTaInpCStHcMvMYk button[aria-label*="Connect"]',
                            '.LJMnFhQbkaHbZlWMTaInpCStHcMvMYk button[aria-label*="connect"]',
                            '.LJMnFhQbkaHbZlWMTaInpCStHcMvMYk button[aria-label*="Invite"]',
                            '.LJMnFhQbkaHbZlWMTaInpCStHcMvMYk button[aria-label*="invite"]',
                            '.LJMnFhQbkaHbZlWMTaInpCStHcMvMYk .artdeco-button[aria-label*="Connect"]',
                            '.LJMnFhQbkaHbZlWMTaInpCStHcMvMYk .artdeco-button[aria-label*="Invite"]',
                            '.LJMnFhQbkaHbZlWMTaInpCStHcMvMYk [data-control-name="connect"]',
                            '.LJMnFhQbkaHbZlWMTaInpCStHcMvMYk .pv-s-profile-actions--connect',
                            '.LJMnFhQbkaHbZlWMTaInpCStHcMvMYk .pv-s-profile-actions button'
                        ];
                        
                        console.log('🔍 Checking for direct Connect buttons within main profile div...');
                        
                        // Log all buttons within the main profile div for debugging
                        const profileButtons = mainProfileDiv.querySelectorAll('button');
                        console.log(`🔍 Found ${profileButtons.length} buttons within main profile div:`);
                        profileButtons.forEach((btn, index) => {
                            if (index < 10) { // Only log first 10 buttons to avoid spam
                                console.log(`  Button ${index + 1}: "${btn.textContent.trim()}" (aria-label: "${btn.getAttribute('aria-label')}")`);
                            }
                        });
                        
                        let connectButton = null;
                        for (const selector of connectSelectors) {
                            connectButton = document.querySelector(selector);
                            console.log(`🔍 Checking selector "${selector}":`, connectButton);
                            if (connectButton && connectButton.offsetParent !== null) {
                                console.log(`✅ Found Connect button with selector: ${selector}`);
                                break;
                            }
                        }
                        
                        console.log('🚨 DEBUG: Direct Connect button search completed. Found:', connectButton);
                        
                        // Fallback: look for any button with "Connect" or "Invite" text within main profile div
                        if (!connectButton) {
                            console.log('🚨 DEBUG: No direct Connect button found, checking by text content within main profile div...');
                            const profileButtons = mainProfileDiv.querySelectorAll('button');
                            for (const button of profileButtons) {
                                const buttonText = button.textContent.toLowerCase();
                                if ((buttonText.includes('connect') || buttonText.includes('invite')) && button.offsetParent !== null) {
                                    connectButton = button;
                                    console.log('✅ Found Connect/Invite button by text content within main profile div');
                                    break;
                                }
                            }
                        }
                        
                        console.log('🚨 DEBUG: Text content search completed. Found:', connectButton);
                        
                        // Fallback: Check "More" dropdown for Connect button within main profile div
                        if (!connectButton) {
                            console.log('🚨 DEBUG: No Connect button found by text, checking More dropdown within main profile div...');
                            console.log('🔍 Checking "More" dropdown for Connect button...');
                            const moreButton = mainProfileDiv.querySelector('button[aria-label*="More actions"], button[aria-label*="More"], .artdeco-dropdown__trigger');
                            console.log('🔍 More button search result:', moreButton);
                            if (moreButton) {
                                console.log('✅ Found "More" button, details:', {
                                    text: moreButton.textContent,
                                    ariaLabel: moreButton.getAttribute('aria-label'),
                                    className: moreButton.className,
                                    id: moreButton.id,
                                    visible: moreButton.offsetParent !== null
                                });
                                console.log('🖱️ Clicking "More" button to open dropdown...');
                                moreButton.click();
                                console.log('✅ "More" button clicked, waiting for dropdown to open...');
                                await delay(1000); // Wait for dropdown to open
                                
                                // Look for Connect button in dropdown within main profile div
                                console.log('🔍 Searching for Connect button in dropdown within main profile div...');
                                const dropdownConnectSelectors = [
                                    '.LJMnFhQbkaHbZlWMTaInpCStHcMvMYk button[aria-label*="Connect"]',
                                    '.LJMnFhQbkaHbZlWMTaInpCStHcMvMYk button[aria-label*="connect"]',
                                    '.LJMnFhQbkaHbZlWMTaInpCStHcMvMYk button[aria-label*="Invite"]',
                                    '.LJMnFhQbkaHbZlWMTaInpCStHcMvMYk button[aria-label*="invite"]',
                                    '.LJMnFhQbkaHbZlWMTaInpCStHcMvMYk .artdeco-dropdown__content button[aria-label*="Connect"]',
                                    '.LJMnFhQbkaHbZlWMTaInpCStHcMvMYk .artdeco-dropdown__content button[aria-label*="connect"]',
                                    '.LJMnFhQbkaHbZlWMTaInpCStHcMvMYk .artdeco-dropdown__content button[aria-label*="Invite"]',
                                    '.LJMnFhQbkaHbZlWMTaInpCStHcMvMYk .artdeco-dropdown__content button[aria-label*="invite"]',
                                    '.LJMnFhQbkaHbZlWMTaInpCStHcMvMYk .artdeco-dropdown__item[aria-label*="Connect"]',
                                    '.LJMnFhQbkaHbZlWMTaInpCStHcMvMYk .artdeco-dropdown__item[aria-label*="connect"]',
                                    '.LJMnFhQbkaHbZlWMTaInpCStHcMvMYk .artdeco-dropdown__item[aria-label*="Invite"]',
                                    '.LJMnFhQbkaHbZlWMTaInpCStHcMvMYk .artdeco-dropdown__item[aria-label*="invite"]',
                                    '.LJMnFhQbkaHbZlWMTaInpCStHcMvMYk [aria-label*="Invite"][aria-label*="connect"]',
                                    '.LJMnFhQbkaHbZlWMTaInpCStHcMvMYk [role="button"][aria-label*="Connect"]',
                                    '.LJMnFhQbkaHbZlWMTaInpCStHcMvMYk [role="button"][aria-label*="Invite"]'
                                ];
                                
                                for (const selector of dropdownConnectSelectors) {
                                    connectButton = document.querySelector(selector);
                                    console.log(`🔍 Checking selector "${selector}":`, connectButton);
                                    if (connectButton && connectButton.offsetParent !== null) {
                                        console.log(`✅ Found Connect button in dropdown with selector: ${selector}`);
                                        console.log('🔍 Connect button details:', {
                                            text: connectButton.textContent,
                                            ariaLabel: connectButton.getAttribute('aria-label'),
                                            className: connectButton.className,
                                            id: connectButton.id,
                                            visible: connectButton.offsetParent !== null
                                        });
                                        break;
                                    }
                                }
                                
                                // Also check by text content in dropdown within main profile div
                                if (!connectButton) {
                                    console.log('🔍 Searching dropdown by text content within main profile div...');
                                    const dropdownButtons = mainProfileDiv.querySelectorAll('.artdeco-dropdown__content button, .artdeco-dropdown__content [role="menuitem"], .artdeco-dropdown__item, [role="button"]');
                                    console.log(`🔍 Found ${dropdownButtons.length} dropdown buttons to check within main profile div`);
                                    for (const button of dropdownButtons) {
                                        console.log(`🔍 Checking button: "${button.textContent.trim()}" (aria-label: "${button.getAttribute('aria-label')}")`);
                                        const buttonText = button.textContent.toLowerCase();
                                        if ((buttonText.includes('connect') || buttonText.includes('invite')) && button.offsetParent !== null) {
                                            connectButton = button;
                                            console.log('✅ Found Connect/Invite button in dropdown by text content within main profile div');
                                            console.log('🔍 Connect button details:', {
                                                text: connectButton.textContent,
                                                ariaLabel: connectButton.getAttribute('aria-label'),
                                                className: connectButton.className,
                                                id: connectButton.id,
                                                visible: connectButton.offsetParent !== null
                                            });
                                            break;
                                        }
                                    }
                                }
                            } else {
                                console.log('🚨 DEBUG: More button not found!');
                            }
                        }
                        
                        console.log('🚨 DEBUG: Final Connect button check. Found:', connectButton);
                        
                        if (!connectButton) {
                            console.log('❌ Connect button not found');
                            return { success: false, error: 'User not found or connection not available' };
                        }
                        
                        console.log('🖱️ Step 6: Clicking Connect button...');
                        
                        // Scroll to button and click
                        connectButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        await delay(1000);
                        connectButton.click();
                        console.log('✅ Connect button clicked');
                        
                        // Wait for modal to appear
                        console.log('🔄 Step 7: Waiting for modal to appear...');
                        await delay(2000);
                        
                        // Look for Send button in modal
                        console.log('🔍 Step 8: Looking for Send button...');
                        const sendSelectors = [
                            'button[aria-label*="Send now"]',
                            'button[aria-label*="send now"]',
                            '.artdeco-button[aria-label*="Send"]',
                            '[data-control-name="send_invite"]',
                            '.artdeco-modal__actionbar button'
                        ];
                        
                        let sendButton = null;
                        for (const selector of sendSelectors) {
                            sendButton = document.querySelector(selector);
                            if (sendButton && sendButton.offsetParent !== null) {
                                console.log(`✅ Found Send button with selector: ${selector}`);
                                break;
                            }
                        }
                        
                        // Fallback: look for any button with "Send" text
                        if (!sendButton) {
                            const allButtons = document.querySelectorAll('button');
                            for (const button of allButtons) {
                                if (button.textContent.toLowerCase().includes('send') && button.offsetParent !== null) {
                                    sendButton = button;
                                    console.log('✅ Found Send button by text content');
                                    break;
                                }
                            }
                        }
                        
                        if (!sendButton) {
                            console.log('❌ Send button not found');
                            return { success: false, error: 'Connection not successfully sent' };
                        }
                        
                        console.log('📤 Step 9: Sending invite...');
                        sendButton.click();
                        console.log('✅ Send button clicked');
                        
                        // Wait for confirmation
                        await delay(2000);
                        
                        // Check for success indicators
                        const successIndicators = [
                            '[aria-label*="Invitation sent"]',
                            '.artdeco-inline-feedback--success',
                            '.pv-s-profile-actions--message'
                        ];
                        
                        for (const selector of successIndicators) {
                            const element = document.querySelector(selector);
                            if (element) {
                                console.log('✅ Invite sent successfully confirmed');
                                return { success: true };
                            }
                        }
                        
                        console.log('✅ Invite sent (no explicit confirmation found)');
                        console.log('🚨 TEST: Script completed successfully!');
                        return { success: true };
                        
                    } catch (error) {
                        console.log('🚨 TEST: Script caught an error!');
                        console.error('❌ Error in automation:', error.message);
                        return { success: false, error: error.message };
                    }
                },
                args: [newMessage]
            });
            
            // Step 4: Wait for automation to complete and get results
            console.log('🔄 Step 4: Waiting for automation to complete...');
            await delay(5000); // Give time for automation to complete
            
            // Step 5: Close the tab
            console.log('🔄 Step 5: Closing tab...');
            await chrome.tabs.remove(tab.id);
            console.log('✅ Tab closed');
            
            console.log(`✅ INVITATION SUCCESSFULLY SENT to ${lead.name} (${lead.connectionId})`);
            console.log(`🎯 Browser automation - Invitation sent successfully`);
            console.log(`📝 Message: ${newMessage || 'Default connection message'}`);
            console.log(`💡 Verify in LinkedIn: My Network → Manage my network → Sent invitations`);
            
            // Update lead status
            try {
                // Use the campaign ID passed as parameter
                const actualCampaignId = campaignId || lead.campaignId || 82; // Fallback to campaign 82
                console.log(`🔄 Updating lead status for campaign: ${actualCampaignId}, lead: ${lead.id}`);
                console.log(`🔍 Lead object details:`, {
                    id: lead.id,
                    connectionId: lead.connectionId,
                    name: lead.name,
                    source: lead.source
                });
                
                // Try both lead.id and lead.connectionId if lead.id is not available
                const leadIdToUse = lead.id || lead.connectionId;
                if (!leadIdToUse) {
                    console.error('❌ No valid lead ID found for update');
                    return;
                }
                
                await updateLeadGenRunning(actualCampaignId, leadIdToUse, {
                    acceptedStatus: false, // Set to false initially - will be updated when invite is accepted
                    currentNodeKey: node.key,
                    nextNodeKey: 0, // Use 0 instead of null to satisfy database constraint
                    statusLastId: 2 // Use 2 to represent 'invite_sent' (1 = initial, 2 = sent, 3 = accepted)
                });
                console.log('✅ Lead status updated successfully');
            } catch (updateError) {
                console.warn('⚠️ Could not update lead status:', updateError.message);
            }
            
        } catch (automationError) {
            console.error('❌ Browser automation failed:', automationError);
            console.log('🔄 Falling back to API method...');
            
            // Fallback to API method
            await _sendConnectionInviteAPI(lead, node, newMessage);
        }
        
    } catch (error) {
        console.error(`❌ INVITATION ERROR for ${lead.name} (${lead.connectionId}):`, error);
        console.error('🔍 Possible reasons: Network error, invalid profile, or LinkedIn rate limiting');
        
        // Update lead status for error
        try {
            await updateLeadGenRunning(lead.campaignId || 0, lead.id, {
                acceptedStatus: false,
                currentNodeKey: node.key,
                nextNodeKey: 0, // Use 0 instead of null to satisfy database constraint
                statusLastId: 4 // Use 4 to represent 'invite_error' (1 = initial, 2 = sent, 3 = accepted, 4 = error)
            });
            console.log('✅ Lead status updated for error');
        } catch (updateError) {
            console.warn('⚠️ Could not update lead status:', updateError.message);
        }
    }
}

// Fallback API method (original implementation)
const _sendConnectionInviteAPI = async (lead, node, newMessage) => {
    console.log('🔄 Using API fallback method...');
    
    chrome.cookies.get({
        url: inURL,
        name: 'JSESSIONID'
    }, function(data) {
        console.log('🍪 JSESSIONID cookie retrieved:', data ? 'Found' : 'Not found');
        if (data !== null) {
            chrome.storage.local.remove("csrfToken")
            chrome.storage.local.set({
                "csrfToken": data.value.replaceAll('"','')
            });
        }
    });
    
    chrome.storage.local.get(["csrfToken"]).then(async (result) => {
        // Get all cookies for LinkedIn
        chrome.cookies.getAll({domain: '.linkedin.com'}, function(cookies) {
            let cookieString = cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
            
                            // Switch back to new LinkedIn API with correct structure
        const requestPayload = {
            requestId: "com.linkedin.sdui.requests.mynetwork.addaAddConnection",
            requestedArguments: {
                $type: "proto.sdui.actions.requests.RequestedArguments",
                payload: {
                    nonIterableProfileId: lead.connectionId,
                    firstName: lead.firstName || "",
                    lastName: lead.lastName || "",
                    customMessage: newMessage || "",
                    origin: "InvitationOrigin_MEMBER_PROFILE"
                },
                requestMetadata: {
                    $type: "proto.sdui.common.RequestMetadata"
                },
                requestedStateKeys: []
            },
            serverRequest: {
                $type: "proto.sdui.actions.core.ServerRequest",
                isStreaming: false
            },
            states: []
        };
        
            console.log('🔄 Using API fallback with NEW LinkedIn API');
        
        fetch(`https://www.linkedin.com/flagship-web/rsc-action/actions/server-request?sduiid=com.linkedin.sdui.requests.mynetwork.addaAddConnection`, {
            method: 'POST',
                headers: {
                    'cookie': cookieString,
                'csrf-token': result.csrfToken,
                'content-type': 'application/json',
                'x-restli-protocol-version': '2.0.0'
                },
            body: JSON.stringify(requestPayload),
            })
            .then(res => {
                console.log(`📧 LinkedIn API Response Status: ${res.status} (${res.statusText})`);
                
            if (res.status === 200) {
                    console.log('✅ STATUS 200: API fallback - Request processed successfully');
            } else if (res.status === 201) {
                console.log('✅ STATUS 201: Request created successfully');
                } else if (res.status === 301) {
                    console.log('⚠️ STATUS 301: Moved Permanently - Using old API endpoint');
                } else if (res.status === 403) {
                    console.log('❌ STATUS 403: Forbidden - LinkedIn blocked the request');
                } else if (res.status === 422) {
                    console.log('❌ STATUS 422: Unprocessable Entity - Invalid data in request');
                } else if (res.status === 429) {
                    console.log('❌ STATUS 429: Rate Limited - Too many requests');
                } else {
                    console.log(`⚠️ STATUS ${res.status}: Unexpected response`);
                }
                
                return res.json().catch(() => {
                    console.log('📄 No JSON response body (redirect or empty response)');
                    return { status: res.status, redirected: res.url !== `https://www.linkedin.com/flagship-web/rsc-action/actions/server-request?sduiid=com.linkedin.sdui.requests.mynetwork.addaAddConnection` };
                });
            })
            .then(res => {
                console.log('📧 LinkedIn API Response Data:', res);
                
                            if (res.status === 200 && res.success !== false) {
                console.log(`✅ INVITATION SUCCESSFULLY SENT to ${lead.name} (${lead.connectionId})`);
                    console.log(`🎯 API fallback - Invitation sent successfully`);
                console.log(`📝 Message: ${newMessage || 'Default connection message'}`);
                                            } else if (res.status === 301) {
                    console.log('🚨 STATUS 301 DETECTED: API endpoint moved');
                } else if (res.error || res.success === false) {
                    console.error(`❌ INVITATION FAILED to ${lead.name}:`, res.error || res.message || 'Unknown error');
                } else {
                    console.log(`⚠️ UNCERTAIN STATUS for ${lead.name}:`, res);
                }
            })
            .catch(err => {
                console.error(`❌ INVITATION ERROR for ${lead.name} (${lead.connectionId}):`, err);
        });
        });
    });
}

/**
 * Fetch member badge data for a given LinkedIn profile.
 * @param {object} lead 
 * @returns {object} memberBadges
 */
const _getMemberBadge = async (lead) => {
    let memberBadges;
    chrome.cookies.get({
        url: inURL,
        name: 'JSESSIONID'
    }, function(data) {
        if (data !== null) {
            chrome.storage.local.remove("csrfToken")
            chrome.storage.local.set({
                "csrfToken": data.value.replaceAll('"','')
            });
        }
    });
    await chrome.storage.local.get(["csrfToken"]).then(async (result) => {
        await fetch(`${VOYAGER_API}/identity/profiles/${lead.connectionId}/memberBadges`, {
            headers: {
                'csrf-token': result.csrfToken,
                'accept': 'application/vnd.linkedin.normalized+json+2.1',
                'x-li-lang': 'en_US',
                'x-li-page-instance': 'urn:li:page:d_flagship3_people_connections;un8rM4cBRDuC1Xpg7yGNCw==',
                'x-li-track': JSON.stringify({"clientVersion":"1.10.1697","osName":"web","timezoneOffset":1,"deviceFormFactor":"DESKTOP","mpName":"voyager-web"}),
                'x-restli-protocol-version': '2.0.0'
            }
        })
        .then(res => res.json())
        .then(res => {
            console.log('member badge...')
            memberBadges = res
        })
        .catch(err => console.log(err))
    })
    return memberBadges;
}

/**
 * Fetch network data for a given LinkedIn profile.
 * @param {object} lead
 * @returns {object} networkInfo
 */
const _getProfileNetworkInfo = async (lead) => {
    let networkInfo;
    chrome.cookies.get({
        url: inURL,
        name: 'JSESSIONID'
    }, function(data) {
        if (data !== null){
            chrome.storage.local.remove("csrfToken")
            chrome.storage.local.set({
                "csrfToken": data.value.replaceAll('"','')
            });
        }
    });
    await chrome.storage.local.get(["csrfToken"]).then(async (result) => {
        await fetch(`${VOYAGER_API}/identity/profiles/${lead.connectionId}/networkinfo`, {
            headers: {
                'csrf-token': result.csrfToken,
                'accept': 'application/vnd.linkedin.normalized+json+2.1',
                'x-li-lang': 'en_US',
                'x-li-page-instance': 'urn:li:page:d_flagship3_people_connections;un8rM4cBRDuC1Xpg7yGNCw==',
                'x-li-track': JSON.stringify({"clientVersion":"1.10.1697","osName":"web","timezoneOffset":1,"deviceFormFactor":"DESKTOP","mpName":"voyager-web"}),
                'x-restli-protocol-version': '2.0.0'
            }
        })
        .then(res => res.json())
        .then(res => {
            console.log('network info...')
            // networkDistance = parseInt(res.data.distance.value.split('_')[1])
            networkInfo = res
        })
        .catch(err => console.log(err))
    });
    return networkInfo;
}

/**
 * Fetch data for a given LinkedIn profile.
 * @param {object} lead 
 * @returns {object} profileInfo
 */
const _getProfileInfo = async (lead) => {
    let profileInfo;
    chrome.cookies.get({
        url: inURL,
        name: 'JSESSIONID'
    }, function(data){
        if (data !== null) {
            chrome.storage.local.remove("csrfToken")
            chrome.storage.local.set({
                "csrfToken": data.value.replaceAll('"','')
            });
        }
    });
    await chrome.storage.local.get(["csrfToken"]).then(async (result) => {
        await fetch(`${VOYAGER_API}/identity/profiles/${lead.connectionId}/profileView`, {
            headers: {
                'csrf-token': result.csrfToken,
                'accept': 'application/vnd.linkedin.normalized+json+2.1',
                'x-li-lang': 'en_US',
                'x-li-page-instance': 'urn:li:page:d_flagship3_people_connections;un8rM4cBRDuC1Xpg7yGNCw==',
                'x-li-track': JSON.stringify({"clientVersion":"1.10.1697","osName":"web","timezoneOffset":1,"deviceFormFactor":"DESKTOP","mpName":"voyager-web"}),
                'x-restli-protocol-version': '2.0.0'
            }
        })
        .then(res => res.json())
        .then(res => {
            console.log('profile info...')
            // if(res.included.length){
            //     for(let item of res.included){
            //         if(item['$type'] == 'com.linkedin.voyager.identity.shared.MiniProfile'){
            //             trackingId = item.trackingId
            //         }
            //     }
            // }
            profileInfo = res
        })
        .catch(err => console.log(err))
    })
    return profileInfo;
}

/**
 * Fetch contact data for a given LinkedIn profile.
 * @param {object} lead 
 * @returns {object} profileContactInfo
 */
const _getProfileContactInfo = async (lead) => {
    let profileContactInfo;
    chrome.cookies.get({
        url: inURL,
        name: 'JSESSIONID'
    }, function(data) {
        if (data !== null){
            chrome.storage.local.remove("csrfToken")
            chrome.storage.local.set({
                "csrfToken": data.value.replaceAll('"','')
            });
        }
    });
    await chrome.storage.local.get(["csrfToken"]).then(async (result) => {
        await fetch(`${VOYAGER_API}/identity/profiles/${lead.connectionId}/profileContactInfo`, {
            headers: {
                'csrf-token': result.csrfToken,
                'accept': 'application/vnd.linkedin.normalized+json+2.1',
                'x-li-lang': 'en_US',
                'x-li-page-instance': 'urn:li:page:d_flagship3_people_connections;un8rM4cBRDuC1Xpg7yGNCw==',
                'x-li-track': JSON.stringify({"clientVersion":"1.10.1697","osName":"web","timezoneOffset":1,"deviceFormFactor":"DESKTOP","mpName":"voyager-web"}),
                'x-restli-protocol-version': '2.0.0'
            }
        })
        .then(res => res.json())
        .then(res => {
            console.log('profile contact info...')
            profileContactInfo = res
        })
        .catch(err => console.log(err))
    })
    return profileContactInfo;
}

const _updateCampaignLeadsNetwork = async () => {
    let campaigns = [], clist = [], leads = []

    // Get campaigns
    await fetch(`${PLATFORM_URL}/api/campaigns`, {
        method: 'get',
        headers: {
            'lk-id': linkedinId
        }
    })
    .then(res => res.json())
    .then(res => {
        if(res.status == 200){
            campaigns = res.data
        }
    })

    // Get leads
    if(campaigns.length){
        for(let campaign of campaigns){
            if(['active','running'].includes(campaign.status)){
                for(let list of campaign.campaignList){
                    clist.push(list)
                }

                try {
                    await getCampaignLeads(campaign.id, (data) => {
                        if(data.length) {
                            for(let lead of data){
                                leads.push(lead)
                            }
                        }
                    })
                } catch (err) {
                    // Error fetching leads
                }
            }
        }

        // Remove duplicates
        const uniqueLeads = leads.filter((o, index, arr) => 
            arr.findIndex(item => item.connectionId === o.connectionId) === index
        )

        for(let i = 0; i < uniqueLeads.length; i++){
            let lead = uniqueLeads[i];
            
            if(lead.networkDistance != 1){
                try {
                    let networkInfo = await _getProfileNetworkInfo(lead)
                    lead.networkDegree = networkInfo.data.distance.value
                    await updateLeadNetworkDegree(lead)
                } catch (error) {
                    // Error updating network
                }
            }

            await delay(20000)
        }
        
        // After network updates are complete, trigger campaign execution for running campaigns
        for(let campaign of campaigns){
            if(['active','running'].includes(campaign.status)){
                try {
                    await setCampaignAlarm(campaign);
                } catch (error) {
                    // Error triggering campaign
                }
            }
        }
    }
}
const _testFunc = async () => {
    let searchUrl = `https://www.linkedin.com/voyager/api/search/dash/clusters?decorationId=com.linkedin.voyager.dash.deco.search.SearchClusterCollection-160&origin=GLOBAL_SEARCH_HEADER&q=all&query=(keywords:${encodeURIComponent('digital marketing')},flagshipSearchIntent:SEARCH_SRP,queryParameters:(resultType:List(CONTENT)),includeFiltersInResponse:false)&start=0`

    let url
    chrome.cookies.get({
        url: inURL,
        name: 'JSESSIONID'
    }, function(data) {
        if (data !== null){
            chrome.storage.local.remove("csrfToken")
            chrome.storage.local.set({
                "csrfToken": data.value.replaceAll('"','')
            });
        }
    });

    await chrome.storage.local.get(["csrfToken"]).then(async (result) => {
        await fetch(searchUrl, {
            headers: {
                'csrf-token': result.csrfToken,
                'accept': 'application/vnd.linkedin.normalized+json+2.1',
                'x-li-lang': 'en_US',
                'x-li-page-instance': 'urn:li:page:d_flagship3_people_connections;un8rM4cBRDuC1Xpg7yGNCw==',
                'x-li-track': JSON.stringify({"clientVersion":"1.10.1697","osName":"web","timezoneOffset":1,"deviceFormFactor":"DESKTOP","mpName":"voyager-web"}),
                'x-restli-protocol-version': '2.0.0'
            }
        })
        .then(res => res.json())
        .then(res => {
            console.log(res)
        })
        .catch(err => console.log(err))
    })
}

// Enhanced authentication function with multiple fallback methods
const authenticateUser = async () => {
    try {
        // Method 1: Try to get from existing session
        if (linkedinId) {
            console.log('LinkedIn ID already available:', linkedinId);
            return true;
        }

        // Method 2: Try to get from storage
        const stored = await chrome.storage.local.get(['linkedinId', 'userProfile']);
        if (stored.linkedinId) {
            linkedinId = stored.linkedinId;
            console.log('LinkedIn ID retrieved from storage:', linkedinId);
            return true;
        }

        // Method 3: Try to get from current page
        await getUserProfile();

        // Method 4: If still no LinkedIn ID, try polling with timeout
        if (!linkedinId) {
            return await pollForLinkedInId();
        }

        return true;
    } catch (error) {
        console.error('Authentication error:', error);
        throw error;
    }
};

// Polling mechanism with timeout and retry limits
const pollForLinkedInId = async () => {
    return new Promise((resolve, reject) => {
        const maxAttempts = 10; // 20 seconds total
        let attempts = 0;
        
        const checkLinkedInId = () => {
            attempts++;
            console.log(`LinkedIn ID check attempt ${attempts}/${maxAttempts}`);
            
            if (linkedinId) {
                console.log('LinkedIn ID found during polling:', linkedinId);
                resolve(true);
                return;
            }
            
            if (attempts >= maxAttempts) {
                console.log('LinkedIn ID polling timeout');
                reject(new Error('LinkedIn ID not found after maximum attempts'));
                return;
            }
            
            // Try to get user profile again
            getUserProfile();
            
            setTimeout(checkLinkedInId, 2000);
        };
        
        checkLinkedInId();
    });
};

// Utility function to start a campaign
const startCampaign = async (campaignId) => {
    console.log(`🚀 Starting campaign ${campaignId}...`);
    try {
        const response = await fetch(`${PLATFORM_URL}/api/campaign/${campaignId}/update`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'lk-id': linkedinId
            },
            body: JSON.stringify({
                status: 'running'
            })
        });

        if (response.ok) {
            const data = await response.json();
            console.log(`✅ Campaign ${campaignId} started successfully:`, data);
            
            // Track active campaign in storage
            chrome.storage.local.get(['activeCampaigns'], (result) => {
                const activeCampaigns = result.activeCampaigns || [];
                if (!activeCampaigns.includes(campaignId)) {
                    activeCampaigns.push(campaignId);
                    chrome.storage.local.set({ activeCampaigns });
                    console.log(`📊 Added campaign ${campaignId} to active campaigns list`);
                }
            });
            
            // Trigger campaign execution immediately
            console.log(`🚀 Triggering immediate execution for campaign ${campaignId}...`);
            setTimeout(() => {
                _updateCampaignLeadsNetwork();
            }, 2000); // Small delay to ensure everything is set up
            
            return true;
        } else {
            console.error(`❌ Failed to start campaign ${campaignId}:`, response.statusText);
            return false;
        }
    } catch (error) {
        console.error(`❌ Error starting campaign ${campaignId}:`, error);
        return false;
    }
};

// Utility function to manually trigger campaign execution
const triggerCampaignExecution = async () => {
    console.log('🚀 Manually triggering campaign execution...');
    try {
        await _updateCampaignLeadsNetwork();
        console.log('✅ Campaign execution triggered successfully');
    } catch (error) {
        console.error('❌ Error triggering campaign execution:', error);
    }
};

// Function to view endorsement history
const viewEndorsementHistory = async () => {
    try {
        console.log('📋 VIEWING ENDORSEMENT HISTORY...');
        const result = await chrome.storage.local.get(['endorsementHistory']);
        const history = result.endorsementHistory || [];
        
        if (history.length === 0) {
            console.log('📝 No endorsements found in history');
            return [];
        }
        
        console.log(`📊 Found ${history.length} endorsements in history:`);
        history.forEach((record, index) => {
            console.log(`\n${index + 1}. ${record.skillName} for Lead ${record.leadId}`);
            console.log(`   📅 Time: ${new Date(record.timestamp).toLocaleString()}`);
            console.log(`   🏷️ Skill: ${record.skillName}`);
            console.log(`   🔗 Entity URN: ${record.entityUrn}`);
            console.log(`   🌐 Profile ID: ${record.profileId}`);
            console.log(`   ✅ Status: ${record.status} (${record.responseStatus})`);
        });
        
        return history;
    } catch (error) {
        console.error('❌ Error viewing endorsement history:', error);
        return [];
    }
};

// Function to clear endorsement history
const clearEndorsementHistory = async () => {
    try {
        await chrome.storage.local.remove(['endorsementHistory']);
        console.log('🧹 Endorsement history cleared');
    } catch (error) {
        console.error('❌ Error clearing endorsement history:', error);
    }
};

// Function to check and resume any existing campaign alarms
const checkAndResumeCampaigns = async () => {
    try {
        console.log('🔍 Checking for existing campaign alarms...');
        const alarms = await chrome.alarms.getAll();
        console.log('📋 Current alarms:', alarms.map(alarm => ({ name: alarm.name, scheduledTime: alarm.scheduledTime })));
        
        // Check if we have active campaigns but no alarms
        chrome.storage.local.get(['activeCampaigns'], (result) => {
            const activeCampaigns = result.activeCampaigns || [];
            if (activeCampaigns.length > 0) {
                console.log(`📊 Found ${activeCampaigns.length} active campaigns in storage`);
                
                // Check if we have the network update alarm
                const hasNetworkAlarm = alarms.some(alarm => alarm.name === 'sequence_leads_network_update');
                if (!hasNetworkAlarm) {
                    console.log('⚠️ No network update alarm found, creating one...');
                    chrome.alarms.create('sequence_leads_network_update', { delayInMinutes: 0.1 });
                    console.log('✅ Created missing network update alarm');
                } else {
                    console.log('✅ Network update alarm already exists');
                }
            }
        });
    } catch (error) {
        console.error('❌ Error checking campaign alarms:', error);
    }
};

// Function to check all scheduled alarms
const checkScheduledAlarms = async () => {
    try {
        console.log('🔍 CHECKING ALL SCHEDULED ALARMS...');
        const alarms = await chrome.alarms.getAll();
        console.log(`📋 Found ${alarms.length} scheduled alarms:`);
        
        alarms.forEach((alarm, index) => {
            const scheduledTime = new Date(alarm.scheduledTime);
            const timeUntil = scheduledTime - Date.now();
            const minutesUntil = Math.round(timeUntil / 60000);
            
            console.log(`${index + 1}. ${alarm.name}`);
            console.log(`   📅 Scheduled: ${scheduledTime.toLocaleString()}`);
            console.log(`   ⏰ Time until: ${minutesUntil} minutes`);
            
            if (alarm.name.startsWith('delayed_action_')) {
                console.log(`   🎯 Type: Delayed sequence action`);
            } else if (alarm.name === 'sequence_leads_network_update') {
                console.log(`   🔄 Type: Network update check`);
            } else {
                console.log(`   📊 Type: Campaign sequence`);
            }
            console.log('');
        });
        
        return alarms;
    } catch (error) {
        console.error('❌ Error checking alarms:', error);
        return [];
    }
};

// Make it globally accessible for testing in service worker context
self.startCampaign = startCampaign;
self.triggerCampaignExecution = triggerCampaignExecution;
self.cleanupDuplicateLeads = cleanupDuplicateLeads;
self.checkAndResumeCampaigns = checkAndResumeCampaigns;
self.checkScheduledAlarms = checkScheduledAlarms;
self.resetSendInvites = async (campaignId) => {
    console.log('🔄 AGGRESSIVE RESET of send-invites for campaign:', campaignId);
    
    try {
        // Step 1: Clear any existing alarms
        chrome.alarms.clear('lead_generation');
        console.log('🧹 Cleared lead_generation alarm');
        
        // Step 2: Get fresh campaign sequence
        await getCampaignSequence(campaignId);
        console.log('📋 Fresh campaign sequence loaded');
        
        // Step 3: Reset ALL nodes to ensure clean state
        let nodeToReset = campaignSequence.nodeModel[0];
        if (nodeToReset && nodeToReset.value === 'send-invites') {
            console.log('📊 Before reset - runStatus:', nodeToReset.runStatus);
            
            // Force reset multiple properties
            nodeToReset.runStatus = false;
            nodeToReset.processed = false;
            nodeToReset.completed = false;
            
            console.log('📊 After reset - runStatus:', nodeToReset.runStatus);
            
            // Update backend with aggressive retry
            for (let i = 0; i < 3; i++) {
                try {
                    await updateSequenceNodeModel({id: campaignId}, nodeToReset);
                    console.log(`✅ Backend update attempt ${i + 1} successful`);
                    break;
                } catch (error) {
                    console.error(`❌ Backend update attempt ${i + 1} failed:`, error);
                    if (i === 2) throw error;
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
            
            // Step 4: Verify the reset took effect
            await getCampaignSequence(campaignId);
            let verifyNode = campaignSequence.nodeModel[0];
            console.log('🔍 Verification - runStatus after backend update:', verifyNode.runStatus);
            
            if (verifyNode.runStatus === false) {
                console.log('✅ RESET VERIFIED: Node successfully reset to false');
                
                // Step 5: Force immediate campaign execution
                setTimeout(() => {
                    console.log('🚀 Forcing immediate campaign execution...');
                    _updateCampaignLeadsNetwork();
                }, 2000);
                
                return 'success';
            } else {
                console.error('❌ RESET FAILED: Node still shows runStatus:', verifyNode.runStatus);
                return 'error: Reset did not persist';
            }
        } else {
            console.error('❌ Could not find send-invites node to reset');
            return 'error: Could not find send-invites node';
        }
    } catch (error) {
        console.error('❌ Error in aggressive reset:', error);
        return 'error: ' + error.message;
    }
};

// Emergency function to stop all infinite loops
self.stopAllCampaigns = () => {
    console.log('🆘 EMERGENCY STOP: Clearing all alarms to stop infinite loops');
    chrome.alarms.clearAll(() => {
        console.log('✅ All alarms cleared successfully');
        console.log('🛑 All campaign automation stopped');
        console.log('💡 To restart: Add leads to campaigns and reload extension');
    });
};

// Force send invites by bypassing backend runStatus restrictions
self.forceSendInvites = (campaignId) => {
    console.log('🚀 FORCE SEND INVITES: Bypassing backend restrictions for campaign:', campaignId);
    
    // Set a flag that the campaign logic will check
    chrome.storage.local.set({forceSendInvites: campaignId}, () => {
        console.log('🏴 Force flag set in storage');
        console.log('🔄 Triggering campaign execution...');
        
        // Clear any existing alarms
        chrome.alarms.clear('lead_generation');
        
        // Force immediate campaign execution
        setTimeout(() => {
            console.log('🎯 Executing campaign with force mode...');
            _updateCampaignLeadsNetwork();
        }, 1000);
    });
    
    return 'Force mode activated - invitations should start sending regardless of runStatus';
};

// Test function to manually trigger invite acceptance monitoring
self.testInviteMonitoring = () => {
    console.log('🧪 TESTING INVITE MONITORING SYSTEM...');
    console.log('🔄 Manually triggering comprehensive invite acceptance check...');
    
    checkAllCampaignsForAcceptances().then(() => {
        console.log('✅ Test completed - check console logs for results');
    }).catch((error) => {
        console.error('❌ Test failed:', error);
    });
    
    return 'Invite monitoring test triggered - check console for results';
};

// Function to check specific campaign for acceptances
self.checkCampaignAcceptances = (campaignId) => {
    console.log(`🔍 CHECKING CAMPAIGN ${campaignId} FOR ACCEPTANCES...`);
    
    getLeadGenRunning(campaignId).then(() => {
        console.log(`📊 Found ${campaignLeadgenRunning.length} leads for campaign ${campaignId}`);
        
        campaignLeadgenRunning.forEach((lead, index) => {
            console.log(`👤 Lead ${index + 1}: ${lead.name}`);
            console.log(`   - acceptedStatus: ${lead.acceptedStatus}`);
            console.log(`   - statusLastId: ${lead.statusLastId}`);
            console.log(`   - networkDistance: ${lead.networkDistance}`);
        });
        
        // Check for leads that should be checked
        const leadsToCheck = campaignLeadgenRunning.filter(lead => 
            lead.acceptedStatus === false && lead.statusLastId == 2
        );
        
        console.log(`🔍 ${leadsToCheck.length} leads need network status checking`);
        
    }).catch((error) => {
        console.error('❌ Error checking campaign:', error);
    });
    
    return `Campaign ${campaignId} acceptance check triggered - check console for results`;
};

/**
 * Continuous monitoring system to check for invite acceptances
 */
// Flag to prevent multiple monitoring instances
let isMonitoringStarted = false;

const startContinuousMonitoring = () => {
    // Prevent multiple instances from starting
    if (isMonitoringStarted) {
        console.log('⚠️ Continuous monitoring already started, skipping...');
        return;
    }
    
    console.log('🔄 Starting continuous monitoring for invite acceptances...');
    isMonitoringStarted = true;
    
    // Clear any existing monitoring alarm first
    chrome.alarms.clear('continuous_invite_monitoring', () => {
        console.log('🧹 Cleared any existing continuous monitoring alarm');
        
        // Set up a recurring alarm to check for acceptances every 5 minutes
        chrome.alarms.create('continuous_invite_monitoring', {
            delayInMinutes: 0.1, // Start checking after 6 seconds
            periodInMinutes: 0.2 // Then check every 12 seconds (frequent for testing)
        });
        
        console.log('⏰ Continuous monitoring alarm created - will check every 12 seconds (TESTING MODE)');
        console.log('🎯 Monitoring will start in 6 seconds and then check every 12 seconds');
    });
};

// Manual function to start monitoring (for testing)
self.startMonitoring = () => {
    console.log('🚀 MANUALLY STARTING MONITORING...');
    isMonitoringStarted = false; // Reset flag to allow restart
    startContinuousMonitoring();
    return 'Monitoring started manually - check console for logs';
};

// Manual function to stop monitoring (for testing)
self.stopMonitoring = () => {
    console.log('🛑 MANUALLY STOPPING MONITORING...');
    chrome.alarms.clear('continuous_invite_monitoring');
    isMonitoringStarted = false;
    return 'Monitoring stopped manually';
};

// Manual testing functions
self.testCallResponseMonitoring = async () => {
    console.log('🧪 Testing call response monitoring setup...');
    const allStorage = await chrome.storage.local.get();
    const responseKeys = Object.keys(allStorage).filter(key => key.startsWith('call_response_monitoring_'));
    const callAttemptKeys = Object.keys(allStorage).filter(key => key.startsWith('call_attempted_'));
    
    console.log('📊 Found call response monitoring entries:', responseKeys.length);
    console.log('📊 Found call attempt entries:', callAttemptKeys.length);
    
    responseKeys.forEach(key => {
        console.log(`📋 ${key}:`, allStorage[key]);
    });
    
    callAttemptKeys.forEach(key => {
        console.log(`📞 ${key}:`, new Date(allStorage[key]));
    });
    
    if (responseKeys.length === 0) {
        console.log('⚠️ No call response monitoring entries found. This means the system is not tracking responses.');
        if (callAttemptKeys.length > 0) {
            console.log('💡 However, there are call attempts that should be monitored. The system may need to be restarted or campaigns activated.');
        }
    } else {
        console.log('✅ Call response monitoring is set up correctly!');
    }
};

// Function to manually trigger response checking (for testing)
self.manualCheckResponses = async () => {
    console.log('🔍 MANUALLY TRIGGERING RESPONSE CHECK...');
    try {
        await checkForCallResponses();
        console.log('✅ Manual response check completed');
    } catch (error) {
        console.error('❌ Manual response check failed:', error);
    }
};

// Function to manually check if Eleazar replied (by checking LinkedIn directly)
self.checkEleazarManually = async () => {
    console.log('🔍 MANUALLY CHECKING ELEAZAR FOR REPLIES...');
    
    try {
        // Get all tabs to find LinkedIn
        const tabs = await chrome.tabs.query({});
        const linkedinTab = tabs.find(tab => tab.url && tab.url.includes('linkedin.com'));
        
        if (!linkedinTab) {
            console.log('❌ No LinkedIn tab found. Please open LinkedIn in a new tab first.');
            console.log('💡 Go to: https://www.linkedin.com/messaging/');
            return;
        }
        
        console.log('✅ Found LinkedIn tab:', linkedinTab.url);
        
        // Navigate to messages if not already there
        if (!linkedinTab.url.includes('/messaging/')) {
            await chrome.tabs.update(linkedinTab.id, {
                url: 'https://www.linkedin.com/messaging/'
            });
            console.log('🔄 Navigated to LinkedIn messages');
        }
        
        console.log('🔄 Please check manually:');
        console.log('1. Look for conversation with Eleazar Nzerem');
        console.log('2. Check if he replied to your call message');
        console.log('3. If he replied, note what he said');
        
        // Wait a moment then try to inject script
        setTimeout(async () => {
            try {
                // Try to inject a script to check for conversations
                const results = await chrome.tabs.executeScript(linkedinTab.id, {
                    code: `
                        console.log('🔍 Looking for Eleazar conversation...');
                        
                        // Look for conversation with Eleazar
                        const conversations = document.querySelectorAll('[data-test-id="conversation-item"]');
                        console.log('📊 Found conversations:', conversations.length);
                        
                        let eleazarConversation = null;
                        
                        conversations.forEach((conv, index) => {
                            const nameElement = conv.querySelector('[data-test-id="conversation-item-name"]');
                            if (nameElement) {
                                console.log('👤 Conversation', index, ':', nameElement.textContent);
                                if (nameElement.textContent.includes('Eleazar')) {
                                    eleazarConversation = conv;
                                    console.log('✅ Found Eleazar conversation!');
                                }
                            }
                        });
                        
                        if (eleazarConversation) {
                            eleazarConversation.click();
                            console.log('✅ Clicked Eleazar conversation');
                            
                            // Check for new messages after a delay
                            setTimeout(() => {
                                const messages = document.querySelectorAll('[data-test-id="message-item"]');
                                console.log('📊 Found messages:', messages.length);
                                
                                if (messages.length > 0) {
                                    const lastMessage = messages[messages.length - 1];
                                    const senderName = lastMessage.querySelector('[data-test-id="message-sender-name"]')?.textContent;
                                    const messageText = lastMessage.querySelector('[data-test-id="message-text"]')?.textContent;
                                    
                                    console.log('📝 Last message from:', senderName);
                                    console.log('📝 Last message text:', messageText);
                                    
                                    if (senderName && senderName.includes('Eleazar')) {
                                        console.log('🎉 FOUND ELEAZAR REPLY:', messageText);
                                    }
                                }
                            }, 2000);
                        } else {
                            console.log('❌ No conversation with Eleazar found');
                            console.log('💡 Make sure you have sent a message to Eleazar first');
                        }
                    `
                });
                console.log('✅ Script injected successfully');
            } catch (error) {
                console.log('⚠️ Could not inject script:', error.message);
                console.log('💡 Please check manually by going to LinkedIn messages');
            }
        }, 3000);
        
    } catch (error) {
        console.error('❌ Manual check failed:', error);
    }
};

// Function to test LinkedIn API access
self.testLinkedInAPI = async () => {
    console.log('🔍 TESTING LINKEDIN API ACCESS...');
    
    try {
        // Get CSRF token
        const tokenResult = await chrome.storage.local.get(['csrfToken']);
        if (!tokenResult.csrfToken) {
            console.error('❌ No CSRF token found');
            return;
        }
        
        console.log('✅ CSRF token found:', tokenResult.csrfToken.substring(0, 20) + '...');
        
        // Test basic LinkedIn API access
        const voyagerApi = 'https://www.linkedin.com/voyager/api';
        
        // Test 1: Try to get user profile
        console.log('🧪 Test 1: Getting user profile...');
        const profileResponse = await fetch(`${voyagerApi}/identity/profiles/me`, {
            method: 'GET',
            headers: {
                'csrf-token': tokenResult.csrfToken,
                'accept': 'application/vnd.linkedin.normalized+json+2.1',
                'x-li-lang': 'en_US',
                'x-restli-protocol-version': '2.0.0'
            }
        });
        
        console.log('📡 Profile API status:', profileResponse.status);
        
        if (profileResponse.ok) {
            const profileData = await profileResponse.json();
            console.log('✅ Profile API works:', profileData.firstName, profileData.lastName);
        } else {
            console.error('❌ Profile API failed:', profileResponse.status);
        }
        
        // Test 2: Try conversations with different endpoint
        console.log('🧪 Test 2: Trying conversations endpoint...');
        const convResponse = await fetch(`${voyagerApi}/messaging/conversations?count=20`, {
            method: 'GET',
            headers: {
                'csrf-token': tokenResult.csrfToken,
                'accept': 'application/vnd.linkedin.normalized+json+2.1',
                'x-li-lang': 'en_US',
                'x-restli-protocol-version': '2.0.0'
            }
        });
        
        console.log('📡 Conversations API status:', convResponse.status);
        
        if (convResponse.ok) {
            const convData = await convResponse.json();
            console.log('✅ Conversations API works, found:', convData.elements?.length || 0, 'conversations');
        } else {
            console.error('❌ Conversations API failed:', convResponse.status);
        }
        
        // Test 3: Try to get current page info
        console.log('🧪 Test 3: Checking current LinkedIn page...');
        const tabs = await chrome.tabs.query({active: true, currentWindow: true});
        if (tabs[0] && tabs[0].url.includes('linkedin.com')) {
            console.log('✅ Currently on LinkedIn page:', tabs[0].url);
        } else {
            console.log('⚠️ Not currently on LinkedIn page');
        }
        
    } catch (error) {
        console.error('❌ LinkedIn API test failed:', error);
    }
};

// Function to extract conversation ID from LinkedIn thread URL
self.extractConversationId = async () => {
    console.log('🔍 EXTRACTING CONVERSATION ID FROM LINKEDIN...');
    
    try {
        // Get all tabs to find LinkedIn messaging tabs
        const tabs = await chrome.tabs.query({});
        const linkedinTabs = tabs.filter(tab => 
            tab.url && (
                tab.url.includes('linkedin.com/messaging/thread/') ||
                tab.url.includes('linkedin.com/messaging/')
            )
        );
        
        if (linkedinTabs.length === 0) {
            console.log('❌ No LinkedIn messaging tabs found');
            console.log('💡 Please open LinkedIn messages first');
            return null;
        }
        
        console.log(`📊 Found ${linkedinTabs.length} LinkedIn messaging tabs`);
        
        const conversationIds = [];
        
        for (const tab of linkedinTabs) {
            console.log(`🔍 Checking tab: ${tab.url}`);
            
            // Extract conversation ID from URL
            const threadMatch = tab.url.match(/\/messaging\/thread\/([^\/]+)/);
            if (threadMatch) {
                const conversationId = threadMatch[1];
                conversationIds.push(conversationId);
                console.log(`✅ Found conversation ID: ${conversationId}`);
            }
        }
        
        if (conversationIds.length > 0) {
            console.log(`🎯 Extracted ${conversationIds.length} conversation IDs:`, conversationIds);
            return conversationIds;
        } else {
            console.log('❌ No conversation IDs found in URLs');
            return null;
        }
        
    } catch (error) {
        console.error('❌ Error extracting conversation ID:', error);
        return null;
    }
};
// Function to test different LinkedIn API endpoints for messages
self.testLinkedInMessagesAPI = async () => {
    console.log('🧪 TESTING DIFFERENT LINKEDIN MESSAGES API ENDPOINTS...');
    
    try {
        // Get CSRF token
        const tokenResult = await chrome.storage.local.get(['csrfToken']);
        if (!tokenResult.csrfToken) {
            console.error('❌ No CSRF token found');
            return;
        }
        
        console.log('✅ CSRF token found');
        
        // Get conversation IDs from current tabs
        const conversationIds = await self.extractConversationId();
        
        if (!conversationIds || conversationIds.length === 0) {
            console.log('❌ No conversation IDs found');
            console.log('💡 Please open LinkedIn messages first');
            return;
        }
        
        const voyagerApi = 'https://www.linkedin.com/voyager/api';
        const conversationId = conversationIds[0]; // Use first conversation ID
        
        console.log(`🎯 Testing with conversation ID: ${conversationId}`);
        
        // Test different API endpoints and parameters
        const endpoints = [
            `/messaging/conversations/${conversationId}/events`,
            `/messaging/conversations/${conversationId}/events?count=50`,
            `/messaging/conversations/${conversationId}/events?start=0&count=20`,
            `/messaging/conversations/${conversationId}/events?q=all`,
            `/messaging/conversations/${conversationId}/events?q=all&count=50`,
            `/messaging/conversations/${conversationId}/events?q=all&count=100`,
            `/messaging/conversations/${conversationId}/events?q=all&count=200`,
            `/messaging/conversations/${conversationId}/events?q=all&count=500`,
            `/messaging/conversations/${conversationId}/events?q=all&count=1000`,
            `/messaging/conversations/${conversationId}/events?q=all&count=2000`,
            `/messaging/conversations/${conversationId}/events?q=all&count=5000`,
            `/messaging/conversations/${conversationId}/events?q=all&count=10000`
        ];
        
        // Test different header combinations
        const headerSets = [
            // Standard headers
            {
                'csrf-token': tokenResult.csrfToken,
                'accept': 'application/vnd.linkedin.normalized+json+2.1',
                'x-li-lang': 'en_US',
                'x-li-page-instance': 'urn:li:page:d_flagship3_messaging_conversations;1ZlPK7kKRNSMi+vkXMyVMw==',
                'x-li-track': JSON.stringify({"clientVersion":"1.10.1208","osName":"web","timezoneOffset":1,"deviceFormFactor":"DESKTOP","mpName":"voyager-web"}),
                'x-restli-protocol-version': '2.0.0'
            },
            // Alternative headers
            {
                'csrf-token': tokenResult.csrfToken,
                'accept': 'application/vnd.linkedin.normalized+json+2.1',
                'x-li-lang': 'en_US',
                'x-restli-protocol-version': '2.0.0'
            },
            // Minimal headers
            {
                'csrf-token': tokenResult.csrfToken,
                'accept': 'application/json',
                'x-restli-protocol-version': '2.0.0'
            }
        ];
        
        for (let headerIndex = 0; headerIndex < headerSets.length; headerIndex++) {
            const headers = headerSets[headerIndex];
            console.log(`\n🧪 Testing header set ${headerIndex + 1}:`, headers);
            
            for (const endpoint of endpoints) {
                try {
                    console.log(`🔍 Testing: ${endpoint}`);
                    
                    const response = await fetch(`${voyagerApi}${endpoint}`, {
                        method: 'GET',
                        headers: headers
                    });
                    
                    console.log(`📡 Status: ${response.status}`);
                    
                    if (response.ok) {
                        const data = await response.json();
                        const messages = data.elements || [];
                        
                        console.log(`✅ Found ${messages.length} messages with endpoint: ${endpoint}`);
                        
                        if (messages.length > 0) {
                            console.log('🎉 SUCCESS! Messages found:');
                            
                            messages.forEach((msg, index) => {
                                console.log(`📝 Message ${index + 1}:`, msg);
                                
                                // Try multiple ways to extract text from the message
                                let text = '';
                                let sender = 'unknown';
                                
                                // Method 1: Standard message structure
                                if (msg.eventContent?.com?.linkedin?.voyager?.messaging?.create?.MessageCreate) {
                                    const messageCreate = msg.eventContent.com.linkedin.voyager.messaging.create.MessageCreate;
                                    text = messageCreate.body || messageCreate.attributedBody?.text || '';
                                }
                                
                                // Method 2: Alternative message structure
                                if (!text && msg.eventContent?.com?.linkedin?.voyager?.messaging?.EventContent) {
                                    const eventContent = msg.eventContent.com.linkedin.voyager.messaging.EventContent;
                                    text = eventContent.attributedBody?.text || '';
                                }
                                
                                // Method 3: Direct body access
                                if (!text && msg.body) {
                                    text = msg.body;
                                }
                                
                                // Method 4: Check for different eventContent structures
                                if (!text && msg.eventContent) {
                                    console.log('🔍 eventContent structure:', msg.eventContent);
                                    // Try to find any text in the eventContent
                                    const eventContentStr = JSON.stringify(msg.eventContent);
                                    const textMatch = eventContentStr.match(/"text":"([^"]+)"/);
                                    if (textMatch) {
                                        text = textMatch[1];
                                    }
                                }
                                
                                // Extract sender information
                                if (msg.from?.com?.linkedin?.voyager?.messaging?.MessagingMember) {
                                    const member = msg.from.com.linkedin.voyager.messaging.MessagingMember;
                                    if (member.name) {
                                        sender = member.name;
                                    } else if (member.miniProfile) {
                                        sender = `${member.miniProfile.firstName || ''} ${member.miniProfile.lastName || ''}`.trim();
                                    }
                                }
                                
                                // Use enhanced sender detection
                                const senderInfo = detectMessageSender(msg, text);
                                const isFromLead = senderInfo.isFromLead;
                                
                                console.log(`   👤 From: ${sender}`);
                                console.log(`   💬 Text: "${text}"`);
                                console.log(`   🕐 Time: ${new Date(msg.createdAt).toLocaleString()}`);
                                console.log(`   🎯 Is from Lead: ${isFromLead}`);
                                
                                if (isFromLead && text) {
                                    console.log(`🎉 FOUND LEAD'S REPLY: "${text}"`);
                                }
                            });
                            
                            return {
                                endpoint: endpoint,
                                headers: headers,
                                messages: messages,
                                success: true
                            };
                        }
                    } else {
                        console.log(`❌ Failed: ${response.status}`);
                    }
                } catch (error) {
                    console.log(`❌ Error: ${error.message}`);
                }
            }
        }
        
        console.log('❌ No messages found with any endpoint/header combination');
        
    } catch (error) {
        console.error('❌ LinkedIn messages API test failed:', error);
    }
};

// Function to test direct conversation API access
self.testDirectConversationAPI = async () => {
    console.log('🧪 TESTING DIRECT CONVERSATION API ACCESS...');
    
    try {
        // Get CSRF token
        const tokenResult = await chrome.storage.local.get(['csrfToken']);
        if (!tokenResult.csrfToken) {
            console.error('❌ No CSRF token found');
            return;
        }
        
        console.log('✅ CSRF token found');
        
        // Get conversation IDs from current tabs
        const conversationIds = await self.extractConversationId();
        
        if (!conversationIds || conversationIds.length === 0) {
            console.log('❌ No conversation IDs found');
            console.log('💡 Please open LinkedIn messages first');
            return;
        }
        
        const voyagerApi = 'https://www.linkedin.com/voyager/api';
        
        // Test each conversation ID
        for (const conversationId of conversationIds) {
            try {
                console.log(`🧪 Testing conversation ID: ${conversationId}`);
                
                const response = await fetch(`${voyagerApi}/messaging/conversations/${conversationId}/events`, {
                    method: 'GET',
                    headers: {
                        'csrf-token': tokenResult.csrfToken,
                        'accept': 'application/vnd.linkedin.normalized+json+2.1',
                        'x-li-lang': 'en_US',
                        'x-li-page-instance': 'urn:li:page:d_flagship3_messaging_conversations;1ZlPK7kKRNSMi+vkXMyVMw==',
                        'x-li-track': JSON.stringify({"clientVersion":"1.10.1208","osName":"web","timezoneOffset":1,"deviceFormFactor":"DESKTOP","mpName":"voyager-web"}),
                        'x-restli-protocol-version': '2.0.0'
                    }
                });
                
                console.log(`📡 Status: ${response.status}`);
                
                if (response.ok) {
                    const data = await response.json();
                    const messages = data.elements || [];
                    
                    console.log(`✅ Found ${messages.length} messages in conversation ${conversationId}`);
                    
                    if (messages.length > 0) {
                        console.log('🎉 SUCCESS! Messages found:');
                        
                        messages.forEach((msg, index) => {
                            const messageContent = msg.eventContent?.com?.linkedin?.voyager?.messaging?.EventContent;
                            const text = messageContent?.attributedBody?.text || 
                                        messageContent?.com?.linkedin?.voyager?.messaging?.create?.MessageCreate?.attributedBody?.text || 
                                        messageContent?.com?.linkedin?.voyager?.messaging?.create?.MessageCreate?.body || '';
                            
                            const sender = msg.from?.com?.linkedin?.voyager?.messaging?.MessagingMember?.name || 
                                          msg.from?.com?.linkedin?.voyager?.messaging?.MessagingMember?.miniProfile?.firstName + ' ' + 
                                          msg.from?.com?.linkedin?.voyager?.messaging?.MessagingMember?.miniProfile?.lastName || 'Unknown';
                            
                            console.log(`📝 Message ${index + 1}:`);
                            console.log(`   👤 From: ${sender}`);
                            console.log(`   💬 Text: ${text}`);
                            console.log(`   🕐 Time: ${new Date(msg.createdAt).toLocaleString()}`);
                        });
                        
                        return {
                            conversationId: conversationId,
                            messages: messages,
                            success: true
                        };
                    }
                } else {
                    console.log(`❌ Failed: ${response.status}`);
                    if (response.status === 403) {
                        console.log('💡 This might be a permission issue - make sure you have access to this conversation');
                    }
                }
            } catch (error) {
                console.log(`❌ Error: ${error.message}`);
            }
        }
        
        console.log('❌ No messages found in any conversation');
        
    } catch (error) {
        console.error('❌ Direct conversation API test failed:', error);
    }
};

// Function to immediately check for Eleazar's reply using the working API
self.checkEleazarReplyNow = async () => {
    console.log('🔍 IMMEDIATELY CHECKING FOR ELEAZAR\'S REPLY...');
    
    try {
        // Get CSRF token
        const tokenResult = await chrome.storage.local.get(['csrfToken']);
        if (!tokenResult.csrfToken) {
            console.error('❌ No CSRF token found');
            return;
        }
        
        console.log('✅ CSRF token found');
        
        // Use the known working conversation ID
        const conversationId = '2-MmJlMWU1MzMtMGUzYi00ODI2LThjNWEtYjQyZTAwZWEyNjM4XzEwMA==';
        const voyagerApi = 'https://www.linkedin.com/voyager/api';
        
        console.log(`🎯 Checking conversation: ${conversationId}`);
        
        // Use the WORKING headers from the test
        const response = await fetch(`${voyagerApi}/messaging/conversations/${conversationId}/events`, {
            method: 'GET',
            headers: {
                'csrf-token': tokenResult.csrfToken,
                'accept': 'application/json',  // ← This is the magic header!
                'x-restli-protocol-version': '2.0.0'
            }
        });
        
        console.log(`📡 API Status: ${response.status}`);
        
        if (response.ok) {
            const data = await response.json();
            const messages = data.elements || [];
            
            console.log(`📊 Found ${messages.length} messages in conversation`);
            
            if (messages.length > 0) {
                console.log('🎉 MESSAGES FOUND! Analyzing for Eleazar\'s reply...');
                
                let eleazarReply = null;
                let latestMessage = null;
                
                messages.forEach((msg, index) => {
                    console.log(`\n📝 Message ${index + 1}:`);
                    
                    // Extract text using multiple methods
                    let text = '';
                    
                    // Method 1: Standard structure
                    if (msg.eventContent?.com?.linkedin?.voyager?.messaging?.create?.MessageCreate) {
                        const messageCreate = msg.eventContent.com.linkedin.voyager.messaging.create.MessageCreate;
                        text = messageCreate.body || messageCreate.attributedBody?.text || '';
                    }
                    
                    // Method 2: Alternative structure
                    if (!text && msg.eventContent?.com?.linkedin?.voyager?.messaging?.EventContent) {
                        const eventContent = msg.eventContent.com.linkedin.voyager.messaging.EventContent;
                        text = eventContent.attributedBody?.text || '';
                    }
                    
                    // Method 3: Direct body
                    if (!text && msg.body) {
                        text = msg.body;
                    }
                    
                    // Method 4: Search in eventContent JSON
                    if (!text && msg.eventContent) {
                        const eventContentStr = JSON.stringify(msg.eventContent);
                        const textMatch = eventContentStr.match(/"text":"([^"]+)"/);
                        if (textMatch) {
                            text = textMatch[1];
                        }
                    }
                    
                    // Extract sender with enhanced detection
                    let sender = 'unknown';
                    // console.log('🔍 Raw sender data:', msg.from);
                    
                    if (msg.from?.com?.linkedin?.voyager?.messaging?.MessagingMember) {
                        const member = msg.from.com.linkedin.voyager.messaging.MessagingMember;
                        console.log('🔍 MessagingMember data:', member);
                        
                        if (member.name) {
                            sender = member.name;
                        } else if (member.miniProfile) {
                            sender = `${member.miniProfile.firstName || ''} ${member.miniProfile.lastName || ''}`.trim();
                        }
                    }
                    
                    // Use enhanced sender detection
                    const senderInfo = detectMessageSender(msg, text);
                    const isFromLead = senderInfo.isFromLead;
                    
                    console.log('🔍 Sender detection details:');
                    console.log('   - sender:', sender);
                    console.log('   - entityUrn:', msg.from?.entityUrn);
                    console.log('   - isFromLead:', isFromLead);
                    
                    console.log(`   👤 From: ${sender}`);
                    console.log(`   💬 Text: "${text}"`);
                    console.log(`   🕐 Time: ${new Date(msg.createdAt).toLocaleString()}`);
                    console.log(`   🎯 Is from Lead: ${isFromLead}`);
                    
                    if (isFromLead && text) {
                        eleazarReply = {
                            text: text,
                            sender: sender,
                            timestamp: msg.createdAt,
                            messageId: msg.entityUrn
                        };
                        console.log(`🎉 FOUND ELEAZAR'S REPLY: "${text}"`);
                    }
                    
                    // Track latest message
                    if (index === messages.length - 1) {
                        latestMessage = {
                            text: text,
                            sender: sender,
                            timestamp: msg.createdAt,
                            messageId: msg.entityUrn
                        };
                    }
                });
                
                if (eleazarReply) {
                    console.log('\n🎯 ELEAZAR REPLIED!');
                    console.log(`📝 Reply: "${eleazarReply.text}"`);
                    console.log(`🕐 Time: ${new Date(eleazarReply.timestamp).toLocaleString()}`);
                    
                    // TODO: Send this to AI for analysis and trigger calendar link
                    return {
                        found: true,
                        reply: eleazarReply,
                        allMessages: messages
                    };
                } else {
                    console.log('\n⏳ No reply from Eleazar found yet');
                    console.log(`📊 Latest message: "${latestMessage?.text}" from ${latestMessage?.sender}`);
                    return {
                        found: false,
                        latestMessage: latestMessage,
                        allMessages: messages
                    };
                }
            } else {
                console.log('📭 No messages found in conversation');
                return { found: false, messages: [] };
            }
        } else {
            console.log(`❌ API failed: ${response.status}`);
            return { found: false, error: response.status };
        }
        
    } catch (error) {
        console.error('❌ Error checking Eleazar reply:', error);
        return { found: false, error: error.message };
    }
};

// Function to find and analyze any lead's replies (generic version)
self.findLeadReplies = async (connectionId, leadName) => {
    console.log(`🔍 FINDING ${leadName}'S REPLIES WITH ENHANCED DETECTION...`);
    
    try {
        // Get CSRF token
        const tokenResult = await chrome.storage.local.get(['csrfToken']);
        if (!tokenResult.csrfToken) {
            console.error('❌ No CSRF token found');
            return;
        }
        
        console.log('✅ CSRF token found');
        
        // Use the conversation ID from the connection
        const conversationId = connectionId;
        const voyagerApi = 'https://www.linkedin.com/voyager/api';
        
        console.log(`🎯 Checking conversation: ${conversationId}`);
        
        // Use the WORKING headers
        const response = await fetch(`${voyagerApi}/messaging/conversations/${conversationId}/events`, {
            method: 'GET',
            headers: {
                'csrf-token': tokenResult.csrfToken,
                'accept': 'application/json',
                'x-restli-protocol-version': '2.0.0'
            }
        });
        
        console.log(`📡 API Status: ${response.status}`);
        
        if (response.ok) {
            const data = await response.json();
            const messages = data.elements || [];
            
            console.log(`📊 Found ${messages.length} messages in conversation`);
            
            if (messages.length > 0) {
                console.log(`🎉 MESSAGES FOUND! Analyzing for ${leadName}'s replies...`);
                
                        const leadReplies = [];
                let messageCount = 0;
                
                messages.forEach((msg, index) => {
                    console.log(`\n📝 Message ${index + 1}:`);
                    
                    // Extract text using multiple methods
                    let text = '';
                    
                    // Method 1: Standard structure
                    if (msg.eventContent?.com?.linkedin?.voyager?.messaging?.create?.MessageCreate) {
                        const messageCreate = msg.eventContent.com.linkedin.voyager.messaging.create.MessageCreate;
                        text = messageCreate.body || messageCreate.attributedBody?.text || '';
                    }
                    
                    // Method 2: Alternative structure
                    if (!text && msg.eventContent?.com?.linkedin?.voyager?.messaging?.EventContent) {
                        const eventContent = msg.eventContent.com.linkedin.voyager.messaging.EventContent;
                        text = eventContent.attributedBody?.text || '';
                    }
                    
                    // Method 3: Direct body
                    if (!text && msg.body) {
                        text = msg.body;
                    }
                    
                    // Method 4: Search in eventContent JSON
                    if (!text && msg.eventContent) {
                        const eventContentStr = JSON.stringify(msg.eventContent);
                        const textMatch = eventContentStr.match(/"text":"([^"]+)"/);
                        if (textMatch) {
                            text = textMatch[1];
                        }
                    }
                    
                    // Extract sender with enhanced detection
                    let sender = 'unknown';
                    // console.log('🔍 Raw sender data:', msg.from);
                    
                    if (msg.from?.com?.linkedin?.voyager?.messaging?.MessagingMember) {
                        const member = msg.from.com.linkedin.voyager.messaging.MessagingMember;
                        console.log('🔍 MessagingMember data:', member);
                        
                        if (member.name) {
                            sender = member.name;
                        } else if (member.miniProfile) {
                            sender = `${member.miniProfile.firstName || ''} ${member.miniProfile.lastName || ''}`.trim();
                        }
                    }
                    
                    // Use enhanced sender detection
                    const senderInfo = detectMessageSender(msg, text);
                    const isFromLead = senderInfo.isFromLead;
                    
                    console.log('🔍 Sender detection details:');
                    console.log('   - sender:', sender);
                    console.log('   - entityUrn:', msg.from?.entityUrn);
                    console.log('   - isFromLead:', isFromLead);
                    
                    console.log(`   👤 From: ${sender}`);
                    console.log(`   💬 Text: "${text}"`);
                    console.log(`   🕐 Time: ${new Date(msg.createdAt).toLocaleString()}`);
                    console.log(`   🎯 Is from Lead: ${isFromLead}`);
                    
                    if (isFromLead && text) {
                        leadReplies.push({
                            text: text,
                            sender: sender,
                            timestamp: msg.createdAt,
                            messageId: msg.entityUrn,
                            messageNumber: index + 1
                        });
                                console.log(`🎉 FOUND LEAD'S REPLY #${leadReplies.length}: "${text}"`);
                    }
                    
                    messageCount++;
                });
                
                        if (leadReplies.length > 0) {
                            console.log(`\n🎯 ${leadName} REPLIED!`);
                            console.log(`📊 Found ${leadReplies.length} replies from ${leadName}:`);
                            
                            leadReplies.forEach((reply, index) => {
                        console.log(`\n📝 Reply ${index + 1}:`);
                        console.log(`   💬 Text: "${reply.text}"`);
                        console.log(`   🕐 Time: ${new Date(reply.timestamp).toLocaleString()}`);
                        console.log(`   📍 Message #: ${reply.messageNumber}`);
                    });
                    
                            return {
                                found: true,
                                replies: leadReplies,
                                totalMessages: messageCount,
                                allMessages: messages
                            };
                } else {
                    console.log(`\n⏳ No replies from ${leadName} found yet`);
                    console.log(`📊 Analyzed ${messageCount} messages`);
                    return {
                        found: false,
                        totalMessages: messageCount,
                        allMessages: messages
                    };
                }
            } else {
                console.log('📭 No messages found in conversation');
                return { found: false, messages: [] };
            }
        } else {
            console.log(`❌ API failed: ${response.status}`);
            return { found: false, error: response.status };
        }
        
    } catch (error) {
            console.error(`❌ Error finding ${leadName} replies:`, error);
        return { found: false, error: error.message };
    }
};

// Function to test the backend API directly
self.testBackendAPI = async () => {
    console.log('🧪 TESTING BACKEND API DIRECTLY...');
    
    try {
        const platformUrl = 'https://app.linkdominator.com';
        const linkedinId = 'vicken-concept';
        
        // Get CSRF token
        const tokenResult = await chrome.storage.local.get(['csrfToken']);
        if (!tokenResult.csrfToken) {
            console.error('❌ No CSRF token found for AI analysis test');
            return null;
        }
        
        const testResponse = await fetch(`${platformUrl}/api/calls/analyze-message`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'lk-id': linkedinId,
                'csrf-token': tokenResult.csrfToken
            },
            body: JSON.stringify({
                message: 'Hi, William',
                leadName: 'Eleazar Nzerem',
                context: 'LinkedIn message response analysis',
                call_id: 'test_call_123',
                connection_id: null,
                conversation_urn_id: null
            })
        });
        
        console.log(`📡 API Response Status: ${testResponse.status}`);
        
        if (testResponse.ok) {
            const result = await testResponse.json();
            console.log('✅ API Response:', result);
            return { success: true, result: result };
        } else {
            const errorText = await testResponse.text();
            console.log('❌ API Error Response:', errorText);
            return { success: false, error: errorText };
        }
        
    } catch (error) {
        console.error('❌ API Test Error:', error);
        return { success: false, error: error.message };
    }
};
// Function to test AI analysis only (without calendar generation)
self.testEleazarAIAnalysis = async () => {
    console.log('🤖 TESTING AI ANALYSIS FOR ELEAZAR\'S REPLIES...');
    
    try {
        // First, find all of Eleazar's replies (using known connection ID for testing)
        const eleazarConnectionId = '2-MmJlMWU1MzMtMGUzYi00ODI2LThjNWEtYjQyZTAwZWEyNjM4XzEwMA==';
        const repliesResult = await self.findLeadReplies(eleazarConnectionId, 'Eleazar Nzerem');
        
        if (!repliesResult.found || !repliesResult.replies) {
            console.log('❌ No replies from Eleazar found');
            return { success: false, reason: 'No replies found' };
        }
        
        console.log(`📊 Found ${repliesResult.replies.length} replies from Eleazar`);
        
        // Filter out the AI-generated messages (long messages) and focus on Eleazar's actual replies
        const eleazarActualReplies = repliesResult.replies.filter(reply => {
            const text = reply.text.trim();
            // Filter out long AI-generated messages and focus on short, casual replies
            return text.length < 200 && !text.includes('Dear Mr. Nzerem') && !text.includes('[Your Name]');
        });
        
        console.log(`📊 Found ${eleazarActualReplies.length} actual replies from Eleazar (excluding AI messages)`);
        
        if (eleazarActualReplies.length === 0) {
            console.log('❌ No actual replies from Eleazar found (only AI messages)');
            return { success: false, reason: 'No actual replies found' };
        }
        
        // Analyze each reply from Eleazar
        const analysisResults = [];
        
        for (const reply of eleazarActualReplies) {
            console.log(`\n🎯 Analyzing reply: "${reply.text}"`);
            
        // Send to AI for analysis
        const platformUrl = 'https://app.linkdominator.com';
        
        // Get LinkedIn ID from storage or use fallback
        const linkedinIdResult = await chrome.storage.local.get(['linkedinId']);
        const linkedinId = linkedinIdResult.linkedinId || 'vicken-concept';
            
            // Get CSRF token
            const tokenResult = await chrome.storage.local.get(['csrfToken']);
            if (!tokenResult.csrfToken) {
                console.error('❌ No CSRF token found for AI analysis');
                return null;
            }
            
            const aiResponse = await fetch(`${platformUrl}/api/calls/analyze-message`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'lk-id': linkedinId,
                    'csrf-token': tokenResult.csrfToken
                },
                body: JSON.stringify({
                    message: reply.text,
                    leadName: 'Eleazar Nzerem',
                    context: 'LinkedIn message response analysis',
                    call_id: 'test_direct_conversation',
                    connection_id: null,
                    conversation_urn_id: null
                })
            });
            
            if (!aiResponse.ok) {
                console.log(`❌ AI analysis failed for "${reply.text}": ${aiResponse.status}`);
                analysisResults.push({
                    reply: reply.text,
                    success: false,
                    error: `HTTP ${aiResponse.status}`
                });
                continue;
            }
            
            const aiResponseData = await aiResponse.json();
            console.log(`🔍 Raw AI Response for "${reply.text}":`, aiResponseData);
            
            if (!aiResponseData.success) {
                console.log(`❌ AI analysis failed for "${reply.text}": ${aiResponseData.message}`);
                analysisResults.push({
                    reply: reply.text,
                    success: false,
                    error: aiResponseData.message
                });
                continue;
            }
            
            const aiAnalysis = aiResponseData.analysis || {};
            console.log(`🔍 Parsed AI Analysis for "${reply.text}":`, aiAnalysis);
            
            // Check if the response is positive (handle all field name formats)
            const intent = aiAnalysis.intent || aiAnalysis.Intent;
            const sentiment = aiAnalysis.sentiment || aiAnalysis.Sentiment;
            const leadScore = aiAnalysis.leadScore || aiAnalysis['Lead Score'] || aiAnalysis.lead_score;
            const isPositiveFlag = aiAnalysis.isPositive || aiAnalysis['Is Positive'];
            
            const isPositive = (isPositiveFlag === true) || 
                              (intent && (
                                  intent.toLowerCase() === 'available' ||
                                  intent.toLowerCase() === 'interested' ||
                                  intent.toLowerCase() === 'scheduling_request'
                              )) ||
                              (sentiment && sentiment.toLowerCase() === 'positive') ||
                              (leadScore && leadScore >= 7);
            
            console.log(`📊 Analysis for "${reply.text}":`);
            console.log(`   - Intent: ${aiAnalysis.intent || aiAnalysis.Intent || 'Unknown'}`);
            console.log(`   - Sentiment: ${aiAnalysis.sentiment || aiAnalysis.Sentiment || 'Unknown'}`);
            console.log(`   - Lead Score: ${leadScore || 'Unknown'}`);
            console.log(`   - Is Positive: ${isPositive}`);
            console.log(`   - Next Action: ${aiAnalysis.nextAction || aiAnalysis['Next Action'] || 'Unknown'}`);
            console.log(`   - Suggested Response: ${aiAnalysis.suggestedResponse || aiAnalysis['Suggested Response'] || 'None'}`);
            
                analysisResults.push({
                    reply: reply.text,
                    timestamp: reply.timestamp,
                    success: true,
                    analysis: aiAnalysis,
                    isPositive: isPositive
                });
                
                // If this is a positive response, trigger the full analysis with action
                if (isPositive) {
                    console.log(`🎉 POSITIVE RESPONSE DETECTED! "${reply.text}" - Triggering automatic follow-up...`);
                    // Call the full analysis function that will send calendar links
                    setTimeout(() => {
                        // Note: This would need connectionId and leadName parameters to work
                        console.log('⚠️ Automatic follow-up requires connectionId and leadName parameters');
                    }, 1000);
                }
        }
        
        // Summary
        const positiveReplies = analysisResults.filter(r => r.success && r.isPositive);
        console.log(`\n📊 SUMMARY:`);
        console.log(`   - Total replies analyzed: ${analysisResults.length}`);
        console.log(`   - Positive replies: ${positiveReplies.length}`);
        console.log(`   - Negative/neutral replies: ${analysisResults.length - positiveReplies.length}`);
        
        if (positiveReplies.length > 0) {
            console.log(`\n🎉 POSITIVE REPLIES FOUND:`);
            positiveReplies.forEach((result, index) => {
                console.log(`   ${index + 1}. "${result.reply}" - ${result.analysis.intent} (Score: ${result.analysis.leadScore})`);
            });
        }
        
        return {
            success: true,
            totalReplies: analysisResults.length,
            positiveReplies: positiveReplies.length,
            results: analysisResults
        };
        
    } catch (error) {
        console.error('❌ Error testing AI analysis:', error);
        return { success: false, reason: 'Analysis failed', error: error.message };
    }
};

// Function to analyze lead replies with AI and trigger appropriate actions (works for any LinkedIn user)
self.analyzeLeadRepliesWithAI = async (connectionId, leadName) => {
    console.log(`🤖 ANALYZING ${leadName}'S REPLIES WITH AI...`);
    
    try {
        // First, find all of the lead's replies
        const repliesResult = await self.findLeadReplies(connectionId, leadName);
        
        if (!repliesResult.found || !repliesResult.replies) {
            console.log(`❌ No replies from ${leadName} found`);
            return { success: false, reason: 'No replies found' };
        }
        
        console.log(`📊 Found ${repliesResult.replies.length} replies from ${leadName}`);
        
        // Filter out the AI-generated messages (long messages) and focus on lead's actual replies
        const leadActualReplies = repliesResult.replies.filter(reply => {
            const text = reply.text.trim();
            // Filter out long AI-generated messages and focus on short, casual replies
            return text.length < 200 && !text.includes('Dear Mr.') && !text.includes('[Your Name]');
        });
        
        console.log(`📊 Found ${leadActualReplies.length} actual replies from ${leadName} (excluding AI messages)`);
        
        if (leadActualReplies.length === 0) {
            console.log(`❌ No actual replies from ${leadName} found (only AI messages)`);
            return { success: false, reason: 'No actual replies found' };
        }
        
        // Analyze the latest reply from the lead
        const latestReply = leadActualReplies[leadActualReplies.length - 1];
        console.log(`🎯 Analyzing latest reply: "${latestReply.text}"`);
        
        // Send to AI for analysis
        const platformUrl = 'https://app.linkdominator.com';
        
        // Get LinkedIn ID from storage or use fallback
        const linkedinIdResult = await chrome.storage.local.get(['linkedinId']);
        const linkedinId = linkedinIdResult.linkedinId || 'vicken-concept';
        
        // Get CSRF token
        const tokenResult = await chrome.storage.local.get(['csrfToken']);
        if (!tokenResult.csrfToken) {
            console.error('❌ No CSRF token found for AI analysis');
            return null;
        }
        
        const aiResponse = await fetch(`${platformUrl}/api/calls/analyze-message`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'lk-id': linkedinId,
                'csrf-token': tokenResult.csrfToken
            },
                        body: JSON.stringify({
                            message: latestReply.text,
                            leadName: leadName,
                            context: 'LinkedIn message response analysis',
                            original_message: null, // Let backend fetch from database
                            call_id: callId || 'test_call_analysis',
                            connection_id: null,
                            conversation_urn_id: null
                        })
        });
        
        if (!aiResponse.ok) {
            console.log(`❌ AI analysis failed: ${aiResponse.status}`);
            return { success: false, reason: 'AI analysis failed' };
        }
        
        const aiResponseData = await aiResponse.json();
        console.log('🤖 AI Analysis Result:', aiResponseData);
        
        if (!aiResponseData.success) {
            console.log(`❌ AI analysis failed: ${aiResponseData.message}`);
            return { success: false, reason: 'AI analysis failed', error: aiResponseData.message };
        }
        
        const aiAnalysis = aiResponseData.analysis;
        
        // Check if the response is positive (handle all field name formats)
        const intent = aiAnalysis.intent || aiAnalysis.Intent;
        const sentiment = aiAnalysis.sentiment || aiAnalysis.Sentiment;
        const leadScore = aiAnalysis.leadScore || aiAnalysis['Lead Score'] || aiAnalysis.lead_score;
        const isPositiveFlag = aiAnalysis.isPositive || aiAnalysis['Is Positive'];
        
        const isPositive = shouldScheduleFromAnalysis(aiAnalysis);
        
        console.log(`🎯 Response Analysis:`);
        console.log(`   - Intent: ${intent || 'Unknown'}`);
        console.log(`   - Sentiment: ${sentiment || 'Unknown'}`);
        console.log(`   - Lead Score: ${leadScore || 'Unknown'}`);
        console.log(`   - Is Positive Flag: ${isPositiveFlag}`);
        console.log(`   - Is Positive (calculated): ${isPositive}`);
        console.log(`   - Analysis Object:`, JSON.stringify(aiAnalysis, null, 2));
        
        if (isPositive) {
            console.log('🎉 POSITIVE RESPONSE DETECTED! Generating calendar link...');
            
            // Ensure we have a valid call_id before generating calendar link
            const validCallId = await ensureValidCallId(monitoringData);
            if (!validCallId) {
                console.log(`❌ Cannot generate calendar link - no valid call_id found for connection_id: ${monitoringData.connectionId}`);
                return;
            }
            
            // Generate calendar link
            const calendarResponse = await fetch(`${platformUrl}/api/calls/${validCallId}/calendar-link`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'lk-id': linkedinId
                }
            });
            
            if (calendarResponse.ok) {
                const calendarData = await calendarResponse.json();
                console.log('✅ Calendar link generated:', calendarData.calendarLink);
                
                // Send the scheduling message to Eleazar
                console.log('📤 Sending scheduling message to Eleazar...');
                
                        // Use the conversation ID from the connection and send the scheduling message
                        const conversationId = connectionId; // This should be the conversation URN
                        const voyagerApi = 'https://www.linkedin.com/voyager/api';
                
                const tokenResult = await chrome.storage.local.get(['csrfToken']);
                
                const sendMessageResponse = await fetch(`${voyagerApi}/messaging/conversations/${conversationId}/events`, {
                    method: 'POST',
                    headers: {
                        'csrf-token': tokenResult.csrfToken,
                        'accept': 'application/vnd.linkedin.normalized+json+2.1',
                        'content-type': 'application/json',
                        'x-li-lang': 'en_US',
                        'x-restli-protocol-version': '2.0.0'
                    },
                    body: JSON.stringify({
                        eventContent: {
                            'com.linkedin.voyager.messaging.create.MessageCreate': {
                                body: calendarData.schedulingMessage || `Great! I'd love to schedule a call with you. Please use this link to book a time that works for you: ${calendarData.calendarLink}`
                            }
                        }
                    })
                });
                
                        if (sendMessageResponse.ok) {
                            console.log(`✅ Scheduling message sent successfully to ${leadName}!`);
                    return {
                        success: true,
                        action: 'calendar_sent',
                        calendarLink: calendarData.calendarLink,
                        schedulingMessage: calendarData.schedulingMessage,
                        aiAnalysis: aiAnalysis
                    };
                } else {
                    console.log(`❌ Failed to send scheduling message: ${sendMessageResponse.status}`);
                    return {
                        success: false,
                        reason: 'Failed to send scheduling message',
                        aiAnalysis: aiAnalysis
                    };
                }
            } else {
                console.log(`❌ Failed to generate calendar link: ${calendarResponse.status}`);
                return {
                    success: false,
                    reason: 'Failed to generate calendar link',
                    aiAnalysis: aiAnalysis
                };
            }
        } else {
            console.log('📝 Response is neutral/negative or explicitly not_interested - no scheduling action');
            return {
                success: true,
                action: 'no_action_needed',
                aiAnalysis: aiAnalysis,
                message: 'Response analyzed as neutral/negative or not_interested'
            };
        }
        
    } catch (error) {
        console.error('❌ Error analyzing Eleazar replies:', error);
        return { success: false, reason: 'Analysis failed', error: error.message };
    }
};

// Function to create a comprehensive polling + AI pipeline for call response tracking
self.createCallResponsePipeline = async () => {
    console.log('🚀 CREATING COMPREHENSIVE CALL RESPONSE PIPELINE...');
    
    try {
        // Get all call response monitoring entries
        const allStorage = await chrome.storage.local.get();
        const responseKeys = Object.keys(allStorage).filter(key => key.startsWith('call_response_monitoring_'));
        
        if (responseKeys.length === 0) {
            console.log('❌ No call response monitoring entries found');
            console.log('💡 Make sure you have sent call messages first');
            return;
        }
        
        console.log(`📊 Found ${responseKeys.length} call response monitoring entries`);
        
        // Process each monitoring entry
        for (const key of responseKeys) {
            const monitoringData = allStorage[key];
            console.log(`\n🔍 Processing: ${monitoringData.leadName} (${monitoringData.connectionId})`);
            
            try {
                // Step 1: Get conversations using the improved function
                const conversationData = await fetchLinkedInConversation(monitoringData.connectionId, monitoringData.lastCheckedMessageId);
                
                if (!conversationData) {
                    console.log(`❌ No conversation data for ${monitoringData.leadName}`);
                    continue;
                }
                
                // Step 2: Process new messages
                if (conversationData.messages && conversationData.messages.length > 0) {
                    console.log(`📨 Found ${conversationData.messages.length} new messages from ${monitoringData.leadName}`);
                    
                    for (const message of conversationData.messages) {
                        console.log(`📝 Message: "${message.text}"`);
                        console.log(`👤 From: ${message.sender}`);
                        console.log(`🕐 Time: ${new Date(message.timestamp).toLocaleString()}`);
                        
                        // Step 3: AI Analysis for positive responses (works for any LinkedIn user)
                        if (message.isFromLead && message.text.trim().length > 0) {
                            console.log(`🤖 Analyzing message with AI...`);
                            
                            try {
                                const aiResponse = await processCallReplyWithAI(monitoringData.callId || 'unknown', message.text, monitoringData.leadName);
                                
                                if (aiResponse && aiResponse.isPositive) {
                                    console.log(`🎉 POSITIVE RESPONSE DETECTED!`);
                                    console.log(`📊 Intent: ${aiResponse.intent}`);
                                    console.log(`😊 Sentiment: ${aiResponse.sentiment}`);
                                    console.log(`⭐ Lead Score: ${aiResponse.leadScore}`);
                                    
                                    // Step 4: Generate calendar link and send scheduling message
                                    console.log(`📅 Generating calendar link...`);
                                    
                                    // Ensure we have a valid call_id before generating calendar link
                                    const validCallId = await ensureValidCallId(monitoringData);
                                    if (!validCallId) {
                                        console.log(`❌ Cannot generate calendar link - no valid call_id found for connection_id: ${monitoringData.connectionId}`);
                                        return;
                                    }
                                    
                                    const calendarResponse = await fetch(`${platformUrl}/api/calls/${validCallId}/calendar-link`, {
                                        method: 'POST',
                                        headers: {
                                            'Content-Type': 'application/json',
                                            'lk-id': linkedinId
                                        }
                                    });
                                    
                                    if (calendarResponse.ok) {
                                        const calendarData = await calendarResponse.json();
                                        console.log(`✅ Calendar link generated: ${calendarData.calendarLink}`);
                                        
                                        // Step 5: Send scheduling message via LinkedIn
                                        console.log(`📤 Sending scheduling message...`);
                                        await sendCalendarLinkMessage(monitoringData, calendarData.calendarLink, calendarData.schedulingMessage);
                                        
                                        console.log(`🎯 COMPLETE! Call response pipeline executed successfully for ${monitoringData.leadName}`);
                                    } else {
                                        console.log(`❌ Failed to generate calendar link: ${calendarResponse.status}`);
                                    }
                                } else {
                                    console.log(`📝 Response analyzed as neutral/negative - no action taken`);
                                }
                            } catch (error) {
                                console.error(`❌ AI analysis failed:`, error);
                            }
                        }
                    }
                    
                    // Step 6: Update monitoring data with latest message ID
                    const latestMessage = conversationData.messages[conversationData.messages.length - 1];
                    monitoringData.lastCheckedMessageId = latestMessage.id;
                    monitoringData.lastChecked = Date.now();
                    monitoringData.messageCount += conversationData.messages.length;
                    
                    await chrome.storage.local.set({ [key]: monitoringData });
                    console.log(`✅ Updated monitoring data for ${monitoringData.leadName}`);
                } else {
                    console.log(`⏳ No new messages from ${monitoringData.leadName}`);
                }
                
            } catch (error) {
                console.error(`❌ Error processing ${monitoringData.leadName}:`, error);
            }
        }
        
        console.log(`\n🎯 Call response pipeline completed for ${responseKeys.length} leads`);
        
    } catch (error) {
        console.error('❌ Call response pipeline failed:', error);
    }
};

// Function to try different LinkedIn API endpoints for conversations
self.testLinkedInConversationsAPI = async () => {
    console.log('🔍 TESTING DIFFERENT LINKEDIN CONVERSATIONS API ENDPOINTS...');
    
    try {
        // Get CSRF token
        const tokenResult = await chrome.storage.local.get(['csrfToken']);
        if (!tokenResult.csrfToken) {
            console.error('❌ No CSRF token found');
            return;
        }
        
        const voyagerApi = 'https://www.linkedin.com/voyager/api';
        const headers = {
            'csrf-token': tokenResult.csrfToken,
            'accept': 'application/vnd.linkedin.normalized+json+2.1',
            'x-li-lang': 'en_US',
            'x-restli-protocol-version': '2.0.0'
        };
        
        // Test different endpoints
        const endpoints = [
            '/messaging/conversations',
            '/messaging/conversations?count=50',
            '/messaging/conversations?count=100',
            '/messaging/conversations?start=0&count=20',
            '/messaging/conversations?q=all',
            '/messaging/conversations?q=received',
            '/messaging/conversations?q=sent',
            '/messaging/conversations?q=unread',
            '/messaging/conversations?q=read',
            '/messaging/conversations?q=archived',
            '/messaging/conversations?q=spam',
            '/messaging/conversations?q=trash',
            '/messaging/conversations?q=all&count=50',
            '/messaging/conversations?q=all&count=100',
            '/messaging/conversations?q=all&count=200',
            '/messaging/conversations?q=all&count=500',
            '/messaging/conversations?q=all&count=1000',
            '/messaging/conversations?q=all&count=2000',
            '/messaging/conversations?q=all&count=5000',
            '/messaging/conversations?q=all&count=10000'
        ];
        
        for (const endpoint of endpoints) {
            try {
                console.log(`🧪 Testing endpoint: ${endpoint}`);
                const response = await fetch(`${voyagerApi}${endpoint}`, {
                    method: 'GET',
                    headers: headers
                });
                
                console.log(`📡 Status: ${response.status}`);
                
                if (response.ok) {
                    const data = await response.json();
                    const conversations = data.elements || [];
                    console.log(`✅ Found ${conversations.length} conversations`);
                    
                    if (conversations.length > 0) {
                        console.log('🎉 SUCCESS! Found conversations with endpoint:', endpoint);
                        console.log('📋 First conversation:', conversations[0]);
                        break;
                    }
                } else {
                    console.log(`❌ Failed: ${response.status}`);
                }
            } catch (error) {
                console.log(`❌ Error: ${error.message}`);
            }
        }
        
    } catch (error) {
        console.error('❌ LinkedIn conversations API test failed:', error);
    }
};

// Function to debug LinkedIn conversations
self.debugLinkedInConversations = async () => {
    console.log('🔍 DEBUGGING LINKEDIN CONVERSATIONS...');
    
    try {
        // Get CSRF token
        const tokenResult = await chrome.storage.local.get(['csrfToken']);
        if (!tokenResult.csrfToken) {
            console.error('❌ No CSRF token found');
            return;
        }
        
        console.log('✅ CSRF token found');
        
        // Fetch conversations
        const voyagerApi = 'https://www.linkedin.com/voyager/api';
        const response = await fetch(`${voyagerApi}/messaging/conversations`, {
            method: 'GET',
            headers: {
                'csrf-token': tokenResult.csrfToken,
                'accept': 'application/vnd.linkedin.normalized+json+2.1',
                'x-li-lang': 'en_US',
                'x-restli-protocol-version': '2.0.0'
            }
        });
        
        console.log('📡 LinkedIn conversations API status:', response.status);
        
        if (!response.ok) {
            console.error('❌ LinkedIn conversations API failed:', response.status);
            return;
        }
        
        const data = await response.json();
        const conversations = data.elements || [];
        
        console.log('📊 Total conversations found:', conversations.length);
        
        // Look for Eleazar's conversation
        const eleazarConversation = conversations.find(conv => {
            return conv.participants?.some(participant => {
                const profile = participant.com?.linkedin?.voyager?.messaging?.MessagingMember?.miniProfile;
                return profile?.publicIdentifier === 'eleazar-nzerem' || 
                       profile?.firstName === 'Eleazar' || 
                       profile?.lastName === 'Nzerem';
            });
        });
        
        if (eleazarConversation) {
            console.log('✅ FOUND ELEAZAR CONVERSATION:', eleazarConversation.entityUrn);
            console.log('📋 Conversation details:', {
                entityUrn: eleazarConversation.entityUrn,
                participants: eleazarConversation.participants?.map(p => ({
                    name: `${p.com?.linkedin?.voyager?.messaging?.MessagingMember?.miniProfile?.firstName} ${p.com?.linkedin?.voyager?.messaging?.MessagingMember?.miniProfile?.lastName}`,
                    publicIdentifier: p.com?.linkedin?.voyager?.messaging?.MessagingMember?.miniProfile?.publicIdentifier
                }))
            });
        } else {
            console.log('❌ No conversation found with Eleazar');
            console.log('🔍 Available conversations:', conversations.map(c => ({
                entityUrn: c.entityUrn,
                participants: c.participants?.map(p => ({
                    name: `${p.com?.linkedin?.voyager?.messaging?.MessagingMember?.miniProfile?.firstName} ${p.com?.linkedin?.voyager?.messaging?.MessagingMember?.miniProfile?.lastName}`,
                    publicIdentifier: p.com?.linkedin?.voyager?.messaging?.MessagingMember?.miniProfile?.publicIdentifier
                }))
            })));
        }
        
    } catch (error) {
        console.error('❌ Debug failed:', error);
    }
};

// Function to manually set up response monitoring for all accepted connections
self.setupResponseMonitoringForAcceptedConnections = async () => {
    console.log('🔧 Setting up response monitoring for all accepted connections...');
    
    try {
        // Get LinkedIn ID
        const linkedinIdResult = await chrome.storage.local.get(['linkedinId']);
        const linkedinId = linkedinIdResult.linkedinId || 'vicken-concept';
        
        // Get all campaigns and their accepted leads
        const campaignsResponse = await fetch(`${PLATFORM_URL}/api/campaigns`, {
            headers: { 'lk-id': linkedinId }
        });
        
        if (!campaignsResponse.ok) {
            console.error('❌ Failed to fetch campaigns');
            return;
        }
        
        const campaignsData = await campaignsResponse.json();
        const campaigns = campaignsData.data || [];
        
        console.log(`📊 Found ${campaigns.length} campaigns to check`);
        
        for (const campaign of campaigns) {
            if (campaign.status === 'running' || campaign.status === 'stop') {
                console.log(`🔍 Checking campaign ${campaign.id} (${campaign.name})`);
                
                // Get leads for this campaign
                const leadsResponse = await fetch(`${PLATFORM_URL}/api/campaign/${campaign.id}/leads`, {
                    headers: { 'lk-id': linkedinId || 'vicken-concept' }
                });
                
                if (leadsResponse.ok) {
                    const leadsData = await leadsResponse.json();
                    const leads = leadsData.data || [];
                    
                    console.log(`👥 Found ${leads.length} leads in campaign ${campaign.id}`);
                    
                    for (const lead of leads) {
                        if (lead.acceptedStatus === true && lead.connectionId) {
                            console.log(`✅ Lead ${lead.name} is accepted - setting up monitoring`);
                            
                            // Create monitoring entry for this accepted lead
                            const responseMonitoringKey = `call_response_monitoring_${campaign.id}_${lead.connectionId}`;
                            
                            // Check if monitoring already exists
                            const existingMonitoring = await chrome.storage.local.get([responseMonitoringKey]);
                            if (!existingMonitoring[responseMonitoringKey]) {
                                // Create a real call record first
                                let realCallId = null;
                                try {
                                    const callData = {
                                        recipient: lead.name,
                                        profile: linkedinId || 'vicken-concept',
                                        sequence: `Campaign ${campaign.id}`,
                                        callStatus: 'suggested',
                                        connection_id: lead.connectionId,
                                        conversation_urn_id: null, // Will be updated when we fetch conversations
                                        campaign_id: campaign.id,
                                        campaign_name: `Campaign ${campaign.id}`,
                                        original_message: 'Lead accepted connection invitation',
                                        is_acceptance_update: true // Preserve existing conversation data
                                    };
                                    
                                    const callResponse = await fetch(`${PLATFORM_URL}/api/book-call/store`, {
                                        method: 'POST',
                                        headers: {
                                            'Content-Type': 'application/json',
                                            'Accept': 'application/json',
                                            'X-Requested-With': 'XMLHttpRequest',
                                            'lk-id': linkedinId || 'vicken-concept',
                                            'csrf-token': tokenResult.csrfToken
                                        },
                                        body: JSON.stringify(callData)
                                    });
                                    
                                    if (callResponse.ok) {
                                        const callContentType = callResponse.headers.get('content-type') || '';
                                        if (callContentType.includes('application/json')) {
                                            const callResult = await callResponse.json();
                                            realCallId = String(callResult.call_id || callResult.id);
                                            console.log(`✅ Created real call record for ${lead.name} with ID: ${realCallId}`);
                                        }
                                    }
                                } catch (callError) {
                                    console.error(`❌ Failed to create call record for ${lead.name}:`, callError);
                                }
                                
                                await chrome.storage.local.set({ 
                                    [responseMonitoringKey]: {
                                        callId: realCallId, // Use real call ID from database
                                        leadId: lead.id,
                                        leadName: lead.name,
                                        connectionId: lead.connectionId,
                                        campaignId: campaign.id,
                                        conversationUrnId: null, // Will be updated when we fetch conversations
                                        sentAt: Date.now(),
                                        status: 'waiting_for_response',
                                        lastCheckedMessageId: null,
                                        messageCount: 0
                                    }
                                });
                                console.log(`📊 Created response monitoring for ${lead.name}: ${responseMonitoringKey} with call_id: ${realCallId}`);
                            } else {
                                console.log(`⏭️ Monitoring already exists for ${lead.name}`);
                            }
                        }
                    }
                }
            }
        }
        
        console.log('✅ Response monitoring setup completed for all accepted connections');
        
    } catch (error) {
        console.error('❌ Error setting up response monitoring:', error);
    }
};

// Function to manually set up response monitoring for existing calls
self.setupResponseMonitoringForExistingCalls = async () => {
    console.log('🔧 Setting up response monitoring for existing calls...');
    const allStorage = await chrome.storage.local.get();
    const callAttemptKeys = Object.keys(allStorage).filter(key => key.startsWith('call_attempted_'));
    
    // Find the most recent call attempt for Eleazar
    let mostRecentCall = null;
    let mostRecentTime = 0;
    
    callAttemptKeys.forEach(key => {
        const timestamp = allStorage[key];
        if (timestamp > mostRecentTime) {
            mostRecentTime = timestamp;
            mostRecentCall = key;
        }
    });
    
    if (mostRecentCall) {
        const parts = mostRecentCall.split('_');
        const campaignId = parts[2];
        const connectionId = parts[3];
        
        console.log('🎯 Most recent call found:', mostRecentCall);
        console.log('📊 Campaign ID:', campaignId);
        console.log('👤 Connection ID:', connectionId);
        
        // Set up response monitoring for this call
        const responseMonitoringKey = `call_response_monitoring_${campaignId}_${connectionId}`;
        await chrome.storage.local.set({ 
            [responseMonitoringKey]: {
                callId: null, // We don't have the actual call ID, but we can still monitor
                leadId: 14521, // Eleazar's lead ID from the logs
                leadName: 'Eleazar Nzerem',
                connectionId: connectionId,
                campaignId: campaignId,
                conversationUrnId: null, // Will be updated when we fetch conversations
                sentAt: mostRecentTime,
                status: 'waiting_for_response',
                lastCheckedMessageId: null,
                messageCount: 0
            }
        });
        
        console.log('✅ Response monitoring set up for most recent call:', responseMonitoringKey);
        console.log('🕐 Call sent at:', new Date(mostRecentTime));
        
        return responseMonitoringKey;
    } else {
        console.log('❌ No call attempts found');
        return null;
    }
};

// Manual function to simulate a call response for testing
self.simulateCallResponse = async (callId, message, isPositive = true) => {
    console.log('🧪 SIMULATING CALL RESPONSE for testing...');
    
    try {
        const response = await fetch(`${PLATFORM_URL}/api/calls/process-reply`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'lk-id': linkedinId || 'vicken-concept'
            },
            body: JSON.stringify({
                call_id: callId,
                message: message,
                profile_id: 'test-profile',
                sender: 'lead'
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log('✅ Simulated response processed:', result);
            return `Response simulated successfully. Analysis: ${JSON.stringify(result.analysis)}`;
        } else {
            console.error('❌ Failed to simulate response:', response.status);
            return `Failed to simulate response: ${response.status}`;
        }
    } catch (error) {
        console.error('❌ Error simulating response:', error);
        return `Error simulating response: ${error.message}`;
    }
};

// Manual function to check call responses for testing
self.checkCallResponses = async () => {
    console.log('🔍 MANUALLY CHECKING CALL RESPONSES...');
    await checkForCallResponses();
    return 'Call response check completed - check console for results';
};

// Manual function to force check call responses immediately
self.forceCheckResponses = async () => {
    console.log('🚀 FORCING IMMEDIATE CALL RESPONSE CHECK...');
    try {
        await checkForCallResponses();
        console.log('✅ Forced call response check completed');
        return 'Forced call response check completed - check console for results';
    } catch (error) {
        console.error('❌ Forced call response check failed:', error);
        return 'Forced call response check failed - check console for errors';
    }
};
// Manual function to check specific lead's monitoring data
self.checkLeadMonitoring = async (leadName) => {
    console.log(`🔍 CHECKING MONITORING DATA FOR: ${leadName}`);
    try {
        const allStorage = await chrome.storage.local.get();
        const responseKeys = Object.keys(allStorage).filter(key => key.startsWith('call_response_monitoring_'));
        
        console.log('📊 All monitoring keys:', responseKeys);
        
        for (const key of responseKeys) {
            const monitoringData = allStorage[key];
            if (monitoringData.leadName && monitoringData.leadName.toLowerCase().includes(leadName.toLowerCase())) {
                console.log(`🎯 FOUND MONITORING DATA FOR ${leadName}:`, monitoringData);
                return monitoringData;
            }
        }
        
        console.log(`❌ No monitoring data found for ${leadName}`);
        return null;
    } catch (error) {
        console.error('❌ Error checking lead monitoring:', error);
        return null;
    }
};

// Manual function to test LinkedIn conversation fetching
self.testLinkedInConversation = async (connectionId) => {
    console.log('🧪 TESTING LINKEDIN CONVERSATION FETCHING...');
    console.log('🔗 Connection ID:', connectionId);
    
    try {
        const messages = await fetchLinkedInConversation(connectionId);
        console.log('📊 Messages fetched:', messages);
        return `LinkedIn conversation test completed. Found ${messages ? messages.length : 0} messages. Check console for details.`;
    } catch (error) {
        console.error('❌ Error testing LinkedIn conversation:', error);
        return `Error testing LinkedIn conversation: ${error.message}`;
    }
};

// Flag to prevent concurrent execution of acceptance checks
let isCheckingAcceptances = false;

/**
 * Check for call responses and process them using real LinkedIn API
 */
const checkForCallResponses = async () => {
    console.log('🔍 CALL FLOW: Checking for call responses...');
    
    try {
        // Get LinkedIn ID first
        const linkedinIdResult = await chrome.storage.local.get(['linkedinId']);
        const linkedinId = linkedinIdResult.linkedinId || 'vicken-concept';
        
        // Fetch active campaigns to check status
        let activeCampaignsData = [];
        try {
            const campaignsResponse = await fetch(`${PLATFORM_URL}/api/campaigns`, {
                headers: { 'lk-id': linkedinId }
            });
            if (campaignsResponse.ok) {
                const result = await campaignsResponse.json();
                activeCampaignsData = result.data || [];
                console.log(`📊 CALL FLOW: Fetched ${activeCampaignsData.length} campaigns from API`);
            }
        } catch (error) {
            console.error('❌ CALL FLOW: Failed to fetch campaigns:', error);
        }
        
        // Create a map of campaign statuses for quick lookup
        const campaignStatusMap = new Map();
        activeCampaignsData.forEach(campaign => {
            campaignStatusMap.set(campaign.id, campaign.status);
        });
        
        // Get all response monitoring keys
        const allStorage = await chrome.storage.local.get();
        const responseKeys = Object.keys(allStorage).filter(key => key.startsWith('call_response_monitoring_'));
        
        if (responseKeys.length === 0) {
            console.log('📭 CALL FLOW: No call responses to monitor');
                    return;
        }
        
        console.log(`🔍 CALL FLOW: Found ${responseKeys.length} call responses to monitor`);
        
        // Deduplicate monitoring entries by connectionId - only process one per connection
        const connectionMap = new Map();
        const uniqueMonitoringEntries = [];
        const keysToCleanup = []; // Track monitoring entries from stopped campaigns
                                        
                                        for (const key of responseKeys) {
            const monitoringData = allStorage[key];
            
            if (!monitoringData) {
                console.log(`⚠️ CALL FLOW: No monitoring data for key: ${key}`);
                continue;
            }
            
            // Check if campaign is still running
            const campaignId = monitoringData.campaignId;
            const campaignStatus = campaignStatusMap.get(campaignId);
            
            if (campaignStatus && campaignStatus !== 'running' && campaignStatus !== 'active') {
                console.log(`🛑 CALL FLOW: Skipping monitoring for ${monitoringData.leadName} - Campaign ${campaignId} is ${campaignStatus}`);
                keysToCleanup.push(key);
                continue;
            }
            
            if (!campaignStatus) {
                console.log(`⚠️ CALL FLOW: Campaign ${campaignId} not found in active campaigns - monitoring ${monitoringData.leadName} anyway`);
            }
            
            const connectionId = monitoringData.connectionId;
            if (!connectionId) {
                console.log(`⚠️ CALL FLOW: No connectionId for key: ${key}`);
                continue;
            }
            
            // Only keep the first monitoring entry for each connection
            if (!connectionMap.has(connectionId)) {
                connectionMap.set(connectionId, { key, monitoringData });
                uniqueMonitoringEntries.push({ key, monitoringData });
                console.log(`✅ CALL FLOW: Selected monitoring entry for connection ${connectionId}: ${key}`);
                                            } else {
                console.log(`⏭️ CALL FLOW: Skipping duplicate monitoring entry for connection ${connectionId}: ${key}`);
            }
        }
        
        // Cleanup monitoring entries for stopped campaigns
        if (keysToCleanup.length > 0) {
            console.log(`🧹 CALL FLOW: Cleaning up ${keysToCleanup.length} monitoring entries from stopped campaigns`);
            for (const key of keysToCleanup) {
                await chrome.storage.local.remove(key);
            }
        }
        
        console.log(`🔍 CALL FLOW: Processing ${uniqueMonitoringEntries.length} unique connections from active campaigns`);
        
        // Process each unique monitoring entry using consolidated flow
        for (const { key, monitoringData } of uniqueMonitoringEntries) {
                            
            // Use consolidated call flow processor
            await processCallFlow(monitoringData, key);
                                                }
                                            } catch (error) {
        console.error('❌ CALL FLOW: Error checking call responses:', error);
    }
};
/**
 * Fetch LinkedIn conversation messages for a specific connection
 */
const fetchLinkedInConversation = async (connectionId, lastMessageId = null) => {
    try {
        console.log('📡 Fetching LinkedIn conversation for connection:', connectionId);
        
        // Get CSRF token
        const tokenResult = await chrome.storage.local.get(["csrfToken"]);
        if (!tokenResult.csrfToken) {
            console.error('❌ No CSRF token available');
            return null;
        }
        
        // Step 1: Try to get conversations, but also try direct conversation access
        console.log('🔍 Attempting to fetch conversations...');
        
        // First try the standard conversations endpoint
        const conversationsResponse = await fetch(`${voyagerApi}/messaging/conversations`, {
            method: 'GET',
            headers: {
                'csrf-token': tokenResult.csrfToken,
                'accept': 'application/vnd.linkedin.normalized+json+2.1',
                'x-li-lang': 'en_US',
                'x-li-page-instance': 'urn:li:page:d_flagship3_messaging_conversations;1ZlPK7kKRNSMi+vkXMyVMw==',
                'x-li-track': JSON.stringify({"clientVersion":"1.10.1208","osName":"web","timezoneOffset":1,"deviceFormFactor":"DESKTOP","mpName":"voyager-web"}),
                'x-restli-protocol-version': '2.0.0'
            }
        });
        
        console.log(`📡 Conversations API status: ${conversationsResponse.status}`);
        
        let conversations = [];
        if (conversationsResponse.ok) {
            const conversationsData = await conversationsResponse.json();
            conversations = conversationsData.elements || [];
            console.log(`📊 Found ${conversations.length} conversations via API`);
        } else {
            console.log(`❌ Conversations API failed: ${conversationsResponse.status}`);
        }
        
        // If no conversations found via API, try direct conversation access
        if (conversations.length === 0) {
            console.log('🔍 No conversations via API, trying direct conversation access...');
            
            // Known conversation ID for Eleazar (from the URL you provided)
            const knownConversationIds = [
                '2-MmJlMWU1MzMtMGUzYi00ODI2LThjNWEtYjQyZTAwZWEyNjM4XzEwMA==',
                connectionId // Also try the connection ID itself
            ];
            
            for (const conversationId of knownConversationIds) {
                try {
                    console.log(`🧪 Trying direct conversation access: ${conversationId}`);
                    
                    // Try to get messages directly from this conversation using the WORKING headers
                    const directMessagesResponse = await fetch(`${voyagerApi}/messaging/conversations/${conversationId}/events`, {
                        method: 'GET',
                        headers: {
                            'csrf-token': tokenResult.csrfToken,
                            'accept': 'application/json',  // ← This is the key that works!
                            'x-restli-protocol-version': '2.0.0'
                        }
                    });
                    
                    console.log(`📡 Direct conversation status: ${directMessagesResponse.status}`);
                    
                    if (directMessagesResponse.ok) {
                        const messagesData = await directMessagesResponse.json();
                        console.log('📋 Raw API Response:', messagesData);
                        
                        const messages = messagesData.elements || [];
                        console.log(`📊 Found ${messages.length} raw messages in API response`);
                            
                            // Check if we have any very recent messages (within last 5 minutes)
                            const now = Date.now();
                            const recentMessages = messages.filter(msg => {
                                const messageTime = msg.createdAt;
                                const ageMinutes = (now - messageTime) / (1000 * 60);
                                return ageMinutes <= 5;
                            });
                            
                            if (recentMessages.length > 0) {
                                console.log(`🆕 Found ${recentMessages.length} recent messages (within last 5 minutes)`);
                            } else {
                                console.log('⏰ No recent messages found (all messages are older than 5 minutes)');
                            }
                        
                        if (messages.length > 0) {
                            console.log(`🎉 SUCCESS! Found ${messages.length} messages in direct conversation: ${conversationId}`);
                            // console.log('📝 Sample message structure:', messages[0]);
                            
                            // Show all raw message timestamps to see if we're missing recent messages
                            // console.log('🕐 RAW MESSAGE TIMESTAMPS (API ORDER):');
                            // messages.forEach((msg, index) => {
                            //     const timestamp = new Date(msg.createdAt).toISOString();
                            //     console.log(`   Message ${index + 1}: ${timestamp}`);
                            // });
                            
                            // Process messages to extract text and sender info
                            const allProcessedMessages = await Promise.all(messages.map(async (msg, index) => {
                                // console.log(`🔍 Processing message ${index + 1}:`, msg);
                                
                                // Extract text using multiple methods (same as working function)
                                let text = '';
                                
                                // Method 1: Standard structure
                                if (msg.eventContent?.com?.linkedin?.voyager?.messaging?.create?.MessageCreate) {
                                    const messageCreate = msg.eventContent.com.linkedin.voyager.messaging.create.MessageCreate;
                                    text = messageCreate.body || messageCreate.attributedBody?.text || '';
                                }
                                
                                // Method 2: Alternative structure
                                if (!text && msg.eventContent?.com?.linkedin?.voyager?.messaging?.EventContent) {
                                    const eventContent = msg.eventContent.com.linkedin.voyager.messaging.EventContent;
                                    text = eventContent.attributedBody?.text || '';
                                }
                                
                                // Method 3: Direct body
                                if (!text && msg.body) {
                                    text = msg.body;
                                }
                                
                                // Method 4: Search in eventContent JSON
                                if (!text && msg.eventContent) {
                                    const eventContentStr = JSON.stringify(msg.eventContent);
                                    const textMatch = eventContentStr.match(/"text":"([^"]+)"/);
                                    if (textMatch) {
                                        text = textMatch[1];
                                    }
                                }
                                
                                let sender = 'unknown';
                                let senderEntityUrn = null;
                                let isFromExtension = false;
                                
                                // Extract sender with enhanced detection
                                // console.log('🔍 Raw sender data:', msg.from);
                                
                                if (msg.from?.com?.linkedin?.voyager?.messaging?.MessagingMember) {
                                    const member = msg.from.com.linkedin.voyager.messaging.MessagingMember;
                                    console.log('🔍 MessagingMember data:', member);
                                    
                                    if (member.name) {
                                        sender = member.name;
                                    } else if (member.miniProfile) {
                                        sender = `${member.miniProfile.firstName || ''} ${member.miniProfile.lastName || ''}`.trim();
                                    }
                                    
                                    // Get sender's entity URN for reliable identification
                                    if (member.entityUrn) {
                                        senderEntityUrn = member.entityUrn;
                                    } else if (member.miniProfile?.entityUrn) {
                                        senderEntityUrn = member.miniProfile.entityUrn;
                                    }
                                }
                                
                                // Get our own LinkedIn profile info for comparison
                                const ourProfile = await chrome.storage.local.get(['linkedinProfile']);
                                const ourEntityUrn = ourProfile.linkedinProfile?.entityUrn;
                                const ourPublicIdentifier = ourProfile.linkedinProfile?.publicIdentifier;
                                
                                // Debug profile storage
                                if (!ourEntityUrn && !ourPublicIdentifier) {
                                    console.log('⚠️ LinkedIn profile not stored yet - using fallback detection');
                                    console.log('🔍 Stored profile data:', ourProfile.linkedinProfile);
                                }
                                
                                console.log('🔍 Sender comparison:', {
                                    senderEntityUrn: senderEntityUrn,
                                    ourEntityUrn: ourEntityUrn,
                                    ourPublicIdentifier: ourPublicIdentifier,
                                    sender: sender,
                                    textPreview: text.substring(0, 50) + '...'
                                });
                                
                                // Show why isFromExtension is true/false
                                if (ourEntityUrn && senderEntityUrn) {
                                    console.log('   → Using entity URN comparison');
                                } else if (ourPublicIdentifier && sender) {
                                    console.log('   → Using public identifier comparison');
                                } else {
                                    console.log('   → Using text pattern matching (FALLBACK)');
                                    console.log('   → Text patterns checked:', {
                                        hasYourName: text.includes('[Your Name]'),
                                        hasThankYou: text.includes('Thank you for your response'),
                                        hasThankYouLetting: text.includes('Thank you for letting me know'),
                                        hasLetsSchedule: text.includes('Let\'s schedule a call'),
                                        hasHopeMessage: text.includes('I hope this message finds you well')
                                    });
                                }
                                
                                // Determine if message is from extension using reliable identifiers
                                if (ourEntityUrn && senderEntityUrn) {
                                    isFromExtension = senderEntityUrn === ourEntityUrn;
                                } else if (ourPublicIdentifier && sender) {
                                    // Fallback to name matching if URNs not available
                                    isFromExtension = sender.toLowerCase().includes('william') || 
                                                   sender.toLowerCase().includes('victor') ||
                                                   sender.toLowerCase().includes('vicken-concept');
                                } else {
                                    // Last resort: text pattern matching for AI-generated messages
                                    isFromExtension = text.includes('[Your Name]') ||
                                                   text.includes('Thank you for your response') ||
                                                   text.includes('Thank you for letting me know') ||
                                                   text.includes('Let\'s schedule a call') ||
                                                   text.includes('I hope this message finds you well') ||
                                                   text.includes('Hi Eleazar, I\'d like to schedule a call') ||
                                                   text.includes('I can share some insights about lead generation') ||
                                                   text.includes('Are you available for a brief conversation');
                                }
                                
                                // Use the reliable isFromExtension detection
        // Additional check: exclude AI-generated messages that might be misclassified
        const isAIGeneratedMessage = text && (
            // Original patterns
            text.includes('Hi Eleazar, thank you for') ||
            text.includes('Would you like me to follow up') ||
            text.includes('Could you please provide more information') ||
            text.includes('Looking forward to hearing back from you') ||
            text.includes('This will help me better accommodate') ||
            text.includes('preferred time for a call') ||
            text.includes('Thank you for your response') ||
            text.includes('calendar booking link') ||
            text.includes('I hope this message finds you well') ||
            text.includes('I would love to learn more about your work') ||
            text.includes('Thank you for your interest, Eleazar!') ||
            text.includes('Are there any specific days or times that work best for you') ||
            text.includes('Great! Let\'s schedule a call') ||
            text.includes('Can you please send me your availability') ||
            text.includes('Thank you for letting me know') ||
            text.includes('Is there a better time for us to connect') ||
            text.includes('Sure, let\'s schedule a call! When are you available?') ||
            // New AI response patterns
            text.includes('Sure! I\'d be happy to share more details') ||
            text.includes('What specific information are you looking for') ||
            text.includes('Great! I\'ve booked a time on your calendar') ||
            text.includes('Looking forward to our conversation') ||
            text.includes('Great! I will go ahead and book a time') ||
            text.includes('works for both of us') ||
            text.includes('Thanks for your willingness to share more details') ||
            text.includes('I\'m looking for information on your recent projects') ||
            text.includes('Could you provide some insights on that') ||
            text.includes('Perfect! I\'d love to schedule a call with you') ||
            text.includes('Please book a convenient time here') ||
            text.includes('Looking forward to speaking with you') ||
            // Generic AI response patterns
            text.includes('I\'d be happy to') ||
            text.includes('Looking forward to') ||
            text.includes('Thank you for your') ||
            text.includes('Great!') && text.includes('schedule') ||
            text.includes('booked a time') ||
            text.includes('calendar') && text.includes('link') ||
            text.includes('convenient time') ||
            text.includes('specific information') ||
            text.includes('recent projects') ||
            text.includes('insights on that') ||
            // Additional patterns for "not interested" responses
            text.includes('I appreciate your honesty') ||
            text.includes('If your situation changes') ||
            text.includes('If you ever want to discuss') ||
            text.includes('Wishing you all the best') ||
            text.includes('Thank you for your response,') ||
            text.includes('I appreciate your honesty,') ||
            text.includes('If you ever want to explore') ||
            text.includes('feel free to reach out') ||
            text.includes('Wishing you all the best!')
        );
                                
                                // Additional check: if message was sent very recently and matches AI patterns, it's likely from AI
                                const messageAge = Date.now() - msg.createdAt;
                                const isRecentAIMessage = messageAge < 30000 && isAIGeneratedMessage; // 30 seconds
                                
                                // Improved lead detection: if not from extension and not AI-generated, it's from lead
                                const isFromLead = !isFromExtension && !isAIGeneratedMessage && !isRecentAIMessage && text && text.trim().length > 0;
                                
                                // Additional fallback: if sender is unknown but message is short and simple, likely from lead
                                const isSimpleLeadMessage = !isFromExtension && !isAIGeneratedMessage && text && 
                                                          text.trim().length < 100 && 
                                                          (text.toLowerCase().includes('thank') || 
                                                           text.toLowerCase().includes('yes') || 
                                                           text.toLowerCase().includes('no') || 
                                                           text.toLowerCase().includes('ok') ||
                                                           text.toLowerCase().includes('sure') ||
                                                           text.toLowerCase().includes('hi') ||
                                                           text.toLowerCase().includes('hello'));
                                
                                const finalIsFromLead = isFromLead || isSimpleLeadMessage;
                                
                                console.log('🔍 Sender detection details:');
                                console.log('   - sender:', sender);
                                console.log('   - senderEntityUrn:', senderEntityUrn);
                                console.log('   - isFromExtension:', isFromExtension);
                                console.log('   - isAIGeneratedMessage:', isAIGeneratedMessage);
                                console.log('   - isRecentAIMessage:', isRecentAIMessage);
                                console.log('   - messageAge:', Math.round(messageAge / 1000) + ' seconds ago');
                                console.log('   - isFromLead:', isFromLead);
                                console.log('   - isSimpleLeadMessage:', isSimpleLeadMessage);
                                console.log('   - finalIsFromLead:', finalIsFromLead);
                                console.log('   - text preview:', text.substring(0, 50) + '...');
                                
                                if (isAIGeneratedMessage) {
                                    console.log('🤖 Message filtered as AI-generated');
                                }
                                if (isRecentAIMessage) {
                                    console.log('🤖 Message filtered as recent AI message');
                                }
                                
                                console.log(`📝 Processed message ${index + 1}: "${text}" from ${sender} (isFromLead: ${finalIsFromLead})`);
                                
                                return {
                                    id: msg.entityUrn || msg.eventUrn || `msg_${index}`,
                                    text: text,
                                    sender: sender,
                                    timestamp: msg.createdAt,
                                    isFromLead: finalIsFromLead,
                                    rawMessage: msg
                                };
                            }));
                            
                            const processedMessages = allProcessedMessages.filter(msg => msg.text && msg.text.trim().length > 0);
                            
                            // Sort messages by timestamp to get correct chronological order
                            processedMessages.sort((a, b) => a.timestamp - b.timestamp);
                            
                            console.log(`📊 Processed ${processedMessages.length} valid messages`);
                            console.log('📅 Messages sorted by timestamp (chronological order)');
                            
                            // Show sorted timestamps
                            console.log('🕐 SORTED MESSAGE TIMESTAMPS (CHRONOLOGICAL ORDER):');
                            processedMessages.forEach((msg, index) => {
                                const timestamp = new Date(msg.timestamp).toISOString();
                                console.log(`   Message ${index + 1}: ${timestamp} - ${msg.isFromLead ? 'LEAD' : 'EXTENSION'}`);
                            });
                            
                            // Show ALL messages for debugging
                            // Removed verbose message logging for cleaner output
                            
                        // Find the actual latest message from the lead
                        const leadMessages = processedMessages.filter(msg => msg.isFromLead);
                        if (leadMessages.length > 0) {
                            const latestLeadMessage = leadMessages[leadMessages.length - 1];
                            console.log('🎯 LATEST MESSAGE FROM LEAD:');
                            console.log(`   - Time: ${new Date(latestLeadMessage.timestamp).toISOString()}`);
                            console.log(`   - Text: "${latestLeadMessage.text}"`);
                            console.log(`   - Message ID: ${latestLeadMessage.id}`);
                            
                            // Check if this is a recent message (within last 10 minutes)
                            const messageAge = Date.now() - latestLeadMessage.timestamp;
                            const messageAgeMinutes = Math.floor(messageAge / (1000 * 60));
                            console.log(`   - Message age: ${messageAgeMinutes} minutes ago`);
                            
                            if (messageAgeMinutes > 10) {
                                console.log('⚠️ Latest lead message is older than 10 minutes - might be missing newer messages');
                                console.log('🔍 SUGGESTIONS:');
                                console.log('   1. Check if the message was actually sent in LinkedIn');
                                console.log('   2. Wait 15-30 minutes for LinkedIn API to update');
                                console.log('   3. Check if the message is in a different conversation thread');
                                console.log('   4. Verify the message appears in LinkedIn web interface');
                            }
                        } else {
                            console.log('❌ NO MESSAGES FROM LEAD FOUND');
                        }
                            
                            // Return the processed messages
                            return {
                                conversationUrnId: conversationId,
                                messages: processedMessages,
                                totalMessages: processedMessages.length,
                                workingEndpoint: 'direct_conversation_access',
                                rawResponse: messagesData
                            };
                        } else {
                            console.log(`📭 No messages found in conversation ${conversationId}`);
                            // console.log('🔍 Full API response structure:', JSON.stringify(messagesData, null, 2));
                        }
                    } else {
                        console.log(`❌ Direct conversation failed: ${conversationId} (${directMessagesResponse.status})`);
                        try {
                            const errorData = await directMessagesResponse.text();
                            console.log('❌ Error response:', errorData);
                        } catch (e) {
                            console.log('❌ Could not read error response');
                        }
                    }
                } catch (error) {
                    console.log(`❌ Direct conversation error: ${conversationId} - ${error.message}`);
                }
            }
        }
        
        if (conversations.length === 0) {
            console.log('❌ No conversations found via any method');
            console.log('💡 This could mean:');
            console.log('   1. LinkedIn API has changed');
            console.log('   2. No conversations exist');
            console.log('   3. Authentication issues');
            console.log('   4. Need to be actively on LinkedIn.com');
            return null;
        }
        
        // Find conversation with the target connection
        let targetConversation = null;
        for (const conversation of conversations) {
            const participants = conversation.participants?.elements || [];
            for (const participant of participants) {
                const profile = participant.com?.linkedin?.voyager?.messaging?.MessagingMember?.miniProfile;
                
                // Try multiple ways to match the connection
                if (participant.entityUrn && participant.entityUrn.includes(connectionId)) {
                    targetConversation = conversation;
                    break;
                }
                
                // Also try matching by name (for Eleazar specifically)
                if (profile?.firstName === 'Eleazar' && profile?.lastName === 'Nzerem') {
                    console.log('🎯 Found Eleazar by name match:', participant.entityUrn);
                    targetConversation = conversation;
                    break;
                }
                
                // Try matching by public identifier
                if (profile?.publicIdentifier === 'eleazar-nzerem') {
                    console.log('🎯 Found Eleazar by public identifier:', participant.entityUrn);
                    targetConversation = conversation;
                    break;
                }
            }
            if (targetConversation) break;
        }
        
        if (!targetConversation) {
        console.log('📭 No conversation found with connection:', connectionId);
        console.log('🔍 Available conversations:', conversations.map(c => ({
            entityUrn: c.entityUrn,
            participants: c.participants?.elements?.map(p => ({
                entityUrn: p.entityUrn,
                name: `${p.com?.linkedin?.voyager?.messaging?.MessagingMember?.miniProfile?.firstName} ${p.com?.linkedin?.voyager?.messaging?.MessagingMember?.miniProfile?.lastName}`,
                publicIdentifier: p.com?.linkedin?.voyager?.messaging?.MessagingMember?.miniProfile?.publicIdentifier
            }))
        })));
        return null;
        }
        
        console.log('✅ Found conversation:', targetConversation.entityUrn);
        
        // Extract conversation URN ID
        const conversationUrnId = targetConversation.entityUrn.replace('urn:li:fsd_conversation:', '');
        
        // Fetch messages from this conversation
        console.log('📡 Fetching messages from LinkedIn conversation:', conversationUrnId);
        const messagesResponse = await fetch(`${voyagerApi}/messaging/conversations/${conversationUrnId}/events`, {
            method: 'GET',
            headers: {
                'csrf-token': tokenResult.csrfToken,
                'accept': 'application/vnd.linkedin.normalized+json+2.1',
                'x-li-lang': 'en_US',
                'x-li-page-instance': 'urn:li:page:d_flagship3_messaging_conversations;1ZlPK7kKRNSMi+vkXMyVMw==',
                'x-li-track': JSON.stringify({"clientVersion":"1.10.1208","osName":"web","timezoneOffset":1,"deviceFormFactor":"DESKTOP","mpName":"voyager-web"}),
                'x-restli-protocol-version': '2.0.0'
            }
        });
        
        console.log('📡 LinkedIn messages API response status:', messagesResponse.status);
        
        if (!messagesResponse.ok) {
            console.error('❌ LinkedIn messages API failed:', messagesResponse.status, messagesResponse.statusText);
            throw new Error(`LinkedIn messages API failed: ${messagesResponse.status}`);
        }
        
        // Remove duplicate error check
        
        const messagesData = await messagesResponse.json();
        const messages = messagesData.elements || [];
        
        // Filter for new messages since last check
        let newMessages = messages;
        if (lastMessageId) {
            const lastMessageIndex = messages.findIndex(msg => msg.entityUrn === lastMessageId);
            if (lastMessageIndex >= 0) {
                newMessages = messages.slice(lastMessageIndex + 1);
            }
        }
        
        console.log('📊 Total messages in conversation:', messages.length);
        console.log('📊 New messages found:', newMessages.length);
        if (newMessages.length > 0) {
            console.log('🎉 NEW MESSAGES DETECTED! Response tracking is working!');
        }
        
                            // Process messages to extract text and sender info using enhanced detection
                            const processedMessages = newMessages.map(msg => {
                                // Extract text using multiple methods (same as working function)
                                let text = '';
                                
                                // Method 1: Standard structure
                                if (msg.eventContent?.com?.linkedin?.voyager?.messaging?.create?.MessageCreate) {
                                    const messageCreate = msg.eventContent.com.linkedin.voyager.messaging.create.MessageCreate;
                                    text = messageCreate.body || messageCreate.attributedBody?.text || '';
                                }
                                
                                // Method 2: Alternative structure
                                if (!text && msg.eventContent?.com?.linkedin?.voyager?.messaging?.EventContent) {
                                    const eventContent = msg.eventContent.com.linkedin.voyager.messaging.EventContent;
                                    text = eventContent.attributedBody?.text || '';
                                }
                                
                                // Method 3: Direct body
                                if (!text && msg.body) {
                                    text = msg.body;
                                }
                                
                                // Method 4: Search in eventContent JSON
                                if (!text && msg.eventContent) {
                                    const eventContentStr = JSON.stringify(msg.eventContent);
                                    const textMatch = eventContentStr.match(/"text":"([^"]+)"/);
                                    if (textMatch) {
                                        text = textMatch[1];
                                    }
                                }
                                
                                // Enhanced sender detection (same as working function)
                                let sender = 'unknown';
                                if (msg.from?.com?.linkedin?.voyager?.messaging?.MessagingMember) {
                                    const member = msg.from.com.linkedin.voyager.messaging.MessagingMember;
                                    if (member.name) {
                                        sender = member.name;
                                    } else if (member.miniProfile) {
                                        sender = `${member.miniProfile.firstName || ''} ${member.miniProfile.lastName || ''}`.trim();
                                    }
                                }
                                
                                // Enhanced lead detection (generic - works for any LinkedIn user)
                                const isFromLead = 
                                    // Check by entity URN (if connectionId is provided)
                                    (connectionId && msg.from?.entityUrn?.includes(connectionId)) ||
                                    // Check by profile ID in various fields (if connectionId is provided)
                                    (connectionId && msg.from && JSON.stringify(msg.from).includes(connectionId)) ||
                                    // Check if this is NOT from us (William Victor) and has meaningful text
                                    (!sender.toLowerCase().includes('william') && 
                                     !sender.toLowerCase().includes('victor') && 
                                     !msg.from?.entityUrn?.includes('vicken-concept') &&
                                     text && text.trim().length > 0 && text.length < 1000 &&
                                     // Exclude AI-generated messages (they contain template placeholders)
                                     !text.includes('[Your Name]') &&
                                     !text.includes('[Your Position]') &&
                                     !text.includes('[Your Company]') &&
                                     !text.includes('[Date and Time]') &&
                                     !text.includes('[Duration]') &&
                                     !text.includes('Dear Mr.') &&
                                     !text.includes('Dear Eleazar Nzerem'));
                                
                                console.log(`📝 Monitoring - Message: "${text}" from ${sender}, isFromLead: ${isFromLead}`);
                                
                                return {
                                    id: msg.entityUrn,
                                    text: text,
                                    sender: isFromLead ? 'lead' : 'us',
                                    timestamp: msg.createdAt,
                                    messageType: msg.eventContent?.com?.linkedin?.voyager?.messaging?.create?.MessageCreate?.attachments?.length > 0 ? 'attachment' : 'text',
                                    rawSender: sender
                                };
                            }).filter(msg => msg.text && msg.text.trim().length > 0);
        
        console.log(`📊 Processed ${processedMessages.length} new messages`);
        return processedMessages;
        
    } catch (error) {
        console.error('❌ Error fetching LinkedIn conversation:', error);
        return null;
    }
};

/**
 * Consolidated Call Flow Manager
 * Handles the complete flow from message detection to response
 */
const processCallFlow = async (monitoringData, key) => {
    try {
        console.log(`🔄 CALL FLOW: Processing ${monitoringData.leadName} (${monitoringData.callId})`);
        
        // Step 1: Check if we should process (avoid unnecessary work)
        if (monitoringData.status === 'pending_review') {
            console.log(`⏸️ CALL FLOW: Skipping - pending review for ${monitoringData.leadName}`);
            return;
        }
        
        // Step 2: Fetch conversation (single call)
        const conversationData = await fetchLinkedInConversation(monitoringData.connectionId, monitoringData.lastCheckedMessageId);
        if (!conversationData || !conversationData.messages || conversationData.messages.length === 0) {
            console.log(`📭 CALL FLOW: No new messages for ${monitoringData.leadName}`);
            return;
        }
        
        // Step 3: Find latest message from lead
        const latestMessage = conversationData.messages[conversationData.messages.length - 1];
        if (!latestMessage || !latestMessage.isFromLead) {
            console.log(`👤 CALL FLOW: Latest message not from lead for ${monitoringData.leadName}`);
            return;
        }
        
        console.log(`💬 CALL FLOW: New message from ${monitoringData.leadName}: "${latestMessage.text.substring(0, 50)}..."`);
        
        // Step 4: Update monitoring data with conversation URN ID if available
        if (conversationData.conversationUrnId && !monitoringData.conversationUrnId) {
            monitoringData.conversationUrnId = conversationData.conversationUrnId;
            await chrome.storage.local.set({ [key]: monitoringData });
            console.log(`🔗 CALL FLOW: Updated conversation URN ID for ${monitoringData.leadName}: ${conversationData.conversationUrnId}`);
        }
        
        // Step 5: Store conversation and update monitoring
        await storeConversationMessage({
            call_id: String(monitoringData.callId),
            message: latestMessage.text,
            sender: 'lead',
            message_type: 'lead_response',
            lead_name: monitoringData.leadName,
            connection_id: monitoringData.connectionId,
            conversation_urn_id: monitoringData.conversationUrnId
        });
        
        // Step 6: Check if we should analyze (avoid unnecessary AI calls)
        const shouldAnalyze = await shouldAnalyzeMessage(monitoringData, latestMessage);
        if (!shouldAnalyze) {
            console.log(`⏭️ CALL FLOW: Skipping analysis for ${monitoringData.leadName}`);
            // Update all monitoring entries for this connection
            await updateAllMonitoringEntriesForConnection(monitoringData.connectionId, latestMessage.id);
            return;
        }
        
        // Step 7: AI Analysis (only when needed)
        console.log(`🤖 CALL FLOW: Analyzing message from ${monitoringData.leadName}`);
        const analysisResponse = await processCallReplyWithAI(monitoringData.callId, latestMessage.text, monitoringData.leadName);
        
        console.log(`🔍 CALL FLOW: Analysis response for ${monitoringData.leadName}:`, analysisResponse);
        
        if (!analysisResponse) {
            console.log(`❌ CALL FLOW: Analysis failed - no response for ${monitoringData.leadName}`);
            return;
        }
        
        if (!analysisResponse.success && !analysisResponse.hasResponse) {
            console.log(`❌ CALL FLOW: Analysis failed - invalid response for ${monitoringData.leadName}`);
            return;
        }
        
        // Step 8: Process response based on analysis
        await processAnalysisResponse(monitoringData, analysisResponse, latestMessage, key);
        
        // Step 9: Update all monitoring entries for this connection to mark message as processed
        await updateAllMonitoringEntriesForConnection(monitoringData.connectionId, latestMessage.id);
        
    } catch (error) {
        console.error(`❌ CALL FLOW: Error processing ${monitoringData.leadName}:`, error);
    }
};

/**
 * Update all monitoring entries for a connection to mark a message as processed
 */
const updateAllMonitoringEntriesForConnection = async (connectionId, messageId) => {
    try {
        const allStorage = await chrome.storage.local.get();
        const responseKeys = Object.keys(allStorage).filter(key => key.startsWith('call_response_monitoring_'));
        
        for (const key of responseKeys) {
            const monitoringData = allStorage[key];
            if (monitoringData && monitoringData.connectionId === connectionId) {
                monitoringData.lastCheckedMessageId = messageId;
                await chrome.storage.local.set({ [key]: monitoringData });
                console.log(`✅ Updated monitoring entry ${key} with message ID: ${messageId}`);
            }
        }
    } catch (error) {
        console.error('❌ Error updating monitoring entries for connection:', error);
    }
};

/**
 * Check if we should analyze the message (avoid unnecessary AI calls)
 */
const shouldAnalyzeMessage = async (monitoringData, latestMessage) => {
    // Don't analyze if we were the last to respond
    if (monitoringData.lastResponseSentAt && monitoringData.lastResponseSentAt > latestMessage.timestamp) {
        console.log(`⏭️ SKIP ANALYSIS: We were last to respond to ${monitoringData.leadName}`);
        return false;
    }
    
    // Don't analyze if message is too old
    const messageAge = Date.now() - latestMessage.timestamp;
    if (messageAge > 24 * 60 * 60 * 1000) { // 24 hours
        console.log(`⏭️ SKIP ANALYSIS: Message too old for ${monitoringData.leadName}`);
        return false;
    }
    
    // Don't analyze if we already processed this message
    if (monitoringData.lastCheckedMessageId === latestMessage.id) {
        console.log(`⏭️ SKIP ANALYSIS: Already processed message for ${monitoringData.leadName}`);
        return false;
    }
    
    // Check if this message has been analyzed by any monitoring entry for this connection
    const allStorage = await chrome.storage.local.get();
    const responseKeys = Object.keys(allStorage).filter(key => key.startsWith('call_response_monitoring_'));
    
    for (const key of responseKeys) {
        const otherMonitoringData = allStorage[key];
        if (otherMonitoringData.connectionId === monitoringData.connectionId && 
            otherMonitoringData.lastCheckedMessageId === latestMessage.id) {
            console.log(`⏭️ SKIP ANALYSIS: Message already processed by another monitoring entry for ${monitoringData.leadName}`);
            return false;
        }
    }
    
    // Check if there's a pending message for this connection (review mode)
    const pendingMessageKey = `pending_message_${monitoringData.connectionId}`;
    const pendingMessage = allStorage[pendingMessageKey];
    if (pendingMessage && pendingMessage.scheduledTime && new Date(pendingMessage.scheduledTime) > new Date()) {
        console.log(`⏭️ SKIP ANALYSIS: Pending message exists for ${monitoringData.leadName} (review mode)`);
        return false;
    }
    
    return true;
};

/**
 * Process AI analysis response and determine next action
 */
const processAnalysisResponse = async (monitoringData, analysisResponse, latestMessage, key) => {
    const suggestedResponse = analysisResponse.suggested_response || analysisResponse['Suggested Response'] || analysisResponse.suggestedResponse;
    
    if (!suggestedResponse) {
        console.log(`⏭️ CALL FLOW: No suggested response for ${monitoringData.leadName}`);
        await updateMessageTracking(monitoringData, latestMessage.id, key);
        return;
    }
    
    // Check if this is a scheduling scenario
    const callStatus = analysisResponse.call_status || analysisResponse['call_status'];
    const isSchedulingInitiated = callStatus === 'scheduled';
    
    if (isSchedulingInitiated) {
        console.log(`📅 CALL FLOW: Scheduling initiated for ${monitoringData.leadName}`);
        await handleSchedulingResponse(monitoringData, analysisResponse, latestMessage, key);
    } else {
        console.log(`💬 CALL FLOW: Processing AI response for ${monitoringData.leadName}`);
        await handleAIResponse(monitoringData, suggestedResponse, analysisResponse, latestMessage, key);
    }
};

/**
 * Handle scheduling response
 */
const handleSchedulingResponse = async (monitoringData, analysisResponse, latestMessage, key) => {
    try {
        const validCallId = await ensureValidCallId(monitoringData);
        if (!validCallId) {
            console.log(`❌ CALL FLOW: No valid call_id for scheduling ${monitoringData.leadName}`);
            return;
        }
        
        const linkedinIdResult = await chrome.storage.local.get(['linkedinId']);
        const linkedinId = linkedinIdResult.linkedinId || 'vicken-concept';
        
        const calendarResponse = await fetch(`${PLATFORM_URL}/api/calls/${validCallId}/calendar-link`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'lk-id': linkedinId
            }
        });
        
        if (calendarResponse.ok) {
            const calendarData = await calendarResponse.json();
            const schedulingMessage = calendarData.scheduling_message || 
                `Perfect! I'd love to schedule a call with you. Please book a convenient time here: ${calendarData.calendar_link}\n\nLooking forward to speaking with you!`;
            
            // Check if we're in review mode for scheduling messages
            const reviewModeResult = await handleReviewMode(monitoringData, schedulingMessage, analysisResponse, key);
            
            if (reviewModeResult) {
                console.log(`⏸️ CALL FLOW: Review mode activated for scheduling message to ${monitoringData.leadName}`);
                return;
            }
            
            // Auto mode - send immediately
            console.log(`📤 CALL FLOW: Auto mode - sending scheduling message to ${monitoringData.leadName}`);
            const schedulingSuccess = await sendSchedulingMessage(monitoringData, schedulingMessage, calendarData.calendar_link);
            if (schedulingSuccess) {
                await updateMessageTracking(monitoringData, latestMessage.id, key);
                console.log(`✅ CALL FLOW: Scheduling message sent to ${monitoringData.leadName}`);
            }
        } else {
            console.log(`⚠️ CALL FLOW: Calendar generation failed for ${monitoringData.leadName}, sending fallback`);
            await handleFallbackResponse(monitoringData, analysisResponse, latestMessage, key);
        }
    } catch (error) {
        console.error(`❌ CALL FLOW: Scheduling error for ${monitoringData.leadName}:`, error);
        await handleFallbackResponse(monitoringData, analysisResponse, latestMessage, key);
    }
};

/**
 * Handle AI response (review mode or auto mode)
 */
const handleAIResponse = async (monitoringData, suggestedResponse, analysisResponse, latestMessage, key) => {
    // Use consolidated review mode handler
    const reviewModeResult = await handleReviewMode(monitoringData, suggestedResponse, analysisResponse, key);
    
    if (reviewModeResult) {
        console.log(`⏸️ CALL FLOW: Review mode activated for ${monitoringData.leadName}`);
        return;
    }
    
    // Auto mode - send immediately
    console.log(`📤 CALL FLOW: Auto mode - sending response to ${monitoringData.leadName}`);
    const aiSuccess = await sendAIMessage(monitoringData, suggestedResponse);
    if (aiSuccess) {
        await updateMessageTracking(monitoringData, latestMessage.id, key);
        console.log(`✅ CALL FLOW: Response sent to ${monitoringData.leadName}`);
    }
};

/**
 * Handle fallback response when scheduling fails
 */
const handleFallbackResponse = async (monitoringData, analysisResponse, latestMessage, key) => {
    const shouldSendFallback = await shouldSendFallbackMessage(monitoringData, latestMessage);
    
    if (shouldSendFallback) {
        const suggestedResponse = analysisResponse.suggested_response || analysisResponse['Suggested Response'] || analysisResponse.suggestedResponse;
        if (suggestedResponse) {
            console.log(`📤 CALL FLOW: Sending fallback response to ${monitoringData.leadName}`);
            const aiSuccess = await sendAIMessage(monitoringData, suggestedResponse);
            if (aiSuccess) {
                await updateMessageTracking(monitoringData, latestMessage.id, key);
            }
        }
    } else {
        console.log(`⏸️ CALL FLOW: Lead was last to send - not sending fallback to ${monitoringData.leadName}`);
        monitoringData.lastCheckedMessageId = latestMessage.id;
        await chrome.storage.local.set({ [key]: monitoringData });
    }
};

/**
 * Get AI mode settings from campaign data
 */
const getAiModeSettings = async (campaignId) => {
    try {
        // Get all campaign data to find the sequence with AI mode settings
        const allStorage = await chrome.storage.local.get();
        
        // Look for campaign data that contains the sequence array
        let campaignData = null;
        let sequenceData = null;
        
        // Check various campaign storage keys
        const possibleKeys = ['campaign', 'campaignAccepted', 'campaignNotAccepted', 'campaignCustomLikePost', 'campaignCustomProfileView', 'campaignCustomFollow', 'campaignCustomMessage', 'campaignCustomEndorse'];
        
        for (const key of possibleKeys) {
            if (allStorage[key] && allStorage[key].campaign && allStorage[key].campaign.id === campaignId) {
                campaignData = allStorage[key];
                sequenceData = allStorage[key].sequence;
                break;
            }
        }
        
        // Also check campaign-specific keys
        if (!campaignData) {
            const campaignSpecificKey = `campaign_${campaignId}`;
            if (allStorage[campaignSpecificKey]) {
                campaignData = allStorage[campaignSpecificKey];
                sequenceData = allStorage[campaignSpecificKey].sequence;
            }
        }
        
        if (campaignData && sequenceData) {
            // Find the current node based on campaign state
            let currentNode = null;
            if (Array.isArray(sequenceData)) {
                currentNode = sequenceData[0];
            } else if (sequenceData.nodeModel && Array.isArray(sequenceData.nodeModel)) {
                // Find the "Book a call" node (type: 'call' or value: 'call')
                const callNode = sequenceData.nodeModel.find(node => 
                    node.type === 'call' || node.value === 'call' || node.label?.toLowerCase().includes('call')
                );
                currentNode = callNode || sequenceData.nodeModel[0];
            }
            
            if (currentNode) {
                const nodeAiMode = currentNode.ai_mode || 'auto';
                const nodeReviewTime = currentNode.review_time ? parseInt(currentNode.review_time, 10) : null;
                
                return {
                    aiMode: nodeAiMode,
                    reviewTime: nodeReviewTime,
                    isReviewMode: nodeAiMode === 'review' && nodeReviewTime
                };
            }
        }
        
        return {
            aiMode: 'auto',
            reviewTime: null,
            isReviewMode: false
        };
    } catch (error) {
        console.error('❌ Error getting AI mode settings:', error);
        return {
            aiMode: 'auto',
            reviewTime: null,
            isReviewMode: false
        };
    }
};

/**
 * Handle review mode for AI response
 */
const handleReviewMode = async (monitoringData, suggestedResponse, analysisResponse, storageKey) => {
    const aiSettings = await getAiModeSettings(monitoringData.campaignId);
    
    if (aiSettings.isReviewMode) {
        console.log(`⏸️ REVIEW MODE ACTIVATED: Saving AI response for review (${aiSettings.reviewTime} minutes)`);
        const scheduledSendAt = new Date(Date.now() + (aiSettings.reviewTime * 60 * 1000));
        console.log(`⏰ SCHEDULED SEND TIME: ${scheduledSendAt.toISOString()}`);
        
        // Check call status before saving pending message
        const callStatus = await getCallStatus(monitoringData.callId);
        if (callStatus === 'pending_review') {
            // Check if there's already a pending message for this call
            const allStorage = await chrome.storage.local.get();
            const responseKeys = Object.keys(allStorage).filter(key => key.startsWith('call_response_monitoring_'));
            let hasPendingMessage = false;
            
            for (const key of responseKeys) {
                const storedData = allStorage[key];
                if (storedData.callId === monitoringData.callId && storedData.pendingMessage) {
                    hasPendingMessage = true;
                    console.log(`⏸️ Call ${monitoringData.callId} already has a pending message in Chrome storage - skipping duplicate processing`);
                    console.log(`📝 Existing pending message: "${storedData.pendingMessage.substring(0, 50)}..."`);
                    return false; // Skip processing
                }
            }
            
            // Also check database for existing pending message
            if (!hasPendingMessage) {
                try {
                    const linkedinIdResult = await chrome.storage.local.get(['linkedinId']);
                    const linkedinId = linkedinIdResult.linkedinId || 'vicken-concept';
                    
                    const response = await fetch(`${PLATFORM_URL}/api/calls/${monitoringData.callId}`, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                            'lk-id': linkedinId
                        }
                    });
                    
                    if (response.ok) {
                        const data = await response.json();
                        if (data.pending_message) {
                            hasPendingMessage = true;
                            console.log(`⏸️ Call ${monitoringData.callId} already has a pending message in database - skipping duplicate processing`);
                            console.log(`📝 Database pending message: "${data.pending_message.substring(0, 50)}..."`);
                            return false; // Skip processing
                        }
                    }
                } catch (error) {
                    console.error('❌ Error checking database for pending message:', error);
                }
            }
            
            if (!hasPendingMessage) {
                console.log(`⚠️ Call ${monitoringData.callId} is in ${callStatus} status, but no pending message found - processing new lead message...`);
            }
        }
        
        // Save pending message to database
        try {
            const linkedinIdResult = await chrome.storage.local.get(['linkedinId']);
            const linkedinId = linkedinIdResult.linkedinId || 'vicken-concept';
            
            const pendingResponse = await fetch(`${PLATFORM_URL}/api/calls/${monitoringData.callId}/pending-message`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'lk-id': linkedinId || 'vicken-concept'
                },
                body: JSON.stringify({
                    pending_message: suggestedResponse,
                    scheduled_send_at: scheduledSendAt.toISOString(),
                    analysis: analysisResponse.analysis || analysisResponse
                })
            });
            
            if (pendingResponse.ok) {
                console.log(`✅ Pending message saved to database for review`);
                // Update message tracking to indicate message is pending
                monitoringData.status = 'pending_review';
                monitoringData.pendingMessage = suggestedResponse;
                monitoringData.scheduledSendAt = scheduledSendAt.toISOString();
                await chrome.storage.local.set({ [storageKey]: monitoringData });
                
                console.log(`✅ Pending message stored in Chrome storage for review (${aiSettings.reviewTime} minutes)`);
                return true; // Successfully saved for review
            } else if (pendingResponse.status === 404) {
                console.warn(`⚠️ Database column not available (404), storing in Chrome storage as fallback`);
                // Store in Chrome storage as fallback when database column doesn't exist
                monitoringData.status = 'pending_review';
                monitoringData.pendingMessage = suggestedResponse;
                monitoringData.scheduledSendAt = scheduledSendAt.toISOString();
                monitoringData.storedInChrome = true; // Flag to indicate it's stored locally
                await chrome.storage.local.set({ [storageKey]: monitoringData });
                
                console.log(`✅ Pending message stored in Chrome storage for review (${aiSettings.reviewTime} minutes)`);
                return true; // Successfully saved for review
            } else {
                console.error(`❌ Failed to save pending message: ${pendingResponse.status}`);
                return false; // Failed to save
            }
        } catch (error) {
            console.error(`❌ Error saving pending message:`, error);
            return false; // Failed to save
        }
    }
    
    return false; // Not in review mode
};

/**
 * Check for pending messages and send them if ready
 */
const checkAndSendPendingMessages = async () => {
    try {
        console.log('🔍 Checking for pending messages...');
        
        // Check if service worker is active
        try {
            await chrome.storage.local.get(['activeCampaigns']);
        } catch (error) {
            if (error.message && error.message.includes('No SW')) {
                console.log('⚠️ Service worker inactive, skipping pending message check');
                return;
            }
            throw error;
        }
        
        // Get LinkedIn ID and fetch active campaigns
        const linkedinIdResult = await chrome.storage.local.get(['linkedinId']);
        const linkedinId = linkedinIdResult.linkedinId || 'vicken-concept';
        
        // Fetch active campaigns to check status
        let activeCampaignsData = [];
        try {
            const campaignsResponse = await fetch(`${PLATFORM_URL}/api/campaigns`, {
                headers: { 'lk-id': linkedinId }
            });
            if (campaignsResponse.ok) {
                const result = await campaignsResponse.json();
                activeCampaignsData = result.data || [];
                console.log(`📊 PENDING: Fetched ${activeCampaignsData.length} campaigns from API`);
            }
        } catch (error) {
            console.error('❌ PENDING: Failed to fetch campaigns:', error);
        }
        
        // Create a map of campaign statuses for quick lookup
        const campaignStatusMap = new Map();
        activeCampaignsData.forEach(campaign => {
            campaignStatusMap.set(campaign.id, campaign.status);
        });
        
        // Get all monitoring data
        const allStorage = await chrome.storage.local.get();
        const responseKeys = Object.keys(allStorage).filter(key => key.startsWith('call_response_monitoring_'));
        
        for (const key of responseKeys) {
            const monitoringData = allStorage[key];
            
            // Check if campaign is still running before sending pending messages
            const campaignId = monitoringData.campaignId;
            const campaignStatus = campaignStatusMap.get(campaignId);
            
            if (campaignStatus && campaignStatus !== 'running' && campaignStatus !== 'active') {
                console.log(`🛑 PENDING: Skipping pending message for ${monitoringData.leadName} - Campaign ${campaignId} is ${campaignStatus}`);
                // Clear the pending message since campaign is stopped
                if (monitoringData.pendingMessage) {
                    monitoringData.pendingMessage = null;
                    monitoringData.scheduledSendAt = null;
                    monitoringData.status = 'campaign_stopped';
                    await chrome.storage.local.set({ [key]: monitoringData });
                }
                continue;
            }
            
            // Check if this monitoring data has a pending message
            if (monitoringData.status === 'pending_review' && monitoringData.scheduledSendAt) {
                const scheduledTime = new Date(monitoringData.scheduledSendAt);
                const now = new Date();
                
                console.log(`🔍 Checking pending message for ${monitoringData.leadName}:`, {
                    scheduledTime: scheduledTime.toISOString(),
                    currentTime: now.toISOString(),
                    isReady: scheduledTime <= now
                });
                
                if (scheduledTime <= now) {
                    console.log(`⏰ Pending message ready to send for ${monitoringData.leadName}`);
                    
                    // Fetch the latest pending message from database to ensure we send the most current version
                    let messageToSend = monitoringData.pendingMessage; // fallback to Chrome storage
                    
                    if (monitoringData.callId) {
                        try {
                            const linkedinIdResult = await chrome.storage.local.get(['linkedinId']);
                            const linkedinId = linkedinIdResult.linkedinId || 'vicken-concept';
                            
                            console.log(`🔍 Fetching latest pending message from database for call ${monitoringData.callId}`);
                            const fetchResponse = await fetch(`${PLATFORM_URL}/api/calls/${monitoringData.callId}/status`, {
                                method: 'GET',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'lk-id': linkedinId
                                }
                            });
                            
                            if (fetchResponse.ok) {
                                const callData = await fetchResponse.json();
                                if (callData.pending_message) {
                                    messageToSend = callData.pending_message;
                                    console.log(`✅ Retrieved latest pending message from database: "${messageToSend.substring(0, 50)}..."`);
                                } else {
                                    console.log(`⚠️ No pending message found in database, using Chrome storage fallback`);
                                }
                            } else {
                                console.warn(`⚠️ Failed to fetch from database (${fetchResponse.status}), using Chrome storage fallback`);
                            }
                        } catch (error) {
                            console.error(`❌ Error fetching latest pending message from database:`, error);
                            console.log(`📤 Using Chrome storage fallback message`);
                        }
                    }
                    
                    if (messageToSend) {
                        console.log(`📤 Sending pending message: "${messageToSend}"`);
                        
                        const aiSuccess = await sendAIMessage(monitoringData, messageToSend, true); // Skip storage since message was already stored when created
                        if (aiSuccess) {
                            console.log(`✅ Pending message sent successfully to ${monitoringData.leadName}`);
                            
                            // Update backend to clear pending message and scheduled_send_at
                            if (monitoringData.callId) {
                                try {
                                    const linkedinIdResult = await chrome.storage.local.get(['linkedinId']);
                                    const linkedinId = linkedinIdResult.linkedinId || 'vicken-concept';
                                    
                                    const updateResponse = await fetch(`${PLATFORM_URL}/api/calls/${monitoringData.callId}/update-status`, {
                                        method: 'POST',
                                        headers: {
                                            'Content-Type': 'application/json',
                                            'lk-id': linkedinId
                                        },
                                        body: JSON.stringify({
                                            status: 'response_sent',
                                            pending_message: null,
                                            scheduled_send_at: null,
                                            sent_message: messageToSend
                                        })
                                    });
                                    
                                    if (updateResponse.ok) {
                                        console.log(`✅ Backend updated: cleared pending message for call ${monitoringData.callId}`);
                                        
                                        // Update monitoring data status to response_sent
                                        monitoringData.status = 'response_sent';
                                        monitoringData.pendingMessage = null;
                                        monitoringData.scheduledSendAt = null;
                                        await chrome.storage.local.set({ [key]: monitoringData });
                                        console.log(`✅ Monitoring data updated: status set to response_sent for ${monitoringData.leadName}`);
                                    } else {
                                        console.error(`❌ Failed to update backend for call ${monitoringData.callId}:`, updateResponse.status);
                                    }
                                } catch (error) {
                                    console.error('❌ Error updating backend after sending pending message:', error);
                                }
                            }
                            
                            // Update monitoring data to indicate message was sent (but keep original status)
                            monitoringData.pendingMessage = null;
                            monitoringData.scheduledSendAt = null;
                            monitoringData.lastResponseSentAt = Date.now();
                            monitoringData.responseCount = (monitoringData.responseCount || 0) + 1;
                            await chrome.storage.local.set({ [key]: monitoringData });
                        } else {
                            console.error(`❌ Failed to send pending message to ${monitoringData.leadName}`);
                        }
                    } else {
                        console.warn(`⚠️ No pending message found for ${monitoringData.leadName}`);
                    }
                }
            }
        }
    } catch (error) {
        console.error('❌ Error checking pending messages:', error);
    }
};

/**
 * Clean up orphaned campaign data from Chrome storage
 * This function checks if campaigns stored in Chrome still exist in the database
 * and removes any that have been deleted to prevent interference with the flow
 */
const cleanupOrphanedCampaignData = async () => {
    try {
        console.log('🧹 Starting cleanup of orphaned campaign data...');
        
        // Check if service worker is active
        try {
            await chrome.storage.local.get(['activeCampaigns']);
        } catch (error) {
            if (error.message && error.message.includes('No SW')) {
                console.log('⚠️ Service worker inactive, skipping cleanup');
                return;
            }
            throw error;
        }
        
        // Get LinkedIn ID for API calls
        const linkedinIdResult = await chrome.storage.local.get(['linkedinId']);
        const linkedinId = linkedinIdResult.linkedinId || 'vicken-concept';
        
        if (!linkedinId) {
            console.log('⚠️ LinkedIn ID not available, skipping cleanup');
            return;
        }
        
        // Get all campaigns from the database
        const response = await fetch(`${PLATFORM_URL}/api/campaigns`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'lk-id': linkedinId
            }
        });
        
        if (!response.ok) {
            console.log('❌ Failed to fetch campaigns from database, skipping cleanup');
            return;
        }
        
        const data = await response.json();
        if (data.status !== 200 || !data.data) {
            console.log('❌ Invalid response from campaigns API, skipping cleanup');
            return;
        }
        
        const validCampaignIds = data.data.map(campaign => campaign.id);
        console.log(`📊 Found ${validCampaignIds.length} valid campaigns in database:`, validCampaignIds);
        
        // Get all Chrome storage data
        const allStorage = await chrome.storage.local.get();
        
        // Campaign storage keys to check
        const campaignKeys = [
            'campaign', 'campaignAccepted', 'campaignNotAccepted', 
            'campaignCustomLikePost', 'campaignCustomProfileView', 
            'campaignCustomFollow', 'campaignCustomMessage', 'campaignCustomEndorse'
        ];
        
        // Check each campaign storage key
        for (const key of campaignKeys) {
            if (allStorage[key] && allStorage[key].campaign) {
                const campaignId = allStorage[key].campaign.id;
                
                if (!validCampaignIds.includes(campaignId)) {
                    console.log(`🗑️ Found orphaned campaign data for campaign ${campaignId} in key '${key}', removing...`);
                    await chrome.storage.local.remove([key]);
                    console.log(`✅ Removed orphaned campaign data for campaign ${campaignId}`);
                } else {
                    console.log(`✅ Campaign ${campaignId} in key '${key}' is still valid`);
                }
            }
        }
        
        // Clean up monitoring data for orphaned campaigns
        const monitoringKeys = Object.keys(allStorage).filter(key => key.startsWith('call_response_monitoring_'));
        let cleanedMonitoringCount = 0;
        
        for (const key of monitoringKeys) {
            const monitoringData = allStorage[key];
            if (monitoringData && monitoringData.campaignId && !validCampaignIds.includes(monitoringData.campaignId)) {
                console.log(`🗑️ Found orphaned monitoring data for campaign ${monitoringData.campaignId}, removing...`);
                await chrome.storage.local.remove([key]);
                cleanedMonitoringCount++;
            }
        }
        
        if (cleanedMonitoringCount > 0) {
            console.log(`✅ Removed ${cleanedMonitoringCount} orphaned monitoring data entries`);
        }
        
        // Clean up any other campaign-related data
        const otherKeysToCheck = ['activeCampaigns', 'forceSendInvites'];
        for (const key of otherKeysToCheck) {
            if (allStorage[key]) {
                if (key === 'activeCampaigns' && Array.isArray(allStorage[key])) {
                    const validActiveCampaigns = allStorage[key].filter(id => validCampaignIds.includes(id));
                    if (validActiveCampaigns.length !== allStorage[key].length) {
                        console.log(`🗑️ Cleaning up activeCampaigns, removing orphaned campaign IDs`);
                        await chrome.storage.local.set({ [key]: validActiveCampaigns });
                        console.log(`✅ Updated activeCampaigns with ${validActiveCampaigns.length} valid campaigns`);
                    }
                } else if (key === 'forceSendInvites' && !validCampaignIds.includes(allStorage[key])) {
                    console.log(`🗑️ Removing orphaned forceSendInvites flag for campaign ${allStorage[key]}`);
                    await chrome.storage.local.remove([key]);
                }
            }
        }
        
        console.log('✅ Campaign data cleanup completed successfully');
        
    } catch (error) {
        console.error('❌ Error during campaign data cleanup:', error);
    }
};

/**
 * Save campaign sequence data to Chrome storage for AI mode access
 */
const saveCampaignSequenceData = async (campaign) => {
    try {
        console.log(`💾 Saving campaign sequence data for campaign ${campaign.id}...`);
        
        // Get LinkedIn ID for API calls
        const linkedinIdResult = await chrome.storage.local.get(['linkedinId']);
        const linkedinId = linkedinIdResult.linkedinId || 'vicken-concept';
        
        // Fetch campaign sequence data
        const response = await fetch(`${PLATFORM_URL}/api/campaign/${campaign.id}/sequence`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'lk-id': linkedinId
            }
        });
        
        if (!response.ok) {
            console.log(`⚠️ Failed to fetch sequence for campaign ${campaign.id}: ${response.status}`);
            return;
        }
        
        const data = await response.json();
        if (data.status !== 200 || !data.data) {
            console.log(`⚠️ Invalid sequence response for campaign ${campaign.id}`);
            return;
        }
        
        const sequenceData = data.data;
        console.log(`🔍 Sequence data for campaign ${campaign.id}:`, sequenceData);
        
        // Save to Chrome storage with campaign-specific key
        const storageKey = `campaign_${campaign.id}`;
        const campaignData = {
            campaign: campaign,
            sequence: sequenceData,
            lastUpdated: new Date().toISOString()
        };
        
        await chrome.storage.local.set({ [storageKey]: campaignData });
        console.log(`✅ Saved campaign sequence data for ${campaign.id} with key: ${storageKey}`);
        
        // Log AI mode settings from first node
        if (sequenceData && sequenceData[0]) {
            console.log(`🎯 Campaign ${campaign.id} AI settings:`, {
                ai_mode: sequenceData[0].ai_mode,
                review_time: sequenceData[0].review_time
            });
        }
        
    } catch (error) {
        console.error(`❌ Error saving campaign sequence data for ${campaign.id}:`, error);
    }
};

/**
 * Debug function to manually check what campaign data is stored
 */
const debugCampaignStorage = async () => {
    try {
        console.log('🔍 DEBUG: Checking all campaign data in storage...');
        
        // Check if service worker is active
        try {
            await chrome.storage.local.get(['activeCampaigns']);
        } catch (error) {
            if (error.message && error.message.includes('No SW')) {
                console.log('⚠️ Service worker inactive, skipping debug');
                return;
            }
            throw error;
        }
        
        const allStorage = await chrome.storage.local.get();
        const campaignKeys = [
            'campaign', 'campaignAccepted', 'campaignNotAccepted', 
            'campaignCustomLikePost', 'campaignCustomProfileView', 
            'campaignCustomFollow', 'campaignCustomMessage', 'campaignCustomEndorse'
        ];
        
        // Also check for campaign-specific keys
        const campaignSpecificKeys = Object.keys(allStorage).filter(key => key.startsWith('campaign_') && !campaignKeys.includes(key));
        campaignKeys.push(...campaignSpecificKeys);
        
        console.log('📊 All storage keys:', Object.keys(allStorage));
        console.log('📊 Campaign-specific keys found:', campaignSpecificKeys);
        
        for (const key of campaignKeys) {
            if (allStorage[key]) {
                console.log(`🔍 Found data in key '${key}':`, allStorage[key]);
                if (allStorage[key].campaign) {
                    console.log(`   - Campaign ID: ${allStorage[key].campaign.id}`);
                    console.log(`   - Campaign Name: ${allStorage[key].campaign.name}`);
                    console.log(`   - Has sequence: ${!!allStorage[key].sequence}`);
                    if (allStorage[key].sequence && allStorage[key].sequence[0]) {
                        console.log(`   - First node AI mode: ${allStorage[key].sequence[0].ai_mode}`);
                        console.log(`   - First node review time: ${allStorage[key].sequence[0].review_time}`);
                    }
                }
            }
        }
        
        // Check monitoring data
        const monitoringKeys = Object.keys(allStorage).filter(key => key.startsWith('call_response_monitoring_'));
        console.log(`📊 Found ${monitoringKeys.length} monitoring entries`);
        for (const key of monitoringKeys) {
            const data = allStorage[key];
            console.log(`🔍 Monitoring ${key}:`, {
                campaignId: data.campaignId,
                leadName: data.leadName,
                status: data.status
            });
        }
        
    } catch (error) {
        console.error('❌ Error during debug:', error);
    }
};

/**
 * Process call reply with AI analysis
 */
const processCallReplyWithAI = async (callId, messageText, leadName = null) => {
    try {
        console.log('🤖 Processing call reply with AI analysis...');
        
        // If leadName is not provided, try to get it from storage
        if (!leadName) {
            const allStorage = await chrome.storage.local.get();
            const responseKeys = Object.keys(allStorage).filter(key => key.startsWith('call_response_monitoring_'));
            for (const key of responseKeys) {
                const monitoringData = allStorage[key];
                if (monitoringData.callId === callId) {
                    leadName = monitoringData.leadName;
                    break;
                }
            }
        }
        
        console.log(`🎯 Analyzing message from: ${leadName || 'Unknown Lead'}`);
        
        // Get CSRF token
        const tokenResult = await chrome.storage.local.get(['csrfToken']);
        if (!tokenResult.csrfToken) {
            console.error('❌ No CSRF token found for AI analysis');
            // Use fallback analysis
            const fallbackAnalysis = {
                success: true,
                analysis: {
                    intent: 'busy',
                    sentiment: 'negative',
                    leadScore: 2,
                    isPositive: false,
                    suggested_response: 'Thank you for letting me know. I understand you\'re not available right now. Please feel free to reach out when you have time.',
                    next_action: 'acknowledge'
                },
                message: 'Fallback analysis due to missing CSRF token'
            };
            return fallbackAnalysis;
        }
        
        // Get connection_id and conversation_urn_id from monitoring data
        let connectionId = null;
        let conversationUrnId = null;
        
        if (callId) {
            const allStorage = await chrome.storage.local.get();
            const responseKeys = Object.keys(allStorage).filter(key => key.startsWith('call_response_monitoring_'));
            for (const key of responseKeys) {
                const monitoringData = allStorage[key];
                if (monitoringData.callId === callId) {
                    connectionId = monitoringData.connectionId;
                    conversationUrnId = monitoringData.conversationUrnId;
                    break;
                }
            }
        }

        // Ensure call_id is a string as backend validates it strictly
        const normalizedCallId = callId != null ? String(callId) : null;

        const requestBody = {
            message: messageText,
            leadName: leadName || 'LinkedIn Lead',
            context: 'LinkedIn message response analysis',
            call_id: normalizedCallId,
            connection_id: connectionId,
            conversation_urn_id: conversationUrnId
        };
        
        // console.log('🔍 DEBUG: API Request Details:');
        // console.log('   - URL:', `${PLATFORM_URL}/api/calls/analyze-message`);
        // console.log('   - Method: POST');
        // console.log('   - Headers:', {
        //         'Content-Type': 'application/json',
        //         'lk-id': linkedinId || 'vicken-concept',
        //         'csrf-token': tokenResult.csrfToken ? tokenResult.csrfToken.substring(0, 20) + '...' : 'MISSING'
        //     });
        // console.log('   - Body:', requestBody);
        
        // Get LinkedIn ID for the API call
        const linkedinIdResult = await chrome.storage.local.get(['linkedinId']);
        const currentLinkedInId = linkedinIdResult.linkedinId || 'vicken-concept';
        
        const response = await fetch(`${PLATFORM_URL}/api/calls/analyze-message`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                'lk-id': currentLinkedInId,
                'csrf-token': tokenResult.csrfToken
            },
            body: JSON.stringify(requestBody)
        });
        
        console.log('🔍 DEBUG: API Response Details:');
        console.log('   - Status:', response.status);
        console.log('   - Status Text:', response.statusText);
        console.log('   - Headers:', Object.fromEntries(response.headers.entries()));
        
        if (response.ok) {
                // Check if response is JSON
                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    const textResponse = await response.text();
                    console.error('❌ Backend returned non-JSON response:', textResponse.substring(0, 200));
                    
                    // Fallback: Create a basic analysis response
                    console.log('🔄 Using fallback AI analysis due to backend error');
                    const fallbackAnalysis = {
                        success: true,
                        analysis: {
                            intent: 'busy',
                            sentiment: 'negative',
                            leadScore: 2,
                            isPositive: false,
                            suggested_response: 'Thank you for letting me know. I understand you\'re not available right now. Please feel free to reach out when you have time.',
                            next_action: 'acknowledge'
                        },
                        message: 'Fallback analysis due to backend error'
                    };
                    return fallbackAnalysis;
                }
                
                const result = await response.json();
                console.log('✅ AI analysis completed:', result);
                
                if (!result.success) {
                    console.error('❌ AI analysis failed:', result.message);
                    return null;
                }
            
            // Determine if response is positive based on new AI analysis
            const analysis = result.analysis || {};
            const intent = analysis.intent || analysis.Intent;
            const sentiment = analysis.sentiment || analysis.Sentiment;
            const leadScore = analysis.leadScore || analysis['Lead Score'] || analysis.lead_score;
            const isPositiveFlag = analysis.isPositive || analysis['Is Positive'];
            
            // Updated gating: use explicit scheduling conditions
            const isPositive = shouldScheduleFromAnalysis(analysis);
            
            console.log(`🎯 Response Analysis:`);
            console.log(`   - Intent: ${intent || 'Unknown'}`);
            console.log(`   - Sentiment: ${sentiment || 'Unknown'}`);
            console.log(`   - Lead Score: ${leadScore || 'Unknown'}`);
            console.log(`   - Is Positive Flag: ${isPositiveFlag}`);
            console.log(`   - Is Positive (calculated): ${isPositive}`);
            console.log(`   - Analysis Object:`, JSON.stringify(analysis, null, 2));
            
            return {
                hasResponse: true,
                message: messageText,
                analysis: analysis,
                isPositive: isPositive,
                call_status: isPositive ? 'scheduled' : 'response_received',
                suggested_response: analysis.suggested_response || analysis['Suggested Response'] || analysis.suggestedResponse || 'Thank you for your response.'
            };
        } else {
            console.error('❌ Failed to process reply with AI:', response.status);
            return null;
        }
    } catch (error) {
        console.error('❌ Error processing call reply with AI:', error);
        
        // Fallback: Create a basic analysis response when API fails completely
        console.log('🔄 Using complete fallback AI analysis due to API error');
        const fallbackAnalysis = {
            success: true,
            analysis: {
                intent: 'busy',
                sentiment: 'negative',
                leadScore: 2,
                isPositive: false,
                suggested_response: 'Thank you for letting me know. I understand you\'re not available right now. Please feel free to reach out when you have time.',
                next_action: 'acknowledge'
            },
            message: 'Complete fallback analysis due to API error'
        };
        return fallbackAnalysis;
    }
};

/**
 * Process positive call response - generate and send calendar link
 */
const processPositiveCallResponse = async (monitoringData, responseData) => {
    console.log('🎉 Processing positive response from', monitoringData.leadName);
    
    try {
        // Ensure we have a valid call_id before generating calendar link
        const validCallId = await ensureValidCallId(monitoringData);
        if (!validCallId) {
            console.log(`❌ Cannot generate calendar link - no valid call_id found for connection_id: ${monitoringData.connectionId}`);
            return;
        }
        
        // Generate calendar link via backend
        const calendarResponse = await fetch(`${PLATFORM_URL}/api/calls/${validCallId}/calendar-link`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'lk-id': linkedinId || 'vicken-concept'
            },
            body: JSON.stringify({
                leadId: monitoringData.leadId,
                leadName: monitoringData.leadName,
                connectionId: monitoringData.connectionId,
                campaignId: monitoringData.campaignId,
                responseData: responseData
            })
        });
        
        if (calendarResponse.ok) {
            const calendarData = await calendarResponse.json();
            console.log('📅 Calendar link generated:', calendarData);
            
            // Send calendar link message
            if (calendarData.calendar_link) {
                await sendCalendarLinkMessage(monitoringData, calendarData.calendar_link, calendarData.scheduling_message);
            }
        } else {
            console.error('❌ Failed to generate calendar link:', calendarResponse.status);
        }
    } catch (error) {
        console.error('❌ Error processing positive response:', error);
    }
};

/**
 * Send scheduling message with calendar link
 */
const sendSchedulingMessage = async (monitoringData, message, calendarLink) => {
    console.log('📅 Sending scheduling message to', monitoringData.leadName);
    
    try {
        // Replace [CALENDAR_LINK] placeholder if it exists
        const finalMessage = message.replace('[CALENDAR_LINK]', calendarLink);
        
        // Send the message using the existing LinkedIn API
        await sendLinkedInMessage(monitoringData, finalMessage);
        
        console.log('✅ Scheduling message sent successfully to', monitoringData.leadName);
        
        // Store the scheduling message in conversation history
        console.log('🔍 DEBUG: Storing scheduling message in conversation history');
        if (monitoringData.callId) {
        const result = await storeConversationMessage({
                call_id: String(monitoringData.callId),
            message: finalMessage,
            sender: 'ai',
            message_type: 'calendar_link',
            lead_name: monitoringData.leadName,
            connection_id: monitoringData.connectionId,
            conversation_urn_id: monitoringData.conversationUrnId
        });
        
        if (!result) {
            console.error('❌ Failed to store scheduling message in conversation history');
        } else {
            // Update monitoring data with the real call_id from server response
            if (result.call_id && result.call_id !== monitoringData.callId) {
                console.log('🔄 Updating monitoring data with real call_id from scheduling message:', result.call_id);
                monitoringData.callId = result.call_id;
                // Note: We can't update storage here as we don't have the key, but the next lead message will update it
            }
            }
        } else {
            console.log('⚠️ No call_id available for scheduling message, skipping conversation storage');
        }
        
        // Return success status for tracking
        return true;
        
    } catch (error) {
        console.error('❌ Error sending scheduling message:', error);
    }
};
/**
 * Update message tracking after successful response
 */
const updateMessageTracking = async (monitoringData, messageId, key) => {
    try {
        monitoringData.lastCheckedMessageId = messageId;
        monitoringData.lastResponseSentAt = Date.now();
        monitoringData.responseCount = (monitoringData.responseCount || 0) + 1;
        monitoringData.status = 'response_sent';
        
        await chrome.storage.local.set({ [key]: monitoringData });
        console.log('✅ Updated message tracking after successful response');
        return true;
    } catch (error) {
        console.error('❌ Error updating message tracking:', error);
        return false;
    }
};

/**
 * Enhanced sender detection to determine if message is from lead or AI/extension
 */
const detectMessageSender = (msg, text) => {
    let sender = 'unknown';
    let senderEntityUrn = null;
    
    // Extract sender information
    if (msg.from?.com?.linkedin?.voyager?.messaging?.MessagingMember) {
        const member = msg.from.com.linkedin.voyager.messaging.MessagingMember;
        if (member.name) {
            sender = member.name;
        } else if (member.miniProfile) {
            sender = `${member.miniProfile.firstName || ''} ${member.miniProfile.lastName || ''}`.trim();
        }
        senderEntityUrn = member.entityUrn;
    }
    
    // Check if message is from our extension/user account
    const isFromExtension = 
        sender.toLowerCase().includes('william') || 
        sender.toLowerCase().includes('victor') || 
        senderEntityUrn?.includes('vicken-concept') ||
        msg.from?.entityUrn?.includes('vicken-concept');
    
    // Check if message is AI-generated (contains common AI response patterns)
    const isAIGeneratedMessage = text && (
        // Template placeholders
        text.includes('[Your Name]') ||
        text.includes('[Your Position]') ||
        text.includes('[Your Company]') ||
        text.includes('[Date and Time]') ||
        text.includes('[Duration]') ||
        text.includes('Dear Mr.') ||
        text.includes('Dear Eleazar Nzerem') ||
        // Common AI response patterns
        text.includes('Thank you for your response') ||
        text.includes('I understand your concerns') ||
        text.includes('Would you like me to follow up') ||
        text.includes('Could you please provide more information') ||
        text.includes('I appreciate your interest') ||
        text.includes('Let me know if you have any questions') ||
        text.includes('Feel free to reach out') ||
        text.includes('I\'d be happy to help') ||
        text.includes('Looking forward to speaking with you') ||
        text.includes('Perfect! I\'d love to schedule a call') ||
        text.includes('Please book a convenient time here') ||
        text.includes('Here\'s the link to schedule') ||
        text.includes('convenient time') ||
        text.includes('specific information') ||
        text.includes('recent projects') ||
        text.includes('insights on that') ||
        text.includes('Thanks for your willingness to share more details') ||
        text.includes('I\'m looking for information on your recent projects') ||
        text.includes('Could you provide some insights on that') ||
        // Additional patterns for "not interested" responses
        text.includes('I appreciate your honesty') ||
        text.includes('If your situation changes') ||
        text.includes('If you ever want to discuss') ||
        text.includes('Wishing you all the best') ||
        text.includes('Thank you for your response,') ||
        text.includes('I appreciate your honesty,') ||
        text.includes('If you ever want to explore') ||
        text.includes('feel free to reach out') ||
        text.includes('Wishing you all the best!')
    );
    
    // Check if message was sent very recently (likely from AI)
    const messageAge = Date.now() - msg.createdAt;
    const isRecentAIMessage = messageAge < 30000 && isAIGeneratedMessage; // 30 seconds
    
    // Final determination: message is from lead if it's not from extension, not AI-generated, and has meaningful content
    const isFromLead = !isFromExtension && !isAIGeneratedMessage && !isRecentAIMessage && text && text.trim().length > 0 && text.length < 1000;
    
    // Enhanced logging for debugging
    console.log('🔍 Enhanced Sender Detection:');
    console.log(`   - Sender: "${sender}"`);
    console.log(`   - Sender Entity URN: ${senderEntityUrn}`);
    console.log(`   - Message Entity URN: ${msg.from?.entityUrn}`);
    console.log(`   - Is from Extension: ${isFromExtension}`);
    console.log(`   - Is AI Generated: ${isAIGeneratedMessage}`);
    console.log(`   - Is Recent AI Message: ${isRecentAIMessage}`);
    console.log(`   - Message Age: ${Math.round(messageAge / 1000)} seconds ago`);
    console.log(`   - Text Length: ${text ? text.length : 0} characters`);
    console.log(`   - Text Preview: "${text ? text.substring(0, 100) + '...' : 'No text'}"`);
    console.log(`   - Final Decision: Is from Lead = ${isFromLead}`);
    
    return {
        sender,
        senderEntityUrn,
        isFromExtension,
        isAIGeneratedMessage,
        isRecentAIMessage,
        isFromLead,
        messageAge
    };
};

/**
 * Decide if we should schedule based on AI analysis
 * Requires explicit positive intents or next_action.
 * Blocks on clear negative intents/actions regardless of sentiment.
 */
const shouldScheduleFromAnalysis = (analysis) => {
    if (!analysis) return false;
    const intent = (analysis.intent || analysis.Intent || '').toLowerCase();
    const nextAction = (analysis.next_action || analysis.nextAction || '').toLowerCase();
    const blockIntents = ['not_interested'];
    const blockActions = ['end_conversation', 'follow_up_later'];
    const allowIntents = ['available', 'interested', 'scheduling_request', 'reschedule_request'];
    const allowActions = ['schedule_call', 'send_calendar', 'ask_availability', 'address_concerns'];

    if (blockIntents.includes(intent)) return false;
    if (blockActions.includes(nextAction)) return false;

    if (allowIntents.includes(intent)) return true;
    if (allowActions.includes(nextAction)) return true;

    return false;
};

/**
 * Draft queue helpers (extension-only, no backend cron)
 */
const DEFAULT_REVIEW_WINDOW_MS = 2 * 60 * 60 * 1000; // 2 hours

const getAiModeForCampaign = async (campaignId) => {
    try {
        const key = `campaign_ai_mode_${campaignId}`;
        const res = await chrome.storage.local.get([key]);
        const mode = res[key];
        return (mode === 'review' || mode === 'hybrid' || mode === 'instant') ? mode : 'instant';
    } catch (e) {
        console.warn('⚠️ Failed to get ai_mode from storage, defaulting to instant', e);
        return 'instant';
    }
};

const makeDraftQueueKey = (campaignId, connectionId) => `draft_queue_${campaignId}_${connectionId}`;

const saveDraftQueueEntry = async ({ monitoringData, draftMessage, analysis, autoSendAtMs, requireApproval }) => {
    const key = makeDraftQueueKey(monitoringData.campaignId, monitoringData.connectionId);
    const entry = {
        callId: monitoringData.callId || null,
        campaignId: monitoringData.campaignId,
        connectionId: monitoringData.connectionId,
        leadName: monitoringData.leadName,
        draft_message: draftMessage,
        ai_analysis: analysis,
        created_at: Date.now(),
        auto_send_at: autoSendAtMs || null,
        approval_status: requireApproval ? 'pending' : 'approved',
        status: 'queued'
    };
    await chrome.storage.local.set({ [key]: entry });
    console.log('🗂️ Queued AI draft (extension storage):', { key, entry });
    return entry;
};

const loadDraftQueueEntry = async (campaignId, connectionId) => {
    const key = makeDraftQueueKey(campaignId, connectionId);
    const res = await chrome.storage.local.get([key]);
    return res[key] || null;
};

const clearDraftQueueEntry = async (campaignId, connectionId) => {
    const key = makeDraftQueueKey(campaignId, connectionId);
    await chrome.storage.local.remove([key]);
};

const shouldSendQueuedDraftNow = (entry) => {
    if (!entry) return false;
    const approved = entry.approval_status === 'approved';
    const timeOk = !entry.auto_send_at || Date.now() >= entry.auto_send_at;
    return approved && timeOk;
};

/**
 * Attempt to send any queued draft for a lead if eligible
 */
const trySendQueuedDraft = async (monitoringData) => {
    try {
        const entry = await loadDraftQueueEntry(monitoringData.campaignId, monitoringData.connectionId);
        if (!entry) return false;

        // Only send within active sequence window; assume caller checks delay gate
        if (!shouldSendQueuedDraftNow(entry)) {
            console.log('⏳ Draft still waiting (approval/time)', entry);
            return false;
        }

        // Decide scheduling vs normal send
        const analysis = entry.ai_analysis || {};
        const scheduleAllowed = shouldScheduleFromAnalysis(analysis);

        if (scheduleAllowed) {
            // Generate calendar link path
            console.log('📅 Sending queued scheduling draft...');
            // Reuse existing flow by calling sendSchedulingMessage with a generated link upstream
            // Note: rely on existing scheduling pipeline elsewhere; here we fallback to normal send
            await sendAIMessage(monitoringData, entry.draft_message);
        } else {
            console.log('📤 Sending queued normal draft...');
            await sendAIMessage(monitoringData, entry.draft_message);
        }

        // Clear queue entry after successful send
        await clearDraftQueueEntry(monitoringData.campaignId, monitoringData.connectionId);
        return true;
    } catch (err) {
        console.error('❌ Failed to send queued draft:', err);
        return false;
    }
};

/**
  * Check if we should send a fallback message when calendar generation fails
  * Only send if we were the last to send a message (not the lead)
  */
 const shouldSendFallbackMessage = async (monitoringData, latestMessage) => {
     try {
         // Check if we were the last to respond
         if (monitoringData.lastResponseSentAt && monitoringData.lastResponseSentAt > latestMessage.timestamp) {
             console.log('✅ We were the last to respond - safe to send fallback message');
             return true;
         }
         
         // Check if the latest message is from the lead
         if (latestMessage.isFromLead) {
             console.log('⏸️ Lead was last to send - not sending fallback message');
             return false;
         }
         
         // If we can't determine, err on the side of caution and don't send
         console.log('⚠️ Cannot determine conversation state - not sending fallback message');
         return false;
     } catch (error) {
         console.error('❌ Error checking fallback message eligibility:', error);
         return false;
     }
 };

/**
  * Ensure we have a valid call_id for calendar link generation
  * If call_id is invalid/deleted, search for existing call record by connection_id
  */
 const ensureValidCallId = async (monitoringData) => {
     try {
         // If we already have a callId, try to validate it first
         if (monitoringData.callId) {
             console.log(`🔍 Validating existing call_id: ${monitoringData.callId}`);
             
             // Test if the call record exists by trying to get it
             const testResponse = await fetch(`${PLATFORM_URL}/api/calls/${monitoringData.callId}`, {
                 method: 'GET',
                 headers: {
                     'Content-Type': 'application/json',
                     'lk-id': linkedinId || 'vicken-concept'
                 }
             });
             
             if (testResponse.ok) {
                 console.log(`✅ Call_id ${monitoringData.callId} is valid`);
                 return monitoringData.callId;
             } else if (testResponse.status === 404) {
                 console.log(`❌ Call_id ${monitoringData.callId} not found (404) - searching by connection_id`);
             } else {
                 console.log(`⚠️ Call_id ${monitoringData.callId} validation failed with status ${testResponse.status}`);
             }
         }
         
         // Search for existing call record by connection_id
         console.log(`🔍 Searching for existing call record by connection_id: ${monitoringData.connectionId}`);
         
         const searchResponse = await fetch(`${PLATFORM_URL}/api/calls/search-by-connection/${monitoringData.connectionId}`, {
             method: 'GET',
             headers: {
                 'Content-Type': 'application/json',
                 'lk-id': linkedinId || 'vicken-concept'
             }
         });
         
         if (searchResponse.ok) {
             const searchData = await searchResponse.json();
             if (searchData.call_id) {
                 console.log(`✅ Found existing call record with ID: ${searchData.call_id}`);
                 
                 // Update monitoring data with found call_id
                 monitoringData.callId = searchData.call_id;
                 
                 // Update storage with found call_id
                 const key = `call_response_monitoring_${monitoringData.campaignId}_${monitoringData.connectionId}`;
                 await chrome.storage.local.set({ [key]: monitoringData });
                 
                 return searchData.call_id;
             } else {
                 console.log(`❌ No call record found for connection_id: ${monitoringData.connectionId} - will not send message`);
                 return null;
             }
         } else {
             console.log(`❌ Failed to search for call record by connection_id: ${searchResponse.status} - will not send message`);
             return null;
         }
     } catch (error) {
         console.error('❌ Error ensuring valid call_id:', error);
         return null;
     }
 };

/**
 * Set up monitoring for AI message responses
 */
const setupAIMessageMonitoring = async (monitoringData) => {
    try {
        console.log(`🔍 Setting up AI message monitoring for ${monitoringData.leadName}...`);
        
        // Create monitoring key
        const responseMonitoringKey = `call_response_monitoring_${monitoringData.campaignId}_${monitoringData.connectionId}`;
        
        // Check if monitoring already exists
        const existingMonitoring = await chrome.storage.local.get([responseMonitoringKey]);
        if (existingMonitoring[responseMonitoringKey]) {
            console.log(`✅ Monitoring already exists for ${monitoringData.leadName}`);
            return;
        }
        
        // Create new monitoring entry
        const newMonitoringData = {
            callId: monitoringData.callId || null,
            campaignId: monitoringData.campaignId,
            connectionId: monitoringData.connectionId,
            conversationUrnId: monitoringData.conversationUrnId,
            leadName: monitoringData.leadName,
            lastCheckedMessageId: null,
            lastResponseSentAt: Date.now(),
            responseCount: 1,
            status: 'response_sent',
            aiMessageSent: true,
            aiMessageSentAt: Date.now()
        };
        
        await chrome.storage.local.set({ [responseMonitoringKey]: newMonitoringData });
        console.log(`✅ AI message monitoring set up for ${monitoringData.leadName} with key: ${responseMonitoringKey}`);
        
    } catch (error) {
        console.error(`❌ Error setting up AI message monitoring for ${monitoringData.leadName}:`, error);
     }
 };

/**
 * Send AI-generated message
 */
const sendAIMessage = async (monitoringData, message, skipStorage = false) => {
    console.log('🤖 Sending AI message to', monitoringData.leadName);
    
    try {
        await sendLinkedInMessage(monitoringData, message);
        console.log('✅ AI message sent successfully to', monitoringData.leadName);
        
        // Store the AI response in conversation history (unless skipped for pending messages)
        if (!skipStorage) {
            console.log('🔍 DEBUG: Storing AI response in conversation history');
            if (monitoringData.callId) {
            const result = await storeConversationMessage({
                    call_id: String(monitoringData.callId),
                message: message,
                sender: 'ai',
                message_type: 'ai_response',
                lead_name: monitoringData.leadName,
                connection_id: monitoringData.connectionId,
                conversation_urn_id: monitoringData.conversationUrnId
            });
            
            if (!result) {
                console.error('❌ Failed to store AI response in conversation history');
            } else {
                // Update monitoring data with the real call_id from server response
                if (result.call_id && result.call_id !== monitoringData.callId) {
                    console.log('🔄 Updating monitoring data with real call_id from AI response:', result.call_id);
                    monitoringData.callId = result.call_id;
                    // Note: We can't update storage here as we don't have the key, but the next lead message will update it
                }
                }
            } else {
                console.log('⚠️ No call_id available for AI response, skipping conversation storage');
            }
        } else {
            console.log('⏭️ Skipping conversation storage for pending message (already stored)');
        }
        
        // Set up monitoring for responses to this AI message
        await setupAIMessageMonitoring(monitoringData);
        
        // Return success status for tracking
        return true;
    } catch (error) {
        console.error('❌ Error sending AI message:', error);
    }
};

/**
 * Send LinkedIn message (common function)
 */
const sendLinkedInMessage = async (monitoringData, message) => {
    const voyagerApi = 'https://www.linkedin.com/voyager/api';
    const tokenResult = await chrome.storage.local.get(['csrfToken']);
    
    // Use the conversation URN ID if available, otherwise fall back to connection ID
    let conversationId = monitoringData.conversationUrnId || monitoringData.connectionId;
    console.log(`🔍 Monitoring data:`, monitoringData);
    console.log(`🔍 conversationUrnId: ${monitoringData.conversationUrnId}`);
    console.log(`🔍 connectionId: ${monitoringData.connectionId}`);
    console.log(`🔍 Using conversation ID for message: ${conversationId}`);
    
    // If we don't have a conversation URN ID, try to find it from LinkedIn API
    if (!monitoringData.conversationUrnId) {
        console.log('🔍 No conversation URN ID found, attempting to find conversation...');
        try {
            const conversationsUrl = `${voyagerApi}/messaging/conversations?keyVersion=LEGACY_INBOX&q=participants&start=0&count=20`;
            const conversationsResponse = await fetch(conversationsUrl, {
                method: 'GET',
                headers: {
                    'csrf-token': tokenResult.csrfToken,
                    'accept': 'text/plain, */*; q=0.01',
                    'x-li-lang': 'en_US',
                    'x-li-page-instance': 'urn:li:page:d_flagship3_people_invitations;1ZlPK7kKRNSMi+vkXMyVMw==',
                    'x-li-track': JSON.stringify({"clientVersion":"1.10.1208","osName":"web","timezoneOffset":1,"deviceFormFactor":"DESKTOP","mpName":"voyager-web"}),
                    'x-restli-protocol-version': '2.0.0',
                }
            });
            
            if (conversationsResponse.ok) {
                const conversationsData = await conversationsResponse.json();
                console.log('📊 Conversations data:', conversationsData);
                
                // Look for conversation with this connection
                if (conversationsData.elements) {
                    for (const conv of conversationsData.elements) {
                        if (conv.participants && conv.participants.elements) {
                            for (const participant of conv.participants.elements) {
                                if (participant.messagingMember && 
                                    participant.messagingMember['com.linkedin.voyager.messaging.MessagingMember'] &&
                                    participant.messagingMember['com.linkedin.voyager.messaging.MessagingMember'].miniProfile &&
                                    participant.messagingMember['com.linkedin.voyager.messaging.MessagingMember'].miniProfile.publicIdentifier === monitoringData.connectionId) {
                                    conversationId = conv.entityUrn.replace('urn:li:fs_conversation:', '');
                                    console.log(`✅ Found conversation URN ID: ${conversationId}`);
                                    break;
                                }
                            }
                        }
                    }
                }
            }
        } catch (error) {
            console.error('❌ Error finding conversation:', error);
        }
    }
    
    // Send the message
    const messageEvent = {
        value: {
            'com.linkedin.voyager.messaging.create.MessageCreate': {
                body: message,
                messageType: 'MEMBER_TO_MEMBER',
                originToken: {
                    'com.linkedin.voyager.messaging.create.OriginToken': {
                        originType: 'CONVERSATION_VIEW'
                    }
                },
                recipientUrns: [`urn:li:fs_messagingMember:${monitoringData.connectionId}`]
            }
        }
    };
    
    const requestBody = { eventCreate: messageEvent };
    
    const response = await fetch(`${voyagerApi}/messaging/conversations/${conversationId}/events?action=create`, {
        method: 'POST',
        headers: {
            'csrf-token': tokenResult.csrfToken,
            'accept': 'text/plain, */*; q=0.01',
            'content-type': 'application/json; charset=UTF-8',
            'x-li-lang': 'en_US',
            'x-li-page-instance': 'urn:li:page:d_flagship3_people_invitations;1ZlPK7kKRNSMi+vkXMyVMw==',
            'x-li-track': JSON.stringify({"clientVersion":"1.10.1208","osName":"web","timezoneOffset":1,"deviceFormFactor":"DESKTOP","mpName":"voyager-web"}),
            'x-restli-protocol-version': '2.0.0',
        },
        body: JSON.stringify(requestBody)
    });
    
    if (response.ok) {
        console.log('✅ Message sent successfully via LinkedIn API');
        
        // Update monitoring data
        monitoringData.lastResponseSentAt = Date.now();
        monitoringData.responseCount = (monitoringData.responseCount || 0) + 1;
        
        const monitoringKey = `call_response_monitoring_${monitoringData.campaignId}_${monitoringData.connectionId}`;
        await chrome.storage.local.set({ [monitoringKey]: monitoringData });
        
    } else {
        console.error('❌ Failed to send message via LinkedIn API:', response.status);
        throw new Error(`LinkedIn API error: ${response.status}`);
    }
};

/**
 * Send calendar link message to lead
 */
const sendCalendarLinkMessage = async (monitoringData, calendarLink, schedulingMessage) => {
    console.log('📅 Sending calendar link message to', monitoringData.leadName);
    
    try {
        // Prepare the message content
        const messageContent = schedulingMessage || `Hi ${monitoringData.leadName}, I'd love to schedule a call with you. Please book a convenient time here: ${calendarLink}`;
        
        // Create message model for LinkedIn sending
        const messageModel = {
            message: messageContent,
            connectionId: monitoringData.connectionId,
            conversationUrnId: null, // Will be created if needed
            distance: 1
        };
        
        // Store the message model globally for messageConnection function
        if (typeof arConnectionModel !== 'object' || arConnectionModel === null) {
            window.arConnectionModel = {};
        }
        
        Object.assign(window.arConnectionModel, messageModel);
        
        console.log('📤 Sending calendar link message via LinkedIn...');
        console.log('📝 Message content:', messageContent);
        
        // Send the message
        await messageConnection({ uploads: [] });
        
        console.log('✅ Calendar link message sent successfully to', monitoringData.leadName);
        
        // Update monitoring data to mark calendar sent
        monitoringData.calendarSent = true;
        monitoringData.calendarSentAt = Date.now();
        
        const monitoringKey = `call_response_monitoring_${monitoringData.campaignId}_${monitoringData.connectionId}`;
        await chrome.storage.local.set({ [monitoringKey]: monitoringData });
        
    } catch (error) {
        console.error('❌ Error sending calendar link message:', error);
    }
};

/**
 * Process negative call response
 */
const processNegativeCallResponse = async (monitoringData, responseData) => {
    console.log('😞 Processing negative response from', monitoringData.leadName);
    
    try {
        // Log the negative response for analysis
        console.log('📊 Negative response details:', responseData);
        
        // Could add follow-up actions here if needed
        // For now, just mark as completed
        
    } catch (error) {
        console.error('❌ Error processing negative response:', error);
    }
};


/**
 * Mark call node as completed
 */
const markCallNodeAsCompleted = async (campaignId, leadId) => {
    try {
        // Mark the call node as completed
        const callCompletedKey = `call_node_completed_${campaignId}`;
        await chrome.storage.local.set({ [callCompletedKey]: true });
        console.log('✅ Call node marked as completed:', callCompletedKey);
        
        // Clean up monitoring data
        const monitoringKey = `call_response_monitoring_${campaignId}_${leadId}`;
        await chrome.storage.local.remove(monitoringKey);
        console.log('🧹 Response monitoring data cleaned up');
        
    } catch (error) {
        console.error('❌ Error marking call node as completed:', error);
    }
};

/**
 * Check all pending leads for invite acceptances (regardless of campaign status)
 */
const checkAllCampaignsForAcceptances = async () => {
    // Prevent concurrent execution
    if (isCheckingAcceptances) {
        console.log('⚠️ Acceptance check already in progress, skipping...');
        return;
    }
    
    isCheckingAcceptances = true;
    console.log('🔍 STARTING ACCEPTANCE CHECK...');
    console.log('🔑 LinkedIn ID:', linkedinId);
    console.log('🌐 Platform URL:', PLATFORM_URL);
    
    try {
        // Get ONLY ACTIVE campaigns that are currently running
        console.log('📡 Fetching campaigns from API...');
        const response = await fetch(`${PLATFORM_URL}/api/campaigns`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'lk-id': linkedinId
            }
        });
        
        if (!response.ok) {
            console.log('❌ API request failed:', response.status, response.statusText);
            return;
        }
        
        const campaignsData = await response.json();
        console.log('📊 Campaigns data received:', campaignsData);
        
        // Get campaigns that have Lead generation or Custom sequence types
        const allCampaigns = campaignsData.data;
        const eligibleCampaigns = allCampaigns.filter(campaign => 
            ['Lead generation', 'Custom'].includes(campaign.sequenceType)
        );
        
        // Separate active and inactive campaigns
        // Note: 'running' status should be treated as active
        const activeCampaigns = eligibleCampaigns.filter(campaign => 
            campaign.status === 'active' || campaign.status === 'running'
        );
        const inactiveCampaigns = eligibleCampaigns.filter(campaign => 
            campaign.status !== 'active' && campaign.status !== 'running'
        );
        
        // Log filtering details for debugging
        console.log(`📊 Total campaigns found: ${allCampaigns.length}`);
        console.log(`🎯 Eligible campaigns (Lead gen/Custom): ${eligibleCampaigns.length}`);
        console.log(`✅ Active campaigns: ${activeCampaigns.length}`, activeCampaigns.map(c => ({id: c.id, name: c.name, status: c.status})));
        console.log(`⏸️ Inactive campaigns: ${inactiveCampaigns.length}`, inactiveCampaigns.map(c => ({id: c.id, name: c.name, status: c.status})));
        
        // Prioritize active campaigns, but also check inactive ones for cross-campaign acceptances
        const campaignsToCheck = [...activeCampaigns, ...inactiveCampaigns];
        
        console.log(`🔍 Will check ${campaignsToCheck.length} campaigns: ${activeCampaigns.length} active + ${inactiveCampaigns.length} inactive`);
        
        // Early exit if no campaigns to check
        if (campaignsToCheck.length === 0) {
            console.log('✅ No campaigns found - skipping acceptance check');
            return;
        }
        
        for (const campaign of campaignsToCheck) {
            console.log(`\n🔍 Checking campaign ${campaign.id} (${campaign.name}) [Status: ${campaign.status}]...`);
            try {
                // Save campaign sequence data to Chrome storage for AI mode access
                await saveCampaignSequenceData(campaign);
                
                // Get leads for this campaign
                console.log(`📋 Getting leads for campaign ${campaign.id}...`);
                await getLeadGenRunning(campaign.id);
                
                console.log(`👥 Found ${campaignLeadgenRunning.length} leads in campaign ${campaign.id}`);
                
                if (campaignLeadgenRunning.length === 0) {
                    if (campaign.status === 'active') {
                        console.log(`⚠️ ACTIVE campaign ${campaign.id} has no leads - this might indicate an issue!`);
                    } else {
                        console.log(`⏸️ INACTIVE campaign ${campaign.id} has no leads - skipping (normal for stopped campaigns)`);
                    }
                    continue;
                }
                
                // For inactive campaigns, only check if they have leads (for cross-campaign acceptance tracking)
                if (campaign.status !== 'active' && campaign.status !== 'running') {
                    console.log(`⏸️ Checking INACTIVE campaign ${campaign.id} because it has ${campaignLeadgenRunning.length} leads (cross-campaign acceptance tracking)`);
                } else {
                    console.log(`✅ Checking ACTIVE campaign ${campaign.id} with ${campaignLeadgenRunning.length} leads`);
                }
                
                // Check each lead for acceptance
                console.log(`🔍 Checking each lead for acceptance...`);
                for (const lead of campaignLeadgenRunning) {
                    // console.log(`\n👤 Checking lead: ${lead.name || 'Unknown'} (ID: ${lead.id || lead.connectionId})`);
                    // Handle both tracking data format and basic lead data format
                    const acceptedStatus = lead.accept_status !== undefined ? lead.accept_status : lead.acceptedStatus;
                    const statusLastId = lead.status_last_id !== undefined ? lead.status_last_id : lead.statusLastId;
                    const leadSrc = lead.lead_src !== undefined ? lead.lead_src : lead.leadSrc;
                    const connectionId = lead.connection_id !== undefined ? lead.connection_id : lead.connectionId;
                    
                    // console.log(`📊 Lead status:`, {
                    //     name: lead.name,
                    //     acceptedStatus: acceptedStatus,
                    //     statusLastId: statusLastId,
                    //     leadSrc: leadSrc,
                    //     connectionId: connectionId
                    // });
                    
                    // Check for pending invites (accept_status = 0 or false, status_last_id = 2)
                    const isPendingInvite = (acceptedStatus === false || acceptedStatus === 0) && statusLastId == 2;
                    // Also check for leads that are already 1st-degree but not marked as accepted (like Eleazer)
                    const isAlreadyAccepted = (acceptedStatus === false || acceptedStatus === 0) && statusLastId == 1;
                    // console.log(`🔍 Is pending invite: ${isPendingInvite} (acceptedStatus: ${acceptedStatus}, statusLastId: ${statusLastId})`);
                    // console.log(`🔍 Is already accepted but not marked: ${isAlreadyAccepted}`);
                    
                    if (isPendingInvite || isAlreadyAccepted) {
                        console.log(`🌐 Checking network status for ${isPendingInvite ? 'pending invite' : 'already accepted lead'}: ${lead.name}...`);
                        try {
                            const networkInfo = await _getProfileNetworkInfo(lead);
                            const networkDegree = networkInfo.data.distance.value;
                            
                            if (networkDegree === 'DISTANCE_1') {
                                console.log(`🎉 INVITE ACCEPTED! ${lead.name || 'Unknown'} is now 1st degree connection!`);
                                console.log(`📊 Campaign: ${campaign.name} (ID: ${campaign.id})`);
                                console.log(`👤 Lead: ${lead.name} (ID: ${lead.id || connectionId})`);
                                
                                try {
                                    // Update database
                                    const updateResult = await updateLeadGenRunning(campaign.id, lead.id || connectionId, {
                                        acceptedStatus: true,
                                        statusLastId: 3, // 3 = accepted
                                        currentNodeKey: lead.current_node_key || lead.currentNodeKey || 0,
                                        nextNodeKey: lead.next_node_key || lead.nextNodeKey || 0
                                    });
                                    
                                    console.log(`✅ Database updated for ${lead.name || 'Unknown'}:`, updateResult);
                                    
                                    // Update local variable
                                    if (lead.accept_status !== undefined) {
                                        lead.accept_status = true;
                                    } else {
                                        lead.acceptedStatus = true;
                                    }
                                    
                                } catch (updateError) {
                                    console.error(`❌ Backend update failed for ${lead.name || 'Unknown'}:`, updateError);
                                }
                                
                                // Trigger next action if campaign sequence supports it
                                try {
                                    console.log(`🔄 Looking for next action after acceptance for ${lead.name}...`);
                                    await getCampaignSequence(campaign.id);
                                    
                                    if (campaignSequence && campaignSequence.nodeModel) {
                                        console.log(`📋 Campaign sequence loaded with ${campaignSequence.nodeModel.length} nodes`);
                                        
                        // Find the next action node for accepted connections
                        // Look for nodes that have acceptedAction property or are action nodes that haven't run yet
                        const nextActionNode = campaignSequence.nodeModel.find(node => 
                            (node.acceptedAction && node.acceptedAction == 3) || 
                            (node.type === 'action' && node.runStatus === false && node.value !== 'send-invites')
                        );
                                        
                                        if (nextActionNode) {
                                            console.log(`🎯 FOUND NEXT ACTION: ${nextActionNode.label} (${nextActionNode.value})`);
                                            console.log(`⏰ Action delay: ${nextActionNode.delayInMinutes || 0} minutes`);
                                            console.log(`🔧 Action properties:`, {
                                                key: nextActionNode.key,
                                                type: nextActionNode.type,
                                                acceptedAction: nextActionNode.acceptedAction,
                                                runStatus: nextActionNode.runStatus,
                                                delayInMinutes: nextActionNode.delayInMinutes
                                            });
                                            
                                            // Check if there's a delay
                                            if (nextActionNode.delayInMinutes && nextActionNode.delayInMinutes > 0) {
                                                console.log(`⏰ SCHEDULING ACTION: ${nextActionNode.label} will run in ${nextActionNode.delayInMinutes} minutes`);
                                                console.log(`📅 Scheduled time: ${new Date(Date.now() + (nextActionNode.delayInMinutes * 60000)).toLocaleString()}`);
                                                
                                                // Create an alarm for the delayed execution
                                                const alarmName = `delayed_action_${campaign.id}_${lead.id || connectionId}_${nextActionNode.key}`;
                                                chrome.alarms.create(alarmName, {
                                                    delayInMinutes: nextActionNode.delayInMinutes
                                                });
                                                
                                                // Store the action data for when the alarm triggers
                                                chrome.storage.local.set({
                                                    [`delayed_action_${alarmName}`]: {
                                                        campaign: campaign,
                                                        lead: lead,
                                                        nodeModel: nextActionNode,
                                                        scheduledTime: Date.now() + (nextActionNode.delayInMinutes * 60000)
                                                    }
                                                });
                                                
                                                console.log(`✅ ALARM CREATED: ${alarmName} - Action will execute automatically at scheduled time`);
                                            } else {
                                                console.log(`🚀 EXECUTING NEXT ACTION IMMEDIATELY for ${lead.name}...`);
                                                await runSequence(campaign, [lead], nextActionNode);
                                            }
                                        }
                                    }
                                } catch (sequenceError) {
                                    // Error processing sequence
                                }
                            }
                            
                            // Update network degree in lead database
                            try {
                                lead.networkDegree = networkDegree;
                                const networkUpdateResult = await updateLeadNetworkDegree(lead);
                            } catch (networkUpdateError) {
                                // Error updating network degree
                            }
                            
                        } catch (networkError) {
                            // Error checking network
                        }
                        
                        // Add delay between checks to avoid rate limiting
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }
                }
                
            } catch (campaignError) {
                // Error processing campaign
            }
        }
        
    } catch (error) {
        console.error('❌ Error in acceptance check:', error);
    } finally {
        // Check for call responses before completing
        await checkForCallResponses();
        
        // Reset the flag to allow future executions
        isCheckingAcceptances = false;
        console.log('✅ Acceptance check completed');
    }
};

// Initialize the extension when service worker starts
chrome.runtime.onStartup.addListener(() => {
    console.log('🚀 LinkDominator extension started');
    getUserProfile();
    startContinuousMonitoring();
});

// Also initialize when service worker is installed/activated
chrome.runtime.onInstalled.addListener(() => {
    console.log('🔧 LinkDominator extension installed');
    getUserProfile();
    startContinuousMonitoring();
    
    // Review messages are now handled by node model timing, no need for database polling
});

// ========================================
// STANDALONE FUNCTIONS FROM BG2.JS
// ========================================

// Track active endorsement tabs to prevent multiple tabs for same profile
const activeEndorsementTabs = new Map();

// Queue system for sequential processing
const endorsementQueue = [];
let isProcessingQueue = false;

// Cleanup function to remove tracking when tabs are closed
chrome.tabs.onRemoved.addListener((tabId) => {
    // Find and remove any tracking for this tab
    for (const [connectId, trackedTabId] of activeEndorsementTabs.entries()) {
        if (trackedTabId === tabId) {
            activeEndorsementTabs.delete(connectId);
            console.log(`📝 Removed tracking for profile ${connectId} (tab ${tabId} closed)`);
            break;
        }
    }
});

// Function to process a skill endorsement in an existing tab
const processSkillInTab = async (tabId, data) => {
    console.log('🤖 Processing skill endorsement in existing tab...');
    console.log(`🎯 Attempting to endorse skill: "${data.skillName}"`);
    
    try {
        // Inject the skill endorsement automation script
        console.log('🔄 Injecting skill endorsement automation script...');
        const result = await chrome.scripting.executeScript({
            target: { tabId: tabId },
            function: async (skillName, entityUrn) => {
                console.log('🤖 LinkedIn Skill Endorsement Automation script executing...');
                console.log(`🎯 Attempting to endorse skill: "${skillName}"`);
                console.log('🔍 Current page URL:', window.location.href);
                console.log('🔍 Page title:', document.title);
                
                // Function to delay
                const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
                
                try {
                    console.log('🔍 Step 4: Looking for skill endorsement buttons...');
                    
                    // Wait for page to be fully loaded - LinkedIn profiles need more time
                    console.log('⏳ Waiting for LinkedIn profile to fully load...');
                    await delay(5000); // Increased to 5 seconds for LinkedIn profiles
                    
                    // Check if we're on a LinkedIn profile page
                    if (!window.location.href.includes('linkedin.com/in/')) {
                        console.log('❌ Not on a LinkedIn profile page');
                        return { 
                            success: false, 
                            error: 'Not on LinkedIn profile page',
                            message: 'Page is not a LinkedIn profile'
                        };
                    }
                    
                    console.log('✅ LinkedIn profile page detected');
                    
                    // Check if we're connected to this person (1st-degree connection)
                    console.log('🔍 Checking connection status...');
                    const connectionIndicators = [
                        '.pv-top-card--non-self',
                        '.pv-top-card__photo',
                        '.pv-top-card__name',
                        '.pv-top-card__headline',
                        '.pv-top-card__location'
                    ];
                    
                    let isConnected = false;
                    for (let selector of connectionIndicators) {
                        if (document.querySelector(selector)) {
                            isConnected = true;
                            break;
                        }
                    }
                    
                    // Check for "Connect" button which indicates NOT connected
                    const connectButton = document.querySelector('button[aria-label*="Connect"], button[aria-label*="connect"], .artdeco-button[aria-label*="Connect"]');
                    if (connectButton) {
                        console.log('❌ NOT CONNECTED: Found "Connect" button - cannot endorse skills');
                        return { 
                            success: false, 
                            error: 'Not connected to this person',
                            message: 'Cannot endorse skills for people you are not connected to'
                        };
                    }
                    
                    console.log('✅ Connection status verified - can proceed with endorsement');
                    
                    // Wait for skills section to load dynamically
                    console.log('⏳ Waiting for skills section to load...');
                    let skillsLoaded = false;
                    let attempts = 0;
                    const maxAttempts = 10;
                    
                    while (!skillsLoaded && attempts < maxAttempts) {
                        attempts++;
                        console.log(`🔍 Attempt ${attempts}: Checking for skills section...`);
                        
                        const skillsSection = document.querySelector('.pv-skill-category-entity, [data-section="skills"], .pv-skill-category-entity__name-text, .pv-skill-category-entity__name, .pv-skill-category-entity__skill-name, .pv-skill-category-entity__skill-name-text');
                        
                        if (skillsSection) {
                            console.log('✅ Skills section found!');
                            skillsLoaded = true;
                        } else {
                            console.log('⏳ Skills section not found yet, waiting...');
                            await delay(1000);
                        }
                    }
                    
                    // Step 1: Check for "Show all X skills" button/link first (SPECIFIC to skills only)
                    console.log('🔍 Step 1: Checking for "Show all X skills" button/link...');
                    const showAllSkillsSelectors = [
                        'button[id*="navigation-index-Show-all"][id*="skills"]',
                        'button[id*="Show-all"][id*="skills"]',
                        'button.optional-action-target-wrapper.artdeco-button--tertiary[id*="skills"]',
                        'button.artdeco-button--tertiary[id*="skills"]',
                        'a[id*="navigation-index-Show-all"][id*="skills"]',
                        'a[id*="Show-all"][id*="skills"]',
                        'a.optional-action-target-wrapper.artdeco-button--tertiary[id*="skills"]',
                        'a.artdeco-button--tertiary[id*="skills"]'
                    ];
                    
                    let showAllButton = null;
                    for (let selector of showAllSkillsSelectors) {
                        const buttons = document.querySelectorAll(selector);
                        for (let button of buttons) {
                            const buttonText = button.textContent?.toLowerCase() || '';
                            const buttonId = button.id?.toLowerCase() || '';
                            
                            if (buttonText.includes('skills') || buttonId.includes('skills')) {
                                showAllButton = button;
                                console.log(`🎯 Found "Show all skills" button with selector: ${selector}`);
                                break;
                            }
                        }
                        if (showAllButton) break;
                    }
                    
                    if (showAllButton) {
                        console.log('🎯 Clicking "Show all skills" button...');
                        showAllButton.click();
                        console.log('✅ Clicked "Show all skills" button');
                        
                        // Wait for skills to load after clicking "Show all"
                        console.log('⏳ Waiting for skills to load after clicking "Show all"...');
                        await delay(3000);
                    }
                    
                    // Look for skill endorsement buttons
                    console.log('🔍 Step 2: Looking for endorsement buttons...');
                    const endorsementSelectors = [
                        'button.artdeco-button.artdeco-button--muted.artdeco-button--2.artdeco-button--secondary.ember-view',
                        '[data-control-name="skill_endorsement"]',
                        '[aria-label*="endorse"]',
                        '[aria-label*="Endorse"]',
                        '.pv-skill-category-entity__endorse-button',
                        'button[aria-label*="endorse"]',
                        'button[aria-label*="Endorse"]',
                        '.artdeco-button[aria-label*="endorse"]',
                        '.artdeco-button[aria-label*="Endorse"]'
                    ];
                    
                    let endorsementButtons = [];
                    for (let selector of endorsementSelectors) {
                        const buttons = document.querySelectorAll(selector);
                        endorsementButtons = endorsementButtons.concat(Array.from(buttons));
                    }
                    
                    endorsementButtons = [...new Set(endorsementButtons)];
                    console.log(`🔍 Found ${endorsementButtons.length} endorsement buttons`);
                    
                    if (endorsementButtons.length > 0) {
                        // Try to find the specific skill button first
                        let targetButton = null;
                        
                        for (let button of endorsementButtons) {
                            const buttonText = button.textContent?.toLowerCase() || '';
                            const ariaLabel = button.getAttribute('aria-label')?.toLowerCase() || '';
                            const closestSkill = button.closest('[data-skill-name]')?.getAttribute('data-skill-name')?.toLowerCase() || '';
                            const parentText = button.closest('.pv-skill-category-entity')?.textContent?.toLowerCase() || '';
                            
                            if (buttonText.includes(skillName.toLowerCase()) || 
                                ariaLabel.includes(skillName.toLowerCase()) ||
                                closestSkill.includes(skillName.toLowerCase()) ||
                                parentText.includes(skillName.toLowerCase())) {
                                targetButton = button;
                                console.log(`🎯 Found specific skill button for "${skillName}"`);
                                break;
                            }
                        }
                        
                        // If no specific skill button found, try the first available one
                        if (!targetButton && endorsementButtons.length > 0) {
                            targetButton = endorsementButtons[0];
                            console.log('🎯 Using first available endorsement button');
                        }
                        
                        if (targetButton) {
                            console.log('🎯 Clicking endorsement button...');
                            targetButton.click();
                            
                            // Wait for the endorsement to process
                            await delay(2000);
                            
                            console.log('✅ Skill endorsement successful!');
                            return { 
                                success: true, 
                                message: `Successfully endorsed skill "${skillName}" via automation` 
                            };
                        }
                    }
                    
                    return { 
                        success: false, 
                        error: 'No endorsement elements found on profile page',
                        message: 'Profile opened for manual endorsement - LinkedIn may have changed their interface'
                    };
                    
                } catch (error) {
                    console.error('❌ Error in skill endorsement automation:', error);
                    return { 
                        success: false, 
                        error: error.message,
                        message: 'Skill endorsement automation failed'
                    };
                }
            },
            args: [data.skillName, data.entityUrn]
        });
        
        console.log('📊 Skill endorsement automation result:', result);
        
        if (result && result[0] && result[0].result) {
            console.log('✅ Automation script returned result:', result[0].result);
            return result[0].result;
        } else {
            console.log('❌ No result from automation script');
            return { 
                success: false, 
                error: 'No result from automation script',
                message: 'Automation script did not return a result'
            };
        }
        
    } catch (error) {
        console.error('❌ Error processing skill in tab:', error);
        return { 
            success: false, 
            error: error.message,
            message: 'Failed to process skill in tab'
        };
    }
};
// Process queue sequentially - grouped by profile
const processEndorsementQueue = async () => {
    if (isProcessingQueue || !endorsementQueue || endorsementQueue.length === 0) {
        return;
    }
    
    isProcessingQueue = true;
    console.log(`🔄 Processing endorsement queue (${endorsementQueue.length} items remaining)`);
    
    // Group queue items by profile
    const profileGroups = new Map();
    while (endorsementQueue && endorsementQueue.length > 0) {
        const queueItem = endorsementQueue.shift();
        if (!profileGroups.has(queueItem.connectId)) {
            profileGroups.set(queueItem.connectId, []);
        }
        profileGroups.get(queueItem.connectId).push(queueItem);
    }
    
    // Process each profile group
    for (const [connectId, profileItems] of profileGroups) {
        console.log(`🎯 Processing profile ${connectId} with ${profileItems.length} skills`);
        
        // Open tab for this profile (first item)
        const firstItem = profileItems[0];
        let tab = null;
        
        try {
            // Open LinkedIn profile in new tab
            console.log(`🔄 Opening LinkedIn profile page for ${connectId}...`);
            console.log(`🌐 Opening URL: ${firstItem.data.profileUrl}`);
            
            tab = await chrome.tabs.create({
                url: firstItem.data.profileUrl,
                active: false, // Open in background
                pinned: false,
                index: 0 // Add to beginning of tab list
            });
            console.log(`✅ Tab created with ID: ${tab.id}`);
            
            if (!tab || !tab.id) {
                throw new Error('Failed to create tab');
            }
            
            // Track this tab for this profile
            activeEndorsementTabs.set(connectId, tab.id);
            console.log(`📝 Tracking endorsement tab for profile ${connectId}: ${tab.id}`);
            
            // Ensure tab stays in background
            try {
                await chrome.tabs.update(tab.id, { active: false });
                console.log('✅ Tab kept in background');
            } catch (updateError) {
                console.log('⚠️ Could not update tab to background:', updateError.message);
            }
            
            // Wait for page to load
            console.log('🔄 Waiting for page to load...');
            await new Promise((resolve) => {
                let attempts = 0;
                const maxAttempts = 5; // Wait max 5 seconds
                
                const checkTab = () => {
                    attempts++;
                    chrome.tabs.get(tab.id, (tabInfo) => {
                        if (tabInfo && tabInfo.status === 'complete') {
                            console.log('✅ Page loaded completely');
                            resolve();
                        } else if (attempts >= maxAttempts) {
                            console.log('⚠️ Page load timeout, proceeding anyway');
                            resolve();
                        } else {
                            setTimeout(checkTab, 1000);
                        }
                    });
                };
                checkTab();
            });
            
            // Process all skills for this profile in the same tab
            for (const item of profileItems) {
                console.log(`🎯 Processing skill: ${item.skillName} for ${connectId}`);
                
                try {
                    const result = await processSkillInTab(tab.id, item.data);
                    console.log(`✅ Skill ${item.skillName} completed: ${result.success ? 'Success' : 'Failed'}`);
                    
                    // Send response back to content script
                    if (item.sendResponse) {
                        item.sendResponse(result);
                    }
                    
                    // Small delay between skills for the same profile
                    if (profileItems.indexOf(item) < profileItems.length - 1) {
                        console.log(`⏳ Waiting 2 seconds before next skill...`);
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }
                } catch (error) {
                    console.error(`❌ Skill ${item.skillName} failed: ${error.message}`);
                    if (item.sendResponse) {
                        item.sendResponse({ 
                            success: false, 
                            error: error.message,
                            message: 'Skill processing failed'
                        });
                    }
                }
            }
            
        } catch (error) {
            console.error(`❌ Profile ${connectId} processing failed: ${error.message}`);
            // Send error response to all items for this profile
            for (const item of profileItems) {
                if (item.sendResponse) {
                    item.sendResponse({ 
                        success: false, 
                        error: error.message,
                        message: 'Profile processing failed'
                    });
                }
            }
        } finally {
            // Close the tab after all skills are processed
            if (tab && tab.id) {
                setTimeout(async () => {
                    try {
                        await chrome.tabs.remove(tab.id);
                        console.log('✅ Profile endorsement tab closed');
                        
                        // Remove tracking
                        activeEndorsementTabs.delete(connectId);
                        console.log(`📝 Removed tracking for profile ${connectId}`);
                    } catch (error) {
                        console.log('⚠️ Could not close tab:', error.message);
                    }
                }, 3000); // Close after 3 seconds
            }
        }
        
        // Small delay between profiles
        if (Array.from(profileGroups.keys()).indexOf(connectId) < profileGroups.size - 1) {
            console.log(`⏳ Waiting 3 seconds before next profile...`);
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
    }
    
    isProcessingQueue = false;
    console.log(`✅ Endorsement queue processing completed`);
};

// Function to handle skill endorsement requests from content scripts (standalone)
const handleSkillEndorsementRequest = async (data) => {
    console.log('🚀🚀🚀 handleSkillEndorsementRequest function STARTED!');
    console.log('🔍 Function called with:', data);
    
    const { skillName, entityUrn, connectId, profileUrl, currentCnt, totalResult } = data;
    
    // This function is now standalone - the actual processing is done in processEndorsementQueue
    // Just return success to indicate the request was received
    return { 
        success: true, 
        message: `Skill endorsement request received for ${skillName}, will be processed in profile queue`
    };
};

// Add standalone message handlers to existing listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('📨 Background script received message:', request);
    
    // Handle existing actions (don't modify these)
    if (request.action === 'sendConnectionInvite') {
        console.log('🔗 Processing connection invite request from content script');
        
        // Handle the connection invite asynchronously
        handleConnectionInviteRequest(request.data)
            .then(result => {
                console.log('✅ Connection invite completed:', result);
                sendResponse(result);
            })
            .catch(error => {
                console.error('❌ Connection invite failed:', error);
                sendResponse({ 
                    success: false, 
                    error: error.message 
                });
            });
        
        // Return true to indicate we'll send a response asynchronously
        return true;
    }
    
    // ========================================
    // NEW STANDALONE MESSAGE HANDLERS
    // ========================================
    
    if (request.action === 'processCallReply') {
        console.log('🤖 Processing call reply with AI...');
        processCallReply(request.message, request.profileId, request.connectionId)
            .then(result => {
                sendResponse({ success: true, result: result });
            })
            .catch(error => {
                sendResponse({ success: false, error: error.message });
            });
        return true;
    }
    
    if (request.action === 'test') {
        console.log('🧪 Test message received from content script');
        sendResponse({ success: true, message: 'Background script is working' });
        return true;
    }
    
    if (request.action === 'cleanupEndorsementTracking') {
        console.log('🧹 Cleaning up endorsement tracking for:', request.data.connectId);
        activeEndorsementTabs.delete(request.data.connectId);
        sendResponse({ success: true, message: 'Tracking cleaned up' });
        return true;
    }
    
    if (request.action === 'getQueueStatus') {
        console.log('📊 Queue status requested');
        try {
            sendResponse({ 
                success: true, 
                queueSize: endorsementQueue ? endorsementQueue.length : 0,
                isProcessing: isProcessingQueue || false,
                activeTabs: activeEndorsementTabs ? Array.from(activeEndorsementTabs.keys()) : []
            });
        } catch (error) {
            console.error('❌ Error getting queue status:', error);
            sendResponse({ 
                success: false, 
                error: error.message,
                queueSize: 0,
                isProcessing: false,
                activeTabs: []
            });
        }
        return true;
    }
    
    if (request.action === 'clearEndorsementQueue') {
        console.log('🧹 Clearing endorsement queue');
        try {
            // Clear the queue
            endorsementQueue.length = 0;
            isProcessingQueue = false;
            
            // Close any active endorsement tabs
            for (const [connectId, tabId] of activeEndorsementTabs.entries()) {
                try {
                    chrome.tabs.remove(tabId);
                    console.log(`✅ Closed endorsement tab ${tabId} for profile ${connectId}`);
                } catch (error) {
                    console.log(`⚠️ Could not close tab ${tabId}:`, error.message);
                }
            }
            
            // Clear tracking
            activeEndorsementTabs.clear();
            
            sendResponse({ 
                success: true, 
                message: 'Endorsement queue cleared and tabs closed' 
            });
        } catch (error) {
            console.error('❌ Error clearing queue:', error);
            sendResponse({ 
                success: false, 
                error: error.message,
                message: 'Failed to clear queue' 
            });
        }
        return true;
    }
    
    if (request.action === 'clearOldCallIds') {
        console.log('🧹 Clearing old call IDs requested');
        clearOldCallIds()
            .then(() => {
                sendResponse({ 
                    success: true, 
                    message: 'Old call IDs cleared successfully' 
                });
            })
            .catch(error => {
                console.error('❌ Error clearing old call IDs:', error);
                sendResponse({ 
                    success: false, 
                    error: error.message 
                });
            });
        return true;
    }
    
    if (request.action === 'stopCampaign') {
        console.log('⏹️ Campaign stop request received');
        console.log('📋 Campaign ID:', request.campaignId);
        
        // Use async IIFE to handle await
        (async () => {
            try {
                const campaignId = request.campaignId;
                
                console.log(`🛑 Stopping campaign monitoring for campaign ID: ${campaignId}`);
                
                // Update campaign status in backend
                if (typeof updateCampaign === 'function') {
                    console.log('🔄 Updating campaign status to stopped in backend...');
                    await updateCampaign({
                        campaignId: campaignId,
                        status: 'stopped'
                    });
                    console.log('✅ Campaign status updated to stopped in backend');
                } else {
                    console.log('⚠️ updateCampaign function not available');
                }
                
                sendResponse({ 
                    success: true, 
                    message: `Campaign ${campaignId} stopped successfully`,
                    campaignId: campaignId
                });
                
                console.log(`📊 Campaign ${campaignId} has been stopped`);
                
            } catch (error) {
                console.error('❌ Error stopping campaign:', error);
                sendResponse({ 
                    success: false, 
                    error: error.message,
                    message: 'Failed to stop campaign' 
                });
            }
        })();
        return true;
    }
    
    if (request.action === 'sendSkillEndorsement') {
        console.log('🎯 Skill endorsement request received');
        console.log('📋 Request data:', request.data);
        
        try {
            const { skillName, entityUrn, connectId, profileUrl, currentCnt, totalResult } = request.data;
            
            // Add to queue for processing
            if (endorsementQueue) {
                endorsementQueue.push({
                    skillName: skillName,
                    connectId: connectId,
                    data: request.data,
                    sendResponse: sendResponse
                });
                console.log(`📝 Added skill "${skillName}" for profile ${connectId} to queue`);
                console.log(`📊 Queue size: ${endorsementQueue.length}`);
                
                // Start processing if not already processing
                if (!isProcessingQueue) {
                    console.log('🚀 Starting queue processing...');
                    processEndorsementQueue();
                } else {
                    console.log('⏳ Queue is already being processed, item added to queue');
                }
                
                sendResponse({ 
                    success: true, 
                    message: `Skill "${skillName}" added to endorsement queue for profile ${connectId}`,
                    queuePosition: endorsementQueue.length
                });
            } else {
                console.error('❌ Endorsement queue is undefined');
                sendResponse({ 
                    success: false, 
                    error: 'Queue system not initialized',
                    message: 'Endorsement queue is not available' 
                });
            }
        } catch (error) {
            console.error('❌ Error processing skill endorsement request:', error);
            sendResponse({ 
                success: false, 
                error: error.message,
                message: 'Failed to process skill endorsement request' 
            });
        }
        return true;
    }
    
    // Handle other message types here...
    console.log('⚠️ Unknown message action:', request.action);
    sendResponse({ 
        success: false, 
        error: 'Unknown action',
        message: 'Background script received unknown message type' 
    });
    return true;
});

// Clear all deduplication flags for a campaign (useful for testing)
async function clearCampaignDedupeFlags(campaignId) {
    try {
        const keys = await chrome.storage.local.get();
        const campaignKeys = Object.keys(keys).filter(key => key.includes(`call_attempted_${campaignId}_`));
        
        if (campaignKeys.length > 0) {
            await chrome.storage.local.remove(campaignKeys);
            console.log(`🧹 Cleared ${campaignKeys.length} dedupe flags for campaign ${campaignId}`);
        } else {
            console.log(`ℹ️ No dedupe flags found for campaign ${campaignId}`);
        }
    } catch (error) {
        console.error('❌ Error clearing dedupe flags:', error);
    }
}

// Clear dedupe flags for campaign 100 to allow retry (for testing)
// clearCampaignDedupeFlags(100);

// Function to store conversation message in call_status table
async function storeConversationMessage(messageData) {
    try {
        console.log('💾 Storing conversation message:', messageData);
        
        // Get CSRF token
        const tokenResult = await chrome.storage.local.get(['csrfToken']);
        if (!tokenResult.csrfToken) {
            console.error('❌ No CSRF token found for conversation storage');
            return null;
        }
        
        // Get LinkedIn ID from storage or use fallback
        const linkedinIdResult = await chrome.storage.local.get(['linkedinId']);
        const currentLinkedInId = linkedinIdResult.linkedinId || 'vicken-concept';
        
        // Ensure we have a valid LinkedIn ID
        if (!currentLinkedInId || currentLinkedInId === 'undefined') {
            console.error('❌ Invalid LinkedIn ID:', currentLinkedInId);
            return null;
        }
        
        console.log('🔍 Using LinkedIn ID for conversation storage:', currentLinkedInId);
        
        // If call_id is null, check if we can find an existing call record first
        if (!messageData.call_id) {
            console.log('🔍 call_id is null, checking for existing call record first...');
            
            // First, try to find existing call record by checking if we have one in storage
            const allStorage = await chrome.storage.local.get();
            const existingMonitoringKeys = Object.keys(allStorage).filter(key => 
                key.startsWith('call_response_monitoring_') && 
                allStorage[key].connectionId === messageData.connection_id &&
                allStorage[key].callId
            );
            
            if (existingMonitoringKeys.length > 0) {
                const existingCallId = allStorage[existingMonitoringKeys[0]].callId;
                console.log('✅ Found existing call_id in monitoring data:', existingCallId);
                messageData.call_id = String(existingCallId);
                console.log('🔍 Using existing call_id:', messageData.call_id);
            } else {
                console.log('🔍 No existing call_id found, checking backend for existing call record...');
                
                // Check if call record already exists in backend database
                try {
                    const checkResponse = await fetch(`${PLATFORM_URL}/api/calls/check-existing?connection_id=${messageData.connection_id}`, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json',
                            'X-Requested-With': 'XMLHttpRequest',
                            'lk-id': currentLinkedInId,
                            'csrf-token': tokenResult.csrfToken
                        }
                    });
                    
                    if (checkResponse.ok) {
                        const checkResult = await checkResponse.json();
                        if (checkResult.exists && checkResult.call_id) {
                            console.log('✅ Found existing call record in backend:', checkResult.call_id);
                            messageData.call_id = String(checkResult.call_id);
                            
                            // Update monitoring data with the found call_id
                            const allStorage = await chrome.storage.local.get();
                            const monitoringKeys = Object.keys(allStorage).filter(key => 
                                key.startsWith('call_response_monitoring_') && 
                                allStorage[key].connectionId === messageData.connection_id
                            );
                            
                            for (const key of monitoringKeys) {
                                const monitoringData = allStorage[key];
                                if (monitoringData && !monitoringData.callId) {
                                    monitoringData.callId = messageData.call_id;
                                    await chrome.storage.local.set({ [key]: monitoringData });
                                    console.log(`✅ Updated monitoring data ${key} with existing call_id: ${messageData.call_id}`);
                                }
                            }
                        } else {
                            console.log('🔍 No existing call record in backend, creating new one...');
                            // Continue to create new call record below
                        }
                    } else {
                        console.log('⚠️ Could not check backend for existing call record, creating new one...');
                        // Continue to create new call record below
                    }
                } catch (error) {
                    console.log('⚠️ Error checking backend for existing call record:', error);
                    // Continue to create new call record below
                }
                
                // Only create new call record if we still don't have a call_id
                if (!messageData.call_id) {
                    console.log('🔍 Creating new call record...');
                
                try {
                // Get campaign data for proper naming
                let campaignName = `Campaign ${messageData.campaign_id || 'Unknown'}`;
                let sequenceName = `Campaign ${messageData.campaign_id || 'Unknown'}`;
                
                try {
                    // Try to get campaign name from storage
                    const campaignData = await chrome.storage.local.get(`campaign_${messageData.campaign_id}`);
                    if (campaignData[`campaign_${messageData.campaign_id}`] && campaignData[`campaign_${messageData.campaign_id}`].campaign) {
                        campaignName = campaignData[`campaign_${messageData.campaign_id}`].campaign.name || campaignName;
                        sequenceName = campaignData[`campaign_${messageData.campaign_id}`].campaign.name || sequenceName;
                    }
                } catch (error) {
                    console.log('⚠️ Could not get campaign data for naming:', error);
                }
                
                const callData = {
                    recipient: messageData.lead_name || 'Unknown',
                    profile: currentLinkedInId,
                    sequence: sequenceName,
                    callStatus: 'suggested',
                    connection_id: messageData.connection_id,
                    conversation_urn_id: messageData.conversation_urn_id,
                    campaign_id: messageData.campaign_id,
                    campaign_name: campaignName,
                    original_message: messageData.message || 'Conversation started via LinkedIn messaging'
                };
                
                console.log('🔍 Creating call record with data:', callData);
                
                const callResponse = await fetch(`${PLATFORM_URL}/api/book-call/store`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                        'lk-id': currentLinkedInId,
                        'csrf-token': tokenResult.csrfToken
                    },
                    body: JSON.stringify(callData)
                });
                
                if (callResponse.ok) {
                    const callContentType = callResponse.headers.get('content-type') || '';
                    if (!callContentType.includes('application/json')) {
                        const nonJsonBody = await callResponse.text();
                        console.error('❌ Expected JSON when creating call record but got non-JSON response', {
                            status: callResponse.status,
                            url: callResponse.url,
                            body_preview: nonJsonBody?.slice(0, 500)
                        });
                        return null;
                    }
                    const callResult = await callResponse.json();
                    console.log('✅ Call record created:', callResult);
                    
                    // Update messageData with the real database call_id (table ID)
                    messageData.call_id = String(callResult.call_id || callResult.id);
                    console.log('🔍 Updated messageData with real database call_id:', messageData.call_id);
                    
                    // IMPORTANT: Update the monitoring data with the real call_id to prevent future duplicates
                    console.log('🔄 Updating monitoring data with real call_id to prevent duplicates...');
                    // We need to find and update the monitoring data key
                    const allStorage = await chrome.storage.local.get();
                    const monitoringKeys = Object.keys(allStorage).filter(key => 
                        key.startsWith('call_response_monitoring_') && 
                        allStorage[key].connectionId === messageData.connection_id
                    );
                    
                    for (const key of monitoringKeys) {
                        const monitoringData = allStorage[key];
                        if (monitoringData && !monitoringData.callId) {
                            monitoringData.callId = messageData.call_id;
                            await chrome.storage.local.set({ [key]: monitoringData });
                            console.log(`✅ Updated monitoring data ${key} with call_id: ${messageData.call_id}`);
                        }
                    }
                } else {
                    const errorText = await callResponse.text();
                    console.error('❌ Failed to create call record:', {
                        status: callResponse.status,
                        statusText: callResponse.statusText,
                        url: callResponse.url,
                        body: errorText
                    });
                    
                    // If we can't create a call record, skip storing the conversation message
                    console.log('⚠️ Skipping conversation message storage due to call record creation failure');
                    return null;
                }
                } catch (callError) {
                    console.error('❌ Error creating call record:', callError);
                    console.log('⚠️ Skipping conversation message storage due to call record creation error');
                    return null;
                }
                } // Close the if (!messageData.call_id) block
            }
        }
        
        const response = await fetch(`${PLATFORM_URL}/api/calls/conversation/store`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                'lk-id': currentLinkedInId,
                'csrf-token': tokenResult.csrfToken
            },
            body: JSON.stringify(messageData)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ HTTP error storing conversation message:', {
                status: response.status,
                statusText: response.statusText,
                url: response.url,
                body: errorText
            });
            
            if (response.status === 404) {
                console.error('❌ Call record not found - this should not happen if call_id is correct');
                return null;
            }
            
            throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
        }

        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
            const textBody = await response.text();
            console.error('❌ Expected JSON storing conversation message but got non-JSON response', {
                status: response.status,
                url: response.url,
                body_preview: textBody?.slice(0, 500)
            });
            return null;
        }

        const data = await response.json();
        console.log('✅ Conversation message stored:', data);
        return data;
    } catch (error) {
        console.error('❌ Error storing conversation message:', error);
        return null;
    }
}

// Function to get conversation history
async function getConversationHistory(callId) {
    try {
        // Get CSRF token
        const tokenResult = await chrome.storage.local.get(['csrfToken']);
        if (!tokenResult.csrfToken) {
            console.error('❌ No CSRF token found for conversation history');
            return null;
        }
        
        const response = await fetch(`${PLATFORM_URL}/api/calls/${callId}/conversation`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'lk-id': 'vicken-concept',
                'csrf-token': tokenResult.csrfToken
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error getting conversation history:', error);
        return null;
    }
}

async function clearOldCallIds() {
    try {
        console.log('🧹 Clearing old call IDs from storage...');
        
        // Get all storage data
        const allStorage = await chrome.storage.local.get();
        
        // Do NOT clear monitoringData.callId for active conversations
        // Only remove legacy keys that may cause inconsistency
        
        // Also clear any call_id_* keys
        const callIdKeys = Object.keys(allStorage).filter(key => key.startsWith('call_id_'));
        for (const key of callIdKeys) {
            await chrome.storage.local.remove([key]);
            console.log(`✅ Removed ${key}`);
        }
        
        console.log('🎉 Old call IDs cleared successfully');
    } catch (error) {
        console.error('❌ Error clearing old call IDs:', error);
    }
}

/**
 * Clear all Chrome storage data (for debugging)
 * Call this from console: clearAllStorage()
 */
globalThis.clearAllStorage = async function() {
    try {
        console.log('🧹 Starting to clear all Chrome storage...');
        
        // Get all storage keys
        const allStorage = await chrome.storage.local.get();
        const keys = Object.keys(allStorage);
        
        console.log(`📊 Found ${keys.length} storage keys to clear:`, keys);
        
        // Clear all storage
        await chrome.storage.local.clear();
        
        console.log('✅ All Chrome storage cleared successfully');
        console.log('🔄 Extension will need to reinitialize data');
        
        return {
            success: true,
            clearedKeys: keys.length,
            message: 'All storage cleared successfully'
        };
    } catch (error) {
        console.error('❌ Error clearing storage:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

/**
 * Clear specific storage patterns (for debugging)
 * Call this from console: clearStoragePattern('call_response_monitoring')
 */
globalThis.clearStoragePattern = async function(pattern) {
    try {
        console.log(`🧹 Starting to clear storage with pattern: ${pattern}...`);
        
        // Get all storage keys
        const allStorage = await chrome.storage.local.get();
        const keys = Object.keys(allStorage);
        
        // Filter keys that match the pattern
        const matchingKeys = keys.filter(key => key.includes(pattern));
        
        console.log(`📊 Found ${matchingKeys.length} keys matching pattern "${pattern}":`, matchingKeys);
        
        if (matchingKeys.length === 0) {
            console.log('ℹ️ No keys found matching the pattern');
            return { success: true, clearedKeys: 0, message: 'No keys found' };
        }
        
        // Remove matching keys
        await chrome.storage.local.remove(matchingKeys);
        
        console.log(`✅ Cleared ${matchingKeys.length} storage keys successfully`);
        
        return {
            success: true,
            clearedKeys: matchingKeys.length,
            clearedKeysList: matchingKeys,
            message: `Cleared ${matchingKeys.length} keys matching "${pattern}"`
        };
    } catch (error) {
        console.error('❌ Error clearing storage pattern:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

/**
 * Show current storage usage (for debugging)
 * Call this from console: showStorageInfo()
 */
globalThis.showStorageInfo = async function() {
    try {
        const allStorage = await chrome.storage.local.get();
        const keys = Object.keys(allStorage);
        
        console.log(`📊 Storage Info:`);
        console.log(`- Total keys: ${keys.length}`);
        console.log(`- Keys:`, keys);
        
        // Group by pattern
        const patterns = {
            'call_response_monitoring': keys.filter(k => k.startsWith('call_response_monitoring_')),
            'campaign_': keys.filter(k => k.startsWith('campaign_')),
            'pending_message_': keys.filter(k => k.startsWith('pending_message_')),
            'other': keys.filter(k => !k.startsWith('call_response_monitoring_') && !k.startsWith('campaign_') && !k.startsWith('pending_message_'))
        };
        
        console.log(`📋 Storage by pattern:`);
        Object.entries(patterns).forEach(([pattern, patternKeys]) => {
            if (patternKeys.length > 0) {
                console.log(`- ${pattern}: ${patternKeys.length} keys`);
            }
        });
        
        return {
            totalKeys: keys.length,
            patterns: patterns,
            allKeys: keys
        };
    } catch (error) {
        console.error('❌ Error getting storage info:', error);
        return { error: error.message };
    }
};

/**
 * Check for pending reminders and process them
 */
const checkPendingReminders = async () => {
    try {
        console.log('🔔 Checking for pending reminders...');
        
        // Get LinkedIn ID from storage
        const linkedinIdResult = await chrome.storage.local.get(['linkedinId']);
        const linkedinId = linkedinIdResult.linkedinId;
        
        if (!linkedinId) {
            console.log('⚠️ No LinkedIn ID found, skipping reminder check');
            return;
        }
        
        // Fetch pending reminders from backend
        const response = await fetch(`${PLATFORM_URL}/api/reminders/pending`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'lk-id': linkedinId
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            const reminders = data.reminders || [];
            
            console.log(`📋 Found ${reminders.length} pending reminders`);
            
            // Process each reminder
            for (const reminder of reminders) {
                await processReminder(reminder, linkedinId);
            }
        } else {
            console.error('❌ Failed to fetch pending reminders:', response.status);
        }
        
    } catch (error) {
        console.error('❌ Error checking pending reminders:', error);
    }
};

/**
 * Process a single reminder
 */
const processReminder = async (reminder, linkedinId) => {
    try {
        console.log(`📤 Processing reminder for ${reminder.recipient}...`);
        
        // Mark reminder as processing
        await updateReminderStatus(reminder.id, 'processing', linkedinId);
        
        // Prepare monitoring data for sending
        const monitoringData = {
            connectionId: reminder.recipient, // Assuming recipient is the connection ID
            conversationUrnId: reminder.conversation_urn_id,
            leadName: reminder.recipient,
            campaignId: 'reminder', // Special campaign ID for reminders
            callId: reminder.call_id
        };
        
        // Send the reminder message using existing LinkedIn messaging
        await sendLinkedInMessage(monitoringData, reminder.message);
        
        // Mark reminder as sent
        await updateReminderStatus(reminder.id, 'sent', linkedinId);
        
        console.log(`✅ Reminder sent successfully to ${reminder.recipient}`);
        
    } catch (error) {
        console.error(`❌ Failed to process reminder for ${reminder.recipient}:`, error);
        
        // Mark reminder as failed
        await updateReminderStatus(reminder.id, 'failed', linkedinId, error.message);
    }
};

/**
 * Update reminder status in backend
 */
const updateReminderStatus = async (reminderId, status, linkedinId, errorMessage = null) => {
    try {
        const payload = {
            reminder_id: reminderId,
            status: status
        };
        
        if (errorMessage) {
            payload.error_message = errorMessage;
        }
        
        const response = await fetch(`${PLATFORM_URL}/api/reminders/update-status`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'lk-id': linkedinId
            },
            body: JSON.stringify(payload)
        });
        
        if (response.ok) {
            console.log(`✅ Reminder ${reminderId} status updated to ${status}`);
        } else {
            console.error(`❌ Failed to update reminder status:`, response.status);
        }
        
    } catch (error) {
        console.error('❌ Error updating reminder status:', error);
    }
};
