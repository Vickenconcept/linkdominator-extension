var messageAllConnectForm = `
<div class="modal" id="messageAllConnectForm">
    <div class="modal-dialog modal-lg modal-dialog-scrollable">
        <div class="modal-content">
            <div class="modal-header modal-header-bg">
                <h5 class="modal-title">Message All Connections</h5>
                <button type="button" class="close" data-dismiss="modal">&times;</button>
            </div>
            <div class="modal-body">
                <div class="row message-connects-notice" style="display: none;">
                    <div class="col-md-12">
                        <div class="card card-body" style="background: #F3F6F8;">
                            <ul id="displayMessageConnectsStatus" style="list-style: none"></ul>
                        </div>
                    </div>
                </div>
                <div class="form-group">
                    <label for="mac-selectAudience" class="font-weight-bold c-header">Select an audience</label>
                    <select class="form-control shadow-none select-dropdown" style="height: 35px;" id="mac-selectAudience">
                        <option value="">Select an audience</option>
                    </select>
                </div>
                <div class="form-group"> 
                    <label for="mac-personalMessage" class="font-weight-bold c-header">Message</label>
                    <div class="row mt-2">
                        <div class="col-md-12">
                            <label for="mac-aicontent" class="font-weight-bold c-header">Select content template</label>
                            <select class="form-control shadow-none select-dropdown" id="mac-aicontent" style="height: 35px;">
                                <option value="">Select content</option>
                            </select>
                        </div>
                    </div>
                    <div class="row mt-2" style="display: inline-block">
                        <div class="col-md-12">
                            <div class="juez-tooltip">
                                <button type="button" class="btn btn-outline-primary btn-lg mac-pm-btn" data-name="@firstName">@firstName</button>
                                <span class="juez-tooltiptext">Short-code for first name of the user.</span>
                            </div>
                            <div class="juez-tooltip">
                                <button type="button" class="btn btn-outline-primary btn-lg mac-pm-btn" data-name="@lastName">@lastName</button>
                                <span class="juez-tooltiptext">Short-code for last name of the user.</span>
                            </div>
                            <div class="juez-tooltip">
                                <button type="button" class="btn btn-outline-primary btn-lg mac-pm-btn" data-name="@name">@name</button>
                                <span class="juez-tooltiptext">Short-code for full name of the user.</span>
                            </div>
                        </div>
                    </div> 
                    <div class="row mt-2">
                        <div class="col-md-12">
                            <div class="form-group mb-0">
                                <textarea class="form-control shadow-none text-area-size" rows="6" data-name="Message" id="mac-personalMessage" 
                                    placeholder="Ex: Hi @firstName, how are you?"
                                ></textarea>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-12">
                        <div id="mac-accordion1">
                            <div class="card">
                                <a class="card-link card-header c-header" data-toggle="collapse" href="#collapseMaConnection"
                                    style="color:black">
                                    Exclude message to <span class="float-right dropdown-toggle"></span>
                                </a>
                                <div id="collapseMaConnection" class="collapse" data-parent="#mac-accordion1">
                                    <div class="card-body">
                                        <div class="form-group mb-0">
                                            <div class="input-group">
                                                <input type="text" class="form-control shadow-none" 
                                                    id="mac-exConnection" placeholder="Type connection name and click search">
                                                <div class="input-group-append">
                                                    <span class="input-group-text mac-searchCon" style="cursor:pointer">
                                                        <i class="fa fa-search"></i>
                                                    </span>
                                                </div>
                                            </div>
                                            <ul id="mac-resultConnect"></ul>
                                            <ul class="list-group" id="mac-selectedConnect"></ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row mt-2">
                    <div class="col-lg-4 col-sm-4">
                        <div class="form-group">
                            <label for="mac-startPosition" style="color:black;font-weight:bold;">Start position 
                                <div class="juez-tooltip">
                                    <i class="fa fa-exclamation-circle"></i>
                                    <span class="juez-tooltiptext">Start position 0 is the most recently added Connection.</span>
                                </div>
                            </label>
                            <input type="number" class="form-control shadow-none" id="mac-startPosition" placeholder="Ex: 0">
                        </div>
                    </div>
                    <div class="col-lg-4 col-sm-4">
                        <div class="form-group">
                            <label for="mac-totalAccept" style="color:black;font-weight:bold;">Total 
                                <div class="juez-tooltip">
                                    <i class="fa fa-exclamation-circle"></i>
                                    <span class="juez-tooltiptext">Total number of connection to send message.</span>
                                </div>
                            </label>
                            <input type="number" class="form-control shadow-none" data-name="Total" id="mac-totalMessage" placeholder="Ex: 10">
                        </div>
                    </div>
                    <div class="col-lg-4 col-sm-4">
                        <div class="form-group">
                            <label for="mac-delayFollowTime" style="color:black;font-weight:bold;">Delay 
                                <div class="juez-tooltip">
                                    <i class="fa fa-exclamation-circle"></i>
                                    <span class="juez-tooltiptext">Delay between each message in seconds.</span>
                                </div>
                            </label>
                            <input type="number" class="form-control shadow-none" data-name="Delay" id="mac-delayFollowTime" placeholder="Ex: 30">
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-12">
                        <span id="mac-error-notice" style="color:red"></span>
                    </div>
                </div>

                <div class="row">
                    <div class="col-md-4">
                        <div class="form-group">
                            <label for="mac-image" class="font-weight-bold c-header inline-block file-upload-label">
                                <input type="file"
                                id="mac-image"
                                class="form-control-file file-upload-input"
                                accept="image/jpeg, image/png">
                                <i class="fas fa-lg fa-camera upload-icon"></i>
                                Attach an image
                            </label>
                        </div>
                    </div>
                </div>
                <ul class="list-group" id="lkm-mac-image-uploads"></ul>
                <div class="row">
                    <div class="col-md-4">
                        <div class="form-group">
                            <label for="mac-file" class="font-weight-bold c-header inline-block file-upload-label">
                                <input type="file" 
                                id="mac-file" 
                                class="form-control-file file-upload-input"
                                accept=".ai,.pdf,.doc,.docx,.csv,.ppt,.pptx,.pps,.ppsx,.odt,.rtf,.xls,.xlsx,.txt">
                                <i class="fas fa-lg fa-file upload-icon"></i>
                                Attach a file
                            </label>
                        </div>
                    </div>
                </div>
                <ul class="list-group" id="lkm-mac-file-uploads"></ul>

            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-primary btn-lg shadow-none messageConnectsAction">Send</button>
                <button type="button" class="btn btn-outline-secondary btn-lg shadow-none" data-dismiss="modal">Close</button>
            </div>
        </div>
    </div>
</div>
`;

