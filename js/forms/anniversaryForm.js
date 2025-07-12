var anniversaryForm = `
<div class="modal" id="anniversaryForm">
    <div class="modal-dialog modal-dialog-scrollable">
        <div class="modal-content">
            <div class="modal-header modal-header-bg">
                <h5 class="modal-title">Send Work Anniversary Greetings</h5>
                <button type="button" class="close" data-dismiss="modal">&times;</button>
            </div>
            <div class="modal-body">
                <div class="row anniversaryGreetings-notice" style="display: none;">
                    <div class="col-md-12">
                        <div class="card card-body" style="background: #F3F6F8;">
                            <ul id="displayAnniversaryGreetingsStatus" style="list-style: none"></ul>
                        </div>
                    </div>
                </div>
                <div class="form-group">
                    <label for="ang-personalMessage" class="font-weight-bold c-header">Work anniversary greetings
                        <div class="juez-tooltip">
                            <i class="fa fa-exclamation-circle"></i>
                            <span class="juez-tooltiptext">
                                Use @firstname, @lastname or @name in the text area below to act as a placeholder
                                for the entire name, first name or last name of the user. Use @yearsAtCompany for number of years at the company of the user.
                            </span>
                        </div>
                    </label>
                    <div class="row mt-2" style="display: inline-block">
                        <div class="col-md-12">
                            <div class="juez-tooltip">
                                <button type="button" class="btn btn-outline-primary btn-lg ang-pm-btn" data-name="@firstName">@firstName</button>
                                <span class="juez-tooltiptext">Short-code for first name of the user.</span>
                            </div>
                            <div class="juez-tooltip">
                                <button type="button" class="btn btn-outline-primary btn-lg ang-pm-btn" data-name="@lastName">@lastName</button>
                                <span class="juez-tooltiptext">Short-code for last name of the user.</span>
                            </div>
                            <div class="juez-tooltip">
                                <button type="button" class="btn btn-outline-primary btn-lg ang-pm-btn" data-name="@name">@name</button>
                                <span class="juez-tooltiptext">Short-code for full name of the user.</span>
                            </div>
                            <div class="juez-tooltip">
                                <button type="button" class="btn btn-outline-primary btn-lg ang-pm-btn" data-name="@yearsAtCompany">@yearsAtCompany</button>
                                <span class="juez-tooltiptext">Short-code for number of years at the company of the user.</span>
                            </div>
                        </div>
                    </div> 
                    <div class="row mt-2">
                        <div class="col-md-12">
                            <div class="form-group mb-0">
                                <textarea class="form-control shadow-none text-area-size" rows="7" data-name="Message" id="ang-personalMessage" 
                                    placeholder="Ex: Hello @firstName, congrats at your @yearsAtCompany anniversary..."
                                ></textarea>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-lg-12">
                        <div class="form-group">
                            <label for="ang-delayTime" style="color:black;font-weight:bold;">Delay 
                                <div class="juez-tooltip">
                                    <i class="fa fa-exclamation-circle"></i>
                                    <span class="juez-tooltiptext">Delay between each greetings in seconds.</span>
                                </div>
                            </label>
                            <input type="number" class="form-control shadow-none" id="ang-delayTime" data-name="Delay" placeholder="Ex: 30">
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-12">
                        <span id="ang-error-notice" style="color:red"></span>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-12">
                        <div class="mb-2">
                            <input type="checkbox" class="shadow-none" id="ang-viewProfile">
                            <label class="custom-control-label" for="ang-viewProfile" style="color:black;font-weight:bold;">View profile
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
                            <label for="ang-image" class="font-weight-bold c-header inline-block file-upload-label">
                                <input type="file"
                                id="ang-image"
                                class="form-control-file file-upload-input"
                                accept="image/jpeg, image/png">
                                <i class="fas fa-lg fa-camera upload-icon"></i>
                                Attach an image
                            </label>
                        </div>
                    </div>
                </div>
                <ul class="list-group" id="lkm-ang-image-uploads"></ul>
                <div class="row">
                    <div class="col-md-4">
                        <div class="form-group">
                            <label for="ang-file" class="font-weight-bold c-header inline-block file-upload-label">
                                <input type="file" 
                                id="ang-file" 
                                class="form-control-file file-upload-input"
                                accept=".ai,.pdf,.doc,.docx,.csv,.ppt,.pptx,.pps,.ppsx,.odt,.rtf,.xls,.xlsx,.txt">
                                <i class="fas fa-lg fa-file upload-icon"></i>
                                Attach a file
                            </label>
                        </div>
                    </div>
                </div>
                <ul class="list-group" id="lkm-ang-file-uploads"></ul>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-primary btn-lg shadow-none anniversaryGreetingAction">Send</button>
                <button type="button" class="btn btn-outline-secondary btn-lg shadow-none" data-dismiss="modal">Close</button>
            </div>

        </div>
    </div>
</div>
`;

$('body').append(anniversaryForm)
$('body').on('click', '#anniversary-menu-click', function(){
    implementPermission('anniversaryGreetingAction')

    // Mount file list if exists
    setFilesUploadedToList('lkm-ang')

    // setParamsToFormFields
    setParamsToFormFields('lkm-ang', {
        delay: '#ang-delayTime'
    })

    $('#anniversaryForm').modal({backdrop:'static', keyboard:false, show:true})
})
$('body').on('click','.ang-pm-btn',function(){
    var pmName = $(this).data('name')
    var pm = $('#ang-personalMessage')
    pm.val(pm.val() + pmName)
})

/**
 * Handle file uploads
 */
$('body').on('change','#ang-image', async function(ev) {
    let fileData = $("#ang-image")[0].files[0];
    try {
        let file = await helper.handleFileUpload(ev, '#ang-image', 'image')
        let fileInfo = {
            name: file[0].name,
            size: file[0].size,
            type: file[0].type,
            fileData: fileData,
            blobURL: URL.createObjectURL(fileData),
            module: 'lkm-ang'
        }
        // upload file
        uploadFile(fileInfo,'.anniversaryGreetings-notice','#displayAnniversaryGreetingsStatus')
    } catch (error) {
        $('.anniversaryGreetings-notice').show()
        $('#displayAnniversaryGreetingsStatus').html(error)
    }    
})

$('body').on('change','#ang-file', async function(ev) {
    let fileData = $("#ang-file")[0].files[0];
    try {
        let file = await helper.handleFileUpload(ev, '#ang-file', 'file')
        let fileInfo = {
            name: file[0].name,
            size: file[0].size,
            type: file[0].type,
            fileData: fileData,
            blobURL: URL.createObjectURL(fileData),
            module: 'lkm-ang'
        }
        // upload file
        uploadFile(fileInfo,'.anniversaryGreetings-notice','#displayAnniversaryGreetingsStatus')        
    } catch (error) {
        $('.anniversaryGreetings-notice').show()
        $('#displayAnniversaryGreetingsStatus').html(error)
    }    
});

$('body').on('click','.lkm-ang-remove-upload',function() {
    let index = $(this).data('index')
    let lkmModule = $(this).data('module')

    removeFile(lkmModule, index)
    setFilesUploadedToList('lkm-ang')
})