let campaignData = [], campaignLeads = [], campaignSequence = [], campaignLeadgenRunning = [];
let selectedCampaign;

// API configuration and error handling
const API_CONFIG = {
    timeout: 30000, // 30 seconds
    retryAttempts: 3,
    retryDelay: 2000
};

// Enhanced fetch wrapper with retry mechanism and error handling
const apiRequest = async (url, options = {}) => {
    const defaultOptions = {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'lk-id': (typeof window.getLinkedInIdForApi === 'function' ? window.getLinkedInIdForApi() : (linkedinId || window.linkedinId || $('#me-publicIdentifier').val())),
            // Add headers to help bypass ngrok warning page
            'ngrok-skip-browser-warning': 'true',
            'X-Requested-With': 'XMLHttpRequest'
            // Removed csrf-token header to eliminate CSRF issues
        },
        ...options
    };

    // Merge any additional headers from options
    if (options.headers) {
        defaultOptions.headers = { ...defaultOptions.headers, ...options.headers };
    }

    // Remove CSRF token logic since we're disabling CSRF validation
    console.log('🌐 Making API request to:', url, 'with options:', defaultOptions);

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);

        const response = await fetch(url, {
            ...defaultOptions,
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        // Check HTTP status code first
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ HTTP error response:', {
                status: response.status,
                statusText: response.statusText,
                body: errorText.substring(0, 200)
            });
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            
            // Check for success status in JSON body (if present) OR HTTP status code 200-299
            // Some endpoints return {audience: [...]} without a status field, which is fine
            if (response.status >= 200 && response.status < 300) {
                // If status field exists, check it; otherwise HTTP status is sufficient
                if (data.status !== undefined && data.status !== 200 && data.status !== 201) {
                    console.error('❌ API request failed (status in body):', data);
                    throw new Error(data.message || 'API request failed');
                } else {
                    console.log('✅ API request successful:', data);
                    return data;
                }
            } else {
                console.error('❌ API request failed:', data);
                throw new Error(data.message || 'API request failed');
            }
        } else {
            // Handle non-JSON responses (like ngrok warning page)
            const text = await response.text();
            
            // Check if it's ngrok's warning page
            if (text.includes('ngrok') && text.includes('ERR_NGROK')) {
                console.error('❌ ngrok is blocking the request with warning page');
                throw new Error('ngrok_warning_page');
            }
            
            console.error('❌ Non-JSON response received:', text.substring(0, 200));
            throw new Error(`Server returned non-JSON response`);
        }
    } catch (error) {
        if (error.name === 'AbortError') {
            console.error('⏰ API request timed out');
            throw new Error('Request timed out');
        }
        
        // Retry logic for network errors
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            console.log('🔄 Network error, retrying...');
            if (API_CONFIG.retryCount < API_CONFIG.maxRetries) {
                API_CONFIG.retryCount++;
                await new Promise(resolve => setTimeout(resolve, API_CONFIG.retryDelay));
                return apiRequest(url, options);
            }
        }
        
        console.error('❌ API request error:', error);
        throw error;
    }
};

/**
 * Get all campaign resource
 */
const getCampaigns = async () => {
    try {
        console.log('Fetching campaigns...');
        const response = await apiRequest(`${PLATFORM_URL}/api/campaigns`, {
            method: 'GET'
        });
        
        console.log('📊 Campaigns API response:', {
            full_response: response,
            has_data: !!response.data,
            data_type: typeof response.data,
            is_array: Array.isArray(response.data),
            data_length: Array.isArray(response.data) ? response.data.length : 'not an array'
        });
        
        // Handle different response formats
        if (response && response.data) {
            campaignData = Array.isArray(response.data) ? response.data : [];
        } else if (Array.isArray(response)) {
            campaignData = response;
        } else {
            campaignData = [];
            console.warn('⚠️ Unexpected response format:', response);
        }
        
        console.log('📋 Campaign data to display:', {
            count: campaignData.length,
            campaigns: campaignData
        });
        
        setCampaigns();
        console.log('Campaigns loaded successfully:', campaignData.length);
        
    } catch (error) {
        console.error('Error fetching campaigns:', error);
        showErrorMessage('Failed to load campaigns: ' + error.message);
    }
}

/**
 * Set all camaign resource to list
 */
