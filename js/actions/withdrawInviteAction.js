// Helper function to restore button state
const restoreWithdrawInviteButton = () => {
    var $button = $('.withdrawInviteAction');
    var originalText = $button.data('original-text') || 'Start';
    $button.attr('disabled', false)
        .html(originalText)
        .css('cursor', 'pointer');
}

$('.withdrawInviteAction').click(function(){
    $('#displayWithdrawStatus').empty()
    var wsiStartP = $('#wsi-startPosition'),
        wasiTotal = $('#wsi-totalFollow'),
        wsiDelay = $('#wsi-delayFollowTime'),
        wsiPeriod = $('#wsi-period');
    var wsiControlFiels = [wsiDelay,wasiTotal,wsiPeriod];

    // validate fields
    if(wasiTotal.val() =='' || wsiDelay.val() =='' || wsiPeriod.val() ==''){
        for(var i=0;i<wsiControlFiels.length;i++){
            if(wsiControlFiels[i].val() == ''){
                $('#wsi-error-notice').html(`${wsiControlFiels[i].data('name')} field cannot be empty`)
            }
        }
    }else if(wsiDelay.val() < 10){
        $('#wsi-error-notice').html(`Delay minimum is 10`)
    }else{
        $('#wsi-error-notice').html(``)

        wasiTotal = wasiTotal.val() < 50 ? 50 : wasiTotal.val()
        wsiStartP = wsiStartP.val() == '' ? 0 : wsiStartP.val()

        // Show immediate progress to user
        $('.withdraw-invite').show()
        $('#displayWithdrawStatus').html('Fetching sent invitations...')
        
        // Store original button text and add loading state
        var $button = $(this);
        var originalText = $button.html();
        $button.attr('disabled', true)
            .html('<i class="fas fa-spinner fa-spin me-2"></i>Processing...')
            .css('cursor', 'not-allowed');
        
        // Store original text for restoration
        $button.data('original-text', originalText);
        
        wsiGetInvitations(wsiStartP, wasiTotal, wsiPeriod.val(), wsiDelay.val())
    }
})

const wsiGetInvitations = async (wsiStartP, wasiTotal, wsiPeriod, wsiDelay) => {
    $.ajax({
        method: 'get',
        timeout: 10000,
        beforeSend: function(request) {
            request.setRequestHeader('csrf-token', jsession);
            request.setRequestHeader('accept', accept);
            request.setRequestHeader('content-type', contentType);
            request.setRequestHeader('x-li-lang', xLiLang);
            request.setRequestHeader('x-li-page-instance', xLiPageInstance);
            request.setRequestHeader('x-li-track', JSON.stringify(xLiTrack));
            request.setRequestHeader('x-restli-protocol-version', xRestliProtocolVersion);
        },
        url: `${voyagerApi}/relationships/sentInvitationView?count=${wasiTotal}&q=sent&start=${wsiStartP}&type=SINGLES_ALL`,
        success: function(data){
            wsiCheckDataMatchPeriod(data, wsiPeriod, wsiDelay)
        },
        error: function(error){
            $('#displayWithdrawStatus').html('Failed to fetch sent invitations. Please refresh the LinkedIn page and try again.')
            restoreWithdrawInviteButton()
        }
    })
}