$('body').append(messageAllConnectForm)
$('body').on('click','#message-connect-menu-click',function(){
    implementPermission('messageConnectsAction')
    let fieldId = 'mac-selectAudience';
    getAudienceList(fieldId)

    // append AI content to dropdown
    helper.setAIContentToDropdown('mac-aicontent')

    // Mount file list if exists
    setFilesUploadedToList('lkm-mac')

    // setParamsToFormFields
    setParamsToFormFields('lkm-mac', {
        position: '#mac-startPosition',
        delay: '#mac-delayFollowTime',
        total: '#mac-totalMessage'
    })

    $('#messageAllConnectForm').modal({backdrop:'static', keyboard:false, show:true});
})

$('body').on('click','.mac-pm-btn',function(){
    let msgField = $('#mac-personalMessage')
    let cursorPos = msgField.prop("selectionStart")
    let textBefore = msgField.val().substring(0,  cursorPos)
    let textAfter  = msgField.val().substring(cursorPos, msgField.val().length)

    msgField.val(textBefore + $(this).data('name') + textAfter)
})

$('#mac-aicontent').change(function(){
    if($(this).val()) {
        let content = $(this).val() 
        $('#mac-personalMessage').val(content)
    } 
})

/**
 * Handle file uploads
 */
$('body').on('change','#mac-image', async function(ev) {
    let fileData = $("#mac-image")[0].files[0];

    try {
        let file = await helper.handleFileUpload(ev, '#mac-image', 'image')
        let fileInfo = {
            name: file[0].name,
            size: file[0].size,
            type: file[0].type,
            fileData: fileData,
            blobURL: URL.createObjectURL(fileData),
            module: 'lkm-mac'
        }
        // upload file
        uploadFile(fileInfo,'.message-connects-notice','#displayMessageConnectsStatus')
    } catch (error) {
        $('.message-connects-notice').show()
        $('#displayMessageConnectsStatus').html(error)
    }    
});

$('body').on('change','#mac-file', async function(ev) {
    let fileData = $("#mac-file")[0].files[0];
    try {
        let file = await helper.handleFileUpload(ev, '#mac-file', 'file')
        let fileInfo = {
            name: file[0].name,
            size: file[0].size,
            type: file[0].type,
            fileData: fileData,
            blobURL: URL.createObjectURL(fileData),
            module: 'lkm-mac'
        }
        // upload file
        uploadFile(fileInfo,'.message-connects-notice','#displayMessageConnectsStatus')        
    } catch (error) {
        $('.message-connects-notice').show()
        $('#displayMessageConnectsStatus').html(error)
    }    
});

$('body').on('click','.lkm-mac-remove-upload',function() {
    let index = $(this).data('index')
    let lkmModule = $(this).data('module')

    removeFile(lkmModule, index)
    setFilesUploadedToList('lkm-mac')
})