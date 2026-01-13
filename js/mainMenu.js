var userData;

// Global error handler for JavaScript errors
window.addEventListener('error', function(event) {
    console.error('JavaScript error:', event.error);
    
    // Handle extension context invalidated error
    if (event.error && event.error.message && event.error.message.includes('Extension context invalidated')) {
        console.log('🔄 Extension context invalidated - extension was reloaded/updated');
        // Don't show error message for this case as it's expected behavior
        return;
    }
    
    // Handle other extension-related errors
    if (event.error && event.error.message && (
        event.error.message.includes('Extension context') ||
        event.error.message.includes('chrome.runtime') ||
        event.error.message.includes('Receiving end does not exist')
    )) {
        console.log('🔄 Extension communication error - likely due to reload/update');
        return;
    }
    
    // Use console.error instead of NotificationSystem to avoid circular dependencies
    console.error('A system error occurred. Please refresh the page.');
});

var mainMenu = `
<div id="mySidepanel" class="sidepanel" style="width:285px;display:none; z-index: 100000;">
    <div class="inline-block">
        <!--h5 class="nav-header"><b>LinkoMatic</b></h5-->
        <a href="https://app.linkdominator.com" target="_blank">
            <img src="https://app.linkdominator.com/images/linkdominator-brand.png" 
            height="30" 
            style="margin-left:35px;width:16rem;"
            onerror="this.src='/images/linkdominator-brand.png'">
        </a>
        <span class="closebtn" id="close-nav"><i class="fas fa-minus closer"></i></span>
    </div>
    <div class="menu-divider" style="margin-bottom:8px;"></div>
    <a href="${LINKEDIN_URL}/in/me" id="profileSpot" style="padding: 0px 8px 0px 32px;"></a>
    <div class="menu-divider-menu"></div>
    <!-- Authorization Button - Shows when user is not authorized -->
    <div id="authorize-button-container" style="display: none; padding: 12px 16px; margin: 8px 16px; background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%); border-radius: 8px; box-shadow: 0 2px 8px rgba(255, 107, 107, 0.3);">
        <div style="color: white; font-size: 12px; font-weight: 600; margin-bottom: 8px; text-align: center;">
            <i class="fas fa-exclamation-triangle" style="margin-right: 6px;"></i>
            Authorization Required
        </div>
        <button id="authorize-linkedin-btn" style="width: 100%; padding: 10px; background: white; color: #0077b5; border: none; border-radius: 6px; font-weight: 600; font-size: 13px; cursor: pointer; transition: all 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <i class="fas fa-sync-alt" style="margin-right: 6px;"></i>
            Sync & Authorize
        </button>
        <div style="color: white; font-size: 11px; margin-top: 8px; text-align: center; opacity: 0.9;">
            Click to sync your LinkedIn account with the platform
        </div>
    </div>
    <div class="menu-divider-menu"></div>
    <div id="menus" class="menus">
        <span id="stop-bot">
            <i class="fas fa-toggle-on fa-lg sm-icon"></i>&nbsp;Stop Bot
        </span>
        <div class="menu-divider-menu"></div>
        <span id="audience-creation-menu-click">
            <i class="fas fa-bullhorn fa-lg sm-icon"></i>&nbsp;&nbsp;Audience Creation
        </span>
        <div class="menu-divider-menu"></div>
        <span id="sales-navigator-menu-click">
            <i class="fas fa-compass fa-lg sm-icon"></i>&nbsp;&nbsp;Sales Navigator
        </span>
        <div class="menu-divider-menu"></div>
        <span id="campaign-menu-click">
            <i class="fas fa-flag fa-lg sm-icon"></i>&nbsp;&nbsp;Campaign
            <i class="fas fa-circle fa-sm" id="status-indicator" style="color: #ccc; margin-left: 8px; font-size: 8px; vertical-align: middle;" title="Campaign Status: Inactive"></i>
        </span>
        <div class="menu-divider-menu"></div>
        <span id="add-connect-menu-click">
            <i class="fas fa-user-plus fa-lg sm-icon"></i>&nbsp;Add Connections
        </span>
        <div class="menu-divider-menu"></div>
        <span id="message-connect-menu-click">
            <i class="fas fa-paper-plane fa-lg sm-icon"></i>&nbsp;&nbsp;Message All Connections 
        </span>
        <div class="menu-divider-menu"></div>
        <span id="message-target-menu-click">
            <i class="fas fa-bullseye fa-lg sm-icon"></i>&nbsp;&nbsp;Message Targeted Users 
        </span>
        <div class="menu-divider-menu"></div>
        <span id="message-followup-menu-click">
            <i class="fas fa-comments fa-lg sm-icon"></i>&nbsp;Message Follow Up
        </span>
        
        <div class="menu-divider-menu"></div>
        <span id="connection-info-menu-click">
            <i class="fas fa-cloud-download-alt fa-lg sm-icon"></i>&nbsp;Get Connection Info 
        </span>
        <div class="menu-divider-menu"></div>
        <span id="view-connection-menu-click">
            <i class="fas fa-eye fa-lg sm-icon"></i>&nbsp;&nbsp;View Connections 
        </span>
        <div class="menu-divider-menu"></div>
        <span id="endorse-connection-menu-click">
            <i class="fas fa-handshake fa-lg sm-icon"></i>&nbsp;Endorse Connections 
        </span>
        <div class="menu-divider-menu"></div>
        <span id="like-connect-menu-click">
            <i class="fas fa-thumbs-up fa-lg sm-icon"></i>&nbsp;&nbsp;Like Or Connect 
        </span>
        <div class="menu-divider-menu"></div>
        <span id="follow-connect-menu-click">
            <i class="fas fa-user-circle fa-lg sm-icon"></i>&nbsp;&nbsp;Follow Connections 
        </span>
        <div class="menu-divider-menu"></div>
        <span id="birthday-wish-menu-click">
            <i class="fas fa-gifts fa-lg sm-icon"></i>&nbsp;Wish Happy Birthday 
        </span>
        <div class="menu-divider-menu"></div>
        <span id="anniversary-menu-click">
            <i class="fas fa-gift fa-lg sm-icon"></i>&nbsp;&nbsp;Congrats On Anniversary
        </span>
        <div class="menu-divider-menu"></div>
        <span id="new-job-menu-click">
            <i class="fas fa-suitcase fa-lg sm-icon"></i>&nbsp;&nbsp;Congrats On New Job
        </span>
        <div class="menu-divider-menu"></div>
        <!--span id="remove-connect-menu-click">
            <i class="fas fa-trash fa-lg sm-icon"></i>&nbsp;&nbsp;&nbsp;Remove Connections 
        </span-->
        <div class="menu-divider-menu"></div>
        <span id="withdraw-invite-menu-click">
            <i class="fas fa-ban fa-lg sm-icon"></i>&nbsp;&nbsp;Withdraw Sent Invites 
        </span>
        <div class="menu-divider-menu"></div>
        <span id="accept-invite-menu-click">
            <i class="fas fa-check-double fa-lg sm-icon"></i>&nbsp;&nbsp;&nbsp;Accept Received Invites 
        </span>
        <div class="menu-divider" style="margin-top: 20px"></div>
        <span>
            &copy; LinkDominator 
        </span>
    </div>
</div>

<span class="float-btn" id="open-nav">
    <!--i class="fas fa-plus my-float"></i-->
    <img src="https://app.linkdominator.com/images/linkdominator-48.png" height="40" class="my-float" onerror="this.src='https://app.linkdominator.com/images/linkdominator-48.png'">
</span>
`;

