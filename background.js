// Remove problematic imports and add necessary variables and functions
// importScripts('./js/universalAction.js');
// importScripts('./js/actions/autorespondAction.js');
// importScripts('./js/actions/campaignAction.js');
importScripts('./env.js');

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
                'lk-id': linkedinId,
                'ngrok-skip-browser-warning': 'true',
                'Accept': 'application/json'
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
                                'lk-id': linkedinId,
                                'ngrok-skip-browser-warning': 'true',
                                'Accept': 'application/json'
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
                        // Use browser automation instead of API
                        const browserResult = await _sendMessageBrowser({
                            name: scheduleInfo.recipient || 'Unknown',
                            connectionId: scheduleInfo.connectionId,
                            conId: scheduleInfo.connectionId,
                            publicIdentifier: scheduleInfo.connectionId
                        }, scheduleInfo.message || arConnectionModel.message);
                        
                        if (browserResult.success) {
                            console.log('✅ Scheduling message sent (browser automation)');
                        } else {
                            throw new Error(browserResult.error || 'Failed to send scheduling message via browser automation');
                        }
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
    
    if (request.action === 'sendMessageBrowser') {
        console.log('📤 Message send request received via browser automation');
        const { lead, message } = request.data || {};
        
        if (!lead || !message) {
            sendResponse({
                success: false,
                error: 'Missing lead or message data'
            });
            return true;
        }
        
        // Use the browser automation function
        _sendMessageBrowser(lead, message)
            .then(result => {
                console.log('✅ Browser automation result:', result);
                sendResponse(result);
            })
            .catch(error => {
                console.error('❌ Browser automation error:', error);
                sendResponse({
                    success: false,
                    error: error.message || 'Failed to send message via browser automation'
                });
            });
        
        return true; // Keep message channel open for async response
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
    }else if(alarm.name.startsWith('next_step_')){
        console.log(`🔔 Alarm triggered: ${alarm.name}`);
        handleNextStepExecution(alarm.name);
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
                    // Inline API call to avoid scoping issues
                    try {
                        const leadsResponse = await fetch(`${PLATFORM_URL}/api/campaign/${currentCampaign.id}/leads`, {
                            method: 'GET',
                            headers: {
                                'Content-Type': 'application/json',
                                'lk-id': linkedinId,
                                'ngrok-skip-browser-warning': 'true',
                                'Accept': 'application/json'
                            }
                        });
                        
                        if (leadsResponse.ok) {
                            const contentType = leadsResponse.headers.get('content-type');
                            if (contentType && contentType.includes('application/json')) {
                                const leadsDataResponse = await leadsResponse.json();
                                if (leadsDataResponse.status === 200 && leadsDataResponse.data) {
                                    leadsToProcess = Array.isArray(leadsDataResponse.data) ? leadsDataResponse.data : [];
                            console.log(`👥 Retrieved ${leadsToProcess.length} leads from campaign`);
                                } else if (Array.isArray(leadsDataResponse)) {
                                    leadsToProcess = leadsDataResponse;
                                    console.log(`👥 Retrieved ${leadsToProcess.length} leads (direct array response)`);
                                }
                            }
                        } else {
                            console.error(`❌ Failed to fetch leads (status ${leadsResponse.status})`);
                        }
                    } catch (error) {
                        console.error(`❌ Error fetching leads:`, error.message);
                    }
                } else {
                    console.log(`⚠️ Unknown action type "${actionType}" - falling back to all leads`);
                    
                    // Fallback: try to get all campaign leads - inline API call
                    try {
                        const leadsResponse = await fetch(`${PLATFORM_URL}/api/campaign/${currentCampaign.id}/leads`, {
                            method: 'GET',
                            headers: {
                                'Content-Type': 'application/json',
                                'lk-id': linkedinId,
                                'ngrok-skip-browser-warning': 'true',
                                'Accept': 'application/json'
                            }
                        });
                        
                        if (leadsResponse.ok) {
                            const contentType = leadsResponse.headers.get('content-type');
                            if (contentType && contentType.includes('application/json')) {
                                const leadsDataResponse = await leadsResponse.json();
                                if (leadsDataResponse.status === 200 && leadsDataResponse.data) {
                                    leadsToProcess = Array.isArray(leadsDataResponse.data) ? leadsDataResponse.data : [];
                            console.log(`👥 Retrieved ${leadsToProcess.length} leads from campaign (fallback)`);
                                } else if (Array.isArray(leadsDataResponse)) {
                                    leadsToProcess = leadsDataResponse;
                                    console.log(`👥 Retrieved ${leadsToProcess.length} leads (fallback, direct array)`);
                                }
                            }
                        }
                    } catch (error) {
                        console.error(`❌ Error fetching leads (fallback):`, error.message);
                    }
                }

                if (leadsToProcess.length > 0) {
                    console.log(`🚀 Executing sequence for ${leadsToProcess.length} leads`);
                    // Get processed leads from storage for this alarm
                    const storageKey = `campaign_${alarm.name}_processed`;
                    const storageResult = await chrome.storage.local.get([storageKey]);
                    const processedLeads = storageResult[storageKey] || [];
                    console.log(`📋 Found ${processedLeads.length} previously processed leads in storage`);
                    await runSequence(currentCampaign, leadsToProcess, nodeModel, alarm.name, processedLeads);
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
    }else if(alarm.name === 'content_creator_check'){
        // DEPRECATED: Content creator posting now handled by backend API
        console.log('⚠️ Content Creator alarm - NOW HANDLED BY BACKEND API (No action needed)');
        return;
    }else{
        console.log('🎯 Starting general campaign alarm for:', alarm.name);
        chrome.storage.local.get(["campaign","nodeModel", "sequence", `campaign_${alarm.name}_running`, `campaign_${alarm.name}_running_timestamp`, `campaign_${alarm.name}_processed`]).then(async (result) => {
            console.log(`Campaign ${alarm.name} sequence is running...`)
            let currentCampaign = result.campaign,
            nodeModel = result.nodeModel,
            sequence = result.sequence;

            console.log('📊 Retrieved campaign data:', currentCampaign);
            console.log('🔗 Retrieved node model:', nodeModel);
            console.log('🔗 Retrieved sequence:', sequence?.length || 0, 'nodes');

            // Validate campaign data exists
            if (!currentCampaign || !currentCampaign.id) {
                console.error('❌ Invalid campaign data in storage');
                console.log('🔍 Storage result:', result);
                return;
            }

            // Check if campaign is already running (prevent concurrent executions)
            // But allow if it's been running for more than 2 minutes (might be stuck)
            const isRunning = result[`campaign_${alarm.name}_running`];
            const lockTimestamp = result[`campaign_${alarm.name}_running_timestamp`];
            const now = Date.now();
            const lockAge = lockTimestamp ? (now - lockTimestamp) : 0;
            const MAX_LOCK_AGE = 2 * 60 * 1000; // 2 minutes (reduced from 5 to catch stuck executions faster)
            
            if (isRunning && lockAge < MAX_LOCK_AGE) {
                console.log(`⚠️ Campaign is already running (lock age: ${Math.round(lockAge/1000)}s), skipping this alarm trigger to prevent duplicates`);
                console.log(`🔍 Lock details:`, { isRunning, lockTimestamp, lockAge, MAX_LOCK_AGE });
                return;
            } else if (isRunning && lockAge >= MAX_LOCK_AGE) {
                console.log(`⚠️ Campaign lock is stale (${Math.round(lockAge/1000)}s old), clearing and proceeding...`);
                await chrome.storage.local.remove([`campaign_${alarm.name}_running`, `campaign_${alarm.name}_running_timestamp`]);
            }
            
            // Also check if lock exists but no timestamp (old lock format) - clear it
            if (isRunning && !lockTimestamp) {
                console.log(`⚠️ Found lock without timestamp (old format), clearing it...`);
                await chrome.storage.local.remove([`campaign_${alarm.name}_running`, `campaign_${alarm.name}_running_timestamp`]);
            }

            // Set running flag with timestamp
            await chrome.storage.local.set({ 
                [`campaign_${alarm.name}_running`]: true,
                [`campaign_${alarm.name}_running_timestamp`]: Date.now()
            });
            console.log('🔒 Lock acquired - campaign execution started');

            try {
                let leadsData = [];
                const processedLeads = result[`campaign_${alarm.name}_processed`] || [];
                console.log(`📋 Already processed leads: ${processedLeads.length}`, processedLeads);
                
                // Use the SAME endpoint that works: /api/campaign/{id}/leads
                console.log(`📡 Fetching leads for campaign ${currentCampaign.id} from /leads endpoint...`);
                
                // Ensure linkedinId is available
                let currentLinkedInId = linkedinId;
                if (!currentLinkedInId || currentLinkedInId === 'undefined') {
                    const storedId = await chrome.storage.local.get(['linkedinId']);
                    currentLinkedInId = storedId.linkedinId || 'vicken-concept';
                    console.log(`🔑 Using LinkedIn ID from storage: ${currentLinkedInId}`);
                }
                
                try {
                    const leadsResponse = await fetch(`${PLATFORM_URL}/api/campaign/${currentCampaign.id}/leads`, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                            'lk-id': currentLinkedInId,
                            'ngrok-skip-browser-warning': 'true',
                            'Accept': 'application/json'
                        }
                    });
                    
                    if (leadsResponse.ok) {
                        const contentType = leadsResponse.headers.get('content-type');
                        if (contentType && contentType.includes('application/json')) {
                            const leadsDataResponse = await leadsResponse.json();
                            console.log(`📊 /leads endpoint response:`, {
                                status: leadsDataResponse.status,
                                hasData: !!leadsDataResponse.data,
                                dataLength: leadsDataResponse.data?.length || 0
                            });
                            
                            // Handle standardized response format: {data: [...], status: 200}
                            if (leadsDataResponse.status === 200 && leadsDataResponse.data) {
                                leadsData = Array.isArray(leadsDataResponse.data) ? leadsDataResponse.data : [];
                                console.log(`✅ Fetched ${leadsData.length} leads from /leads endpoint`);
                                if (leadsData.length > 0) {
                                    console.log(`📋 Sample leads:`, leadsData.slice(0, 3).map(l => l.name || 'Unknown').join(', '));
                                }
                            } else if (Array.isArray(leadsDataResponse)) {
                                leadsData = leadsDataResponse;
                                console.log(`✅ Fetched ${leadsData.length} leads (direct array response)`);
                            }
                        }
                    } else {
                        console.error(`❌ /leads endpoint failed with status ${leadsResponse.status}`);
                    }
                } catch (apiError) {
                    console.error(`❌ Error fetching leads from /leads endpoint:`, apiError.message);
                }
                
                // Fallback: Try getLeadGenRunning if /leads didn't work
                if ((!leadsData || leadsData.length === 0) && typeof getLeadGenRunning === 'function') {
                    try {
                        leadsData = await getLeadGenRunning(currentCampaign.id);
                        console.log('👥 Retrieved leads via getLeadGenRunning:', leadsData?.length || 0);
                    } catch (error) {
                        console.log('⚠️ getLeadGenRunning failed:', error.message);
                    }
                }
                
                // Fallback: Try getCampaignLeads if still no leads
                if ((!leadsData || leadsData.length === 0) && typeof getCampaignLeads === 'function') {
                    try {
                        await new Promise((resolve) => {
                            getCampaignLeads(currentCampaign.id, (data) => {
                                leadsData = data || [];
                                console.log('👥 Retrieved leads via getCampaignLeads:', leadsData.length);
                                resolve();
                            });
                        });
                    } catch (error) {
                        console.error('❌ Error fetching leads with getCampaignLeads:', error.message);
                    }
                }
                
                // Filter out already processed leads
                if (processedLeads.length > 0) {
                    const processedIds = new Set(processedLeads.map(l => l.id || l.connectionId));
                    console.log(`🔍 FILTERING: Processed IDs:`, Array.from(processedIds));
                    console.log(`🔍 FILTERING: All leads before filter:`, leadsData.map(l => ({ id: l.id, connectionId: l.connectionId, name: l.name })));
                    const originalCount = leadsData.length;
                    leadsData = leadsData.filter(lead => {
                        const leadId = lead.id || lead.connectionId;
                        const isProcessed = processedIds.has(leadId);
                        if (isProcessed) {
                            console.log(`   ⏭️ Filtering out ${lead.name} (ID: ${leadId}) - already processed`);
                        }
                        return !isProcessed;
                    });
                    console.log(`🔍 Filtered leads: ${originalCount} → ${leadsData.length} (skipped ${originalCount - leadsData.length} already processed)`);
                    console.log(`🔍 FILTERING: Remaining leads after filter:`, leadsData.map(l => ({ id: l.id, connectionId: l.connectionId, name: l.name })));
                }

                // Process leads
                if(leadsData && leadsData.length > 0) {
                        console.log('🚀 Starting runSequence with', leadsData.length, 'leads');
                    console.log('📋 Campaign:', currentCampaign.name, '(ID:', currentCampaign.id + ')');
                    console.log('🎯 Node to execute:', nodeModel?.label || nodeModel?.value || 'Unknown');
                    
                    // Pass processed leads tracking info to runSequence
                    await runSequence(currentCampaign, leadsData, nodeModel, alarm.name, processedLeads);
                    } else {
                    console.log('❌ No leads found for campaign (or all leads already processed)');
                    if (processedLeads.length > 0) {
                        console.log(`✅ All ${processedLeads.length} leads have been processed`);
                    } else {
                        console.log('🛑 STOPPING EXECUTION: Cannot process campaign without leads');
                        console.log('💡 SOLUTION: Add leads to this campaign in your LinkDominator dashboard');
                        console.log('🔗 Campaign ID:', currentCampaign.id);
                        console.log('📋 Campaign Name:', currentCampaign.name);
                        console.log('🔍 Campaign Status:', currentCampaign.status);
                    }
                    
                    // Release lock
                    await chrome.storage.local.remove([`campaign_${alarm.name}_running`, `campaign_${alarm.name}_running_timestamp`]);
                    console.log('🔓 Lock released - campaign execution completed (no leads)');
                    }
            } catch (err) {
                console.error('❌ Error in general campaign alarm:', err);
                console.error('❌ Error stack:', err.stack);
                // Release lock on error
                await chrome.storage.local.remove([`campaign_${alarm.name}_running`, `campaign_${alarm.name}_running_timestamp`]);
                console.log('🔓 Lock released due to error');
            } finally {
                // Always ensure lock is released after a timeout (safety net)
                setTimeout(async () => {
                    const checkLock = await chrome.storage.local.get([`campaign_${alarm.name}_running`]);
                    if (checkLock[`campaign_${alarm.name}_running`]) {
                        const lockTime = await chrome.storage.local.get([`campaign_${alarm.name}_running_timestamp`]);
                        const lockAge = lockTime[`campaign_${alarm.name}_running_timestamp`] ? (Date.now() - lockTime[`campaign_${alarm.name}_running_timestamp`]) : 0;
                        if (lockAge > 3 * 60 * 1000) { // 3 minutes
                            console.warn(`⚠️ Safety net: Clearing stale lock (${Math.round(lockAge/1000)}s old)`);
                            await chrome.storage.local.remove([`campaign_${alarm.name}_running`, `campaign_${alarm.name}_running_timestamp`]);
                        }
                    }
                }, 3 * 60 * 1000); // Check after 3 minutes
            }
        }).catch((err) => {
            console.error('❌ Fatal error in alarm handler promise:', err);
            // Release lock on fatal error
            chrome.storage.local.remove([`campaign_${alarm.name}_running`, `campaign_${alarm.name}_running_timestamp`]).then(() => {
                console.log('🔓 Lock released due to fatal error');
            });
        });
    }
})

/**
 * Handle execution of next step after send-invites
 * @param {string} alarmName 
 */
