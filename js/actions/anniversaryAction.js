$('.anniversaryGreetingAction').click(function(){
    $('#displayAnniversaryGreetingsStatus').empty()
    var angDelay = $('#ang-delayTime'),
        angMessage = $('#ang-personalMessage'),
        angTotal = 20,
        angStartP = 0;
    var angControlFields = [angDelay,angMessage];

    if(angDelay.val() =='' || angMessage.val() ==''){
        for(var i=0;i<angControlFields.length;i++){
            if(angControlFields[i].val() == ''){
                $('#ang-error-notice').html(`${angControlFields[i].data('name')} field cannot be empty`)
            }
        }
    }else if(angDelay.val() < 30){
        $('#ang-error-notice').html(`Delay minimum is 30`)
    }else{
        $('#ang-error-notice').html(``)

        $(this).attr('disabled', true)
        angGetWorkAnniversary(angMessage.val(), angTotal, angStartP, angDelay.val())
    }
})

const angGetWorkAnniversary = async (angMessage, angTotal, angStartP, angDelay) => {
    var segmentUrn = encodeURIComponent('urn:li:fsd_notificationSegment:NEW')
    var params = `decorationId=com.linkedin.voyager.dash.deco.identity.notifications.CardsCollection-59&count=${angTotal}&q=notifications&segmentUrn=${segmentUrn}&start=${angStartP}`;

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
            angCleanConnectionsData(res, angMessage, angDelay)
        },
        error: function(error){
            console.log(error)
            $('.anniversaryGreetingAction').attr('disabled', false)
        }
    })

}

const angCleanConnectionsData = (res, angMessage, angDelay) => {
    var connectionResponse = res['data'].elements;
    var connectionIds = [];
    let getAngStore = JSON.parse(localStorage.getItem('lkm-ang'));

    if($('#ang-delayTime').val()) {
        getAngStore.delay = parseInt($('#ang-delayTime').val())
    }
    localStorage.setItem('lkm-ang', JSON.stringify(getAngStore))

    if(connectionResponse.length > 0){
        $.each(connectionResponse, function(i, item){
            var itemHeadline = item.headline.text.toLowerCase();

            if(itemHeadline.includes('congratulate') && itemHeadline.includes('year')){
                var headLineArr = itemHeadline.split(" ")
                for(var i=0; i<headLineArr.length; i++){
                    if(headLineArr[i] == 'year' || headLineArr[i] == 'years'){
                        var userWorkYear = headLineArr[i -1]
                        break;
                    }
               }

                if('entityUrn' in item.headerImage.attributes[0].detailData.profilePicture){
                    
                    var entityUrn = item.headerImage.attributes[0].detailData.profilePicture.entityUrn;

                    if(entityUrn.includes('urn:li:fsd_profile:')){
                        var connectId = entityUrn.replace('urn:li:fsd_profile:','')
                        connectionIds.push({
                            connectId: connectId, 
                            userWorkYear: userWorkYear,
                            postUrn: item.cardAction.actionTarget,
                        })
                    }
                }
            }
        })
        if(connectionIds.length > 0){
            angGetUsersProfiles(connectionIds, angMessage, angDelay);
        }else{
            $('.anniversaryGreetings-notice').show()
            $('#displayAnniversaryGreetingsStatus').empty()
            $('#displayAnniversaryGreetingsStatus').html('No anniversary found!')
            $('.anniversaryGreetingAction').attr('disabled', false)
        }
    }else{
        $('.anniversaryGreetings-notice').show()
        $('#displayAnniversaryGreetingsStatus').empty()
        $('#displayAnniversaryGreetingsStatus').html('No anniversary found!')
        $('.anniversaryGreetingAction').attr('disabled', false)
    }
}

