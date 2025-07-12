
$('.messageConnectsAction').click(function(){
    $('#displayMessageConnectsStatus').empty()
    var macStartP = $('#mac-startPosition'),
        macTotal = $('#mac-totalMessage'),
        macDelay = $('#mac-delayFollowTime'),
        macMessage = $('#mac-personalMessage'),
        macConnectionIds = [];
        
    var macControlFiels = [macDelay,macTotal,macMessage];

    // validate fields
    if(macTotal.val() =='' || macDelay.val() =='' || macMessage.val() ==''){
        for(var i=0;i<macControlFiels.length;i++){
            if(macControlFiels[i].val() == ''){
                $('#mac-error-notice').html(`${macControlFiels[i].data('name')} field cannot be empty`)
            }
        }
    }else if(macDelay.val() < 30){
        $('#mac-error-notice').html(`Delay minimum is 30`)
    }else{
        $('#mac-error-notice').html(``)

        // check if value exists in list dropdown
        if($('#mac-selectedConnect li').length > 0){
            $('#mac-selectedConnect li').each(function(index) {
                macConnectionIds.push($(this).data('connectionid'))
            });
        }

        macTotal = macTotal.val() < 10 ? 10 : macTotal.val()
        macStartP = macStartP.val() == '' ? 0 : macStartP.val()

        $(this).attr('disabled', true) 
        
        if($('#mac-selectAudience').val() == '') {
            query = `(flagshipSearchIntent:SEARCH_SRP,queryParameters:(network:List(F),resultType:List(PEOPLE)),includeFiltersInResponse:false)`;

            macGetConnections(query, macStartP, macTotal, macMessage.val(), macDelay.val(), macConnectionIds)
        }
        else
            macAudienceList($('#mac-selectAudience').val(), macMessage.val(), macDelay.val())
    }
})

const macGetConnections = async (queryParams, macStartP, macTotal, macMessage, macDelay, macConnectionIds) => {
    $('.message-connects-notice').show()
    $('#displayMessageConnectsStatus').empty()
    $('#displayMessageConnectsStatus').html('Scanning. Please wait...')
    let messageItems = [], totalResultCount = 0;

    let getConnectionsLooper = () => {
        setTimeout(async () => {
            $.ajax({
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
                url: `${voyagerBlockSearchUrl}&query=${queryParams}&start=${macStartP}`,
                success: function(data) {
                    var res = {'data': data};
                    let elements = res['data'].data.elements

                    if(elements.length) {
                        if(totalResultCount == 0)
                            totalResultCount = res['data'].data.metadata.totalResultCount

                        if(elements[1].items.length) {
                            for(let item of elements[1].items) {
                                messageItems.push(item)
                            }

                            if(messageItems.length < macTotal) {
                                macStartP = parseInt(macStartP) + 11
                                $('#mac-startPosition').val(macStartP)
                                getConnectionsLooper()
                            }else {
                                macCleanConnectionsData(messageItems, totalResultCount, macMessage, macDelay, macConnectionIds)
                            }
                        }else {
                            $('#displayMessageConnectsStatus').html('No result found, change your search criteria and try again!')
                            $('.messageConnectsAction').attr('disabled', false)
                        }
                    }else if(messageItems.length) {
                        $('#displayMessageConnectsStatus').html(`Found ${messageItems.length}. Messaging...`)
                        macCleanConnectionsData(messageItems, totalResultCount, macMessage, macDelay, macConnectionIds)
                    }else {
                        $('#displayMessageConnectsStatus').html('No result found, change your search criteria and try again!')
                        $('.messageConnectsAction').attr('disabled', false)
                    }
                },
                error: function(error){
                    console.log(error)
                    $('#displayMessageConnectsStatus').html('Something went wrong while trying to get connections!')
                    $('.messageConnectsAction').attr('disabled', false)
                }
            })
        },10000)
    }
    getConnectionsLooper();
}

const macCleanConnectionsData = (messageItems, totalResultCount, macMessage, macDelay, macConnectionIds) => {
    let conArr = [];
    let totalMessage = [];
    let newConArr, profileUrn;
    let getMacStore = JSON.parse(localStorage.getItem('lkm-mac'));

    // update store params
    if($('#mac-startPosition').val()) {
        getMacStore.position = parseInt($('#mac-startPosition').val())
    }
    if($('#mac-totalMessage').val()) {
        getMacStore.total = parseInt($('#mac-totalMessage').val())
    }
    if($('#mac-delayFollowTime').val()) {
        getMacStore.delay = parseInt($('#mac-delayFollowTime').val())
    }
    localStorage.setItem('lkm-mac', JSON.stringify(getMacStore))

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
    if(macConnectionIds.length > 0){
        const namesToDeleteSet = new Set(macConnectionIds);
        newConArr = conArr.filter((conArr) => {
            return !namesToDeleteSet.has(conArr.conId);
          });
    }else{
        newConArr = conArr;
    }

    // get only user defined total
    for(let z=0;z<newConArr.length;z++) {
        if(z < $('#mac-totalMessage').val()) {
            totalMessage.push(newConArr[z])
        }else{
            break;
        }
    }

    macGetProfileInfo(macMessage, macDelay, totalMessage)
}