$('body').append(mainMenu)

// Authorization button click handler - triggers auto-sync
$(document).on('click', '#authorize-linkedin-btn', async function(e) {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('🔐 Authorization button clicked - triggering auto-sync...');
    
    const $btn = $(this);
    const originalHtml = $btn.html();
    $btn.html('<i class="fas fa-spinner fa-spin" style="margin-right: 6px;"></i>Syncing...');
    $btn.prop('disabled', true);
    
    // Get current LinkedIn ID
    const currentLinkedInId = (typeof window.getLinkedInIdForApi === 'function' ? window.getLinkedInIdForApi() : (typeof linkedinId !== 'undefined' ? linkedinId : (window.linkedinId || $('#me-publicIdentifier').val())));
    
    if (!currentLinkedInId) {
        alert('LinkedIn ID not found. Please refresh the page.');
        $btn.html(originalHtml);
        $btn.prop('disabled', false);
        return;
    }
    
    // Try to sync LinkedIn ID
    if (typeof window.syncLinkedInIdWithBackend === 'function') {
        const syncSuccess = await window.syncLinkedInIdWithBackend(currentLinkedInId);
        
        if (syncSuccess) {
            // Wait for sync to complete
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // Re-check authorization
            try {
                const filterApi = typeof PLATFORM_URL !== 'undefined' ? `${PLATFORM_URL}/api` : 'https://app.linkdominator.com/api';
                const retryResponse = await fetch(`${filterApi}/accessCheck`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'lk-id': currentLinkedInId
                    }
                });
                
                if (retryResponse.ok) {
                    const retryData = await retryResponse.json();
                    if (retryData.status !== 401) {
                        console.log('✅✅✅ Authorization successful after manual sync!');
                        // Hide button and enable menus
                        $('#authorize-button-container').hide();
                        $('#menus span').css('opacity', '1').css('pointer-events', 'auto');
                        $('#accessCheck').remove();
                        
                        // Reload extension features
                        if (typeof onMounted === 'function') onMounted();
                        if (typeof getAutoRespondMessages === 'function') getAutoRespondMessages();
                        if (typeof getAIContents === 'function') getAIContents();
                        if (typeof getSNLeadList === 'function') getSNLeadList();
                        if (typeof getCampaigns === 'function') getCampaigns();
                        
                        $btn.html('<i class="fas fa-check" style="margin-right: 6px;"></i>Synced!');
                        setTimeout(() => {
                            $('#authorize-button-container').hide();
                        }, 2000);
                        return;
                    }
                }
            } catch (error) {
                console.error('Error re-checking authorization:', error);
            }
        }
        
        $btn.html('<i class="fas fa-exclamation-triangle" style="margin-right: 6px;"></i>Sync Failed');
        setTimeout(() => {
            $btn.html(originalHtml);
            $btn.prop('disabled', false);
        }, 3000);
    } else {
        alert('Sync function not available. Please refresh the page.');
        $btn.html(originalHtml);
        $btn.prop('disabled', false);
    }
});

