let audienceList = []
let aicontents = []
let attachements = []

/**
 * Get saved audience list.
 * @param {integer} audienceId 
 * @param {integer} total 
 */
const getAudience = (audienceId, total, filterApi, callback) => {
    fetch(`${filterApi}/audience/list?audienceId=${audienceId}&totalCount=${total}`)
        .then(res => res.json() )
        .then(res => {
            if(res.length > 0) {
                let dataPath = res[0].audience
                let netDistance;
                let targetIdd;
    
                if(dataPath.length > 0) {
                    audienceList = []
                    
                    for(let i=0; i<dataPath.length; i++){
        
                        if(dataPath[i].con_distance != null){
                            netDistance = dataPath[i].con_distance.split("_")
                        }
            
                        if(dataPath[i].con_member_urn.includes('urn:li:member:')){
                            targetIdd = dataPath[i].con_member_urn.replace('urn:li:member:','') 
                        }
            
                        audienceList.push({
                            name: dataPath[i].con_first_name+' '+dataPath[i].con_last_name,
                            firstName: dataPath[i].con_first_name,
                            lastName: dataPath[i].con_last_name,
                            title: dataPath[i].con_job_title,
                            conId: dataPath[i].con_id,
                            totalResultCount: dataPath.length,
                            publicIdentifier: dataPath[i].con_public_identifier, 
                            memberUrn: dataPath[i].con_member_urn,
                            networkDistance: parseInt(netDistance[1]),
                            trackingId: dataPath[i].con_tracking_id, 
                            navigationUrl: `${LINKEDIN_URL}/in/${dataPath[i].con_public_identifier}`, 
                            targetId: parseInt(targetIdd),
                            netDistance: parseInt(netDistance[1]),
                        })
                    }
                }
                callback({'status':'successful'})
            }
        })
        .catch((err, textStatus, responseText) => {
            // console.log(err)
            callback({'status':'failed', 'message': err.toString()})
        })
}

/**
 * Send message to connection.
 */
const sendMessage = async (voyagerApi=null) => {
    try {
        arConnectionModel.message = changeMessageVariableNames(arConnectionModel.message, arConnectionModel)

        let url = ''
        let conversationObj = {}
        let messageEvent = {
            value: {
                'com.linkedin.voyager.messaging.create.MessageCreate' : {
                    attachments: attachements.length ? attachements : [],
                    body: arConnectionModel.message,
                    attributedBody: {"text": arConnectionModel.message, "attributes": []},
                    mediaAttachments: [],
                }
            }
        }

        if(arConnectionModel.conversationUrnId) {
            url = `${voyagerApi}/messaging/conversations/${arConnectionModel.conversationUrnId}/events?action=create`
            conversationObj = {
                eventCreate: messageEvent
            }
        }else {
            url = `${voyagerApi}/messaging/conversations?action=create`
            conversationObj = {
                conversationCreate: {
                    eventCreate: messageEvent,
                    recipients: [arConnectionModel.connectionId],
                    subtype: arConnectionModel.distance == 1 ? "MEMBER_TO_MEMBER" : "INMAIL"
                }
            }
        }

        await $.ajax({
            method: 'post',
            beforeSend: function(req) {
                req.setRequestHeader('csrf-token', jsession);
                req.setRequestHeader('accept', accept);
                req.setRequestHeader('content-type', contentType);
                req.setRequestHeader('x-li-lang', xLiLang);
                req.setRequestHeader('x-li-page-instance', xLiPageInstance);
                req.setRequestHeader('x-li-track', JSON.stringify(xLiTrack));
                req.setRequestHeader('x-restli-protocol-version', xRestliProtocolVersion);
            },
            url: url,
            data: JSON.stringify(conversationObj),
            success: function(res) {
                if(!res.value.createdAt) {
                    $('#autoresponse-notice').html('Message not sent!')
                    $('.start-ar-automation').attr('disabled', false)
                }
            },
            error: function(err, textStatus) {
                // if(err.hasOwnProperty('responseJSON'))
                //     console.log(err.responseJSON.message);
                // else console.log(textStatus);

                let notice = '', msg = '';

                if(err.responseJSON.status) {
                    if(err.responseJSON.message)
                        notice = err.responseJSON.message
                    else
                        notice = err.responseJSON.code
                    
                    msg = `Message not sent.
                        <br/>Reason: ${notice} <br/>
                        Message inbox might be locked.<br/>
                        Not a 1st degree connection.
                    `;
                }else {
                    msg = ''
                }

                throw msg
            }
        })
    } catch(error) {
        throw error
    }
}

/**
 * For all modules minus service worker and auto response
 * @param {Object} params 
 */
