var newJobCongratsForm = `
<div class="modal" id="newJobCongratsForm">
    <div class="modal-dialog modal-dialog-scrollable">
        <div class="modal-content">
            <div class="modal-header modal-header-bg">
                <h5 class="modal-title">Send New Job Greetings</h5>
                <button type="button" class="close" data-dismiss="modal">&times;</button>
            </div>
            <div class="modal-body">
                <div class="row newJobGreetings-notice" style="display: none;">
                    <div class="col-md-12">
                        <div class="card card-body" style="background: #F3F6F8;">
                            <ul id="displayNewJobGreetingsStatus" style="list-style: none"></ul>
                        </div>
                    </div>
                </div>
                <div class="form-group">
                    <label for="njc-personalMessage" class="font-weight-bold c-header">New job greetings
                        <div class="juez-tooltip">
                            <i class="fa fa-exclamation-circle"></i>
                            <span class="juez-tooltiptext">
                                Use @firstname, @lastname or @name in the text area below to act as a placeholder
                                for the entire name, first name or last name of the user. Use @newPosition for new position at the company of the user.
                            </span>
                        </div>
                    </label>
                    <div class="row mt-2" style="display: inline-block">
                        <div class="col-md-12">
                            <div class="juez-tooltip">
                                <button type="button" class="btn btn-outline-primary btn-lg njc-pm-btn" data-name="@firstName">@firstName</button>
                                <span class="juez-tooltiptext">Short-code for first name of the user.</span>
                            </div>
                            <div class="juez-tooltip">
                                <button type="button" class="btn btn-outline-primary btn-lg njc-pm-btn" data-name="@lastName">@lastName</button>
                                <span class="juez-tooltiptext">Short-code for last name of the user.</span>
                            </div>
                            <div class="juez-tooltip">
                                <button type="button" class="btn btn-outline-primary btn-lg njc-pm-btn" data-name="@name">@name</button>
                                <span class="juez-tooltiptext">Short-code for full name of the user.</span>
                            </div>
                            <div class="juez-tooltip">
                                <button type="button" class="btn btn-outline-primary btn-lg njc-pm-btn" data-name="@newPosition">@newPosition</button>
                                <span class="juez-tooltiptext">Short-code for new job position of the user.</span>
                            </div>
                        </div>
                    </div> 
                    <div class="row mt-2">
                        <div class="col-md-12">
                            <div class="form-group mb-0">
                                <textarea class="form-control shadow-none text-area-size" rows="7" data-name="Message" id="njc-personalMessage" 
                                    placeholder="Ex: Congrats @firstName, for starting a new position as @newPosition..."
                                ></textarea>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row">
                    <!-- div class="col-md-6">
                        <div class="form-group">
                            <label for="njc-startPosition" style="color:black;font-weight:bold;">Start position 
                                <div class="juez-tooltip">
                                    <i class="fa fa-exclamation-circle"></i>
                                    <span class="juez-tooltiptext">Start position 0 is the most recently notification.</span>
                                </div>
                            </label>
                            <input type="number" class="form-control shadow-none" id="njc-startPosition" placeholder="Ex: 0">
                        </div>
                    </div -->
                    <div class="col-md-6">
                        <div class="form-group">
                            <label for="njc-delayTime" style="color:black;font-weight:bold;">Delay 
                                <div class="juez-tooltip">
                                    <i class="fa fa-exclamation-circle"></i>
                                    <span class="juez-tooltiptext">Delay between each greetings in seconds.</span>
                                </div>
                            </label>
                            <input type="number" class="form-control shadow-none" id="njc-delayTime" data-name="Delay" placeholder="Ex: 30">
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-12">
                        <span id="njc-error-notice" style="color:red"></span>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-12">
                        <div class="mt-3">
                            <input type="checkbox" class="shadow-none" id="njc-viewProfile">
                            <label class="custom-control-label" for="njc-viewProfile" style="color:black;font-weight:bold;">View profile
                                <div class="juez-tooltip">
                                    <i class="fa fa-exclamation-circle"></i>
                                    <span class="juez-tooltiptext">Check this if you want to send profile view notification.</span>
                                </div>
                            </label>
                        </div>
                    </div>
                </div>

                <div class="row">
                    <div class="col-md-4">
                        <div class="form-group">
                            <label for="njc-image" class="font-weight-bold c-header inline-block file-upload-label">
                                <input type="file"
                                id="njc-image"
                                class="form-control-file file-upload-input"
                                accept="image/jpeg, image/png">
                                <i class="fas fa-lg fa-camera upload-icon"></i>
                                Attach an image
                            </label>
                        </div>
                    </div>
                </div>
                <ul class="list-group" id="lkm-njc-image-uploads"></ul>
                <div class="row">
                    <div class="col-md-4">
                        <div class="form-group">
                            <label for="njc-file" class="font-weight-bold c-header inline-block file-upload-label">
                                <input type="file" 
                                id="njc-file"
                                class="form-control-file file-upload-input"
                                accept=".ai,.pdf,.doc,.docx,.csv,.ppt,.pptx,.pps,.ppsx,.odt,.rtf,.xls,.xlsx,.txt">
                                <i class="fas fa-lg fa-file upload-icon"></i>
                                Attach a file
                            </label>
                        </div>
                    </div>
                </div>
                <ul class="list-group" id="lkm-njc-file-uploads"></ul>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-primary btn-lg shadow-none newJobCongratsAction">Send</button>
                <button type="button" class="btn btn-outline-secondary btn-lg shadow-none" data-dismiss="modal">Close</button>
            </div>

        </div>
    </div>
</div>
`;

