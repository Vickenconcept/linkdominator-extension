$('.birthdayWishAction').click(function(){
    $('#displayBirthdayWishStatus').empty()
    
    var bdwDelay = $('#bdw-delayTime'),
        bdwMessage = $('#bdw-personalMessage'),
        bdwTotal = 20,
        bdwStartP = 0;
    var bdwControlFields = [bdwDelay,bdwMessage];

    if(bdwDelay.val() =='' || bdwMessage.val() ==''){
        for(var i=0;i<bdwControlFields.length;i++){
            if(bdwControlFields[i].val() == ''){
                $('#bdw-error-notice').html(`${bdwControlFields[i].data('name')} field cannot be empty`)
            }
        }
    }else if(bdwDelay.val() < 30){
        $('#bdw-error-notice').html(`Delay minimum is 30`)
    }else{
        $('#bdw-error-notice').html(``)

        $(this).attr('disabled', true)
        bdwGetBirthdays(bdwMessage.val(), bdwTotal, bdwStartP, bdwDelay.val())
    }
})

const bdwGetBirthdays = async (bdwMessage, bdwTotal, bdwStartP, bdwDelay) => {
    var segmentUrn = encodeURIComponent('urn:li:fsd_notificationSegment:NEW')
    var params = `decorationId=com.linkedin.voyager.dash.deco.identity.notifications.CardsCollection-59&count=${bdwTotal}&q=notifications&segmentUrn=${segmentUrn}&start=${bdwStartP}`;

    await $.ajax({
        method: 'get',
        beforeSend: function(request) {
            request.setRequestHeader('csrf-token', jsession);
            request.setRequestHeader('x-li-lang', xLiLang);
            request.setRequestHeader('x-li-page-instance', 'urn:li:page:d_flagship3_notifications;BXdNb74oSWWd74aIv9nQ8g==');
            request.setRequestHeader('x-li-track', JSON.stringify(xLiTrack2));
            request.setRequestHeader('x-restli-protocol-version', xRestliProtocolVersion);
        },
        url: `${voyagerApi}/voyagerIdentityDashNotificationCards?${params}`,
        success: function(data){
            var res = {'data': data};
            bdwCleanConnectionsData(res, bdwMessage, bdwDelay)
        },
        error: function(error){
            console.log(error)
            $('.birthdayWishAction').attr('disabled', false)
        }
    })
}

const bdwCleanConnectionsData = (res, bdwMessage, bdwDelay) => {
    var connectionResponse = res['data'].elements;
    var birthdayConnectIds = [];
    let getBdwStore = JSON.parse(localStorage.getItem('lkm-bdw'));

    if($('#bdw-delayTime').val()) {
        getBdwStore.delay = parseInt($('#bdw-delayTime').val())
    }
    localStorage.setItem('lkm-mtu', JSON.stringify(getBdwStore))

    if(connectionResponse.length > 0){
        // check if birthday exists
        $.each(connectionResponse, function(i, item){
            
            var itemHeadline = item.headline.text.toLowerCase();

            if(itemHeadline.includes('wish') && itemHeadline.includes('a happy birthday')){
                if('entityUrn' in item.headerImage.attributes[0].detailData.profilePicture){
                    
                    var entityUrn = item.headerImage.attributes[0].detailData.profilePicture.entityUrn;

                    if(entityUrn.includes('urn:li:fsd_profile:')){
                        var connectId = entityUrn.replace('urn:li:fsd_profile:','')
                        birthdayConnectIds.push({
                            connectId: connectId,
                            postUrn: item.cardAction.actionTarget,
                        })
                    }
                }
            }
        })

        if(birthdayConnectIds.length > 0){
            bdwGetUsersProfiles(birthdayConnectIds, bdwMessage, bdwDelay);
        }else{
            $('.birthdayWish-notice').show()
            $('#displayBirthdayWishStatus').empty()
            $('#displayBirthdayWishStatus').html('No birthday found!')
            $('.birthdayWishAction').attr('disabled', false)
        }

    }else{
        $('.birthdayWish-notice').show()
        $('#displayBirthdayWishStatus').empty()
        $('#displayBirthdayWishStatus').html('No birthday found!')
        $('.birthdayWishAction').attr('disabled', false)
    }
}

