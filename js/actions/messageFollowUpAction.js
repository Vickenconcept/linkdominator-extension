/**
 * Schedule followup
 */

$('body').on('click','.addFollowUppAction',function() {
    // validation
    let data = followupFieldsValidation()
    let getMfuStore = JSON.parse(localStorage.getItem('lkm-mfu'));

    if(data !== false) {
        getMfuStore.filters['message'] = data.message
        getMfuStore.filters['audienceId'] = data.audienceId
        getMfuStore.filters['scheduledTime'] = data.scheduledTime
        getMfuStore.filters['status'] = 'scheduled'

        // send message to service worker
        chrome.runtime.sendMessage({scheduleInfo: getMfuStore}, function(response) {
            $('.message-followup-notice').show()
            $('#displayMessageFollowUpStatus').html(`<li>Schedule added</li>`)
        })
    }
})

/**
 * Start followup instantly
 */
$('body').on('click','.startFollowUpAction',function() {
    $('.startFollowUpAction').attr('disabled', true)

    let data = followupFieldsValidation()

    if(data !== false) {
        try {
            getAudience(data.audienceId, data.totalAudience, filterApi, (result) => {
                if(audienceList.length) sendFollowupMessage(data);
            })
        } catch (error) {
            $('.startFollowUpAction').attr('disabled', false)
            $('.message-followup-notice').show()
            $('#displayMessageFollowUpStatus').html(`<li>${error}</li>`)
            return;
        }
    }
})

/**
 * Validate audience is selected
 */
const followupFieldsValidation = () => {
    let audienceId = $('#mfu-selectAudience').val(),
        message = $('#mfu-personalMessage').val(),
        totalAudience = $('#mfu-total').val(),
        sleepTime = $('#mfu-delayTime').val(),
        scheduledTime = $('#mfu-waitDays').val();

    let fields = [
        {field: 'Audience', val: audienceId}, 
        {field: 'Message', val: message}, 
        {field: 'Total', val: totalAudience}, 
        {field: 'Delay', val: sleepTime}, 
        {field: 'Wait days', val: scheduledTime}
    ]
    let getMfuStore = JSON.parse(localStorage.getItem('lkm-mfu'));

    for(let field of fields) {
        if (!field.val) {
            $('.startFollowUpAction').attr('disabled', false)
            $('.message-followup-notice').show()
            $('#displayMessageFollowUpStatus').html(`<li>${field.field} field is required.</li>`)
            return false;
        }
    }

    $('.message-followup-notice').hide()
    $('#displayMessageFollowUpStatus').html('')

    if($('#mfu-waitDays').val()) {
        getMfuStore.waitdays = parseInt($('#mfu-waitDays').val())
    }
    if($('#mfu-total').val()) {
        getMfuStore.total = parseInt($('#mfu-total').val())
    }
    if($('#mfu-delayTime').val()) {
        getMfuStore.delay = parseInt($('#mfu-delayTime').val())
    }
    localStorage.setItem('lkm-mfu', JSON.stringify(getMfuStore))

    return {
        audienceId: parseInt(audienceId),
        message: message,
        totalAudience: parseInt(totalAudience),
        sleepTime: parseInt(sleepTime),
        scheduledTime: parseInt(scheduledTime)
    };
}

/**
 * Send followup message
 * @param {object} data
 */
const sendFollowupMessage = async (data) => {
    let getMfuStore = JSON.parse(localStorage.getItem('lkm-mfu'));

    for(const [i, item] of audienceList.entries()) {
        arConnectionModel.message = data.message
        arConnectionModel.distance = audienceList[i].networkDistance
        arConnectionModel.connectionId = audienceList[i].conId
        arConnectionModel.name = audienceList[i].name
        arConnectionModel.firstName = audienceList[i].firstName
        arConnectionModel.lastName = audienceList[i].lastName
        arConnectionModel.conversationUrnId = ''
        arConnectionModel['attachement'] = getMfuStore.uploads.length ? getMfuStore.uploads : []

        sendMessageToConnection(arConnectionModel, (result) => {
            if(result.status == 'successful') {
                displaySent = `
                    <li>Message sent to: <b>${arConnectionModel.name}</b></li>
                    <li>Total message sent: <b>${i +1}</b></li>
                `;
                $('.message-followup-notice').show()
                $('#displayMessageFollowUpStatus').html(displaySent)
            }else {
                $('.startFollowUpAction').attr('disabled', false)
                $('.message-followup-notice').show()
                $('#displayMessageFollowUpStatus').html(`<li>${result.message}</li>`)
            }
        })
        await sleep(30000)
    }
    $('.startFollowUpAction').attr('disabled', false)
}