$('body').append(newJobCongratsForm)
$('body').on('click','#new-job-menu-click',function(){
    implementPermission('newJobCongratsAction')

    // Mount file list if exists
    setFilesUploadedToList('lkm-njc')

    // setParamsToFormFields
    setParamsToFormFields('lkm-njc', {
        delay: '#njc-delayTime'
    })

    $('#newJobCongratsForm').modal({backdrop:'static', keyboard:false, show:true})
})
$('body').on('click','.njc-pm-btn',function(){
    var pmName = $(this).data('name')
    var pm = $('#njc-personalMessage')
    pm.val(pm.val() + pmName)
})

/**
 * Handle file uploads
 */
let njcNoticeClass = '.newJobGreetings-notice',
    njcNoticeStatus = '#displayNewJobGreetingsStatus'

$('body').on('change','#njc-image', async function(ev) {
    let fileData = $("#njc-image")[0].files[0];
    try {
        let file = await helper.handleFileUpload(ev, '#njc-image', 'image')
        let fileInfo = {
            name: file[0].name,
            size: file[0].size,
            type: file[0].type,
            fileData: fileData,
            blobURL: URL.createObjectURL(fileData),
            module: 'lkm-njc'
        }
        // upload file
        uploadFile(fileInfo, njcNoticeClass, njcNoticeStatus)
    } catch (error) {
        $(njcNoticeClass).show()
        $(njcNoticeStatus).html(error)
    }    
})

$('body').on('change','#njc-file', async function(ev) {
    let fileData = $("#njc-file")[0].files[0];
    try {
        let file = await helper.handleFileUpload(ev, '#njc-file', 'file')
        let fileInfo = {
            name: file[0].name,
            size: file[0].size,
            type: file[0].type,
            fileData: fileData,
            blobURL: URL.createObjectURL(fileData),
            module: 'lkm-njc'
        }
        // upload file
        uploadFile(fileInfo, njcNoticeClass, njcNoticeStatus)        
    } catch (error) {
        $(njcNoticeClass).show()
        $(njcNoticeStatus).html(error)
    }
});

$('body').on('click','.lkm-njc-remove-upload',function() {
    let index = $(this).data('index')
    let lkmModule = $(this).data('module')

    removeFile(lkmModule, index)
    setFilesUploadedToList('lkm-njc')
})