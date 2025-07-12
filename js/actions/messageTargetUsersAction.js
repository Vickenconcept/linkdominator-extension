
$('.messageTargetUserAction').click(function(){
    $('#displayMessageTargetStatus').empty()
    var mtuStartP = $('#mtu-startPosition'),
        mtuTotal = $('#mtu-totalMessageConnect'),
        mtuDelay = $('#mtu-delayTime'),
        mtuMessage = $('#mtu-personalMessage'),
        mtuConnectionIds = [];
    var mtuconnectnId = '',
        mturegionId = '',
        mtucurrCompId = '',
        mtupastCompId = '',
        mtuindustryId = '',
        mtuschoolId = '',
        mtulangId='';
    var mtuControlFiels = [mtuDelay,mtuTotal,mtuMessage];

    var queryParams = '';
    
    // validate fields
    if(mtuTotal.val() =='' || mtuDelay.val() =='' || mtuMessage.val() ==''){
        for(var i=0;i<mtuControlFiels.length;i++){
            if(mtuControlFiels[i].val() == ''){
                $('#mtu-error-notice').html(`${mtuControlFiels[i].data('name')} field cannot be empty`)
            }
        }
    }else if(mtuDelay.val() < 30){
        $('#mtu-error-notice').html(`Delay minimum is 30`)
    }else{
        $('#mtu-error-notice').html(``)

        // check if value exists in exclude connection list dropdown
        if($('#mtu-selectedExConnect li').length > 0){
            $('#mtu-selectedExConnect li').each(function(index) {
                mtuConnectionIds.push($(this).data('connectionid'))
            });
        }

        // check if value exists in accordion list dropdown
        if($('#mtu-selectedConnectOf li').length > 0){
            queryParams += setFIlterQueryParams('#mtu-selectedConnectOf','connectionid','connectionOf')
        }
        if($('#mtu-selectedLocation li').length > 0){
            queryParams += setFIlterQueryParams('#mtu-selectedLocation','regionid','geoUrn')
        }
        if($('#mtu-selectedSchool li').length > 0){
            queryParams += setFIlterQueryParams('#mtu-selectedSchool','schoolid','schoolFilter')
        }
        if($('#mtu-selectedCurrComp li').length > 0){
            queryParams += setFIlterQueryParams('#mtu-selectedCurrComp','currcompid','currentCompany')
        }
        if($('#mtu-selectedPastComp li').length > 0){
            queryParams += setFIlterQueryParams('#mtu-selectedPastComp','pastcompid','pastCompany')
        }
        if($('#mtu-selectedIndustry li').length > 0){
            queryParams += setFIlterQueryParams('#mtu-selectedIndustry','industryid','industry')
        }
        if($('#mtu-selectedLanguage li').length > 0){
            queryParams += setFIlterQueryParams('#mtu-selectedLanguage','langcode','profileLanguage')
        }

        mtuTotal = mtuTotal.val() < 10 ? 10 : mtuTotal.val()
        mtuStartP = mtuStartP.val() == '' ? 0 : mtuStartP.val()

        // var mtusearchTerm = $('#mtu-search-term').val()
        if($('#mtu-firstName').val())
            queryParams += setFIlterQueryParamsFreeText('#mtu-firstName','firstName')
        if($('#mtu-lastName').val())
            queryParams += setFIlterQueryParamsFreeText('#mtu-lastName','lastName')
        if($('#mtu-school').val())
            queryParams += setFIlterQueryParamsFreeText('#mtu-school','schoolFreetext')
        if($('#mtu-title').val())
            queryParams += setFIlterQueryParamsFreeText('#mtu-title','title')
        if($('#mtu-company').val())
            queryParams += setFIlterQueryParamsFreeText('#mtu-company','company')

        $(this).attr('disabled', true)  

        if($('#mtu-selectAudience').val() == '') {
            if($('#mtu-search-term').val())
                query = `(keywords:${encodeURIComponent($('#mtu-search-term').val())},flagshipSearchIntent:SEARCH_SRP,queryParameters:(${queryParams}resultType:List(PEOPLE)),includeFiltersInResponse:false)`;
            else 
                query = `(flagshipSearchIntent:SEARCH_SRP,queryParameters:(${queryParams}resultType:List(PEOPLE)),includeFiltersInResponse:false)`;

            mtuGetConnections(query,mtuStartP,mtuTotal,mtuDelay.val(),mtuMessage.val(),mtuConnectionIds)
        }else{
            let audience = parseInt($('#mtu-selectAudience').val());

            mtuGetAudienceData(mtuMessage.val(), mtuDelay.val(), audience);
        }
    }
})

