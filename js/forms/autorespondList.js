var autoresponseList = `
<div class="modal" id="autoresponseList">
    <div class="modal-dialog modal-lg modal-dialog-scrollable">
        <div class="modal-content">
            <div class="modal-header modal-header-bg">
                <h5 class="modal-title">Auto Respond to Messages</h5>
                <button type="button" class="close" data-dismiss="modal">&times;</button>
            </div>
            <div class="modal-body">
                <div class="row autoresponse-notice-elem" style="display: none;">
                    <div class="col-md-12">
                        <div class="card card-body" style="background: #F3F6F8;">
                            <ul id="autoresponse-notice" style="list-style: none"></ul>
                        </div>
                    </div>
                </div>
                <div class="row"> 
                    <div class="col-12">
                        <div class="table-responsive tbl-fixed">
                            <table class="table normal-table">
                                <thead>
                                    <tr>
                                        <th scope="col" class="th-fixed"></th>
                                        <th scope="col" class="th-fixed">Message contains</th>
                                        <th scope="col" class="th-fixed">Response</th>
                                        <th scope="col" class="th-fixed">Attachment</th>
                                        <th scope="col" class="th-fixed"><i class="far fa-plus-square fa-lg cursorr openNewAutoRespondNormalForm"></i></th>
                                    </tr>
                                </thead>
                                <tbody id="normal-tbody"></tbody>
                            </table>
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-12">
                        <div class="table-responsive">
                            <table class="table endorse-table">
                                <thead>
                                    <tr>
                                        <th scope="col"></th>
                                        <th scope="col">Message contains (Endorse)</th>
                                        <th scope="col">Skills</th>
                                        <th scope="col">Response</th>
                                        <th scope="col">Attachment</th>
                                        <th scope="col"></th>
                                    </tr>
                                </thead>
                                <tbody id="endorse-tbody"></tbody>
                            </table>
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-12">
                        <div class="table-responsive">
                            <table class="table followup-table">
                                <thead>
                                    <tr>
                                        <th scope="col"></th>
                                        <th scope="col">Follow up message</th>
                                        <th scope="col">Attachment</th>
                                        <th scope="col"></th>
                                    </tr>
                                </thead>
                                <tbody id="followup-tbody"></tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-primary btn-lg shadow-none start-ar-automation">Start</button>
                <button type="button" class="btn btn-outline-secondary btn-lg shadow-none" data-dismiss="modal">Close</button>
            </div>
        </div>
    </div>
</div>
`;

$('body').append(autoresponseList)
$('body').on('click', '#auto-respond-menu-click', function(){
    if ($('#accessCheck').val() == 401) {
        $('.modal-body').html('<h5><center><strong> UNAUTHORISED </strong></center></h5>')
    }
    $('#autoresponseList').modal({backdrop:'static', keyboard:false, show:true})
})

/**
 * Open newautorespondNormalForm
 */
$('body').on('click','.openNewAutoRespondNormalForm',function() {
    $('#autoresponseList').modal('hide')
    $('#keywords-elem').show()
    $('#endorse-skill-elem').hide()
    // clear fields text
    $('#ar-normal-keywords').val('')
    $('#ar-normal-message').val('')
    $('#ar-normal-image').val('')
    $('#ar-normal-file').val('')
    $('.create-ar-normal').show()
    $('.update-ar-normal').hide()
    $(`#lkm-arm-image-uploads`).empty()
    $(`#lkm-arm-file-uploads`).empty()

    // append AI content to dropdown
    helper.setAIContentToDropdown('ar-normal-aicontent')

    $('#autoRespondNormalForm').modal({backdrop:'static', keyboard:false, show:true})
})

const setAutoRespondMessagesList = () => {
    let displayNormal = '', displayEndorse = '', displayFollowup = '';
    let normal = autoRespondMessages.normal
    let endorsement = autoRespondMessages.endorsement
    let followup = autoRespondMessages.followup
    $('#normal-tbody').empty()
    $('#endorse-tbody').empty()
    $('#followup-tbody').empty()

    $.each(normal, function(i,item) {
        displayNormal = `
        <tr class="normal-response-${item.id}">
            <td>
                <input type="checkbox" 
                id="ar-normal-check-${item.id}" 
                class="check-field shadow-none ar-normal-check"
                name="ar-normal-check"
                data-id="${item.id}">
                <label for="ar-normal-check-${item.id}" style="margin-bottom: 5rem;"></label>
            </td>
            <td title="${item.message_keywords}">${helper.truncateString(item.message_keywords, 20)}</td>
            <td title="${item.message_body}">${helper.truncateString(item.message_body, 20)}</td>
            <td>${helper.toJson(item.attachement).status}</td>
            <td>
                <i class="far fa-edit cursorr edit-response" 
                data-id="${item.id}" 
                data-type="normal"
                style="margin-right: 8px;"></i>
                <i class="far fa-trash-alt cursorr delete-normal-response" data-id="${item.id}"></i>
            </td>
        </tr>
        `;
        $('#normal-tbody').append(displayNormal)
    })

    // Endorsement
    if(Object.keys(endorsement).length) {
        displayEndorse = `
        <tr>
            <td>
                <input type="checkbox" 
                id="ar-endorsement-check" 
                class="check-field shadow-none ar-endorsement-check"
                name="ar-endorsement-check"
                data-id="${endorsement.id}">
                <label for="ar-endorsement-check" style="margin-bottom: 5rem;"></label>
            </td>
            <td title="${endorsement.message_body}">${helper.truncateString(endorsement.message_keywords, 20)}</td>
            <td>${endorsement.total_endorse_skills}</td>
            <td title="${endorsement.message_body}">${helper.truncateString(endorsement.message_body, 20)}</td>
            <td>${helper.toJson(endorsement.attachement).status}</td>
            <td>
                <i class="far fa-edit cursorr edit-response" data-id="${endorsement.id}" data-type="endorsement"></i>
            </td>
        </tr>
        `
        $('#endorse-tbody').append(displayEndorse)
    }

    // Followup
    if(Object.keys(followup).length) {
        displayFollowup = `
        <tr>
            <td>
                <input type="checkbox" 
                id="ar-followup-check" 
                class="check-field shadow-none ar-followup-check"
                name="ar-followup-check"
                data-id="${followup.id}">
                <label for="ar-followup-check" 
                style="margin-bottom:5rem;color:#0A66C2;"></label>
            </td>
            <td title="${followup.message_body}">${helper.truncateString(followup.message_body, 65)}</td>
            <td>${helper.toJson(followup.attachement).status}</td>
            <td>
                <i class="far fa-edit cursorr edit-response" data-id="${followup.id}" data-type="followup"></i>
            </td>
        </tr>
        `;
        $('#followup-tbody').append(displayFollowup)
    }
}