const bdwGetUsersProfiles = async (birthdayConnectIds, bdwMessage, bdwDelay) => {
    var recipientInfo = [];

    for(var i = 0; i < birthdayConnectIds.length; i++){
        await $.ajax({
            method: 'get',
            beforeSend: function(request) {
                request.setRequestHeader('csrf-token', jsession);
            },
            url: `${voyagerApi}/identity/profiles/${birthdayConnectIds[i].connectId}/profileView`,
            success: function(data){
                var res = {'data': data}
                
                if(res['data'].profile.entityUrn){
                    var mainPath = res['data'];
                    var netDistance = 'DISTANCE_2';
                    var networkDistance = netDistance.split("_")
                    var targetIdd;
                    if(mainPath.profile.miniProfile.objectUrn.includes('urn:li:member:')){
                        targetIdd = mainPath.profile.miniProfile.objectUrn.replace('urn:li:member:','') 
                    }
                    if(birthdayConnectIds[i].postUrn.includes("/feed/update/")){
                        var mainPostUrn = birthdayConnectIds[i].postUrn.replace("/feed/update/","")
                    }

                    recipientInfo.push({
                        name: mainPath.profile.firstName+' '+mainPath.profile.lastName,
                        firstName: mainPath.profile.firstName,
                        lastName: mainPath.profile.lastName,
                        title: mainPath.profile.miniProfile.occupation,
                        conId: birthdayConnectIds[i].connectId,
                        publicIdentifier: mainPath.profile.miniProfile.publicIdentifier,
                        memberUrn: mainPath.profile.miniProfile.objectUrn,
                        networkDistance: parseInt(networkDistance[1]),
                        trackingId: mainPath.profile.miniProfile.trackingId,
                        navigationUrl: `${LINKEDIN_URL}/in/${mainPath.profile.miniProfile.publicIdentifier}`,
                        targetId: parseInt(targetIdd),
                        postUrn: mainPostUrn
                    })
                }
            },
            error: function(error){
                console.log(error)
                $('.birthdayWishAction').attr('disabled', false)
            }
        })
    }

    bdwNetworkInfo(recipientInfo, bdwMessage, bdwDelay)
}

const bdwNetworkInfo = async (recipientInfo, bdwMessage, bdwDelay) => {
    var distance1 = [], distanceOther = [];

    for (var i=0; i<recipientInfo.length; i++){
        await $.ajax({
            method: 'GET',
            beforeSend: function(request) { 
                request.setRequestHeader('csrf-token', jsession);
                request.setRequestHeader('accept', 'application/vnd.linkedin.normalized+json+2.1');
                request.setRequestHeader('x-li-lang', xLiLang);
                request.setRequestHeader('x-li-page-instance', 'urn:li:page:d_flagship3_people_connections;eLxFYS13RaipPVCgxI7y2w==');
                request.setRequestHeader('x-li-track', JSON.stringify(xLiTrack3));
                request.setRequestHeader('x-restli-protocol-version', xRestliProtocolVersion);
            },
            url: `${voyagerApi}/identity/profiles/${recipientInfo[i].conId}/networkinfo`,
            success: function(data){
                var res = {'data': data}
                if(res['data'].data.hasOwnProperty('entityUrn')){
                    var elPath = res['data'].data;

                    if(elPath.distance.value == 'DISTANCE_1'){
                        distance1.push(recipientInfo[i])
                    }else{
                        distanceOther.push(recipientInfo[i])
                    }
                }
            },
            error: function(error){
                console.log(error)
                $('.birthdayWishAction').attr('disabled', false)
            }
        })
    }

    if (distance1.length > 0){
        bdwSendBirthdayMessage(distance1, bdwMessage, bdwDelay)
    }else if(distanceOther.length > 0 ){
        sendBirthdayComment(distanceOther, bdwMessage, bdwDelay)
    }
}