const mtuGetConnections = async (queryParams,mtuStartP,mtuTotal,mtuDelay,mtuMessage,mtuConnectionIds) => {
    $('.message-target-notice').show()
    $('#displayMessageTargetStatus').empty()
    $('#displayMessageTargetStatus').html('Scanning. Please wait...')
    let messageItems = [], totalResultCount = 0;

    let getConnectionsLooper = () => {
        setTimeout(async () => {
            await $.ajax({
                method: 'get',
                beforeSend: function(request) {
                    request.setRequestHeader('csrf-token', jsession);
                    request.setRequestHeader('accept', 'application/vnd.linkedin.normalized+json+2.1');
                    request.setRequestHeader('content-type', contentType);
                    request.setRequestHeader('x-li-lang', xLiLang);
                    request.setRequestHeader('x-li-page-instance', 'urn:li:page:d_flagship3_search_srp_people;QazGJ/pNTwuq6OTtMClfPw==');
                    request.setRequestHeader('x-li-track', JSON.stringify({"clientVersion":"1.10.1335","osName":"web","timezoneOffset":1,"deviceFormFactor":"DESKTOP","mpName":"voyager-web"}));
                    request.setRequestHeader('x-restli-protocol-version', xRestliProtocolVersion);
                },
                url: `${voyagerBlockSearchUrl}&query=${queryParams}&start=${mtuStartP}`,
                success: function(data) {
                    let res = {'data': data}
                    let elements = res['data'].data.elements

                    if(elements.length) {
                        if(totalResultCount == 0)
                            totalResultCount = res['data'].data.metadata.totalResultCount

                        if(elements[1].items.length) {
                            for(let item of elements[1].items) {
                                messageItems.push(item)
                            }

                            if(messageItems.length < mtuTotal) {
                                mtuStartP = parseInt(mtuStartP) + 11
                                $('#mtu-startPosition').val(mtuStartP)
                                getConnectionsLooper()
                            }else {
                                mtuCleanConnectionsData(messageItems,totalResultCount,mtuDelay,mtuMessage,mtuConnectionIds)
                            }
                        }else if(!elements[1].items.length && !messageItems.length) {
                            $('#displayMessageTargetStatus').html('No result found, change your search criteria and try again!')
                            $('.messageTargetUserAction').attr('disabled', false)
                        }else if(!elements[1].items.length && messageItems.length) {
                            $('#displayMessageTargetStatus').html(`Found ${messageItems.length}. Messaging...`)
                            mtuCleanConnectionsData(messageItems,totalResultCount,mtuDelay,mtuMessage,mtuConnectionIds)
                        }

                    }else if(messageItems.length) {
                        $('#displayMessageTargetStatus').html(`Found ${messageItems.length}. Messaging...`)
                        mtuCleanConnectionsData(messageItems,totalResultCount,mtuDelay,mtuMessage,mtuConnectionIds)
                    }else {
                        $('#displayMessageTargetStatus').html('No result found, change your search criteria and try again!')
                        $('.messageTargetUserAction').attr('disabled', false)
                    }
                },
                error: function(error){
                    console.log(error)
                    $('#displayMessageTargetStatus').html('Something went wrong while trying to get connections!')
                    $('.messageTargetUserAction').attr('disabled', false)
                }
            })
        },10000)
    }
    getConnectionsLooper()
}

