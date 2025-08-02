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
<div id="mySidepanel" class="sidepanel" style="width:285px;display:none;">
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
        <span id="auto-respond-menu-click">
            <i class="fas fa-reply fa-lg sm-icon"></i>&nbsp;&nbsp;Auto Respond Messages 
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
    if ($('#accessCheck').val() == 401){
        $('.modal-body').html('<h5><center><strong> UNAUTHORISED </strong></center></h5>')
        $(`.${actionId}`).hide()
    }
}
