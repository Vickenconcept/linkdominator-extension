var autoRespondNormalForm = `
<div class="modal" id="autoRespondNormalForm">
    <div class="modal-dialog modal-lg modal-dialog-scrollable">
        <div class="modal-content">
            <div class="modal-header modal-header-bg">
                <h5 class="modal-title">Automatic Response</h5>
                <button type="button" class="close close-ar-normal-form">&times;</button>
            </div>
            <div class="modal-body">
                <input type="hidden" id="ar-update-id">
                <input type="hidden" id="ar-message-type">
                <div class="row" id="keywords-elem">
                    <div class="col-md-12">
                        <div class="form-group">
                            <label for="ar-normal-keywords" class="font-weight-bold c-header">keywords
                                <div class="juez-tooltip">
                                    <i class="fa fa-exclamation-circle"></i>
                                    <span class="juez-tooltiptext">
                                        Enter comma separated keywords to search in message content. 
                                        Keywords are not case-sensitive
                                    </span>
                                </div>
                            </label>
                            <textarea class="form-control shadow-none text-area-size" rows="3" id="ar-normal-keywords" 
                                placeholder="Ex: Marketing, Manager, John"></textarea>
                        </div>
                    </div>
                </div>
                <div class="form-group" id="endorse-skill-elem">
                    <label for="ar-totalSkills" style="color:black;font-weight:bold;">Total skills to endorse
                        <div class="juez-tooltip">
                            <i class="fa fa-exclamation-circle"></i>
                            <span class="juez-tooltiptext">Total number of skill of each connection.</span>
                        </div>
                    </label>
                    <input type="number" class="form-control shadow-none" id="ar-totalSkills" placeholder="Ex: 5">
                </div>
                <div class="form-group"> 
                    <label for="ar-normal-message" class="font-weight-bold c-header">Message</label>
                    <div class="row mt-2">
                        <div class="col-md-12">
                            <label for="ar-normal-aicontent" class="font-weight-bold c-header">Select content template</label>
                            <select class="form-control shadow-none select-dropdown" id="ar-normal-aicontent" style="height: 35px;">
                                <option value="">Select content</option>
                            </select>
                        </div>
                    </div>
                    <div class="row mt-2" style="display: inline-block">
                        <div class="col-md-12">
                            <div class="juez-tooltip">
                                <button type="button" class="btn btn-outline-primary btn-lg ar-normal-nameabbr-btn" data-name="@firstName">@firstName</button>
                                <span class="juez-tooltiptext">Short-code for first name of the user.</span>
                            </div>
                            <div class="juez-tooltip">
                                <button type="button" class="btn btn-outline-primary btn-lg ar-normal-nameabbr-btn" data-name="@lastName">@lastName</button>
                                <span class="juez-tooltiptext">Short-code for last name of the user.</span>
                            </div>
                            <div class="juez-tooltip">
                                <button type="button" class="btn btn-outline-primary btn-lg ar-normal-nameabbr-btn" data-name="@name">@name</button>
                                <span class="juez-tooltiptext">Short-code for full name of the user.</span>
                            </div>
                        </div>
                    </div> 
                    <div class="row mt-2">
                        <div class="col-md-12">
                            <div class="form-group mb-0">
                                <textarea class="form-control shadow-none text-area-size" rows="6" data-name="ar-normal-message" id="ar-normal-message" 
                                    placeholder="Ex: You are welcome @firstname"
                                ></textarea>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-4">
                        <div class="form-group">
                            <label for="ar-normal-image" class="font-weight-bold c-header inline-block file-upload-label">
                                <input type="file"
                                id="ar-normal-image"
                                class="form-control-file file-upload-input"
                                accept="image/jpeg, image/png">
                                <i class="fas fa-lg fa-camera upload-icon"></i>
                                Attach an image
                            </label>
                        </div>
                    </div>
                </div>
                <ul class="list-group" id="lkm-arm-image-uploads"></ul>
                <div class="row">
                    <div class="col-md-4">
                        <div class="form-group">
                            <label for="ar-normal-file" class="font-weight-bold c-header inline-block file-upload-label">
                                <input type="file" 
                                id="ar-normal-file" 
                                class="form-control-file file-upload-input"
                                accept=".ai,.pdf,.doc,.docx,.csv,.ppt,.pptx,.pps,.ppsx,.odt,.rtf,.xls,.xlsx,.txt">
                                <i class="fas fa-lg fa-file upload-icon"></i>
                                Attach an file
                            </label>
                        </div>
                    </div>
                </div>
                <ul class="list-group" id="lkm-arm-file-uploads"></ul>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-primary btn-lg shadow-none create-ar-normal">Create</button>
                <button type="button" class="btn btn-primary btn-lg shadow-none update-ar-normal">Update</button>
                <button type="button" class="btn btn-outline-secondary btn-lg shadow-none close-ar-normal-form">Close</button>
            </div>
        </div>
    </div>
</div>
`;