const setCampaigns = () => {
    let tbody = document.getElementById('campaign-tbody');
    
    console.log('🎨 setCampaigns called', {
        tbody_exists: !!tbody,
        campaignData_length: campaignData ? campaignData.length : 'campaignData is null/undefined',
        campaignData_type: typeof campaignData,
        is_array: Array.isArray(campaignData),
        campaignData: campaignData
    });

    if (!campaignData) {
        console.warn('⚠️ campaignData is null or undefined');
        return;
    }

    if (!Array.isArray(campaignData)) {
        console.warn('⚠️ campaignData is not an array:', typeof campaignData, campaignData);
        return;
    }

    if(campaignData.length > 0){
        $('#campaign-tbody').empty();
        $.each(campaignData, function(i,item) {
            console.log('📝 Adding campaign row:', item);
            $('#campaign-tbody').append(`
                <tr class="campaign-${item.id}">
                    <td title="${item.name}">${item.name}</td>
                    <td title="${item.sequenceType}">${item.sequenceType}</td>
                    <td title="${helper.transformText(item.status,'capitalize')}">${helper.transformText(item.status,'capitalize')}</td>
                    <td>
                        <div class="form-check form-switch custom-control custom-checkbox custom-control-inline">
                            <input class="form-check-input shadow-none runSwitch" type="checkbox" role="switch" id="runSwitch-${item.id}" data-campaignid="${item.id}" ${item.status == 'running'? 'checked':''}>
                            <label class="form-check-label" for="runSwitch-${item.id}">Launch</label>
                        </div>
                    </td>
                </tr>
            `);
        });
        console.log('✅ Campaigns displayed successfully');
    } else {
        console.warn('⚠️ No campaigns to display');
        $('#campaign-tbody').html('<tr><td colspan="4" class="text-center">No campaigns found</td></tr>');
    }
}

/**
 * Get leads of a specific campaign
 * @param {integer} campaignId 
 */
const getCampaignLeads = async (campaignId, callback) => {
    try {
        console.log('Fetching campaign leads for ID:', campaignId);
        const response = await apiRequest(`${PLATFORM_URL}/api/campaign/${campaignId}/leads`, {
            method: 'GET'
        });
        
        campaignLeads = response.data;
        console.log('Campaign leads loaded:', campaignLeads.length);
        callback(response.data);
        
    } catch (error) {
        console.error('Error fetching campaign leads:', error);
        showErrorMessage('Failed to load campaign leads: ' + error.message);
        callback([]);
    }
}

/**
 * Get sequence of a specific campaign
 * @param {integer} campaignId
 */
const getCampaignSequence = async (campaignId) => {
    try {
        console.log('Fetching campaign sequence for ID:', campaignId);
        const response = await apiRequest(`${PLATFORM_URL}/api/campaign/${campaignId}/sequence`, {
            method: 'GET'
        });
        
        campaignSequence = response.data;
        console.log('Campaign sequence loaded successfully:', campaignSequence);
        return campaignSequence;
        
    } catch (error) {
        console.error('Error fetching campaign sequence:', error);
        showErrorMessage('Failed to load campaign sequence: ' + error.message);
        return null;
    }
}

/**
 * Update campaign
 * @param {object} data 
 */
const updateCampaign = async (data) => {
    try {
        console.log('Updating campaign:', data);
        
        // Extract campaignId from the data object
        const campaignId = data.campaignId || data.id;
        
        if (!campaignId) {
            throw new Error('Campaign ID is required');
        }
        
        // Prepare the request data - backend expects specific fields
        const requestData = {};
        
        if (data.status) {
            requestData.status = data.status;
        }
        if (data.campaign_name) {
            requestData.campaign_name = data.campaign_name;
        }
        if (data.process_condition) {
            requestData.process_condition = data.process_condition;
        }
        
        console.log('Sending campaign update request:', {
            url: `${PLATFORM_URL}/api/campaign/${campaignId}/update`,
            data: requestData
        });
        
        const response = await apiRequest(`${PLATFORM_URL}/api/campaign/${campaignId}/update`, {
            method: 'POST',
            body: JSON.stringify(requestData)
        });
        
        console.log('Campaign updated successfully');
        
        // Refresh campaigns list after update
        if (typeof getCampaigns === 'function') {
            getCampaigns();
        }
        
        return response.data;
        
    } catch (error) {
        console.error('Error updating campaign:', error);
        showErrorMessage('Failed to update campaign: ' + error.message);
        throw error;
    }
}

/**
 * Update sequence node model
 * @param {object} campaign 
 * @param {object} nodeModel 
 */
const updateSequenceNodeModel = async (campaign, nodeModel) => {
    try {
        console.log('Updating sequence node model for campaign:', campaign.id);
        
        // Prepare the request data - backend expects specific fields
        const requestData = {
            nodeKey: nodeModel.key,
            runStatus: nodeModel.runStatus || true
        };
        
        console.log('Sending sequence update request:', {
            url: `${PLATFORM_URL}/api/campaign/${campaign.id}/update-node`,
            data: requestData
        });
        
        const response = await apiRequest(`${PLATFORM_URL}/api/campaign/${campaign.id}/update-node`, {
            method: 'POST',
            body: JSON.stringify(requestData)
        });
        
        console.log('Sequence node model updated successfully');
        return response.data;
        
    } catch (error) {
        console.error('Error updating sequence node model:', error);
        showErrorMessage('Failed to update sequence: ' + error.message);
        throw error;
    }
}