const angGetUsersProfiles = async (connectionIds, angMessage, angDelay) => {
    var recipientInfo = [];

    for(var i = 0; i < connectionIds.length; i++){
        await $.ajax({
            method: 'get',
            beforeSend: function(request) {
                request.setRequestHeader('csrf-token', jsession);
            },
            url: `${voyagerApi}/identity/profiles/${connectionIds[i].connectId}/profileView`,
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
                    if(connectionIds[i].postUrn.includes("/feed/update/")){
                        var mainPostUrn = connectionIds[i].postUrn.replace("/feed/update/","")
                    }

                    recipientInfo.push({
                        name: mainPath.profile.firstName+' '+mainPath.profile.lastName,
                        firstName: mainPath.profile.firstName,
                        lastName: mainPath.profile.lastName,
                        title: mainPath.profile.miniProfile.occupation,
                        conId: connectionIds[i].connectId,
                        publicIdentifier: mainPath.profile.miniProfile.publicIdentifier,
                        memberUrn: mainPath.profile.miniProfile.objectUrn,
                        networkDistance: parseInt(networkDistance[1]),
                        trackingId: mainPath.profile.miniProfile.trackingId,
                        navigationUrl: `https://linkedin.com/in/${mainPath.profile.miniProfile.publicIdentifier}`,
                        targetId: parseInt(targetIdd),
                        workYears: connectionIds[i].userWorkYear,
                        postUrn: mainPostUrn
                    })
                }
            },
            error: function(error){
                console.log(error)
                $('.anniversaryGreetingAction').attr('disabled', false)
            }
        })
    }
    angNetworkInfo(recipientInfo, angMessage, angDelay)
}

const angNetworkInfo = async (recipientInfo, angMessage, angDelay) => {
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
                $('.anniversaryGreetingAction').attr('disabled', false)
            }
        })
    }

    if (distance1.length > 0){
        sendAnniversaryMessage(distance1, angMessage, angDelay)
    }else if(distanceOther.length > 0 ){
        sendAnniversaryComment(distanceOther, angMessage, angDelay)
    }
}

var timeOutAnniversary;
const sendAnniversaryComment = async (distanceOther, angMessage, angDelay) => {
    var displayLi = '', i = 0, x= 0, newMessage, displayAutomationRecord = '';

    $('.anniversaryGreetings-notice').show()
    // automation table data setup
    displayAutomationRecord = `
        <tr id="anniversary-greetings-record">
            <td>Anniversary Greetings</td>
            <td id="ang-status">Running</td>
            <td>${distanceOther.length}</td>
            <td id="ang-numbered">0/${distanceOther.length}</td>
            <td id="ang-bot-action" title="Stop automation"><i class="far fa-dot-circle fa-lg text-danger cursorr"></i></td>
            <td id="ang-remained-time">${remainedTime(angDelay,distanceOther.length)}</td>
        </tr>
    `;
    $('#no-job').hide()
    $('#automation-list').append(displayAutomationRecord)

    var angLooper = () => {
        timeOutAnniversary = setTimeout(async function(){
            newMessage = changeMessageVariableNames(angMessage, distanceOther[i])
            if(newMessage.includes('@yearsAtCompany')){
                newMessage = newMessage.replace('@yearsAtCompany',distanceOther[i].workYears)
            }

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
                    if(data.hasOwnProperty('threadUrn')){
                        if($('#ang-viewProfile').prop('checked') == true){
                            angViewProfile(distanceOther[i])
                        }
                        $('#displayAnniversaryGreetingsStatus').empty()
                        displayLi = `
                            <li>Message sent to: <b>${distanceOther[i].name}</b></li>
                            <li>Total message sent: <b>${x +1}</b></li>
                        `;
                        $('#displayAnniversaryGreetingsStatus').append(displayLi)
                        angPostPresentStatus(distanceOther[i])
                        console.log(new Date())

                        // update automation count done and time remained
                        $('#ang-numbered').text(`${x +1}/${distanceOther.length}`)
                        $('#ang-remained-time').text(`${remainedTime(angDelay,distanceOther.length - (x +1))}`)
                        x++;
                    }
                },
                error: function(error){
                    console.log(error)
                    $('.anniversaryGreetingAction').attr('disabled', false)
                }
            })
            i++;
            if(i < distanceOther.length)
                angLooper()
            if(i >= distanceOther.length){
                $('.anniversaryGreetingAction').attr('disabled', false)
                let module = 'Anniversary greetings';
                sendStats(x, module)

                if($('#ang-viewProfile').prop('checked') == true){
                    let module = 'Profile viwed';
                    sendStats(x, module)
                }
                // update automation status
                $('#ang-status').text('Completed')
                setTimeout(function(){
                    $('#anniversary-greetings-record').remove()
                }, 5000)
            }
        }, angDelay*1000)
    }
    angLooper()

}