$('body').append(autoRespondNormalForm)

$('body').on('click','.ar-normal-nameabbr-btn',function() {
    let msgField = $('#ar-normal-message')
    let cursorPos = msgField.prop("selectionStart")
    let textBefore = msgField.val().substring(0,  cursorPos)
    let textAfter  = msgField.val().substring(cursorPos, msgField.val().length)

    msgField.val(textBefore + $(this).data('name') + textAfter)
})

$('#ar-normal-aicontent').change(function(){
    if($(this).val()) {
        let content = $(this).val() 
        $('#ar-normal-message').val(content)
    } 
})

$('body').on('click','.create-ar-normal',function() {
    autoResponseModel.message_type = 'normal'
    autoResponseModel.message_keywords = $('#ar-normal-keywords').val()
    autoResponseModel.total_endorse_skills = 0
    autoResponseModel.message_body = $('#ar-normal-message').val()
    storeAutoRespondMessages()
})

$('body').on('click','.update-ar-normal',function() {
    let id = $('#ar-update-id').val()
    let messageType = $('#ar-message-type').val()

    switch (messageType) {
        case 'normal':
            autoResponseModel.message_keywords = $('#ar-normal-keywords').val()
            autoResponseModel.total_endorse_skills = 0
            autoResponseModel.message_body = $('#ar-normal-message').val()
            break;
        case 'endorsement':
            autoResponseModel.message_keywords = $('#ar-normal-keywords').val()
            autoResponseModel.total_endorse_skills = $('#ar-totalSkills').val()
            autoResponseModel.message_body = $('#ar-normal-message').val()
            break;
        case 'followup':
            autoResponseModel.message_keywords = ''
            autoResponseModel.total_endorse_skills = 0
            autoResponseModel.message_body = $('#ar-normal-message').val()
            break;
    
        default:
            break;
    }

    autoResponseModel.message_type = messageType
    
    updateAutoRespondMessages(id)
})

/**
 * Handle file uploads
 */
$('body').on('change','#ar-normal-file', function(ev) {
    let fileData = $("#ar-normal-file")[0].files[0];
    let file = helper.handleFileUpload(ev, '#ar-normal-file', 'file')
    let blobURL = URL.createObjectURL(fileData)
    let fileInfo = {
        name: file[0].name,
        size: file[0].size,
        type: file[0].type,
        fileData: fileData,
        blobURL: blobURL,
        module: 'lkm-arm'
    }
    // upload file
    uploadFile(fileInfo,'.message-connects-notice','#displayMessageConnectsStatus')

    autoResponseModel.attachement.file.push(blobURL.split('/')[3])
    autoResponseModel.attachement.status = true
})

$('body').on('change','#ar-normal-image', async function(ev) {
    let fileData = $("#ar-normal-image")[0].files[0];
    let file = await helper.handleFileUpload(ev, '#ar-normal-image', 'image')
    let blobURL = URL.createObjectURL(fileData)
    let fileInfo = {
        name: file[0].name,
        size: file[0].size,
        type: file[0].type,
        fileData: fileData,
        blobURL: blobURL,
        module: 'lkm-arm'
    }
    // upload file
    uploadFile(fileInfo,'.message-connects-notice','#displayMessageConnectsStatus')

    autoResponseModel.attachement.image.push(blobURL.split('/')[3])
    autoResponseModel.attachement.status = true
})

$('body').on('click','.close-ar-normal-form',function() {
    $('#autoRespondNormalForm').modal('hide')
    $('#autoresponseList').modal({backdrop:'static', keyboard:false, show:true})
})

$('body').on('click','.lkm-arm-remove-upload',function() {
    let index = $(this).data('index')
    let lkmModule = $(this).data('module')
    let bob = $(this).data('bob')

    // remove file from db
    if(autoResponseModel.attachement.image.includes(bob)) {
        const imageArray = autoResponseModel.attachement.image.filter(function (file) {
            return file !==  bob;
        });
        autoResponseModel.attachement.image = imageArray
    }

    if(autoResponseModel.attachement.file.includes(bob)) {
        const fileArray = autoResponseModel.attachement.file.filter(function (file) {
            return file !==  bob;
        });
        autoResponseModel.attachement.file = fileArray
    }
    
    removeFile(lkmModule, index)
    setFilesUploadedToList('lkm-arm')
})