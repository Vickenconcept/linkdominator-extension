
var messageTargetUserForm = `
<div class="modal" id="messageTargetUserForm">
    <div class="modal-dialog modal-lg modal-dialog-scrollable">
        <div class="modal-content">
            <div class="modal-header modal-header-bg">
                <h5 class="modal-title">Send Targeted Messages</h5>
                <button type="button" class="close" data-dismiss="modal">&times;</button>
            </div>
            <div class="modal-body">
                <div class="row message-target-notice" style="display: none;">
                    <div class="col-md-12">
                        <div class="card card-body" style="background: #F3F6F8;">
                            <ul id="displayMessageTargetStatus" style="list-style: none"></ul>
                        </div>
                    </div>
                </div>
                <div class="form-group">
                    <label for="mtu-selectAudience" class="font-weight-bold c-header">Select an audience</label>
                    <select class="form-control shadow-none select-dropdown" style="height: 35px;" id="mtu-selectAudience">
                        <option value="">Select an audience</option>
                    </select>
                </div>
                <div class="form-group"> 
                    <label for="mtu-personalMessage" class="font-weight-bold c-header">Message</label>
                    <div class="row mt-2">
                        <div class="col-md-12">
                            <label for="mtu-aicontent" class="font-weight-bold c-header">Select content template</label>
                            <select class="form-control shadow-none select-dropdown" id="mtu-aicontent" style="height: 35px;">
                                <option value="">Select content</option>
                            </select>
                        </div>
                    </div>
                    <div class="row mt-2" style="display: inline-block">
                        <div class="col-md-12">
                            <div class="juez-tooltip">
                                <button type="button" class="btn btn-outline-primary btn-lg mtu-pm-btn" data-name="@firstName">@firstName</button>
                                <span class="juez-tooltiptext">Short-code for first name of the user.</span>
                            </div>
                            <div class="juez-tooltip">
                                <button type="button" class="btn btn-outline-primary btn-lg mtu-pm-btn" data-name="@lastName">@lastName</button>
                                <span class="juez-tooltiptext">Short-code for last name of the user.</span>
                            </div>
                            <div class="juez-tooltip">
                                <button type="button" class="btn btn-outline-primary btn-lg mtu-pm-btn" data-name="@name">@name</button>
                                <span class="juez-tooltiptext">Short-code for full name of the user.</span>
                            </div>
                        </div>
                    </div> 
                    <div class="row mt-2">
                        <div class="col-md-12">
                            <div class="form-group mb-0">
                                <textarea class="form-control shadow-none text-area-size" rows="6" data-name="Message" id="mtu-personalMessage" 
                                    placeholder="Ex: Hi @firstName, how are you."
                                ></textarea>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="form-group">
                    <label for="mtu-search-term" class="font-weight-bold" style="color:black;">Search</label>
                    <input type="text" class="form-control shadow-none" id="mtu-search-term" placeholder="Enter your search term">
                </div>
                <div class="row">
                    <div class="col-md-12">
                        <div id="mtu-accordionExclude">
                            <div class="card">
                                <a class="card-link card-header c-header" data-toggle="collapse" href="#collapseMtuExclude"
                                    style="color:black">
                                    Exclude message to <span class="float-right dropdown-toggle"></span>
                                </a>
                                <div id="collapseMtuExclude" class="collapse" data-parent="#mtu-accordionExclude">
                                    <div class="card-body">
                                        <div class="form-group mb-0">
                                            <div class="input-group">
                                                <input type="text" class="form-control shadow-none" 
                                                    id="mtu-exConnection" placeholder="Type connection name and click search">
                                                <div class="input-group-append">
                                                    <span class="input-group-text mtu-searchExCon" style="cursor:pointer">
                                                        <i class="fa fa-search"></i>
                                                    </span>
                                                </div>
                                            </div>
                                            <ul id="mtu-resultExConnect"></ul>
                                            <ul class="list-group" id="mtu-selectedExConnect"></ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-6">
                        <div id="mtu-accordion7">
                            <div class="card">
                                <a class="card-link card-header c-header" data-toggle="collapse" href="#mtu-collapseLanguage" style="color:black">
                                    Profile Language<span class="float-right dropdown-toggle"></span>
                                </a>
                                <div id="mtu-collapseLanguage" class="collapse" data-parent="#mtu-accordion7">
                                    <div class="card-body">
                                        <div class="form-group mb-0">
                                            <div class="input-group">
                                                <input type="text" class="form-control shadow-none" 
                                                    id="mtu-language" placeholder="Type language name and click search">
                                                <div class="input-group-append">
                                                    <span class="input-group-text mtu-search-lang" id="mtu-search-lang" style="cursor:pointer">
                                                        <i class="fa fa-search"></i>
                                                    </span>
                                                </div>
                                            </div>
                                            <ul id="mtu-resultLanguage"></ul>
                                            <ul class="list-group" id="mtu-selectedLanguage"></ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div id="mtu-accordionKeywords">
                            <div class="card">
                                <a class="card-link card-header c-header" data-toggle="collapse" href="#mtu-collapseKeywords"
                                    style="color:black">
                                    Keywords <span class="float-right dropdown-toggle"></span>
                                </a>
                                <div id="mtu-collapseKeywords" class="collapse" data-parent="#mtu-accordionKeywords">
                                    <div class="card-body">
                                        <div class="form-group">
                                            <input type="text" class="form-control shadow-none" id="mtu-firstName" placeholder="First name">
                                        </div>
                                        <div class="form-group">
                                            <input type="text" class="form-control shadow-none" id="mtu-lastName" placeholder="Last name">
                                        </div>
                                        <div class="form-group">
                                            <input type="text" class="form-control shadow-none" id="mtu-title" placeholder="Title">
                                        </div>
                                        <div class="form-group">
                                            <input type="text" class="form-control shadow-none" id="mtu-company" placeholder="Company">
                                        </div>
                                        <div class="form-group">
                                            <input type="text" class="form-control shadow-none" id="mtu-school" placeholder="School">
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-6">
                        <div id="mtu-accordion1">
                            <div class="card">
                                <a class="card-link card-header c-header" data-toggle="collapse" href="#mtu-collapseConnectionOf"
                                    style="color:black">
                                    Connections Of <span class="float-right dropdown-toggle"></span>
                                </a>
                                <div id="mtu-collapseConnectionOf" class="collapse" data-parent="#mtu-accordion1">
                                    <div class="card-body">
                                        <div class="form-group mb-0">
                                            <div class="input-group">
                                                <input type="text" class="form-control shadow-none" 
                                                    id="mtu-connectionOf" placeholder="Type connection name and click search">
                                                <div class="input-group-append">
                                                    <span class="input-group-text mtu-searchCon" style="cursor:pointer">
                                                        <i class="fa fa-search"></i>
                                                    </span>
                                                </div>
                                            </div>
                                            <ul id="mtu-resultConnectOf"></ul>
                                            <ul class="list-group" id="mtu-selectedConnectOf"></ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div id="mtu-accordion2">
                            <div class="card">
                                <a class="card-link card-header c-header" data-toggle="collapse" href="#mtu-collapseLocation" style="color:black">
                                    Locations<span class="float-right dropdown-toggle"></span>
                                </a>
                                <div id="mtu-collapseLocation" class="collapse" data-parent="#mtu-accordion2">
                                    <div class="card-body">
                                        <div class="form-group mb-0">
                                            <div class="input-group">
                                                <input type="text" class="form-control shadow-none" 
                                                    id="mtu-location" placeholder="Type location name and click search">
                                                <div class="input-group-append">
                                                    <span class="input-group-text mtu-searchLoc" style="cursor:pointer">
                                                        <i class="fa fa-search"></i>
                                                    </span>
                                                </div>
                                            </div>
                                            <ul id="mtu-resultLocation"></ul>
                                            <ul class="list-group" id="mtu-selectedLocation"></ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-6">
                        <div id="mtu-accordion3">
                            <div class="card">
                                <a class="card-link card-header c-header" data-toggle="collapse" href="#mtu-collapseCurrComp" style="color:black">
                                    Current companies<span class="float-right dropdown-toggle"></span>
                                </a>
                                <div id="mtu-collapseCurrComp" class="collapse" data-parent="#mtu-accordion3">
                                    <div class="card-body">
                                        <div class="form-group mb-0">
                                            <div class="input-group">
                                                <input type="text" class="form-control shadow-none" 
                                                    id="mtu-currComp" placeholder="Type company name and click search">
                                                <div class="input-group-append">
                                                    <span class="input-group-text mtu-searchCurrComp" style="cursor:pointer">
                                                        <i class="fa fa-search"></i>
                                                    </span>
                                                </div>
                                            </div>
                                            <ul id="mtu-resultCurrComp"></ul>
                                            <ul class="list-group" id="mtu-selectedCurrComp"></ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div id="mtu-accordion4">
                            <div class="card">
                                <a class="card-link card-header c-header" data-toggle="collapse" href="#mtu-collapsePastComp" style="color:black">
                                    Past companies<span class="float-right dropdown-toggle"></span>
                                </a>
                                <div id="mtu-collapsePastComp" class="collapse" data-parent="#mtu-accordion4">
                                    <div class="card-body">
                                        <div class="form-group mb-0">
                                            <div class="input-group">
                                                <input type="text" class="form-control shadow-none" 
                                                    id="mtu-pastComp" placeholder="Type company name and click search">
                                                <div class="input-group-append">
                                                    <span class="input-group-text mtu-searchPastComp" style="cursor:pointer">
                                                        <i class="fa fa-search"></i>
                                                    </span>
                                                </div>
                                            </div>
                                            <ul id="mtu-resultPastComp"></ul>
                                            <ul class="list-group" id="mtu-selectedPastComp"></ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-6">
                        <div id="mtu-accordion5">
                            <div class="card">
                                <a class="card-link card-header c-header" data-toggle="collapse" href="#mtu-collapseIndustry" style="color:black">
                                    Industry<span class="float-right dropdown-toggle"></span>
                                </a>
                                <div id="mtu-collapseIndustry" class="collapse" data-parent="#mtu-accordion5">
                                    <div class="card-body">
                                        <div class="form-group mb-0">
                                            <div class="input-group">
                                                <input type="text" class="form-control shadow-none" 
                                                    id="mtu-industy" placeholder="Type industy name and click search">
                                                <div class="input-group-append">
                                                    <span class="input-group-text mtu-searchIndustry" style="cursor:pointer">
                                                        <i class="fa fa-search"></i>
                                                    </span>
                                                </div>
                                            </div>
                                            <ul id="mtu-resultIndustry"></ul>
                                            <ul class="list-group" id="mtu-selectedIndustry"></ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div id="mtu-accordion6">
                            <div class="card">
                                <a class="card-link card-header c-header" data-toggle="collapse" href="#mtu-collapseSchool" style="color:black">
                                    School<span class="float-right dropdown-toggle"></span>
                                </a>
                                <div id="mtu-collapseSchool" class="collapse" data-parent="#mtu-accordion6">
                                    <div class="card-body">
                                        <div class="form-group mb-0">
                                            <div class="input-group">
                                                <input type="text" class="form-control shadow-none" 
                                                    id="mtu-school-search" placeholder="Type school name and click search">
                                                <div class="input-group-append">
                                                    <span class="input-group-text mtu-searchSchool" style="cursor:pointer">
                                                        <i class="fa fa-search"></i>
                                                    </span>
                                                </div>
                                            </div>
                                            <ul id="mtu-resultSchool"></ul>
                                            <ul class="list-group" id="mtu-selectedSchool"></ul>
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
                            <label for="mtu-startPosition" style="color:black;font-weight:bold;">Start position 
                                <div class="juez-tooltip">
                                    <i class="fa fa-exclamation-circle"></i>
                                    <span class="juez-tooltiptext">Start position 0 is the most recently added connection.</span>
                                </div>
                            </label>
                            <input type="number" class="form-control shadow-none" id="mtu-startPosition" placeholder="Ex: 0">
                        </div>
                    </div>
                    <div class="col-lg-4 col-sm-4">
                        <div class="form-group">
                            <label for="mtu-totalMessageConnect" style="color:black;font-weight:bold;">Total 
                                <div class="juez-tooltip">
                                    <i class="fa fa-exclamation-circle"></i>
                                    <span class="juez-tooltiptext">Total number of connection to send your message.</span>
                                </div>
                            </label>
                            <input type="number" class="form-control shadow-none" id="mtu-totalMessageConnect" placeholder="Ex: 10">
                        </div>
                    </div>
                    <div class="col-lg-4 col-sm-4">
                        <div class="form-group">
                            <label for="mtu-delayTime" style="color:black;font-weight:bold;">Delay 
                                <div class="juez-tooltip">
                                    <i class="fa fa-exclamation-circle"></i>
                                    <span class="juez-tooltiptext">Delay between each message in seconds.</span>
                                </div>
                            </label>
                            <input type="number" class="form-control shadow-none" id="mtu-delayTime" placeholder="Ex: 30">
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-12">
                        <span id="mtu-error-notice" style="color:red"></span>
                    </div>
                </div>
                <div class=" mb-2">
                    <input type="checkbox" class="shadow-none" id="mtu-viewProfile">
                    <label class="" for="mtu-viewProfile" style="color:black;font-weight:bold;">View profile
                        <div class="juez-tooltip">
                            <i class="fa fa-exclamation-circle"></i>
                            <span class="juez-tooltiptext">Check this if you want to send profile view notification.</span>
                        </div>
                    </label>
                </div>
                <div class="row">
                    <div class="col-md-4">
                        <div class="form-group">
                            <label for="mtu-image" class="font-weight-bold c-header inline-block file-upload-label">
                                <input type="file"
                                id="mtu-image"
                                class="form-control-file file-upload-input"
                                accept="image/jpeg, image/png">
                                <i class="fas fa-lg fa-camera upload-icon"></i>
                                Attach an image
                            </label>
                        </div>
                    </div>
                </div>
                <ul class="list-group" id="lkm-mtu-image-uploads"></ul>
                <div class="row">
                    <div class="col-md-4">
                        <div class="form-group">
                            <label for="mtu-file" class="font-weight-bold c-header inline-block file-upload-label">
                                <input type="file" 
                                id="mtu-file" 
                                class="form-control-file file-upload-input"
                                accept=".ai,.pdf,.doc,.docx,.csv,.ppt,.pptx,.pps,.ppsx,.odt,.rtf,.xls,.xlsx,.txt">
                                <i class="fas fa-lg fa-file upload-icon"></i>
                                Attach a file
                            </label>
                        </div>
                    </div>
                </div>
                <ul class="list-group" id="lkm-mtu-file-uploads"></ul>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-primary btn-lg shadow-none messageTargetUserAction">Send</button>
                <button type="button" class="btn btn-outline-secondary btn-lg shadow-none" data-dismiss="modal">Close</button>
            </div>

        </div>
    </div>
</div>
`;


