
$('.acceptInviteAction').click(function(){
    var ariStartP = $('#ari-startPosition'),
        ariTotal = $('#ari-totalAccept'),
        ariDelay = $('#ari-delayFollowTime'),
        ariPeriod = $('#ari-period');
    var ariControlFiels = [ariDelay,ariTotal,ariPeriod];

    // validate fields
    if(ariTotal.val() =='' || ariDelay.val() =='' || ariPeriod.val() ==''){
        for(var i=0;i<ariControlFiels.length;i++){
            if(ariControlFiels[i].val() == ''){
                $('#ari-error-notice').html(`${ariControlFiels[i].data('name')} field cannot be empty`)
            }
        }
    }else if(ariDelay.val() < 30){
        $('#ari-error-notice').html(`Delay minimum is 30`)
    }else{
        $('#ari-error-notice').html(``)

        ariTotal = ariTotal.val() < 10 ? 10 : ariTotal.val()
        ariStartP = ariStartP.val() == '' ? 0 : ariStartP.val()

        $(this).attr('disabled', true)
        ariGetInvitations(ariStartP, ariTotal, ariPeriod.val(), ariDelay.val())
    }
})

const ariGetInvitations = (ariStartP, ariTotal, ariPeriod, ariDelay) => {
    $.ajax({
        method: 'get',
        beforeSend: function(request) {
            request.setRequestHeader('csrf-token', jsession);
            request.setRequestHeader('accept', accept);
            request.setRequestHeader('content-type', contentType);
            request.setRequestHeader('x-li-lang', xLiLang);
            request.setRequestHeader('x-li-page-instance', xLiPageInstance);
            request.setRequestHeader('x-li-track', JSON.stringify(xLiTrack));
            request.setRequestHeader('x-restli-protocol-version', xRestliProtocolVersion);
        },
        url: `${voyagerApi}/relationships/invitationViews?count=${ariTotal}&includeInsights=true&q=receivedInvitation&start=${ariStartP}&type=SINGLES_ALL`,
        success: function(data){
            ariCheckDataMatchPeriod(data, ariPeriod, ariDelay)
        },
        error: function(error){
            console.log(error)
        }
    })
}

const ariCheckDataMatchPeriod = (res, ariPeriod, ariDelay) => {
    var treePath = res.elements;
    var dataTimeMatch = [];
    var currentTime = new Date();
    var totalAccept = $('#ari-totalAccept').val();
    var acceptData = [];

    if(treePath.length > 0){
        $.each(treePath, function(i, item){
            var treePath2 = item.invitation;
            var getSentTime = treePath2.sentTime;

            // convert sent time
            var sentTimeConvert = new Date(getSentTime);
            var diffTime = Math.abs(currentTime - sentTimeConvert);
            var diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));  
            
            // check sent time against user period
            if(diffDays > ariPeriod){
                dataTimeMatch.push({
                    entityUrn: treePath2.entityUrn,
                    name: treePath2.fromMember.firstName+' '+treePath2.fromMember.lastName,
                    firtName: treePath2.fromMember.firstName,
                    lastName: treePath2.fromMember.lastName,
                    title: treePath2.fromMember.occupation,
                    inviteTime: diffDays,
                    sharedSecret: treePath2.sharedSecret,
                    connectId: treePath2.fromMember.entityUrn
                })
            }
        })

        // take only user total accept 
        if(dataTimeMatch.length > totalAccept){
            for(var x=0;x<dataTimeMatch.length;x++){
                if(acceptData.length == totalAccept){
                    break;
                }else{
                    acceptData.push(dataTimeMatch[x])
                }
            }
            ariPostAccept(acceptData, ariDelay)
        }else{
            ariPostAccept(dataTimeMatch, ariDelay)
        }

    }else{
        $('.accept-invite-notice').show()
        $('#displayAcceptStatus').html(`No match found!`)
        $('.acceptInviteAction').attr('disabled', false)
    }
}