const handleNextStepExecution = async (alarmName) => {
    console.log(`🎯 HANDLING NEXT STEP EXECUTION: ${alarmName}`);
    
    try {
        // Extract campaign ID from alarm name (format: next_step_255_1)
        const parts = alarmName.split('_');
        const campaignId = parseInt(parts[2]);
        
        console.log(`🔍 Campaign ID: ${campaignId}`);
        
        // Get the stored next node info
        const storageKey = `next_node_${campaignId}`;
        const result = await chrome.storage.local.get([storageKey]);
        
        if (!result[storageKey]) {
            console.error(`❌ No next node info found for campaign ${campaignId}`);
            return;
        }
        
        const { campaign, node } = result[storageKey];
        console.log(`📋 Campaign: ${campaign.name} (ID: ${campaign.id})`);
        console.log(`🎯 Next node: ${node.label} (${node.value})`);
        
        // Get leads for this campaign using callback pattern
        getCampaignLeads(campaign.id, (leadsData) => {
            console.log(`👥 Found ${leadsData.length} leads for next step execution`);
            
            if (leadsData.length > 0) {
                // Execute the next node
                runSequence(campaign, leadsData, node).then(() => {
                    console.log(`✅ Next step executed successfully: ${node.label}`);
                }).catch((error) => {
                    console.error(`❌ Error executing next step: ${error}`);
                });
            } else {
                console.log(`⚠️ No leads found for next step execution`);
            }
        });
        
        // Clean up the stored next node info
        chrome.storage.local.remove([storageKey]);
        
    } catch (error) {
        console.error('❌ Error in handleNextStepExecution:', error);
    }
};


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
    
    // Try to get sequence data from storage first (faster and already available)
    const storageKey = `campaign_${campaign.id}`;
    const storedData = await chrome.storage.local.get([storageKey]);
    const campaignData = storedData[storageKey];
    
    if (campaignData && campaignData.sequence && campaignData.sequence.nodeModel) {
        console.log('✅ Using sequence data from storage');
        nodeModelArr = campaignData.sequence.nodeModel;
        // Also update global campaignSequence variable for compatibility
        campaignSequence = campaignData.sequence;
    } else {
        // Fallback: fetch from API if not in storage
        console.log('⚠️ Sequence data not in storage, fetching from API...');
        try {
            if (typeof getCampaignSequence === 'function') {
                await getCampaignSequence(campaign.id);
                nodeModelArr = campaignSequence?.nodeModel;
            } else {
                console.error('❌ getCampaignSequence function not available');
                return;
            }
        } catch (error) {
            console.error('❌ Error fetching campaign sequence:', error.message);
            return;
        }
    }
    
    if (!nodeModelArr || !Array.isArray(nodeModelArr) || nodeModelArr.length === 0) {
        console.error('❌ No valid node model array found');
        return;
    }
    
    alarmName = (campaign.sequenceType || 'default_sequence').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    
    console.log('📋 Campaign sequence loaded:', nodeModelArr ? 'Yes' : 'No');
    console.log('⏰ Alarm name:', alarmName);
    console.log('🔗 Node model array length:', nodeModelArr ? nodeModelArr.length : 0);
    
    // Log first node details
    if (nodeModelArr && nodeModelArr.length > 0) {
        const firstNode = nodeModelArr[0];
        console.log('🎯 FIRST NODE:', {
            key: firstNode.key,
            label: firstNode.label,
            type: firstNode.type,
            value: firstNode.value,
            runStatus: firstNode.runStatus,
            icon: firstNode.icon
        });
    }
    
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
            if(nodeModelArr[0].runStatus === false || nodeModelArr[0].runStatus === null || nodeModelArr[0].runStatus === undefined){
                nodeItem = nodeModelArr[0]
                delayInMinutes = 0.10;
                console.log('✅ Setting up send-invites node with 0.1 minute delay');
            }else{
                console.log('✅ Send-invites ALREADY COMPLETED - finding next unexecuted node...');
                console.log(`📊 Node 0 (send-invites) runStatus: ${nodeModelArr[0].runStatus}`);
                
                // Find next unexecuted action node (same logic as other node types)
                for(const [idx, node] of nodeModelArr.entries()){
                    if((node.runStatus === false || node.runStatus === null || node.runStatus === undefined) && node.type === 'action' && node.value != 'end' && node.value != 'add-action'){
                        nodeItem = node;
                        // Set alarm name based on next node type
                        alarmName = `custom_${node.value}`;
                        // Check if there's a delay node before this action
                        if(idx > 0 && nodeModelArr[idx -1].type === 'delay'){
                            delayInMinutes = nodeModelArr[idx -1].time == 'days' 
                                ? nodeModelArr[idx -1].value * 24 * 60
                                : nodeModelArr[idx -1].value * 60;
                            // Update delay node status (don't await to avoid blocking)
                            if (typeof updateSequenceNodeModel === 'function') {
                                updateSequenceNodeModel(campaign, nodeModelArr[idx -1]).catch(err => {
                                    console.warn(`⚠️ Failed to update delay node:`, err.message);
                                });
                            }
                            console.log(`✅ Found next node: ${node.label} (${node.value}) with delay: ${delayInMinutes} minutes`);
                        } else {
                            delayInMinutes = 0.10;
                            console.log(`✅ Found next node: ${node.label} (${node.value}) - immediate execution`);
                        }
                        break;
                    }
                }
                
                // Check if we found a next node, if not check for end node
                if(!nodeItem){
                    const endNode = nodeModelArr.find(node => node.type === 'end' || node.value === 'end');
                    if(endNode){
                        console.log('🏁 END node detected - marking campaign as completed');
                        try {
                            await updateSequenceNodeModel(campaign, { ...endNode, runStatus: true });
                            await updateCampaign({
                                campaignId: campaign.id,
                                status: 'completed'
                            });
                            console.log('✅ Campaign marked as COMPLETED');
                        } catch (error) {
                            console.error('❌ Failed to mark campaign as completed:', error);
                        }
                        return;
                    } else {
                        console.log('⚠️ No next action node found and no end node');
                        return;
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
                // Find next unexecuted action node (check for false, null, or undefined)
                for(const [idx, node] of nodeModelArr.entries()){
                    if((node.runStatus === false || node.runStatus === null || node.runStatus === undefined) && node.type === 'action' && node.value != 'end' && node.value != 'add-action'){
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
                // Find next unexecuted action node (check for false, null, or undefined)
                for(const [idx, node] of nodeModelArr.entries()){
                    if((node.runStatus === false || node.runStatus === null || node.runStatus === undefined) && node.type === 'action' && node.value != 'end' && node.value != 'add-action'){
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
        // Check if node is already completed
        if(nodeItem.runStatus === true){
            console.log(`⏸️ Node ${nodeItem.label} (${nodeItem.value}) already completed - skipping alarm creation`);
            return;
        }
        
        // Synchronous duplicate prevention - use async/await to prevent race conditions
        (async () => {
            try {
                // Special handling for call nodes - they don't complete, so check if call messages were already sent
                if(nodeItem.value === 'call'){
                    try {
                        // Check Chrome storage directly for call attempts (more reliable than fetching leads)
                        const allStorage = await chrome.storage.local.get();
                        const callAttemptKeys = Object.keys(allStorage).filter(key => 
                            key.startsWith(`call_attempted_${campaign.id}_`)
                        );
                        
                        // If call messages were already sent, skip creating alarm (call node stays open for monitoring)
                        if(callAttemptKeys.length > 0){
                            console.log(`⏸️ Call messages already sent (${callAttemptKeys.length} attempts found) - skipping duplicate alarm creation (call node stays open for monitoring)`);
                            return;
                        }
                    } catch (e) {
                        console.log('⚠️ Could not check call attempts:', e.message);
                    }
                }
                
                // Check if alarm already exists
                const allAlarms = await new Promise((resolve) => {
                    chrome.alarms.getAll(resolve);
                });
                const existingAlarm = allAlarms.find(a => a.name === alarmName);
                if(existingAlarm){
                    console.log(`⏸️ Alarm ${alarmName} already exists - skipping duplicate creation`);
                    return;
                }
                
                // Check if node is currently executing (lock check)
                const lockResult = await chrome.storage.local.get([`campaign_${alarmName}_running`]);
                const isRunning = lockResult[`campaign_${alarmName}_running`];
                if(isRunning){
                    console.log(`⏸️ Node ${nodeItem.label} is already executing (lock active) - skipping alarm creation`);
                    return;
                }
                
                // Double-check alarm doesn't exist (race condition protection)
                const allAlarms2 = await new Promise((resolve) => {
                    chrome.alarms.getAll(resolve);
                });
                const existingAlarm2 = allAlarms2.find(a => a.name === alarmName);
                if(existingAlarm2){
                    console.log(`⏸️ Alarm ${alarmName} was created by another process - skipping duplicate creation`);
                    return;
                }
                
                console.log('🔔 Creating alarm for node:', nodeItem);
                campaignModel = {
                    campaign: campaign,
                    nodeModel: nodeItem,
                    sequence: nodeModelArr // Save the full sequence array for AI mode access
                }
                await chrome.storage.local.set(campaignModel);
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
            } catch (error) {
                console.error(`❌ Error in alarm creation check:`, error);
            }
        })();
    } else {
        console.log('💡 No invite-based node setup needed (campaign does not use send-invites workflow)');
        console.log('🔍 Checking for direct-action campaign (endorse/message/follow/etc. without invites)...');
        
        // For non-invite campaigns, find the first unrun action node and execute it directly
        console.log(`🔍 Scanning ${nodeModelArr.length} nodes for next action to execute...`);
        
        // Start from index 0 to include the first node
        for(let i = 0; i < nodeModelArr.length; i++) {
            let node = nodeModelArr[i];
            console.log(`🔍 Node ${i}: Key: ${node.key}, Type: ${node.type}, Value: ${node.value}, RunStatus: ${node.runStatus}`);
            
            // Check for false, null, or undefined runStatus (all mean "not executed yet")
            if(node.type === 'action' && (node.runStatus === false || node.runStatus === null || node.runStatus === undefined) && node.value !== 'end' && node.value !== 'add-action') {
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
            // Check if node is already completed
            if(nodeItem.runStatus === true){
                console.log(`⏸️ Direct-action node ${nodeItem.label} (${nodeItem.value}) already completed - skipping alarm creation`);
                return;
            }
            
            // Synchronous duplicate prevention - use async/await to prevent race conditions
            (async () => {
                try {
                    // Check if alarm already exists
                    const allAlarms = await new Promise((resolve) => {
                        chrome.alarms.getAll(resolve);
                    });
                    const existingAlarm = allAlarms.find(a => a.name === alarmName);
                    if(existingAlarm){
                        console.log(`⏸️ Direct-action alarm ${alarmName} already exists - skipping duplicate creation`);
                        return;
                    }
                    
                    // Check if node is currently executing (lock check)
                    const lockResult = await chrome.storage.local.get([`campaign_${alarmName}_running`]);
                    const isRunning = lockResult[`campaign_${alarmName}_running`];
                    if(isRunning){
                        console.log(`⏸️ Direct-action node ${nodeItem.label} is already executing (lock active) - skipping alarm creation`);
                        return;
                    }
                    
                    // Double-check alarm doesn't exist (race condition protection)
                    const allAlarms2 = await new Promise((resolve) => {
                        chrome.alarms.getAll(resolve);
                    });
                    const existingAlarm2 = allAlarms2.find(a => a.name === alarmName);
                    if(existingAlarm2){
                        console.log(`⏸️ Direct-action alarm ${alarmName} was created by another process - skipping duplicate creation`);
                        return;
                    }
                    
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
                    await chrome.storage.local.set(campaignModel);
                    console.log('💾 Direct-action campaign model saved to storage');
                    console.log('🔍 Sequence data:', nodeModelArr.length, 'nodes');
                    console.log('🎯 Next action:', nodeItem.label);
                    chrome.alarms.create(
                        alarmName, {
                            delayInMinutes: 0.1
                        }
                    );
                    console.log(`⏰ Direct-action alarm created: ${alarmName}`);
                } catch (error) {
                    console.error(`❌ Error in direct-action alarm creation check:`, error);
                }
            })();
        } else {
            console.log('❌ No executable action found in campaign sequence');
        }
    }
}
const runSequence = async (currentCampaign, leads, nodeModel, alarmName = null, processedLeads = []) => {
    console.log('🎬 RUNSEQUENCE CALLED - Starting sequence execution...');
    console.log('📊 Campaign:', currentCampaign.name, '(ID:', currentCampaign.id, ')');
    console.log('👥 Leads to process:', leads.length);
    console.log('🔒 Alarm name:', alarmName || 'none');
    console.log('📋 Previously processed:', processedLeads.length);
    
    // Filter out already processed leads to prevent duplicate sends
    if (alarmName && processedLeads.length > 0) {
        const processedIds = new Set(processedLeads.map(p => p.id || p.connectionId));
        const originalCount = leads.length;
        leads = leads.filter(lead => {
            const leadId = lead.id || lead.connectionId;
            return !processedIds.has(leadId);
        });
        console.log(`🔍 Filtered out ${originalCount - leads.length} already processed leads. Remaining: ${leads.length}`);
        if (leads.length === 0) {
            console.log('✅ All leads already processed for this node. Skipping execution.');
            return;
        }
    }
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
    console.log(`📊 TOTAL LEADS TO PROCESS: ${leads.length}`);
    if (leads.length > 0) {
        console.log(`📋 Lead names:`, leads.map(l => l.name || 'Unknown').join(', '));
    }
    
    for(const [i, lead] of leads.entries()){
        console.log(`\n${'='.repeat(80)}`);
        console.log(`👤 Processing lead ${i+1}/${leads.length}: ${lead.name || 'Unknown'}`);
        console.log(`🔗 Node action: ${nodeModel.value}`);
        console.log(`📊 Lead details:`, { id: lead.id, connectionId: lead.connectionId, name: lead.name });
        
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
            console.log('\n' + '='.repeat(80));
            console.log('👁️ PROFILE FLOW: STARTING');
            console.log('='.repeat(80));
            console.log(`👤 Lead: ${lead.name}`);
            console.log(`🔗 Connection ID: ${lead.connectionId}`);
            console.log(`🆔 Member URN: ${lead.memberUrn || 'Not available'}`);
            console.log(`📊 Network Distance: ${lead.networkDistance}`);
            console.log(`🎯 Action: View Profile (${nodeModel.value})`);
            console.log(`🔧 Node key: ${nodeModel.key}`);
            console.log(`📊 Run status: ${nodeModel.runStatus}`);
            console.log(`⏰ Delay: ${nodeModel.delayInMinutes || 0} minutes`);
            console.log('─'.repeat(80));
            console.log('🚀 PROFILE FLOW: Viewing profile...');
            let profileViewSuccess = false;
            try {
                await _viewProfile(lead);
                profileViewSuccess = true;
                console.log(`✅ Profile view completed successfully for ${lead.name}`);
            } catch (profileError) {
                console.error(`❌ Profile view failed for ${lead.name}:`, profileError);
                profileViewSuccess = false;
            }
        }else if(nodeModel.value == 'follow'){
            console.log('\n' + '='.repeat(80));
            console.log('👥 FOLLOW FLOW: STARTING');
            console.log('='.repeat(80));
            console.log(`👤 Lead: ${lead.name}`);
            console.log(`🔗 Connection ID: ${lead.connectionId}`);
            console.log(`🆔 Member URN: ${lead.memberUrn || 'Not available'}`);
            console.log(`📊 Network Distance: ${lead.networkDistance}`);
            console.log(`🎯 Action: Follow (${nodeModel.value})`);
            console.log(`🔧 Node key: ${nodeModel.key}`);
            console.log(`📊 Run status: ${nodeModel.runStatus}`);
            console.log(`⏰ Delay: ${nodeModel.delayInMinutes || 0} minutes`);
            console.log('─'.repeat(80));
            console.log('🚀 FOLLOW FLOW: Sending follow request...');
            _followConnection(lead)
        }else if(nodeModel.value == 'like-post'){
            console.log('\n' + '='.repeat(80));
            console.log('👍 LIKE FLOW: STARTING');
            console.log('='.repeat(80));
            console.log(`👤 Lead: ${lead.name}`);
            console.log(`🔗 Connection ID: ${lead.connectionId}`);
            console.log(`🆔 Member URN: ${lead.memberUrn || 'Not available'}`);
            console.log(`📊 Network Distance: ${lead.networkDistance}`);
            console.log(`🎯 Action: Like Post (${nodeModel.value})`);
            console.log(`🔧 Node key: ${nodeModel.key}`);
            console.log(`📊 Run status: ${nodeModel.runStatus}`);
            console.log(`⏰ Delay: ${nodeModel.delayInMinutes || 0} minutes`);
            console.log('─'.repeat(80));
            console.log('🚀 LIKE FLOW: Fetching posts...');
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
                
                // Warn if networkDistance is null (may require InMail credits)
                if (lead.networkDistance === null || lead.networkDistance === undefined) {
                    console.warn('⚠️ MESSAGE FLOW: Network distance is unknown (null)');
                    console.warn('⚠️ This may require InMail credits if the person is not a connection');
                    console.warn('⚠️ Message will attempt to send, but may fail with "Insufficient InMail credits" error');
                }
            } else {
                console.log(`💬 Executing ${nodeModel.value} action...`);
            }
            
            // Initialize arConnectionModel if not available (service worker scoping issue)
            if (typeof arConnectionModel !== 'object' || arConnectionModel === null) {
                arConnectionModel = {};
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

            // Check for duplicate call attempts and set flag IMMEDIATELY to prevent duplicates
            if (nodeModel.value === 'call') {
                const attemptKey = `call_attempted_${currentCampaign.id}_${lead.connectionId}`;
                try {
                    const stored = await chrome.storage.local.get([attemptKey]);
                    if (stored && stored[attemptKey]) {
                        console.log(`⏭️ Skipping duplicate call attempt for ${lead.name} (key: ${attemptKey})`);
                        console.log(`ℹ️ Previous attempt timestamp: ${new Date(stored[attemptKey]).toLocaleString()}`);
                        // Don't mark call node as completed - it stays open for monitoring
                        continue;
                    }
                    // Set flag IMMEDIATELY to prevent duplicate messages if alarm triggers again
                    await chrome.storage.local.set({ [attemptKey]: Date.now() });
                    console.log(`🔒 Call dedupe flag set IMMEDIATELY for ${lead.name} to prevent duplicates`);
                    console.log('📝 No previous call attempt found, proceeding with call...');
                    console.log(`📝 Message from nodeModel: ${nodeModel.message ? `"${nodeModel.message.substring(0, 100)}..."` : 'EMPTY - will use AI or fallback'}`);
                } catch (e) {
                    console.log('⚠️ Could not check/set dedupe key:', e.message);
                }
            }

            if(nodeModel.value == 'call'){
                console.log('📞 Recording call status with enhanced data...');
                try {
                    // Check if storeCallStatus is available
                    let callResponse = null;
                    let callId = null;
                    
                    if (typeof storeCallStatus !== 'function') {
                        console.warn('⚠️ storeCallStatus function not available - creating call record directly via API');
                        
                        // Create call record directly via API
                        try {
                            const callData = {
                                recipient: `${lead.firstName} ${lead.lastName}`,
                                profile: `${firstName} ${lastName}`,
                                sequence: currentCampaign.name,
                                callStatus: 'suggested',
                                company: lead.company || null,
                                industry: lead.industry || null,
                                job_title: lead.jobTitle || null,
                                location: lead.location || null,
                                original_message: arConnectionModel.message || null,
                                paraphrase_user_message: nodeModel.paraphrase_user_message || false,
                                ai_mode: nodeModel.ai_mode || 'auto',
                                review_time: nodeModel.review_time || null,
                                linkedin_profile_url: lead.profileUrl || null,
                                connection_id: lead.connectionId || null,
                                conversation_urn_id: arConnectionModel.conversationUrnId || null,
                                campaign_id: currentCampaign.id || null,
                                campaign_name: currentCampaign.name || null
                            };
                            
                            console.log('📞 Creating call record directly via API...');
                            const directCallResponse = await fetch(`${PLATFORM_URL}/api/book-call/store`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'lk-id': linkedinId,
                                    'ngrok-skip-browser-warning': 'true',
                                    'Accept': 'application/json'
                                },
                                body: JSON.stringify(callData)
                            });
                            
                            if (directCallResponse.ok) {
                                const callContentType = directCallResponse.headers.get('content-type') || '';
                                if (callContentType.includes('application/json')) {
                                    callResponse = await directCallResponse.json();
                                    callId = callResponse.call_id || callResponse.id || callResponse.data?.call_id;
                                    console.log('✅ Call record created directly via API:', callId);
                                    
                                    // Store call_id in Chrome storage for future retrieval
                                    if (callId && lead.connectionId) {
                                        await chrome.storage.local.set({ [`call_id_${lead.connectionId}`]: String(callId) });
                                        console.log(`✅ Stored call_id in Chrome storage: call_id_${lead.connectionId} = ${callId}`);
                                    }
                                } else {
                                    console.error('❌ Expected JSON when creating call record but got non-JSON response');
                                }
                            } else {
                                const errorText = await directCallResponse.text();
                                console.error('❌ Failed to create call record:', directCallResponse.status, errorText);
                            }
                        } catch (directCallError) {
                            console.error('❌ Error creating call record directly:', directCallError);
                        }
                        
                        // If we couldn't create the call record, continue anyway but warn
                        if (!callId) {
                            console.warn('⚠️ Could not create call record - conversation messages may not be stored properly');
                            console.warn('⚠️ Message will still be sent via standard method');
                            messageSentViaAI = false;
                            // Continue to standard message sending
                        } else {
                            // We have a call_id, so we can proceed with AI message flow
                            messageSentViaAI = false; // Will be set to true if AI message is sent
                        }
                    } else {
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
                    
                    // Extract call_id from response
                    callId = callResponse.call_id || callResponse.id || callResponse.data?.call_id;
                    console.log('🔍 Call ID extracted from storeCallStatus:', callId);
                    
                    // Store call_id in Chrome storage for future retrieval
                    if (callId && lead.connectionId) {
                        await chrome.storage.local.set({ [`call_id_${lead.connectionId}`]: String(callId) });
                        console.log(`✅ Stored call_id in Chrome storage: call_id_${lead.connectionId} = ${callId}`);
                    }
                    }
                    
                    // Now fetch the AI-generated message from the backend (for both paths - direct API or storeCallStatus)
                    if (callId) {
                        console.log('🔍 Attempting to fetch AI-generated message...');
                        let aiMessage = null;
                        
                        try {
                            console.log('🔍 Using call ID:', callId);
                            
                            if (!callId) {
                                console.warn('⚠️ No call_id available');
                                messageSentViaAI = false;
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

                                // Use browser automation instead of API
                                const browserResult = await _sendMessageBrowser(lead, arConnectionModel.message);
                                if (browserResult.success) {
                                    console.log('✅ User message sent without AI polling (browser automation)');
                                    
                                    // Use conversation URN from browser automation if available
                                    const extractedConversationUrnId = browserResult.conversationUrnId || null;
                                    if (extractedConversationUrnId) {
                                        console.log(`✅ Extracted conversation URN from browser: ${extractedConversationUrnId}`);
                                        arConnectionModel.conversationUrnId = extractedConversationUrnId;
                                        lead.conversationUrnId = extractedConversationUrnId;
                                    }
                                    
                                messageSentViaAI = true; // prevent duplicate send in standard path
                                } else {
                                    throw new Error(browserResult.error || 'Failed to send message via browser automation');
                                }
                                
                                // Store in Chrome storage IMMEDIATELY (primary tracking)
                                const conversationUrnId = arConnectionModel.conversationUrnId || lead.conversationUrnId || null;
                                await storeSentMessageInChromeStorage(lead.connectionId, arConnectionModel.message, 'user', conversationUrnId);
                                
                                // Wait a bit for conversation_urn_id to be set from messageConnection response
                                setTimeout(async () => {
                                    if (callId && arConnectionModel.message) {
                                        try {
                                            // Async store to database (fire-and-forget, backup persistence)
                                            storeConversationMessage({
                                                call_id: String(callId),
                                                message: arConnectionModel.message,
                                                sender: 'user',
                                                message_type: 'initial_message',
                                                lead_name: lead.name,
                                                connection_id: lead.connectionId,
                                                conversation_urn_id: conversationUrnId,
                                                campaign_id: currentCampaign.id
                                            }).catch(storeErr => {
                                                console.error('⚠️ Failed to sync initial message to database (will retry on next poll):', storeErr);
                                            });
                                            console.log('✅ Initial message stored (Chrome storage + async DB sync)');
                                        } catch (storeErr) {
                                            console.error('❌ Error initiating database sync:', storeErr);
                                        }
                                    }
                                }, 2000); // Wait 2 seconds for messageConnection to set conversation_urn_id
                                
                                // Set up monitoring for responses to this initial message
                                const initialMonitoringData = {
                                    callId: callId,
                                    campaignId: currentCampaign.id,
                                    connectionId: lead.connectionId,
                                    conversationUrnId: conversationUrnId, // Use extracted URN if available
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
                                    'lk-id': currentLinkedInId,
                                    'ngrok-skip-browser-warning': 'true',
                                    'Accept': 'application/json'
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
                                    console.log(`📝 Final message to send: "${aiMessage}"`);
                                    console.log(`👤 Sending to: ${lead.name} (${lead.connectionId})`);
                                    // Use browser automation instead of API
                                    const browserResult = await _sendMessageBrowser(lead, aiMessage);
                                    if (browserResult.success) {
                                    messageSentViaAI = true;
                                        console.log('✅ AI-generated message sent successfully to LinkedIn! (browser automation)');
                                    } else {
                                        throw new Error(browserResult.error || 'Failed to send AI message via browser automation');
                                    }
                                    
                                    // Store the AI message as the first message in conversation history
                                    // Wait a bit for conversation_urn_id to be set from messageConnection response
                                    setTimeout(async () => {
                                        if (callId && aiMessage) {
                                            try {
                                                // Get conversation_urn_id from arConnectionModel (set by messageConnection after sending)
                                                const conversationUrnId = arConnectionModel.conversationUrnId || lead.conversationUrnId || null;
                                                
                                                await storeConversationMessage({
                                                    call_id: String(callId),
                                                    message: aiMessage,
                                                    sender: 'user',
                                                    message_type: 'initial_message',
                                                    lead_name: lead.name,
                                                    connection_id: lead.connectionId,
                                                    conversation_urn_id: conversationUrnId,
                                                    campaign_id: currentCampaign.id
                                                });
                                                console.log('✅ Initial AI message stored in conversation history');
                                            } catch (storeErr) {
                                                console.error('❌ Failed to store initial AI message in conversation history:', storeErr);
                                            }
                                        }
                                    }, 2000); // Wait 2 seconds for messageConnection to set conversation_urn_id
                                } catch (sendErr) {
                                    console.error('❌ Failed to send AI message to LinkedIn:', sendErr);
                                    console.error('❌ Error details:', sendErr.message, sendErr.stack);
                                    // Don't set messageSentViaAI to true so fallback can try
                                    messageSentViaAI = false;
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

                                    // Use browser automation instead of API
                                    const browserResult = await _sendMessageBrowser(lead, arConnectionModel.message);
                                    if (browserResult.success) {
                                        console.log('✅ Fallback user message sent (browser automation)');
                                    messageSentViaAI = true; // prevent duplicate standard send
                                    } else {
                                        throw new Error(browserResult.error || 'Failed to send fallback message via browser automation');
                                    }
                                    
                                    // Store the fallback message as the first message in conversation history
                                    // Wait a bit for conversation_urn_id to be set from messageConnection response
                                    setTimeout(async () => {
                                        if (callId && arConnectionModel.message) {
                                            try {
                                                // Get conversation_urn_id from arConnectionModel (set by messageConnection after sending)
                                                const conversationUrnId = arConnectionModel.conversationUrnId || lead.conversationUrnId || null;
                                                
                                                await storeConversationMessage({
                                                    call_id: String(callId),
                                                    message: arConnectionModel.message,
                                                    sender: 'user',
                                                    message_type: 'initial_message',
                                                    lead_name: lead.name,
                                                    connection_id: lead.connectionId,
                                                    conversation_urn_id: conversationUrnId,
                                                    campaign_id: currentCampaign.id
                                                });
                                                console.log('✅ Initial fallback message stored in conversation history');
                                            } catch (storeErr) {
                                                console.error('❌ Failed to store initial fallback message in conversation history:', storeErr);
                                            }
                                        }
                                    }, 2000); // Wait 2 seconds for messageConnection to set conversation_urn_id
                                } catch (fallbackErr) {
                                    console.error('❌ Failed to send fallback user message:', fallbackErr);
                                }
                            }
                        }
                    } catch (msgErr) {
                        console.warn('⚠️ Failed to fetch AI message:', msgErr.message);
                        console.warn('🔍 Full error:', msgErr);
                    }
                    
                        // Dedupe flag already set before API call to prevent duplicates
                        console.log('✅ Call status stored successfully');
                    } // End of else block for storeCallStatus availability check
                } catch (err) {
                    console.error('❌ Failed to store call status (will not retry immediately):', err.message);
                    // Dedupe flag is already set, so we won't retry automatically
                    // User can manually retry if needed
                } finally {
                    // Don't mark call node as completed immediately - wait for response
                    console.log('⏳ Call message sent, waiting for response...');
                    console.log('🔄 Campaign will continue running to monitor for responses');
                }
            }

            // Send the LinkedIn message (only if not already sent via AI message processing)
            let messageSuccess = false;
            if (!messageSentViaAI) {
                console.log('📤 Sending message via standard method (no AI message or AI message not used)');
                console.log(`📝 Message content: ${arConnectionModel.message ? `"${arConnectionModel.message.substring(0, 100)}..."` : 'EMPTY - ERROR!'}`);
                console.log(`👤 Sending to: ${lead.name} (${lead.connectionId})`);
                
                // Check if message exists
                if (!arConnectionModel.message || arConnectionModel.message.trim() === '') {
                    console.error(`❌ ERROR: No message content available for ${lead.name}!`);
                    console.error(`❌ Cannot send empty message. Check nodeModel.message in campaign sequence.`);
                    messageSuccess = false;
                    // Remove the duplicate flag so it can retry
                    if (nodeModel.value === 'call') {
                        const attemptKey = `call_attempted_${currentCampaign.id}_${lead.connectionId}`;
                        await chrome.storage.local.remove([attemptKey]);
                        console.log(`🔄 Removed duplicate flag for ${lead.name} - will retry on next run`);
                    }
                    continue; // Skip to next lead
                }
                
                // Ensure we send the current arConnectionModel.message using browser automation
                try {
                    const browserResult = await _sendMessageBrowser(lead, arConnectionModel.message);
                    if (browserResult.success) {
                        console.log(`✅ Message sent successfully to ${lead.name} (browser automation)`);
                        messageSuccess = true;
                        
                        // Extract and store conversation URN from browser automation result
                        if (browserResult.conversationUrnId) {
                            console.log(`🔗 Extracted conversation URN from browser: ${browserResult.conversationUrnId}`);
                            // Store in arConnectionModel and lead for later use
                            arConnectionModel.conversationUrnId = browserResult.conversationUrnId;
                            lead.conversationUrnId = browserResult.conversationUrnId;
                            
                            // Update monitoring data with conversation URN (for both call and message actions)
                            const monitoringKey = `call_response_monitoring_${currentCampaign.id}_${lead.connectionId}`;
                            const existingMonitoring = await chrome.storage.local.get([monitoringKey]);
                            if (existingMonitoring[monitoringKey]) {
                                existingMonitoring[monitoringKey].conversationUrnId = browserResult.conversationUrnId;
                                await chrome.storage.local.set({ [monitoringKey]: existingMonitoring[monitoringKey] });
                                console.log(`✅ Updated monitoring data with conversation URN: ${browserResult.conversationUrnId}`);
                            }
                        } else {
                            console.log('⚠️ No conversation URN extracted from browser automation');
                        }
                    } else {
                        throw new Error(browserResult.error || 'Failed to send message via browser automation');
                    }
                    
                    // For call actions, store the message as the first message in conversation history
                    if (nodeModel.value === 'call') {
                        // Get callId from storage
                        const callIdKey = `call_id_${lead.connectionId}`;
                        const callIdData = await chrome.storage.local.get([callIdKey]);
                        const callId = callIdData[callIdKey];
                        
                        // Store conversation message with extracted URN
                        setTimeout(async () => {
                            if (callId && arConnectionModel.message) {
                                try {
                                    // Use conversation URN from browser result (already stored in arConnectionModel)
                                    const conversationUrnId = arConnectionModel.conversationUrnId || lead.conversationUrnId || browserResult.conversationUrnId || null;
                                    
                                    await storeConversationMessage({
                                        call_id: String(callId),
                                        message: arConnectionModel.message,
                                        sender: 'user',
                                        message_type: 'initial_message',
                                        lead_name: lead.name,
                                        connection_id: lead.connectionId,
                                        conversation_urn_id: conversationUrnId,
                                        campaign_id: currentCampaign.id
                                    });
                                    console.log('✅ Initial message stored in conversation history with URN:', conversationUrnId);
                                } catch (storeErr) {
                                    console.error('❌ Failed to store initial message in conversation history:', storeErr);
                                }
                            }
                        }, 1000); // Reduced wait time since we already have the URN from browser result
                    }
                    
                    // For message actions, also store the conversation message and set up monitoring
                    if (nodeModel.value === 'message') {
                        // Store the message in conversation history
                        setTimeout(async () => {
                            try {
                                const conversationUrnId = arConnectionModel.conversationUrnId || lead.conversationUrnId || browserResult.conversationUrnId || null;
                                
                                // Try to get callId from monitoring data (if it exists from a previous call action)
                                const monitoringKey = `call_response_monitoring_${currentCampaign.id}_${lead.connectionId}`;
                                const monitoringData = await chrome.storage.local.get([monitoringKey]);
                                const callId = monitoringData[monitoringKey]?.callId || null;
                                
                                if (callId) {
                                    await storeConversationMessage({
                                        call_id: String(callId),
                                        message: arConnectionModel.message,
                                        sender: 'user',
                                        message_type: 'user_message',
                                        lead_name: lead.name,
                                        connection_id: lead.connectionId,
                                        conversation_urn_id: conversationUrnId,
                                        campaign_id: currentCampaign.id
                                    });
                                    console.log('✅ Message stored in conversation history with URN:', conversationUrnId);
                                } else {
                                    console.log('⚠️ No callId found for message action - message not stored in conversation history');
                                }
                                
                                // Set up or update monitoring data with conversation URN
                                const existingMonitoring = await chrome.storage.local.get([monitoringKey]);
                                if (existingMonitoring[monitoringKey]) {
                                    // Update existing monitoring
                                    existingMonitoring[monitoringKey].conversationUrnId = conversationUrnId;
                                    await chrome.storage.local.set({ [monitoringKey]: existingMonitoring[monitoringKey] });
                                    console.log(`✅ Updated monitoring data with conversation URN for message action`);
                                } else {
                                    // Create new monitoring entry for message action
                                    await chrome.storage.local.set({
                                        [monitoringKey]: {
                                            callId: null,
                                            campaignId: currentCampaign.id,
                                            connectionId: lead.connectionId,
                                            conversationUrnId: conversationUrnId,
                                            leadName: lead.name,
                                            lastCheckedMessageId: null,
                                            sentAt: Date.now(),
                                            status: 'waiting_for_response',
                                            messageCount: 0
                                        }
                                    });
                                    console.log(`✅ Created monitoring data for message action with conversation URN`);
                                }
                            } catch (storeErr) {
                                console.error('❌ Failed to store message in conversation history:', storeErr);
                            }
                        }, 1000);
                    }
                } catch (messageError) {
                    console.error(`❌ Failed to send message to ${lead.name}:`, messageError.message);
                    console.error(`❌ Error stack:`, messageError.stack);
                    console.error(`⏭️ Skipping this lead and continuing to next lead...`);
                    messageSuccess = false;
                    // Remove the duplicate flag so it can retry
                    if (nodeModel.value === 'call') {
                        const attemptKey = `call_attempted_${currentCampaign.id}_${lead.connectionId}`;
                        await chrome.storage.local.remove([attemptKey]);
                        console.log(`🔄 Removed duplicate flag for ${lead.name} - will retry on next run`);
                    }
                    // Don't mark as processed, allow retry on next run
                    continue; // Skip to next lead
                }
            } else {
                console.log('✅ Message already sent via AI message processing, skipping duplicate send');
                messageSuccess = true; // AI message already sent
                
                // Mark as processed since AI message was sent
                if (alarmName) {
                    const processedLead = {
                        id: lead.id,
                        connectionId: lead.connectionId,
                        name: lead.name,
                        processedAt: new Date().toISOString(),
                        success: true,
                        backendUpdated: true
                    };
                    processedLeads.push(processedLead);
                    await chrome.storage.local.set({ [`campaign_${alarmName}_processed`]: processedLeads });
                    console.log(`💾 Saved to Chrome storage: ${lead.name} (Total processed: ${processedLeads.length})`);
                }
                
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
                // Inline API call to avoid scoping issues
                const createResponse = await fetch(`${PLATFORM_URL}/api/campaign/${currentCampaign.id}/leadgen/store`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'lk-id': linkedinId,
                        'ngrok-skip-browser-warning': 'true',
                        'Accept': 'application/json'
                    }
                });
                
                if (createResponse.ok) {
                    const createData = await createResponse.json();
                    console.log('✅ Successfully created lead gen running entries:', createData);
                } else {
                    const errorText = await createResponse.text();
                    console.warn(`⚠️ Failed to create lead gen running (status ${createResponse.status}):`, errorText);
                    // Don't throw - continue anyway, records might already exist
                }
            } catch (error) {
                console.error('❌ Failed to create lead gen running entries:', error.message);
                // Don't throw - continue anyway, records might already exist
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
            
            let inviteSuccess = false;
            let backendUpdateSuccess = false;
            
            if(currentNetworkDistance != 1 && !nodeModel.runStatus){
                console.log('✅ CONDITIONS MET: Sending connection invite to:', lead.name);
                console.log('🚀 About to call _sendConnectionInvite...');
                try {
                    // Send invite - this will also update backend table
                    await _sendConnectionInvite(lead, nodeModel, currentCampaign.id);
                    console.log(`✅ Invite process completed for ${lead.name}`);
                    
                    // _sendConnectionInvite updates backend table internally and throws error if it fails
                    // If we reach here, backend was updated successfully
                    backendUpdateSuccess = lead._backendUpdated === true;
                    
                    if (backendUpdateSuccess) {
                        console.log(`✅ Backend table verified updated for lead ${lead.name}`);
                    } else {
                        throw new Error('Backend update verification failed');
                    }
                    
                    inviteSuccess = true; // Mark as successful only if no error thrown
                } catch (error) {
                    console.error(`❌ Invite failed for ${lead.name}:`, error);
                    console.error(`❌ Error details:`, error.stack);
                    inviteSuccess = false; // Mark as failed
                    backendUpdateSuccess = false;
                    console.log(`⚠️ Lead ${lead.name} will NOT be marked as processed due to failure`);
                }
            } else {
                console.log('❌ CONDITIONS NOT MET - Skipping invite:');
                if (currentNetworkDistance == 1) {
                    console.log('   ⏭️ Reason: Already connected (current network distance is 1)');
                    console.log('   ✅ User already accepted invite - marking as accepted in backend...');
                    
                    // If already connected, mark them as accepted immediately
                    try {
                        const leadIdToUpdate = lead.id || lead.connectionId;
                        if (leadIdToUpdate) {
                            const updateData = {
                                acceptedStatus: true,
                                statusLastId: 3, // 3 = accepted
                                currentNodeKey: nodeModel.key || 0,
                                nextNodeKey: 0
                            };
                            
                            const response = await fetch(`${PLATFORM_URL}/api/campaign/${currentCampaign.id}/leadgen/${leadIdToUpdate}/update`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'lk-id': linkedinId,
                                    'ngrok-skip-browser-warning': 'true',
                                    'Accept': 'application/json'
                                },
                                body: JSON.stringify(updateData)
                            });
                            
                            if (response.ok) {
                                const updateResult = await response.json();
                                console.log(`✅ Already-connected user ${lead.name} marked as accepted:`, updateResult);
                                console.log(`🔄 Continuing to process remaining leads...`);
                                backendUpdateSuccess = true;
                                // Update local lead object
                                lead.acceptedStatus = true;
                                lead.statusLastId = 3;
                            } else {
                                console.error(`❌ Failed to mark already-connected user as accepted: ${response.status}`);
                                backendUpdateSuccess = false;
                            }
                        } else {
                            console.warn('⚠️ Could not mark as accepted: No lead ID available');
                            backendUpdateSuccess = false;
                        }
                    } catch (updateError) {
                        console.error(`❌ Error marking already-connected user as accepted:`, updateError);
                        backendUpdateSuccess = false;
                    }
                } else if (nodeModel.runStatus) {
                    console.log('   ⏭️ Reason: Node already marked as completed (runStatus is true)');
                } else {
                    console.log('   ⏭️ Reason: Unknown condition failure');
                    console.log(`   🔍 currentNetworkDistance: ${currentNetworkDistance} (expected != 1)`);
                    console.log(`   🔍 runStatus: ${nodeModel.runStatus} (expected false)`);
                }
                
                // Only set inviteSuccess to false if NOT already connected (already connected is a success case)
                if (currentNetworkDistance != 1) {
                    inviteSuccess = false; // Conditions not met = not processed
                    if (currentNetworkDistance != 1) {
                        backendUpdateSuccess = false;
                    }
                } else {
                    // Already connected is considered a success (no invite needed)
                    inviteSuccess = true; // Mark as success since they're already connected
                }
            }
            
            // Only mark as processed if BOTH invite was sent AND backend was updated
            if (inviteSuccess && backendUpdateSuccess && alarmName) {
                const processedLead = { 
                    id: lead.id, 
                    connectionId: lead.connectionId, 
                    name: lead.name, 
                    processedAt: new Date().toISOString(),
                    success: true,
                    backendUpdated: true
                };
                processedLeads.push(processedLead);
                await chrome.storage.local.set({ [`campaign_${alarmName}_processed`]: processedLeads });
                console.log(`💾 STEP 2: Saved to Chrome storage AFTER backend update: ${lead.name} (Total processed: ${processedLeads.length})`);
                console.log(`✅ Lead ${lead.name} fully processed: Backend ✅ Chrome ✅`);
            } else {
                console.log(`⏭️ Lead ${lead.name} NOT saved to Chrome storage`);
                console.log(`   - Invite success: ${inviteSuccess}`);
                console.log(`   - Backend update: ${backendUpdateSuccess}`);
                console.log(`   - Will retry on next campaign run`);
            }
        } else if (nodeModel.value === 'message') {
            // Mark message as processed in Chrome storage if successful
            if (typeof messageSuccess !== 'undefined' && messageSuccess && alarmName) {
                const processedLead = {
                    id: lead.id,
                    connectionId: lead.connectionId,
                    name: lead.name,
                    processedAt: new Date().toISOString(),
                    success: true,
                    backendUpdated: true
                };
                processedLeads.push(processedLead);
                await chrome.storage.local.set({ [`campaign_${alarmName}_processed`]: processedLeads });
                console.log(`💾 Saved to Chrome storage: ${lead.name} (Total processed: ${processedLeads.length})`);
            }
        } else if (nodeModel.value === 'profile-view') {
            // Mark profile view as processed in Chrome storage if successful
            if (typeof profileViewSuccess !== 'undefined' && profileViewSuccess && alarmName) {
                const processedLead = {
                    id: lead.id,
                    connectionId: lead.connectionId,
                    name: lead.name,
                    processedAt: new Date().toISOString(),
                    success: true,
                    backendUpdated: true
                };
                processedLeads.push(processedLead);
                await chrome.storage.local.set({ [`campaign_${alarmName}_processed`]: processedLeads });
                console.log(`💾 Saved to Chrome storage: ${lead.name} (Total processed: ${processedLeads.length})`);
            }
        }
        console.log(`✅ Finished processing lead ${i+1}/${leads.length}`);
        
        console.log(`⏱️ Waiting 20 seconds before next lead...`);
        await delay(20000)
        console.log(`✅ 20-second delay completed`);
    }
    
    // Release lock when all leads are processed
    if (alarmName) {
        // If this is a direct_ alarm, also release the corresponding custom_ lock
        if (alarmName.startsWith('direct_')) {
            const customAlarmName = alarmName.replace('direct_', 'custom_');
            await chrome.storage.local.remove([
                `campaign_${alarmName}_running`,
                `campaign_${alarmName}_running_timestamp`,
                `campaign_${customAlarmName}_running`,
                `campaign_${customAlarmName}_running_timestamp`
            ]);
            console.log(`🔓 Released locks for both ${alarmName} and ${customAlarmName}`);
        } else {
            await chrome.storage.local.remove([`campaign_${alarmName}_running`]);
            console.log('🔓 Lock released - all leads processed');
        }
    }
    
    console.log('🔧 DEBUG: Finished processing all leads, checking for completion logic...');
    console.log(`🔧 DEBUG: Current nodeModel.value: ${nodeModel.value}`);
    
    // Handle completion logic after processing all leads
    if(nodeModel.value == 'send-invites'){
        // 🎯 COMPLETION LOGIC: After sending invites, check for next node
        console.log('🎉 All invites sent successfully! Checking for next node...');
        
        // Mark the send-invites node as completed - inline API call to avoid scoping issues
        try {
            console.log('🔧 DEBUG: About to mark send-invites node as completed...');
            
            // Inline API call to update node status
            const updateNodeResponse = await fetch(`${PLATFORM_URL}/api/campaign/${currentCampaign.id}/update-node`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'lk-id': linkedinId,
                    'ngrok-skip-browser-warning': 'true',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    nodeKey: nodeModel.key,
                runStatus: true
                })
            });
            
            if (updateNodeResponse.ok) {
                const updateNodeData = await updateNodeResponse.json();
                console.log('✅ Send-invites node marked as completed:', updateNodeData);
            } else {
                const errorText = await updateNodeResponse.text();
                console.warn(`⚠️ Failed to mark node as completed (status ${updateNodeResponse.status}):`, errorText);
            }
            
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
        
        // Check if there's a next node in the sequence - inline API call to avoid scoping issues
        try {
            // Inline API call to get campaign sequence
            const sequenceResponse = await fetch(`${PLATFORM_URL}/api/campaign/${currentCampaign.id}/sequence`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'lk-id': linkedinId,
                    'ngrok-skip-browser-warning': 'true',
                    'Accept': 'application/json'
                }
            });
            
            if (!sequenceResponse.ok) {
                throw new Error(`Failed to fetch sequence: ${sequenceResponse.status}`);
            }
            
            const contentType = sequenceResponse.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await sequenceResponse.text();
                if (text.includes('<!DOCTYPE') || text.includes('ngrok')) {
                    throw new Error('Received HTML response (ngrok warning page) instead of JSON');
                }
            }
            
            const sequenceData = await sequenceResponse.json();
            const campaignSequence = sequenceData.data || sequenceData;
            
            console.log(`📋 Campaign sequence loaded with ${campaignSequence.nodeModel?.length || 0} nodes`);
            
            // Find the next node after send-invites
            const nextNode = campaignSequence.nodeModel?.find(node => 
                node.value !== 'send-invites' && !node.runStatus
            );
            
            if (nextNode) {
                console.log(`🔄 Found next node: ${nextNode.label} (${nextNode.value})`);
                console.log(`⏰ Executing next node immediately...`);
                
                // Get accepted leads for the next node - inline API call
                let acceptedLeads = [];
                try {
                    const leadsResponse = await fetch(`${PLATFORM_URL}/api/campaign/${currentCampaign.id}/leads/running`, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                            'lk-id': linkedinId,
                            'ngrok-skip-browser-warning': 'true',
                            'Accept': 'application/json'
                        }
                    });
                    
                    if (leadsResponse.ok) {
                        const leadsData = await leadsResponse.json();
                        const allLeads = leadsData.data || leadsData || [];
                        console.log(`🔍 DEBUG: Total leads in campaignLeadgenRunning: ${allLeads.length}`);
                
                        acceptedLeads = allLeads.filter(lead => 
                    lead.accept_status === true || lead.accept_status === 1 || lead.acceptedStatus === true
                );
                console.log(`🔍 DEBUG: Found ${acceptedLeads.length} accepted leads after filtering`);
                    }
                } catch (error) {
                    console.error('❌ Failed to fetch accepted leads:', error.message);
                }
                
                if (acceptedLeads.length > 0) {
                    console.log(`👥 Found ${acceptedLeads.length} accepted leads for next node execution`);
                    console.log(`🔄 Executing next node: ${nextNode.label} (${nextNode.value})`);
                    
                    // Execute the next node immediately
                    await runSequence(currentCampaign, acceptedLeads, nextNode, alarmName);
                    console.log('✅ Next node executed successfully');
                } else {
                    console.log('⚠️ No accepted leads found for next node execution');
                    console.log('💡 Next node will execute when leads accept the invites');
                }
            } else {
                console.log('❌ No next node found, marking campaign as completed');
                
                try {
                    // Inline API call to mark campaign as completed
                    const updateCampaignResponse = await fetch(`${PLATFORM_URL}/api/campaign/${currentCampaign.id}/update`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'lk-id': linkedinId,
                            'ngrok-skip-browser-warning': 'true',
                            'Accept': 'application/json'
                        },
                        body: JSON.stringify({
                        status: 'completed'
                        })
                    });
                    
                    if (updateCampaignResponse.ok) {
                        const updateData = await updateCampaignResponse.json();
                        console.log('✅ Campaign marked as completed in backend:', updateData);
                        
                        // Remove from active campaigns
                        chrome.storage.local.get(['activeCampaigns'], (result) => {
                            const activeCampaigns = result.activeCampaigns || [];
                            const updatedCampaigns = activeCampaigns.filter(id => id !== currentCampaign.id);
                            chrome.storage.local.set({ activeCampaigns: updatedCampaigns });
                            console.log(`📊 Removed campaign ${currentCampaign.id} from active campaigns list`);
                        });
                    } else {
                        const errorText = await updateCampaignResponse.text();
                        console.warn(`⚠️ Failed to mark campaign as completed (status ${updateCampaignResponse.status}):`, errorText);
                    }
                        
                    // Clear any pending alarms for this campaign
                    chrome.alarms.clear('lead_generation');
                    chrome.alarms.clear('accepted_leads');
                    chrome.alarms.clear(alarmName);
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
    
    // If current node is call, campaign should continue running to monitor for responses
    if (nodeModel.value === 'call') {
        console.log('🔧 DEBUG: Call action completed - campaign will continue running to monitor for responses...');
        
        // For call campaigns, we should NOT mark as completed after sending call messages
        // The campaign should remain active to monitor for user responses
        console.log('📞 Call message sent - campaign will continue running to monitor responses');
        console.log('🔄 Campaign remains active for response monitoring');
        console.log('💡 User can respond to the call message, and the system will detect it');
        
        // Update UI status to show call sent and waiting for response
        try {
            updateCampaignStatus('running', 'Call message sent - waiting for response');
        } catch (error) {
            console.log('⚠️ Could not update UI status:', error.message);
        }
        
        console.log('🔧 DEBUG: Call node completed, campaign continues running for response monitoring');
        return;
    }

    console.log('🔄 Updating sequence node model...');
    // Mark the current node as completed - inline API call to avoid scoping issues
    try {
        console.log(`📤 Updating node model for campaign ${currentCampaign.id}, node ${nodeModel.key}, runStatus: true`);
        
        const response = await fetch(`${PLATFORM_URL}/api/campaign/${currentCampaign.id}/update-node`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'lk-id': linkedinId || 'vicken-concept',
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify({
                nodeKey: nodeModel.key,
                runStatus: true
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ Failed to update sequence node model: ${response.status} ${response.statusText}`, errorText);
            throw new Error(`Failed to update sequence node model: ${response.status}`);
        }

        const data = await response.json();
        console.log(`✅ Sequence node model updated successfully:`, data);
        
        // Refresh sequence from API to get updated runStatus before checking for next node
        console.log('🔄 Refreshing sequence from API to get updated node statuses...');
        try {
            const sequenceResponse = await fetch(`${PLATFORM_URL}/api/campaign/${currentCampaign.id}/sequence`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'lk-id': linkedinId || 'vicken-concept',
                    'ngrok-skip-browser-warning': 'true',
                    'Accept': 'application/json'
                }
            });
            
            if (sequenceResponse.ok) {
                const contentType = sequenceResponse.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    const sequenceData = await sequenceResponse.json();
                    const updatedSequence = sequenceData.data || sequenceData;
                    
                    // Get current campaign data from storage first
                    const campaignKey = `campaign_${currentCampaign.id}`;
                    const currentCampaignData = await chrome.storage.local.get([campaignKey]);
                    
                    // Update storage with fresh sequence data
                    await chrome.storage.local.set({
                        [campaignKey]: {
                            ...(currentCampaignData[campaignKey] || {}),
                            sequence: updatedSequence
                        }
                    });
                    console.log(`✅ Sequence refreshed from API with ${updatedSequence.nodeModel?.length || 0} nodes`);
                }
            }
        } catch (refreshErr) {
            console.warn(`⚠️ Failed to refresh sequence from API, using cached data:`, refreshErr.message);
        }
    } catch (updateErr) {
        console.error(`❌ Error updating sequence node model:`, updateErr);
        // Continue execution even if update fails
    }
    
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
        
        // Log all nodes for debugging
        console.log(`🔍 All nodes in sequence:`, sequenceNodes.map(n => ({
            key: n.key,
            label: n.label,
            value: n.value,
            type: n.type,
            runStatus: n.runStatus
        })));
        
        // Find the next unrun action node (only nodes AFTER the current one)
        const nextNode = sequenceNodes.find(node => 
            node.type === 'action' && 
            node.runStatus === false && 
            node.key > nodeModel.key &&  // Only find nodes AFTER current node
            node.value !== 'end'
        );
        
        if (nextNode) {
            console.log(`🎯 FOUND NEXT NODE: ${nextNode.label} (${nextNode.value})`);
            console.log(`🔑 Next node key: ${nextNode.key}`);
            console.log(`⏰ Next node delay: ${nextNode.delayInMinutes || 0} minutes`);
            console.log(`📊 Current node key: ${nodeModel.key}, Next node key: ${nextNode.key}`);
            
            // Check if this is a direct-action campaign (first node is NOT send-invites)
            const firstNode = sequenceNodes[0];
            const isDirectActionCampaign = firstNode && firstNode.value !== 'send-invites';
            const isSendInvitesCompleted = firstNode && firstNode.value === 'send-invites' && firstNode.runStatus === true;
            
            if (isDirectActionCampaign || isSendInvitesCompleted) {
                if (isDirectActionCampaign) {
                    console.log('💡 This is a direct-action campaign - executing next node immediately');
                } else {
                    console.log('💡 Send-invites completed - executing next node immediately');
                }
                
                // Filter out audience objects - only keep actual lead objects with connectionId
                const validLeads = leads.filter(lead => lead.connectionId && lead.firstName);
                console.log(`👥 Filtered leads: ${validLeads.length} valid out of ${leads.length} total`);
                
                if (validLeads.length > 0) {
                    console.log(`🚀 Executing next node: ${nextNode.label} (${nextNode.value}) with ${validLeads.length} leads`);
                    
                    // Calculate delay based on next node's delayInMinutes
                    const delayMs = (nextNode.delayInMinutes || 0) * 60 * 1000;
                    const minDelay = 2000; // Minimum 2 seconds
                    const actualDelay = Math.max(delayMs, minDelay);
                    
                    console.log(`⏰ Next node will execute in ${actualDelay}ms (${nextNode.delayInMinutes || 0} minutes delay)`);
                    
                    setTimeout(async () => {
                        try {
                            // Get processed leads from storage for the next node
                            const nextAlarmName = `direct_${nextNode.value}`;
                            const customAlarmName = `custom_${nextNode.value}`;
                            const storageKey = `campaign_${nextAlarmName}_processed`;
                            const storageResult = await chrome.storage.local.get([storageKey]);
                            const processedLeads = storageResult[storageKey] || [];
                            console.log(`📋 Found ${processedLeads.length} previously processed leads for next node`);
                            
                            // Set locks for BOTH direct_ and custom_ alarm names to prevent duplicates
                            await chrome.storage.local.set({
                                [`campaign_${nextAlarmName}_running`]: true,
                                [`campaign_${nextAlarmName}_running_timestamp`]: Date.now(),
                                [`campaign_${customAlarmName}_running`]: true,
                                [`campaign_${customAlarmName}_running_timestamp`]: Date.now()
                            });
                            console.log(`🔒 Set locks for both ${nextAlarmName} and ${customAlarmName} to prevent duplicates`);
                            
                            await runSequence(currentCampaign, validLeads, nextNode, nextAlarmName, processedLeads);
                            console.log('✅ Next node executed successfully');
                        } catch (nextNodeError) {
                            console.error(`❌ Error executing next node:`, nextNodeError);
                        }
                    }, actualDelay);
                    
                    console.log('✅ Next node scheduled for execution');
                } else {
                    console.log('⚠️ No valid leads found for next node execution');
                }
            } else {
                console.log('⏸️ Invite-based campaign - let continuous_invite_monitoring handle next steps');
            }
        } else {
            console.log('📭 No next node found - sequence completed');
            
            // Check if the sequence has an "end" node - if so, mark campaign as completed
            const endNode = sequenceNodes.find(node => node.type === 'end' || node.value === 'end');
            if (endNode) {
                console.log('🏁 END node detected - marking campaign as completed');
                console.log(`🔑 End node key: ${endNode.key}`);
                
                try {
                    // Mark the end node as complete - inline API call to avoid scoping issues
                    console.log(`📤 Updating end node for campaign ${currentCampaign.id}, node ${endNode.key}, runStatus: true`);
                    const endNodeResponse = await fetch(`${PLATFORM_URL}/api/campaign/${currentCampaign.id}/update-node`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'lk-id': linkedinId || 'vicken-concept',
                            'ngrok-skip-browser-warning': 'true'
                        },
                        body: JSON.stringify({
                            nodeKey: endNode.key,
                            runStatus: true
                        })
                    });
                    if (!endNodeResponse.ok) {
                        throw new Error(`Failed to update end node: ${endNodeResponse.status}`);
                    }
                    const endNodeData = await endNodeResponse.json();
                    console.log(`✅ End node updated successfully:`, endNodeData);
                    
                    // Mark the campaign as completed - inline API call to avoid scoping issues
                    console.log(`📤 Marking campaign ${currentCampaign.id} as completed`);
                    const campaignResponse = await fetch(`${PLATFORM_URL}/api/campaign/${currentCampaign.id}/update`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'lk-id': linkedinId || 'vicken-concept',
                            'ngrok-skip-browser-warning': 'true'
                        },
                        body: JSON.stringify({
                            campaignId: currentCampaign.id,
                            status: 'completed'
                        })
                    });
                    if (!campaignResponse.ok) {
                        throw new Error(`Failed to update campaign: ${campaignResponse.status}`);
                    }
                    const campaignData = await campaignResponse.json();
                    console.log(`✅ Campaign marked as COMPLETED:`, campaignData);
                    
                    // Remove from active campaigns
                    chrome.storage.local.get(['activeCampaigns'], (result) => {
                        const activeCampaigns = result.activeCampaigns || [];
                        const updatedCampaigns = activeCampaigns.filter(id => id !== currentCampaign.id);
                        chrome.storage.local.set({ activeCampaigns: updatedCampaigns });
                        console.log(`📊 Removed campaign ${currentCampaign.id} from active campaigns list`);
                    });
                    
                    updateCampaignStatus('completed', 'All sequence steps completed');
                } catch (error) {
                    console.error('❌ Failed to mark campaign as completed:', error);
                }
            } else {
                console.log('⚠️ No "end" node found in sequence - campaign will remain active');
            }
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
            // Use browser automation instead of API
            const lead = {
                name: scheduleInfo.name || arConnectionModel.name || 'Unknown',
                connectionId: scheduleInfo.connectionId || arConnectionModel.connectionId,
                conId: scheduleInfo.connectionId || arConnectionModel.connectionId,
                publicIdentifier: scheduleInfo.connectionId || arConnectionModel.connectionId
            };
            const message = scheduleInfo.message || arConnectionModel.message || '';
            await _sendMessageBrowser(lead, message);
        } catch (error) {
            console.log('❌ Error sending message:', error);
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
            console.log('🔍 Full profile response structure:', JSON.stringify(res, null, 2).substring(0, 1000));
            
            // Extract entity URN from multiple possible locations
            let entityUrn = null;
            
            // Try different locations in the response
            if (res.miniProfile?.entityUrn) {
                entityUrn = res.miniProfile.entityUrn;
                console.log('✅ Found entity URN in res.miniProfile.entityUrn:', entityUrn);
            } else if (res.entityUrn) {
                entityUrn = res.entityUrn;
                console.log('✅ Found entity URN in res.entityUrn:', entityUrn);
            } else if (res.miniProfile?.objectUrn) {
                entityUrn = res.miniProfile.objectUrn;
                console.log('✅ Found entity URN in res.miniProfile.objectUrn:', entityUrn);
            } else if (plainId) {
                // Construct entity URN from plainId (format: urn:li:fs_miniProfile:{plainId})
                entityUrn = `urn:li:fs_miniProfile:${plainId}`;
                console.log('✅ Constructed entity URN from plainId:', entityUrn);
            } else if (linkedinId) {
                // Try to construct from public identifier (less reliable)
                // Format might be: urn:li:member:{linkedinId}
                entityUrn = `urn:li:member:${linkedinId}`;
                console.log('⚠️ Constructed entity URN from publicIdentifier (may not be accurate):', entityUrn);
            }
            
            if (!entityUrn) {
                console.error('❌ Could not extract or construct entity URN from profile response');
                console.log('📋 Available fields in res:', Object.keys(res));
                console.log('📋 Available fields in res.miniProfile:', res.miniProfile ? Object.keys(res.miniProfile) : 'null');
            }
            
            // Store LinkedIn ID and profile info (including entity URN for reliable sender detection)
            chrome.storage.local.set({ 
                linkedinId: linkedinId,
                linkedinProfile: {
                    entityUrn: entityUrn,
                    publicIdentifier: linkedinId,
                    firstName: firstName,
                    lastName: lastName,
                    plainId: plainId
                }
            });
            console.log('✅ Stored LinkedIn profile with entity URN:', entityUrn);
            
            // Trigger campaign check now that LinkedIn ID is available
            setTimeout(async () => {
                console.log('🔄 LinkedIn ID available, checking for active campaigns...');
                try {
                    // Ensure LinkedIn ID is properly set before proceeding
                    if (linkedinId && linkedinId !== 'undefined') {
                        // Check if function exists before calling
                        if (typeof initializeActiveCampaigns === 'function') {
                        await initializeActiveCampaigns();
                        } else {
                            console.log('⚠️ initializeActiveCampaigns function not yet available, will retry later');
                            // Retry after a delay
                            setTimeout(async () => {
                                if (typeof initializeActiveCampaigns === 'function') {
                                    await initializeActiveCampaigns();
                                } else {
                                    console.log('⚠️ initializeActiveCampaigns still not available after retry');
                                }
                            }, 2000);
                        }
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
 * Send message using browser automation (fallback when API fails)
 * @param {object} lead - Lead object with connection data
 * @param {string} message - Message text to send
 * @returns {Promise<Object>} - Result object with success status
 */
const _sendMessageBrowser = async (lead, message) => {
    console.log('🚀🚀🚀 _sendMessageBrowser function STARTED!');
    console.log('🔍 Function called with:', { 
        leadName: lead.name, 
        leadId: lead.connectionId || lead.conId,
        messageLength: message ? message.length : 0
    });
    
    try {
        // Create profile URL from connection ID
        let profileId = lead.conId || lead.connectionId || lead.profileId || lead.publicIdentifier;
        
        if (!profileId) {
            console.error('❌ No profile ID found in lead data:', lead);
            return { 
                success: false, 
                error: 'User profile not accessible' 
            };
        }
        
        // Validate profile ID is not "undefined" or empty
        if (profileId === 'undefined' || profileId === '' || profileId === null) {
            console.error('❌ Invalid profile ID:', profileId);
            return { 
                success: false, 
                error: 'User profile not accessible' 
            };
        }
        
        const profileUrl = `https://www.linkedin.com/in/${profileId}`;
        console.log(`🌐 Profile URL: ${profileUrl}`);
        console.log(`📝 Message to send: ${message ? message.substring(0, 100) + '...' : 'No message'}`);
        
        // Step 1: Open LinkedIn profile page in background (like send invite)
        console.log('🔄 Step 1: Opening LinkedIn profile page in background...');
        const tab = await chrome.tabs.create({
            url: profileUrl,
            active: false // Open in background, don't interfere with user's other tabs
        });
        console.log(`✅ Tab created with ID: ${tab.id} (background tab)`);
        
        // Step 2: Wait for tab to load and ensure it's ready
        console.log('🔄 Step 2: Waiting for tab to load completely...');
        await new Promise((resolve) => {
            const checkTab = () => {
                chrome.tabs.get(tab.id, (tabData) => {
                    if (tabData && tabData.status === 'complete') {
                        console.log(`✅ Tab ${tab.id} loaded completely`);
                        resolve();
                    } else {
                        setTimeout(checkTab, 500);
                    }
                });
            };
            checkTab();
        });
        
        // Wait a bit more for page to fully render
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Step 3: Inject automation script
        console.log('🔄 Step 3: Injecting automation script...');
        const result = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: async (messageText) => {
                console.log('🤖 Message automation script injected');
                console.log(`📝 Message to send: ${messageText ? messageText.substring(0, 100) + '...' : 'No message'}`);
                
                // Helper function for delays
                const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
                
                // Helper function to wait for element
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
                                reject(new Error(`Element ${selector} not found within ${timeout}ms`));
                                return;
                            }
                            setTimeout(checkElement, 100);
                        };
                        checkElement();
                    });
                };
                
                try {
                    // Step 1: Find main profile div (.ph5.pb5)
                    console.log('🔍 Step 1: Looking for main profile div (.ph5.pb5)...');
                    let mainProfileDiv = null;
                    try {
                        mainProfileDiv = await waitForElement('.ph5.pb5', 15000);
                        console.log('✅ Main profile div found');
                    } catch (waitError) {
                        console.log('⚠️ Profile container not found with .ph5.pb5, trying alternatives...');
                        const alternativeSelectors = [
                            '[class*="ph5"][class*="pb5"]',
                            '.pv-top-card',
                            '[data-test-id="profile-container"]',
                            'main section'
                        ];
                        
                        for (const selector of alternativeSelectors) {
                            try {
                                mainProfileDiv = await waitForElement(selector, 3000);
                                console.log(`✅ Found profile container with selector: ${selector}`);
                                break;
                            } catch (e) {
                                console.log(`⚠️ Selector ${selector} not found, trying next...`);
                            }
                        }
                    }
                    
                    if (!mainProfileDiv) {
                        console.log('❌ Main profile div not found');
                        window.linkdominatorMessageResult = { success: false, error: 'Profile container not found' };
                        return { success: false, error: 'Profile container not found' };
                    }
                    
                    // Step 2: Look for Message button in .ph5.pb5
                    console.log('🔍 Step 2: Looking for Message button in .ph5.pb5...');
                    const messageSelectors = [
                        '.ph5.pb5 button[aria-label*="Message"]',
                        '.ph5.pb5 button[aria-label*="message"]',
                        '.ph5.pb5 button:contains("Message")',
                        '.ph5.pb5 .artdeco-button[aria-label*="Message"]',
                        '.ph5.pb5 [data-control-name="message"]',
                        '.ph5.pb5 .pv-s-profile-actions--message',
                        '.ph5.pb5 .pv-s-profile-actions button[aria-label*="Message"]',
                        '.ph5.pb5 * button[aria-label*="Message"]',
                        '.ph5.pb5 * button[aria-label*="message"]'
                    ];
                    
                    let messageButton = null;
                    for (const selector of messageSelectors) {
                        messageButton = mainProfileDiv.querySelector(selector);
                        if (messageButton && messageButton.offsetParent !== null) {
                            console.log(`✅ Found Message button with selector: ${selector}`);
                            break;
                        }
                    }
                    
                    // Fallback: look for any button with "Message" text within main profile div
                    if (!messageButton) {
                        console.log('🔍 No direct Message button found, checking by text content...');
                        const profileButtons = mainProfileDiv.querySelectorAll('button');
                        for (const button of profileButtons) {
                            const buttonText = button.textContent.toLowerCase();
                            if (buttonText.includes('message') && button.offsetParent !== null) {
                                messageButton = button;
                                console.log('✅ Found Message button by text content');
                                break;
                            }
                        }
                    }
                    
                    // Step 3: If Message button not found, look for "More" button
                    if (!messageButton) {
                        console.log('🔍 Message button not found, checking "More" dropdown...');
                        const moreButton = mainProfileDiv.querySelector('button[aria-label*="More actions"], button[aria-label*="More"], .artdeco-dropdown__trigger, button[aria-label*="more"], button[aria-label*="Additional actions"]');
                        
                        if (moreButton) {
                            console.log('✅ Found "More" button');
                            console.log('🖱️ Clicking "More" button to open dropdown...');
                            moreButton.click();
                            console.log('✅ "More" button clicked, waiting for dropdown...');
                            await delay(1000); // Wait for dropdown to open
                            
                            // Look for Message button in dropdown
                            console.log('🔍 Searching for Message button in dropdown...');
                            const dropdownMessageSelectors = [
                                '.ph5.pb5 .artdeco-dropdown__content button[aria-label*="Message"]',
                                '.ph5.pb5 .artdeco-dropdown__content button[aria-label*="message"]',
                                '.ph5.pb5 .artdeco-dropdown__item[aria-label*="Message"]',
                                '.ph5.pb5 .artdeco-dropdown__item[aria-label*="message"]',
                                '.ph5.pb5 [role="menuitem"][aria-label*="Message"]',
                                '.ph5.pb5 * .artdeco-dropdown__content button[aria-label*="Message"]',
                                '.ph5.pb5 * .artdeco-dropdown__content button[aria-label*="message"]'
                            ];
                            
                            for (const selector of dropdownMessageSelectors) {
                                messageButton = document.querySelector(selector);
                                if (messageButton && messageButton.offsetParent !== null) {
                                    console.log(`✅ Found Message button in dropdown with selector: ${selector}`);
                                    break;
                                }
                            }
                            
                            // Also check by text content in dropdown
                            if (!messageButton) {
                                console.log('🔍 Searching dropdown by text content...');
                                const dropdownButtons = mainProfileDiv.querySelectorAll('.artdeco-dropdown__content button, .artdeco-dropdown__content [role="menuitem"], .artdeco-dropdown__item');
                                for (const button of dropdownButtons) {
                                    const buttonText = button.textContent.toLowerCase();
                                    if (buttonText.includes('message') && button.offsetParent !== null) {
                                        messageButton = button;
                                        console.log('✅ Found Message button in dropdown by text content');
                                        break;
                                    }
                                }
                            }
                        } else {
                            console.log('❌ "More" button not found');
                        }
                    }
                    
                    if (!messageButton) {
                        console.log('❌ Message button not found');
                        window.linkdominatorMessageResult = { success: false, error: 'Message button not found' };
                        return { success: false, error: 'Message button not found' };
                    }
                    
                    // Step 4: Click Message button
                    console.log('🖱️ Step 4: Clicking Message button...');
                    messageButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    await delay(1000);
                    messageButton.click();
                    console.log('✅ Message button clicked');
                    
                    // Step 5: Wait for message modal/text area to appear
                    console.log('🔄 Step 5: Waiting for message text area to appear...');
                    await delay(2000);
                    
                    // Step 6: Find and fill text area
                    console.log('🔍 Step 6: Looking for message text area...');
                    // PRIORITY: Look for msg-form__contenteditable first (most specific)
                    let textArea = document.querySelector('.msg-form__contenteditable');
                    if (textArea && textArea.offsetParent !== null) {
                        console.log('✅ Found text area with .msg-form__contenteditable');
                    } else {
                        console.log('⚠️ .msg-form__contenteditable not found, trying other selectors...');
                        const textAreaSelectors = [
                            'div[contenteditable="true"][role="textbox"]',
                            'div[contenteditable="true"]',
                            '.msg-form__contenteditable',
                            'textarea[placeholder*="message"]',
                            'textarea[placeholder*="Message"]',
                            '[data-test-id="message-text-input"]',
                            '.msg-send-form__contenteditable',
                            'div[aria-label*="Write a message"]',
                            'div[aria-label*="write a message"]'
                        ];
                        
                        for (const selector of textAreaSelectors) {
                            textArea = document.querySelector(selector);
                            if (textArea && textArea.offsetParent !== null) {
                                console.log(`✅ Found text area with selector: ${selector}`);
                                break;
                            }
                        }
                    }
                    
                    // Fallback: look for any contenteditable div
                    if (!textArea) {
                        console.log('🔍 No text area found with selectors, looking for contenteditable...');
                        const allContentEditables = document.querySelectorAll('div[contenteditable="true"]');
                        console.log(`🔍 Found ${allContentEditables.length} contenteditable divs`);
                        for (let i = 0; i < allContentEditables.length; i++) {
                            const elem = allContentEditables[i];
                            if (elem.offsetParent !== null) {
                                console.log(`   Checking element ${i}: class="${elem.className}"`);
                                // Prefer elements with msg-form in class name
                                if (elem.className && elem.className.includes('msg-form')) {
                                    textArea = elem;
                                    console.log(`✅ Found contenteditable text area with msg-form class: ${elem.className}`);
                                    break;
                                }
                            }
                        }
                        // If still not found, use first visible one
                        if (!textArea) {
                            for (const elem of allContentEditables) {
                                if (elem.offsetParent !== null) {
                                    textArea = elem;
                                    console.log(`✅ Found contenteditable text area (fallback): ${elem.className}`);
                                    break;
                                }
                            }
                        }
                    }
                    
                    if (!textArea) {
                        console.log('❌ Message text area not found');
                        console.log('🔍 Available contenteditable elements:');
                        const allEditable = document.querySelectorAll('[contenteditable="true"]');
                        allEditable.forEach((el, idx) => {
                            console.log(`   ${idx}: class="${el.className}", visible=${el.offsetParent !== null}`);
                        });
                        window.linkdominatorMessageResult = { success: false, error: 'Message text area not found' };
                        return { success: false, error: 'Message text area not found' };
                    }
                    
                    console.log(`✅ Text area found: class="${textArea.className}"`);
                    
                    if (!textArea) {
                        console.log('❌ Message text area not found');
                        window.linkdominatorMessageResult = { success: false, error: 'Message text area not found' };
                        return { success: false, error: 'Message text area not found' };
                    }
                    
                    // Step 7: Input message text
                    console.log('📝 Step 7: Inputting message text...');
                    console.log(`📝 Message: ${messageText}`);
                    console.log(`📝 Text area class: ${textArea.className}`);
                    
                    // For contenteditable divs (like msg-form__contenteditable)
                    if (textArea.contentEditable === 'true' || textArea.hasAttribute('contenteditable')) {
                        console.log('📝 Using contenteditable input method...');
                        
                        // Focus on the text area first
                        textArea.focus();
                        await delay(300);
                        
                        // Click on the text area to ensure it's active
                        textArea.click();
                        await delay(300);
                        
                        // Clear any existing text
                        console.log('🧹 Clearing existing text...');
                        textArea.innerHTML = '';
                        textArea.textContent = '';
                        await delay(200);
                        
                        // Simulate REAL paste (like manual copy-paste) - this is what LinkedIn expects
                        console.log('📋 Simulating REAL paste (like manual copy-paste)...');
                        
                        // Step 1: Copy text to clipboard (like user would do)
                        console.log('📋 Step 1: Copying text to clipboard...');
                        try {
                            await navigator.clipboard.writeText(messageText);
                            console.log('✅ Text copied to clipboard');
                            await delay(200);
                        } catch (clipboardError) {
                            console.log('❌ Failed to copy to clipboard:', clipboardError.message);
                            // Fallback: try execCommand copy
                            try {
                                // Create temporary textarea for copying
                                const tempTextarea = document.createElement('textarea');
                                tempTextarea.value = messageText;
                                tempTextarea.style.position = 'fixed';
                                tempTextarea.style.opacity = '0';
                                document.body.appendChild(tempTextarea);
                                tempTextarea.select();
                                document.execCommand('copy');
                                document.body.removeChild(tempTextarea);
                                console.log('✅ Text copied using execCommand');
                                await delay(200);
                            } catch (e) {
                                console.log('❌ All copy methods failed');
                            }
                        }
                        
                        // Step 2: Focus and clear text area
                        console.log('📋 Step 2: Focusing text area...');
                        textArea.focus();
                        await delay(200);
                        textArea.click();
                        await delay(200);
                        
                        // Clear existing text
                        textArea.innerHTML = '';
                        textArea.textContent = '';
                        await delay(100);
                        
                        // Step 3: Select all (to replace any existing text)
                        console.log('📋 Step 3: Selecting all text...');
                        const pasteSelection = window.getSelection();
                        const pasteRange = document.createRange();
                        pasteRange.selectNodeContents(textArea);
                        pasteSelection.removeAllRanges();
                        pasteSelection.addRange(pasteRange);
                        await delay(100);
                        
                        // Step 4: Simulate Ctrl+V (the actual paste keyboard shortcut)
                        console.log('📋 Step 4: Simulating Ctrl+V paste...');
                        
                        // First, dispatch keydown for Ctrl+V
                        const keyDownEvent = new KeyboardEvent('keydown', {
                            bubbles: true,
                            cancelable: true,
                            key: 'v',
                            code: 'KeyV',
                            ctrlKey: true,
                            metaKey: false,
                            keyCode: 86,
                            which: 86
                        });
                        textArea.dispatchEvent(keyDownEvent);
                        await delay(50);
                        
                        // Then dispatch the paste event with clipboard data
                        const pasteEvent = new ClipboardEvent('paste', {
                            bubbles: true,
                            cancelable: true,
                            clipboardData: new DataTransfer()
                        });
                        pasteEvent.clipboardData.setData('text/plain', messageText);
                        textArea.dispatchEvent(pasteEvent);
                        await delay(50);
                        
                        // Also try execCommand paste (for compatibility)
                        try {
                            document.execCommand('paste', false, null);
                        } catch (e) {
                            // Ignore if not supported
                        }
                        
                        // Dispatch keyup for Ctrl+V
                        const keyUpEvent = new KeyboardEvent('keyup', {
                            bubbles: true,
                            cancelable: true,
                            key: 'v',
                            code: 'KeyV',
                            ctrlKey: true,
                            metaKey: false,
                            keyCode: 86,
                            which: 86
                        });
                        textArea.dispatchEvent(keyUpEvent);
                        
                        await delay(500); // Wait for paste to complete
                        
                        // Step 5: Verify text was pasted
                        console.log('📋 Step 5: Verifying paste...');
                        if (!textArea.textContent || textArea.textContent.trim().length < messageText.trim().length * 0.9) {
                            console.log('⚠️ Paste event may not have worked, trying direct insertion...');
                            // Fallback: direct insertion with execCommand
                            try {
                                if (document.execCommand('insertText', false, messageText)) {
                                    console.log('✅ Text inserted using execCommand insertText');
                                    await delay(300);
                                } else {
                                    // Last resort: direct text setting
                                    textArea.textContent = messageText;
                                    textArea.innerText = messageText;
                                    const inputEvent = new Event('input', { bubbles: true, cancelable: true });
                                    textArea.dispatchEvent(inputEvent);
                                    await delay(300);
                                }
                            } catch (e) {
                                console.log('⚠️ All insertion methods failed');
                            }
                        } else {
                            console.log('✅ Text pasted successfully via clipboard');
                        }
                        
                        // Step 6: Trigger final events to ensure LinkedIn recognizes the input
                        console.log('📋 Step 6: Triggering final validation events...');
                        textArea.click();
                        await delay(100);
                        
                        // Trigger input event one more time
                        const finalInputEvent = new InputEvent('input', {
                            bubbles: true,
                            cancelable: true,
                            inputType: 'insertText'
                        });
                        textArea.dispatchEvent(finalInputEvent);
                        
                        await delay(300);
                        console.log('✅ Paste simulation complete');
                        
                        // Trigger input event IMMEDIATELY after setting text (critical for LinkedIn)
                        const inputEvent = new Event('input', { bubbles: true, cancelable: true });
                        textArea.dispatchEvent(inputEvent);
                        
                        // Also try InputEvent for better compatibility
                        try {
                            const inputEvent2 = new InputEvent('input', { 
                                bubbles: true, 
                                cancelable: true,
                                inputType: 'insertText',
                                data: messageText
                            });
                            textArea.dispatchEvent(inputEvent2);
                        } catch (e) {
                            console.log('⚠️ InputEvent not available:', e.message);
                        }
                        
                        await delay(100);
                        
                        // Trigger beforeinput event (LinkedIn might listen to this)
                        try {
                            const beforeInputEvent = new InputEvent('beforeinput', { 
                                bubbles: true, 
                                cancelable: true,
                                inputType: 'insertText',
                                data: messageText
                            });
                            textArea.dispatchEvent(beforeInputEvent);
                        } catch (e) {
                            // Fallback if InputEvent not available
                            const beforeInputEvent = new Event('beforeinput', { bubbles: true, cancelable: true });
                            textArea.dispatchEvent(beforeInputEvent);
                        }
                        await delay(50);
                        
                        // Trigger change event
                        const changeEvent = new Event('change', { bubbles: true, cancelable: true });
                        textArea.dispatchEvent(changeEvent);
                        await delay(50);
                        
                        // Trigger keyup event (some frameworks listen to this)
                        const keyupEvent = new KeyboardEvent('keyup', { bubbles: true, cancelable: true, key: ' ' });
                        textArea.dispatchEvent(keyupEvent);
                        await delay(50);
                        
                        // Trigger composition events
                        try {
                            const compositionEnd = new CompositionEvent('compositionend', { bubbles: true, data: messageText });
                            textArea.dispatchEvent(compositionEnd);
                        } catch (e) {
                            // Fallback
                            const compositionEnd = new Event('compositionend', { bubbles: true });
                            textArea.dispatchEvent(compositionEnd);
                        }
                        await delay(50);
                        
                        // Force a re-render by blurring and focusing again
                        textArea.blur();
                        await delay(50);
                        textArea.focus();
                        await delay(50);
                        
                        // Trigger input event one more time after focus
                        textArea.dispatchEvent(inputEvent);
                        await delay(100);
                        
                        console.log('✅ Message text inputted (contenteditable)');
                        console.log(`   Text length: ${textArea.textContent.length}`);
                        console.log(`   Text content preview: "${textArea.textContent.substring(0, 50)}..."`);
                        
                        // Verify text was set correctly
                        if (textArea.textContent.length === 0 || textArea.textContent.trim() !== messageText.trim()) {
                            console.log('⚠️ Text verification failed, retrying...');
                            textArea.textContent = messageText;
                            textArea.dispatchEvent(inputEvent);
                            await delay(200);
                        }
                    } else {
                        // For regular textarea
                        console.log('📝 Using textarea input method...');
                        textArea.focus();
                        await delay(200);
                        textArea.value = '';
                        await delay(100);
                        textArea.value = messageText;
                        
                        // Trigger multiple events
                        textArea.dispatchEvent(new Event('input', { bubbles: true }));
                        textArea.dispatchEvent(new Event('change', { bubbles: true }));
                        textArea.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
                        
                        console.log('✅ Message text inputted (textarea)');
                        console.log(`   Value length: ${textArea.value.length}`);
                    }
                    
                    // Wait longer for Send button to become enabled
                    console.log('⏳ Waiting for Send button to become enabled...');
                    console.log('⏳ Text area content:', textArea.textContent ? `"${textArea.textContent.substring(0, 50)}..."` : 'EMPTY');
                    await delay(3000); // Wait longer for LinkedIn to process the text
                    
                    // Step 8: Find and click Send button
                    console.log('🔍 Step 8: Looking for Send button...');
                    console.log('🔍 Final text area check:', textArea.textContent ? `"${textArea.textContent.substring(0, 50)}..."` : 'EMPTY');
                    await delay(2000); // Additional wait for Send button to become enabled
                    
                    let sendButton = null;
                    
                    // FIRST: Look for the msg-form__footer container and search within it
                    console.log('🔍 Step 8a: Looking for msg-form__footer container...');
                    const footerContainer = document.querySelector('.msg-form__footer');
                    if (footerContainer) {
                        console.log('✅ Found msg-form__footer container!');
                        console.log(`   Container has ${footerContainer.querySelectorAll('button').length} buttons`);
                        
                        // Search for Send button within the footer container
                        const footerSendSelectors = [
                            'button[aria-label*="Send"]',
                            'button[aria-label*="send"]',
                            'button[aria-label="Send"]',
                            'button[aria-label="send"]',
                            'button[type="submit"]',
                            'button[type="button"]',
                            '.msg-form__send-button',
                            'button'
                        ];
                        
                        for (const selector of footerSendSelectors) {
                            const buttons = footerContainer.querySelectorAll(selector);
                            console.log(`   Found ${buttons.length} buttons with selector: ${selector}`);
                            
                            for (const button of buttons) {
                                const isVisible = button.offsetParent !== null;
                                const isDisabled = button.disabled;
                                const buttonText = button.textContent.toLowerCase().trim();
                                const ariaLabel = button.getAttribute('aria-label')?.toLowerCase() || '';
                                
                                console.log(`     Button: "${buttonText}" (visible: ${isVisible}, disabled: ${isDisabled}, aria-label: "${ariaLabel}")`);
                                
                                // Check if this looks like a Send button
                                if (isVisible && !isDisabled && (buttonText.includes('send') || ariaLabel.includes('send') || selector === 'button[type="submit"]')) {
                                    sendButton = button;
                                    console.log(`✅ Found Send button in msg-form__footer with selector: ${selector}`);
                                    break;
                                }
                            }
                            
                            if (sendButton) break;
                        }
                        
                        // If still not found, try any enabled button in footer
                        if (!sendButton) {
                            console.log('🔍 Trying any enabled button in footer...');
                            const allFooterButtons = footerContainer.querySelectorAll('button');
                            for (const button of allFooterButtons) {
                                if (button.offsetParent !== null && !button.disabled) {
                                    sendButton = button;
                                    console.log(`✅ Using enabled button in footer: "${button.textContent.trim()}"`);
                                    break;
                                }
                            }
                        }
                    } else {
                        console.log('⚠️ msg-form__footer container not found, trying other methods...');
                    }
                    
                    // FALLBACK: If not found in footer, try global selectors
                    if (!sendButton) {
                        console.log('🔍 Step 8b: Trying global selectors...');
                        const sendSelectors = [
                            'button[aria-label*="Send"]',
                            'button[aria-label*="send"]',
                            'button[aria-label="Send"]',
                            'button[aria-label="send"]',
                            '.msg-form__send-button',
                            '.msg-send-form__send-button',
                            'button[data-control-name="send_message"]',
                            '.artdeco-button[aria-label*="Send"]',
                            'button[type="submit"]',
                            'button.send-button',
                            '[data-test-id="send-button"]',
                            'button.msg-form__send-button'
                        ];
                        
                        for (const selector of sendSelectors) {
                            try {
                                sendButton = document.querySelector(selector);
                                if (sendButton) {
                                    console.log(`🔍 Found element with selector: ${selector}`);
                                    console.log(`   - Visible: ${sendButton.offsetParent !== null}`);
                                    console.log(`   - Disabled: ${sendButton.disabled}`);
                                    console.log(`   - Text: "${sendButton.textContent.trim()}"`);
                                    console.log(`   - Aria-label: "${sendButton.getAttribute('aria-label')}"`);
                                    
                                    if (sendButton.offsetParent !== null && !sendButton.disabled) {
                                        console.log(`✅ Found Send button with selector: ${selector}`);
                                        break;
                                    } else {
                                        console.log(`⚠️ Button found but not usable (visible: ${sendButton.offsetParent !== null}, disabled: ${sendButton.disabled})`);
                                        sendButton = null;
                                    }
                                }
                            } catch (e) {
                                console.log(`⚠️ Error with selector ${selector}:`, e.message);
                            }
                        }
                    }
                    
                    // Fallback: look for any button with "Send" text
                    if (!sendButton) {
                        console.log('🔍 No Send button found with selectors, checking all buttons by text...');
                        const allButtons = document.querySelectorAll('button');
                        console.log(`🔍 Found ${allButtons.length} total buttons on page`);
                        
                        for (let i = 0; i < allButtons.length; i++) {
                            const button = allButtons[i];
                            const buttonText = button.textContent.toLowerCase().trim();
                            const isVisible = button.offsetParent !== null;
                            const isDisabled = button.disabled;
                            
                            if (i < 10) { // Log first 10 buttons for debugging
                                console.log(`   Button ${i}: "${buttonText}" (visible: ${isVisible}, disabled: ${isDisabled})`);
                            }
                            
                            if (buttonText.includes('send') && isVisible && !isDisabled) {
                                sendButton = button;
                                console.log(`✅ Found Send button by text content at index ${i}: "${buttonText}"`);
                                break;
                            }
                        }
                    }
                    
                    // Additional fallback: look for buttons near the message form
                    if (!sendButton) {
                        console.log('🔍 Trying to find Send button near message form...');
                        const messageForm = textArea.closest('form') || textArea.closest('.msg-form') || textArea.closest('[class*="msg"]');
                        if (messageForm) {
                            console.log('✅ Found message form container');
                            const formButtons = messageForm.querySelectorAll('button');
                            console.log(`🔍 Found ${formButtons.length} buttons in message form`);
                            
                            for (const button of formButtons) {
                                const buttonText = button.textContent.toLowerCase().trim();
                                const isVisible = button.offsetParent !== null;
                                const isDisabled = button.disabled;
                                
                                console.log(`   Form button: "${buttonText}" (visible: ${isVisible}, disabled: ${isDisabled})`);
                                
                                if ((buttonText.includes('send') || button.getAttribute('aria-label')?.toLowerCase().includes('send')) && isVisible && !isDisabled) {
                                    sendButton = button;
                                    console.log(`✅ Found Send button in message form: "${buttonText}"`);
                                    break;
                                }
                            }
                        }
                    }
                    
                    // Last resort: look for any enabled button that might be the send button
                    if (!sendButton) {
                        console.log('🔍 Last resort: looking for any enabled button in message area...');
                        const messageArea = textArea.closest('[class*="msg"]') || textArea.closest('[class*="message"]') || document.body;
                        const areaButtons = messageArea.querySelectorAll('button');
                        console.log(`🔍 Found ${areaButtons.length} buttons in message area`);
                        
                        for (const button of areaButtons) {
                            if (button.offsetParent !== null && !button.disabled) {
                                const buttonText = button.textContent.toLowerCase().trim();
                                const ariaLabel = button.getAttribute('aria-label')?.toLowerCase() || '';
                                
                                // Check if it looks like a send button (has send text or icon)
                                if (buttonText.includes('send') || ariaLabel.includes('send') || button.querySelector('[class*="send"]') || button.querySelector('[class*="paper-plane"]')) {
                                    sendButton = button;
                                    console.log(`✅ Found potential Send button: "${buttonText}"`);
                                    break;
                                }
                            }
                        }
                    }
                    
                    if (!sendButton) {
                        console.log('❌ Send button not found after all attempts');
                        console.log('🔍 Current page structure:');
                        console.log('   - Text area found:', !!textArea);
                        console.log('   - Text area parent:', textArea.parentElement?.className);
                        console.log('   - All buttons count:', document.querySelectorAll('button').length);
                        window.linkdominatorMessageResult = { success: false, error: 'Send button not found' };
                        return { success: false, error: 'Send button not found' };
                    }
                    
                    // Step 9: Click Send button
                    console.log('📤 Step 9: Clicking Send button...');
                    console.log(`   Button details: text="${sendButton.textContent.trim()}", aria-label="${sendButton.getAttribute('aria-label')}"`);
                    sendButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    await delay(500);
                    
                    // Try multiple click methods
                    try {
                        sendButton.click();
                        console.log('✅ Send button clicked (method 1: click())');
                    } catch (e) {
                        console.log('⚠️ Click method 1 failed, trying method 2...');
                        try {
                            sendButton.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
                            console.log('✅ Send button clicked (method 2: dispatchEvent)');
                        } catch (e2) {
                            console.log('⚠️ Click method 2 failed, trying method 3...');
                            sendButton.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
                            sendButton.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
                            console.log('✅ Send button clicked (method 3: pointer events)');
                        }
                    }
                    
                    // Step 10: Wait for confirmation and extract conversation URN
                    console.log('⏳ Waiting for message to send...');
                    await delay(3000); // Wait longer for message to send
                    
                    // Try to extract conversation URN from the page
                    let conversationUrnId = null;
                    console.log('🔍 Attempting to extract conversation URN from page...');
                    
                    // Method 1: Check if URL changed to messaging thread
                    const currentUrl = window.location.href;
                    console.log(`🔍 Current URL: ${currentUrl}`);
                    if (currentUrl.includes('/messaging/thread/')) {
                        const threadMatch = currentUrl.match(/\/messaging\/thread\/([^\/\?]+)/);
                        if (threadMatch) {
                            conversationUrnId = threadMatch[1];
                            console.log(`✅ Extracted conversation URN from URL: ${conversationUrnId}`);
                        }
                    }
                    
                    // Method 2: Try to find conversation URN in React state/data attributes
                    if (!conversationUrnId) {
                        console.log('🔍 Trying to extract from React state/data attributes...');
                        // Look for data attributes that might contain conversation info
                        const messageForm = document.querySelector('.msg-form, [class*="msg-form"]');
                        if (messageForm) {
                            // Check data attributes
                            const dataAttrs = ['data-conversation-id', 'data-conversation-urn', 'data-thread-id', 'data-conversation'];
                            for (const attr of dataAttrs) {
                                const value = messageForm.getAttribute(attr);
                                if (value) {
                                    conversationUrnId = value;
                                    console.log(`✅ Found conversation URN in ${attr}: ${conversationUrnId}`);
                                    break;
                                }
                            }
                        }
                    }
                    
                    // Method 3: Try to extract from window.__INITIAL_STATE__ or similar
                    if (!conversationUrnId) {
                        try {
                            // LinkedIn might store conversation data in window state
                            const windowState = window.__INITIAL_STATE__ || window.__APP_STATE__ || window.__REACT_QUERY_STATE__;
                            if (windowState) {
                                const stateStr = JSON.stringify(windowState);
                                // Look for conversation URN patterns
                                const urnMatch = stateStr.match(/urn:li:fsd_conversation:([A-Za-z0-9_-]+)/);
                                if (urnMatch) {
                                    conversationUrnId = urnMatch[1];
                                    console.log(`✅ Extracted conversation URN from window state: ${conversationUrnId}`);
                                }
                            }
                        } catch (e) {
                            console.log('⚠️ Could not access window state:', e.message);
                        }
                    }
                    
                    // Method 4: Check if we're redirected to messaging page
                    if (!conversationUrnId) {
                        await delay(2000); // Wait a bit more for potential redirect
                        const newUrl = window.location.href;
                        if (newUrl !== currentUrl && newUrl.includes('/messaging/thread/')) {
                            const threadMatch = newUrl.match(/\/messaging\/thread\/([^\/\?]+)/);
                            if (threadMatch) {
                                conversationUrnId = threadMatch[1];
                                console.log(`✅ Extracted conversation URN from redirect URL: ${conversationUrnId}`);
                            }
                        }
                    }
                    
                    // Check for success indicators
                    const successIndicators = [
                        '.msg-send-form__message-sent',
                        '[data-test-id="message-sent"]',
                        '.artdeco-inline-feedback--success',
                        '[class*="message-sent"]',
                        '[class*="sent"]'
                    ];
                    
                    let messageSent = false;
                    for (const selector of successIndicators) {
                        const element = document.querySelector(selector);
                        if (element) {
                            console.log(`✅ Message sent successfully confirmed with indicator: ${selector}`);
                            messageSent = true;
                            break;
                        }
                    }
                    
                    // If modal closes or text area clears, assume success
                    if (!messageSent) {
                        const textAreaAfter = document.querySelector('div[contenteditable="true"][role="textbox"]');
                        if (!textAreaAfter || textAreaAfter.textContent.trim() === '') {
                            console.log('✅ Message sent (text area cleared - success indicator)');
                            messageSent = true;
                        }
                    }
                    
                    // Check if Send button is now disabled (another success indicator)
                    if (!messageSent && sendButton.disabled) {
                        console.log('✅ Message sent (Send button disabled - success indicator)');
                        messageSent = true;
                    }
                    
                    if (!messageSent) {
                        console.log('✅ Message sent (no explicit confirmation found, but button was clicked)');
                        messageSent = true;
                    }
                    
                    console.log(`📊 Message send result: success=${messageSent}, conversationUrnId=${conversationUrnId || 'not found'}`);
                    window.linkdominatorMessageResult = { 
                        success: messageSent, 
                        conversationUrnId: conversationUrnId 
                    };
                    return { 
                        success: messageSent, 
                        conversationUrnId: conversationUrnId 
                    };
                    
                } catch (error) {
                    console.error('❌ Error in message automation:', error.message);
                    window.linkdominatorMessageResult = { success: false, error: error.message };
                    return { success: false, error: error.message };
                }
            },
            args: [message]
        });
        
        // Step 4: Wait for automation to complete
        console.log('🔄 Step 4: Waiting for automation to complete...');
        await new Promise(resolve => setTimeout(resolve, 10000)); // Give time for automation
        
        // Step 5: Get result from injected script
        let automationResult = null;
        try {
            const results = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                function: () => {
                    return window.linkdominatorMessageResult || { success: false, error: 'No result found' };
                }
            });
            
            if (results && results[0] && results[0].result) {
                automationResult = results[0].result;
                console.log('📊 Automation result:', automationResult);
            }
        } catch (resultError) {
            console.error('❌ Error getting automation result:', resultError);
        }
        
        // Step 6: Close the tab
        console.log('🔄 Step 6: Closing automation tab...');
        try {
            await chrome.tabs.remove(tab.id);
            console.log('✅ Tab closed');
        } catch (closeError) {
            console.log('⚠️ Could not close tab:', closeError.message);
        }
        
        // Return result
        if (automationResult && automationResult.success) {
            console.log('✅ Message sent successfully via browser automation');
            return { success: true };
        } else {
            console.error('❌ Message automation failed:', automationResult?.error || 'Unknown error');
            return { 
                success: false, 
                error: automationResult?.error || 'Message automation failed' 
            };
        }
        
    } catch (error) {
        console.error('❌ Error in _sendMessageBrowser:', error);
        return { 
            success: false, 
            error: error.message 
        };
    }
};

