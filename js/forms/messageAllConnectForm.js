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
    console.log('🔍 Opening Message All Connections modal...');
    
    // Initialize storage if not exists
    if (!localStorage.getItem('lkm-mac')) {
        console.log('📦 Initializing message storage...');
        localStorage.setItem('lkm-mac', JSON.stringify({
            position: 0,
            delay: 30,
            total: 10,
            uploads: []
        }));
    }

    // Check permissions
    implementPermission('messageConnectsAction');

    // Load audiences with loading state
    let fieldId = 'mac-selectAudience';
    $('#' + fieldId).empty().append(
        $('<option/>', {
            value: '',
            html: '⏳ Loading audiences...'
        })
    );
    
    getAudienceList(fieldId).catch(error => {
        console.error('❌ Failed to load audiences:', error);
        $('#' + fieldId).empty().append(
            $('<option/>', {
                value: '',
                html: '❌ Failed to load audiences'
            })
        );
    });

    // Load message templates with loading state
    $('#mac-aicontent').empty().append(
        $('<option/>', {
            value: '',
            html: '⏳ Loading templates...'
        })
    );
    
    helper.setAIContentToDropdown('mac-aicontent');

    // Mount file list if exists
    try {
        setFilesUploadedToList('lkm-mac');
    } catch (error) {
        console.error('❌ Error loading uploaded files:', error);
    }

    // Set form fields from storage
    try {
        const storedData = JSON.parse(localStorage.getItem('lkm-mac'));
        if (storedData) {
            $('#mac-startPosition').val(storedData.position || 0);
            $('#mac-delayFollowTime').val(storedData.delay || 30);
            $('#mac-totalMessage').val(storedData.total || 10);
        }
    } catch (error) {
        console.error('❌ Error loading stored values:', error);
    }

    // Show modal
    $('#messageAllConnectForm').modal({
        backdrop: 'static', 
        keyboard: false, 
        show: true
    });
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

// Handle image uploads
$('body').on('change', '#mac-image', async function(ev) {
    console.log('🖼️ Processing image upload...');
    
    try {
        // Show loading state
        $('.message-connects-notice').show();
        $('#displayMessageConnectsStatus').html(`
            <div class="alert alert-info">
                <i class="fas fa-spinner fa-spin"></i> Uploading image...
            </div>
        `);

        const fileData = $("#mac-image")[0].files[0];
        
        // Validate file size (max 5MB)
        if (fileData.size > 5 * 1024 * 1024) {
            throw new Error('Image size must be less than 5MB');
        }

        // Process file
        const file = await helper.handleFileUpload(ev, '#mac-image', 'image');
        
        // Prepare file info
        const fileInfo = {
            name: file[0].name,
            size: file[0].size,
            type: file[0].type,
            fileData: fileData,
            blobURL: URL.createObjectURL(fileData),
            module: 'lkm-mac'
        };

        console.log('📤 Uploading image:', fileInfo.name);
        
        // Upload file
        await uploadFile(fileInfo, '.message-connects-notice', '#displayMessageConnectsStatus');
        
        // Show success
        $('#displayMessageConnectsStatus').html(`
            <div class="alert alert-success">
                <i class="fas fa-check-circle"></i> Image uploaded successfully: ${fileInfo.name}
            </div>
        `);

    } catch (error) {
        console.error('❌ Image upload error:', error);
        $('.message-connects-notice').show();
        $('#displayMessageConnectsStatus').html(`
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-circle"></i> Failed to upload image:<br>
                ${error.message}
            </div>
        `);
        // Clear the file input
        $(this).val('');
    }
});

// Handle file uploads
$('body').on('change', '#mac-file', async function(ev) {
    console.log('📄 Processing file upload...');
    
    try {
        // Show loading state
        $('.message-connects-notice').show();
        $('#displayMessageConnectsStatus').html(`
            <div class="alert alert-info">
                <i class="fas fa-spinner fa-spin"></i> Uploading file...
            </div>
        `);

        const fileData = $("#mac-file")[0].files[0];
        
        // Validate file size (max 10MB)
        if (fileData.size > 10 * 1024 * 1024) {
            throw new Error('File size must be less than 10MB');
        }

        // Process file
        const file = await helper.handleFileUpload(ev, '#mac-file', 'file');
        
        // Prepare file info
        const fileInfo = {
            name: file[0].name,
            size: file[0].size,
            type: file[0].type,
            fileData: fileData,
            blobURL: URL.createObjectURL(fileData),
            module: 'lkm-mac'
        };

        console.log('📤 Uploading file:', fileInfo.name);
        
        // Upload file
        await uploadFile(fileInfo, '.message-connects-notice', '#displayMessageConnectsStatus');
        
        // Show success
        $('#displayMessageConnectsStatus').html(`
            <div class="alert alert-success">
                <i class="fas fa-check-circle"></i> File uploaded successfully: ${fileInfo.name}
            </div>
        `);

    } catch (error) {
        console.error('❌ File upload error:', error);
        $('.message-connects-notice').show();
        $('#displayMessageConnectsStatus').html(`
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-circle"></i> Failed to upload file:<br>
                ${error.message}
            </div>
        `);
        // Clear the file input
        $(this).val('');
    }
});

// Handle file removal
$('body').on('click', '.lkm-mac-remove-upload', function() {
    const index = $(this).data('index');
    const lkmModule = $(this).data('module');
    
    try {
        console.log('🗑️ Removing file at index:', index);
        removeFile(lkmModule, index);
        setFilesUploadedToList('lkm-mac');
        
        // Show success message
        $('.message-connects-notice').show();
        $('#displayMessageConnectsStatus').html(`
            <div class="alert alert-success">
                <i class="fas fa-check-circle"></i> File removed successfully
            </div>
        `);
        
        // Clear message after 3 seconds
        setTimeout(() => {
            $('#displayMessageConnectsStatus').empty();
            $('.message-connects-notice').hide();
        }, 3000);
        
    } catch (error) {
        console.error('❌ Error removing file:', error);
        $('.message-connects-notice').show();
        $('#displayMessageConnectsStatus').html(`
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-circle"></i> Failed to remove file:<br>
                ${error.message}
            </div>
        `);
    }
});