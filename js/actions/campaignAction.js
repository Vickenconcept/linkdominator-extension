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
           
            if (response.status >= 200 && response.status < 300) {
                if (data.status !== undefined && data.status !== 200 && data.status !== 201) {
                    console.error('❌ API request failed (status in body):', data);
                    throw new Error(data.message || 'API request failed');
                } else {
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
        const response = await apiRequest(`${PLATFORM_URL}/api/campaigns`, {
            method: 'GET'
        });
        
        // Handle different response formats
        if (response && response.data) {
            campaignData = Array.isArray(response.data) ? response.data : [];
        } else if (Array.isArray(response)) {
            campaignData = response;
        } else {
            campaignData = [];
        }
        
        setCampaigns();
        
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

    if (!campaignData) {
        return;
    }

    if (!Array.isArray(campaignData)) {
        return;
    }

    if(campaignData.length > 0){
        $('#campaign-tbody').empty();
        $.each(campaignData, function(i,item) {
            const status = helper.transformText(item.status,'capitalize');
            // Treat 'active' and 'running' as the same - both mean campaign is running
            const isRunning = item.status == 'running' || item.status == 'active';
            const statusBadgeColor = isRunning ? 'linear-gradient(135deg, #28a745 0%, #218838 100%)' : 
                                      item.status == 'stop' || item.status == 'stopped' ? 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)' : 
                                      'linear-gradient(135deg, #6c757d 0%, #5a6268 100%)';
            const statusIcon = isRunning ? 'fa-play-circle' : (item.status == 'stop' || item.status == 'stopped' ? 'fa-stop-circle' : 'fa-pause-circle');
            
            $('#campaign-tbody').append(`
                <tr class="campaign-${item.id}" style="transition: all 0.3s ease; border-bottom: 1px solid #f0f0f0;">
                                            <td style="padding: 16px; vertical-align: middle;">
                                                <div style="display: flex; align-items: center;">
                                                    <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); border-radius: 10px; display: flex; align-items: center; justify-content: center; margin-right: 12px; box-shadow: 0 2px 8px rgba(249, 115, 22, 0.2);">
                                                        <i class="fas fa-bullhorn" style="color: white; font-size: 16px;"></i>
                                                    </div>
                            <div>
                                <div style="font-weight: 600; color: #333; font-size: 15px; margin-bottom: 2px;" title="${item.name}">${item.name}</div>
                                <div style="font-size: 12px; color: #6c757d;">
                                    <i class="fas fa-layer-group me-1"></i>${item.sequenceType || 'N/A'}
                                </div>
                            </div>
                        </div>
                    </td>
                    <td style="padding: 16px; vertical-align: middle;">
                        <div style="display: inline-flex; align-items: center; padding: 6px 12px; background: linear-gradient(135deg, rgba(249, 115, 22, 0.1) 0%, rgba(234, 88, 12, 0.1) 100%); border-radius: 8px; font-weight: 500; color: #f97316; border: 1px solid rgba(249, 115, 22, 0.2);">
                            <i class="fas fa-list-ol me-2"></i>
                            <span>${item.sequenceType || 'N/A'}</span>
                        </div>
                    </td>
                    <td style="padding: 16px; text-align: center; vertical-align: middle;">
                        <div style="display: inline-flex; align-items: center; justify-content: center; background: ${statusBadgeColor}; padding: 8px 16px; border-radius: 20px; font-weight: 600; color: white; min-width: 100px;">
                            <i class="fas ${statusIcon} me-2"></i>
                            <span>${status}</span>
                        </div>
                    </td>
                    <td style="padding: 16px; text-align: center; vertical-align: middle;">
                        <div style="display: flex; align-items: center; justify-content: center;">
                            <div class="form-check form-switch" style="margin: 0; display: flex; align-items: center;">
                                <input class="form-check-input runSwitch" 
                                    type="checkbox" 
                                    role="switch" 
                                    id="runSwitch-${item.id}" 
                                    data-campaignid="${item.id}" 
                                    ${isRunning ? 'checked' : ''}
                                    style="width: 50px; height: 26px; cursor: pointer; margin-right: 10px; transition: all 0.3s;">
                                <label class="form-check-label" for="runSwitch-${item.id}" style="font-weight: 500; color: #333; cursor: pointer; margin: 0;">
                                    ${isRunning ? '<i class="fas fa-play-circle me-1" style="color: #28a745;"></i>Running' : '<i class="fas fa-pause-circle me-1" style="color: #6c757d;"></i>Launch'}
                                </label>
                            </div>
                        </div>
                    </td>
                </tr>
            `);
        });
    } else {
        $('#campaign-tbody').html(`
            <tr>
                <td colspan="4" class="text-center" style="padding: 60px 20px;">
                        <div style="text-align: center;">
                            <div style="width: 80px; height: 80px; background: linear-gradient(135deg, rgba(249, 115, 22, 0.1) 0%, rgba(234, 88, 12, 0.1) 100%); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px; box-shadow: 0 4px 12px rgba(249, 115, 22, 0.2);">
                                <i class="fas fa-bullhorn" style="font-size: 32px; color: #f97316;"></i>
                            </div>
                        <h6 style="color: #333; font-weight: 600; margin-bottom: 8px;">No campaigns found</h6>
                        <p style="color: #6c757d; margin-bottom: 20px; font-size: 14px;">Create your first campaign to get started!</p>
                    </div>
                </td>
            </tr>
        `);
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