/**
 * Send message to a given LinkedIn profile using browser automation
 * NOTE: Voyager API has been removed - all messages now use browser automation
 * @param {object} scheduleInfo - Schedule info (for compatibility, but not used)
 */
const messageConnection = async (scheduleInfo) => {
    console.log('─'.repeat(80));
    console.log('📤 MESSAGE FLOW: USING BROWSER AUTOMATION');
    console.log('─'.repeat(80));
    console.log(`👤 Lead: ${arConnectionModel.name || 'Unknown'}`);
    console.log(`🔗 Connection ID: ${arConnectionModel.connectionId}`);
    console.log(`📅 Timestamp: ${new Date().toLocaleString()}`);
    console.log('─'.repeat(80));
    console.log(`📝 Message: ${arConnectionModel.message ? arConnectionModel.message.substring(0, 150) + '...' : 'No message'}`);
    console.log('─'.repeat(80));
    
    // Process message variables if needed

    // Ensure changeMessageVariableNames is available (service worker scoping)
    // Use try-catch to safely check for function availability
    let messageVarReplacer = null;
    try {
        if (typeof changeMessageVariableNames === 'function') {
            messageVarReplacer = changeMessageVariableNames;
        } else if (typeof self !== 'undefined' && typeof self.changeMessageVariableNames === 'function') {
            messageVarReplacer = self.changeMessageVariableNames;
        } else if (typeof globalThis !== 'undefined' && typeof globalThis.changeMessageVariableNames === 'function') {
            messageVarReplacer = globalThis.changeMessageVariableNames;
        }
    } catch (e) {
        // Function not accessible, will use fallback
        console.warn('⚠️ changeMessageVariableNames not accessible:', e.message);
    }
    
    if (typeof messageVarReplacer === 'function') {
        arConnectionModel.message = messageVarReplacer(arConnectionModel.message, arConnectionModel);
    } else {
        // Fallback: inline variable replacement if function not available
        console.warn('⚠️ changeMessageVariableNames not available, using fallback');
        const lead = arConnectionModel;
        if (arConnectionModel.message && typeof arConnectionModel.message === 'string') {
            arConnectionModel.message = arConnectionModel.message
                .replace(/\{firstName\}/g, lead.firstName || '')
                .replace(/\{lastName\}/g, lead.lastName || '')
                .replace(/\{name\}/g, lead.name || '')
                .replace(/\{title\}/g, lead.title || '')
                .replace(/@firstName/g, lead.firstName || '')
                .replace(/@lastName/g, lead.lastName || '')
                .replace(/@name/g, lead.name || '')
                .replace(/@title/g, lead.title || '');
        }
    }
    
    console.log(`📝 Processed message: ${arConnectionModel.message ? arConnectionModel.message.substring(0, 150) + '...' : 'No message'}`);
    console.log('─'.repeat(80));

    // Use browser automation to send message (Voyager API removed)
    const lead = {
        name: arConnectionModel.name,
        connectionId: arConnectionModel.connectionId,
        conId: arConnectionModel.connectionId,
        publicIdentifier: arConnectionModel.connectionId,
        firstName: arConnectionModel.firstName,
        lastName: arConnectionModel.lastName
    };
    
    try {
        const browserResult = await _sendMessageBrowser(lead, arConnectionModel.message);
        
        if (browserResult.success) {
            console.log('─'.repeat(80));
            console.log('✅ MESSAGE FLOW: SUCCESS! ✅');
            console.log('='.repeat(80));
            console.log('🎉 Message sent successfully via browser automation!');
            console.log(`👤 Lead: ${arConnectionModel.name || 'Unknown'}`);
            console.log(`🔗 Connection ID: ${arConnectionModel.connectionId}`);
            console.log(`📅 Timestamp: ${new Date().toLocaleString()}`);
            console.log('='.repeat(80));
            } else {
            throw new Error(browserResult.error || 'Browser automation failed');
        }
    } catch (error) {
            console.log('─'.repeat(80));
            console.error('❌ MESSAGE FLOW: ERROR');
            console.log('─'.repeat(80));
        console.error('❌ Failed to send LinkedIn message via browser automation!');
            console.error(`👤 Lead: ${arConnectionModel.name || arConnectionModel.connectionId}`);
            console.error(`🔗 Connection ID: ${arConnectionModel.connectionId}`);
        console.error(`❌ Error:`, error);
            console.error(`📅 Timestamp: ${new Date().toLocaleString()}`);
            console.error(`💡 Possible reasons:`);
        console.error(`   1. Message button not found on profile`);
        console.error(`   2. Profile not accessible`);
        console.error(`   3. LinkedIn page structure changed`);
            console.log('─'.repeat(80));
        throw error;
    }
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
const _viewProfile = async (lead) => {
    console.log('─'.repeat(80));
    console.log('🚀 PROFILE FLOW: PREPARING REQUEST');
    console.log('─'.repeat(80));
    console.log(`👤 Lead: ${lead.name}`);
    console.log(`🔗 Connection ID: ${lead.connectionId}`);
    console.log(`🆔 Member URN: ${lead.memberUrn || 'Not available'}`);
    console.log(`📊 Network Distance: ${lead.networkDistance}`);
    console.log(`📅 Timestamp: ${new Date().toLocaleString()}`);
    console.log('─'.repeat(80));
    
    // Get CSRF token
    return new Promise((resolve, reject) => {
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
            console.log('✅ CSRF token obtained for profile view action');
        
        // Extract target ID from member URN, connection ID, or public identifier
        let targetId = null;
        if (lead.memberUrn && typeof lead.memberUrn === 'string' && lead.memberUrn.includes('urn:li:member:')) {
            targetId = lead.memberUrn.replace('urn:li:member:', '');
        } else if (lead.connectionId && typeof lead.connectionId === 'string') {
            // Use connection ID directly if member URN is not available
            targetId = lead.connectionId;
        } else if (lead.publicIdentifier && typeof lead.publicIdentifier === 'string') {
            // Fallback to public identifier
            targetId = lead.publicIdentifier;
        } else {
            console.error('❌ Cannot view profile: No valid member URN, connection ID, or public identifier found');
            console.error('📋 Lead data:', lead);
            reject(new Error('No valid member URN, connection ID, or public identifier found'));
            return; // Exit early if no valid ID found
        }
        
        console.log(`🎯 Target Member ID: ${targetId}`);
        console.log(`🌐 API URL: ${LINKEDIN_URL}/li/track`);
        console.log('─'.repeat(80));
        console.log('📤 Sending profile view request...');

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
        .then(res => {
            console.log('─'.repeat(80));
            console.log('📊 PROFILE FLOW: API RESPONSE');
            console.log('─'.repeat(80));
            console.log(`📊 Status: ${res.status}`);
            console.log(`👤 Lead: ${lead.name}`);
            
            if (res.ok) {
                console.log('─'.repeat(80));
                console.log('✅ PROFILE FLOW: SUCCESS! ✅');
                console.log('='.repeat(80));
                console.log('🎉 Profile viewed successfully!');
                console.log(`👤 Lead: ${lead.name}`);
                console.log(`🔗 Connection ID: ${lead.connectionId}`);
                console.log(`🆔 Member URN: ${lead.memberUrn}`);
                console.log(`📅 Timestamp: ${new Date().toLocaleString()}`);
                console.log(`📊 Response Status: ${res.status}`);
                console.log('='.repeat(80));
            } else {
                console.log('─'.repeat(80));
                console.error('❌ PROFILE FLOW: FAILED');
                console.log('─'.repeat(80));
                console.error(`❌ Status: ${res.status}`);
                console.error(`👤 Lead: ${lead.name}`);
                console.error(`🔗 Connection ID: ${lead.connectionId}`);
                console.log(`📅 Timestamp: ${new Date().toLocaleString()}`);
                console.log('💡 Possible reasons:');
                console.log('   1. Invalid member URN');
                console.log('   2. Rate limit reached');
                console.log('   3. Profile unavailable');
                console.log('   4. Authentication issue');
                console.log('─'.repeat(80));
            }
            
            // LinkedIn's tracking API might return text on errors, handle carefully
            if (res.ok) {
                console.log(`🎉 PROFILE VIEW COMPLETED: ${lead.name}`);
                return res.text().then(text => {
                    try {
                        const result = text ? JSON.parse(text) : {};
                        resolve(result); // Resolve promise on success
                        return result;
                    } catch (e) {
                        resolve({}); // Resolve even if JSON parse fails
                        return {};
                    }
                });
            } else {
                return res.text().then(text => {
                    console.log(`📄 Error response: ${text}`);
                    reject(new Error(`Profile view failed: ${res.status} ${text}`)); // Reject on error
                    return {};
                });
            }
        })
        .then(res => {
            // Response already handled above
        })
        .catch(err => {
            console.log('─'.repeat(80));
            console.error('❌ PROFILE FLOW: ERROR');
            console.log('─'.repeat(80));
            console.error('❌ Error:', err);
            console.error(`👤 Lead: ${lead.name}`);
            console.error(`🔗 Connection ID: ${lead.connectionId}`);
            console.log('─'.repeat(80));
            reject(err); // Reject promise on error
        });
        }).catch(err => {
            console.error('❌ Error getting CSRF token:', err);
            reject(err);
        });
    });
}