const sendMessageToConnection = (params, callback) => {
    let message = changeMessageVariableNames(params.message, params)
    let url = ''
    let conversationObj = {}
    let messageEvent = {
        value: {
            'com.linkedin.voyager.messaging.create.MessageCreate' : {
                attachments: params.attachement,
                body: message,
                attributedBody: {"text": message, "attributes": []},
                mediaAttachments: [],
            }
        }
    }

    if(params.hasOwnProperty('conversationUrnId') && params.conversationUrnId) {
        url = `${voyagerApi}/messaging/conversations/${params.conversationUrnId}/events?action=create`
        conversationObj = {
            eventCreate: messageEvent
        }
    }else {
        url = `${voyagerApi}/messaging/conversations?action=create`
        conversationObj = {
            conversationCreate: {
                eventCreate: messageEvent,
                recipients: [params.connectionId],
                subtype: params.distance == 1 ? "MEMBER_TO_MEMBER" : "INMAIL"
            }
        }
    }

    $.ajax({
        method: 'post',
        beforeSend: function(req) {
            req.setRequestHeader('csrf-token', jsession);
            req.setRequestHeader('accept', accept);
            req.setRequestHeader('content-type', contentType);
            req.setRequestHeader('x-li-lang', xLiLang);
            req.setRequestHeader('x-li-page-instance', xLiPageInstance);
            req.setRequestHeader('x-li-track', JSON.stringify(xLiTrack));
            req.setRequestHeader('x-restli-protocol-version', xRestliProtocolVersion);
        },
        url: url,
        data: JSON.stringify(conversationObj),
        success: function(res) {
            if(!res.value.createdAt) {
                callback({status: 'failed', message: 'Message not sent!'})
            }else{
                let conversationUrnId = res.value.backendEventUrn.replace('urn:li:messagingMessage:','')
                
                sendDeliveryAcknowledgement(conversationUrnId)
                callback({status: 'successful', message: 'Message sent!'})
            }
        },
        error: function(err, statusText, responseText) {
            let notice = '', msg = '';
            if(err.responseJSON.status) {
                if(err.responseJSON.message)
                    notice = err.responseJSON.message
                else
                    notice = err.responseJSON.code
                
                msg = `Message not sent.
                    <br/>Reason: ${notice} <br/>
                    Message inbox might be locked.<br/>
                    Not a 1st degree connection.
                `;
            }else {
                msg = responseText
            }
            callback({status: 'failed', mesaage: msg})
        }
    })
}

/**
 * @param {string} conversationUrnId
 */
const sendDeliveryAcknowledgement = conversationUrnId => {
    let url = `${VOYAGER_API}/voyagerMessagingDashMessengerMessageDeliveryAcknowledgements?action=sendDeliveryAcknowledgement`

    $.ajax({
        method: 'post',
        beforeSend: function(req) {
            req.setRequestHeader('csrf-token', jsession);
            req.setRequestHeader('accept', 'application/json');
            req.setRequestHeader('content-type', 'text/plain;charset=UTF-8');
            req.setRequestHeader('x-li-lang', xLiLang);
            req.setRequestHeader('x-li-page-instance', 'urn:li:page:d_flagship3_profile_view_base;rh3RgoZWQSq5byvkwh5wvA==');
            req.setRequestHeader('x-li-track', JSON.stringify(xLiTrack));
            req.setRequestHeader('x-restli-protocol-version', xRestliProtocolVersion);
        },
        url: url,
        data: JSON.stringify({
            'clientConsumedAt': dInt,
            'clientId': 'voyager-web',
            'deliveryMechanism': 'REALTIME',
            'messageUrns': [
                `urn:li:msg_message:(urn:li:fsd_profile:${profileUrn},${conversationUrnId})`
            ]
        }),
        success: function(data) {},
        error: function(err, textStatus, responseText) {
            console.log(responseText)
        }
    })
}

/**
 * Get AI contents
 */
const getAIContents = () => {
    let url = `${filterApi}/aicontents`

    $.ajax({
        method: 'get',
        beforeSend: function(req) {
            req.setRequestHeader('lk-id', linkedinId);
        },
        url: url,
        success: function(res) {
            aicontents = res.data
        },
        error: function(err, textStatus) {
            if(err.hasOwnProperty('responseJSON'))
                console.log(err.responseJSON.message);
            else console.log(textStatus);
        }
    })
}

/**
 * Upload file
 * @param {Object} file
 * @param {String} noticeElem1
 * @param {String} noticeElem2
 */
