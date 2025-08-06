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
            // Check for extension context errors
            if (chrome.runtime.lastError) {
                if (chrome.runtime.lastError.message && chrome.runtime.lastError.message.includes('Extension context invalidated')) {
                    console.log('🔄 Extension was reloaded during message followup, this is normal behavior');
                    return;
                }
                console.error('❌ Error sending message followup:', chrome.runtime.lastError);
                return;
            }
            
            $('.message-followup-notice').show()
            $('#displayMessageFollowUpStatus').html(`<li>Schedule added</li>`)
        })
    }
})

/**
 * Start followup instantly
 */
$('body').on('click','.startFollowUpAction',function() {
    console.log('🚀 Follow Up Connections: Starting instant follow-up process...');
    $('.startFollowUpAction').attr('disabled', true)

    let data = followupFieldsValidation()

    if(data !== false) {
        console.log('✅ Follow Up Connections: Validation passed', {
            audienceId: data.audienceId,
            totalAudience: data.totalAudience,
            sleepTime: data.sleepTime,
            messageLength: data.message.length
        });
        
        try {
            console.log('🔍 Follow Up Connections: Fetching audience data...');
            console.log('📊 Follow Up Connections: API call parameters:', {
                audienceId: data.audienceId,
                totalAudience: data.totalAudience,
                filterApi: filterApi
            });
            
            // Add timeout to prevent hanging
            let timeoutId;
            let callbackCalled = false;
            
            const audienceCallback = (result) => {
                if (callbackCalled) return; // Prevent double execution
                callbackCalled = true;
                clearTimeout(timeoutId);
                
                console.log('📊 Follow Up Connections: Audience fetch result:', result);
                console.log('📊 Follow Up Connections: audienceList length:', audienceList ? audienceList.length : 'undefined');
                console.log('📊 Follow Up Connections: audienceList content:', audienceList);
                
                if(audienceList && audienceList.length > 0) {
                    console.log(`👥 Follow Up Connections: Found ${audienceList.length} connections in audience`);
                    sendFollowupMessage(data);
                } else {
                    console.log('⚠️ Follow Up Connections: No connections found in audience or audienceList is empty');
                    $('.startFollowUpAction').attr('disabled', false);
                    $('.message-followup-notice').show();
                    $('#displayMessageFollowUpStatus').html(`<li style="color: orange;">No connections found in selected audience</li>`);
                }
            };
            
            // Set timeout for API call
            timeoutId = setTimeout(() => {
                if (!callbackCalled) {
                    callbackCalled = true;
                    console.error('⏰ Follow Up Connections: API call timed out after 30 seconds');
                    $('.startFollowUpAction').attr('disabled', false);
                    $('.message-followup-notice').show();
                    $('#displayMessageFollowUpStatus').html(`<li style="color: red;">API call timed out. Please try again.</li>`);
                }
            }, 30000); // 30 second timeout
            
            // Check if required variables are available
            console.log('🔍 Follow Up Connections: Checking required variables:', {
                filterApiExists: typeof filterApi !== 'undefined',
                filterApiValue: filterApi,
                getAudienceExists: typeof getAudience !== 'undefined',
                audienceListExists: typeof audienceList !== 'undefined'
            });
            
            if (typeof filterApi === 'undefined') {
                console.error('❌ Follow Up Connections: filterApi is undefined');
                $('.startFollowUpAction').attr('disabled', false);
                $('.message-followup-notice').show();
                $('#displayMessageFollowUpStatus').html(`<li style="color: red;">System error: API endpoint not available</li>`);
                return;
            }
            
            if (typeof getAudience === 'undefined') {
                console.error('❌ Follow Up Connections: getAudience function is undefined');
                $('.startFollowUpAction').attr('disabled', false);
                $('.message-followup-notice').show();
                $('#displayMessageFollowUpStatus').html(`<li style="color: red;">System error: Audience function not available</li>`);
                return;
            }
            
            getAudience(data.audienceId, data.totalAudience, filterApi, audienceCallback);
            
        } catch (error) {
            console.error('❌ Follow Up Connections: Error during audience fetch:', error);
            $('.startFollowUpAction').attr('disabled', false)
            $('.message-followup-notice').show()
            $('#displayMessageFollowUpStatus').html(`<li style="color: red;">Error: ${error}</li>`)
            return;
        }
    } else {
        console.log('❌ Follow Up Connections: Validation failed');
        $('.startFollowUpAction').attr('disabled', false);
    }
})

/**
 * Validate audience is selected
 */