/**
 * Follow connection of a given LinkedIn profile.
 * @param {object} lead 
 */
const _followConnection = (lead) => {
    console.log('─'.repeat(80));
    console.log('🚀 FOLLOW FLOW: PREPARING REQUEST');
    console.log('─'.repeat(80));
    console.log(`👤 Lead: ${lead.name}`);
    console.log(`🔗 Connection ID: ${lead.connectionId}`);
    console.log(`🆔 Member URN: ${lead.memberUrn || 'Not available'}`);
    console.log(`📅 Timestamp: ${new Date().toLocaleString()}`);
    console.log('─'.repeat(80));
    
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
        console.log('✅ CSRF token obtained for follow action');
        
        const apiUrl = `${VOYAGER_API}/identity/profiles/${lead.connectionId}/profileActions?versionTag=3533619214&action=follow`;
        console.log('🌐 API URL:', apiUrl);
        console.log('👤 Profile ID used:', lead.connectionId);
        console.log('─'.repeat(80));
        console.log('📤 Sending follow request...');
        
        fetch(apiUrl, {
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
        .then(res => {
            console.log('─'.repeat(80));
            console.log('📊 FOLLOW FLOW: API RESPONSE');
            console.log('─'.repeat(80));
            console.log(`📊 Status: ${res.status}`);
            console.log(`👤 Lead: ${lead.name}`);
            
            if (res.ok) {
                console.log('─'.repeat(80));
                console.log('✅ FOLLOW FLOW: SUCCESS! ✅');
                console.log('='.repeat(80));
                console.log('🎉 Profile followed successfully!');
                console.log(`👤 Lead: ${lead.name}`);
                console.log(`🔗 Connection ID: ${lead.connectionId}`);
                console.log(`📅 Timestamp: ${new Date().toLocaleString()}`);
                console.log(`📊 Response Status: ${res.status}`);
                console.log('='.repeat(80));
            } else {
                console.log('─'.repeat(80));
                console.error('❌ FOLLOW FLOW: FAILED');
                console.log('─'.repeat(80));
                console.error(`❌ Status: ${res.status}`);
                console.error(`👤 Lead: ${lead.name}`);
                console.error(`🔗 Connection ID: ${lead.connectionId}`);
                console.log(`📅 Timestamp: ${new Date().toLocaleString()}`);
                console.log('💡 Possible reasons:');
                console.log('   1. Already following this profile');
                console.log('   2. Profile privacy settings');
                console.log('   3. Rate limit reached');
                console.log('   4. Invalid profile ID');
                console.log('─'.repeat(80));
            }
            
            return res.json();
        })
        .then(res => {
            console.log('🎉 FOLLOW COMPLETED:', lead.name);
        })
        .catch(err => {
            console.log('─'.repeat(80));
            console.error('❌ FOLLOW FLOW: ERROR');
            console.log('─'.repeat(80));
            console.error('❌ Error:', err);
            console.error(`👤 Lead: ${lead.name}`);
            console.error(`🔗 Connection ID: ${lead.connectionId}`);
            console.log('─'.repeat(80));
        })
    })
}

