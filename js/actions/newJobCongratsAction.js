$('.newJobCongratsAction').click(function(){
    let d = new Date();
    if(localStorage.getItem('last-notification-publishedat-job') == null){
        localStorage.setItem('last-notification-publishedat-job', d.setHours(0,0,0,0))
    }
    if(localStorage.getItem('last-notification-day') == null) {
        d.setDate(d.getDate() - 1);
        localStorage.setItem('last-notification-day', d.toJSON().slice(0, 10))
    }

    $('#displayNewJobGreetingsStatus').empty()
    var njcDelay = $('#njc-delayTime'),
        njcMessage = $('#njc-personalMessage'),
        njcTotal = 20,
        njcStartP =  0;
    var njcControlFields = [njcDelay,njcMessage];

    if(njcDelay.val() =='' || njcMessage.val() ==''){
        for(var i=0;i<njcControlFields.length;i++){
            if(njcControlFields[i].val() == ''){
                $('#njc-error-notice').html(`${njcControlFields[i].data('name')} field cannot be empty`)
            }
        }
    }else if(njcDelay.val() < 30){
        $('#njc-error-notice').html(`Delay minimum is 30`)
    }else{
        $('#njc-error-notice').html(``)

        $(this).attr('disabled', true)
        njcGetNewJobsRe(njcMessage.val(), njcTotal, njcStartP, njcDelay.val())
    }
})

const njcGetNewJobs = async (njcMessage, njcTotal, njcStartP, njcDelay) => {
    var sortee = '';
    if(njcStartP > 0){
        sortee = 'EARLIER'
    }else{
        sortee = 'NEW'
    }
    var segmentUrn = encodeURIComponent(`urn:li:fsd_notificationSegment:NEW`)
    var params = `decorationId=com.linkedin.voyager.dash.deco.identity.notifications.CardsCollection-66&count=${njcTotal}&q=notifications&segmentUrn=${segmentUrn}&start=${njcStartP}`;

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
            njcCleanConnectionsData(res, njcMessage, njcDelay)
        },
        error: function(error){
            console.log(error)
            $('.newJobCongratsAction').attr('disabled', false)
        }
    })
}

const njcGetNewJobsRe = (njcMessage, njcTotal, njcStartP, njcDelay) => {
    var sortee = '';
    if(njcStartP > 0){
        sortee = 'EARLIER'
    }else{
        sortee = 'NEW'
    }
    var segmentUrn = encodeURIComponent(`urn:li:fsd_notificationSegment:NEW`)
    var connectionIds = [], lastNotificationTime = null;

    var njcLooperRe = async () => {
        var params = `decorationId=com.linkedin.voyager.dash.deco.identity.notifications.CardsCollection-66&count=${njcTotal}&q=notifications&segmentUrn=${segmentUrn}&start=${njcStartP}`;
        
        setTimeout(async function(){
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
                    var connectionResponse = res['data'].elements;
                    
                    if(connectionResponse.length > 0){
                        $.each(connectionResponse, function(i, item){
                            // check for clustered birthday
                            // ----------------------------
                            var itemHeadline = item.headline.text.toLowerCase();

                            if(itemHeadline.includes('starting a new position') 
                                || itemHeadline.includes('for being promoted')
                                || itemHeadline.includes('shared about being promoted')){
                                var newPosition;
                                
                                if(itemHeadline.includes('starting a new position')){
                                    var headLineArr = itemHeadline.split("as")
                                    newPosition = headLineArr[1]
                                }else if(itemHeadline.includes('for being promoted')){
                                    var headLineArr = itemHeadline.split("to")
                                    newPosition = headLineArr[1]
                                }else if(itemHeadline.includes('shared about being promoted')){
                                    newPosition = itemHeadline.split("to")[1].split(" at ")[0]
                                }

                                if('entityUrn' in item.headerImage.attributes[0].detailData.profilePicture){
                                    
                                    var entityUrn = item.headerImage.attributes[0].detailData.profilePicture.entityUrn;

                                    if(entityUrn.includes('urn:li:fsd_profile:')){
                                        // check if notification time is > last storage time
                                        if(item.publishedAt > localStorage.getItem('last-notification-publishedat-job')){
                                            var connectId = entityUrn.replace('urn:li:fsd_profile:','')
                                            connectionIds.push({
                                                connectId: connectId, 
                                                newPosition: newPosition, 
                                                postUrn: item.cardAction.actionTarget,
                                                trackingId: item.trackingId,
                                                messageSentThrough: itemHeadline.includes('shared about being promoted') ? 'comment' : 'message'
                                            });
                                        }
                                        lastNotificationTime = item.publishedAt;
                                    }
                                }
                            }
                        })
                        // check if last notification time checked is >
                        if(connectionIds.length){
                            if(lastNotificationTime > localStorage.getItem('last-notification-publishedat-job')) {
                                njcStartP += njcTotal;
                                njcLooperRe();
                            }else {
                                njcGetUsersProfiles(connectionIds, njcMessage, njcDelay);
                            }
                        }else if(!connectionIds.length 
                                && (new Date().toJSON().slice(0, 10) > localStorage.getItem('last-notification-day'))) {
                            njcStartP += njcTotal;
                            njcLooperRe();
                        }else {
                            $('.newJobGreetings-notice').show()
                            $('#displayNewJobGreetingsStatus').empty()
                            $('#displayNewJobGreetingsStatus').html('No new job notification found!')
                            $('.newJobCongratsAction').attr('disabled', false)
                        }
                    }else{
                        $('.newJobGreetings-notice').show()
                        $('#displayNewJobGreetingsStatus').empty()
                        $('#displayNewJobGreetingsStatus').html('No new job notification found!')
                        $('.newJobCongratsAction').attr('disabled', false)
                    }
                },
                error: function(error){
                    console.log(error)
                    $('.newJobCongratsAction').attr('disabled', false)
                }
            })
        }, njcDelay * 1000)
    }
    njcLooperRe();
}

