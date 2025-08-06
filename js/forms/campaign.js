var campaignList = `
<div class="modal" id="campaignList">
    <div class="modal-dialog modal-lg modal-dialog-scrollable">
        <div class="modal-content">
            <div class="modal-header modal-header-bg">
                <h5 class="modal-title">Campaigns</h5>
                <button type="button" class="close" data-dismiss="modal">&times;</button>
            </div>
            <div class="modal-body">
                <div class="row campaign-notice-elem" style="display: none;">
                    <div class="col-md-12">
                        <div class="card card-body" style="background: #F3F6F8;">
                            <ul id="campaign-notice" style="list-style: none"></ul>
                        </div>
                    </div>
                </div>
                <div class="row"> 
                    <div class="col-12">
                        <div class="table-responsive tbl-fixed">
                            <table class="table campaign-table">
                                <thead>
                                    <tr>
                                        <th scope="col" class="th-fixed">Name</th>
                                        <th scope="col" class="th-fixed">Sequence Type</th>
                                        <th scope="col" class="th-fixed">Status</th>
                                        <th scope="col" class="th-fixed"></th>
                                    </tr>
                                </thead>
                                <tbody id="campaign-tbody"></tbody>
                            </table>
                        </div>
                    </div>
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
$('body').on('click', '#campaign-menu-click', function(){
    if ($('#accessCheck').val() == 401) {
        $('.modal-body').html('<h5><center><strong> UNAUTHORISED </strong></center></h5>')
    }
    $('#campaignList').modal({backdrop:'static', keyboard:false, show:true})
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