/**
 * Fetch post for a given LinkedIn profile.
 * @param {object} lead 
 */
const _getProfilePosts = (lead) => {
    console.log('─'.repeat(80));
    console.log('🔍 LIKE FLOW: FETCHING POSTS');
    console.log('─'.repeat(80));
    console.log(`👤 Lead: ${lead.name}`);
    console.log(`🔗 Connection ID: ${lead.connectionId}`);
    console.log(`🆔 Member URN: ${lead.memberUrn || 'Not available'}`);
    console.log(`📅 Timestamp: ${new Date().toLocaleString()}`);
    console.log('─'.repeat(80));
    
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
        console.log('✅ CSRF token obtained for like post action');
        
        let params = `count=1&start=0&q=memberShareFeed&moduleKey=member-shares%3Aphone&profileUrn=urn%3Ali%3Afsd_profile%3A${lead.connectionId}`
        let url = `${VOYAGER_API}/identity/profileUpdatesV2?${params}`
        
        console.log('🌐 Fetching posts from:', url);
        console.log(`👤 Profile ID used: ${lead.connectionId}`);
        console.log('─'.repeat(80));

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
            console.log('─'.repeat(80));
            console.log('📋 LIKE FLOW: POSTS API RESPONSE');
            console.log('─'.repeat(80));
            console.log(`📊 Response received for: ${lead.name}`);
            console.log(`📊 Posts found: ${res.elements?.length || 0}`);
            
            if(res.elements && res.elements.length){
                console.log('─'.repeat(80));
                console.log(`✅ LIKE FLOW: ${res.elements.length} POST(S) FOUND`);
                console.log('─'.repeat(80));
                console.log('🚀 LIKE FLOW: STARTING TO LIKE POSTS');
                console.log('─'.repeat(80));
                
                for(let [idx, item] of res.elements.entries()){
                    console.log(`\n📝 Liking post ${idx + 1}/${res.elements.length}:`);
                    console.log(`   🔗 Post URN: ${item.socialDetail?.urn || 'N/A'}`);
                    _likePost(item, result, lead)
                }
            } else {
                console.log('─'.repeat(80));
                console.log('⚠️ LIKE FLOW: NO POSTS FOUND');
                console.log('─'.repeat(80));
                console.log(`👤 Lead: ${lead.name}`);
                console.log('💡 This user may not have any recent posts');
                console.log('─'.repeat(80));
            }
        })
        .catch(err => {
            console.log('─'.repeat(80));
            console.error('❌ LIKE FLOW: ERROR FETCHING POSTS');
            console.log('─'.repeat(80));
            console.error('❌ Error:', err);
            console.error(`👤 Lead: ${lead.name}`);
            console.error(`🔗 Connection ID: ${lead.connectionId}`);
            console.log('─'.repeat(80));
        })
    })
}

/**
 * Like post for a given LinkedIn profile.
 * @param {object} post 
 * @param {object} result 
 * @param {object} lead 
 */