const macGetProfileInfo = (macMessage, macDelay, totalMessage) => {
    $('#displayMessageConnectsStatus').html('Getting connection info. Please wait...')
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
                macSendMessageToConnection(macMessage, macDelay, profileInfos);
        },30000)
    }
    gciLooper()
}

const macAudienceList = async (audienceId, macMessage, macDelay) => {
    var conArr = [];
    var conArr2 = [];
    $('.message-connects-notice').show()

    await $.ajax({
        method: 'get',
        url: `${filterApi}/audience/list?audienceId=${audienceId}&totalCount=${$('#mac-totalMessage').val()}`,
        success: function(data){
            if(data.length > 0){
                var dataPath = data[0].audience;
                if(dataPath.length > 0){
                    for(let i=0; i<dataPath.length; i++){
                        if(dataPath[i].con_distance != null){
                            var netDistance = dataPath[i].con_distance.split("_")[1]
                        }
                        var targetIdd;
                        if(dataPath[i].con_member_urn.includes('urn:li:member:')){
                            targetIdd = dataPath[i].con_member_urn.replace('urn:li:member:','') 
                        }

                        conArr.push({
                            name:  dataPath[i].con_first_name+' '+dataPath[i].con_last_name,
                            firstName: dataPath[i].con_first_name,
                            lastName: dataPath[i].con_last_name,
                            title: dataPath[i].con_job_title,
                            conId: dataPath[i].con_id,
                            totalResult: dataPath.length,
                            netDistance: parseInt(netDistance) 
                        })
                    }
                    if(conArr.length > 0){
                        macSendMessageToConnection(macMessage, macDelay, conArr)
                    }else{
                        $('#displayMessageConnectsStatus').empty()
                        $('#displayMessageConnectsStatus').html('No 1st degree Connection.<br> Messages can only be sent to first degree connections')
                        $('.messageConnectsAction').attr('disabled', false)
                    }
                }else{
                    $('#displayMessageConnectsStatus').empty()
                    $('#displayMessageConnectsStatus').html('No data found!')
                    $('.messageConnectsAction').attr('disabled', false)
                }
            }
        },
        error: function(error){
            // console.log(error)
            $('.messageConnectsAction').attr('disabled', false)
        }
    })
}

var timeOutMessageAllCon;
// const macSendMessage = async (macMessage, macDelay, totalFollow) => {
//     var displayLi = '', i = 0, x = 0, displayAutomationRecord = '', newMessage;
//     let getMacStore = JSON.parse(localStorage.getItem('lkm-mac'));

//     $('.message-connects-notice').show()

//     // automation table data setup
//     displayAutomationRecord = `
//         <tr id="message-all-connects-record">
//             <td>Message All Connections</td>
//             <td id="mac-status">Running</td>
//             <td>${totalFollow.length}</td>
//             <td id="mac-numbered">0/${totalFollow.length}</td>
//             <td id="mac-bot-action" title="Stop automation"><i class="far fa-dot-circle fa-lg text-danger cursorr"></i></td>
//             <td id="mac-remained-time">${remainedTime(macDelay, totalFollow.length)}</td>
//         </tr>
//     `;
//     $('#no-job').hide()
//     $('#automation-list').append(displayAutomationRecord)

//     var macLooper = () => {
//         timeOutMessageAllCon = setTimeout(async function(){
//             newMessage = changeMessageVariableNames(macMessage, totalFollow[i])

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
//                                     attachments: getMacStore.uploads.length ? getMacStore.uploads : [],
//                                     body: newMessage, // message
//                                     attributedBody: {"text": newMessage, "attributes": []},
//                                     mediaAttachments: [],
//                                 }
//                             }
//                         },
//                         recipients: [totalFollow[i].conId],
//                         subtype: totalFollow[i].netDistance == 1 ? "MEMBER_TO_MEMBER" : "INMAIL"
//                     }
//                 }),
//                 success: function(response){
//                     if(response.value.createdAt){
//                         $('#displayMessageConnectsStatus').empty()
//                         displayLi = `
//                             <li>Message sent to: <b>${totalFollow[i].name}</b></li>
//                             <li>Total message sent: <b>${x +1}</b></li>
//                         `;
//                         $('#displayMessageConnectsStatus').append(displayLi)
//                         console.log( new Date())

//                         // update automation count done and time remained
//                         $('#mac-numbered').text(`${x +1}/${totalFollow.length}`)
//                         $('#mac-remained-time').text(`${remainedTime(macDelay, totalFollow.length - (x +1))}`)

//                         x++;
//                     }else{
//                         $('#displayMessageConnectsStatus').empty()
//                         $('#displayMessageConnectsStatus').html('Something went wrong. Please try again')
//                         $('.messageConnectsAction').attr('disabled', false)
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
//                             Message inbox might be locked.<br/>
//                             Not a 1st degree connection.
//                         `;
//                     }else {
//                         msg = ''
//                     }