const followupFieldsValidation = () => {
    console.log('🔍 Follow Up Connections: Starting field validation...');
    
    let audienceId = $('#mfu-selectAudience').val(),
        message = $('#mfu-personalMessage').val(),
        totalAudience = $('#mfu-total').val(),
        sleepTime = $('#mfu-delayTime').val(),
        scheduledTime = $('#mfu-waitDays').val();

    console.log('📋 Follow Up Connections: Field values:', {
        audienceId: audienceId,
        messageLength: message ? message.length : 0,
        totalAudience: totalAudience,
        sleepTime: sleepTime,
        scheduledTime: scheduledTime
    });

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
            console.log(`❌ Follow Up Connections: Validation failed for field: ${field.field}`);
            $('.startFollowUpAction').attr('disabled', false)
            $('.message-followup-notice').show()
            $('#displayMessageFollowUpStatus').html(`<li style="color: red;">${field.field} field is required.</li>`)
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
    console.log('📤 Follow Up Connections: Starting message sending process...', {
        totalConnections: audienceList.length,
        delayBetweenMessages: data.sleepTime
    });
    
    let getMfuStore = JSON.parse(localStorage.getItem('lkm-mfu'));
    let successCount = 0;
    let failureCount = 0;
    let processedCount = 0;

    // Show initial status
    $('.message-followup-notice').show();
    $('#displayMessageFollowUpStatus').html(`
        <li style="color: blue; font-weight: bold;">🚀 Starting follow-up process...</li>
        <li style="color: blue;">📊 Total connections to message: ${audienceList.length}</li>
        <li style="color: blue;">⏱️ Delay between messages: ${data.sleepTime} seconds</li>
    `);

    for(const [i, item] of audienceList.entries()) {
        console.log(`📧 Follow Up Connections: Processing ${i+1}/${audienceList.length}: ${item.name}`);
        
        // Prepare message data
        arConnectionModel.message = data.message
        arConnectionModel.distance = audienceList[i].networkDistance
        arConnectionModel.connectionId = audienceList[i].conId
        arConnectionModel.name = audienceList[i].name
        arConnectionModel.firstName = audienceList[i].firstName
        arConnectionModel.lastName = audienceList[i].lastName
        arConnectionModel.conversationUrnId = ''
        arConnectionModel['attachement'] = getMfuStore.uploads.length ? getMfuStore.uploads : []

        console.log(`📝 Follow Up Connections: Message details for ${item.name}:`, {
            connectionId: arConnectionModel.connectionId,
            networkDistance: arConnectionModel.distance,
            hasAttachments: arConnectionModel.attachement.length > 0,
            messagePreview: data.message.substring(0, 50) + (data.message.length > 50 ? '...' : '')
        });

        // Send message using async/await pattern
        try {
            const result = await sendMessageToConnection(arConnectionModel);
            processedCount++;
            
            if(result.status == 'successful') {
                successCount++;
                console.log(`✅ Follow Up Connections: Message sent successfully to ${arConnectionModel.name} (${i+1}/${audienceList.length})`);
                
                let displaySent = `
                    <li style="color: green;">✅ Message sent to: <b>${arConnectionModel.name}</b></li>
                    <li style="color: green;">📊 Success: ${successCount} | Failed: ${failureCount} | Total: ${processedCount}/${audienceList.length}</li>
                    <li style="color: blue;">⏳ Processing connection ${i+1} of ${audienceList.length}...</li>
                `;
                $('#displayMessageFollowUpStatus').html(displaySent);
            } else {
                failureCount++;
                console.error(`❌ Follow Up Connections: Failed to send message to ${arConnectionModel.name}:`, result);
                
                // Enhanced error display with specific error handling
                let errorReason = result.message || 'Unknown error';
                let errorColor = 'red';
                
                // Handle specific LinkedIn error codes with better messaging
                if (result.errorCode === 'UNRESPONDED_INMAIL_EXISTS') {
                    errorReason = 'Previous message awaiting response';
                    errorColor = 'orange';
                } else if (result.errorCode === 'NOT_ENOUGH_CREDIT') {
                    errorReason = 'Insufficient InMail credits';
                    errorColor = 'red';
                } else if (result.errorCode === 'INVALID_RECIPIENT') {
                    errorReason = 'Invalid recipient profile';
                    errorColor = 'red';
                } else if (result.errorCode === 'MESSAGE_QUOTA_EXCEEDED') {
                    errorReason = 'Daily message limit reached';
                    errorColor = 'red';
                } else if (result.errorCode === 403) {
                    errorReason = 'Access denied or profile private';
                    errorColor = 'orange';
                }
                
                let displayError = `
                    <li style="color: ${errorColor};">❌ Failed to send to: <b>${arConnectionModel.name}</b></li>
                    <li style="color: ${errorColor};">🔍 Reason: ${errorReason}</li>
                    <li style="color: green;">📊 Success: ${successCount} | Failed: ${failureCount} | Total: ${processedCount}/${audienceList.length}</li>
                    <li style="color: blue;">⏳ Processing connection ${i+1} of ${audienceList.length}...</li>
                `;
                $('#displayMessageFollowUpStatus').html(displayError);
            }
        } catch (error) {
            processedCount++;
            failureCount++;
            console.error(`❌ Follow Up Connections: Unexpected error sending message to ${arConnectionModel.name}:`, error);
            
            let displayError = `
                <li style="color: red;">❌ Failed to send to: <b>${arConnectionModel.name}</b></li>
                <li style="color: red;">🔍 Reason: Unexpected error - ${error.message}</li>
                <li style="color: green;">📊 Success: ${successCount} | Failed: ${failureCount} | Total: ${processedCount}/${audienceList.length}</li>
                <li style="color: blue;">⏳ Processing connection ${i+1} of ${audienceList.length}...</li>
            `;
            $('#displayMessageFollowUpStatus').html(displayError);
        }

        // Wait before next message (except for the last one)
        if (i < audienceList.length - 1) {
            console.log(`⏳ Follow Up Connections: Waiting ${data.sleepTime} seconds before next message...`);
            await sleep(data.sleepTime * 1000);
        }
    }

    // Final summary
    console.log('🏁 Follow Up Connections: Process completed!', {
        totalProcessed: processedCount,
        successful: successCount,
        failed: failureCount,
        successRate: `${Math.round((successCount / processedCount) * 100)}%`
    });

    let finalSummary = `
        <li style="color: blue; font-weight: bold;">🏁 Follow-up process completed!</li>
        <li style="color: green;">✅ Successfully sent: ${successCount}</li>
        <li style="color: red;">❌ Failed: ${failureCount}</li>
        <li style="color: blue;">📊 Success rate: ${Math.round((successCount / processedCount) * 100)}%</li>
    `;
    $('#displayMessageFollowUpStatus').html(finalSummary);
    
    $('.startFollowUpAction').attr('disabled', false);
}