/**
 * Create the campaign lead for the specified lead gen running
 * @param {integer} campaignId 
 */
const createLeadGenRunning = campaignId => {
    fetch(`${PLATFORM_URL}/api/campaign/${campaignId}/leadgen/store`, {
        method: 'post',
        headers: {
            'lk-id': (typeof window.getLinkedInIdForApi === 'function' ? window.getLinkedInIdForApi() : (linkedinId || window.linkedinId || $('#me-publicIdentifier').val())),
        },
    })
    .then(res => res.json())
    .then(() => {})
}

/**
 * Update lead gen running
 * @param {integer} campaignId 
 * @param {integer} leadId 
 * @param {object} data 
 */
const updateLeadGenRunning = async (campaignId, leadId, data) => {
    try {
        console.log('Updating lead gen running for campaign:', campaignId, 'lead:', leadId);
        
        // Prepare the request data - backend expects specific fields
        const requestData = {
            acceptedStatus: data.acceptedStatus ? 1 : 0,
            currentNodeKey: data.currentNodeKey,
            nextNodeKey: data.nextNodeKey,
            statusLastId: data.statusLastId
        };
        
        console.log('Sending lead gen update request:', {
            url: `${PLATFORM_URL}/api/campaign/${campaignId}/leadgen/${leadId}/update`,
            data: requestData
        });
        
        const response = await apiRequest(`${PLATFORM_URL}/api/campaign/${campaignId}/leadgen/${leadId}/update`, {
            method: 'POST',
            body: JSON.stringify(requestData)
        });
        
        console.log('Lead gen running updated successfully');
        return response.data;
        
    } catch (error) {
        console.error('Error updating lead gen running:', error);
        showErrorMessage('Failed to update lead status: ' + error.message);
        throw error;
    }
}

/**
 * Get all leadgen campaign sequence leads running
 * @param {integer} campaignId 
 */
const getLeadGenRunning = async (campaignId) => {
    try {
        console.log('Fetching lead gen running for campaign:', campaignId);
        const response = await apiRequest(`${PLATFORM_URL}/api/campaign/${campaignId}/leads/running`, {
            method: 'GET'
        });
        
        campaignLeadgenRunning = response.data;
        console.log('Lead gen running loaded:', campaignLeadgenRunning.length);
        return response.data;
        
    } catch (error) {
        console.error('Error fetching lead gen running:', error);
        showErrorMessage('Failed to load lead status: ' + error.message);
        return [];
    }
}

/**
 * Update lead network degree
 * @param {object} leadData 
 */
const updateLeadNetworkDegree = async (leadData) => {
    try {
        console.log('Updating lead network degree for:', leadData.id);
        
        // Prepare the request data - backend expects specific fields
        const requestData = {
            networkDegree: leadData.networkDegree,
            leadSrc: leadData.source || 'aud' // Default to 'aud' for audience leads
        };
        
        console.log('Sending lead network update request:', {
            url: `${PLATFORM_URL}/api/lead/${leadData.id}/update`,
            data: requestData
        });
        
        const response = await apiRequest(`${PLATFORM_URL}/api/lead/${leadData.id}/update`, {
            method: 'POST',
            body: JSON.stringify(requestData)
        });
        
        console.log('Lead network degree updated successfully');
        return response.data;
        
    } catch (error) {
        console.error('Error updating lead network degree:', error);
        showErrorMessage('Failed to update lead network info: ' + error.message);
        throw error;
    }
}

/**
 * Store call status
 * @param {object} data 
 */
const storeCallStatus = async (data) => {
    try {
        console.log('Storing call status:', data);
        
        // Prepare the request data - backend expects specific fields
        const requestData = {
            recipient: data.recipient,
            profile: data.profile,
            sequence: data.sequence,
            callStatus: data.callStatus
        };
        
        console.log('Sending call status store request:', {
            url: `${PLATFORM_URL}/api/book-call/store`,
            data: requestData
        });
        
        const response = await apiRequest(`${PLATFORM_URL}/api/book-call/store`, {
            method: 'POST',
            body: JSON.stringify(requestData)
        });
        
        console.log('Call status stored successfully');
        return response.data;
        
    } catch (error) {
        console.error('Error storing call status:', error);
        showErrorMessage('Failed to store call status: ' + error.message);
        throw error;
    }
}

// Utility function to show error messages to user
const showErrorMessage = (message) => {
    console.error('User Error:', message);
    
    // Use the new notification system
    if (typeof NotificationSystem !== 'undefined') {
        NotificationSystem.show('error', message);
    } else if (typeof alert !== 'undefined') {
        // Fallback to basic alert if notification system not available and alert is available
        console.error('Notification system not available, showing alert:', message);
        alert('Error: ' + message);
    } else {
        // Background script context - just log the error
        console.error('Error in background context:', message);
    }
};