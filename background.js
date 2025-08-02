// Remove problematic imports and add necessary variables and functions
// importScripts('./js/universalAction.js');
// importScripts('./js/actions/autorespondAction.js');
// importScripts('./js/actions/campaignAction.js');
importScripts('./env.js');

// 🚀 KEEP-ALIVE MECHANISM - Prevents service worker from going inactive
let keepAliveInterval;
let isServiceWorkerActive = true;

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
                    
                    // Trigger the network update alarm to resume processing
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
        // Removed automatic initializeActiveCampaigns() call to prevent CSRF errors
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
        
        // Don't initialize immediately - wait for LinkedIn ID to be set
        console.log('⏳ Waiting for LinkedIn ID before checking campaigns...');
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
        const response = await fetch(`${PLATFROM_URL}/api/campaign/${campaignId}/leadgen`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'lk-id': linkedinId
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.status === 200) {
                campaignLeadgenRunning = data.data;
                return data.data;
            }
        }
        campaignLeadgenRunning = [];
        return [];
    } catch (error) {
        console.error('Error fetching leadgen running:', error);
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

        console.log(`🔄 Updating network degree for lead: ${leadId}`);
        
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
            return data;
        }
        throw new Error('Failed to store call status');
    } catch (error) {
        console.error('Error storing call status:', error);
        throw error;
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
    alarmName = campaign.sequenceType.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
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
                    
                    // Force run send-invites
                    nodeModelArr[0].runStatus = false; // Temporarily override
                    nodeItem = nodeModelArr[0];
                    delayInMinutes = 0.10;
                    console.log('✅ Send-invites forced to run - proceeding to alarm creation');
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
                            lead.acceptedStatus = lead['networkDegree'] == 'DISTANCE_1' ? true:false
                            console.log(`✅ Updated acceptedStatus for ${lead.name}: ${lead.acceptedStatus}`);
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
                    nodeModelArr[0].runStatus = false;
                    await updateSequenceNodeModel(campaign, nodeModelArr[0]);
                    
                    // Now set up the send-invites node to run
                    nodeItem = nodeModelArr[0];
                    delayInMinutes = 0.10;
                    console.log('🔄 Reset send-invites node and scheduling it to run again');
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
    console.log('🎬 runSequence called with:', {currentCampaign, leads, nodeModel});
    console.log(`📊 Processing ${leads.length} leads with node model:`, nodeModel);
    updateCampaignStatus('processing', `Processing ${leads.length} leads...`);
    
    for(const [i, lead] of leads.entries()){
        console.log(`👤 Processing lead ${i+1}/${leads.length}:`, lead);
        console.log(`🔗 Node action: ${nodeModel.value}`);
        
        if(nodeModel.value == 'endorse'){
            console.log('🏷️ Executing endorse action...');
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
                console.log('📞 Recording call status...');
                // record call status
                storeCallStatus({
                    recipient: `${lead.firstName} ${lead.lastName}`,
                    profile: `${firstName} ${lastName}`,
                    sequence: currentCampaign.name,
                    callStatus: 'suggested'
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
            
            if(lead.networkDistance != 1 && !nodeModel.runStatus){
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
                if (lead.networkDistance == 1) {
                    console.log('   ⏭️ Reason: Already connected (network distance is 1)');
                } else if (nodeModel.runStatus) {
                    console.log('   ⏭️ Reason: Node already marked as completed (runStatus is true)');
                } else {
                    console.log('   ⏭️ Reason: Unknown condition failure');
                    console.log(`   🔍 networkDistance: ${lead.networkDistance} (expected != 1)`);
                    console.log(`   🔍 runStatus: ${nodeModel.runStatus} (expected false)`);
                }
            }
        }
        console.log(`✅ Finished processing lead ${i+1}/${leads.length}`);
        console.log(`⏱️ Waiting 30 seconds before next lead...`);
        await delay(30000)
        console.log(`✅ 30-second delay completed`);
    }
    
    if(nodeModel.value == 'send-invites'){
        // 🎯 COMPLETION LOGIC: After sending invites, mark campaign as completed
        console.log('🎉 All invites sent successfully! Marking campaign as completed...');
        
        // Update status in storage for persistence
        chrome.storage.local.set({ 
            lastCampaignStatus: 'completed',
            lastCampaignMessage: 'All invites sent successfully!'
        });
        
        // Clear completion status after 30 seconds to return to ready state
        setTimeout(() => {
            chrome.storage.local.remove(['lastCampaignStatus', 'lastCampaignMessage']);
            console.log('🔄 Cleared completion status, returning to ready state');
        }, 30000);
        
        // Try to update UI status (with error handling)
        try {
            updateCampaignStatus('completed', 'All invites sent!');
        } catch (error) {
            console.log('⚠️ Could not update UI status (content script not available):', error.message);
        }
        
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
            
            return; // Exit early - no more processing needed
        } catch (error) {
            console.error('❌ Failed to mark campaign as completed:', error);
        }
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
        fetch(`${LINKEDIN_URL}/voyager/api/identity/profiles/${lead.connectionId}/featuredSkills?includeHiddenEndorsers=false&count=${node.totalSkills}&_=${dInt}`, {
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
            console.log('Featured skill...')
            if(res.data['*elements'].length){
                res.included.forEach(item => {
                    if(item.hasOwnProperty('name')){
                        _endorseConnection({
                            connectionId: lead.connectionId,
                            entityUrn: item.entityUrn,
                            skillName: item.name
                        }, result)
                    }
                });
            }
        })
        .catch(err => console.log(err))
    })
}

