var campaignList = `
<div class="modal" id="campaignList">
    <div class="modal-dialog modal-lg modal-dialog-scrollable">
        <div class="modal-content">
            <div class="modal-header modal-header-bg">
                <h5 class="modal-title">Campaigns</h5>
                <button type="button" class="close" data-dismiss="modal">&times;</button>
            </div>
            <div class="modal-body" style="padding: 20px;">
                <div class="row campaign-notice-elem" style="display: none;">
                    <div class="col-md-12">
                        <div class="card card-body" style="background: #F3F6F8;">
                            <ul id="campaign-notice" style="list-style: none"></ul>
                        </div>
                    </div>
                </div>
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h6 class="mb-0" style="color: #333; font-weight: 600;">
                        <i class="fas fa-bullhorn me-2" style="color: #f97316;"></i>
                        Your Campaigns
                    </h6>
                </div>
                <div class="table-responsive" style="border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(249, 115, 22, 0.08);">
                    <table class="table table-hover mb-0" id="modern-campaign-table">
                        <thead style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);">
                            <tr>
                                <th style="padding: 16px; font-weight: 600; color: #fff; border-bottom: 2px solid rgba(255,255,255,0.2);">
                                    <i class="fas fa-tag me-2"></i>Campaign Name
                                </th>
                                <th style="padding: 16px; font-weight: 600; color: #fff; border-bottom: 2px solid rgba(255,255,255,0.2);">
                                    <i class="fas fa-list-ol me-2"></i>Sequence Type
                                </th>
                                <th style="padding: 16px; font-weight: 600; color: #fff; border-bottom: 2px solid rgba(255,255,255,0.2); text-align: center;">
                                    <i class="fas fa-info-circle me-2"></i>Status
                                </th>
                                <th style="padding: 16px; font-weight: 600; color: #fff; border-bottom: 2px solid rgba(255,255,255,0.2); text-align: center;">
                                    <i class="fas fa-power-off me-2"></i>Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody id="campaign-tbody" style="background: #fff;"></tbody>
                    </table>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-outline-secondary btn-lg shadow-none" data-dismiss="modal">Close</button>
            </div>
        </div>
    </div>
</div>
`
$('body').append(campaignList)

// Add custom styles for modern campaign table
const campaignTableStyles = `
<style>
/* Modern Campaign Table Styles */
#modern-campaign-table tbody tr {
    transition: all 0.3s ease;
}

#modern-campaign-table tbody tr:hover {
    background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 119, 181, 0.08);
}

#modern-campaign-table .form-check-input:checked {
    background-color: #28a745 !important;
    border-color: #28a745 !important;
    background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='-4 -4 8 8'%3e%3ccircle r='3' fill='%23fff'/%3e%3c/svg%3e") !important;
}

#modern-campaign-table .form-check-input:not(:checked) {
    background-color: #6c757d !important;
    border-color: #6c757d !important;
    background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='-4 -4 8 8'%3e%3ccircle r='3' fill='%23fff'/%3e%3c/svg%3e") !important;
}

#modern-campaign-table .form-check-input:focus {
    border-color: #0077b5;
    outline: 0;
    box-shadow: 0 0 0 0.2rem rgba(0, 119, 181, 0.25);
}

#modern-campaign-table .form-check-input {
    transition: all 0.3s ease;
    cursor: pointer;
}

#modern-campaign-table .form-check-input:hover {
    transform: scale(1.05);
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
}

/* Pulse animation for loading */
@keyframes pulse {
    0%, 100% {
        transform: scale(1);
        opacity: 1;
    }
    50% {
        transform: scale(1.05);
        opacity: 0.8;
    }
}

/* Responsive adjustments */
@media (max-width: 768px) {
    #modern-campaign-table tbody td {
        padding: 12px 8px !important;
    }
    
    #modern-campaign-table .form-check-label {
        font-size: 12px;
    }
}
</style>
`;

if (!$('#campaign-table-styles').length) {
    $('head').append(campaignTableStyles.replace('<style>', '<style id="campaign-table-styles">'));
}

// Load campaigns when modal is shown
$('#campaignList').on('shown.bs.modal', function() {
    console.log('📋 Campaign modal shown, loading campaigns...');
    loadCampaigns();
});