$('body').append(messageTargetUserForm)
$('body').on('click', '#message-target-menu-click', function(){
    implementPermission('messageTargetUserAction')
    getAudienceList('mtu-selectAudience');

    // append AI content to dropdown
    helper.setAIContentToDropdown('mtu-aicontent')

    // Mount file list if exists
    setFilesUploadedToList('lkm-mtu')

    // setParamsToFormFields
    setParamsToFormFields('lkm-mtu', {
        position: '#mtu-startPosition',
        delay: '#mtu-delayTime',
        total: '#mtu-totalMessageConnect'
    })

    // Display modal
    $('#messageTargetUserForm').modal({backdrop:'static', keyboard:false, show:true});
})
$('body').on('click','.mtu-pm-btn',function(){
    let msgField = $('#mtu-personalMessage')
    let cursorPos = msgField.prop("selectionStart")
    let textBefore = msgField.val().substring(0,  cursorPos)
    let textAfter  = msgField.val().substring(cursorPos, msgField.val().length)

    msgField.val(textBefore + $(this).data('name') + textAfter)
})

$('#mtu-aicontent').change(function(){
    if($(this).val()) {
        let content = $(this).val() 
        $('#mtu-personalMessage').val(content)
    } 
})

/**
 * Handle file uploads
 */