var timeOutAcceptInvite;
const ariPostAccept = (res, ariDelay) => {
    if(res.length > 0){
        var displayLi = '', i = 0, x=0, displayAutomationRecord = '';

        $('.accept-invite-notice').show()

        // automation table data setup
        displayAutomationRecord = `
            <tr id="accept-invites-record">
                <td>Accept Received Invites</td>
                <td id="ari-status">Running</td>
                <td>${res.length}</td>
                <td id="ari-numbered">0/${res.length}</td>
                <td id="ari-bot-action" title="Stop automation"><i class="far fa-dot-circle fa-lg text-danger cursorr"></i></td>
                <td id="ari-remained-time">${remainedTime(ariDelay,res.length)}</td>
            </tr>
        `;
        $('#no-job').hide()
        $('#automation-list').append(displayAutomationRecord)

        var ariLooper = () => {
            timeOutAcceptInvite = setTimeout(async function(){
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
                    url: `${voyagerApi}/relationships/invitations?action=closeInvitations`,
                    data: JSON.stringify({ 
                        inviteActionData: [{
                                entityUrn: res[i].entityUrn,
                                validationToken: res[i].sharedSecret
                            }],
                        inviteActionType: "ACCEPT"
                    }),
                    success: function(data){
                        if(data.value.statusCodeMap){
                            $('#displayAcceptStatus').empty()
                            displayLi = `
                                <li>Accepting: <b>${res[i].name}</b></li>
                                <li>Title: <b>${res[i].title}</b></li>
                                <li>Total Accept: <b>${x +1}</b></li>
                                <li>Invitation received <b>${res[i].inviteTime}</b> days ago</li>
                            `;
                            $('#displayAcceptStatus').append(displayLi)
                            if($('#ari-activate-pm').prop('checked') == true && $('#ari-personalMessage') !=''){
                                var inviteeData = {
                                    fullName: res[i].name,
                                    fName: res[i].firtName,
                                    lName: res[i].lastName,
                                    connectId: res[i].connectId,
                                    messageCount: x +1
                                }
                                ariSendPersonalMessage(inviteeData)
                            }
                            console.log( new Date())
                            // update automation count done and time remained
                            $('#ari-numbered').text(`${x +1}/${res.length}`)
                            $('#ari-remained-time').text(`${remainedTime(ariDelay, res.length - (x +1))}`)

                            x++;
                        }
                    },
                    error: function(error){
                        console.log(error)
                        $('.acceptInviteAction').attr('disabled', false)
                    }
                })
                i++;
                if(i < totalFollow.length)
                    ariLooper()
                if(i >= res.length){
                    $('.acceptInviteAction').attr('disabled', false)
                    let module = 'Invitation accepted';
                    sendStats(x, module)

                    if($('#ari-activate-pm').prop('checked') == true && $('#ari-personalMessage') !=''){
                        let module = 'Message sent';
                        sendStats(x, module)
                    }
                    // update automation status
                    $('#ari-status').text('Completed')
                    setTimeout(function(){
                        $('#accept-invites-record').remove()
                    }, 5000)
                }
            }, ariDelay*1000)
        }
        ariLooper()

    }else{
        $('.accept-invite-notice').show()
        $('#displayAcceptStatus').html(`No match found!`)
        $('.acceptInviteAction').attr('disabled', false)
    }
}

const ariSendPersonalMessage = async (inviteeData) => {
    var displayLi = '', i = 0, newMessage = '';
    var message = $('#ari-personalMessage').val();

    newMessage = changeMessageVariableNames(message, inviteeData)

    if(inviteeData.connectId.includes('urn:li:fs_miniProfile:')){
        var newConnectId = inviteeData.connectId.replace('urn:li:fs_miniProfile:','')
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
                            attachments: [],
                            body: newMessage // message
                        }
                    }
                },
                recipients: [newConnectId],
                subtype: "MEMBER_TO_MEMBER"
            }
        }),
        success: function(data){
            if(data.value.createdAt){
                $('#displayAcceptStatus').empty()
                displayLi = `
                    <li>Message sent to: <b>${inviteeData.fName}</b></li>
                    <li>Total message sent: <b>${inviteeData.messageCount}</b></li>
                `;
                $('#displayAcceptStatus').append(displayLi)
            }
        },
        error: function(error){
            console.log(error)
            $('.acceptInviteAction').attr('disabled', false)
        }
    })
}

// stop automation
$('body').on('click','#ari-bot-action',function(){
    clearTimeout(timeOutAcceptInvite);
    $('#ari-status').text('Stopped')
    $('.acceptInviteAction').attr('disabled', false)
    setTimeout(function(){
        $('#accept-invites-record').remove()
    }, 5000)
})