const uploadFile = async (file, noticeElem1=null, noticeElem2=null) => {
    try {
        await $.ajax({
            method: 'POST',
            beforeSend: function(req) {
                req.setRequestHeader('csrf-token', jsession);
                req.setRequestHeader('accept', 'application/vnd.linkedin.normalized+json+2.1');
                req.setRequestHeader('content-type', 'application/json; charset=UTF-8');
                req.setRequestHeader('x-li-lang', xLiLang);
                req.setRequestHeader('x-li-page-instance', xLiPageInstance);
                req.setRequestHeader('x-li-track', JSON.stringify(xLiTrack));
                req.setRequestHeader('x-restli-protocol-version', xRestliProtocolVersion);
            },
            url: `${VOYAGER_API}/voyagerVideoDashMediaUploadMetadata?action=upload`,
            cache: true,
            crossDomain: true,
            data: JSON.stringify({
                fileSize: file.size,
                filename: file.name,
                mediaUploadType: file.type.split('/')[0] == 'image' ? 'MESSAGING_PHOTO_ATTACHMENT' : 'MESSAGING_FILE_ATTACHMENT'
            }),
            success: function(data) {
                let res = {'data': data}
                let value = res['data'].data.value

                if(value.hasOwnProperty('singleUploadUrl')) {
                    if(localStorage.getItem(file.module) !== null) {
                        let getStore = JSON.parse(localStorage.getItem(file.module))

                        getStore.uploads.push({
                            'id': value.urn,
                            'name': file.name,
                            'mediaType': file.type,
                            'byteSize': file.size,
                            // 'file': file.fileData,
                            'reference': {
                                'string': file.blobURL
                            }
                        })
                        localStorage.setItem(file.module, JSON.stringify(getStore))

                        setFilesUploadedToList(file.module)

                        $.ajax({
                            url: value.singleUploadUrl,
                            method: 'PUT',
                            beforeSend: function(req) {
                                req.setRequestHeader('csrf-token', jsession);
                                req.setRequestHeader('accept', '*/*');
                            },
                            contentType: false,
                            processData: false,
                            data: file.fileData,
                            success: function(data) {},
                            error: function(err, statusText, responseText) {
                                $(noticeElem1).show()
                                $(noticeElem2).html(responseText)
                            }
                        })
                    }else {
                        $(noticeElem1).show()
                        $(noticeElem2).html('Something went wrong while trying to upload file. please refresh your page and try again')
                    }
                }else {
                    $(noticeElem1).show()
                    $(noticeElem2).html('Something went wrong while trying to upload file. please refresh your page and try again')
                }
            },
            error: function(err, statusText, responseText) {
                $(noticeElem1).show()
                $(noticeElem2).html(responseText)
            }
        })
    } catch (error) {
        console.log(error)
    }
}

/**
 * Remove file data from dataset
 * @param {String} lkmModule 
 * @param {integer} fileIndex 
 */
const removeFile = (lkmModule, fileIndex) => {
    if(localStorage.getItem(lkmModule) !== null) {
        let getStore = JSON.parse(localStorage.getItem(lkmModule))
        let filtered = getStore.uploads.filter((data, i) => i != fileIndex)

        getStore.uploads = []

        for (let f of filtered) {
            getStore.uploads.push(f)
        }
        localStorage.setItem(lkmModule, JSON.stringify(getStore))
    }
}

/**
 * Set uploaded files to list
 * @param {String} lkmModule 
 */
const setFilesUploadedToList = (lkmModule) => {
    let getStore = JSON.parse(localStorage.getItem(lkmModule))
    let display = ''

    $(`#${lkmModule}-image-uploads`).empty()
    $(`#${lkmModule}-file-uploads`).empty()

    if(getStore.uploads.length) {
        $.each(getStore.uploads, function(i, item) {
            display = `
                <li class="list-group-item d-flex justify-content-between">
                    <div>${item.name}</div>
                    <button class="close text-black cursorr ${lkmModule}-remove-upload" 
                        data-index="${i}"
                        data-module="${lkmModule}">
                            &times;
                    </button>
                </li>
            `;

            if(item.mediaType.split('/')[0] === 'image')
                $(`#${lkmModule}-image-uploads`).append(display)
            else 
                $(`#${lkmModule}-file-uploads`).append(display)
        })
    }
}

/**
 * Set form field data from local storage
 * @param {String} lkmModule 
 * @param {Object} formFields 
 */
const setParamsToFormFields = (lkmModule, formFields) => {
    let getStore = JSON.parse(localStorage.getItem(lkmModule))

    if(lkmModule !== 'lkm-bdw') {
        $(formFields.position).val(getStore.position)
        $(formFields.total).val(getStore.total)
    }
    if(lkmModule == 'lkm-mfu') {
        $(formFields.waitdays).val(getStore.waitdays)
    }
    $(formFields.delay).val(getStore.delay)
}

/**
 * Replace message variable names
 * @param {String} message 
 * @param {Object} connectionNames 
 * @returns String
 */
const changeMessageVariableNames = (message, connectionNames) => {
    if(message.includes('@firstName')){
        message = message.replace('@firstName',connectionNames.firstName)
    }
    if(message.includes('@lastName')){
        message = message.replace('@lastName',connectionNames.lastName)
    }
    if(message.includes('@name')){
        message = message.replace('@name',connectionNames.name)
    }
  
    return message;
}