// Function to check campaign status
const checkCampaignStatus = () => {
    try {
        // Check if extension context is still valid
        if (chrome.runtime && chrome.runtime.id) {
            chrome.runtime.sendMessage({
                action: 'checkCampaignStatus'
            }, function(response) {
                // Check for extension context errors
                if (chrome.runtime.lastError) {
                    console.log('🔄 Extension context error (likely reloaded):', chrome.runtime.lastError.message);
                    stopStatusChecking(); // Stop monitoring when context is invalid
                    return;
                }
                
                try {
                    if (response && response.status) {
                        const statusIndicator = $('#status-indicator');
                        
                        switch(response.status) {
                            case 'running':
                                statusIndicator.css('color', '#28a745');
                                statusIndicator.attr('title', `Campaign Status: ${response.message || 'Running'}`);
                                startStatusChecking(); // Ensure monitoring is active
                                break;
                            case 'processing':
                                statusIndicator.css('color', '#ffc107');
                                statusIndicator.attr('title', `Campaign Status: ${response.message || 'Processing'}`);
                                startStatusChecking(); // Ensure monitoring is active
                                break;
                            case 'completed':
                                statusIndicator.css('color', '#17a2b8');
                                statusIndicator.attr('title', `Campaign Status: ${response.message || 'Completed'}`);
                                stopStatusChecking(); // Stop monitoring when completed
                                break;
                            case 'inactive':
                                // Check if service worker is ready
                                if (response.message && response.message.includes('Service worker ready')) {
                                    statusIndicator.css('color', '#6c757d'); // Dark gray - ready but no campaigns
                                    statusIndicator.attr('title', 'Campaign Status: Ready - No active campaigns');
                                    stopStatusChecking(); // Stop monitoring when no campaigns
                                } else {
                                    statusIndicator.css('color', '#ccc'); // Light gray - inactive
                                    statusIndicator.attr('title', 'Campaign Status: Inactive');
                                    stopStatusChecking(); // Stop monitoring when inactive
                                }
                                break;
                            default:
                                statusIndicator.css('color', '#ccc');
                                statusIndicator.attr('title', 'Campaign Status: Inactive');
                                stopStatusChecking(); // Stop monitoring for unknown status
                        }
                    } else {
                        // If no response, service worker might be inactive
                        const statusIndicator = $('#status-indicator');
                        statusIndicator.css('color', '#dc3545'); // Red
                        statusIndicator.attr('title', 'Campaign Status: Service Worker Inactive - Please refresh extension');
                        stopStatusChecking(); // Stop monitoring when service worker is inactive
                    }
                } catch (error) {
                    console.error('Error processing campaign status response:', error);
                    const statusIndicator = $('#status-indicator');
                    statusIndicator.css('color', '#dc3545'); // Red
                    statusIndicator.attr('title', 'Campaign Status: Error processing response');
                }
            });
        }
        
        // Also check service worker status
        if (chrome.runtime && chrome.runtime.id) {
            chrome.runtime.sendMessage({
                action: 'checkServiceWorkerStatus'
            }, function(response) {
                // Check for extension context errors
                if (chrome.runtime.lastError) {
                    console.log('🔄 Extension context error (likely reloaded):', chrome.runtime.lastError.message);
                    stopStatusChecking(); // Stop monitoring when context is invalid
                    return;
                }
                
                try {
                    if (response && !response.active) {
                        const statusIndicator = $('#status-indicator');
                        statusIndicator.css('color', '#dc3545'); // Red
                        statusIndicator.attr('title', 'Campaign Status: Service Worker Inactive - Please refresh extension');
                        stopStatusChecking(); // Stop monitoring when service worker is inactive
                    }
                } catch (error) {
                    console.error('Error processing service worker status response:', error);
                }
            });
        }
    } catch (error) {
        console.error('Error in checkCampaignStatus:', error);
        // If we get here, the extension context is definitely invalid
        stopStatusChecking();
    }
};