$('body').on('change','#mtu-image', async function(ev) {
    let fileData = $("#mtu-image")[0].files[0];

    try {
        let file = await helper.handleFileUpload(ev, '#mtu-image', 'image')
        let fileInfo = {
            name: file[0].name,
            size: file[0].size,
            type: file[0].type,
            fileData: fileData,
            blobURL: URL.createObjectURL(fileData),
            module: 'lkm-mtu'
        }
        // upload file
        uploadFile(fileInfo,'.message-target-notice','#displayMessageTargetStatus')
    } catch (error) {
        $('.message-target-notice').show()
        $('#displayMessageTargetStatus').html(error)
    }    
});

$('body').on('change','#mtu-file', async function(ev) {
    let fileData = $("#mtu-file")[0].files[0];

    try {
        let file = await helper.handleFileUpload(ev, '#mtu-file', 'file')
        let fileInfo = {
            name: file[0].name,
            size: file[0].size,
            type: file[0].type,
            fileData: fileData,
            blobURL: URL.createObjectURL(fileData),
            module: 'lkm-mtu'
        }
        // upload file
        uploadFile(fileInfo,'.message-target-notice','#displayMessageTargetStatus')        
    } catch (error) {
        $('.message-target-notice').show()
        $('#displayMessageTargetStatus').html(error)
    }    
});

$('body').on('click','.lkm-mtu-remove-upload',function() {
    let index = $(this).data('index')
    let lkmModule = $(this).data('module')

    removeFile(lkmModule, index)
    setFilesUploadedToList('lkm-mtu')
})