
var messageFollowupForm = `
<div class="modal" id="messageFollowupForm">
    <div class="modal-dialog modal-dialog-scrollable">
        <div class="modal-content">
            <div class="modal-header modal-header-bg">
                <h5 class="modal-title">Follow Up Connections</h5>
                <button type="button" class="close" data-dismiss="modal">&times;</button>
            </div>
            <div class="modal-body">
                <div class="row">
                    <div class="col-md-12">
                        <ul class="nav nav-tabs" id="followUpTabs">
                            <li class="nav-item">
                                <a class="nav-link active" id="new-campaign-tab" data-toggle="tab" href="#new-campaign">New Campaign</a>
                            </li>
                            <li class="nav-item">
                                <a class="nav-link" id="campaign-results-tab" data-toggle="tab" href="#campaign-results">Campaign Results</a>
                            </li>
                        </ul>
                    </div>
                </div>
                
                <div class="tab-content" id="followUpTabContent">
                    <div class="tab-pane fade show active" id="new-campaign" role="tabpanel">
                        <div class="row message-followup-notice" style="display: none; margin-top: 15px;">
                            <div class="col-md-12">
                                <div class="card card-body" style="background: #F3F6F8;">
                                    <ul id="displayMessageFollowUpStatus" style="list-style: none"></ul>
                                </div>
                            </div>
                        </div>
                <div class="form-group">
                    <label for="mfu-selectAudience" class="font-weight-bold c-header">Select an audience</label>
                    <select class="form-control shadow-none select-dropdown" style="height: 35px;" id="mfu-selectAudience">
                        <option value="">Select an audience</option>
                    </select>
                </div>
                <div class="form-group"> 
                    <label for="mfu-personalMessage" class="font-weight-bold c-header">Message</label>
                    <div class="row mt-2">
                        <div class="col-md-12">
                            <label for="mfu-aicontent" class="font-weight-bold c-header">Select content template</label>
                            <select class="form-control shadow-none select-dropdown" id="mfu-aicontent" style="height: 35px;">
                                <option value="">Select content</option>
                            </select>
                        </div>
                    </div>
                    <div class="row mt-2" style="display: inline-block">
                        <div class="col-md-12">
                            <div class="juez-tooltip">
                                <button type="button" class="btn btn-outline-primary btn-lg mfu-pm-btn" data-name="@firstName">@firstName</button>
                                <span class="juez-tooltiptext">Short-code for first name of the user.</span>
                            </div>
                            <div class="juez-tooltip">
                                <button type="button" class="btn btn-outline-primary btn-lg mfu-pm-btn" data-name="@lastName">@lastName</button>
                                <span class="juez-tooltiptext">Short-code for last name of the user.</span>
                            </div>
                            <div class="juez-tooltip">
                                <button type="button" class="btn btn-outline-primary btn-lg mfu-pm-btn" data-name="@name">@name</button>
                                <span class="juez-tooltiptext">Short-code for full name of the user.</span>
                            </div>
                        </div>
                    </div> 
                    <div class="row mt-2">
                        <div class="col-md-12">
                            <div class="form-group mb-0">
                                <textarea class="form-control shadow-none text-area-size" rows="6" data-name="Message" id="mfu-personalMessage" 
                                    placeholder="Ex: Hello @firstName, did you get my previous message."
                                ></textarea>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row mt-2">
                    <div class="col-lg-4 col-sm-4">
                        <div class="form-group">
                            <label for="mfu-total" style="color:black;font-weight:bold;">Total 
                                <div class="juez-tooltip">
                                    <i class="fa fa-exclamation-circle"></i>
                                    <span class="juez-tooltiptext">Total number of connection to send your message.</span>
                                </div>
                            </label>
                            <input type="number" class="form-control shadow-none" id="mfu-total" placeholder="Ex: 10">
                        </div>
                    </div>
                    <div class="col-lg-4 col-sm-4">
                        <div class="form-group">
                            <label for="mfu-delayTime" style="color:black;font-weight:bold;">Delay 
                                <div class="juez-tooltip">
                                    <i class="fa fa-exclamation-circle"></i>
                                    <span class="juez-tooltiptext">Delay between each message in seconds.</span>
                                </div>
                            </label>
                            <input type="number" class="form-control shadow-none" id="mfu-delayTime" placeholder="Ex: 30">
                        </div>
                    </div>
                    <div class="col-lg-4 col-sm-4">
                        <div class="form-group">
                            <label for="mfu-waitDays" style="color:black;font-weight:bold;">Wait x days 
                                <div class="juez-tooltip">
                                    <i class="fa fa-exclamation-circle"></i>
                                    <span class="juez-tooltiptext">Wait in days before sending follow up.</span>
                                </div>
                            </label>
                            <input type="number" class="form-control shadow-none" id="mfu-waitDays" placeholder="Ex: 0">
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-12">
                        <span id="mfu-error-notice" style="color:red"></span>
                    </div>
                </div>
                <div class="mb-2">
                    <input type="checkbox" class="shadow-none" id="mfu-viewProfile">
                    <label class="custom-control-label" for="mfu-viewProfile" style="color:black;font-weight:bold;">View profile
                        <div class="juez-tooltip">
                            <i class="fa fa-exclamation-circle"></i>
                            <span class="juez-tooltiptext">Check this if you want to send profile view notification.</span>
                        </div>
                    </label>
                </div>
                
                <div class="row">
                    <div class="col-md-4">
                        <div class="form-group">
                            <label for="mfu-image" class="font-weight-bold c-header inline-block file-upload-label">
                                <input type="file"
                                id="mfu-image"
                                class="form-control-file file-upload-input"
                                accept="image/jpeg, image/png">
                                <i class="fas fa-lg fa-camera upload-icon"></i>
                                Attach an image
                            </label>
                        </div>
                    </div>
                </div>
                <ul class="list-group" id="lkm-mfu-image-uploads"></ul>
                <div class="row">
                    <div class="col-md-4">
                        <div class="form-group">
                            <label for="mfu-file" class="font-weight-bold c-header inline-block file-upload-label">
                                <input type="file" 
                                id="mfu-file" 
                                class="form-control-file file-upload-input"
                                accept=".ai,.pdf,.doc,.docx,.csv,.ppt,.pptx,.pps,.ppsx,.odt,.rtf,.xls,.xlsx,.txt">
                                <i class="fas fa-lg fa-file upload-icon"></i>
                                Attach a file
                            </label>
                        </div>
                    </div>
                </div>
                <ul class="list-group" id="lkm-mfu-file-uploads"></ul>
                    </div>
                    
                    <div class="tab-pane fade" id="campaign-results" role="tabpanel">
                        <div style="margin-top: 15px;">
                            <div class="d-flex justify-content-between align-items-center mb-3">
                                <h6 class="mb-0">Recent Campaign Results</h6>
                                <div>
                                    <button type="button" class="btn btn-sm btn-outline-primary" id="refreshCampaignResults">
                                        <i class="fas fa-sync-alt"></i> Refresh
                                    </button>
                                    <button type="button" class="btn btn-sm btn-outline-info ml-2" id="testNotification">
                                        <i class="fas fa-bell"></i> Test Notification
                                    </button>
                                    <button type="button" class="btn btn-sm btn-outline-danger ml-2" id="clearAllCampaignResults">
                                        <i class="fas fa-trash"></i> Clear All
                                    </button>
                                </div>
                            </div>
                            
                            <div id="campaignResultsContainer">
                                <div class="text-center py-4">
                                    <i class="fas fa-spinner fa-spin"></i> Loading campaign results...
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
            <div class="modal-footer">
                <div id="campaign-action-buttons">
                    <button type="button" class="btn btn-primary btn-lg shadow-none addFollowUppAction">Add</button>
                    <button type="button" class="btn btn-outline-primary btn-lg shadow-none startFollowUpAction">Start</button>
                </div>
                <button type="button" class="btn btn-outline-secondary btn-lg shadow-none" data-dismiss="modal">Close</button>
            </div>

        </div>
    </div>
</div>
`;