const mtuCleanConnectionsData = (messageItems,totalResultCount,mtuDelay,mtuMessage,mtuConnectionIds) => {
    let conArr = [], totalMessage = [];
    let newConArr, profileUrn;
    let getMtuStore = JSON.parse(localStorage.getItem('lkm-mtu'));

    // update store params
    if($('#mtu-startPosition').val()) {
        getMtuStore.position = parseInt($('#mtu-startPosition').val())
    }
    if($('#mtu-totalMessageConnect').val()) {
        getMtuStore.total = parseInt($('#mtu-totalMessageConnect').val())
    }
    if($('#mtu-delayTime').val()) {
        getMtuStore.delay = parseInt($('#mtu-delayTime').val())
    }
    localStorage.setItem('lkm-mtu', JSON.stringify(getMtuStore))

    for(let item of messageItems) {
        profileUrn = item.itemUnion['*entityResult']
        if(profileUrn.includes('urn:li:fsd_entityResultViewModel:(urn:li:fsd_profile:') && 
            profileUrn.includes(',SEARCH_SRP,DEFAULT)')) {

            profileUrn = profileUrn.replace('urn:li:fsd_entityResultViewModel:(urn:li:fsd_profile:','')
            profileUrn = profileUrn.replace(',SEARCH_SRP,DEFAULT)','')

            conArr.push({
                conId: profileUrn,
                totalResultCount: totalResultCount
            })			
        }
    }

    // exclude connection if connectid exist in conArr
    if(mtuConnectionIds.length > 0){
        const namesToDeleteSet = new Set(mtuConnectionIds);
        newConArr = conArr.filter((conArr) => {
            return !namesToDeleteSet.has(conArr.conId);
          });
    }else{
        newConArr = conArr;
    }

    // get only user defined total
    for(let z=0;z<newConArr.length;z++) {
        if(z < parseInt($('#mtu-totalMessageConnect').val())) {
            totalMessage.push(newConArr[z])
        }else{
            break;
        }
    }

    mtuGetProfileInfo(mtuMessage, mtuDelay, totalMessage)
}