const sendBirthdayComment = async (distanceOther, bdwMessage, bdwDelay) => {
    var displayLi = '', i = 0, x= 0, newMessage, displayAutomationRecord = '';
    $('.birthdayWish-notice').show()

    // automation table data setup
    displayAutomationRecord = `
    <tr id="birthday-greetings-record">
        <td>Birthday Greetings</td>
        <td id="bdw-status">Running</td>
        <td>${distanceOther.length}</td>
        <td id="bdw-numbered">0/${distanceOther.length}</td>
        <td id="bdw-bot-action" title="Stop automation"><i class="far fa-dot-circle fa-lg text-danger cursorr"></i></td>
        <td id="bdw-remained-time">${remainedTime(bdwDelay,distanceOther.length)}</td>
    </tr>
    `;
    $('#no-job').hide()
    $('#automation-list').append(displayAutomationRecord)

    var bdwLooper = () => {
        timeOutBirthdayGreetings = setTimeout(async function(){
            newMessage = changeMessageVariableNames(bdwMessage, distanceOther[i])

            await $.ajax({
                method: 'post',
                beforeSend: function(request) {
                    request.setRequestHeader('csrf-token', jsession);
                    request.setRequestHeader('accept', accept);
                    request.setRequestHeader('content-type', contentType);
                    request.setRequestHeader('x-li-lang', xLiLang);
                    request.setRequestHeader('x-li-page-instance', xLiPageInstance);
                    request.setRequestHeader('x-li-track', JSON.stringify(xLiTrack));
                    request.setRequestHeader('x-restli-protocol-version', xRestliProtocolVersion);
                },
                url: `${voyagerApi}/voyagerFeedSocialNormComments`,
                data: JSON.stringify({
                    commentary: {
                        attributes: [],
                        text: newMessage
                    },
                    threadUrn: decodeURIComponent(distanceOther[i].postUrn)
                }),
                success: function(data){
                    if(data.value.createdAt){
                        if($('#bdw-viewProfile').prop('checked') == true){
                            bdwViewProfile(recipientInfo[i])
                        }
                        $('#displayBirthdayWishStatus').empty()
                        displayLi = `
                            <li>Message sent to: <b>${recipientInfo[i].name}</b></li>
                            <li>Total message sent: <b>${x +1}</b></li>
                        `;
                        $('#displayBirthdayWishStatus').append(displayLi)
                        bdwPostPresentStatus(distanceOther[i])
                        console.log(new Date())

                        // update automation count done and time remained
                        $('#bdw-numbered').text(`${x +1}/${recipientInfo.length}`)
                        $('#bdw-remained-time').text(`${remainedTime(bdwDelay, recipientInfo.length - (x +1))}`)

                        x++;
                    }
                },
                error: function(error){
                    console.log(error)
                    $('.birthdayWishAction').attr('disabled', false)
                }
            })
            i++;
            if(i < recipientInfo.length)
                bdwLooper()
            if(i >= recipientInfo.length) {
                $('.birthdayWishAction').attr('disabled', false)
                let module = 'Birthday greetings';
                sendStats(x, module)

                if($('#bdw-viewProfile').prop('checked') == true){
                    let module = 'Profile viwed';
                    sendStats(x, module)
                }
                // update automation status
                $('#bdw-status').text('Completed')
                setTimeout(function(){
                    $('#birthday-greetings-record').remove()
                }, 5000)
            }
        }, bdwDelay*1000)
    }
    bdwLooper()
}

var timeOutBirthdayGreetings;
const bdwSendBirthdayMessage = async (recipientInfo, bdwMessage, bdwDelay) => {
    var displayLi = '', i = 0, x = 0, displayAutomationRecord = '', newMessage;
    let getBdwStore = JSON.parse(localStorage.getItem('lkm-bdw'));

    $('.birthdayWish-notice').show()

    // automation table data setup
    displayAutomationRecord = `
        <tr id="birthday-greetings-record">
            <td>Birthday Greetings</td>
            <td id="bdw-status">Running</td>
            <td>${recipientInfo.length}</td>
            <td id="bdw-numbered">0/${recipientInfo.length}</td>
            <td id="bdw-bot-action" title="Stop automation"><i class="far fa-dot-circle fa-lg text-danger cursorr"></i></td>
            <td id="bdw-remained-time">${remainedTime(bdwDelay,recipientInfo.length)}</td>
        </tr>
    `;
    $('#no-job').hide()
    $('#automation-list').append(displayAutomationRecord)

    var bdwLooper = () => {
        timeOutBirthdayGreetings = setTimeout(async function(){
            newMessage = changeMessageVariableNames(bdwMessage, recipientInfo[i])

            await $.ajax({
                method: 'post',
                beforeSend: function(request) {
                    request.setRequestHeader('csrf-token', jsession);
                    request.setRequestHeader('accept', accept);
                    request.setRequestHeader('content-type', contentType);
                    request.setRequestHeader('x-li-lang', xLiLang);
                    request.setRequestHeader('x-li-page-instance', xLiPageInstance);
                    request.setRequestHeader('x-li-track', JSON.stringify(xLiTrack));
                    request.setRequestHeader('x-restli-protocol-version', xRestliProtocolVersion);
                },
                url: `${voyagerApi}/messaging/conversations?action=create`,
                data: JSON.stringify({ 
                    conversationCreate: {
                        eventCreate: {
                            value: {
                                'com.linkedin.voyager.messaging.create.MessageCreate' : {
                                    attachments: getBdwStore.uploads.length ? getBdwStore.uploads : [],
                                    body: newMessage // message
                                }
                            }
                        },
                        recipients: [recipientInfo[i].conId],
                        subtype: "MEMBER_TO_MEMBER"
                    },
                    keyVersion: "LEGACY_INBOX"
                }),
                success: function(data){
                    if(data.value.createdAt){
                        if($('#bdw-viewProfile').prop('checked') == true){
                            bdwViewProfile(recipientInfo[i])
                        }
                        $('#displayBirthdayWishStatus').empty()
                        displayLi = `
                            <li>Message sent to: <b>${recipientInfo[i].name}</b></li>
                            <li>Total message sent: <b>${x +1}</b></li>
                        `;
                        $('#displayBirthdayWishStatus').append(displayLi)
                        console.log(new Date())

                        // update automation count done and time remained
                        $('#bdw-numbered').text(`${x +1}/${recipientInfo.length}`)
                        $('#bdw-remained-time').text(`${remainedTime(bdwDelay, recipientInfo.length - (x +1))}`)

                        x++;
                    }
                },
                error: function(error){
                    console.log(error)
                    $('.birthdayWishAction').attr('disabled', false)
                }
            })
            i++;
            if(i < recipientInfo.length)
                bdwLooper()
            if(i >= recipientInfo.length){
                $('.birthdayWishAction').attr('disabled', false)
                let module = 'Birthday greetings';
                sendStats(x, module)

                if($('#bdw-viewProfile').prop('checked') == true){
                    let module = 'Profile viwed';
                    sendStats(x, module)
                }
                // update automation status
                $('#bdw-status').text('Completed')
                setTimeout(function(){
                    $('#birthday-greetings-record').remove()
                }, 5000)
            }
        }, bdwDelay*1000)
    }
    bdwLooper()
}