// Variable to track if campaigns are running
let campaignsRunning = false;
let statusCheckInterval = null;

// Function to start status checking
const startStatusChecking = () => {
    if (!statusCheckInterval) {
        console.log('🔄 Starting campaign status monitoring...');
        statusCheckInterval = setInterval(checkCampaignStatus, 30000);
        campaignsRunning = true;
    }
};

// Function to stop status checking
const stopStatusChecking = () => {
    if (statusCheckInterval) {
        console.log('⏸️ Stopping campaign status monitoring...');
        clearInterval(statusCheckInterval);
        statusCheckInterval = null;
        campaignsRunning = false;
    }
};

// Initial status check
checkCampaignStatus();

// Cleanup function to clear interval when extension is unloaded
window.addEventListener('beforeunload', function() {
    stopStatusChecking();
});

// Add manual restart function for service worker
const restartServiceWorker = () => {
    console.log('🔄 Manually restarting service worker...');
    chrome.runtime.reload();
};

// Add click handler for manual restart (optional)
$('#campaign-menu-click').on('dblclick', function() {
    restartServiceWorker();
});

// Listen for campaign status updates from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'updateCampaignStatus') {
        const statusIndicator = $('#status-indicator');
        
        switch(request.status) {
            case 'running':
                statusIndicator.css('color', '#28a745'); // Green
                statusIndicator.attr('title', `Campaign Status: ${request.message || 'Running'}`);
                startStatusChecking(); // Start monitoring when campaigns are running
                break;
            case 'processing':
                statusIndicator.css('color', '#ffc107'); // Yellow
                statusIndicator.attr('title', `Campaign Status: ${request.message || 'Processing'}`);
                startStatusChecking(); // Start monitoring when campaigns are processing
                break;
            case 'completed':
                statusIndicator.css('color', '#17a2b8'); // Blue
                statusIndicator.attr('title', `Campaign Status: ${request.message || 'Completed'}`);
                stopStatusChecking(); // Stop monitoring when campaigns are completed
                break;
            case 'inactive':
                // Check if service worker is ready
                if (request.message && request.message.includes('Service worker ready')) {
                    statusIndicator.css('color', '#6c757d'); // Dark gray - ready but no campaigns
                    statusIndicator.attr('title', 'Campaign Status: Ready - No active campaigns');
                    stopStatusChecking(); // Stop monitoring when no campaigns are running
                } else {
                    statusIndicator.css('color', '#ccc'); // Light gray - inactive
                    statusIndicator.attr('title', 'Campaign Status: Inactive');
                    stopStatusChecking(); // Stop monitoring when inactive
                }
                break;
            case 'error':
                statusIndicator.css('color', '#dc3545'); // Red
                statusIndicator.attr('title', `Campaign Status: ${request.message || 'Error'}`);
                stopStatusChecking(); // Stop monitoring on error
                break;
            default:
                statusIndicator.css('color', '#ccc'); // Gray
                statusIndicator.attr('title', 'Campaign Status: Inactive');
                stopStatusChecking(); // Stop monitoring for unknown status
        }
    }
});
getUserProfile();

$('#open-nav').click(function(){
    let sidePanel = $('#mySidepanel')

    if(sidePanel.is(':hidden')) {
        sidePanel.show().fadeIn('slow')
    }else {
        sidePanel.hide().fadeOut('slow')
    }
})

$('#close-nav').click(function() {
    $('#mySidepanel').hide().fadeOut('slow')
})