const mtuGetAudienceData = async (mtuMessage, mtuDelay, audience) => {
    var conArr = [];

    await $.ajax({
        method: 'get',
        url: `${filterApi}/audience/list?audienceId=${audience}&totalCount=${$('#mtu-totalMessageConnect').val()}`,
        success: function(data){
            if(data.length > 0){
                var dataPath = data[0].audience;
                if(dataPath.length > 0){
                    for(let i=0; i<dataPath.length; i++){

                        if(dataPath[i].con_distance != null){
                            var netDistance = dataPath[i].con_distance.split("_")
                        }
                        var targetIdd;
                        if(dataPath[i].con_member_urn.includes('urn:li:member:')){
                            targetIdd = dataPath[i].con_member_urn.replace('urn:li:member:','') 
                        }
                        // if(parseInt(netDistance[1]) == 1){
                            conArr.push({
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
                        // }
                    }
                    if(conArr.length > 0){
                        mtuSendMessageToConnection(mtuMessage, mtuDelay, conArr)
                    }else{
                        $('.message-target-notice').show()
                        $('#displayMessageTargetStatus').empty()
                        $('#displayMessageTargetStatus').html('No 1st degree Connections.<br> Messages can only be sent to first degree connections')
                        $('.messageTargetUserAction').attr('disabled', false)
                    }
                }else{
                    $('.message-target-notice').show()
                    $('#displayMessageTargetStatus').empty()
                    $('#displayMessageTargetStatus').html('No data found!')
                    $('.messageTargetUserAction').attr('disabled', false)
                }
            }
        },
        error: function(error){
            console.log(error)
            $('#displayMessageTargetStatus').html(error.responseJSON.code)
            $('.messageTargetUserAction').attr('disabled', false)
        }
    })
}

const mtuGetProfileInfo = (mtuMessage, mtuDelay, totalMessage) => {
    $('#displayMessageTargetStatus').html('Getting connection info. Please wait...')
    let profileInfos = [], i = 0;

    let gciLooper = () => {
        setTimeout(async () => {
            await $.ajax({
                method: 'get',
                beforeSend: function(request) {
                    request.setRequestHeader('csrf-token', jsession);
                    request.setRequestHeader('accept', acceptVnd);
                    request.setRequestHeader('content-type', contentType);
                    request.setRequestHeader('x-li-lang', xLiLang);
                    request.setRequestHeader('x-li-page-instance', 'urn:li:page:d_flagship3_feed;kk0zM9LQRYi/in3qM6Bi5w==');
                    request.setRequestHeader('x-li-track', JSON.stringify({"clientVersion":"1.10.3070","osName":"web","timezoneOffset":1,"deviceFormFactor":"DESKTOP","mpName":"voyager-web"}));
                    request.setRequestHeader('x-restli-protocol-version', xRestliProtocolVersion);
                },
                url: `${voyagerApi}/identity/profiles/${totalMessage[i].conId}/profileContactInfo`,
                success: function(data) {
                    var resp = {'data': data};
                    var distance = 2

                    if (resp['data'].data) {
                        if(resp['data'].data.hasOwnProperty('connectedAt') && resp['data'].data.connectedAt)
                            distance = 1
                        else
                            distance = 2
                        
                        let profileViewCall = async () => {
                            await $.ajax({
                                method: 'get',
                                async: false,
                                beforeSend: function(request) {
                                    request.setRequestHeader('csrf-token', jsession);
                                },
                                url: `${voyagerApi}/identity/profiles/${totalMessage[i].conId}/profileView`,
                                success: function(data) {
                                    var res = {'data': data}

                                    if(res['data'].profile.entityUrn) {
                                        profileInfos.push({
                                            name: res['data'].profile.firstName +' '+  res['data'].profile.lastName,
                                            firstName: res['data'].profile.firstName,
                                            lastName: res['data'].profile.lastName,
                                            conId: totalMessage[i].conId,
                                            netDistance: distance,
                                        })
                                    }
                                }
                            })
                        }
                        profileViewCall()
                    }
                }
            })
            i++;
            if(i < totalMessage.length) 
                gciLooper();
            else 
                mtuSendMessageToConnection(mtuMessage, mtuDelay, profileInfos);
        }, 30000)
    }
    gciLooper()
}

// var timeOutMsgTargetUsers;
// const mtuSendMessage = async (mtuMessage, mtuDelay, totalMessage) => {
//     var displayLi = '', i = 0, x= 0, newMessage = '', displayAutomationRecord = '';
//     let getMtuStore = JSON.parse(localStorage.getItem('lkm-mtu'));

//     $('.message-target-notice').show()

//     // automation table data setup
//     displayAutomationRecord = `
//         <tr id="message-targeted-users-record">
//             <td>Message Targeted Users</td>
//             <td id="mtu-status">Running</td>
//             <td>${totalMessage.length}</td>
//             <td id="mtu-numbered">0/${totalMessage.length}</td>
//             <td id="mtu-bot-action" title="Stop automation"><i class="far fa-dot-circle fa-lg text-danger cursorr"></i></td>
//             <td id="mtu-remained-time">${remainedTime(mtuDelay,totalMessage.length)}</td>
//         </tr>
//     `;
//     $('#no-job').hide()
//     $('#automation-list').append(displayAutomationRecord)
    

//     var mtuLooper = () => {
//         timeOutMsgTargetUsers = setTimeout(async function(){
//             newMessage = changeMessageVariableNames(mtuMessage, totalMessage[i])

//             await $.ajax({
//                 method: 'post',
//                 beforeSend: function(request) {
//                     request.setRequestHeader('csrf-token', jsession);
//                     request.setRequestHeader('accept', accept);
//                     request.setRequestHeader('content-type', contentType);
//                     request.setRequestHeader('x-li-lang', xLiLang);
//                     request.setRequestHeader('x-li-page-instance', xLiPageInstance);
//                     request.setRequestHeader('x-li-track', JSON.stringify(xLiTrack));
//                     request.setRequestHeader('x-restli-protocol-version', xRestliProtocolVersion);
//                 },
//                 url: `${voyagerApi}/messaging/conversations?action=create`,
//                 data: JSON.stringify({ 
//                     conversationCreate: {
//                         eventCreate: {
//                             value: {
//                                 'com.linkedin.voyager.messaging.create.MessageCreate' : {
//                                     attachments: getMtuStore.uploads.length ? getMtuStore.uploads : [],
//                                     body: newMessage, // message
//                                 }
//                             }
//                         },
//                         recipients: [totalMessage[i].conId],
//                         subtype: totalMessage[i].netDistance == 1 ? "MEMBER_TO_MEMBER" : "INMAIL"
//                     }
//                 }),
//                 success: function(data){
//                     if(data.value.createdAt){
//                         let conversationUrnId = data.value.backendEventUrn.replace('urn:li:messagingMessage:','')

//                         sendDeliveryAcknowledgement(conversationUrnId)

//                         $('#displayMessageTargetStatus').empty()
//                         displayLi = `
//                             <li>Message sent to: <b>${totalMessage[i].name}</b></li>
//                             <li>Total message sent: <b>${x +1}</b></li>
//                         `;
//                         $('#displayMessageTargetStatus').append(displayLi)

//                         // update automation count done and time remained
//                         $('#mtu-numbered').text(`${x +1}/${totalMessage.length}`)
//                         $('#mtu-remained-time').text(`${remainedTime(mtuDelay, totalMessage.length - (x +1))}`)

//                         if($('#mtu-viewProfile').prop('checked') == true){
//                             // mtuViewProfile(totalMessage[i])
//                         }
//                         x++;

//                     }else{
//                         $('#displayMessageTargetStatus').empty()
//                         $('#displayMessageTargetStatus').html('Something went wrong. Please try again')
//                         $('.messageTargetUserAction').attr('disabled', false)
//                     }
//                 },
//                 error: function(error){
//                     console.log(error)
//                     let notice = '';
//                     let msg = '';

//                     if(error.responseJSON.status){
//                         if(error.responseJSON.message){
//                             notice = error.responseJSON.message
//                         }else{
//                             notice = error.responseJSON.code
//                         }
//                         msg = `Message not sent.
//                             <br/>Reason: ${notice} <br/>
//                             Message inbox might be locked or user is not a 1st degree connection.
//                         `;
//                     }else {
//                         msg = ''
//                     }
                    
//                     $('#displayMessageTargetStatus').empty()
//                     $('#displayMessageTargetStatus').html(msg)
//                     $('.messageTargetUserAction').attr('disabled', false)
//                 }
//             })
//             i++;
//             if(i < totalMessage.length)
//                 mtuLooper()
//             if(i >= totalMessage.length){
//                 $('.messageTargetUserAction').attr('disabled', false)

//                 let module = 'Message sent';
//                 sendStats(x, module)

//                 if($('#mtu-viewProfile').prop('checked') == true){
//                     let module = 'Profile viwed';
//                     sendStats(x, module)
//                 }

//                 // update automation status
//                 $('#mtu-status').text('Completed')
//                 setTimeout(function(){
//                     $('#message-targeted-users-record').remove()
//                 }, 5000)
//             }
//         }, mtuDelay*1000)
//     }
//     mtuLooper()
// }

const mtuSendMessageToConnection = async (mtuMessage, mtuDelay, totalMessage) => {
    var displayLi = '', displayAutomationRecord = '';
    let x = 0
    let getMtuStore = JSON.parse(localStorage.getItem('lkm-mtu'));
    let params = {}
    $('.message-target-notice').show()
    // automation table data setup
    displayAutomationRecord = `
        <tr id="message-targeted-users-record">
            <td>Message Targeted Users</td>
            <td id="mtu-status">Running</td>
            <td>${totalMessage.length}</td>
            <td id="mtu-numbered">0/${totalMessage.length}</td>
            <td id="mtu-bot-action" title="Stop automation"><i class="far fa-dot-circle fa-lg text-danger cursorr"></i></td>
            <td id="mtu-remained-time">${remainedTime(mtuDelay,totalMessage.length)}</td>
        </tr>
    `;
    $('#no-job').hide()
    $('#automation-list').append(displayAutomationRecord)

    for(const [i, item] of totalMessage.entries()) {
        params['message'] = mtuMessage
        params['name'] = totalMessage[i].name
        params['firstName'] = totalMessage[i].firstName
        params['lastName'] = totalMessage[i].lastName
        params['distance'] = totalMessage[i].netDistance
        params['connectionId'] = totalMessage[i].conId
        params['attachement'] = getMtuStore.uploads.length ? getMtuStore.uploads : []

        sendMessageToConnection(params, function(result) {
            $('#displayMessageTargetStatus').empty()

            if(result.status == 'successful') {
                displayLi = `
                    <li>Message sent to: <b>${totalMessage[i].name}</b></li>
                    <li>Total message sent: <b>${i +1}</b></li>
                `;
                $('#displayMessageTargetStatus').html(displayLi)

                // update automation count done and time remained
                $('#mtu-numbered').text(`${i +1}/${totalMessage.length}`)
                $('#mtu-remained-time').text(`${remainedTime(mtuDelay, totalMessage.length - (i +1))}`)
                x++;
            }else {
                $('#displayMessageTargetStatus').html(result.message)
                $('.messageTargetUserAction').attr('disabled', false)
            }
        })
        await sleep(mtuDelay*1000)
    }
    $('.messageTargetUserAction').attr('disabled', false)
    // update automation status
    $('#mtu-status').text('Completed')
    setTimeout(() => {
        $('#message-targeted-users-record').remove()
    },5000)
    sendStats(x, 'Message sent')
}

const mtuViewProfile = async (totalMessage) => {
    await $.ajax({
        method: 'post',
        beforeSend: function(request) {
            request.setRequestHeader('csrf-token', jsession);
            request.setRequestHeader('content-type', 'application/json');
        },
        url: `${LINKEDIN_URL}/li/track`,
        data: JSON.stringify([{
            eventBody: {
                entityView: {
                    targetId: totalMessage.targetId,
                    viewType: "profile-view",
                    viewerId: parseInt($('#me-plainId').val())
                },
                header: {
                    clientApplicationInstance: {
                        applicationUrn: "urn:li:application:(voyager-web,voyager-web)",
                        trackingId: [115, -68, -55, -67, 121, 34, 64, 122, -102, -63, 39, 86, 88, 27, 112, 104],
                        version: "1.10.1648"
                    },
                    pageInstance: {
                        pageUrn: "urn:li:page:d_flagship3_profile_view_base",
                        trackingId: totalMessage.trackingId
                    },
                    time: dInt
                },
                networkDistance: totalMessage.networkDistance,
                profileTrackingId: totalMessage.trackingId,
                requestHeader: {
                    interfaceLocale: "en_US",
                    pageKey: "d_flagship3_profile_view_base",
                    path: totalMessage.navigationUrl,
                    referer: LINKEDIN_URL,
                    trackingCode: "d_flagship3_feed"
                },
                vieweeMemberUrn: totalMessage.memberUrn,
                viewerPrivacySetting: "F",
            },
            eventInfo: {
                appId: "com.linkedin.flagship3.d_web",
                eventName: "ProfileViewEvent",
                topicName: "ProfileViewEvent"
            }
        }]),
        success: function(data){
            
        },
        error: function(error){
            console.log(error)
            $('.endorseConnectionAction').attr('disabled', false)
        }
    })
}

// stop automation 
$('body').on('click','#mtu-bot-action',function(){
    clearTimeout(timeOutMsgTargetUsers);
    $('#mtu-status').text('Stopped')
    $('.messageTargetUserAction').attr('disabled', false)
    setTimeout(function(){
        $('#message-targeted-users-record').remove()
    }, 5000)
})