const bdwViewProfile = async (recipientInfo) => {
    await $.ajax({
        method: 'post',
        beforeSend: function(request) {
            request.setRequestHeader('csrf-token', jsession);
            request.setRequestHeader('content-type', 'application/json');
        },
        url: `https://www.linkedin.com/li/track`,
        data: JSON.stringify([{
            eventBody: {
                entityView: {
                    targetId: recipientInfo.targetId,
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
                        trackingId: recipientInfo.trackingId
                    },
                    time: dInt
                },
                networkDistance: recipientInfo.networkDistance,
                profileTrackingId: recipientInfo.trackingId,
                requestHeader: {
                    interfaceLocale: "en_US",
                    pageKey: "d_flagship3_profile_view_base",
                    path: recipientInfo.navigationUrl,
                    referer: "https://www.linkedin.com",
                    trackingCode: "d_flagship3_feed"
                },
                vieweeMemberUrn: recipientInfo.memberUrn,
                viewerPrivacySetting: "F",
            },
            eventInfo: {
                appId: "com.linkedin.flagship3.d_web",
                eventName: "ProfileViewEvent",
                topicName: "ProfileViewEvent"
            }
        }]),
        success: function(data){},
        error: function(error){
            console.log(error)
            $('.birthdayWishAction').attr('disabled', false)
        }
    })
}

const bdwPostPresentStatus = async (recipientInfo) => {
    await $.ajax({
        method: 'post',
        beforeSend: function(request) {
            request.setRequestHeader('csrf-token', jsession);
            request.setRequestHeader('accept', 'application/vnd.linkedin.normalized+json+2.1');
            request.setRequestHeader('content-type', 'application/x-www-form-urlencoded');
            request.setRequestHeader('x-http-method-override', 'GET');
            request.setRequestHeader('x-li-lang', 'en_US');
            request.setRequestHeader('x-li-page-instance', 'urn:li:page:d_flagship3_detail_base;iIJqeE9zSsOo1xJVLH4tAg==');
            request.setRequestHeader('x-li-page-track', JSON.stringify(xLiTrack));
            request.setRequestHeader('x-restli-protocol-version', xRestliProtocolVersion);
        },
        url: `${voyagerApi}/messaging/presenceStatuses`,
        data: {
            ids: `List(urn:li:fs_miniProfile:${recipientInfo.conId})`
        },
        success: function(data){},
        error: function(e){
            console.log(e)
        }
    })
}

// stop automation 
$('body').on('click','#bdw-bot-action',function(){
    clearTimeout(timeOutBirthdayGreetings);
    $('#bdw-status').text('Stopped')
    $('.birthdayWishAction').attr('disabled', false)
    setTimeout(function(){
        $('#birthday-greetings-record').remove()
    }, 5000)
})