const njcCleanConnectionsData = (res, njcMessage, njcDelay) => {
    var connectionResponse = res['data'].elements;
    var connectionIds = [];
    let getNjcStore = JSON.parse(localStorage.getItem('lkm-njc'));

    if($('#njc-delayTime').val()) {
        getNjcStore.delay = parseInt($('#njc-delayTime').val())
    }
    localStorage.setItem('lkm-njc', JSON.stringify(getNjcStore))

    if(connectionResponse.length > 0){
        $.each(connectionResponse, function(i, item){
            var itemHeadline = item.headline.text.toLowerCase();

            if(itemHeadline.includes('starting a new position') 
                || itemHeadline.includes('for being promoted')
                || itemHeadline.includes('shared about being promoted')){
                var newPosition;
                
                if(itemHeadline.includes('starting a new position')){
                    var headLineArr = itemHeadline.split("as")
                    newPosition = headLineArr[1]
                }else if(itemHeadline.includes('for being promoted')){
                    var headLineArr = itemHeadline.split("to")
                    newPosition = headLineArr[1]
                }else if(itemHeadline.includes('shared about being promoted')){
                    newPosition = itemHeadline.split("to")[1].split(" at ")[0]
                }

                if('entityUrn' in item.headerImage.attributes[0].detailData.profilePicture){
                    
                    var entityUrn = item.headerImage.attributes[0].detailData.profilePicture.entityUrn;

                    if(entityUrn.includes('urn:li:fsd_profile:')){
                        var connectId = entityUrn.replace('urn:li:fsd_profile:','')
                        connectionIds.push({
                            connectId: connectId, 
                            newPosition: newPosition, 
                            postUrn: item.cardAction.actionTarget,
                            trackingId: item.trackingId
                        })
                    }
                }
            }
        })
        if(connectionIds.length > 0){
            njcGetUsersProfiles(connectionIds, njcMessage, njcDelay);
        }else{
            $('.newJobGreetings-notice').show()
            $('#displayNewJobGreetingsStatus').empty()
            $('#displayNewJobGreetingsStatus').html('No new job notification found!')
            $('.newJobCongratsAction').attr('disabled', false)
        } 
    }else{
        $('.newJobGreetings-notice').show()
        $('#displayNewJobGreetingsStatus').empty()
        $('#displayNewJobGreetingsStatus').html('No new job notification found!')
        $('.newJobCongratsAction').attr('disabled', false)
    }
}

const njcGetUsersProfiles = async (connectionIds, njcMessage, njcDelay) => {
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
                        navigationUrl: `${LINKEDIN_URL}/in/${mainPath.profile.miniProfile.publicIdentifier}`,
                        targetId: parseInt(targetIdd),
                        newPosition: connectionIds[i].newPosition,
                        trackingId: connectionIds[i].trackingId,
                        postUrn: mainPostUrn,
                        messageSentThrough: connectionIds[i].messageSentThrough
                    })
                }
            },
            error: function(error){
                console.log(error)
                $('.newJobCongratsAction').attr('disabled', false)
            }
        })
    }
    njcNetworkInfo(recipientInfo, njcMessage, njcDelay)
}