const _likePost = (post, result, lead) => {
    console.log('─'.repeat(80));
    console.log('🚀 LIKE FLOW: LIKING POST');
    console.log('─'.repeat(80));
    console.log(`👤 Lead: ${lead?.name || 'Unknown'}`);
    console.log(`🔗 Post URN: ${post.socialDetail?.urn || 'N/A'}`);
    console.log(`📅 Timestamp: ${new Date().toLocaleString()}`);
    console.log('─'.repeat(80));
    console.log('📤 Sending like request...');
    
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
    .then(res => {
        console.log('─'.repeat(80));
        console.log('📊 LIKE FLOW: API RESPONSE');
        console.log('─'.repeat(80));
        console.log(`📊 Status: ${res.status}`);
        console.log(`👤 Lead: ${lead?.name || 'Unknown'}`);
        console.log(`🔗 Post URN: ${post.socialDetail?.urn || 'N/A'}`);
        
        if (res.ok) {
            console.log('─'.repeat(80));
            console.log('✅ LIKE FLOW: SUCCESS! ✅');
            console.log('='.repeat(80));
            console.log('🎉 Post liked successfully!');
            console.log(`👤 Lead: ${lead?.name || 'Unknown'}`);
            console.log(`🔗 Post URN: ${post.socialDetail?.urn || 'N/A'}`);
            console.log(`📅 Timestamp: ${new Date().toLocaleString()}`);
            console.log(`📊 Response Status: ${res.status}`);
            console.log('='.repeat(80));
        } else {
            console.log('─'.repeat(80));
            console.error('❌ LIKE FLOW: FAILED');
            console.log('─'.repeat(80));
            console.error(`❌ Status: ${res.status}`);
            console.error(`👤 Lead: ${lead?.name || 'Unknown'}`);
            console.error(`🔗 Post URN: ${post.socialDetail?.urn || 'N/A'}`);
            console.log(`📅 Timestamp: ${new Date().toLocaleString()}`);
            console.log('💡 Possible reasons:');
            console.log('   1. Already liked this post');
            console.log('   2. Post was deleted');
            console.log('   3. Rate limit reached');
            console.log('   4. Invalid post URN');
            console.log('─'.repeat(80));
        }
        
        // LinkedIn's like API returns empty response on success, so don't parse JSON
        if (res.ok) {
            console.log(`🎉 LIKE COMPLETED for ${lead?.name || 'Unknown'}`);
            return Promise.resolve();
        } else {
            return res.json();
        }
    })
    .then(res => {
        // Response already handled above
    })
    .catch(err => {
        console.log('─'.repeat(80));
        console.error('❌ LIKE FLOW: ERROR');
        console.log('─'.repeat(80));
        console.error('❌ Error:', err);
        console.error(`👤 Lead: ${lead?.name || 'Unknown'}`);
        console.error(`🔗 Post URN: ${post.socialDetail?.urn || 'N/A'}`);
        console.log('─'.repeat(80));
    })
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
    let newMessage = null;
    
    if (node.hasInviteNote && rawMessage) {
        if (typeof changeMessageVariableNames === 'function') {
            newMessage = changeMessageVariableNames(rawMessage, lead);
        } else {
            // Fallback: simple variable replacement if function not available
            console.warn('⚠️ changeMessageVariableNames not available, using fallback');
            newMessage = rawMessage
                .replace(/\{firstName\}/g, lead.firstName || '')
                .replace(/\{lastName\}/g, lead.lastName || '')
                .replace(/\{name\}/g, lead.name || '')
                .replace(/\{title\}/g, lead.title || lead.headline || '')
                .replace(/@firstName/g, lead.firstName || '')
                .replace(/@lastName/g, lead.lastName || '')
                .replace(/@name/g, lead.name || '')
                .replace(/@title/g, lead.title || lead.headline || '');
        }
    }
    
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
                        // Create overlay to block user interactions
                        const createOverlay = () => {
                            // Remove any existing overlay first
                            const existingOverlay = document.getElementById('linkdominator-automation-overlay');
                            if (existingOverlay) {
                                existingOverlay.remove();
                            }
                            
                            const overlay = document.createElement('div');
                            overlay.id = 'linkdominator-automation-overlay';
                            overlay.style.cssText = `
                                position: fixed !important;
                                top: 0 !important;
                                left: 0 !important;
                                width: 100vw !important;
                                height: 100vh !important;
                                background: rgba(0, 0, 0, 0.2) !important;
                                z-index: 2147483647 !important;
                                pointer-events: all !important;
                                display: flex !important;
                                align-items: center !important;
                                justify-content: center !important;
                                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
                                backdrop-filter: blur(2px) !important;
                            `;
                            
                            const overlayContent = document.createElement('div');
                            overlayContent.style.cssText = `
                                background: rgba(255, 255, 255, 0.98) !important;
                                padding: 25px 35px !important;
                                border-radius: 12px !important;
                                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2) !important;
                                text-align: center !important;
                                color: #333 !important;
                                font-size: 15px !important;
                                font-weight: 600 !important;
                                border: 2px solid #0077b5 !important;
                                min-width: 280px !important;
                            `;
                            overlayContent.innerHTML = `
                                <div style="margin-bottom: 12px; font-size: 18px;">🤖 LinkDominator</div>
                                <div style="color: #666; font-size: 13px; margin-bottom: 8px;">Processing connection invite...</div>
                                <div style="color: #999; font-size: 11px;">Please wait, do not interact with this page</div>
                            `;
                            
                            overlay.appendChild(overlayContent);
                            
                            // Add to document immediately
                            document.documentElement.appendChild(overlay);
                            
                            // Disable page interactions
                            document.body.style.pointerEvents = 'none';
                            document.body.style.overflow = 'hidden';
                            document.documentElement.style.overflow = 'hidden';
                            
                            // Force visibility
                            overlay.style.display = 'flex';
                            overlay.style.visibility = 'visible';
                            overlay.style.opacity = '1';
                            
                            console.log('🛡️ Overlay created - user interactions blocked');
                            return overlay;
                        };
                        
                        const removeOverlay = () => {
                            const overlay = document.getElementById('linkdominator-automation-overlay');
                            if (overlay) {
                                overlay.remove();
                            }
                            // Restore page interactions
                            document.body.style.pointerEvents = '';
                            document.body.style.overflow = '';
                            document.documentElement.style.overflow = '';
                            console.log('🛡️ Overlay removed - user interactions restored');
                        };
                        
                        // Update overlay text to show automation is starting
                        const updateOverlayText = (text) => {
                            const overlay = document.getElementById('linkdominator-automation-overlay');
                            if (overlay) {
                                const contentDiv = overlay.querySelector('div');
                                if (contentDiv) {
                                    contentDiv.innerHTML = `
                                        <div style="margin-bottom: 12px; font-size: 18px;">🤖 LinkDominator</div>
                                        <div style="color: #666; font-size: 13px; margin-bottom: 8px;">${text}</div>
                                        <div style="color: #999; font-size: 11px;">Please wait, do not interact with this page</div>
                                    `;
                                }
                            }
                        };
                        
                        // Update overlay text to show automation is starting
                        updateOverlayText('Processing connection invite...');
                        
                        console.log('🔍 Step 4: Checking connection status...');
                        console.log('🚨 TEST: Script is executing the try block!');
                        
                        // Check if already connected
                        const connectedElements = document.querySelectorAll('[aria-label*="Connected"], [aria-label*="connected"]');
                        if (connectedElements.length > 0) {
                            console.log('✅ Already connected to this profile - SUCCESSFUL SKIP');
                            window.linkdominatorAutomationResult = { success: true, skipped: true, reason: 'Already connected' };
                            return { success: true, skipped: true, reason: 'Already connected' };
                        }
                        
                        // Check if invite already sent
                        const inviteSentElements = document.querySelectorAll('[aria-label*="Invitation sent"], [aria-label*="invitation sent"]');
                        if (inviteSentElements.length > 0) {
                            console.log('✅ Invite already sent to this profile - SUCCESSFUL SKIP');
                            window.linkdominatorAutomationResult = { success: true, skipped: true, reason: 'Invite already sent' };
                            return { success: true, skipped: true, reason: 'Invite already sent' };
                        }
                        
                        console.log('🔍 Step 5: Looking for Connect button...');
                        console.log('🔍 Page URL:', window.location.href);
                        console.log('🔍 Page title:', document.title);
                        console.log('🚨 TEST: Reached button detection section!');
                        console.log('🚨 DEBUG: About to check for direct Connect buttons...');
                        
                        // Wait for profile container to appear (LinkedIn loads it dynamically)
                        console.log('⏳ Waiting for profile container to load...');
                        let mainProfileDiv = null;
                        try {
                            mainProfileDiv = await waitForElement('.ph5.pb5', 15000); // Wait up to 15 seconds
                            console.log('✅ Main profile div found:', mainProfileDiv);
                        } catch (waitError) {
                            console.log('⚠️ Profile container not found with .ph5.pb5, trying alternative selectors...');
                            // Try alternative selectors
                            const alternativeSelectors = [
                                '[class*="ph5"][class*="pb5"]',
                                '.pv-top-card',
                                '[data-test-id="profile-container"]',
                                'main section',
                                '.pvs-header__container'
                            ];
                            
                            for (const selector of alternativeSelectors) {
                                try {
                                    mainProfileDiv = await waitForElement(selector, 3000);
                                    console.log(`✅ Found profile container with selector: ${selector}`);
                                    break;
                                } catch (e) {
                                    console.log(`⚠️ Selector ${selector} not found, trying next...`);
                                }
                            }
                        }
                        
                        if (!mainProfileDiv) {
                            console.log('❌ Main profile div not found - cannot proceed safely');
                            console.log('🔍 Available divs with classes containing "ph5":');
                            const ph5Divs = document.querySelectorAll('[class*="ph5"]');
                            ph5Divs.forEach((div, index) => {
                                console.log(`   ${index + 1}. Class: "${div.className}"`);
                            });
                            console.log('🔍 Available divs with classes containing "pb5":');
                            const pb5Divs = document.querySelectorAll('[class*="pb5"]');
                            pb5Divs.forEach((div, index) => {
                                console.log(`   ${index + 1}. Class: "${div.className}"`);
                            });
                            // Try to find connect button anywhere on page as last resort
                            const anyConnectButton = document.querySelector('button[aria-label*="Connect"], button[aria-label*="connect"], button[aria-label*="Invite"], button[aria-label*="invite"]');
                            if (anyConnectButton) {
                                console.log('⚠️ Found Connect button outside profile container, using it as fallback');
                                mainProfileDiv = anyConnectButton.closest('div') || document.body;
                            } else {
                            window.linkdominatorAutomationResult = { success: false, error: 'Main profile container not found' };
                            return { success: false, error: 'Main profile container not found' };
                            }
                        }
                        
                        const connectSelectors = [
                            '.ph5.pb5 button[aria-label*="Connect"]',
                            '.ph5.pb5 button[aria-label*="connect"]',
                            '.ph5.pb5 button[aria-label*="Invite"]',
                            '.ph5.pb5 button[aria-label*="invite"]',
                            '.ph5.pb5 .artdeco-button[aria-label*="Connect"]',
                            '.ph5.pb5 .artdeco-button[aria-label*="Invite"]',
                            '.ph5.pb5 [data-control-name="connect"]',
                            '.ph5.pb5 .pv-s-profile-actions--connect',
                            '.ph5.pb5 .pv-s-profile-actions button',
                            '.ph5.pb5 * button[aria-label*="Connect"]',
                            '.ph5.pb5 * button[aria-label*="connect"]',
                            '.ph5.pb5 * button[aria-label*="Invite"]',
                            '.ph5.pb5 * button[aria-label*="invite"]',
                            '.ph5.pb5 * .artdeco-button[aria-label*="Connect"]',
                            '.ph5.pb5 * .artdeco-button[aria-label*="Invite"]'
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
                            const moreButton = mainProfileDiv.querySelector('button[aria-label*="More actions"], button[aria-label*="More"], .artdeco-dropdown__trigger, button[aria-label*="more"], button[aria-label*="Additional actions"]');
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
                                    '.ph5.pb5 button[aria-label*="Connect"]',
                                    '.ph5.pb5 button[aria-label*="connect"]',
                                    '.ph5.pb5 button[aria-label*="Invite"]',
                                    '.ph5.pb5 button[aria-label*="invite"]',
                                    '.ph5.pb5 .artdeco-dropdown__content button[aria-label*="Connect"]',
                                    '.ph5.pb5 .artdeco-dropdown__content button[aria-label*="connect"]',
                                    '.ph5.pb5 .artdeco-dropdown__content button[aria-label*="Invite"]',
                                    '.ph5.pb5 .artdeco-dropdown__content button[aria-label*="invite"]',
                                    '.ph5.pb5 .artdeco-dropdown__item[aria-label*="Connect"]',
                                    '.ph5.pb5 .artdeco-dropdown__item[aria-label*="connect"]',
                                    '.ph5.pb5 .artdeco-dropdown__item[aria-label*="Invite"]',
                                    '.ph5.pb5 .artdeco-dropdown__item[aria-label*="invite"]',
                                    '.ph5.pb5 [aria-label*="Invite"][aria-label*="connect"]',
                                    '.ph5.pb5 [role="button"][aria-label*="Connect"]',
                                    '.ph5.pb5 [role="button"][aria-label*="Invite"]',
                                    '.ph5.pb5 * button[aria-label*="Connect"]',
                                    '.ph5.pb5 * button[aria-label*="connect"]',
                                    '.ph5.pb5 * button[aria-label*="Invite"]',
                                    '.ph5.pb5 * button[aria-label*="invite"]',
                                    '.ph5.pb5 * .artdeco-dropdown__content button[aria-label*="Connect"]',
                                    '.ph5.pb5 * .artdeco-dropdown__content button[aria-label*="connect"]',
                                    '.ph5.pb5 * .artdeco-dropdown__content button[aria-label*="Invite"]',
                                    '.ph5.pb5 * .artdeco-dropdown__content button[aria-label*="invite"]'
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
                            window.linkdominatorAutomationResult = { success: false, error: 'User not found or connection not available' };
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
                            window.linkdominatorAutomationResult = { success: false, error: 'Connection not successfully sent' };
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
                                window.linkdominatorAutomationResult = { success: true };
                                return { success: true };
                            }
                        }
                        
                        console.log('✅ Invite sent (no explicit confirmation found)');
                        console.log('🚨 TEST: Script completed successfully!');
                        window.linkdominatorAutomationResult = { success: true };
                        return { success: true };
                        
                    } catch (error) {
                        console.log('🚨 TEST: Script caught an error!');
                        console.error('❌ Error in automation:', error.message);
                        removeOverlay();
                        window.linkdominatorAutomationResult = { success: false, error: error.message };
                        return { success: false, error: error.message };
                    }
                },
                args: [newMessage]
            });
            
            // Step 4: Wait for automation to complete and get results
            console.log('🔄 Step 4: Waiting for automation to complete...');
            await delay(5000); // Give time for automation to complete
            
            // Check automation result from the injected script
            let automationResult = null;
            try {
                // Try to get the result from the injected script
                const results = await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    func: () => {
                        return window.linkdominatorAutomationResult || { success: false, error: 'No result available' };
                    }
                });
                automationResult = results[0]?.result;
                console.log('🔍 Automation result:', automationResult);
                
                // Remove overlay after getting result
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    func: () => {
                        if (window.linkdominatorRemoveOverlay) {
                            window.linkdominatorRemoveOverlay();
                        } else {
                            // Fallback if stored function not available
                            const overlay = document.getElementById('linkdominator-automation-overlay');
                            if (overlay) {
                                overlay.remove();
                            }
                            document.body.style.pointerEvents = '';
                            document.body.style.overflow = '';
                            document.documentElement.style.overflow = '';
                            console.log('🛡️ Overlay removed - user interactions restored');
                        }
                    }
                });
            } catch (error) {
                console.log('⚠️ Could not get automation result:', error.message);
                automationResult = { success: false, error: 'Could not get result' };
                
                // Still try to remove overlay even if we couldn't get result
                try {
                    await chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        func: () => {
                            if (window.linkdominatorRemoveOverlay) {
                                window.linkdominatorRemoveOverlay();
                            } else {
                                // Fallback if stored function not available
                                const overlay = document.getElementById('linkdominator-automation-overlay');
                                if (overlay) {
                                    overlay.remove();
                                }
                                document.body.style.pointerEvents = '';
                                document.body.style.overflow = '';
                                document.documentElement.style.overflow = '';
                                console.log('🛡️ Overlay removed - user interactions restored');
                            }
                        }
                    });
                } catch (overlayError) {
                    console.log('⚠️ Could not remove overlay:', overlayError.message);
                }
            }
            
            // Step 5: Close the tab
            console.log('🔄 Step 5: Closing tab...');
            try {
                // Check if tab still exists before closing
                const existingTab = await chrome.tabs.get(tab.id).catch(() => null);
                if (existingTab) {
            await chrome.tabs.remove(tab.id);
            console.log('✅ Tab closed');
                } else {
                    console.log('ℹ️ Tab already closed or does not exist');
                }
            } catch (tabError) {
                // Ignore errors if tab doesn't exist (might have been closed already)
                if (chrome.runtime.lastError && chrome.runtime.lastError.message.includes('No tab with id')) {
                    console.log('ℹ️ Tab already closed');
                } else {
                    console.warn('⚠️ Could not close tab:', tabError.message);
                }
            }
            
            // Check if automation succeeded or was successfully skipped
            const isAlreadyConnected = automationResult && automationResult.success && automationResult.skipped && automationResult.reason === 'Already connected';
            
            if (automationResult && automationResult.success) {
                if (automationResult.skipped) {
                    console.log(`✅ INVITATION SKIPPED for ${lead.name} (${lead.connectionId})`);
                    console.log(`📝 Reason: ${automationResult.reason}`);
                    if (isAlreadyConnected) {
                        console.log(`🎉 USER ALREADY CONNECTED - Will update status to 3 (accepted)`);
                    } else {
                        console.log(`💡 This is normal - invite already sent`);
                    }
                } else {
                    console.log(`✅ INVITATION SUCCESSFULLY SENT to ${lead.name} (${lead.connectionId})`);
                    console.log(`🎯 Browser automation - Invitation sent successfully`);
                    console.log(`📝 Message: ${newMessage || 'Default connection message'}`);
                    console.log(`💡 Verify in LinkedIn: My Network → Manage my network → Sent invitations`);
                }
            } else {
                console.log(`❌ INVITATION FAILED for ${lead.name} (${lead.connectionId})`);
                console.log(`🚨 Browser automation failed: ${automationResult?.error || 'Unknown error'}`);
                throw new Error(`Automation failed: ${automationResult?.error || 'Unknown error'}`);
            }
            
            // Update lead status in BACKEND TABLE FIRST (this is the source of truth)
            let backendUpdateSuccess = false;
            try {
                // Use the campaign ID passed as parameter
                const actualCampaignId = campaignId || lead.campaignId || 82; // Fallback to campaign 82
                console.log(`🔄 STEP 1: Updating BACKEND TABLE FIRST for campaign: ${actualCampaignId}, lead: ${lead.id}`);
                console.log(`🔍 Lead object details:`, {
                    id: lead.id,
                    connectionId: lead.connectionId,
                    name: lead.name,
                    source: lead.source
                });
                
                // Try both lead.id and lead.connectionId if lead.id is not available
                const leadIdToUse = lead.id || lead.connectionId;
                if (!leadIdToUse) {
                    console.error('❌ No valid lead ID found for backend update');
                    throw new Error('No valid lead ID');
                }
                
                // Update backend table FIRST - this is the source of truth
                // Inline the API call directly to avoid scoping issues in service workers
                console.log('🔄 Calling backend API directly to update leadgen running...');
                
                // If already connected, mark as accepted (status 3), otherwise mark as sent (status 2)
                const updateData = isAlreadyConnected ? {
                    acceptedStatus: true, // Already connected = accepted
                    currentNodeKey: node.key,
                    nextNodeKey: 0, // Use 0 instead of null to satisfy database constraint
                    statusLastId: 3 // Use 3 to represent 'accepted' (already connected)
                } : {
                    acceptedStatus: false, // Set to false initially - will be updated when invite is accepted
                    currentNodeKey: node.key,
                    nextNodeKey: 0, // Use 0 instead of null to satisfy database constraint
                    statusLastId: 2 // Use 2 to represent 'invite_sent' (1 = initial, 2 = sent, 3 = accepted)
                };
                
                const requestBody = JSON.stringify(updateData);
                console.log(`📦 Request body:`, requestBody);
                console.log(`🔗 API URL: ${PLATFORM_URL}/api/campaign/${actualCampaignId}/leadgen/${leadIdToUse}/update`);
                console.log(`🔑 LinkedIn ID: ${linkedinId}`);
                
                const response = await fetch(`${PLATFORM_URL}/api/campaign/${actualCampaignId}/leadgen/${leadIdToUse}/update`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'lk-id': linkedinId,
                        'ngrok-skip-browser-warning': 'true',
                        'Accept': 'application/json'
                    },
                    body: requestBody
                });
                
                console.log(`📡 Response status: ${response.status} ${response.statusText}`);
                
                if (!response.ok) {
                    const responseText = await response.text();
                    console.error(`❌ Failed to update leadgen running - Status: ${response.status}, Response: ${responseText}`);
                    throw new Error(`API call failed with status ${response.status}: ${responseText}`);
                }
                
                // Check for HTML response (ngrok warning page)
                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    const text = await response.text();
                    if (text.includes('<!DOCTYPE') || text.includes('ngrok')) {
                        throw new Error('Received HTML response (ngrok warning page) instead of JSON');
                    }
                }
                
                const data = await response.json();
                if (isAlreadyConnected) {
                    console.log(`✅ Successfully updated lead ${leadIdToUse} to ACCEPTED (statusLastId: 3) - User was already connected`);
                } else {
                    console.log(`✅ Successfully updated leadgen running for lead ${leadIdToUse} to INVITE SENT (statusLastId: 2)`);
                }
                console.log(`📄 Response data:`, data);
                
                const updateResult = { ...data, status: 200, success: true };
                
                // Verify backend update succeeded
                if (updateResult && (updateResult.status === 200 || updateResult.success !== false)) {
                    backendUpdateSuccess = true;
                    if (isAlreadyConnected) {
                        console.log('✅ STEP 1 COMPLETE: Backend table updated - Lead marked as ACCEPTED (status 3)');
                    } else {
                        console.log('✅ STEP 1 COMPLETE: Backend table updated successfully - Lead marked as INVITE SENT (status 2)');
                    }
                    console.log('📊 Backend update result:', updateResult);
                } else {
                    console.warn('⚠️ Backend update returned unexpected result:', updateResult);
                    // Still mark as success if we got a response (might be different format)
                    backendUpdateSuccess = true;
                }
            } catch (updateError) {
                console.error('❌ STEP 1 FAILED: Backend table update failed:', updateError.message);
                console.error('❌ This invite will NOT be saved to Chrome storage');
                backendUpdateSuccess = false;
                // Re-throw to prevent Chrome storage update
                throw new Error(`Backend update failed: ${updateError.message}`);
            }
            
            // Store backend update success in lead object for later verification
            lead._backendUpdated = backendUpdateSuccess;
            
        } catch (automationError) {
            console.error('❌ Browser automation failed:', automationError);
            console.log('🔄 Falling back to API method...');
            
            // Fallback to API method
            await _sendConnectionInviteAPI(lead, node, newMessage);
        }
        
    } catch (error) {
        console.error(`❌ INVITATION ERROR for ${lead.name} (${lead.connectionId}):`, error);
        console.error('🔍 Possible reasons: Network error, invalid profile, or LinkedIn rate limiting');
        
        // Update lead status for error - inline API call to avoid scoping issues
        try {
            const campaignIdForError = lead.campaignId || campaignId || 0;
            const leadIdForError = lead.id || lead.connectionId;
            
            if (leadIdForError) {
                const updateData = {
                acceptedStatus: false,
                currentNodeKey: node.key,
                    nextNodeKey: 0,
                    statusLastId: 4 // Use 4 to represent 'invite_error'
                };
                
                const response = await fetch(`${PLATFORM_URL}/api/campaign/${campaignIdForError}/leadgen/${leadIdForError}/update`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'lk-id': linkedinId,
                        'ngrok-skip-browser-warning': 'true',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify(updateData)
            });
                
                if (response.ok) {
            console.log('✅ Lead status updated for error');
                } else {
                    console.warn(`⚠️ Failed to update lead status for error: ${response.status}`);
                }
            } else {
                console.warn('⚠️ Could not update lead status: No lead ID available');
            }
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
            'lk-id': linkedinId,
            'Accept': 'application/json',
            'ngrok-skip-browser-warning': 'true',
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
    .then(async res => {
        // Check if response is JSON (not HTML from ngrok)
        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await res.text();
            if (text.includes('<!DOCTYPE') || text.includes('ngrok')) {
                throw new Error('Received HTML response (ngrok warning page) instead of JSON');
            }
        }
        return res.json();
    })
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
                'Accept': 'application/json',
                'lk-id': linkedinId,
                'ngrok-skip-browser-warning': 'true',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify({
                status: 'running'
            })
        });

        if (response.ok) {
            // Check if response is JSON (not HTML from ngrok)
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await response.text();
                if (text.includes('<!DOCTYPE') || text.includes('ngrok')) {
                    throw new Error('Received HTML response (ngrok warning page) instead of JSON');
                }
            }
            
            const data = await response.json();
            console.log(`✅ Campaign ${campaignId} started successfully:`, data);
            
            // Clear any stuck locks and processed leads when campaign starts fresh
            // This ensures we fetch fresh data from backend table (source of truth)
            await chrome.storage.local.remove([
                `campaign_custom_running`, 
                `campaign_custom_processed`,
                `campaign_custom_running_timestamp`
            ]);
            console.log(`🔓 Cleared all Chrome storage for campaign ${campaignId}`);
            console.log(`📋 Campaign will fetch fresh leads from backend table (campaign_leadgen_running)`);
            console.log(`💡 Backend table is the source of truth - Chrome storage is just for tracking`);
            
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
                // Pass conversation URN from monitoring data if available
                const conversationData = await fetchLinkedInConversation(
                    monitoringData.connectionId, 
                    monitoringData.lastCheckedMessageId,
                    monitoringData.conversationUrnId || null
                );
                
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
            headers: { 
                'lk-id': linkedinId,
                'Accept': 'application/json',
                'ngrok-skip-browser-warning': 'true',
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
        
        if (!campaignsResponse.ok) {
            console.error('❌ Failed to fetch campaigns');
            return;
        }
        
        // Check if response is JSON (not HTML from ngrok)
        const contentType = campaignsResponse.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await campaignsResponse.text();
            if (text.includes('<!DOCTYPE') || text.includes('ngrok')) {
                console.error('❌ Received HTML response (ngrok warning page) instead of JSON');
                return;
            }
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
    try {
        // Get LinkedIn ID first
        const linkedinIdResult = await chrome.storage.local.get(['linkedinId']);
        const linkedinId = linkedinIdResult.linkedinId || 'vicken-concept';
        
        // Fetch active campaigns to check status
        let activeCampaignsData = [];
        try {
            const campaignsResponse = await fetch(`${PLATFORM_URL}/api/campaigns`, {
                headers: { 
                    'lk-id': linkedinId,
                    'Accept': 'application/json',
                    'ngrok-skip-browser-warning': 'true',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
            if (campaignsResponse.ok) {
                const contentType = campaignsResponse.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    const result = await campaignsResponse.json();
                    activeCampaignsData = result.data || [];
                }
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
            return;
        }
        
        // Deduplicate monitoring entries by connectionId - only process one per connection
        const connectionMap = new Map();
        const uniqueMonitoringEntries = [];
        const keysToCleanup = [];
                                        
        for (const key of responseKeys) {
            const monitoringData = allStorage[key];
            
            if (!monitoringData) {
                continue;
            }
            
            // Check if campaign is still running
            const campaignId = monitoringData.campaignId;
            const campaignStatus = campaignStatusMap.get(campaignId);
            
            if (campaignStatus && campaignStatus !== 'running' && campaignStatus !== 'active') {
                keysToCleanup.push(key);
                continue;
            }
            
            const connectionId = monitoringData.connectionId;
            if (!connectionId) {
                continue;
            }
            
            // Only keep the first monitoring entry for each connection
            if (!connectionMap.has(connectionId)) {
                connectionMap.set(connectionId, { key, monitoringData });
                uniqueMonitoringEntries.push({ key, monitoringData });
            }
        }
        
        // Cleanup monitoring entries for stopped campaigns
        if (keysToCleanup.length > 0) {
            for (const key of keysToCleanup) {
                await chrome.storage.local.remove(key);
            }
        }
        
        // Process each unique monitoring entry using consolidated flow
        console.log(`🔍 CALL FLOW: Processing ${uniqueMonitoringEntries.length} monitoring entries...`);
        for (const { key, monitoringData } of uniqueMonitoringEntries) {
            console.log(`🔍 CALL FLOW: Processing ${monitoringData.leadName} (${monitoringData.connectionId})...`);
            // Use consolidated call flow processor
            await processCallFlow(monitoringData, key);
        }
        console.log(`✅ CALL FLOW: Finished processing all monitoring entries`);
                                            } catch (error) {
        console.error('❌ CALL FLOW: Error checking call responses:', error);
    }
};
/**
 * Fetch LinkedIn conversation messages for a specific connection
 * @param {string} connectionId - Connection ID (e.g., 'eleazarnzerem')
 * @param {string|null} lastMessageId - Last processed message ID
 * @param {string|null} conversationUrnId - Optional conversation URN ID (prioritized if provided)
 */
const fetchLinkedInConversation = async (connectionId, lastMessageId = null, conversationUrnId = null) => {
    try {
        console.log('📡 Fetching LinkedIn conversation for connection:', connectionId);
        if (conversationUrnId) {
            console.log('🔗 Using provided conversation URN:', conversationUrnId);
        }
        
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
        
        let conversations = [];
        if (conversationsResponse.ok) {
            const conversationsData = await conversationsResponse.json();
            conversations = conversationsData.elements || [];
            console.log(`📊 FETCH CONVERSATION: Found ${conversations.length} conversations from LinkedIn API`);
        } else {
            console.log(`⚠️ FETCH CONVERSATION: Conversations API returned status ${conversationsResponse.status}`);
        }
        
        // If no conversations found via API, try direct conversation access
        if (conversations.length === 0) {
            console.log('🔄 No conversations in list - trying direct conversation access...');
            
            // Build list of conversation IDs to try, prioritizing provided URN
            let knownConversationIds = [];
            
            // Priority 1: Use provided conversation URN if available
            if (conversationUrnId) {
                knownConversationIds.push(conversationUrnId);
                console.log(`🔗 Priority 1: Using provided conversation URN: ${conversationUrnId}`);
            } else {
                // Priority 2: Try to get the actual conversation URN from monitoring data
                const allStorage = await chrome.storage.local.get();
                const monitoringEntries = Object.keys(allStorage).filter(key => key.startsWith('call_response_monitoring_'));
                
                for (const key of monitoringEntries) {
                    const monitoringData = allStorage[key];
                    if (monitoringData.connectionId === connectionId && monitoringData.conversationUrnId) {
                        knownConversationIds.push(monitoringData.conversationUrnId);
                        console.log(`🔍 Found conversation URN in monitoring data: ${monitoringData.conversationUrnId}`);
                        break; // Use first found URN
                    }
                }
            }
            
            // Priority 3: Fallback to connection ID (but this often doesn't work)
            if (knownConversationIds.length === 0) {
                knownConversationIds.push(connectionId);
                console.log(`⚠️ No conversation URN found, falling back to connection ID: ${connectionId}`);
            }
            
            console.log(`🔄 Will try ${knownConversationIds.length} conversation ID(s) for direct access:`, knownConversationIds);
            
            for (const conversationId of knownConversationIds) {
                try {
                    console.log(`🔄 Direct access: Trying conversation ID: ${conversationId}`);
                    // Try to get messages directly from this conversation using the WORKING headers
                    const directMessagesResponse = await fetch(`${voyagerApi}/messaging/conversations/${conversationId}/events`, {
                        method: 'GET',
                        headers: {
                            'csrf-token': tokenResult.csrfToken,
                            'accept': 'application/json',
                            'x-restli-protocol-version': '2.0.0'
                        }
                    });
                    
                    console.log(`📡 Direct access response status for ${conversationId}: ${directMessagesResponse.status}`);
                    
                    if (directMessagesResponse.ok) {
                        const messagesData = await directMessagesResponse.json();
                        const messages = messagesData.elements || [];
                        
                        if (messages.length > 0) {
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
                                
                                // Check if message is from us using hybrid system (Chrome storage primary + DB fallback)
                                if (text && connectionId) {
                                    const checkResult = await checkIfMessageIsFromUs(connectionId, text, msg.createdAt);
                                    isFromExtension = checkResult.isFromUs;
                                    if (isFromExtension) {
                                        console.log(`✅ Message identified as from us (sender: ${checkResult.sender})`);
                                    } else {
                                        console.log('✅ Message identified as from lead');
                                    }
                                } else {
                                    // No connectionId or text - default to lead
                                    isFromExtension = false;
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
                            
                        // Find the actual latest message from the lead
                        const leadMessages = processedMessages.filter(msg => msg.isFromLead);
                        if (leadMessages.length > 0) {
                            const latestLeadMessage = leadMessages[leadMessages.length - 1];
                            
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
                            console.log(`📭 Direct access: No messages found in conversation ${conversationId}`);
                            // console.log('🔍 Full API response structure:', JSON.stringify(messagesData, null, 2));
                        }
                    } else {
                        const errorText = await directMessagesResponse.text().catch(() => 'Could not read error response');
                        console.log(`⚠️ Direct access failed for ${conversationId}: Status ${directMessagesResponse.status}`);
                        console.log(`📄 Error response preview: ${errorText.substring(0, 300)}`);
                    }
                } catch (error) {
                    console.log(`❌ Direct access error for ${conversationId}:`, error.message);
                    // Continue to next conversation ID
                }
            }
            
            console.log('⚠️ Direct access: All conversation IDs tried, none returned messages');
        }
        
        if (conversations.length === 0) {
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
            console.log(`📊 Total conversations found: ${conversations.length}`);
            if (conversations.length > 0) {
                console.log('🔍 Available conversations:', conversations.slice(0, 5).map(c => ({
                    entityUrn: c.entityUrn,
                    participants: c.participants?.elements?.map(p => ({
                        entityUrn: p.entityUrn,
                        name: `${p.com?.linkedin?.voyager?.messaging?.MessagingMember?.miniProfile?.firstName} ${p.com?.linkedin?.voyager?.messaging?.MessagingMember?.miniProfile?.lastName}`,
                        publicIdentifier: p.com?.linkedin?.voyager?.messaging?.MessagingMember?.miniProfile?.publicIdentifier
                    }))
                })));
            } else {
                console.log('⚠️ No conversations returned from LinkedIn API');
            }
            
            // Try direct conversation access as fallback when conversation not found in list
            console.log('🔄 Conversation not found in list - trying direct conversation access...');
            const allStorage = await chrome.storage.local.get();
            const monitoringEntries = Object.keys(allStorage).filter(key => key.startsWith('call_response_monitoring_'));
            
            let knownConversationIds = [connectionId]; // Start with connection ID as fallback
            
            // Look for monitoring data that might have the conversation URN
            for (const key of monitoringEntries) {
                const monitoringData = allStorage[key];
                if (monitoringData.connectionId === connectionId && monitoringData.conversationUrnId) {
                    knownConversationIds.unshift(monitoringData.conversationUrnId); // Put it first
                    console.log('🔍 Found stored conversation URN in monitoring data:', monitoringData.conversationUrnId);
                }
            }
            
            // Try direct conversation access as fallback when conversation not found in list
            // (Conversation might be newly created via browser automation and not yet in the list)
            console.log('🔄 Conversation not in list - trying direct access fallback...');
            
            for (const conversationId of knownConversationIds) {
                try {
                    console.log(`🔄 Direct access fallback: Trying conversation ID: ${conversationId}`);
                    const directMessagesResponse = await fetch(`${voyagerApi}/messaging/conversations/${conversationId}/events`, {
                        method: 'GET',
                        headers: {
                            'csrf-token': tokenResult.csrfToken,
                            'accept': 'application/json',
                            'x-restli-protocol-version': '2.0.0'
                        }
                    });
                    
                    if (directMessagesResponse.ok) {
                        const messagesData = await directMessagesResponse.json();
                        const messages = messagesData.elements || [];
                        
                        if (messages.length > 0) {
                            console.log(`✅ Direct access fallback: Found ${messages.length} messages, but conversation URN may be needed for proper access`);
                            console.log(`⚠️ NOTE: When using browser automation, conversations may not appear in LinkedIn's API immediately`);
                            console.log(`💡 Suggestion: Wait 1-2 minutes after sending a message before checking for replies`);
                            // Don't return here - let it fall through to return null
                            // The conversation might not be accessible via direct ID when created via browser automation
                        }
                    }
                } catch (error) {
                    console.log(`⚠️ Direct access fallback error for ${conversationId}:`, error.message);
                }
            }
            
            console.log('❌ FETCH CONVERSATION: Returning null - no conversation found (tried list + direct access)');
            return null;
        }
        
        console.log('✅ Found conversation:', targetConversation.entityUrn);
        
        // Extract conversation URN ID from API response (use parameter if not provided, otherwise extract from API)
        const extractedConversationUrnId = conversationUrnId || targetConversation.entityUrn.replace('urn:li:fsd_conversation:', '');
        
        // Fetch messages from this conversation
        console.log('📡 Fetching messages from LinkedIn conversation:', extractedConversationUrnId);
        const messagesResponse = await fetch(`${voyagerApi}/messaging/conversations/${extractedConversationUrnId}/events`, {
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
        
        // Return object with messages and conversationUrnId (expected by processCallFlow)
        // Use extractedConversationUrnId if we have it, otherwise fall back to parameter
        const finalConversationUrnId = extractedConversationUrnId || conversationUrnId;
        return {
            messages: processedMessages,
            conversationUrnId: finalConversationUrnId
        };
        
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
        console.log(`🔍 CALL FLOW: Starting for ${monitoringData.leadName} (${monitoringData.connectionId})`);
        
        // Step 1: Check if we should process (avoid unnecessary work)
        if (monitoringData.status === 'pending_review') {
            console.log(`⏸️ CALL FLOW: Skipping ${monitoringData.leadName} - status is pending_review`);
            return;
        }
        
        // Step 2: Get last processed message from Chrome storage (rock-solid duplicate prevention)
        const lastProcessedKey = `lastProcessed_${monitoringData.connectionId}`;
        const lastProcessedData = await chrome.storage.local.get([lastProcessedKey]);
        const lastProcessed = lastProcessedData[lastProcessedKey] || {
            lastMessageId: monitoringData.lastCheckedMessageId || null,
            lastTimestamp: 0,
            lastSender: null
        };
        console.log(`📋 CALL FLOW: Last processed for ${monitoringData.leadName}:`, {
            lastMessageId: lastProcessed.lastMessageId,
            lastTimestamp: lastProcessed.lastTimestamp ? new Date(lastProcessed.lastTimestamp).toLocaleString() : 'none',
            lastSender: lastProcessed.lastSender
        });
        
        // Step 3: Fetch conversation from LinkedIn
        console.log(`📡 CALL FLOW: Fetching conversation for ${monitoringData.leadName}...`);
        const conversationData = await fetchLinkedInConversation(monitoringData.connectionId, lastProcessed.lastMessageId);
        if (!conversationData || !conversationData.messages || conversationData.messages.length === 0) {
            console.log(`⏸️ CALL FLOW: No conversation data or messages for ${monitoringData.leadName}`);
            return;
        }
        console.log(`📨 CALL FLOW: Fetched ${conversationData.messages.length} total messages for ${monitoringData.leadName}`);
        
        // Step 4: Filter out already processed messages (duplicate prevention using timestamp)
        console.log(`🔍 CALL FLOW: Filtering messages for ${monitoringData.leadName}...`);
        const newMessages = conversationData.messages.filter(msg => {
            const msgTimestamp = msg.timestamp || 0;
            // Skip if timestamp is older or equal to last processed
            if (lastProcessed.lastTimestamp && msgTimestamp <= lastProcessed.lastTimestamp) {
                console.log(`⏭️ CALL FLOW: Skipping message (timestamp ${msgTimestamp} <= last processed ${lastProcessed.lastTimestamp})`);
                return false;
            }
            // Skip if message ID matches last processed
            if (msg.id && lastProcessed.lastMessageId && msg.id === lastProcessed.lastMessageId) {
                console.log(`⏭️ CALL FLOW: Skipping message (ID matches last processed)`);
                return false;
            }
            return true;
        });
        
        console.log(`📊 CALL FLOW: After filtering, ${newMessages.length} new messages for ${monitoringData.leadName}`);
        if (newMessages.length === 0) {
            console.log(`⏭️ CALL FLOW: No new messages for ${monitoringData.leadName} (all already processed)`);
            return;
        }
        
        // Step 5: Identify which messages are from lead (check Chrome storage for our messages)
        console.log(`🔍 CALL FLOW: Checking sender for ${newMessages.length} messages...`);
        const messagesFromLead = [];
        for (const msg of newMessages) {
            console.log(`🔍 CALL FLOW: Checking message: "${msg.text?.substring(0, 50)}..." (timestamp: ${msg.timestamp})`);
            const checkResult = await checkIfMessageIsFromUs(monitoringData.connectionId, msg.text, msg.timestamp);
            console.log(`📊 CALL FLOW: Sender check result:`, checkResult);
            if (!checkResult.isFromUs) {
                console.log(`✅ CALL FLOW: Message is from lead - adding to messagesFromLead`);
                messagesFromLead.push(msg);
            } else {
                console.log(`⏭️ CALL FLOW: Message is from us (${checkResult.sender}) - marking as processed`);
                // Update last processed for our messages (mark as processed)
                await chrome.storage.local.set({
                    [lastProcessedKey]: {
                        lastMessageId: msg.id || lastProcessed.lastMessageId,
                        lastTimestamp: msg.timestamp || lastProcessed.lastTimestamp,
                        lastSender: checkResult.sender || 'user'
                    }
                });
            }
        }
        
        console.log(`📊 CALL FLOW: Found ${messagesFromLead.length} messages from lead for ${monitoringData.leadName}`);
        if (messagesFromLead.length === 0) {
            console.log(`⏭️ CALL FLOW: No new messages from lead for ${monitoringData.leadName} (all new messages are from us)`);
            return;
        }
        
        console.log(`💬 Found ${messagesFromLead.length} new message(s) from ${monitoringData.leadName}`);
        
        // Step 6: Update monitoring data with conversation URN ID if available
        if (conversationData.conversationUrnId && !monitoringData.conversationUrnId) {
            monitoringData.conversationUrnId = conversationData.conversationUrnId;
            await chrome.storage.local.set({ [key]: monitoringData });
        }
        
        // Step 7: Store all new messages from lead in database (async/fire-and-forget)
        for (const leadMessage of messagesFromLead) {
            storeConversationMessage({
                call_id: String(monitoringData.callId),
                message: leadMessage.text,
                sender: 'lead',
                message_type: 'lead_response',
                lead_name: monitoringData.leadName,
                connection_id: monitoringData.connectionId,
                conversation_urn_id: monitoringData.conversationUrnId
            }).catch(err => {
                console.error('⚠️ Failed to store lead message to database:', err);
            });
        }
        
        // Step 8: Process the latest message from lead (most recent one)
        const latestMessage = messagesFromLead[messagesFromLead.length - 1];
        
        // Step 9: Check if we should analyze (avoid unnecessary AI calls)
        const shouldAnalyze = await shouldAnalyzeMessage(monitoringData, latestMessage);
        if (!shouldAnalyze) {
            // Update last processed even if not analyzing
            await chrome.storage.local.set({
                [lastProcessedKey]: {
                    lastMessageId: latestMessage.id || lastProcessed.lastMessageId,
                    lastTimestamp: latestMessage.timestamp || lastProcessed.lastTimestamp,
                    lastSender: 'lead'
                }
            });
            await updateAllMonitoringEntriesForConnection(monitoringData.connectionId, latestMessage.id);
            return;
        }
        
        // Step 10: AI Analysis (only when needed)
        const analysisResponse = await processCallReplyWithAI(monitoringData.callId, latestMessage.text, monitoringData.leadName);
        
        if (!analysisResponse || (!analysisResponse.success && !analysisResponse.hasResponse)) {
            console.error(`❌ Analysis failed for ${monitoringData.leadName}`);
            // Update last processed even on analysis failure
            await chrome.storage.local.set({
                [lastProcessedKey]: {
                    lastMessageId: latestMessage.id || lastProcessed.lastMessageId,
                    lastTimestamp: latestMessage.timestamp || lastProcessed.lastTimestamp,
                    lastSender: 'lead'
                }
            });
            await updateAllMonitoringEntriesForConnection(monitoringData.connectionId, latestMessage.id);
            return;
        }
        
        // Step 11: Process response based on analysis
        await processAnalysisResponse(monitoringData, analysisResponse, latestMessage, key);
        
        // Step 12: Update last processed tracker in Chrome storage (rock-solid duplicate prevention)
        await chrome.storage.local.set({
            [lastProcessedKey]: {
                lastMessageId: latestMessage.id || lastProcessed.lastMessageId,
                lastTimestamp: latestMessage.timestamp || lastProcessed.lastTimestamp,
                lastSender: 'lead'
            }
        });
        
        // Also update monitoring data for backward compatibility
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
            }
        }
    } catch (error) {
        console.error('❌ Error updating monitoring entries:', error);
    }
};

/**
 * Check if we should analyze the message (avoid unnecessary AI calls)
 */
const shouldAnalyzeMessage = async (monitoringData, latestMessage) => {
    // Don't analyze if we were the last to respond
    if (monitoringData.lastResponseSentAt && monitoringData.lastResponseSentAt > latestMessage.timestamp) {
        return false;
    }
    
    // Don't analyze if message is too old
    const messageAge = Date.now() - latestMessage.timestamp;
    if (messageAge > 24 * 60 * 60 * 1000) { // 24 hours
        return false;
    }
    
    // Don't analyze if we already processed this message
    if (monitoringData.lastCheckedMessageId === latestMessage.id) {
        return false;
    }
    
    // Check if this message has been analyzed by any monitoring entry for this connection
    const allStorage = await chrome.storage.local.get();
    const responseKeys = Object.keys(allStorage).filter(key => key.startsWith('call_response_monitoring_'));
    
    for (const key of responseKeys) {
        const otherMonitoringData = allStorage[key];
        if (otherMonitoringData.connectionId === monitoringData.connectionId && 
            otherMonitoringData.lastCheckedMessageId === latestMessage.id) {
            return false;
        }
    }
    
    // Check if there's a pending message for this connection (review mode)
    const pendingMessageKey = `pending_message_${monitoringData.connectionId}`;
    const pendingMessage = allStorage[pendingMessageKey];
    if (pendingMessage && pendingMessage.scheduledTime && new Date(pendingMessage.scheduledTime) > new Date()) {
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
        await updateMessageTracking(monitoringData, latestMessage.id, key);
        return;
    }
    
    // Check if this is a scheduling scenario
    const callStatus = analysisResponse.call_status || analysisResponse['call_status'];
    const isSchedulingInitiated = callStatus === 'scheduled';
    
    if (isSchedulingInitiated) {
        await handleSchedulingResponse(monitoringData, analysisResponse, latestMessage, key);
    } else {
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
            console.error(`❌ No valid call_id for scheduling ${monitoringData.leadName}`);
            return;
        }
        
        const linkedinIdResult = await chrome.storage.local.get(['linkedinId']);
        const linkedinId = linkedinIdResult.linkedinId || 'vicken-concept';
        
        const calendarResponse = await fetch(`${PLATFORM_URL}/api/calls/${validCallId}/calendar-link`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'lk-id': linkedinId,
                'ngrok-skip-browser-warning': 'true',
                'Accept': 'application/json'
            }
        });
        
        if (calendarResponse.ok) {
            const calendarData = await calendarResponse.json();
            const schedulingMessage = calendarData.scheduling_message || 
                `Perfect! I'd love to schedule a call with you. Please book a convenient time here: ${calendarData.calendar_link}\n\nLooking forward to speaking with you!`;
            
            // Check if we're in review mode for scheduling messages
            const reviewModeResult = await handleReviewMode(monitoringData, schedulingMessage, analysisResponse, key);
            
            if (reviewModeResult) {
                return;
            }
            
            // Auto mode - send immediately
            const schedulingSuccess = await sendSchedulingMessage(monitoringData, schedulingMessage, calendarData.calendar_link);
            if (schedulingSuccess) {
                await updateMessageTracking(monitoringData, latestMessage.id, key);
                console.log(`✅ Scheduling message sent to ${monitoringData.leadName}`);
            }
        } else {
            await handleFallbackResponse(monitoringData, analysisResponse, latestMessage, key);
        }
    } catch (error) {
        console.error(`❌ Scheduling error for ${monitoringData.leadName}:`, error);
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
        return;
    }
    
    // Auto mode - send immediately
    const aiSuccess = await sendAIMessage(monitoringData, suggestedResponse);
    if (aiSuccess) {
        await updateMessageTracking(monitoringData, latestMessage.id, key);
        console.log(`✅ Response sent to ${monitoringData.leadName}`);
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
            const aiSuccess = await sendAIMessage(monitoringData, suggestedResponse);
            if (aiSuccess) {
                await updateMessageTracking(monitoringData, latestMessage.id, key);
            }
        }
    } else {
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
                headers: { 
                    'lk-id': linkedinId,
                    'Accept': 'application/json',
                    'ngrok-skip-browser-warning': 'true',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
            if (campaignsResponse.ok) {
                // Check if response is JSON (not HTML from ngrok)
                const contentType = campaignsResponse.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    const result = await campaignsResponse.json();
                    activeCampaignsData = result.data || [];
                    console.log(`📊 PENDING: Fetched ${activeCampaignsData.length} campaigns from API`);
                } else {
                    console.error('❌ PENDING: Received non-JSON response (likely ngrok warning page)');
                }
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
                'Accept': 'application/json',
                'lk-id': linkedinId,
                'ngrok-skip-browser-warning': 'true',
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
        
        if (!response.ok) {
            console.log('❌ Failed to fetch campaigns from database, skipping cleanup');
            return;
        }
        
        // Check if response is JSON (not HTML from ngrok)
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            if (text.includes('<!DOCTYPE') || text.includes('ngrok')) {
                console.error('❌ Received HTML response (ngrok warning page) instead of JSON');
                return;
            }
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
                'lk-id': linkedinId,
                'ngrok-skip-browser-warning': 'true',
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            console.log(`⚠️ Failed to fetch sequence for campaign ${campaign.id}: ${response.status}`);
            return;
        }
        
        // Check content-type before parsing JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const responseText = await response.text();
            if (responseText.includes('<!DOCTYPE') || responseText.includes('<html') || responseText.includes('ngrok')) {
                console.error(`❌ Received HTML response (ngrok warning page or error) instead of JSON for campaign ${campaign.id}`);
                return;
            }
            // Try to parse anyway if it's not HTML
            try {
                const data = JSON.parse(responseText);
                if (data.status !== 200 || !data.data) {
                    console.log(`⚠️ Invalid sequence response for campaign ${campaign.id}`);
                    return;
                }
                const sequenceData = data.data;
                console.log(`🔍 Sequence data for campaign ${campaign.id}:`, sequenceData);
                
                // Log full sequence structure for debugging
                if (sequenceData && sequenceData.nodeModel && Array.isArray(sequenceData.nodeModel)) {
                    console.log(`📋 Campaign ${campaign.id} FULL SEQUENCE (${sequenceData.nodeModel.length} nodes):`);
                    sequenceData.nodeModel.forEach((node, index) => {
                        console.log(`  Node ${index}: Key=${node.key}, Label="${node.label}", Type=${node.type}, Value=${node.value}, RunStatus=${node.runStatus}`);
                    });
                }
                
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
            } catch (parseError) {
                console.error(`❌ Failed to parse response as JSON for campaign ${campaign.id}:`, parseError.message);
                return;
            }
            return;
        }
        
        const data = await response.json();
        if (data.status !== 200 || !data.data) {
            console.log(`⚠️ Invalid sequence response for campaign ${campaign.id}`);
            return;
        }
        
        const sequenceData = data.data;
        console.log(`🔍 Sequence data for campaign ${campaign.id}:`, sequenceData);
        
        // Log full sequence structure for debugging
        if (sequenceData && sequenceData.nodeModel && Array.isArray(sequenceData.nodeModel)) {
            console.log(`📋 Campaign ${campaign.id} FULL SEQUENCE (${sequenceData.nodeModel.length} nodes):`);
            sequenceData.nodeModel.forEach((node, index) => {
                console.log(`  Node ${index}: Key=${node.key}, Label="${node.label}", Type=${node.type}, Value=${node.value}, RunStatus=${node.runStatus}`);
            });
        }
        
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
        console.error(`❌ Error saving campaign sequence data for ${campaign.id}:`, error.message);
        // Don't log the full error object to avoid cluttering console
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
        
        // console.log('📊 All storage keys:', Object.keys(allStorage));
        // console.log('📊 Campaign-specific keys found:', campaignSpecificKeys);
        
        // for (const key of campaignKeys) {
        //     if (allStorage[key]) {
        //         console.log(`🔍 Found data in key '${key}':`, allStorage[key]);
        //         if (allStorage[key].campaign) {
        //             console.log(`   - Campaign ID: ${allStorage[key].campaign.id}`);
        //             console.log(`   - Campaign Name: ${allStorage[key].campaign.name}`);
        //             console.log(`   - Has sequence: ${!!allStorage[key].sequence}`);
        //             if (allStorage[key].sequence && allStorage[key].sequence[0]) {
        //                 console.log(`   - First node AI mode: ${allStorage[key].sequence[0].ai_mode}`);
        //                 console.log(`   - First node review time: ${allStorage[key].sequence[0].review_time}`);
        //             }
        //         }
        //     }
        // }
        
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
 * Update monitoring data with conversation URN after message is sent
 */
const updateMonitoringDataWithConversationUrn = async (connectionId, conversationUrnId) => {
    try {
        console.log(`🔄 Updating monitoring data for ${connectionId} with conversation URN: ${conversationUrnId}`);
        
        // Find all monitoring entries for this connection
        const allStorage = await chrome.storage.local.get();
        const monitoringKeys = Object.keys(allStorage).filter(key => 
            key.startsWith('call_response_monitoring_') && key.includes(connectionId)
        );
        
        for (const key of monitoringKeys) {
            const monitoringData = allStorage[key];
            if (monitoringData && !monitoringData.conversationUrnId) {
                console.log(`✅ Updating ${key} with conversation URN`);
                await chrome.storage.local.set({ 
                    [key]: {
                        ...monitoringData,
                        conversationUrnId: conversationUrnId
                    }
                });
                console.log(`✅ Successfully updated monitoring data with conversation URN`);
            }
        }
    } catch (error) {
        console.error('❌ Error updating monitoring data with conversation URN:', error);
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
            
            // Update existing monitoring with new conversation URN if available
            if (monitoringData.conversationUrnId && !existingMonitoring[responseMonitoringKey].conversationUrnId) {
                console.log(`🔄 Updating existing monitoring with conversation URN: ${monitoringData.conversationUrnId}`);
                await chrome.storage.local.set({ 
                    [responseMonitoringKey]: {
                        ...existingMonitoring[responseMonitoringKey],
                        conversationUrnId: monitoringData.conversationUrnId
                    }
                });
                console.log(`✅ Updated monitoring data with conversation URN`);
            }
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
        
        // Store in Chrome storage IMMEDIATELY (primary tracking)
        await storeSentMessageInChromeStorage(monitoringData.connectionId, message, 'ai', monitoringData.conversationUrnId);
        
        // Store the AI response in conversation history (unless skipped for pending messages) - async/fire-and-forget
        if (!skipStorage) {
            if (monitoringData.callId) {
                storeConversationMessage({
                    call_id: String(monitoringData.callId),
                    message: message,
                    sender: 'ai',
                    message_type: 'ai_response',
                    lead_name: monitoringData.leadName,
                    connection_id: monitoringData.connectionId,
                    conversation_urn_id: monitoringData.conversationUrnId
                }).then(result => {
                    if (result && result.call_id && result.call_id !== monitoringData.callId) {
                        console.log('🔄 Database returned updated call_id:', result.call_id);
                    }
                    console.log('✅ AI message synced to database');
                }).catch(err => {
                    console.error('⚠️ Failed to sync AI message to database (will retry on next poll):', err);
                });
            } else {
                console.log('⚠️ No call_id available for AI response, skipping database sync');
            }
        } else {
            console.log('⏭️ Skipping database sync for pending message (already stored)');
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
        
        // Send the message using browser automation
        const lead = {
            name: monitoringData.leadName,
            connectionId: monitoringData.connectionId,
            conId: monitoringData.connectionId,
            publicIdentifier: monitoringData.connectionId
        };
        const message = messageContent;
        const browserResult = await _sendMessageBrowser(lead, message);
        
        if (browserResult.success) {
            console.log('✅ Calendar link message sent successfully to', monitoringData.leadName, '(browser automation)');
        } else {
            throw new Error(browserResult.error || 'Failed to send calendar link message via browser automation');
        }
        
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
                'Accept': 'application/json',
                'lk-id': linkedinId,
                'ngrok-skip-browser-warning': 'true',
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
        
        if (!response.ok) {
            console.log('❌ API request failed:', response.status, response.statusText);
            return;
        }
        
        // Check if response is JSON (not HTML from ngrok)
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            if (text.includes('<!DOCTYPE') || text.includes('ngrok')) {
                console.error('❌ Received HTML response (ngrok warning page) instead of JSON');
                return;
            }
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
        // Skip 'completed' campaigns entirely - they're done and don't need monitoring
        const activeCampaigns = eligibleCampaigns.filter(campaign => 
            campaign.status === 'active' || campaign.status === 'running'
        );
        const inactiveCampaigns = eligibleCampaigns.filter(campaign => 
            campaign.status !== 'active' && 
            campaign.status !== 'running' && 
            campaign.status !== 'completed' // Skip completed campaigns
        );
        const completedCampaigns = eligibleCampaigns.filter(campaign => 
            campaign.status === 'completed'
        );
        
        // Log filtering details for debugging
        console.log(`📊 Total campaigns found: ${allCampaigns.length}`);
        console.log(`🎯 Eligible campaigns (Lead gen/Custom): ${eligibleCampaigns.length}`);
        console.log(`✅ Active campaigns: ${activeCampaigns.length}`, activeCampaigns.map(c => ({id: c.id, name: c.name, status: c.status})));
        console.log(`⏸️ Inactive campaigns: ${inactiveCampaigns.length}`, inactiveCampaigns.map(c => ({id: c.id, name: c.name, status: c.status})));
        console.log(`🏁 Completed campaigns (skipped): ${completedCampaigns.length}`, completedCampaigns.map(c => ({id: c.id, name: c.name, status: c.status})));
        
        // Prioritize active campaigns, but also check inactive ones for cross-campaign acceptances
        // Skip completed campaigns - they're done and don't need monitoring
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
                
                // Get leads for this campaign FIRST - don't set up alarm if there are no leads
                console.log(`📋 Getting leads for campaign ${campaign.id}...`);
                let leadsData = []; // Declare outside try block so it's accessible in acceptance check
                try {
                    
                    // Try to use getLeadGenRunning function if available
                    if (typeof getLeadGenRunning === 'function') {
                        leadsData = await getLeadGenRunning(campaign.id);
                        console.log(`📊 getLeadGenRunning returned:`, leadsData?.length || 0, 'leads');
                        // Update global variable if function sets it
                        if (typeof campaignLeadgenRunning !== 'undefined') {
                            leadsData = campaignLeadgenRunning;
                        }
                    }
                    
                    // If no leads found, try multiple endpoints with standardized response handling
                    // PRIORITY: Use tracking endpoint first for acceptance check (includes status_last_id and accept_status)
                    if (!leadsData || leadsData.length === 0) {
                        console.log(`🔍 No leads from getLeadGenRunning, trying multiple API endpoints...`);
                        
                        // Try endpoint 1: /api/campaign/{id}/leadgen/tracking (tracking endpoint - PRIORITY for acceptance check)
                        try {
                            console.log(`📡 Trying endpoint: /api/campaign/${campaign.id}/leadgen/tracking (PRIORITY - includes status fields)`);
                            const trackingResponse = await fetch(`${PLATFORM_URL}/api/campaign/${campaign.id}/leadgen/tracking`, {
                                method: 'GET',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'lk-id': linkedinId,
                                    'ngrok-skip-browser-warning': 'true',
                                    'Accept': 'application/json'
                                }
                            });
                            
                            if (trackingResponse.ok) {
                                const contentType = trackingResponse.headers.get('content-type');
                                if (contentType && contentType.includes('application/json')) {
                                    const trackingDataResponse = await trackingResponse.json();
                                    console.log(`📊 /leadgen/tracking endpoint response:`, {
                                        status: trackingDataResponse.status,
                                        hasData: !!trackingDataResponse.data,
                                        dataLength: trackingDataResponse.data?.length || 0,
                                        responseKeys: Object.keys(trackingDataResponse),
                                        firstDataItem: trackingDataResponse.data?.[0] || null
                                    });
                                    
                                    if (trackingDataResponse.status === 200 && trackingDataResponse.data) {
                                        leadsData = Array.isArray(trackingDataResponse.data) ? trackingDataResponse.data : [];
                                        console.log(`✅ Fetched ${leadsData.length} leads from /leadgen/tracking endpoint (includes status fields)`);
                                        if (leadsData.length > 0) {
                                            console.log(`📋 Sample lead with status:`, {
                                                name: leadsData[0].name,
                                                statusLastId: leadsData[0].status_last_id,
                                                acceptStatus: leadsData[0].accept_status
                                            });
                                        }
                                    } else if (Array.isArray(trackingDataResponse)) {
                                        leadsData = trackingDataResponse;
                                        console.log(`✅ Fetched ${leadsData.length} leads (direct array response from tracking)`);
                                    }
                                }
                            }
                        } catch (trackingError) {
                            console.log(`⚠️ /leadgen/tracking endpoint error:`, trackingError.message);
                        }
                        
                        // Try endpoint 2: /api/campaign/{id}/leads (standard leads endpoint - fallback)
                        if (!leadsData || leadsData.length === 0) {
                            try {
                                console.log(`📡 Trying endpoint: /api/campaign/${campaign.id}/leads (fallback - may not include status fields)`);
                                const leadsResponse = await fetch(`${PLATFORM_URL}/api/campaign/${campaign.id}/leads`, {
                                    method: 'GET',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'lk-id': linkedinId,
                                        'ngrok-skip-browser-warning': 'true',
                                        'Accept': 'application/json'
                                    }
                                });
                                
                                console.log(`📡 /leads response status: ${leadsResponse.status} ${leadsResponse.statusText}`);
                                
                                if (leadsResponse.ok) {
                                    const contentType = leadsResponse.headers.get('content-type');
                                    console.log(`📡 /leads content-type: ${contentType}`);
                                    
                                    if (contentType && contentType.includes('application/json')) {
                                        const leadsDataResponse = await leadsResponse.json();
                                        console.log(`📊 /leads endpoint FULL response:`, leadsDataResponse);
                                        console.log(`📊 /leads endpoint response structure:`, {
                                            status: leadsDataResponse.status,
                                            hasData: !!leadsDataResponse.data,
                                            dataType: Array.isArray(leadsDataResponse.data) ? 'array' : typeof leadsDataResponse.data,
                                            dataLength: leadsDataResponse.data?.length || 0,
                                            responseKeys: Object.keys(leadsDataResponse),
                                            firstDataItem: leadsDataResponse.data?.[0] || null
                                        });
                                        
                                        // Handle different response formats - backend returns {data: [...], status: 200}
                                        if (leadsDataResponse.status === 200 && leadsDataResponse.data) {
                                            leadsData = Array.isArray(leadsDataResponse.data) ? leadsDataResponse.data : [];
                                            console.log(`✅ Fetched ${leadsData.length} leads from /leads endpoint`);
                                            if (leadsData.length > 0) {
                                                console.log(`📋 Sample lead:`, leadsData[0]);
                                                console.log(`⚠️ WARNING: /leads endpoint may not include status_last_id and accept_status fields`);
                                            }
                                        } else if (Array.isArray(leadsDataResponse)) {
                                            // Some endpoints return array directly
                                            leadsData = leadsDataResponse;
                                            console.log(`✅ Fetched ${leadsData.length} leads (direct array response)`);
                                        } else if (leadsDataResponse.data && Array.isArray(leadsDataResponse.data)) {
                                            // Handle case where data exists but status might be different
                                            leadsData = leadsDataResponse.data;
                                            console.log(`✅ Fetched ${leadsData.length} leads from /leads endpoint (data array found)`);
                                        } else {
                                            console.log(`⚠️ /leads response format not recognized:`, leadsDataResponse);
                                        }
                                    } else {
                                        const responseText = await leadsResponse.text();
                                        console.error(`❌ /leads endpoint returned non-JSON content-type: ${contentType}`);
                                        console.log(`📄 Response preview:`, responseText.substring(0, 500));
                                    }
                                } else {
                                    const errorText = await leadsResponse.text();
                                    console.error(`❌ /leads endpoint failed with status ${leadsResponse.status}:`, errorText.substring(0, 500));
                                }
                            } catch (leadsError) {
                                console.error(`❌ /leads endpoint error:`, leadsError.message);
                                console.error(`❌ Error stack:`, leadsError.stack);
                            }
                        }
                        
                        // Try endpoint 3: /api/campaign/{id}/leadgen (leadgen running endpoint - fallback)
                        if (!leadsData || leadsData.length === 0) {
                            try {
                                console.log(`📡 Trying endpoint: /api/campaign/${campaign.id}/leadgen`);
                                const leadgenResponse = await fetch(`${PLATFORM_URL}/api/campaign/${campaign.id}/leadgen`, {
                                    method: 'GET',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'lk-id': linkedinId,
                                        'ngrok-skip-browser-warning': 'true',
                                        'Accept': 'application/json'
                                    }
                                });
                                
                                if (leadgenResponse.ok) {
                                    const contentType = leadgenResponse.headers.get('content-type');
                                    if (contentType && contentType.includes('application/json')) {
                                        const leadgenDataResponse = await leadgenResponse.json();
                                        console.log(`📊 /leadgen endpoint response:`, {
                                            status: leadgenDataResponse.status,
                                            hasData: !!leadgenDataResponse.data,
                                            dataLength: leadgenDataResponse.data?.length || 0,
                                            responseKeys: Object.keys(leadgenDataResponse)
                                        });
                                        
                                        if (leadgenDataResponse.status === 200 && leadgenDataResponse.data) {
                                            leadsData = Array.isArray(leadgenDataResponse.data) ? leadgenDataResponse.data : [];
                                            console.log(`✅ Fetched ${leadsData.length} leads from /leadgen endpoint`);
                                        } else if (Array.isArray(leadgenDataResponse)) {
                                            leadsData = leadgenDataResponse;
                                            console.log(`✅ Fetched ${leadsData.length} leads (direct array response)`);
                                        }
                                    }
                                }
                            } catch (leadgenError) {
                                console.log(`⚠️ /leadgen endpoint error:`, leadgenError.message);
                            }
                        }
                    }
                    
                    console.log(`👥 Found ${leadsData.length} leads in campaign ${campaign.id}`);
                    
                    if (leadsData.length === 0) {
                        if (campaign.status === 'active' || campaign.status === 'running') {
                            console.log(`⚠️ ACTIVE campaign ${campaign.id} has no leads - cannot send invites without leads!`);
                            console.log(`💡 SOLUTION: Add leads to this campaign in your LinkDominator dashboard`);
                            console.log(`🛑 Skipping campaign execution until leads are added`);
                            // Don't set up alarm if there are no leads - it will just fail repeatedly
                            continue;
                    } else {
                        console.log(`⏸️ INACTIVE campaign ${campaign.id} has no leads - skipping (normal for stopped campaigns)`);
                    }
                    continue;
                    } else {
                        console.log(`✅ Campaign ${campaign.id} has ${leadsData.length} leads - proceeding with campaign setup`);
                        // Update global variable for compatibility
                        if (typeof campaignLeadgenRunning !== 'undefined') {
                            campaignLeadgenRunning = leadsData;
                        }
                    }
                } catch (leadsError) {
                    console.error(`❌ Error getting leads for campaign ${campaign.id}:`, leadsError.message);
                    console.log(`⚠️ Skipping campaign ${campaign.id} due to error fetching leads`);
                    continue;
                }
                
                // Only check if campaign needs to be started AFTER confirming leads exist
                if (campaign.status === 'running' || campaign.status === 'active') {
                    try {
                        // Get the saved sequence data from storage
                        const storageKey = `campaign_${campaign.id}`;
                        const storedData = await chrome.storage.local.get([storageKey]);
                        const campaignData = storedData[storageKey];
                        
                        if (campaignData && campaignData.sequence && campaignData.sequence.nodeModel && campaignData.sequence.nodeModel.length > 0) {
                            const firstNode = campaignData.sequence.nodeModel[0];
                            console.log(`🔍 First node: ${firstNode.label} (${firstNode.value}), runStatus: ${firstNode.runStatus}`);
                            
                            // If first node hasn't run yet, trigger campaign execution
                            if (firstNode.runStatus === false || firstNode.runStatus === null || firstNode.runStatus === undefined) {
                                // Check if alarm already exists before creating
                                const firstAlarmName = `custom_${firstNode.value}`;
                                chrome.alarms.getAll(async (alarms) => {
                                    const existingAlarm = alarms.find(a => a.name === firstAlarmName);
                                    if(existingAlarm){
                                        console.log(`⏸️ Alarm ${firstAlarmName} already exists - skipping duplicate setup`);
                                        return;
                                    }
                                    
                                    // Check lock
                                    const lockResult = await chrome.storage.local.get([`campaign_${firstAlarmName}_running`]);
                                    if(lockResult[`campaign_${firstAlarmName}_running`]){
                                        console.log(`⏸️ First node ${firstNode.label} is already executing - skipping alarm setup`);
                                        return;
                                    }
                                    
                                    console.log(`🎯 First node not executed yet - triggering campaign execution...`);
                                    setTimeout(async () => {
                                        try {
                                            if (typeof setCampaignAlarm === 'function') {
                                                await setCampaignAlarm(campaign);
                                                console.log(`✅ Campaign alarm set up for campaign ${campaign.id}`);
                                            } else {
                                                console.log(`⚠️ setCampaignAlarm function not available`);
                                            }
                                        } catch (error) {
                                            console.error(`❌ Error setting up campaign alarm:`, error.message);
                                        }
                                    }, 1000);
                                });
                            } else {
                                console.log(`✅ First node already executed (runStatus: ${firstNode.runStatus})`);
                                
                                // Check if there's a next node to execute or if campaign should end
                                console.log(`🔍 Checking for next node or end node...`);
                                // campaignData is already the value at storageKey, so access sequence directly
                                const sequenceNodes = (campaignData && campaignData.sequence && campaignData.sequence.nodeModel) ? campaignData.sequence.nodeModel : [];
                                
                                // Find the next unrun action node (only nodes AFTER the current one)
                                // Check for false, null, or undefined runStatus (all mean "not executed yet")
                                const nextNode = sequenceNodes.find(node => 
                                    node.type === 'action' && 
                                    (node.runStatus === false || node.runStatus === null || node.runStatus === undefined) && 
                                    node.key > firstNode.key &&  // Only find nodes AFTER current node
                                    node.value !== 'end' &&
                                    node.value !== 'add-action'  // Skip add-action nodes (not executable)
                                );
                                
                                if (nextNode) {
                                    console.log(`🎯 Found next node: ${nextNode.label} (${nextNode.value}), key: ${nextNode.key}`);
                                    
                                    // Check if next node is already executing or completed
                                    const nextAlarmName = `custom_${nextNode.value}`;
                                    chrome.alarms.getAll(async (alarms) => {
                                        const existingAlarm = alarms.find(a => a.name === nextAlarmName);
                                        if(existingAlarm){
                                            console.log(`⏸️ Alarm ${nextAlarmName} already exists - skipping duplicate setup`);
                                            return;
                                        }
                                        
                                        // Check lock
                                        const lockResult = await chrome.storage.local.get([`campaign_${nextAlarmName}_running`]);
                                        if(lockResult[`campaign_${nextAlarmName}_running`]){
                                            console.log(`⏸️ Next node ${nextNode.label} is already executing - skipping alarm setup`);
                                            return;
                                        }
                                        
                                        // Check if node is already completed
                                        if(nextNode.runStatus === true){
                                            console.log(`⏸️ Next node ${nextNode.label} already completed - skipping alarm setup`);
                                            return;
                                        }
                                        
                                        // Special check for call nodes - they never complete, so check if messages were already sent
                                        if(nextNode.value === 'call'){
                                            try {
                                                const allStorage = await chrome.storage.local.get();
                                                const callAttemptKeys = Object.keys(allStorage).filter(key => 
                                                    key.startsWith(`call_attempted_${campaign.id}_`)
                                                );
                                                // If call messages were sent, skip creating alarm (call node stays open for monitoring)
                                                if(callAttemptKeys.length > 0){
                                                    console.log(`⏸️ Call node already has ${callAttemptKeys.length} call attempts - skipping duplicate alarm setup (call node stays open for monitoring)`);
                                                    return;
                                                }
                                            } catch (e) {
                                                console.log(`⚠️ Could not check call attempts:`, e.message);
                                            }
                                        }
                                        
                                        console.log(`🚀 Setting up execution for next node...`);
                                        setTimeout(async () => {
                                            try {
                                                if (typeof setCampaignAlarm === 'function') {
                                                    await setCampaignAlarm(campaign);
                                                    console.log(`✅ Campaign alarm set up for next node execution`);
                                                } else {
                                                    console.log(`⚠️ setCampaignAlarm function not available`);
                                                }
                                            } catch (error) {
                                                console.error(`❌ Error setting up next node alarm:`, error.message);
                                            }
                                        }, 1000);
                                    });
                                } else {
                                    // No next node found - check if there's an "end" node
                                    const endNode = sequenceNodes.find(node => node.type === 'end' || node.value === 'end');
                                    if (endNode) {
                                        console.log(`🏁 END node detected - marking campaign as completed`);
                                        console.log(`🔑 End node key: ${endNode.key}`);
                                        
                                        try {
                                            // Mark the end node as complete - inline API call
                                            console.log(`📤 Updating end node for campaign ${campaign.id}, node ${endNode.key}, runStatus: true`);
                                            const endNodeResponse = await fetch(`${PLATFORM_URL}/api/campaign/${campaign.id}/update-node`, {
                                                method: 'POST',
                                                headers: {
                                                    'Content-Type': 'application/json',
                                                    'lk-id': linkedinId || 'vicken-concept',
                                                    'ngrok-skip-browser-warning': 'true'
                                                },
                                                body: JSON.stringify({
                                                    nodeKey: endNode.key,
                                                    runStatus: true
                                                })
                                            });
                                            if (!endNodeResponse.ok) {
                                                throw new Error(`Failed to update end node: ${endNodeResponse.status}`);
                                            }
                                            const endNodeData = await endNodeResponse.json();
                                            console.log(`✅ End node updated successfully:`, endNodeData);
                                            
                                            // Mark the campaign as completed - inline API call
                                            console.log(`📤 Marking campaign ${campaign.id} as completed`);
                                            const campaignResponse = await fetch(`${PLATFORM_URL}/api/campaign/${campaign.id}/update`, {
                                                method: 'POST',
                                                headers: {
                                                    'Content-Type': 'application/json',
                                                    'lk-id': linkedinId || 'vicken-concept',
                                                    'ngrok-skip-browser-warning': 'true'
                                                },
                                                body: JSON.stringify({
                                                    campaignId: campaign.id,
                                                    status: 'completed'
                                                })
                                            });
                                            if (!campaignResponse.ok) {
                                                throw new Error(`Failed to update campaign: ${campaignResponse.status}`);
                                            }
                                            const campaignData = await campaignResponse.json();
                                            console.log(`✅ Campaign marked as COMPLETED:`, campaignData);
                                            
                                            // Remove from active campaigns
                                            chrome.storage.local.get(['activeCampaigns'], (result) => {
                                                const activeCampaigns = result.activeCampaigns || [];
                                                const updatedCampaigns = activeCampaigns.filter(id => id !== campaign.id);
                                                chrome.storage.local.set({ activeCampaigns: updatedCampaigns });
                                                console.log(`📊 Removed campaign ${campaign.id} from active campaigns list`);
                                            });
                                        } catch (error) {
                                            console.error(`❌ Failed to mark campaign as completed:`, error);
                                        }
                                    } else {
                                        console.log(`⚠️ No next node and no end node found - campaign will remain active`);
                                    }
                                }
                            }
                        } else {
                            console.log(`⚠️ Campaign sequence data not available in storage, will try to fetch...`);
                            // Fallback: try to get sequence directly and set up alarm
                            setTimeout(async () => {
                                try {
                                    if (typeof getCampaignSequence === 'function') {
                                        await getCampaignSequence(campaign.id);
                                        if (campaignSequence && campaignSequence.nodeModel && campaignSequence.nodeModel.length > 0) {
                                            const firstNode = campaignSequence.nodeModel[0];
                                            if (firstNode.runStatus === false || firstNode.runStatus === null || firstNode.runStatus === undefined) {
                                                console.log(`🎯 Triggering campaign execution via fallback method...`);
                                                if (typeof setCampaignAlarm === 'function') {
                                                    await setCampaignAlarm(campaign);
                                                    console.log(`✅ Campaign alarm set up for campaign ${campaign.id}`);
                                                }
                                            }
                                        }
                                    }
                                } catch (fallbackError) {
                                    console.error(`❌ Fallback sequence fetch failed:`, fallbackError.message);
                                }
                            }, 2000);
                        }
                    } catch (error) {
                        console.error(`❌ Error checking campaign sequence:`, error.message);
                    }
                }
                
                // Use leadsData directly (more reliable than global variable)
                const leadsToCheck = leadsData || campaignLeadgenRunning || [];
                
                // For inactive campaigns, only check if they have leads (for cross-campaign acceptance tracking)
                if (campaign.status !== 'active' && campaign.status !== 'running') {
                    console.log(`⏸️ Checking INACTIVE campaign ${campaign.id} because it has ${leadsToCheck.length} leads (cross-campaign acceptance tracking)`);
                } else {
                    console.log(`✅ Checking ACTIVE campaign ${campaign.id} with ${leadsToCheck.length} leads`);
                }
                
                // Check each lead for acceptance
                console.log(`🔍 Checking each lead for acceptance...`);
                if(leadsToCheck.length === 0){
                    console.log(`⚠️ No leads to check for acceptance (leadsData: ${leadsData?.length || 0}, campaignLeadgenRunning: ${campaignLeadgenRunning?.length || 0})`);
                }
                for (const lead of leadsToCheck) {
                    // Handle both tracking data format and basic lead data format
                    const acceptedStatus = lead.accept_status !== undefined ? lead.accept_status : lead.acceptedStatus;
                    const statusLastId = lead.status_last_id !== undefined ? lead.status_last_id : lead.statusLastId;
                    const leadSrc = lead.lead_src !== undefined ? lead.lead_src : lead.leadSrc;
                    const connectionId = lead.connection_id !== undefined ? lead.connection_id : lead.connectionId;
                    
                    console.log(`📊 Lead status check: ${lead.name || 'Unknown'}`, {
                        name: lead.name,
                        acceptedStatus: acceptedStatus,
                        statusLastId: statusLastId,
                        statusLastIdType: typeof statusLastId,
                        leadSrc: leadSrc,
                        connectionId: connectionId
                    });
                    
                    // Normalize statusLastId to number for comparison (backend may return as string)
                    const statusLastIdNum = statusLastId != null ? parseInt(statusLastId, 10) : null;
                    
                    // Check for pending invites (accept_status = 0 or false, status_last_id = 2)
                    const isPendingInvite = (acceptedStatus === false || acceptedStatus === 0) && statusLastIdNum === 2;
                    // Also check for leads that are already 1st-degree but not marked as accepted (like Eleazer)
                    // Handle undefined/null acceptedStatus - treat as false if statusLastId is 1
                    const isAlreadyAccepted = (acceptedStatus === false || acceptedStatus === 0 || acceptedStatus === undefined || acceptedStatus === null) && statusLastIdNum === 1;
                    // Fallback: Check leads with acceptedStatus === false/undefined/null if statusLastId is null/undefined (might be old data or missing status)
                    // Only check if campaign has send-invites completed (to avoid checking leads that haven't been sent invites)
                    // Get sequence data from storage to check if send-invites is completed
                    const storageKeyForCheck = `campaign_${campaign.id}`;
                    const storedDataForCheck = await chrome.storage.local.get([storageKeyForCheck]);
                    const campaignDataForCheck = storedDataForCheck[storageKeyForCheck];
                    const sequenceDataForCheck = campaignDataForCheck?.sequence;
                    const sendInvitesCompleted = sequenceDataForCheck?.nodeModel?.[0]?.value === 'send-invites' && 
                                                (sequenceDataForCheck.nodeModel[0].runStatus === true);
                    // Handle undefined/null acceptedStatus - treat as false if send-invites completed
                    const needsAcceptanceCheck = (acceptedStatus === false || acceptedStatus === 0 || acceptedStatus === undefined || acceptedStatus === null) && 
                                                (statusLastIdNum == null || statusLastIdNum == undefined) && 
                                                sendInvitesCompleted;
                    
                    
                    const shouldCheckAcceptance = isPendingInvite || isAlreadyAccepted || needsAcceptanceCheck;
                    
                    // Check if lead is already accepted and needs next action triggered
                    const isAlreadyAcceptedAndNeedsAction = (acceptedStatus === true || acceptedStatus === 1) && statusLastIdNum === 3;
                    
                    console.log(`🔍 Acceptance check conditions for ${lead.name || 'Unknown'}:`, {
                        shouldCheckAcceptance,
                        isAlreadyAcceptedAndNeedsAction,
                        acceptedStatus,
                        statusLastIdNum,
                        isPendingInvite,
                        isAlreadyAccepted,
                        needsAcceptanceCheck
                    });
                    
                    if (shouldCheckAcceptance) {
                        const checkReason = isPendingInvite ? 'pending invite' : (isAlreadyAccepted ? 'already accepted lead' : 'missing status data');
                        console.log(`🌐 Checking network status for ${checkReason}: ${lead.name}...`);
                        try {
                            const networkInfo = await _getProfileNetworkInfo(lead);
                            const networkDegree = networkInfo.data.distance.value;
                            
                            if (networkDegree === 'DISTANCE_1') {
                                console.log(`🎉 INVITE ACCEPTED! ${lead.name || 'Unknown'} is now 1st degree connection!`);
                                console.log(`📊 Campaign: ${campaign.name} (ID: ${campaign.id})`);
                                console.log(`👤 Lead: ${lead.name} (ID: ${lead.id || connectionId})`);
                                
                                try {
                                    // Update database - inline API call to avoid scoping issues
                                    const leadIdToUpdate = lead.id || connectionId;
                                    if (leadIdToUpdate) {
                                        const updateData = {
                                        acceptedStatus: true,
                                        statusLastId: 3, // 3 = accepted
                                        currentNodeKey: lead.current_node_key || lead.currentNodeKey || 0,
                                        nextNodeKey: lead.next_node_key || lead.nextNodeKey || 0
                                        };
                                        
                                        const response = await fetch(`${PLATFORM_URL}/api/campaign/${campaign.id}/leadgen/${leadIdToUpdate}/update`, {
                                            method: 'POST',
                                            headers: {
                                                'Content-Type': 'application/json',
                                                'lk-id': linkedinId,
                                                'ngrok-skip-browser-warning': 'true',
                                                'Accept': 'application/json'
                                            },
                                            body: JSON.stringify(updateData)
                                        });
                                        
                                        if (response.ok) {
                                            const updateResult = await response.json();
                                    console.log(`✅ Database updated for ${lead.name || 'Unknown'}:`, updateResult);
                                        } else {
                                            console.error(`❌ Failed to update database for acceptance: ${response.status}`);
                                        }
                                    } else {
                                        console.error('❌ No lead ID available for acceptance update');
                                    }
                                    
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
                                    
                                    // Get sequence data from storage (already saved by saveCampaignSequenceData)
                                    const storageKey = `campaign_${campaign.id}`;
                                    const storedData = await chrome.storage.local.get([storageKey]);
                                    const campaignData = storedData[storageKey];
                                    const sequenceData = campaignData?.sequence;
                                    
                                    if (sequenceData && sequenceData.nodeModel) {
                                        console.log(`📋 Campaign sequence loaded with ${sequenceData.nodeModel.length} nodes`);
                                        
                        // Find the next action node for accepted connections
                        // Look for nodes that have acceptedAction property or are action nodes that haven't run yet
                        // For custom sequences, find the first action node after the "Accepted" condition that hasn't run
                        const acceptedConditionIndex = sequenceData.nodeModel.findIndex(node => 
                            node.type === 'condition' && node.value === 'accepted'
                        );
                        
                        let nextActionNode;
                        if (acceptedConditionIndex !== -1) {
                            // Find first action node after the "Accepted" condition
                            nextActionNode = sequenceData.nodeModel.find((node, index) => 
                                index > acceptedConditionIndex &&
                                node.type === 'action' && 
                                node.runStatus === false && 
                                node.value !== 'send-invites' &&
                                node.value !== 'end' &&
                                node.value !== 'add-action'
                            );
                        }
                        
                        // Fallback: find any action node that hasn't run
                        if (!nextActionNode) {
                            nextActionNode = sequenceData.nodeModel.find(node => 
                            (node.acceptedAction && node.acceptedAction == 3) || 
                                (node.type === 'action' && node.runStatus === false && node.value !== 'send-invites' && node.value !== 'end' && node.value !== 'add-action')
                        );
                        }
                                        
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
                            
                            // Update network degree in lead database
                            try {
                                lead.networkDegree = networkDegree;
                                const networkUpdateResult = await updateLeadNetworkDegree(lead);
                            } catch (networkUpdateError) {
                                // Error updating network degree
                            }
                            }
                        } catch (networkError) {
                            // Error checking network
                        }
                    } else if ((acceptedStatus === true || acceptedStatus === 1) && statusLastIdNum === 3) {
                        // Lead is already accepted - check if next action needs to be triggered
                        console.log(`✅ Lead ${lead.name || 'Unknown'} is already accepted - checking for next action...`);
                        try {
                            // Get sequence data from storage
                            const storageKey = `campaign_${campaign.id}`;
                            const storedData = await chrome.storage.local.get([storageKey]);
                            const campaignData = storedData[storageKey];
                            const sequenceData = campaignData?.sequence;
                            
                            if (sequenceData && sequenceData.nodeModel) {
                                // Find the "Accepted" condition node
                                const acceptedConditionIndex = sequenceData.nodeModel.findIndex(node => 
                                    node.type === 'condition' && node.value === 'accepted'
                                );
                                
                                if (acceptedConditionIndex !== -1) {
                                    // Find first action node after the "Accepted" condition that hasn't run
                                    const nextActionNode = sequenceData.nodeModel.find((node, index) => 
                                        index > acceptedConditionIndex &&
                                        node.type === 'action' && 
                                        node.runStatus === false && 
                                        node.value !== 'send-invites' &&
                                        node.value !== 'end' &&
                                        node.value !== 'add-action'
                                    );
                                    
                                    if (nextActionNode) {
                                        // Check if action has already been executed
                                        let actionAlreadyExecuted = false;
                                        
                                        // Special check for call actions - they use call_attempted keys
                                        // Note: "Book a call" is an ongoing conversation action that doesn't complete like other actions
                                        if (nextActionNode.value === 'call') {
                                            const callAttemptKey = `call_attempted_${campaign.id}_${lead.connectionId || connectionId}`;
                                            const callCheck = await chrome.storage.local.get([callAttemptKey]);
                                            if (callCheck[callAttemptKey]) {
                                                actionAlreadyExecuted = true;
                                                const attemptTime = new Date(callCheck[callAttemptKey]).toLocaleString();
                                                console.log(`⏸️ Call action already executed for ${lead.name} - skipping (key: ${callAttemptKey})`);
                                                console.log(`📅 Call attempt timestamp: ${attemptTime}`);
                                                console.log(`💬 "Book a call" is an ongoing conversation - campaign stays active to monitor responses`);
                                                
                                                // Verify if message was actually sent by checking for call record or monitoring data
                                                const monitoringKey = `call_response_monitoring_${campaign.id}_${lead.connectionId || connectionId}`;
                                                const monitoringCheck = await chrome.storage.local.get([monitoringKey]);
                                                if (monitoringCheck[monitoringKey]) {
                                                    console.log(`✅ Call monitoring is active - conversation is being monitored`);
                                                } else {
                                                    console.log(`⚠️ No monitoring data found - message may not have been sent`);
                                                }
                                            }
                                        } else {
                                            // For other actions, check if node runStatus is true or if there's a processed flag
                                            if (nextActionNode.runStatus === true) {
                                                actionAlreadyExecuted = true;
                                                console.log(`⏸️ Action ${nextActionNode.label} already executed (runStatus: true) - skipping`);
                                            }
                                        }
                                        
                                        if (actionAlreadyExecuted) {
                                            console.log(`ℹ️ Action ${nextActionNode.label} already executed for ${lead.name} - no action needed`);
                                        } else {
                                            console.log(`🎯 FOUND NEXT ACTION for already-accepted lead: ${nextActionNode.label} (${nextActionNode.value})`);
                                            
                                            // Check if there's a delay node before this action
                                            const actionIndex = sequenceData.nodeModel.findIndex(n => n.key === nextActionNode.key);
                                            let delayInMinutes = 0;
                                            if (actionIndex > 0) {
                                                const prevNode = sequenceData.nodeModel[actionIndex - 1];
                                                if (prevNode.type === 'delay') {
                                                    delayInMinutes = prevNode.time === 'days' 
                                                        ? prevNode.value * 24 * 60
                                                        : prevNode.time === 'hours'
                                                        ? prevNode.value * 60
                                                        : prevNode.value;
                                                }
                                            }
                                            
                                            if (delayInMinutes > 0) {
                                                console.log(`⏰ SCHEDULING ACTION: ${nextActionNode.label} will run in ${delayInMinutes} minutes`);
                                                const alarmName = `delayed_action_${campaign.id}_${lead.id || connectionId}_${nextActionNode.key}`;
                                                
                                                // Check if alarm already exists
                                                chrome.alarms.getAll((alarms) => {
                                                    const existingAlarm = alarms.find(a => a.name === alarmName);
                                                    if (!existingAlarm) {
                                                        chrome.alarms.create(alarmName, {
                                                            delayInMinutes: delayInMinutes
                                                        });
                                                        
                                                        chrome.storage.local.set({
                                                            [`delayed_action_${alarmName}`]: {
                                                                campaign: campaign,
                                                                lead: lead,
                                                                nodeModel: nextActionNode,
                                                                scheduledTime: Date.now() + (delayInMinutes * 60000)
                                                            }
                                                        });
                                                        console.log(`✅ ALARM CREATED: ${alarmName}`);
                                                    } else {
                                                        console.log(`⏸️ Alarm ${alarmName} already exists - skipping duplicate creation`);
                                                    }
                                                });
                                            } else {
                                                console.log(`🚀 EXECUTING NEXT ACTION IMMEDIATELY for already-accepted lead ${lead.name}...`);
                                                await runSequence(campaign, [lead], nextActionNode);
                                            }
                                        }
                                    } else {
                                        console.log(`ℹ️ No next action found for already-accepted lead ${lead.name}`);
                                    }
                                }
                            }
                        } catch (alreadyAcceptedError) {
                            console.error(`❌ Error processing already-accepted lead:`, alreadyAcceptedError);
                        }
                        }
                        
                        // Add delay between checks to avoid rate limiting
                        await new Promise(resolve => setTimeout(resolve, 2000));
                }
                
                // Check for "not accepted" path: Leads that haven't accepted after delay period
                if (campaign.status === 'active' || campaign.status === 'running') {
                    try {
                        // Get sequence data from storage (already saved by saveCampaignSequenceData)
                        const storageKey = `campaign_${campaign.id}`;
                        const storedData = await chrome.storage.local.get([storageKey]);
                        const campaignData = storedData[storageKey];
                        const sequenceData = campaignData?.sequence;
                        
                        if (sequenceData && sequenceData.nodeModel) {
                            // Find delay nodes with notAcceptedTime property (e.g., "5 days" delay for not accepted)
                            const notAcceptedDelayNodes = sequenceData.nodeModel.filter(node => 
                                node.type === 'delay' && node.notAcceptedTime
                            );
                            
                            // Find action nodes with notAcceptedAction property
                            const notAcceptedActionNodes = sequenceData.nodeModel.filter(node => 
                                node.type === 'action' && node.notAcceptedAction
                            );
                            
                            if (notAcceptedDelayNodes.length > 0 && notAcceptedActionNodes.length > 0) {
                                console.log(`🔍 Checking for "not accepted" leads after delay period...`);
                                console.log(`📋 Found ${notAcceptedDelayNodes.length} delay nodes and ${notAcceptedActionNodes.length} action nodes for not accepted path`);
                                
                                for (const delayNode of notAcceptedDelayNodes) {
                                    // Calculate delay in milliseconds
                                    const delayMs = delayNode.time === 'days' 
                                        ? delayNode.value * 24 * 60 * 60 * 1000
                                        : delayNode.time === 'hours'
                                        ? delayNode.value * 60 * 60 * 1000
                                        : delayNode.value * 60 * 1000;
                                    
                                    // Find the corresponding action node for this delay
                                    const correspondingActionNode = notAcceptedActionNodes.find(actionNode => 
                                        actionNode.notAcceptedAction === delayNode.notAcceptedTime
                                    );
                                    
                                    if (!correspondingActionNode) {
                                        console.log(`⚠️ No corresponding action node found for delay node ${delayNode.key} (notAcceptedTime: ${delayNode.notAcceptedTime})`);
                                        continue;
                                    }
                                    
                                    // Check if action node has already run (to avoid re-triggering)
                                    if (correspondingActionNode.runStatus === true) {
                                        console.log(`⏭️ Action node ${correspondingActionNode.key} (${correspondingActionNode.label}) already executed - skipping`);
                                        continue;
                                    }
                                    
                                    console.log(`🔍 Checking delay node ${delayNode.key}: ${delayNode.value} ${delayNode.time} (notAcceptedTime: ${delayNode.notAcceptedTime})`);
                                    console.log(`🎯 Corresponding action: ${correspondingActionNode.label} (${correspondingActionNode.value})`);
                                    
                                    // Find leads that haven't accepted after the delay period
                                    const notAcceptedLeads = leadsToCheck.filter(lead => {
                                        const acceptedStatus = lead.accept_status !== undefined ? lead.accept_status : lead.acceptedStatus;
                                        const statusLastId = lead.status_last_id !== undefined ? lead.status_last_id : lead.statusLastId;
                                        const statusLastIdNum = statusLastId != null ? parseInt(statusLastId, 10) : null;
                                        
                                        // Only process leads with invite sent (statusLastId = 2) and not accepted
                                        if (statusLastIdNum !== 2 || acceptedStatus === true) {
                                            return false;
                                        }
                                        
                                        // Check if enough time has passed since invite was sent
                                        const updatedAt = lead.updated_at || lead.updatedAt;
                                        if (!updatedAt) {
                                            console.log(`⚠️ Lead ${lead.name || 'Unknown'} has no updated_at timestamp - cannot check delay`);
                                            return false;
                                        }
                                        
                                        const inviteSentTime = new Date(updatedAt).getTime();
                                        const currentTime = Date.now();
                                        const timeSinceInvite = currentTime - inviteSentTime;
                                        
                                        if (timeSinceInvite >= delayMs) {
                                            console.log(`✅ Lead ${lead.name || 'Unknown'} delay passed: ${Math.floor(timeSinceInvite / (1000 * 60 * 60 * 24))} days since invite sent`);
                                            return true;
                                        }
                                        
                                        return false;
                                    });
                                    
                                    if (notAcceptedLeads.length > 0) {
                                        console.log(`🎯 Found ${notAcceptedLeads.length} leads that haven't accepted after ${delayNode.value} ${delayNode.time} delay`);
                                        console.log(`🚀 Triggering "not accepted" action: ${correspondingActionNode.label} for ${notAcceptedLeads.length} leads`);
                                        
                                        // Execute the not accepted action
                                        try {
                                            await runSequence(campaign, notAcceptedLeads, correspondingActionNode);
                                            console.log(`✅ "Not accepted" action executed successfully for ${notAcceptedLeads.length} leads`);
                                        } catch (notAcceptedError) {
                                            console.error(`❌ Error executing "not accepted" action:`, notAcceptedError);
                                        }
                                    } else {
                                        console.log(`⏸️ No leads found that haven't accepted after ${delayNode.value} ${delayNode.time} delay`);
                                    }
                                }
                            } else {
                                console.log(`ℹ️ No "not accepted" delay/action nodes found in sequence - skipping not accepted path check`);
                            }
                        }
                    } catch (notAcceptedCheckError) {
                        console.error(`❌ Error checking "not accepted" path:`, notAcceptedCheckError);
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
    
    if (request.action === 'startCampaign') {
        console.log('🚀 Campaign start request received');
        console.log('📋 Campaign ID:', request.campaignId);
        
        // Use async IIFE to handle await
        (async () => {
            try {
                const campaignId = request.campaignId;
                
                console.log(`🚀 Starting campaign monitoring for campaign ID: ${campaignId}`);
                
                // Use self.startCampaign since it's exported to global scope
                if (typeof self.startCampaign === 'function') {
                    const success = await self.startCampaign(campaignId);
                    sendResponse({ success, message: `Campaign ${campaignId} started successfully` });
                } else if (typeof startCampaign === 'function') {
                    const success = await startCampaign(campaignId);
                    sendResponse({ success, message: `Campaign ${campaignId} started successfully` });
                } else {
                    console.error('❌ startCampaign function not found');
                    sendResponse({ success: false, error: 'startCampaign function not available' });
                }
            } catch (error) {
                console.error('❌ Error starting campaign:', error);
                sendResponse({ success: false, error: error.message });
            }
        })();
        return true; // Keep channel open for async response
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

/**
 * Store sent message in Chrome storage (IMMEDIATE - Primary tracking method)
 * This is called immediately when sending messages for fast, reliable tracking
 */
const storeSentMessageInChromeStorage = async (connectionId, message, sender, backendUrn = null) => {
    try {
        const messageTimestamp = Date.now();
        const messageId = `msg_${messageTimestamp}`;
        const storageKey = `sentMessages_${connectionId}`;
        
        // Get existing messages array
        const storageData = await chrome.storage.local.get([storageKey]);
        const messagesArray = storageData[storageKey] || [];
        
        // Add new message to array
        messagesArray.push({
            messageId: messageId,
            text: message,
            timestamp: messageTimestamp,
            sender: sender, // 'user' or 'ai'
            backendUrn: backendUrn
        });
        
        // Update last processed tracker
        const lastProcessedKey = `lastProcessed_${connectionId}`;
        await chrome.storage.local.set({
            [storageKey]: messagesArray,
            [lastProcessedKey]: {
                lastMessageId: messageId,
                lastTimestamp: messageTimestamp,
                lastSender: sender
            }
        });
        
        console.log(`✅ Message stored in Chrome storage (${sender}): ${messageId}`);
        return true;
    } catch (error) {
        console.error('❌ Error storing message in Chrome storage:', error);
        return false;
    }
};

/**
 * Check if a message was sent by us (checks Chrome storage first, then database fallback)
 * Returns: { isFromUs: boolean, sender: 'user' | 'ai' | null }
 */
const checkIfMessageIsFromUs = async (connectionId, messageText, messageTimestamp) => {
    try {
        // METHOD 1: Check Chrome storage array (fastest, most reliable)
        const storageKey = `sentMessages_${connectionId}`;
        const storageData = await chrome.storage.local.get([storageKey]);
        const sentMessages = storageData[storageKey] || [];
        
        const text = (messageText || '').trim();
        const timestamp = messageTimestamp || Date.now();
        
        // Check each sent message for match
        for (const sentMsg of sentMessages) {
            const sentText = (sentMsg.text || '').trim();
            
            // Match by text (first 50 chars) AND timestamp (within 10 seconds)
            const textMatch = sentText.substring(0, 50) === text.substring(0, 50) ||
                           sentText.includes(text.substring(0, 30)) ||
                           text.includes(sentText.substring(0, 30));
            const timeMatch = Math.abs(sentMsg.timestamp - timestamp) < 10000; // 10 seconds tolerance
            
            if (textMatch && timeMatch) {
                console.log(`✅ Chrome storage match: Found our ${sentMsg.sender} message`);
                return { isFromUs: true, sender: sentMsg.sender };
            }
        }
        
        // METHOD 2: Fallback to database check
        try {
            const linkedinIdResult = await chrome.storage.local.get(['linkedinId']);
            const currentLinkedInId = linkedinIdResult.linkedinId || 'vicken-concept';
            const tokenResult = await chrome.storage.local.get(['csrfToken']);
            
            const checkResponse = await fetch(`${PLATFORM_URL}/api/conversation-messages/check-sent?connection_id=${connectionId}&message_text=${encodeURIComponent(text.substring(0, 100))}&timestamp=${timestamp}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'lk-id': currentLinkedInId,
                    'csrf-token': tokenResult.csrfToken,
                    'ngrok-skip-browser-warning': 'true'
                }
            });
            
            if (checkResponse.ok) {
                const checkResult = await checkResponse.json();
                if (checkResult.isOurMessage) {
                    return { isFromUs: true, sender: checkResult.sender || 'user' };
                }
            }
        } catch (dbError) {
            console.log('⚠️ Database check failed:', dbError.message);
        }
        
        // Not found - message is from lead
        return { isFromUs: false, sender: null };
    } catch (error) {
        console.error('❌ Error checking if message is from us:', error);
        return { isFromUs: false, sender: null };
    }
};

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
                console.log('🔍 No existing call_id found, checking Chrome storage for call_id_{connectionId}...');
                
                // First check Chrome storage for call_id_{connectionId}
                try {
                    const callIdStorage = await chrome.storage.local.get([`call_id_${messageData.connection_id}`]);
                    const storedCallId = callIdStorage[`call_id_${messageData.connection_id}`];
                    if (storedCallId) {
                        console.log('✅ Found call_id in Chrome storage:', storedCallId);
                        messageData.call_id = String(storedCallId);
                        
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
                                console.log(`✅ Updated monitoring data ${key} with call_id from storage: ${messageData.call_id}`);
                            }
                        }
                    } else {
                        console.log('🔍 No call_id in Chrome storage, checking backend for existing call record...');
                    }
                } catch (error) {
                    console.log('⚠️ Error checking Chrome storage for call_id:', error);
                }
                
                // Only check backend if we still don't have a call_id
                if (!messageData.call_id) {
                    // Check if call record already exists in backend database
                    try {
                        const checkResponse = await fetch(`${PLATFORM_URL}/api/calls/check-existing?connection_id=${messageData.connection_id}`, {
                            method: 'GET',
                            headers: {
                                'Content-Type': 'application/json',
                                'Accept': 'application/json',
                                'X-Requested-With': 'XMLHttpRequest',
                                'lk-id': currentLinkedInId,
                                'csrf-token': tokenResult.csrfToken,
                                'ngrok-skip-browser-warning': 'true'
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
                            
                            // Also store call_id in Chrome storage with call_id_{connectionId} key for easy retrieval
                            await chrome.storage.local.set({ [`call_id_${messageData.connection_id}`]: messageData.call_id });
                            console.log(`✅ Stored call_id in Chrome storage: call_id_${messageData.connection_id} = ${messageData.call_id}`);
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
                        'csrf-token': tokenResult.csrfToken,
                        'ngrok-skip-browser-warning': 'true'
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
                    
                    // Also store call_id in Chrome storage with call_id_{connectionId} key for easy retrieval
                    await chrome.storage.local.set({ [`call_id_${messageData.connection_id}`]: messageData.call_id });
                    console.log(`✅ Stored call_id in Chrome storage: call_id_${messageData.connection_id} = ${messageData.call_id}`);
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
                'csrf-token': tokenResult.csrfToken,
                'ngrok-skip-browser-warning': 'true'
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
 * Clear campaign-related Chrome storage (processed leads, locks, etc.)
 * Call this from console: clearCampaignStorage()
 */
globalThis.clearCampaignStorage = async function() {
    try {
        console.log('🧹 Clearing campaign-related Chrome storage...');
        
        // Get all storage keys
        const allStorage = await chrome.storage.local.get();
        const keys = Object.keys(allStorage);
        
        // Find campaign-related keys
        const campaignKeys = keys.filter(key => 
            key.startsWith('campaign_') || 
            key === 'activeCampaigns' ||
            key.includes('processed') ||
            key.includes('running')
        );
        
        console.log(`📊 Found ${campaignKeys.length} campaign-related keys:`, campaignKeys);
        
        if (campaignKeys.length > 0) {
            await chrome.storage.local.remove(campaignKeys);
            console.log(`✅ Cleared ${campaignKeys.length} campaign-related storage keys`);
            console.log('📋 Campaign will fetch fresh data from backend table on next run');
        } else {
            console.log('ℹ️ No campaign-related storage keys found');
        }
        
        return {
            success: true,
            clearedKeys: campaignKeys.length,
            clearedKeysList: campaignKeys,
            message: 'Campaign storage cleared successfully'
        };
    } catch (error) {
        console.error('❌ Error clearing campaign storage:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

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
 * Reset node runStatus in backend database (for debugging/testing)
 * Call this from console: resetNodeRunStatus(campaignId, nodeKey, runStatus)
 * Example: resetNodeRunStatus(5, 2, false) - resets node 2 in campaign 5 to false
 */
globalThis.resetNodeRunStatus = async function(campaignId, nodeKey, runStatus = false) {
    try {
        console.log(`🔄 Resetting node runStatus in backend database...`);
        console.log(`📋 Campaign ID: ${campaignId}`);
        console.log(`🔑 Node Key: ${nodeKey}`);
        console.log(`📊 New runStatus: ${runStatus}`);
        
        // Get LinkedIn ID from storage
        const linkedinIdResult = await chrome.storage.local.get(['linkedinId']);
        const currentLinkedInId = linkedinIdResult.linkedinId || 'vicken-concept';
        
        const response = await fetch(`${PLATFORM_URL}/api/campaign/${campaignId}/update-node`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'lk-id': currentLinkedInId,
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify({
                nodeKey: nodeKey,
                runStatus: runStatus
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log(`✅ Node runStatus reset successfully:`, data);
            return {
                success: true,
                data: data,
                message: `Node ${nodeKey} runStatus set to ${runStatus}`
            };
        } else {
            const errorText = await response.text();
            throw new Error(`API returned ${response.status}: ${errorText}`);
        }
    } catch (error) {
        console.error('❌ Error resetting node runStatus:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

/**
 * Reset all node runStatus for a campaign (except end node)
 * Call this from console: resetCampaignNodes(campaignId)
 * Example: resetCampaignNodes(5) - resets all nodes in campaign 5 to false
 */
globalThis.resetCampaignNodes = async function(campaignId) {
    try {
        console.log(`🔄 Resetting all nodes for campaign ${campaignId}...`);
        
        // Get LinkedIn ID from storage
        const linkedinIdResult = await chrome.storage.local.get(['linkedinId']);
        const currentLinkedInId = linkedinIdResult.linkedinId || 'vicken-concept';
        
        // First, get the campaign sequence to find all nodes
        const sequenceResponse = await fetch(`${PLATFORM_URL}/api/campaign/${campaignId}/sequence`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'lk-id': currentLinkedInId,
                'ngrok-skip-browser-warning': 'true'
            }
        });
        
        if (!sequenceResponse.ok) {
            throw new Error(`Failed to fetch campaign sequence: ${sequenceResponse.status}`);
        }
        
        const sequenceData = await sequenceResponse.json();
        const nodes = sequenceData.data?.nodeModel || sequenceData.nodeModel || [];
        
        console.log(`📋 Found ${nodes.length} nodes to reset`);
        
        let resetCount = 0;
        for (const node of nodes) {
            // Skip end nodes
            if (node.type === 'end' || node.value === 'end') {
                console.log(`⏭️ Skipping end node (key: ${node.key})`);
                continue;
            }
            
            // Reset action and delay nodes
            if (node.type === 'action' || node.type === 'delay') {
                const resetResponse = await fetch(`${PLATFORM_URL}/api/campaign/${campaignId}/update-node`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'lk-id': currentLinkedInId,
                        'ngrok-skip-browser-warning': 'true'
                    },
                    body: JSON.stringify({
                        nodeKey: node.key,
                        runStatus: false
                    })
                });
                
                if (resetResponse.ok) {
                    resetCount++;
                    console.log(`✅ Reset node ${node.key} (${node.label || node.value})`);
                } else {
                    console.warn(`⚠️ Failed to reset node ${node.key}`);
                }
            }
        }
        
        console.log(`✅ Reset ${resetCount} nodes successfully`);
        return {
            success: true,
            resetCount: resetCount,
            message: `Reset ${resetCount} nodes for campaign ${campaignId}`
        };
    } catch (error) {
        console.error('❌ Error resetting campaign nodes:', error);
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

// ============================================================================
// 🚫 DEPRECATED: Content Creator Alarms (DISABLED - NOW HANDLED BY BACKEND)
// ============================================================================
// LinkedIn posts are now published automatically by the backend via LinkedIn API.
// No extension automation needed for posting!
// ============================================================================

/*
// DEPRECATED - Periodic check for scheduled posts (NO LONGER USED)
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'content_creator_check') {
        console.log('⚠️ Content Creator alarm - NOW HANDLED BY BACKEND API');
        // Do nothing - backend handles posting
    }
});

// DEPRECATED - Alarm creation (DISABLED)
// chrome.alarms.create('content_creator_check', { 
//     delayInMinutes: 0.5, 
//     periodInMinutes: 0.5 
// });

// DEPRECATED - Manual check listener (DISABLED)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'checkContentCreatorPosts') {
        console.log('⚠️ Content Creator posting is now handled by backend API');
        sendResponse({success: true, message: 'Posting handled by backend'});
    }
});
*/

console.log('✅ Content Creator extension integration initialized');