$('body').append(messageFollowupForm)

// Load campaign results when tab is clicked
$('#campaign-results-tab').on('click', function() {
    loadCampaignResults();
    // Hide action buttons when on Campaign Results tab
    $('#campaign-action-buttons').hide();
});

// Show action buttons when on New Campaign tab
$('#new-campaign-tab').on('click', function() {
    $('#campaign-action-buttons').show();
});

// Refresh button functionality
$('#refreshCampaignResults').on('click', function() {
    loadCampaignResults();
});

// Test notification functionality
$('#testNotification').on('click', function() {
    console.log('🔔 Testing desktop notification...');
    
    // Send message to background script to create test notification
    chrome.runtime.sendMessage({
        action: 'testNotification',
        data: {
            title: 'LinkDominator Test',
            message: 'This is a test notification to check if notifications are working properly.'
        }
    }, function(response) {
        if (chrome.runtime.lastError) {
            console.error('❌ Test notification request failed:', chrome.runtime.lastError);
            alert('Failed to send test notification request. Check console for details.');
        } else {
            console.log('✅ Test notification request sent:', response);
        }
    });
});

// Clear all campaigns functionality
$('#clearAllCampaignResults').on('click', function() {
    if (confirm('Are you sure you want to delete all campaign results? This action cannot be undone.')) {
        chrome.storage.local.set({ followupCampaignResults: [] }).then(() => {
            console.log('🗑️ All campaign results cleared');
            loadCampaignResults();
        });
    }
});