const njcNetworkInfo = async (recipientInfo, njcMessage, njcDelay) => {
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
                        if(recipientInfo[i].messageSentThrough == 'comment')
                            distanceOther.push(recipientInfo[i]);
                        else
                            distance1.push(recipientInfo[i]);
                    }else{
                        distanceOther.push(recipientInfo[i]);
                    }
                }
            },
            error: function(error){
                console.log(error)
                $('.newJobCongratsAction').attr('disabled', false)
            }
        })
    }

    if (distance1.length > 0){
        sendNewJobGreetings(distance1, njcMessage, njcDelay)
    }else if(distanceOther.length > 0 ){
        sendNewJobGreetingsComment(distanceOther, njcMessage, njcDelay)
    }
}

var timeOutJobGreetings;
const sendNewJobGreetingsComment = async (distanceOther, njcMessage, njcDelay) => {
    var displayLi = '', i = 0, x= 0, newMessage, displayAutomationRecord = '';

    $('.newJobGreetings-notice').show()

    // automation table data setup
    displayAutomationRecord = `
        <tr id="job-greetings-record">
            <td>Job Greetings</td>
            <td id="njc-status">Running</td>
            <td>${distanceOther.length}</td>
            <td id="njc-numbered">0/${distanceOther.length}</td>
            <td id="njc-bot-action" title="Stop automation"><i class="far fa-dot-circle fa-lg text-danger cursorr"></i></td>
            <td id="njc-remained-time">${remainedTime(njcDelay,distanceOther.length)}</td>
        </tr>
    `;
    $('#no-job').hide()
    $('#automation-list').append(displayAutomationRecord)

    var njcLooper = () => {
        timeOutJobGreetings = setTimeout(async function(){
            newMessage = changeMessageVariableNames(njcMessage, distanceOther[i])
            if(newMessage.includes('@newPosition')){
                newMessage = newMessage.replace('@newPosition',distanceOther[i].newPosition)
            }

            await $.ajax({
                method: 'post',
                beforeSend: function(request) {
                    request.setRequestHeader('csrf-token', jsession);
                    request.setRequestHeader('accept', accept);
                    request.setRequestHeader('content-type', 'application/json; charset=UTF-8');
                    request.setRequestHeader('x-li-lang', xLiLang);
                    request.setRequestHeader('x-li-page-instance', 'urn:li:page:d_flagship3_detail_base;izHZ5sjmSYKP47B2kGjSog==');
                    request.setRequestHeader('x-li-track', JSON.stringify(xLiTrack));
                    request.setRequestHeader('x-restli-protocol-version', xRestliProtocolVersion);
                },
                url: `${voyagerApi}/voyagerFeedSocialNormComments`,
                data: {
                    commentary: {
                        attributes: [],
                        text: newMessage
                    },
                    threadUrn: decodeURIComponent(distanceOther[i].postUrn)
                },
                success: function(data){
                    if(data.hasOwnProperty('threadUrn')){
                        if($('#njc-viewProfile').prop('checked') == true){
                            njcViewProfile(distanceOther[i])
                        }
                        $('#displayNewJobGreetingsStatus').empty()
                        displayLi = `
                            <li>Message sent to: <b>${distanceOther[i].name}</b></li>
                            <li>Total message sent: <b>${x +1}</b></li>
                        `;
                        $('#displayNewJobGreetingsStatus').append(displayLi)
                        postPresentStatus(distanceOther[i])
                        console.log(new Date())

                        // update automation count done and time remained
                        $('#njc-numbered').text(`${x +1}/${distanceOther.length}`)
                        $('#njc-remained-time').text(`${remainedTime(njcDelay,distanceOther.length - (x +1))}`)

                        let d = new Date();
                        localStorage.setItem('last-notification-publishedat-job', d.getTime());
                        localStorage.setItem('last-notification-day', d.toJSON().slice(0, 10));

                        x++;
                    }
                },
                error: function(error){
                    console.log(error)
                    $('.newJobCongratsAction').attr('disabled', false)
                }
            })
            i++;
            if(i < distanceOther.length)
                njcLooper()
            if(i >= distanceOther.length){
                $('.newJobCongratsAction').attr('disabled', false)

                let module = 'New job greetings sent';
                sendStats(x, module)

                if($('#njc-viewProfile').prop('checked') == true){
                    let module = 'Profile viwed';
                    sendStats(x, module)
                }
                // update automation status
                $('#njc-status').text('Completed')
                setTimeout(function(){
                    $('#job-greetings-record').remove()
                }, 5000)
            }
        }, njcDelay*1000)
    }
    njcLooper()
}

