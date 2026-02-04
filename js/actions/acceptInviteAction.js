// Helper function to restore button state
const restoreAcceptInviteButton = () => {
    var $button = $('.acceptInviteAction');
    var originalText = $button.data('original-text') || 'Start';
    $button.attr('disabled', false)
        .html(originalText)
        .css('cursor', 'pointer');
}

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
    }else if(ariDelay.val() < 10){
        $('#ari-error-notice').html(`Delay minimum is 10`)
    }else{
        $('#ari-error-notice').html(``)

        ariTotal = ariTotal.val() < 10 ? 10 : ariTotal.val()
        ariStartP = ariStartP.val() == '' ? 0 : ariStartP.val()

        // Show immediate progress to user
        $('.accept-invite-notice').show()
        $('#displayAcceptStatus').html('Fetching invitations...')
        
        // Store original button text and add loading state
        var $button = $(this);
        var originalText = $button.html();
        $button.attr('disabled', true)
            .html('<i class="fas fa-spinner fa-spin me-2"></i>Processing...')
            .css('cursor', 'not-allowed');
        
        // Store original text for restoration
        $button.data('original-text', originalText);
        
        ariGetInvitations(ariStartP, ariTotal, ariPeriod.val(), ariDelay.val())
    }
})

// const ariGetInvitations = (ariStartP, ariTotal, ariPeriod, ariDelay) => {
//     $.ajax({
//         method: 'get',
//         timeout: 30000,
//         beforeSend: function(request) {
//             request.setRequestHeader('csrf-token', jsession);
//             request.setRequestHeader('accept', accept);
//             request.setRequestHeader('content-type', contentType);
//             request.setRequestHeader('x-li-lang', xLiLang);
//             request.setRequestHeader('x-li-page-instance', xLiPageInstance);
//             request.setRequestHeader('x-li-track', JSON.stringify(xLiTrack));
//             request.setRequestHeader('x-restli-protocol-version', xRestliProtocolVersion);
//         },
//         url: `${voyagerApi}/relationships/invitationViews?count=${ariTotal}&includeInsights=true&q=receivedInvitation&start=${ariStartP}&type=SINGLES_ALL`,
//         success: function(data){
//             try {
//                 console.log('ARI fetch success', { elements: (data && data.elements) ? data.elements.length : 0 });
//             } catch (e) {
//                 console.warn('ARI fetch success: unable to read elements length');
//             }
//             ariCheckDataMatchPeriod(data, ariPeriod, ariDelay)
//         },
//         error: function(error){
//             console.error('ARI fetch error', error)
//             $('#displayAcceptStatus').html('Failed to fetch invitations. Please refresh the LinkedIn page and try again.');
//             $('.acceptInviteAction').attr('disabled', false)
//         }
//     })
// }