//                     $('.message-connects-notice').show();
//                     $('#displayMessageConnectsStatus').empty()
//                     $('#displayMessageConnectsStatus').html(msg)
//                     $('.messageConnectsAction').attr('disabled', false)
//                 }
//             })
//             i++;
//             if(i < totalFollow.length)
//                 macLooper()
//             if(i >= totalFollow.length){
//                 $('.messageConnectsAction').attr('disabled', false)

//                 let module = 'Message sent';
//                 sendStats(x, module)

//                 // update automation status
//                 $('#mac-status').text('Completed')
//                 setTimeout(function(){
//                     $('#message-all-connects-record').remove()
//                 }, 5000)
//             }

//         }, macDelay*1000)
//     }
//     macLooper()
// }

const macSendMessageToConnection = async (macMessage, macDelay, dataArr) => {
    var displayLi = '', i = 0, x = 0, displayAutomationRecord = '';
    let getMacStore = JSON.parse(localStorage.getItem('lkm-mac'));
    let params = {}

    $('.message-connects-notice').show()

    // automation table data setup
    displayAutomationRecord = `
        <tr id="message-all-connects-record">
            <td>Message All Connections</td>
            <td id="mac-status">Running</td>
            <td>${totalFollow.length}</td>
            <td id="mac-numbered">0/${totalFollow.length}</td>
            <td id="mac-bot-action" title="Stop automation"><i class="far fa-dot-circle fa-lg text-danger cursorr"></i></td>
            <td id="mac-remained-time">${remainedTime(macDelay, totalFollow.length)}</td>
        </tr>
    `;
    $('#no-job').hide()
    $('#automation-list').append(displayAutomationRecord)

    for(const [i, item] of dataArr.entries()) {
        params['message'] = macMessage
        params['name'] = dataArr[i].name
        params['firstName'] = dataArr[i].firstName
        params['lastName'] = dataArr[i].lastName
        params['distance'] = dataArr[i].netDistance
        params['connectionId'] = dataArr[i].conId
        params['attachement'] = getMacStore.uploads.length ? getMacStore.uploads : []

        sendMessageToConnection(params, (result) => {
            if(result.status == 'successful') {
                displayLi = `
                    <li>Message sent to: <b>${dataArr[i].name}</b></li>
                    <li>Total message sent: <b>${i +1}</b></li>
                `;
                $('#displayMessageConnectsStatus').html(displayLi)

                // update automation count done and time remained
                $('#mac-numbered').text(`${x +1}/${totalFollow.length}`)
                $('#mac-remained-time').text(`${remainedTime(macDelay, dataArr.length - (i +1))}`)
                x++;
            }else {
                $('#displayMessageConnectsStatus').html(result.message)
                $('.messageConnectsAction').attr('disabled', false)
            }
        })
        await sleep(macDelay*1000)
    }
    $('.messageConnectsAction').attr('disabled', false)
    // update automation status
    $('#mac-status').text('Completed')
    setTimeout(function(){
        $('#message-all-connects-record').remove()
    }, 5000)
    sendStats(x, 'Message sent')
}

// work in progress 
const macGetConversationDetails = async (userPublicId) => {
    await $.ajax({
        method: 'get',
        beforeSend: function(request) {
            request.setRequestHeader('csrf-token', jsession);
            request.setRequestHeader('accept', 'application/vnd.linkedin.normalized+json+2.1');
            request.setRequestHeader('x-li-lang', 'en_US');
            request.setRequestHeader('x-li-page-instance', 'urn:li:page:d_flagship3_profile_view_base;d09eqyRKSRmutOk9M8Cwqg==');
            request.setRequestHeader('x-li-track', JSON.stringify(xLiTrack));
            request.setRequestHeader('x-restli-protocol-version', xRestliProtocolVersion);
        },
        url: `${voyagerApi}/messaging/conversations?q=participants&recipients=List(${userPublicId})`,
        success: function(data) {

        },
        error: function(err) {
            console.log(err)
        }
    })
}

const positionGroups = async (userPublicId) => {
    await $.ajax({
        method: 'get',
        beforeSend: function(request) { 
            request.setRequestHeader('csrf-token', jsession);
            request.setRequestHeader('x-li-lang', xLiLang);
            request.setRequestHeader('x-li-page-instance', 'urn:li:page:d_flagship3_people_connections;+x53BOwRR0CbMjBX9vblWA==');
            request.setRequestHeader('x-li-track', JSON.stringify(xLiTrack3));
            request.setRequestHeader('x-restli-protocol-version', xRestliProtocolVersion);
        },
        url: `${voyagerApi}/identity/profiles/${userPublicId}/positionGroups`,
        success: function(data){
            
        },
        error: function(error){
            console.log(error)
        }
    })

}

// stop automation 
$('body').on('click','#mac-bot-action',function(){
    clearTimeout(timeOutMessageAllCon);
    $('#mac-status').text('Stopped')
    $('.messageConnectsAction').attr('disabled', false)
    setTimeout(function(){
        $('#message-all-connects-record').remove()
    }, 5000)
})