const wsiCheckDataMatchPeriod = async (res, wsiPeriod, wsiDelay) => {
    var treePath = res.elements;
    var dataTimeMatch = [];
    var currentTime = new Date();
    var totalWithdraw = $('#wsi-totalFollow').val();
    var withdrawData = [];

    if(treePath.length > 0){
        $.each(treePath, function(i, item){
            var treePath2 = item.heroInvitations[0];
            var getSentTime = treePath2.sentTime;
            // convert sent time
            var sentTimeConvert = new Date(getSentTime);
            var diffTime = Math.abs(currentTime - sentTimeConvert);
            var diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));            

            // check sent time against user period
            if(diffDays > wsiPeriod){
                dataTimeMatch.push({
                    entityUrn: treePath2.entityUrn,
                    name: treePath2.toMember.firstName+' '+treePath2.toMember.lastName,
                    title: treePath2.toMember.occupation,
                    inviteTime: diffDays,
                    sharedSecret: treePath2.sharedSecret
                })
            }
        })
        // No matches for the chosen period
        if(dataTimeMatch.length === 0){
            $('#displayWithdrawStatus').html(`Found ${treePath.length} sent invites, but none older than ${wsiPeriod} days. Try lowering days, increasing Start position, or increasing Total.`)
            restoreWithdrawInviteButton()
            return
        }

        // take only user total withdraw 
        if(dataTimeMatch.length > totalWithdraw){
            for(var x=0;x<dataTimeMatch.length;x++){
                if(withdrawData.length == totalWithdraw){
                    break;
                }else{
                    withdrawData.push(dataTimeMatch[x])
                }
            }
            $('#displayWithdrawStatus').html(`Processing ${withdrawData.length} invitations...`)
            wsiPostWithdraw(withdrawData, wsiDelay)
        }else{
            $('#displayWithdrawStatus').html(`Processing ${dataTimeMatch.length} invitations...`)
            wsiPostWithdraw(dataTimeMatch, wsiDelay)
        }
    }else{
        $('.withdraw-invite').show()
        $('#displayWithdrawStatus').html(`No match found in the current page. Try increasing Start position to check older invites or increase Total.`)
        restoreWithdrawInviteButton()
    }
}

var timeOutWithdrawInvite;
const wsiPostWithdraw = (res, wsiDelay) => {
    if(res.length > 0){
        var displayLi = '', i = 0, x=0, displayAutomationRecord = '';

        $('.withdraw-invite').show()
        $('#displayWithdrawStatus').html('Starting withdrawal...')

        // automation table data setup
        displayAutomationRecord = `
            <tr id="withdraw-invites-record">
                <td>Withdraw Sent Invites</td>
                <td id="wsi-status">Running</td>
                <td>${res.length}</td>
                <td id="wsi-numbered">0/${res.length}</td>
                <td id="wsi-bot-action" title="Stop automation"><i class="far fa-dot-circle fa-lg text-danger cursorr"></i></td>
                <td id="wsi-remained-time">${remainedTime(wsiDelay,res.length)}</td>
            </tr>
        `;
        $('#no-job').hide()
        $('#automation-list').append(displayAutomationRecord)

        var wsiLooper = () => {
            timeOutWithdrawInvite = setTimeout(async function(){
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
                        inviteActionType: "WITHDRAW"
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
                            $('#displayWithdrawStatus').empty()
                            displayLi = `
                                <li>Withdrawing: <b>${res[i].name}</b></li>
                                <li>Title: <b>${res[i].title}</b></li>
                                <li>Total withdrawn: <b>${x +1}</b></li>
                                <li>Invitation sent <b>${res[i].inviteTime}</b> days ago</li>
                            `;
                            $('#displayWithdrawStatus').append(displayLi)

                            // update automation count done and time remained
                            $('#wsi-numbered').text(`${x +1}/${res.length}`)
                            $('#wsi-remained-time').text(`${remainedTime(wsiDelay, res.length - (x +1))}`)

                            x++;
                        }
                    },
                    error: function(error){
                        restoreWithdrawInviteButton()
                    }
                })
                i++;
                if(i < res.length)
                    wsiLooper()
                if(i >= res.length){
                    restoreWithdrawInviteButton()

                    let module = 'Invitation withdrawn';
                    sendStats(x, module)

                    // update automation status
                    $('#wsi-status').text('Completed')
                    // Final on-screen summary
                    var requestedTotal = $('#wsi-totalFollow').val();
                    var summaryMsg = `Completed. Withdrawn ${x} invitation(s).`;
                    if(res.length < requestedTotal){
                        summaryMsg += ` Only ${res.length} matched your filter (requested ${requestedTotal}).`;
                    }
                    $('#displayWithdrawStatus').html(summaryMsg)
                    setTimeout(function(){
                        $('#withdraw-invites-record').remove()
                    }, 5000)
                }
            }, wsiDelay * 1000)
        }
        wsiLooper()
    }else{
        $('.withdraw-invite').show()
        $('#displayWithdrawStatus').html(`No match found!`)
        restoreWithdrawInviteButton()
    }
}

// stop automation 
$('body').on('click','#wsi-bot-action',function(){
    clearTimeout(timeOutWithdrawInvite);
    $('#wsi-status').text('Stopped')
    restoreWithdrawInviteButton()
    setTimeout(function(){
        $('#withdraw-invites-record').remove()
    }, 5000)
})