const ariGetInvitations = (ariStartP, ariTotal, ariPeriod, ariDelay, collected = []) => {
    $.ajax({
        method: 'get',
        timeout: 30000,
        beforeSend: function(request) {
            request.setRequestHeader('csrf-token', jsession);
            request.setRequestHeader('accept', accept);
            request.setRequestHeader('content-type', contentType);
            request.setRequestHeader('x-li-lang', xLiLang);
            request.setRequestHeader('x-li-page-instance', xLiPageInstance);
            request.setRequestHeader('x-li-track', JSON.stringify(xLiTrack));
            request.setRequestHeader('x-restli-protocol-version', xRestliProtocolVersion);
        },
        url: `${voyagerApi}/relationships/invitationViews?count=20&includeInsights=true&q=receivedInvitation&start=${ariStartP}&type=SINGLES_ALL`,
        success: function(data){
            let elements = (data && data.elements) ? data.elements : [];

            collected = collected.concat(elements);

            // If LinkedIn gave us fewer than 20, it means no more pages left
            if (elements.length < 20 || collected.length >= ariTotal) {
                ariCheckDataMatchPeriod({ elements: collected }, ariPeriod, ariDelay);
            } else {
                // Fetch next page
                ariGetInvitations(ariStartP + 20, ariTotal, ariPeriod, ariDelay, collected);
            }
        },
        error: function(error){
            $('#displayAcceptStatus').html('Failed to fetch invitations. Please refresh the LinkedIn page and try again.');
            restoreAcceptInviteButton()
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

        // No matches for the chosen period
        if(dataTimeMatch.length === 0){
            $('#displayAcceptStatus').html(`Found ${treePath.length} invitations, but none older than ${ariPeriod} days. Try lowering days, increasing Start position, or increasing Total.`)
            restoreAcceptInviteButton()
            return
        }

        // take only user total accept 
        if(dataTimeMatch.length > totalAccept){
            for(var x=0;x<dataTimeMatch.length;x++){
                if(acceptData.length == totalAccept){
                    break;
                }else{
                    acceptData.push(dataTimeMatch[x])
                }
            }
            // Update UI to show processing count
            $('#displayAcceptStatus').html(`Processing ${acceptData.length} invitations...`)
            ariPostAccept(acceptData, ariDelay)
        }else{
            // Update UI to show processing count
            $('#displayAcceptStatus').html(`Processing ${dataTimeMatch.length} invitations...`)
            ariPostAccept(dataTimeMatch, ariDelay)
        }

    }else{
        $('.accept-invite-notice').show()
        $('#displayAcceptStatus').html(`No match found!`)
        restoreAcceptInviteButton()
    }
}

var timeOutAcceptInvite;
const ariPostAccept = (res, ariDelay) => {
    if(res.length > 0){
        var displayLi = '', i = 0, x=0, displayAutomationRecord = '';

        $('.accept-invite-notice').show()
        $('#displayAcceptStatus').html('Starting acceptance...')

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
                    timeout: 30000,
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
                        let treatedAsSuccess = false;
                        try {
                            if(data && data.value && data.value.statusCodeMap){
                                treatedAsSuccess = true;
                            }
                        } catch(e) {}
                        if(!treatedAsSuccess){
                            treatedAsSuccess = true;
                        }
                        if(treatedAsSuccess){
                            $('#displayAcceptStatus').empty()
                            displayLi = `
                                <li>Accepting: <b>${res[i].name}</b></li>
                                <li>Title: <b>${res[i].title}</b></li>
                                <li>Total Accept: <b>${x +1}</b></li>
                                <li>Invitation received <b>${res[i].inviteTime}</b> days ago</li>
                            `;
                            $('#displayAcceptStatus').append(displayLi)
                            if($('#ari-activate-pm').prop('checked') == true && $('#ari-personalMessage').val() != ''){
                                var inviteeData = {
                                    // Existing fields used elsewhere
                                    fullName: res[i].name,
                                    fName: res[i].firtName,
                                    lName: res[i].lastName,
                                    // Fields required by changeMessageVariableNames()
                                    name: res[i].name,
                                    firstName: res[i].firtName,
                                    lastName: res[i].lastName,
                                    title: res[i].title,
                                    // Messaging metadata
                                    connectId: res[i].connectId,
                                    messageCount: x +1
                                }
                                ariSendPersonalMessage(inviteeData)
                            }
                            // update automation count done and time remained
                            $('#ari-numbered').text(`${x +1}/${res.length}`)
                            $('#ari-remained-time').text(`${remainedTime(ariDelay, res.length - (x +1))}`)

                            x++;
                        }
                    },
                    error: function(error){
                        restoreAcceptInviteButton()
                    }
                })
                i++;
                if(i < res.length)
                    ariLooper()
                if(i >= res.length){
                    restoreAcceptInviteButton()
                    let module = 'Invitation accepted';
                    sendStats(x, module)

                    if($('#ari-activate-pm').prop('checked') == true && $('#ari-personalMessage').val() != ''){
                        let module = 'Message sent';
                        sendStats(x, module)
                    }
                    // Final on-screen summary
                    var requestedTotal = $('#ari-totalAccept').val();
                    var summaryMsg = `Completed. Accepted ${x} invitation(s).`;
                    if(res.length < requestedTotal){
                        summaryMsg += ` Only ${res.length} matched your filter (requested ${requestedTotal}).`;
                    }
                    $('#displayAcceptStatus').html(summaryMsg)
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
        restoreAcceptInviteButton()
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
            restoreAcceptInviteButton()
        }
    })
}

// stop automation
$('body').on('click','#ari-bot-action',function(){
    clearTimeout(timeOutAcceptInvite);
    $('#ari-status').text('Stopped')
    restoreAcceptInviteButton()
    setTimeout(function(){
        $('#accept-invites-record').remove()
    }, 5000)
})