// Delete individual campaign functionality
$(document).on('click', '.delete-campaign', function() {
    const index = $(this).data('campaign-index');
    
    if (confirm('Are you sure you want to delete this campaign result? This action cannot be undone.')) {
        chrome.storage.local.get(['followupCampaignResults']).then((result) => {
            let campaigns = result.followupCampaignResults || [];
            campaigns.splice(index, 1); // Remove the campaign at the specified index
            
            chrome.storage.local.set({ followupCampaignResults: campaigns }).then(() => {
                console.log('🗑️ Campaign result deleted');
                loadCampaignResults();
            });
        });
    }
});

// Function to load campaign results from storage
const loadCampaignResults = () => {
    $('#campaignResultsContainer').html(`
        <div class="text-center py-4">
            <i class="fas fa-spinner fa-spin"></i> Loading campaign results...
        </div>
    `);
    
    chrome.storage.local.get(['followupCampaignResults']).then((result) => {
        const campaigns = result.followupCampaignResults || [];
        
        if (campaigns.length === 0) {
            $('#campaignResultsContainer').html(`
                <div class="text-center py-4">
                    <i class="fas fa-info-circle text-muted"></i>
                    <p class="text-muted mt-2">No campaign results found.<br>Run a scheduled campaign to see results here.</p>
                </div>
            `);
            return;
        }
        
        let html = '';
        campaigns.forEach((campaign, index) => {
            const successRate = campaign.summary?.successRate || '0%';
            const successful = campaign.summary?.successful || 0;
            const failed = campaign.summary?.failed || 0;
            const total = campaign.summary?.totalProcessed || 0;
            
            // Determine status color
            let statusColor = 'success';
            if (failed > 0 && successful === 0) statusColor = 'danger';
            else if (failed > 0) statusColor = 'warning';
            
            html += `
                <div class="card mb-3">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <h6 class="mb-0">
                            <i class="fas fa-comments"></i> 
                            Campaign ${campaign.campaignId.split('_')[1]}
                        </h6>
                        <small class="text-muted">${campaign.startTime}</small>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-8">
                                <div class="d-flex align-items-center mb-2">
                                    <span class="badge badge-${statusColor} mr-2">${successRate}</span>
                                    <span class="text-muted">
                                        ${successful} sent, ${failed} failed (${total} total)
                                    </span>
                                </div>
                                <small class="text-muted">
                                    Duration: ${campaign.startTime} - ${campaign.endTime}
                                </small>
                            </div>
                            <div class="col-md-4 text-right">
                                <button class="btn btn-sm btn-outline-info toggle-campaign-details" data-campaign-index="${index}">
                                    <i class="fas fa-eye"></i> Details
                                </button>
                                <button class="btn btn-sm btn-outline-danger ml-1 delete-campaign" data-campaign-index="${index}" title="Delete this campaign">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                        
                        <div id="campaign-details-${index}" style="display: none;" class="mt-3">
                            <hr>
                            <h6>Results by Contact:</h6>
                            <div style="max-height: 200px; overflow-y: auto;">
            `;
            
            campaign.results?.forEach(result => {
                const icon = result.status === 'success' ? 
                    '<i class="fas fa-check-circle text-success"></i>' : 
                    '<i class="fas fa-times-circle text-danger"></i>';
                
                html += `
                    <div class="d-flex justify-content-between align-items-center py-1">
                        <span>${icon} ${result.name}</span>
                        <small class="text-muted">
                            ${result.status === 'success' ? 'Sent' : result.error || 'Failed'}
                        </small>
                    </div>
                `;
            });
            
            if (campaign.errors && campaign.errors.length > 0) {
                html += `
                    <div class="mt-2">
                        <h6 class="text-danger">Common Issues:</h6>
                        ${campaign.errors.slice(0, 3).map(error => 
                            `<small class="text-danger d-block">• ${error}</small>`
                        ).join('')}
                        ${campaign.errors.length > 3 ? `<small class="text-muted">... and ${campaign.errors.length - 3} more</small>` : ''}
                    </div>
                `;
            }
            
            html += `
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        $('#campaignResultsContainer').html(html);
    });
};

// Event handler for toggle campaign details buttons
$(document).on('click', '.toggle-campaign-details', function() {
    const index = $(this).data('campaign-index');
    const detailsElement = $(`#campaign-details-${index}`);
    const isVisible = detailsElement.is(':visible');
    const button = $(this);
    
    if (isVisible) {
        detailsElement.slideUp();
        button.html('<i class="fas fa-eye"></i> Details');
    } else {
        detailsElement.slideDown();
        button.html('<i class="fas fa-eye-slash"></i> Hide Details');
    }
});
$('body').on('click','#message-followup-menu-click',function() {
    implementPermission('addFollowUppAction')
    getAudienceList('mfu-selectAudience')

    // append AI content to dropdown
    helper.setAIContentToDropdown('mfu-aicontent')

    // Mount file list if exists
    setFilesUploadedToList('lkm-mfu')

    // setParamsToFormFields
    setParamsToFormFields('lkm-mfu', {
        delay: '#mfu-delayTime',
        total: '#mfu-total',
        waitdays: '#mfu-waitDays',
    }),

    $('#messageFollowupForm').modal({backdrop:'static', keyboard:false, show:true})
})

$('body').on('click','.mfu-pm-btn',function(){
    let msgField = $('#mfu-personalMessage')
    let cursorPos = msgField.prop("selectionStart")
    let textBefore = msgField.val().substring(0,  cursorPos)
    let textAfter  = msgField.val().substring(cursorPos, msgField.val().length)

    msgField.val(textBefore + $(this).data('name') + textAfter)
})

$('#mfu-aicontent').change(function(){
    if($(this).val()) {
        let content = $(this).val() 
        $('#mfu-personalMessage').val(content)
    } 
})

/**
 * Handle file uploads
 */
let mfuNoticeClass = '.message-connects-notice',
    mfuNoticeStatus = '#displayMessageConnectsStatus'

$('body').on('change','#mfu-image', async function(ev) {
    let fileData = $("#mfu-image")[0].files[0];

    try {
        let file = await helper.handleFileUpload(ev, '#mfu-image', 'image')
        let fileInfo = {
            name: file[0].name,
            size: file[0].size,
            type: file[0].type,
            fileData: fileData,
            blobURL: URL.createObjectURL(fileData),
            module: 'lkm-mfu'
        }
        // upload file
        uploadFile(fileInfo, mfuNoticeClass, mfuNoticeStatus)
    } catch (error) {
        $(mfuNoticeClass).show()
        $(mfuNoticeStatus).html(error)
    }    
});

$('body').on('change','#mfu-file', async function(ev) {
    let fileData = $("#mfu-file")[0].files[0];

    try {
        let file = await helper.handleFileUpload(ev, '#mfu-file', 'file')
        let fileInfo = {
            name: file[0].name,
            size: file[0].size,
            type: file[0].type,
            fileData: fileData,
            blobURL: URL.createObjectURL(fileData),
            module: 'lkm-mfu'
        }
        // upload file
        uploadFile(fileInfo, mfuNoticeClass, mfuNoticeStatus)        
    } catch (error) {
        $(mfuNoticeClass).show()
        $(mfuNoticeStatus).html(error)
    }    
});

$('body').on('click','.lkm-mfu-remove-upload',function() {
    let index = $(this).data('index')
    let lkmModule = $(this).data('module')

    removeFile(lkmModule, index)
    setFilesUploadedToList('lkm-mfu')
})