const sendNewJobGreetings = (recipientInfo, njcMessage, njcDelay) => {
    var displayLi = '', i = 0, x= 0, newMessage, displayAutomationRecord = '';
    let getNjcStore = JSON.parse(localStorage.getItem('lkm-njc'));

    $('.newJobGreetings-notice').show()

    // automation table data setup
    displayAutomationRecord = `
        <tr id="job-greetings-record">
            <td>Job Greetings</td>
            <td id="njc-status">Running</td>
            <td>${recipientInfo.length}</td>
            <td id="njc-numbered">0/${recipientInfo.length}</td>
            <td id="njc-bot-action" title="Stop automation"><i class="far fa-dot-circle fa-lg text-danger cursorr"></i></td>
            <td id="njc-remained-time">${remainedTime(njcDelay,recipientInfo.length)}</td>
        </tr>
    `;
    $('#no-job').hide()
    $('#automation-list').append(displayAutomationRecord)

    var njcLooper = () => {
        timeOutJobGreetings = setTimeout(async function(){
            newMessage = changeMessageVariableNames(njcMessage, recipientInfo[i])
            if(newMessage.includes('@newPosition')){
                newMessage = newMessage.replace('@newPosition',recipientInfo[i].newPosition)
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
                            trackingId: recipientInfo[i].trackingId,
                            value: {
                                'com.linkedin.voyager.messaging.create.MessageCreate' : {
                                    attachments: getNjcStore.uploads.length ? getNjcStore.uploads : [],
                                    attributedBody: {
                                        attributes: [],
                                        text: newMessage
                                    },
                                    extensionContent: {
                                        extensionContentType: "PROP",
                                        prop: recipientInfo[i].postUrn
                                    }
                                }
                            }
                        },
                        recipients: [recipientInfo[i].conId],
                        subtype: "MEMBER_TO_MEMBER"
                    }
                }),
                success: function(data){
                    if(data.value.createdAt){
                        if($('#njc-viewProfile').prop('checked') == true){
                            njcViewProfile(recipientInfo[i])
                        }
                        $('#displayNewJobGreetingsStatus').empty()
                        displayLi = `
                            <li>Message sent to: <b>${recipientInfo[i].name}</b></li>
                            <li>Total message sent: <b>${x +1}</b></li>
                        `;
                        $('#displayNewJobGreetingsStatus').append(displayLi)
                        console.log(new Date())

                        // update automation count done and time remained
                        $('#njc-numbered').text(`${x +1}/${recipientInfo.length}`)
                        $('#njc-remained-time').text(`${remainedTime(njcDelay,recipientInfo.length - (x +1))}`);

                        let d = new Date();
                        localStorage.setItem('last-notification-publishedat-job', d.getTime());
                        localStorage.setItem('last-notification-day', d.toJSON().slice(0, 10));

                        x++;
                    }
                },
                error: function(error){
                    console.log(error)
                    $('.newJobCongratsAction').attr('disabled', false)
                }
            })
            i++;
            if(i < recipientInfo.length)
                njcLooper()
            if(i >= recipientInfo.length){
                $('.newJobCongratsAction').attr('disabled', false)

                let module = 'New job greetings sent';
                sendStats(x, module)

                if($('#njc-viewProfile').prop('checked') == true){
                    let module = 'Profile viwed';
                    sendStats(x, module)
                }
                // update automation status
                $('#njc-status').text('Completed')
                setTimeout(function(){
                    $('#job-greetings-record').remove()
                }, 5000)
            }
        }, njcDelay*1000)
    }
    njcLooper()
}

const njcViewProfile = async (recipientInfo) => {
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
                    referer: LINKEDIN_URL,
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
            $('.newJobCongratsAction').attr('disabled', false)
        }
    })
}

const postPresentStatus = async (recipientInfo) => {
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
$('body').on('click','#njc-bot-action', function(){
    clearTimeout(timeOutJobGreetings);
    $('#njc-status').text('Stopped')
    $('.newJobCongratsAction').attr('disabled', false)
    setTimeout(function(){
        $('#job-greetings-record').remove()
    }, 5000)
})
