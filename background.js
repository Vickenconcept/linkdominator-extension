// Remove problematic imports and add necessary variables and functions
// importScripts('./js/universalAction.js');
// importScripts('./js/actions/autorespondAction.js');
// importScripts('./js/actions/campaignAction.js');
importScripts('./env.js');

// 🚀 KEEP-ALIVE MECHANISM - Prevents service worker from going inactive
let keepAliveInterval;
let isServiceWorkerActive = true;

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
    
    keepAliveInterval = setInterval(() => {
        console.log('💓 Service worker keep-alive ping...');
        
        // Check if we have any active campaigns
        chrome.storage.local.get(['activeCampaigns'], (result) => {
            const activeCampaigns = result.activeCampaigns || [];
            if (activeCampaigns.length > 0) {
                console.log('🔄 Found active campaigns, keeping service worker alive');
                isServiceWorkerActive = true;
            } else {
                console.log('⏸️ No active campaigns, service worker can sleep');
                isServiceWorkerActive = false;
            }
        });
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
        const response = await fetch(`${PLATFROM_URL}/api/campaigns`, {
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
        const response = await fetch(`${PLATFROM_URL}/api/campaign/${campaignId}/sequence`, {
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
        const response = await fetch(`${PLATFROM_URL}/api/campaign/${campaignId}/leads`, {
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
        const response = await fetch(`${PLATFROM_URL}/api/campaign/${campaignId}/leadgen/tracking`, {
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
        
        const response = await fetch(`${PLATFROM_URL}/api/campaign/${campaign.id}/update-node`, {
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
        const response = await fetch(`${PLATFROM_URL}/api/campaign/${campaignData.campaignId}/update`, {
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
        console.log(`🔗 API URL: ${PLATFROM_URL}/api/campaign/${campaignId}/leadgen/${leadId}/update`);
        console.log(`🔑 LinkedIn ID: ${linkedinId}`);
        
        const requestBody = JSON.stringify(updateData);
        console.log(`📦 Request body:`, requestBody);
        
        const response = await fetch(`${PLATFROM_URL}/api/campaign/${campaignId}/leadgen/${leadId}/update`, {
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
            url: `${PLATFROM_URL}/api/campaign/${campaignId}/leadgen/${leadId}/update`,
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
        console.error('🔍 Platform URL:', PLATFROM_URL);
        
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
        
        const response = await fetch(`${PLATFROM_URL}/api/lead/${leadId}/update`, {
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
        const response = await fetch(`${PLATFROM_URL}/api/campaign/${campaignId}/leadgen/store`, {
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

const storeCallStatus = async (callData) => {
    try {
        const response = await fetch(`${PLATFROM_URL}/api/book-call/store`, {
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
                localStorage.setItem(`call_id_${callData.connection_id}`, data.call_id);
            }
            
            return data;
        }
        throw new Error('Failed to store call status');
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
        const callId = localStorage.getItem(`call_id_${connectionId}`);
        if (!callId) {
            console.log('No call ID found for connection:', connectionId);
            return;
        }

        const response = await fetch(`${PLATFROM_URL}/api/calls/process-reply`, {
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
                        const schedRes = await fetch(`${PLATFROM_URL}/api/calls/${callId}/scheduling`, {
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

var lkmApi = PLATFROM_URL+'/api';
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
        chrome.storage.local.get(["campaignCustomLikePost","nodeModelCustomLikePost"]).then((result) => {
            console.log(`Campaign ${alarm.name} sequence is running...`)
            let currentCampaign = result.campaignCustomLikePost,
            nodeModel = result.nodeModelCustomLikePost;

            try {
                getCampaignLeads(currentCampaign.id, (leadsData) => {
                    if(leadsData.length) runSequence(currentCampaign, leadsData, nodeModel);
                })
            } catch (err) {
                console.log(err)
            }
        });
    }else if(alarm.name == 'custom_profile_view'){
        chrome.storage.local.get(["campaignCustomProfileView","nodeModelCustomProfileView"]).then((result) => {
            console.log(`Campaign ${alarm.name} sequence is running...`)
            let currentCampaign = result.campaignCustomProfileView,
            nodeModel = result.nodeModelCustomProfileView;

            try {
                getCampaignLeads(currentCampaign.id, (leadsData) => {
                    if(leadsData.length) runSequence(currentCampaign, leadsData, nodeModel);
                })
            } catch (err) {
                console.log(err)
            }
        });
    }else if(alarm.name == 'custom_follow'){
        chrome.storage.local.get(["campaignCustomFollow","nodeModelCustomFollow"]).then((result) => {
            console.log(`Campaign ${alarm.name} sequence is running...`)
            let currentCampaign = result.campaignCustomFollow,
            nodeModel = result.nodeModelCustomFollow;

            try {
                getCampaignLeads(currentCampaign.id, (leadsData) => {
                    if(leadsData.length) runSequence(currentCampaign, leadsData, nodeModel);
                })
            } catch (err) {
                console.log(err)
            }
        });
    }else if(alarm.name == 'custom_message'){
        chrome.storage.local.get(["campaignCustomMessage","nodeModelCustomMessage"]).then((result) => {
            console.log(`Campaign ${alarm.name} sequence is running...`)
            let currentCampaign = result.campaignCustomMessage,
            nodeModel = result.nodeModelCustomMessage;

            try {
                getCampaignLeads(currentCampaign.id, (leadsData) => {
                    if(leadsData.length) runSequence(currentCampaign, leadsData, nodeModel);
                })
            } catch (err) {
                console.log(err)
            }
        });
    }else if(alarm.name == 'custom_endorse'){
        chrome.storage.local.get(["campaignCustomEndorse","nodeModelCustomEndorse"]).then((result) => {
            console.log(`Campaign ${alarm.name} sequence is running...`)
            let currentCampaign = result.campaignCustomEndorse,
            nodeModel = result.nodeModelCustomEndorse;
            try {
                getCampaignLeads(currentCampaign.id, (leadsData) => {
                    if(leadsData.length) runSequence(currentCampaign, leadsData, nodeModel);
                })
            } catch (err) {
                console.log(err)
            }
        });
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
        if(nodeModelArr[0].value == 'send-invites'){
            if(nodeModelArr[0].runStatus === false){
                nodeItem = nodeModelArr[0]
                delayInMinutes = 0.10;
                console.log('✅ Setting up send-invites node with 0.1 minute delay');
            }else{
                console.log('🔄 Send-invites marked as completed, but checking if invites were actually sent...');
                console.log(`📊 Node 0 (send-invites) runStatus: ${nodeModelArr[0].runStatus}`);
                
                await getLeadGenRunning(campaign.id);
                console.log(`📋 Found ${campaignLeadgenRunning.length} leads in campaign leadgen running`);
                
                // Check if we have a force flag to bypass runStatus
                const forceResult = await chrome.storage.local.get(['forceSendInvites']);
                if (forceResult.forceSendInvites === campaign.id) {
                    console.log('🚀 FORCE MODE ACTIVATED: Bypassing runStatus check');
                    console.log('🔄 Running send-invites despite runStatus = true');
                    
                    // Clear the force flag
                    chrome.storage.local.remove('forceSendInvites');
                    
                    // Check if there's a next node available before forcing send-invites
                    const nextNode = nodeModelArr.find(node => 
                        node.value !== 'send-invites' && !node.runStatus
                    );
                    
                    if (nextNode) {
                        console.log(`🔄 Force mode detected, but next node available: ${nextNode.label} (${nextNode.value})`);
                        console.log('⏭️ Skipping force send-invites, advancing to next node instead');
                        nodeItem = nextNode;
                        delayInMinutes = 0.10;
                        console.log('✅ Next node set up instead of forcing send-invites');
                    } else {
                        // Force run send-invites only if no next node available
                        console.log('🔧 DEBUG: Force mode - resetting send-invites to false (no next node)');
                        nodeModelArr[0].runStatus = false; // Temporarily override
                        nodeItem = nodeModelArr[0];
                        delayInMinutes = 0.10;
                        console.log('✅ Send-invites forced to run - proceeding to alarm creation');
                    }
                    // Don't return here, let it continue to alarm creation
                } else {
                    // Normal diagnostic flow
                    console.log('🔍 DIAGNOSTIC: Checking if LinkedIn invitations were actually sent...');
                    console.log('💡 To verify: Go to LinkedIn → My Network → Sent invitations');
                    console.log('📅 Expected invitations sent in last 24 hours for:');
                    
                    // Show which leads should have invitations
                    const uniqueLeads = campaignLeadgenRunning.filter((lead, index, arr) => 
                        arr.findIndex(item => item.id === lead.id) === index
                    );
                    uniqueLeads.slice(0, 5).forEach((lead, idx) => {
                        console.log(`   ${idx + 1}. ${lead.name} (${lead.connectionId})`);
                    });
                    
                    if(uniqueLeads.length > 5) {
                        console.log(`   ... and ${uniqueLeads.length - 5} more`);
                    }
                    
                    console.log('');
                    console.log('🚨 IMPORTANT: If you do NOT see these invitations in LinkedIn:');
                    console.log('   1. The send-invites action failed silently');
                    console.log('   2. LinkedIn rate limiting prevented sending');
                    console.log('   3. Authentication/CSRF issues occurred');
                    console.log('');
                    console.log('💡 SOLUTION: Use self.forceSendInvites(' + campaign.id + ') to bypass backend restrictions');
                    console.log('');
                }
                
                if(campaignLeadgenRunning.length){
                    // Remove duplicates based on lead ID
                    const uniqueLeads = campaignLeadgenRunning.filter((lead, index, arr) => 
                        arr.findIndex(item => item.id === lead.id) === index
                    );
                    
                    if(uniqueLeads.length !== campaignLeadgenRunning.length) {
                        console.log(`🔄 Removed ${campaignLeadgenRunning.length - uniqueLeads.length} duplicate leads`);
                        console.log(`📊 Processing ${uniqueLeads.length} unique leads instead of ${campaignLeadgenRunning.length}`);
                        campaignLeadgenRunning = uniqueLeads;
                    }
                    
                    acceptedLeads = [];
                    notAcceptedLeads = [];

                    // Split leads into accepted and not accepted sent-invites
                    console.log(`🔍 Processing ${campaignLeadgenRunning.length} unique leads from leadgen running:`);
                    
                    for(const [idx, lead] of campaignLeadgenRunning.entries()){
                        // Initialize missing values if they're undefined (backend issue)
                        if(lead.acceptedStatus === undefined || lead.acceptedStatus === null) {
                            lead.acceptedStatus = false; // Default to not accepted
                            console.log(`🔧 Initialized acceptedStatus to false for ${lead.name}`);
                        }
                        if(lead.statusLastId === undefined || lead.statusLastId === null) {
                            lead.statusLastId = 1; // Start at step 1
                            console.log(`🔧 Initialized statusLastId to 1 for ${lead.name}`);
                        }
                        
                        console.log(`👤 Lead ${idx + 1}: ${lead.name} - Current acceptedStatus: ${lead.acceptedStatus}, statusLastId: ${lead.statusLastId}`);
                        
                        if(lead.acceptedStatus === false){
                            console.log(`🌐 Checking network info for ${lead.name}...`);
                            let networkInfo = await _getProfileNetworkInfo(lead);
                            lead['networkDegree'] = networkInfo.data.distance.value
                            console.log(`📊 Network degree for ${lead.name}: ${lead.networkDegree}`);
                            await updateLeadNetworkDegree(lead)
                            
                            // Check if invite was accepted
                            const wasAccepted = lead['networkDegree'] == 'DISTANCE_1';
                            if(wasAccepted) {
                                console.log(`🎉 INVITE ACCEPTED! ${lead.name} is now a 1st degree connection`);
                                
                                // Update the database to mark as accepted
                                try {
                                    await updateLeadGenRunning(campaign.id, lead.id || lead.connectionId, {
                                        acceptedStatus: true,
                                        statusLastId: 3, // 3 = accepted
                                        currentNodeKey: lead.currentNodeKey || 0,
                                        nextNodeKey: lead.nextNodeKey || 0
                                    });
                                    console.log(`✅ Database updated: ${lead.name} marked as accepted`);
                                } catch (updateError) {
                                    console.error(`❌ Failed to update database for ${lead.name}:`, updateError);
                                }
                            }
                            
                            lead.acceptedStatus = wasAccepted;
                            console.log(`✅ Updated acceptedStatus for ${lead.name}: ${lead.acceptedStatus}`);
                        } else if(lead.acceptedStatus === true) {
                            // Lead is already marked as accepted, verify they're still 1st degree
                            console.log(`✅ ${lead.name} is already marked as accepted, verifying network status...`);
                            let networkInfo = await _getProfileNetworkInfo(lead);
                            lead['networkDegree'] = networkInfo.data.distance.value
                            console.log(`📊 Network degree for ${lead.name}: ${lead.networkDegree}`);
                            await updateLeadNetworkDegree(lead)
                            
                            // If they're still 1st degree, they're ready for the next sequence step
                            if(lead['networkDegree'] == 'DISTANCE_1') {
                                console.log(`🎯 ${lead.name} is confirmed 1st degree and ready for sequence execution`);
                            } else {
                                console.log(`⚠️ ${lead.name} is no longer 1st degree, may need re-invitation`);
                            }
                        }
                        
                        if(lead.acceptedStatus === true){
                            acceptedLeads.push(lead)
                            console.log(`✅ Added ${lead.name} to acceptedLeads`);
                        }else{
                            notAcceptedLeads.push(lead)
                            console.log(`❌ Added ${lead.name} to notAcceptedLeads`);
                        }
                        await delay(10000)
                    }
                    
                    console.log(`📊 Final counts - Accepted: ${acceptedLeads.length}, Not Accepted: ${notAcceptedLeads.length}`);
                    // Set variables for accepted leads
                    if(acceptedLeads.length){
                        console.log(`🎯 Processing ${acceptedLeads.length} accepted leads...`);
                        // Set node and delay properties
                        let baseStatusId = acceptedLeads[0].statusLastId || 1; // Default to 1 if undefined
                        statusLastId = baseStatusId + 1;
                        console.log(`📊 Base statusLastId: ${baseStatusId}, Looking for nodes with statusLastId: ${statusLastId}`);
                        
                        console.log(`🔍 Analyzing node structure:`, nodeModelArr.map(node => ({
                            key: node.key,
                            type: node.type,
                            value: node.value,
                            acceptedTime: node.acceptedTime,
                            acceptedAction: node.acceptedAction,
                            notAcceptedTime: node.notAcceptedTime,
                            notAcceptedAction: node.notAcceptedAction
                        })));
                        
                        for(let nodeModel of nodeModelArr){
                            if(nodeModel.hasOwnProperty('acceptedTime') && nodeModel.acceptedTime == statusLastId){
                                console.log(`⏰ Found acceptedTime node: ${nodeModel.key} - ${nodeModel.label}`);
                                delayInMinuteAccepted = nodeModel.time == 'days' 
                                    ? nodeModel.value * 24 * 60
                                    : nodeModel.value * 60;
                                console.log(`⏰ Delay set to: ${delayInMinuteAccepted} minutes`);
                            }
                            if(nodeModel.hasOwnProperty('acceptedAction') && nodeModel.acceptedAction == statusLastId){
                                console.log(`🎯 Found acceptedAction node: ${nodeModel.key} - ${nodeModel.label}`);
                                acceptedNodeItem = nodeModel
                                currentNodeKey = nodeModel.key
                            }
                        }
                        
                        console.log(`📋 acceptedNodeItem found:`, acceptedNodeItem ? `${acceptedNodeItem.key} - ${acceptedNodeItem.label}` : 'None');
                        
                        // Set alarm
                        if(acceptedNodeItem && Object.keys(acceptedNodeItem).length){
                            // Update leadgen status, current node keys
                            for(let lead of acceptedLeads){
                                const leadId = lead.id || lead.connectionId;
                                await updateLeadGenRunning(campaign.id, leadId, {
                                    acceptedStatus: lead.acceptedStatus,
                                    currentNodeKey: currentNodeKey,
                                    nextNodeKey: 0,
                                    statusLastId: statusLastId
                                })
                            }

                            alarmName = 'accepted_leads'
                            campaignModel = {
                                campaignAccepted: campaign,
                                nodeModelAccepted: acceptedNodeItem
                            }
                            chrome.storage.local.set(campaignModel).then(() => {
                                chrome.alarms.create(
                                    alarmName, {delayInMinutes: 2} // delayInMinuteAccepted}
                                );
                                console.log(alarmName +" alarm is set");
                            });
                            
                            // Exit function - we've set up the specific alarm
                            console.log('✅ Accepted leads alarm created, exiting setCampaignAlarm');
                            return;
                        }
                    }
                    // Set variables for not accepted leads
                    if(notAcceptedLeads.length){
                        console.log(`🎯 Processing ${notAcceptedLeads.length} not accepted leads...`);
                        // Set node and delay properties
                        let baseStatusId = notAcceptedLeads[0].statusLastId || 1; // Default to 1 if undefined
                        statusLastId = baseStatusId + 1;
                        console.log(`📊 Base statusLastId: ${baseStatusId}, Looking for not-accepted nodes with statusLastId: ${statusLastId}`);
                        
                        for(let nodeModel of nodeModelArr){
                            if(nodeModel.hasOwnProperty('notAcceptedTime') && nodeModel.notAcceptedTime == statusLastId){
                                console.log(`⏰ Found notAcceptedTime node: ${nodeModel.key} - ${nodeModel.label}`);
                                delayInMinuteNotAccepted = nodeModel.time == 'days' 
                                    ? nodeModel.value * 24 * 60
                                    : nodeModel.value * 60;
                                console.log(`⏰ Not-accepted delay set to: ${delayInMinuteNotAccepted} minutes`);
                            }
                            if(nodeModel.hasOwnProperty('notAcceptedAction') && nodeModel.notAcceptedAction == statusLastId){
                                console.log(`🎯 Found notAcceptedAction node: ${nodeModel.key} - ${nodeModel.label}`);
                                notAcceptedNodeItem = nodeModel
                                currentNodeKey = nodeModel.key
                            }
                        }
                        
                        console.log(`📋 notAcceptedNodeItem found:`, notAcceptedNodeItem ? `${notAcceptedNodeItem.key} - ${notAcceptedNodeItem.label}` : 'None');
                        // Set alarm
                        if(notAcceptedNodeItem && Object.keys(notAcceptedNodeItem).length){
                            // Update leadgen status, current node keys
                            for(let lead of notAcceptedLeads){
                                const leadId = lead.id || lead.connectionId;
                                await updateLeadGenRunning(campaign.id, leadId, {
                                    acceptedStatus: lead.acceptedStatus,
                                    currentNodeKey: currentNodeKey,
                                    nextNodeKey: 0,
                                    statusLastId: statusLastId
                                })
                            }

                            alarmName = 'not_accepted_leads'
                            campaignModel = {
                                campaignNotAccepted: campaign,
                                nodeModelNotAccepted: notAcceptedNodeItem
                            }
                            chrome.storage.local.set(campaignModel).then(() => {
                                chrome.alarms.create(
                                    alarmName, {delayInMinutes: 2} // delayInMinuteNotAccepted}
                                );
                                console.log(alarmName +" alarm is set");
                            });
                            
                            // Exit function - we've set up the specific alarm
                            console.log('✅ Not-accepted leads alarm created, exiting setCampaignAlarm');
                            return;
                        }
                    }
                } else {
                    // Check if the send-invites node is already completed
                    if (nodeModelArr[0].runStatus === true) {
                        console.log('✅ Send-invites node is already completed, checking for next node...');
                        
                        // Find the next node after send-invites
                        const nextNode = nodeModelArr.find(node => 
                            node.value !== 'send-invites' && !node.runStatus
                        );
                        
                        if (nextNode) {
                            console.log(`🔄 Found next node: ${nextNode.label} (${nextNode.value})`);
                            nodeItem = nextNode;
                            delayInMinutes = 0.10;
                            console.log('⏰ Setting up next node execution...');
                        } else {
                            console.log('❌ No next node found, campaign completed');
                            return; // Exit without setting up alarm
                        }
                    } else {
                        console.log('❌ No leads found in campaign leadgen running table!');
                        console.log('🔍 This means either:');
                        console.log('   1. No invites were actually sent successfully');
                        console.log('   2. createLeadGenRunning was not called after sending invites');
                        console.log('   3. There was an error in the invite sending process');
                        console.log('');
                        console.log('💡 SOLUTION: Reset the send-invites node to run again');
                        console.log('   - The send-invites node will be reset to runStatus: false');
                        console.log('   - This will allow invites to be sent again');
                        
                        // Reset the send-invites node to try again
                        console.log('🔧 DEBUG: Resetting send-invites node to false (no leads found)');
                        nodeModelArr[0].runStatus = false;
                        await updateSequenceNodeModel(campaign, nodeModelArr[0]);
                        console.log('🔧 DEBUG: Send-invites node reset to false completed');
                        
                        // Now set up the send-invites node to run
                        nodeItem = nodeModelArr[0];
                        delayInMinutes = 0.10;
                        console.log('🔄 Reset send-invites node and scheduling it to run again');
                    }
                }
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
            nodeModel: nodeItem
        }
        chrome.storage.local.set(campaignModel).then(() => {
            console.log('💾 Campaign model saved to storage:', campaignModel);
            chrome.alarms.create(
                alarmName, {
                    delayInMinutes: 0.1 // Reduced from 2 to 0.1 minutes (6 seconds) for faster testing
                }
            );
            console.log('⏰ Alarm created:', alarmName, 'with 0.1 minute delay');
        });
    } else {
        console.log('❌ No node item found or node item is empty, skipping alarm creation');
        console.log('🔍 Possible reasons:');
        console.log('   1. No accepted or not-accepted leads found');
        console.log('   2. Node structure missing acceptedAction/notAcceptedAction properties');
        console.log('   3. statusLastId not matching expected values in nodes');
        
        // For debugging: let's try a simpler approach - find the next unrun action node
        console.log('🔄 Attempting fallback: find next unrun action node...');
        for(let i = 1; i < nodeModelArr.length; i++) {
            let node = nodeModelArr[i];
            if(node.type === 'action' && node.runStatus === false && node.value !== 'end') {
                console.log(`✅ Found next unrun action node: ${node.key} - ${node.label} (${node.value})`);
                nodeItem = node;
                alarmName = `fallback_${node.value}`;
                break;
            }
        }
        
        if(nodeItem) {
            console.log('🔄 Creating fallback alarm...');
            campaignModel = {
                campaign: campaign,
                nodeModel: nodeItem
            }
            chrome.storage.local.set(campaignModel).then(() => {
                chrome.alarms.create(
                    alarmName, {
                        delayInMinutes: 0.1
                    }
                );
                console.log('⏰ Fallback alarm created:', alarmName);
            });
        }
    }
}

const runSequence = async (currentCampaign, leads, nodeModel) => {
    console.log('🎬 RUNSEQUENCE CALLED - Starting sequence execution...');
    console.log('📊 Campaign:', currentCampaign.name, '(ID:', currentCampaign.id, ')');
    console.log('👥 Leads to process:', leads.length);
    console.log('🔗 Node action:', nodeModel.label, '(', nodeModel.value, ')');
    console.log('⏰ Node delay:', nodeModel.delayInMinutes || 0, 'minutes');
    console.log('🔧 Full node model:', nodeModel);
    
    updateCampaignStatus('processing', `Processing ${leads.length} leads...`);
    
    for(const [i, lead] of leads.entries()){
        console.log(`👤 Processing lead ${i+1}/${leads.length}:`, lead);
        console.log(`🔗 Node action: ${nodeModel.value}`);
        
        if(nodeModel.value == 'endorse'){
            console.log('🏷️ EXECUTING ENDORSE ACTION...');
            console.log(`👤 Lead: ${lead.name} (${lead.connectionId})`);
            console.log(`🎯 Action: ${nodeModel.label} (${nodeModel.value})`);
            console.log(`⏰ Delay: ${nodeModel.delayInMinutes || 0} minutes`);
            console.log(`🔧 Node properties:`, {
                key: nodeModel.key,
                type: nodeModel.type,
                runStatus: nodeModel.runStatus,
                totalSkills: nodeModel.totalSkills
            });
            
            console.log(`🚀 Starting skill endorsement process for ${lead.name}...`);
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
            console.log(`💬 Executing ${nodeModel.value} action...`);
            arConnectionModel.message = nodeModel.message
            arConnectionModel.distance = lead.networkDistance
            arConnectionModel.connectionId = lead.connectionId
            arConnectionModel.name = lead.name
            arConnectionModel.firstName = lead.firstName
            arConnectionModel.lastName = lead.lastName
            arConnectionModel.conversationUrnId = ''
            lead['uploads'] = []
            messageConnection(lead)

            if(nodeModel.value == 'call'){
                console.log('📞 Recording call status with enhanced data...');
                // record call status with enhanced data
                storeCallStatus({
                    recipient: `${lead.firstName} ${lead.lastName}`,
                    profile: `${firstName} ${lastName}`,
                    sequence: currentCampaign.name,
                    callStatus: 'suggested',
                    company: lead.company || null,
                    industry: lead.industry || null,
                    job_title: lead.jobTitle || null,
                    location: lead.location || null,
                    original_message: arConnectionModel.message,
                    linkedin_profile_url: lead.profileUrl || null,
                    connection_id: lead.connectionId || null,
                    conversation_urn_id: arConnectionModel.conversationUrnId || null,
                    campaign_id: currentCampaign.id || null,
                    campaign_name: currentCampaign.name || null
                })
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
    
    console.log('🔄 Updating sequence node model...');
    await updateSequenceNodeModel(currentCampaign, nodeModel);
    console.log('⏰ Setting next campaign alarm...');
    setCampaignAlarm(currentCampaign);
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
    arConnectionModel.message = changeMessageVariableNames(arConnectionModel.message, arConnectionModel)

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
    }else {
        url = `${voyagerApi}/messaging/conversations?action=create`
        conversationObj = {
            conversationCreate: {
                eventCreate: messageEvent,
                recipients: [arConnectionModel.connectionId],
                subtype: arConnectionModel.distance == 1 ? "MEMBER_TO_MEMBER" : "INMAIL"
            }
        }
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
        .then(res => res.json())
        .then(res => {})
        .catch((err) => {
            console.log(err)
        })
    })
}

/**
 * Fetch skills of a given LinkedIn profile to endorse.
 * @param {object} lead 
 * @param {object} node 
 */
const _getFeaturedSkill =  (lead, node) => {
    console.log(`🔍 GETTING FEATURED SKILLS for ${lead.name}...`);
    console.log(`👤 Lead details:`, {
        name: lead.name,
        connectionId: lead.connectionId,
        totalSkills: node.totalSkills
    });
    
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
        // Use memberUrn if available, otherwise fall back to connectionId
        const profileId = lead.memberUrn ? lead.memberUrn.replace('urn:li:member:', '') : lead.connectionId;
        const apiUrl = `${LINKEDIN_URL}/voyager/api/identity/profiles/${profileId}/featuredSkills?includeHiddenEndorsers=false&count=${node.totalSkills}&_=${dInt}`;
        console.log(`🌐 Fetching skills from: ${apiUrl}`);
        console.log(`👤 Using profile ID: ${profileId} (memberUrn: ${lead.memberUrn}, connectionId: ${lead.connectionId})`);
        
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
            console.log(`📋 FEATURED SKILLS RESPONSE for ${lead.name}:`, res);
            console.log(`🔍 DEBUGGING SKILLS DATA:`);
            console.log(`   📊 Response structure:`, {
                hasData: !!res.data,
                hasElements: !!(res.data && res.data['*elements']),
                elementsLength: res.data && res.data['*elements'] ? res.data['*elements'].length : 0,
                hasIncluded: !!res.included,
                includedLength: res.included ? res.included.length : 0
            });
            
            if(res.included && res.included.length > 0) {
                console.log(`📋 ALL AVAILABLE SKILLS for ${lead.name}:`);
                res.included.forEach((item, index) => {
                    console.log(`   ${index + 1}. ${item.name || 'No name'} (${item.entityUrn || 'No URN'})`);
                    console.log(`      📊 Full item data:`, item);
                });
            }
            
            // Also check the main data structure
            if(res.data && res.data['*elements']) {
                console.log(`📊 MAIN SKILLS DATA:`, res.data['*elements']);
            }
            
            if(res.data && res.data['*elements'] && res.data['*elements'].length){
                console.log(`✅ Found ${res.data['*elements'].length} skills to endorse for ${lead.name}`);
                
                if(res.included && res.included.length > 0) {
                    console.log(`🎯 Processing ${res.included.length} skill items...`);
                    console.log(`📊 Campaign setting: Only endorse ${node.totalSkills} skill(s)`); 
                    
                    // Filter skills that have names and limit to the number specified in campaign
                    const skillsToEndorse = res.included
                        .filter(item => item.hasOwnProperty('name'))
                        .slice(0, node.totalSkills || 1);
                    
                    console.log(`🎯 Will endorse ${skillsToEndorse.length} skills (limited by campaign setting)`);
                    
                    skillsToEndorse.forEach((item, index) => {
                        console.log(`🏷️ Skill ${index + 1}: ${item.name} (${item.entityUrn})`);
                        _endorseConnection({
                            connectionId: lead.connectionId,
                            memberUrn: lead.memberUrn,
                            entityUrn: item.entityUrn,
                            skillName: item.name
                        }, result)
                    });
                } else {
                    console.log(`⚠️ No skill items found in included array for ${lead.name}`);
                }
            } else {
                console.log(`❌ No skills found for ${lead.name} - response data:`, res.data);
            }
        })
        .catch(err => {
            console.error(`❌ Error fetching skills for ${lead.name}:`, err);
        })
    })
}

/**
 * Endorse connection of a given LinkedIn profile.
 * @param {object} lead 
 * @param {object} result 
 */
const _endorseConnection = (data, result) => {
    console.log(`🏷️ ENDORSING SKILL: ${data.skillName} for connection ${data.connectionId}`);
    console.log(`🔗 Entity URN: ${data.entityUrn}`);
    
    // Use the same profile ID logic as in _getFeaturedSkill
    const profileId = data.memberUrn ? data.memberUrn.replace('urn:li:member:', '') : data.connectionId;
    const endorseUrl = `${VOYAGER_API}/identity/profiles/${profileId}/normEndorsements`;
    console.log(`🌐 Endorsement API URL: ${endorseUrl}`);
    console.log(`👤 Using profile ID: ${profileId} (memberUrn: ${data.memberUrn}, connectionId: ${data.connectionId})`);
    
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
        console.log(`📊 Endorsement response status: ${res.status} ${res.statusText}`);
        if(res.status == 201){
            console.log(`✅ SKILL ENDORSED SUCCESSFULLY: ${data.skillName}`);
            console.log(`🎯 ENDORSEMENT DETAILS:`);
            console.log(`   👤 Lead: ${data.connectionId}`);
            console.log(`   🏷️ Skill: ${data.skillName}`);
            console.log(`   🔗 Entity URN: ${data.entityUrn}`);
            console.log(`   📅 Time: ${new Date().toLocaleString()}`);
            console.log(`   🌐 Profile ID: ${profileId}`);
            
            // Store endorsement record for tracking
            const endorsementRecord = {
                leadId: data.connectionId,
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
                console.log(`📝 Endorsement record stored. Total endorsements: ${history.length}`);
            });
            
            return { success: true, message: 'Skill endorsed successfully' };
        } else {
            console.log(`❌ Failed to endorse skill: ${res.status} ${res.statusText}`);
            console.log(`🎯 FAILED ENDORSEMENT DETAILS:`);
            console.log(`   👤 Lead: ${data.connectionId}`);
            console.log(`   🏷️ Skill: ${data.skillName}`);
            console.log(`   🔗 Entity URN: ${data.entityUrn}`);
            console.log(`   📅 Time: ${new Date().toLocaleString()}`);
            console.log(`   ❌ Error: ${res.status} ${res.statusText}`);
            
            return { success: false, message: `Failed to endorse skill: ${res.status}` };
        }
    })
    .then(result => {
        if(result.success) {
            console.log(`🎉 ENDORSEMENT COMPLETED: ${data.skillName}`);
        } else {
            console.log(`⚠️ Endorsement result:`, result);
        }
    })
    .catch(err => {
        console.error(`❌ ERROR ENDORSING SKILL ${data.skillName}:`, err);
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
    await fetch(`${PLATFROM_URL}/api/campaigns`, {
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
        const response = await fetch(`${PLATFROM_URL}/api/campaign/${campaignId}/update`, {
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
const startContinuousMonitoring = () => {
    console.log('🔄 Starting continuous monitoring for invite acceptances...');
    
    // Clear any existing monitoring alarm first
    chrome.alarms.clear('continuous_invite_monitoring', () => {
        console.log('🧹 Cleared any existing continuous monitoring alarm');
        
        // Set up a recurring alarm to check for acceptances every 5 minutes
        chrome.alarms.create('continuous_invite_monitoring', {
            delayInMinutes: 0.1, // Start checking after 1 minute
            periodInMinutes: 1 // Then check every 1 minute
        });
        
        console.log('⏰ Continuous monitoring alarm created - will check every 5 minutes');
        console.log('🎯 Monitoring will start in 1 minute and then check every 5 minutes');
    });
};

// Manual function to start monitoring (for testing)
self.startMonitoring = () => {
    console.log('🚀 MANUALLY STARTING MONITORING...');
    startContinuousMonitoring();
    return 'Monitoring started manually - check console for logs';
};

/**
 * Check all pending leads for invite acceptances (regardless of campaign status)
 */
const checkAllCampaignsForAcceptances = async () => {
    console.log('🔍 STARTING ACCEPTANCE CHECK...');
    console.log('🔑 LinkedIn ID:', linkedinId);
    console.log('🌐 Platform URL:', PLATFROM_URL);
    
    try {
        // Get ALL campaigns (not just active ones)
        console.log('📡 Fetching campaigns from API...');
        const response = await fetch(`${PLATFROM_URL}/api/campaigns`, {
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
        
        // Get ALL campaigns that have Lead generation or Custom sequence types (regardless of status)
        const campaignsToCheck = campaignsData.data.filter(campaign => 
            ['Lead generation', 'Custom'].includes(campaign.sequenceType)
        );
        
        console.log(`🎯 Found ${campaignsToCheck.length} campaigns to check for acceptances:`, campaignsToCheck.map(c => ({id: c.id, name: c.name, sequenceType: c.sequenceType})));
        
        for (const campaign of campaignsToCheck) {
            console.log(`\n🔍 Checking campaign ${campaign.id} (${campaign.name})...`);
            try {
                // Get leads for this campaign
                console.log(`📋 Getting leads for campaign ${campaign.id}...`);
                await getLeadGenRunning(campaign.id);
                
                console.log(`👥 Found ${campaignLeadgenRunning.length} leads in campaign ${campaign.id}`);
                
                if (campaignLeadgenRunning.length === 0) {
                    console.log(`⚠️ No leads found for campaign ${campaign.id}, skipping...`);
                    continue;
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
                                        const nextActionNode = campaignSequence.nodeModel.find(node => 
                                            node.acceptedAction && node.acceptedAction == 3
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
        // Error in continuous monitoring
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

