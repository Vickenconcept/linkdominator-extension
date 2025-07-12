
$('.birthdayWishAction').click(function(){
    var bdwDelay = $('#bdw-delayTime'),
        bdwMessage = $('#bdw-personalMessage'),
        bdwTotal = 10,
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

    $.ajax({
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

    if(connectionResponse.length > 0){
        // check if birthday exists
        $.each(connectionResponse, function(i, item){
            var itemHeadline = item.headline.text.toLowerCase();
            var entityUrn = item.headerImage.attributes[0].detailData ? item.headerImage.attributes[0].detailData.profilePicture.entityUrn : null;

            if(itemHeadline.includes('happy birthday')){
                if(entityUrn.includes('urn:li:fsd_profile:')){
                    var connectId = entityUrn.replace('urn:li:fsd_profile:','')
                    birthdayConnectIds.push(connectId)
                }
            }else{
                $('.birthdayWish-notice').show()
                $('#displayBirthdayWishStatus').empty()
                $('#displayBirthdayWishStatus').html('No birthday found!')
                $('.birthdayWishAction').attr('disabled', false)
            }
        })

        if(birthdayConnectIds.length > 0){
            bdwGetusersProfiles(birthdayConnectIds, bdwMessage, bdwDelay);
        }

    }else{
        $('.birthdayWish-notice').show()
        $('#displayBirthdayWishStatus').empty()
        $('#displayBirthdayWishStatus').html('No birthday found!')
        $('.birthdayWishAction').attr('disabled', false)
    }
}

const bdwGetusersProfiles = async (birthdayConnectIds, bdwMessage, bdwDelay) => {
    var recipientInfo = [];

    for(var i = 0; i < birthdayConnectIds.length; i++){
        await $.ajax({
            method: 'get',
            beforeSend: function(request) {
                request.setRequestHeader('csrf-token', jsession);
            },
            url: `${voyagerApi}/identity/profiles/${birthdayConnectIds[i]}/profileView`,
            success: function(data){
                var res = {'data': data}
                
                if(res['data'].profile.entityUrn){
                    var mainPath = res['data'];
                    var netDistance = 'DISTANCE_2';
                    var networkDistance = netDistance.split("_")
                    var targetIdd;
                    if(mainPath.profile.miniProfile.objectUrn.includes('urn:li:member:')){
                        targetIdd = mainPath.profile.miniProfile.objectUrn.replace('urn:li:member:','') // seen profileView
                    }

                    recipientInfo.push({
                        name: mainPath.profile.firstName+' '+mainPath.profile.lastName,
                        firstName: mainPath.profile.firstName,
                        lastName: mainPath.profile.lastName,
                        title: mainPath.profile.miniProfile.occupation,
                        conId: birthdayConnectIds[i],
                        publicIdentifier: mainPath.profile.miniProfile.publicIdentifier,
                        memberUrn: mainPath.profile.miniProfile.objectUrn,
                        networkDistance: parseInt(networkDistance[1]),
                        trackingId: mainPath.profile.miniProfile.trackingId,
                        navigationUrl: `https://linkedin.com/in/${mainPath.profile.miniProfile.publicIdentifier}`,
                        targetId: parseInt(targetIdd)
                    })
                }
            },
            error: function(error){
                console.log(error)
                $('.birthdayWishAction').attr('disabled', false)
            }
        })
    }

    bdwSendBirthdayMessage(recipientInfo, bdwMessage, bdwDelay)
}

const bdwSendBirthdayMessage = async (recipientInfo, bdwMessage, bdwDelay) => {
    var displayLi = '', i = 0, newMessage;

    $('.birthdayWish-notice').show()

    var bdwLooper = () => {
        setTimeout(async function(){
            newMessage = changeMessageVariableNames(bdwMessage, recipientInfo[i])

            $.ajax({
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
                                    attachments: [],
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
                        if($('#bdw-viewProfile').prop('checked') == true){
                            bdwViewProfile(recipientInfo[i])
                        }
                        $('#displayBirthdayWishStatus').empty()
                        displayLi = `
                            <li>Message sent to: <b>${recipientInfo[i].name}</b></li>
                            <li>Total message sent: <b>${i +1}</b></li>
                        `;
                        $('#displayBirthdayWishStatus').append(displayLi)
                        console.log(new Date())
                    }
                },
                error: function(error){
                    console.log(error)
                    $('.birthdayWishAction').attr('disabled', false)
                }
            })
            i++;
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