function loadCampaigns() {
    // Show loading state
    $('#campaign-tbody').html(`
        <tr>
            <td colspan="4" class="text-center" style="padding: 60px 20px;">
                <div style="text-align: center;">
                    <div style="width: 60px; height: 60px; background: linear-gradient(135deg, rgba(249, 115, 22, 0.1) 0%, rgba(234, 88, 12, 0.1) 100%); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px; animation: pulse 2s infinite;">
                        <i class="fas fa-spinner fa-spin" style="font-size: 24px; color: #f97316;"></i>
                    </div>
                    <h6 style="color: #333; font-weight: 600; margin-bottom: 4px;">Loading campaigns...</h6>
                    <p style="color: #6c757d; font-size: 14px; margin: 0;">Please wait</p>
                </div>
            </td>
        </tr>
    `);
    
    // Load campaigns
    if (typeof getCampaigns === 'function') {
        console.log('✅ Calling getCampaigns()');
        getCampaigns();
    } else {
        console.error('❌ getCampaigns function not found!');
        $('#campaign-tbody').html(`
            <tr>
                <td colspan="4" class="text-center" style="padding: 40px 20px;">
                    <div style="text-align: center;">
                        <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
                            <i class="fas fa-exclamation-triangle" style="font-size: 24px; color: #856404;"></i>
                        </div>
                        <h6 style="color: #dc3545; font-weight: 600; margin-bottom: 8px;">Error Loading Campaigns</h6>
                        <p style="color: #6c757d; margin-bottom: 16px; font-size: 14px;">getCampaigns function not available. Please refresh the page.</p>
                    </div>
                </td>
            </tr>
        `);
    }
}

$('body').on('click', '#campaign-menu-click', function(){
    console.log('🔍 Campaign menu clicked');
    
    // Check auth first - show authorization card if not authenticated
    if (typeof window.checkAuthAndShowCard === 'function') {
        window.checkAuthAndShowCard();
    }
    
    if ($('#accessCheck').val() == 401) {
        // Show authorization card in sidebar
        if (typeof window.checkAuthAndShowCard === 'function') {
            window.checkAuthAndShowCard();
        }
        $('.modal-body').html('<h5><center><strong> UNAUTHORISED </strong></center></h5>')
        return; // Don't open modal if not authenticated
    }
    
    if (typeof window.closeAllModals === 'function') {
        window.closeAllModals();
    }
    
    // Small delay to ensure previous modal closes before opening new one
    setTimeout(function() {
    // Open modal (campaigns will load via shown.bs.modal event)
    $('#campaignList').modal({backdrop:'static', keyboard:false, show:true});
    }, 300);
})

$('body').on('change','.runSwitch',function(ev){
    let campaignId = $(this).data('campaignid')
    let status;
    if(ev.target.checked){
        status = 'running'
    }else{
        status = 'stop'
    }
    
    // Update campaign status in backend
    updateCampaign({
        campaignId: campaignId,
        status: status
    }).then(() => {
        // If starting the campaign, notify the service worker
        if(ev.target.checked){
            console.log('🚀 Notifying service worker to start campaign:', campaignId);
            
            // Send message to background script to start the campaign
            chrome.runtime.sendMessage({
                action: 'startCampaign',
                campaignId: campaignId
            }, function(response) {
                if (chrome.runtime.lastError) {
                    // Handle "Extension context invalidated" error gracefully
                    if (chrome.runtime.lastError.message && chrome.runtime.lastError.message.includes('Extension context invalidated')) {
                        console.log('🔄 Extension was reloaded during campaign start, this is normal behavior');
                        return;
                    }
                    console.error('❌ Error starting campaign:', chrome.runtime.lastError);
                } else {
                    console.log('✅ Campaign started successfully:', response);
                }
            });
        } else {
            // If stopping the campaign, notify the service worker
            console.log('⏹️ Notifying service worker to stop campaign:', campaignId);
            
            // Send message to background script to stop the campaign
            chrome.runtime.sendMessage({
                action: 'stopCampaign',
                campaignId: campaignId
            }, function(response) {
                if (chrome.runtime.lastError) {
                    // Handle "Extension context invalidated" error gracefully
                    if (chrome.runtime.lastError.message && chrome.runtime.lastError.message.includes('Extension context invalidated')) {
                        console.log('🔄 Extension was reloaded during campaign stop, this is normal behavior');
                        return;
                    }
                    console.error('❌ Error stopping campaign:', chrome.runtime.lastError);
                } else {
                    console.log('✅ Campaign stopped successfully:', response);
                }
            });
        }
    }).catch(error => {
        console.error('❌ Error updating campaign:', error);
        
        // Handle "Extension context invalidated" error gracefully
        if (error.message && error.message.includes('Extension context invalidated')) {
            console.log('🔄 Extension was reloaded, this is normal behavior');
            // Don't revert the checkbox for this specific error
            return;
        }
        
        // Revert the checkbox if update failed for other reasons
        ev.target.checked = !ev.target.checked;
    });
})