const getAudienceList = async (fieldId) => {
    console.log('🔍 getAudienceList called for field:', fieldId);
    
    // Show loading state
    $(`#${fieldId}`).empty().append('<option value="">🔄 Loading audiences...</option>');

    try {
        const response = await fetchAudiencesFromAPI();
        console.log('✅ Raw API Response:', response);
        
        let audienceArr = [];
        
        // Handle the response structure from successResponse method
        if (response && response.success && response.data && response.data.audience) {
            audienceArr = response.data.audience;
            console.log('📊 Found audiences in response.data.audience:', audienceArr.length);
        }
        // Handle enhanced apiRequest response format
        else if (response && response.data && response.data.audience) {
            audienceArr = response.data.audience;
            console.log('📊 Found audiences in response.data.audience (enhanced):', audienceArr.length);
        }
        // Fallback: check for direct audience array (old format)
        else if (Array.isArray(response)) {
            if (response.length > 0 && Array.isArray(response[0].audience)) {
                audienceArr = response[0].audience;
                console.log('📊 Found audiences in response[0].audience:', audienceArr.length);
            }
        } else if (Array.isArray(response.audience)) {
            audienceArr = response.audience;
            console.log('📊 Found audiences in response.audience:', audienceArr.length);
        }
        
        console.log('📋 Final audience array:', audienceArr);
        
        // Clear loading and populate dropdown
        $(`#${fieldId}`).empty();
        
        if (audienceArr.length > 0) {
            // Add default option
            $('<option/>', {
                value: '',
                html: 'Select an audience'
            }).appendTo(`#${fieldId}`);
            
            // Add audience options
            for (let i = 0; i < audienceArr.length; i++) {
                $('<option/>', {
                    value: audienceArr[i].audience_id,
                    html: `${audienceArr[i].audience_name} (${audienceArr[i].total || 0} leads)`
                }).appendTo(`#${fieldId}`);
                console.log(`✅ Added audience: ${audienceArr[i].audience_name} (ID: ${audienceArr[i].audience_id})`);
            }
            console.log(`🎉 Successfully populated ${audienceArr.length} audiences in dropdown`);
        } else {
            $('<option/>', {
                value: '',
                html: 'No audiences found - create one first'
            }).appendTo(`#${fieldId}`);
            console.log('ℹ️ No audiences found for this user');
        }
        
        return audienceArr;
        
    } catch (error) {
        console.error('❌ Error fetching audiences:', error);
        
        // Clear loading and show error
        $(`#${fieldId}`).empty();
        $('<option/>', {
            value: '',
            html: '❌ Error loading audiences - check console'
        }).appendTo(`#${fieldId}`);
        
        // Detailed error logging
        if (error.status) {
            console.error(`🔍 HTTP Error ${error.status}: ${error.statusText}`);
            if (error.responseJSON) {
                console.error('🔍 Error details:', error.responseJSON);
            }
        } else {
            console.error('🔍 Network or timeout error:', error.message);
        }
        
        // Provide helpful troubleshooting info
        console.log('🔧 Troubleshooting:');
        console.log('   1. Check if backend server is running');
        console.log('   2. Verify API endpoint works in browser');
        console.log('   3. Check browser network tab for detailed error');
        console.log('   4. Try refreshing the page');
        
        throw error;
    }
}

const implementPermission = (actionId) => {
    // Show/hide authorization button based on access check
    const accessCheckValue = $('#accessCheck').val();
    if (accessCheckValue == 401) {
        // Show authorization button
        $('#authorize-button-container').show();
        // Disable menu items
        $('#menus span').css('opacity', '0.5').css('pointer-events', 'none');
    } else {
        // Hide authorization button
        $('#authorize-button-container').hide();
        // Enable menu items
        $('#menus span').css('opacity', '1').css('pointer-events', 'auto');
    }
    
    if ($('#accessCheck').val() == 401){
        $('.modal-body').html(`
            <div style="text-align: center; padding: 20px;">
                <h5><strong>UNAUTHORIZED</strong></h5>
                <p style="margin: 15px 0; color: #666;">Please connect your LinkedIn account to use this feature.</p>
                <button id="authorize-from-modal" style="padding: 10px 20px; background: #0077b5; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; margin-top: 10px;">
                    <i class="fab fa-linkedin" style="margin-right: 6px;"></i>Connect LinkedIn Account
                </button>
            </div>
        `);
        $(`.${actionId}`).hide();
        
        // Add click handler for modal button
        $(document).off('click', '#authorize-from-modal').on('click', '#authorize-from-modal', function() {
            const platformUrl = typeof PLATFORM_URL !== 'undefined' ? PLATFORM_URL : 'https://app.linkdominator.com';
            window.open(`${platformUrl}/social-account`, '_blank');
        });
    }
}