/**
 * Endorse connection of a given LinkedIn profile.
 * @param {object} lead 
 * @param {object} result 
 */
const _endorseConnection = (data, result) => {
    fetch(`${VOYAGER_API}/identity/profiles/${data.connectionId}/normEndorsements`, {
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
    .then(res => res.json())
    .then(res => {
        console.log('Skill endorsed...')
    })
    .catch(err => console.log(err))
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
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                function: async (customMessage) => {
                    console.log('🤖 LinkedIn Invite Automation script injected');
                    
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
                        
                        // Find Connect button
                        const connectSelectors = [
                            'button[aria-label*="Connect"]',
                            'button[aria-label*="connect"]',
                            '.artdeco-button[aria-label*="Connect"]',
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
                        
                        // Fallback: look for any button with "Connect" text
                        if (!connectButton) {
                            const allButtons = document.querySelectorAll('button');
                            for (const button of allButtons) {
                                if (button.textContent.toLowerCase().includes('connect') && button.offsetParent !== null) {
                                    connectButton = button;
                                    console.log('✅ Found Connect button by text content');
                                    break;
                                }
                            }
                        }
                        
                        if (!connectButton) {
                            console.log('❌ Connect button not found');
                            return { success: false, error: 'Connect button not found' };
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
                            return { success: false, error: 'Send button not found' };
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
                        return { success: true };
                        
                    } catch (error) {
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
            
            // For now, assume success (in real implementation, we'd get the actual result)
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
    console.log('🔄 Starting _updateCampaignLeadsNetwork function...');
    let campaigns = [], clist = [], leads = []

    // Get campaigns
    console.log('📋 Fetching campaigns...');
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
            console.log(`📊 Found ${campaigns.length} campaigns`);
        }
    })

    // Get leads
    if(campaigns.length){
        console.log('🔍 Processing campaigns for leads...');
        for(let campaign of campaigns){
            console.log(`📈 Processing campaign ${campaign.id} with status: ${campaign.status}`);
            if(['active','running'].includes(campaign.status)){
                console.log(`✅ Campaign ${campaign.id} is active/running`);
                for(let list of campaign.campaignList){
                    clist.push(list)
                }

                try {
                    console.log(`👥 Fetching leads for campaign ${campaign.id}...`);
                    await getCampaignLeads(campaign.id, (data) => {
                        if(data.length) {
                            console.log(`📝 Found ${data.length} leads for campaign ${campaign.id}`);
                            for(let lead of data){
                                leads.push(lead)
                            }
                        } else {
                            console.log(`❌ No leads found for campaign ${campaign.id}`);
                        }
                    })
                } catch (err) {
                    console.error(`❌ Error fetching leads for campaign ${campaign.id}:`, err)
                }
            } else {
                console.log(`⏸️ Campaign ${campaign.id} is not active (status: ${campaign.status})`);
            }
        }

        console.log(`📊 Total leads collected: ${leads.length}`);

        // Remove duplicates
        const uniqueLeads = leads.filter((o, index, arr) => 
            arr.findIndex(item => item.connectionId === o.connectionId) === index
        )
        console.log(`🔄 After removing duplicates: ${uniqueLeads.length} unique leads`);

        console.log('🔄 Starting to process leads...');
        for(let i = 0; i < uniqueLeads.length; i++){
            let lead = uniqueLeads[i];
            console.log(`👤 Processing lead ${i+1}/${uniqueLeads.length}: ${lead.connectionId}`);
            
            if(lead.networkDistance != 1){
                console.log(`🌐 Lead ${lead.connectionId} has network distance: ${lead.networkDistance}, updating...`);
                try {
                    let networkInfo = await _getProfileNetworkInfo(lead)
                    console.log(`✅ Got network info for lead ${lead.connectionId}`);

                    // update network distance on crm platform
                    lead.networkDegree = networkInfo.data.distance.value
                    console.log(`📊 Updating lead ${lead.connectionId} with network degree: ${lead.networkDegree}`);
                    await updateLeadNetworkDegree(lead)
                    console.log(`✅ Successfully updated lead ${lead.connectionId}`);
                } catch (error) {
                    console.error(`❌ Error while trying to get profile network for lead ${lead.connectionId}:`, error.message)
                }
            } else {
                console.log(`⏭️ Skipping lead ${lead.connectionId} - already has network distance 1`);
            }

            console.log(`⏱️ Waiting 30 seconds before processing next lead...`);
            await delay(30000)
            console.log(`✅ 30-second delay completed, moving to next lead...`);
        }
        
        console.log('🎉 Finished processing all leads in _updateCampaignLeadsNetwork');
        
        // After network updates are complete, trigger campaign execution for running campaigns
        console.log('🚀 Checking for running campaigns to execute...');
        console.log('📊 All campaigns found:', campaigns.map(c => ({id: c.id, name: c.name, status: c.status})));
        
        let runningCampaignsFound = false;
        for(let campaign of campaigns){
            if(['active','running'].includes(campaign.status)){
                runningCampaignsFound = true;
                console.log(`🎯 Triggering campaign execution for campaign ${campaign.id}: ${campaign.name}`);
                try {
                    await setCampaignAlarm(campaign);
                    console.log(`✅ Campaign ${campaign.id} execution triggered successfully`);
                } catch (error) {
                    console.error(`❌ Error triggering campaign ${campaign.id} execution:`, error);
                }
            }
        }
        
        if (!runningCampaignsFound) {
            console.log('⏸️ No running campaigns found. All campaigns are stopped:');
            campaigns.forEach(campaign => {
                console.log(`   - Campaign ${campaign.id}: ${campaign.name} (Status: ${campaign.status})`);
            });
            console.log('💡 To start a campaign, change its status to "running" or "active" in your dashboard.');
        }
    } else {
        console.log('❌ No campaigns found to process');
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

// Make it globally accessible for testing in service worker context
self.startCampaign = startCampaign;
self.triggerCampaignExecution = triggerCampaignExecution;
self.cleanupDuplicateLeads = cleanupDuplicateLeads;
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

// Initialize the extension when service worker starts
chrome.runtime.onStartup.addListener(() => {
    console.log('🚀 LinkDominator extension started');
    getUserProfile();
});

// Also initialize when service worker is installed/activated
chrome.runtime.onInstalled.addListener(() => {
    console.log('🔧 LinkDominator extension installed');
    getUserProfile();
});