/**
 * Edit auto response
 */
$('body').on('click','.edit-response',function() {
    let messageType = $(this).data('type')
    let id = $(this).data('id')

    switch (messageType) {
        case 'normal':
            for (let item of autoRespondMessages.normal) {
                if(item.id === id) {
                    autoRespondMessage = item
                    setFileForAutoresponse(item.attachement)
                    break;
                }
            }
            $('#ar-normal-keywords').val(autoRespondMessage.message_keywords)
            $('#ar-normal-message').val(autoRespondMessage.message_body)
            $('#keywords-elem').show()
            $('#endorse-skill-elem').hide()
            break;

        case 'endorsement':
            $('#ar-normal-keywords').val(autoRespondMessages.endorsement.message_keywords)
            $('#ar-normal-message').val(autoRespondMessages.endorsement.message_body)
            $('#ar-totalSkills').val(autoRespondMessages.endorsement.total_endorse_skills)
            $('#keywords-elem').show()
            $('#endorse-skill-elem').show()
            setFileForAutoresponse(autoRespondMessages.endorsement.attachement)
            break;

        case 'followup':
            $('#ar-normal-message').val(autoRespondMessages.followup.message_body)
            $('#keywords-elem').hide()
            $('#endorse-skill-elem').hide()
            setFileForAutoresponse(autoRespondMessages.followup.attachement)
            break;
    
        default:
            break;
    }

    $('#autoresponseList').modal('hide')
    $('#ar-update-id').val(id)
    $('#ar-message-type').val(messageType)
    $('.create-ar-normal').hide()
    $('.update-ar-normal').show()
    
    // append AI content to dropdown
    helper.setAIContentToDropdown('ar-normal-aicontent')

    $('#autoRespondNormalForm').modal({backdrop:'static', keyboard:false, show:true})
})

$('body').on('click','.delete-normal-response',function() {
    let id = $(this).data('id')
    deleteAutoRespondMessages(id)
})

/**
 * Start automated response
 */
$('body').on('click','.start-ar-automation',function() {
    let endorementInputCheck = $('.ar-endorsement-check'),
        followupInputCheck = $('.ar-followup-check');
    let normalId = null

    arActionCall = []
    normalChecked = []

    $.each($("input[name='ar-normal-check']:checked"), function() {
        normalId = $(this).data('id')

        $.each(autoRespondMessages.normal, function(item) {
            if(parseInt(normalId) == item.id) normalChecked.push(item);
        })
    });

    if(normalChecked.length) {
        arActionCall.push('NORMAL')
    }

    if(endorementInputCheck.prop('checked')) {
        let id = endorementInputCheck.data('id')
        arActionCall.push('ENDORSEMENT')
    }

    if(followupInputCheck.prop('checked')) {
        let id = followupInputCheck.data('id')
        arActionCall.push('FOLLOWUP')
    }

    if(arActionCall.length) {
        $('#autoresponse-notice').append('Scanning. Please wait...')
        $('.autoresponse-notice-elem').show()
        $('.start-ar-automation').attr('disabled', true)
        getMessageConversations()
    }
})

function setFileForAutoresponse(attachement) {
    // Set file if exists
    let getArmStore = JSON.parse(localStorage.getItem("lkm-arm"))
    attachement = JSON.parse(attachement)
    let display = ''

    if(getArmStore.uploads.length && attachement.status == true) {
        $(`#lkm-arm-image-uploads`).empty()
        $(`#lkm-arm-file-uploads`).empty()
        autoResponseModel.attachement.image = []
        autoResponseModel.attachement.file = []
        
        for(const [i, item] of getArmStore.uploads.entries()) {
            var blob = item.reference.string.split('/')[3]

            if(attachement.image.split(',').includes(blob)) {
                display = `
                    <li class="list-group-item d-flex justify-content-between">
                        <div>${item.name}</div>
                        <button class="close text-black cursorr lkm-arm-remove-upload" 
                            data-index="${i}"
                            data-module="lkm-arm"
                            data-bob="${blob}">
                                &times;
                        </button>
                    </li>
                `;
                $(`#lkm-arm-image-uploads`).append(display)
                autoResponseModel.attachement.image.push(blob)
            }

            if(attachement.file.split(',').includes(blob)) {
                display = `
                    <li class="list-group-item d-flex justify-content-between">
                        <div>${item.name}</div>
                        <button class="close text-black cursorr lkm-arm-remove-upload" 
                            data-index="${i}"
                            data-module="lkm-arm"
                            data-bob="${blob}">
                                &times;
                        </button>
                    </li>
                `;
                $(`#lkm-arm-file-uploads`).append(display)
                autoResponseModel.attachement.file.push(blob)
            }
        }
    }
}