const sendAnniversaryMessage = async (recipientInfo, angMessage, angDelay) => {
    var displayLi = '', i = 0, newMessage, x=0, displayAutomationRecord = '';
    let getAngStore = JSON.parse(localStorage.getItem('lkm-ang'));

    $('.anniversaryGreetings-notice').show()

    // automation table data setup
    displayAutomationRecord = `
        <tr id="anniversary-greetings-record">
            <td>Anniversary Greetings</td>
            <td id="ang-status">Running</td>
            <td>${recipientInfo.length}</td>
            <td id="ang-numbered">0/${recipientInfo.length}</td>
            <td id="ang-bot-action" title="Stop automation"><i class="far fa-dot-circle fa-lg text-danger cursorr"></i></td>
            <td id="ang-remained-time">${remainedTime(angDelay,recipientInfo.length)}</td>
        </tr>
    `;
    $('#no-job').hide()
    $('#automation-list').append(displayAutomationRecord)

    var angLooper = () => {
        timeOutAnniversary = setTimeout(async function(){
            newMessage = changeMessageVariableNames(angMessage, recipientInfo[i])
            if(newMessage.includes('@yearsAtCompany')){
                newMessage = newMessage.replace('@yearsAtCompany',recipientInfo[i].workYears)
            }

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
                                    attachments: getAngStore.uploads.length ? getAngStore.uploads : [],
                                    body: newMessage // message
                                }
                            }
                        },
                        recipients: [recipientInfo[i].conId],
                        subtype: "MEMBER_TO_MEMBER"
                    }
                }),
                success: function(data){
                    if(data.value.createdAt){
                        if($('#ang-viewProfile').prop('checked') == true){
                            angViewProfile(recipientInfo[i])
                        }
                        $('#displayAnniversaryGreetingsStatus').empty()
                        displayLi = `
                            <li>Message sent to: <b>${recipientInfo[i].name}</b></li>
                            <li>Total message sent: <b>${x +1}</b></li>
                        `;
                        $('#displayAnniversaryGreetingsStatus').append(displayLi)
                        console.log(new Date())

                        // update automation count done and time remained
                        $('#ang-numbered').text(`${x +1}/${recipientInfo.length}`)
                        $('#ang-remained-time').text(`${remainedTime(angDelay,recipientInfo.length - (x +1))}`)
                        x++;
                    }
                },
                error: function(error){
                    console.log(error)
                    $('.anniversaryGreetingAction').attr('disabled', false)
                }
            })
            i++;
            if(i < recipientInfo.length)
                angLooper()
            if(i >= recipientInfo.length){
                $('.anniversaryGreetingAction').attr('disabled', false)
                let module = 'Anniversary greetings';
                sendStats(x, module)

                if($('#ang-viewProfile').prop('checked') == true){
                    let module = 'Profile viwed';
                    sendStats(x, module)
                }
                // update automation status
                $('#ang-status').text('Completed')
                setTimeout(function(){
                    $('#anniversary-greetings-record').remove()
                }, 5000)
            }
        }, angDelay*1000)
    }
    angLooper()
}

const angViewProfile = async (recipientInfo) => {
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
            $('.anniversaryGreetingAction').attr('disabled', false)
        }
    })
}

const angPostPresentStatus = async (recipientInfo) => {
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
$('body').on('click','#ang-bot-action',function(){
    clearTimeout(timeOutAnniversary);
    $('#ang-status').text('Stopped')
    $('.anniversaryGreetingAction').attr('disabled', false)
    setTimeout(function(){
        $('#anniversary-greetings-record').remove()
    }, 5000)
})