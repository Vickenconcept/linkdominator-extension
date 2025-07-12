
var messageFollowupForm = `
<div class="modal" id="messageFollowupForm">
    <div class="modal-dialog modal-dialog-scrollable">
        <div class="modal-content">
            <div class="modal-header modal-header-bg">
                <h5 class="modal-title">Follow Up Connections</h5>
                <button type="button" class="close" data-dismiss="modal">&times;</button>
            </div>
            <div class="modal-body">
                <div class="row message-followup-notice" style="display: none;">
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
            <div class="modal-footer">
                <button type="button" class="btn btn-primary btn-lg shadow-none addFollowUppAction">Add</button>
                <button type="button" class="btn btn-outline-primary btn-lg shadow-none startFollowUpAction">Start</button>
                <button type="button" class="btn btn-outline-secondary btn-lg shadow-none" data-dismiss="modal">Close</button>
            </div>

        </div>
    </div>
</div>
`;

$('body').append(messageFollowupForm)
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