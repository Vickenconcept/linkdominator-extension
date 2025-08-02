// Debug: Add global click listener for testing
$(document).ready(function() {
    console.log('✅ Message Target Users Action script loaded');
    
    // Test if the button exists
    setTimeout(() => {
        const button = $('.messageTargetUserAction');
        console.log('🔍 Found messageTargetUserAction buttons:', button.length);
        
        if (button.length > 0) {
            console.log('✅ Button found, click handler should be attached');
        } else {
            console.log('❌ No messageTargetUserAction button found');
        }
    }, 2000);
});

$('.messageTargetUserAction').click(async function() {
    try {
        console.log('🔍 Starting Message Targeted Users process...');
        
        // Clear previous status
        $('#displayMessageTargetStatus').empty();
        $('#mtu-error-notice').empty();

        // Get form values
        const form = {
            startPosition: $('#mtu-startPosition'),
            total: $('#mtu-totalMessageConnect'),
            delay: $('#mtu-delayTime'),
            message: $('#mtu-personalMessage'),
            audience: $('#mtu-selectAudience'),
            searchTerm: $('#mtu-search-term')
        };

        // Validate fields
        const errors = [];
        
        // Required fields
        if (!form.total.val()) errors.push('Total messages is required');
        if (!form.delay.val()) errors.push('Delay is required');
        if (!form.message.val()) errors.push('Message is required');
        
        // Delay minimum
        if (form.delay.val() && parseInt(form.delay.val()) < 30) {
            errors.push('Delay must be at least 30 seconds');
        }

        // Show errors if any
        if (errors.length > 0) {
            console.log('❌ Validation errors:', errors);
            $('#mtu-error-notice').html(`
                <div class="alert alert-danger">
                    <ul style="margin-bottom: 0;">
                        ${errors.map(error => `<li>${error}</li>`).join('')}
                    </ul>
                </div>
            `);
            return;
        }

        // Clear any previous errors
        $('#mtu-error-notice').html('');

        // Disable send button
        $(this).attr('disabled', true);
        
        // Get excluded connection IDs
        const mtuConnectionIds = [];
        $('#mtu-selectedExConnect li').each(function() {
            const connectionId = $(this).data('connectionid');
            if (connectionId) mtuConnectionIds.push(connectionId);
        });

        // Build query parameters
        let queryParams = '';

        // Check filter selections
        if ($('#mtu-selectedConnectOf li').length > 0) {
            queryParams += setFIlterQueryParams('#mtu-selectedConnectOf', 'connectionid', 'connectionOf');
        }
        if ($('#mtu-selectedLocation li').length > 0) {
            queryParams += setFIlterQueryParams('#mtu-selectedLocation', 'regionid', 'geoUrn');
        }
        if ($('#mtu-selectedSchool li').length > 0) {
            queryParams += setFIlterQueryParams('#mtu-selectedSchool', 'schoolid', 'schoolFilter');
        }
        if ($('#mtu-selectedCurrComp li').length > 0) {
            queryParams += setFIlterQueryParams('#mtu-selectedCurrComp', 'currcompid', 'currentCompany');
        }
        if ($('#mtu-selectedPastComp li').length > 0) {
            queryParams += setFIlterQueryParams('#mtu-selectedPastComp', 'pastcompid', 'pastCompany');
        }
        if ($('#mtu-selectedIndustry li').length > 0) {
            queryParams += setFIlterQueryParams('#mtu-selectedIndustry', 'industryid', 'industry');
        }
        if ($('#mtu-selectedLanguage li').length > 0) {
            queryParams += setFIlterQueryParams('#mtu-selectedLanguage', 'langcode', 'profileLanguage');
        }

        // Add free text filters
        if ($('#mtu-firstName').val()) {
            queryParams += setFIlterQueryParamsFreeText('#mtu-firstName', 'firstName');
        }
        if ($('#mtu-lastName').val()) {
            queryParams += setFIlterQueryParamsFreeText('#mtu-lastName', 'lastName');
        }
        if ($('#mtu-school').val()) {
            queryParams += setFIlterQueryParamsFreeText('#mtu-school', 'schoolFreetext');
        }
        if ($('#mtu-title').val()) {
            queryParams += setFIlterQueryParamsFreeText('#mtu-title', 'title');
        }
        if ($('#mtu-company').val()) {
            queryParams += setFIlterQueryParamsFreeText('#mtu-company', 'company');
        }

        // Set minimum total and default start position
        const processedValues = {
            total: Math.max(parseInt(form.total.val()), 10),
            startPosition: parseInt(form.startPosition.val()) || 0,
            delay: parseInt(form.delay.val()),
            message: form.message.val()
        };

        console.log('📝 Processed values:', processedValues);

        // Show processing state
        $('.message-target-notice').show();
        $('#displayMessageTargetStatus').html(`
            <div class="alert alert-info">
                <i class="fas fa-spinner fa-spin"></i> Processing request...
            </div>
        `);

        // Process based on audience selection
        if (!form.audience.val()) {
            console.log('🔍 No audience selected, using connection search...');
            
            let query;
            if (form.searchTerm.val()) {
                query = `(keywords:${encodeURIComponent(form.searchTerm.val())},flagshipSearchIntent:SEARCH_SRP,queryParameters:(${queryParams}resultType:List(PEOPLE)),includeFiltersInResponse:false)`;
            } else {
                query = `(flagshipSearchIntent:SEARCH_SRP,queryParameters:(${queryParams}resultType:List(PEOPLE)),includeFiltersInResponse:false)`;
            }
            
            await mtuGetConnections(
                query,
                processedValues.startPosition,
                processedValues.total,
                processedValues.delay,
                processedValues.message,
                mtuConnectionIds
            );
        } else {
            console.log('👥 Using selected audience:', form.audience.val());
            const audience = parseInt(form.audience.val());
            await mtuGetAudienceData(
                processedValues.message,
                processedValues.delay,
                audience
            );
        }

    } catch (error) {
        console.error('❌ Error in send button handler:', error);
        $('#mtu-error-notice').html(`
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-circle"></i> Error: ${error.message}
            </div>
        `);
        $('.messageTargetUserAction').attr('disabled', false);
    }
});

const mtuGetConnections = async (queryParams,mtuStartP,mtuTotal,mtuDelay,mtuMessage,mtuConnectionIds) => {
    $('.message-target-notice').show()
    $('#displayMessageTargetStatus').empty()
    $('#displayMessageTargetStatus').html('Scanning. Please wait...')
    let messageItems = [], totalResultCount = 0;

    let getConnectionsLooper = () => {
        setTimeout(async () => {
            await $.ajax({
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
                url: `${voyagerBlockSearchUrl}&query=${queryParams}&start=${mtuStartP}`,
                success: function(data) {
                    let res = {'data': data}
                    let elements = res['data'].data.elements

                    if(elements.length) {
                        if(totalResultCount == 0)
                            totalResultCount = res['data'].data.metadata.totalResultCount

                        if(elements[1].items.length) {
                            for(let item of elements[1].items) {
                                messageItems.push(item)
                            }

                            if(messageItems.length < mtuTotal) {
                                mtuStartP = parseInt(mtuStartP) + 11
                                $('#mtu-startPosition').val(mtuStartP)
                                getConnectionsLooper()
                            }else {
                                mtuCleanConnectionsData(messageItems,totalResultCount,mtuDelay,mtuMessage,mtuConnectionIds)
                            }
                        }else if(!elements[1].items.length && !messageItems.length) {
                            $('#displayMessageTargetStatus').html('No result found, change your search criteria and try again!')
                            $('.messageTargetUserAction').attr('disabled', false)
                        }else if(!elements[1].items.length && messageItems.length) {
                            $('#displayMessageTargetStatus').html(`Found ${messageItems.length}. Messaging...`)
                            mtuCleanConnectionsData(messageItems,totalResultCount,mtuDelay,mtuMessage,mtuConnectionIds)
                        }

                    }else if(messageItems.length) {
                        $('#displayMessageTargetStatus').html(`Found ${messageItems.length}. Messaging...`)
                        mtuCleanConnectionsData(messageItems,totalResultCount,mtuDelay,mtuMessage,mtuConnectionIds)
                    }else {
                        $('#displayMessageTargetStatus').html('No result found, change your search criteria and try again!')
                        $('.messageTargetUserAction').attr('disabled', false)
                    }
                },
                error: function(error){
                    console.log(error)
                    $('#displayMessageTargetStatus').html('Something went wrong while trying to get connections!')
                    $('.messageTargetUserAction').attr('disabled', false)
                }
            })
        },10000)
    }
    getConnectionsLooper()
}

const mtuCleanConnectionsData = (messageItems, totalResultCount, mtuDelay, mtuMessage, mtuConnectionIds) => {
    try {
        console.log('🔍 Cleaning connections data...');
        let conArr = [], totalMessage = [];
        let newConArr, profileUrn;
        
        // Initialize storage if not exists
        let getMtuStore = localStorage.getItem('lkm-mtu');
        if (!getMtuStore) {
            getMtuStore = {
                position: 0,
                delay: 30,
                total: 10,
                uploads: []
            };
            localStorage.setItem('lkm-mtu', JSON.stringify(getMtuStore));
        } else {
            getMtuStore = JSON.parse(getMtuStore);
        }

        // Update store params
        if ($('#mtu-startPosition').val()) {
            getMtuStore.position = parseInt($('#mtu-startPosition').val());
        }
        if ($('#mtu-totalMessageConnect').val()) {
            getMtuStore.total = parseInt($('#mtu-totalMessageConnect').val());
        }
        if ($('#mtu-delayTime').val()) {
            getMtuStore.delay = parseInt($('#mtu-delayTime').val());
        }
        localStorage.setItem('lkm-mtu', JSON.stringify(getMtuStore));

        for (let item of messageItems) {
            profileUrn = item.itemUnion['*entityResult'];
            if (profileUrn.includes('urn:li:fsd_entityResultViewModel:(urn:li:fsd_profile:') && 
                profileUrn.includes(',SEARCH_SRP,DEFAULT)')) {

                profileUrn = profileUrn.replace('urn:li:fsd_entityResultViewModel:(urn:li:fsd_profile:', '');
                profileUrn = profileUrn.replace(',SEARCH_SRP,DEFAULT)', '');

                conArr.push({
                    conId: profileUrn,
                    totalResultCount: totalResultCount
                });
            }
        }

        // Exclude connection if connectid exist in mtuConnectionIds
        if (mtuConnectionIds.length > 0) {
            const namesToDeleteSet = new Set(mtuConnectionIds);
            newConArr = conArr.filter((conArr) => {
                return !namesToDeleteSet.has(conArr.conId);
            });
        } else {
            newConArr = conArr;
        }

        // Get only user defined total
        for (let z = 0; z < newConArr.length; z++) {
            if (z < parseInt($('#mtu-totalMessageConnect').val())) {
                totalMessage.push(newConArr[z]);
            } else {
                break;
            }
        }

        console.log(`✅ Found ${totalMessage.length} connections to message`);
        mtuGetProfileInfo(mtuMessage, mtuDelay, totalMessage);

    } catch (error) {
        console.error('❌ Error in mtuCleanConnectionsData:', error);
        $('#displayMessageTargetStatus').html(`
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-circle"></i> Error processing connections: ${error.message}
            </div>
        `);
        $('.messageTargetUserAction').attr('disabled', false);
    }
};

const mtuGetAudienceData = async (mtuMessage, mtuDelay, audience) => {
    try {
        console.log(`🔍 Fetching audience data for audience ID: ${audience}`);
        
        // Show loading state
        $('.message-target-notice').show();
        $('#displayMessageTargetStatus').html(`
            <div class="alert alert-info">
                <i class="fas fa-spinner fa-spin"></i> Loading audience connections...
            </div>
        `);

        const response = await $.ajax({
            method: 'get',
            url: `${filterApi}/audience/list?audienceId=${audience}&totalCount=${$('#mtu-totalMessageConnect').val()}`,
            beforeSend: function(request) {
                if (linkedinId) {
                    request.setRequestHeader('lk-id', linkedinId);
                }
            }
        });

        console.log('📊 Audience API response:', response);

        if (!response || !response.audience) {
            console.log('❌ No audience data returned');
            $('#displayMessageTargetStatus').html(`
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle"></i> No audience data found
                </div>
            `);
            $('.messageTargetUserAction').attr('disabled', false);
            return;
        }

        const audienceData = response.audience;
        if (!audienceData || audienceData.length === 0) {
            console.log('❌ No connections in audience');
            $('#displayMessageTargetStatus').html(`
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle"></i> No connections found in this audience
                </div>
            `);
            $('.messageTargetUserAction').attr('disabled', false);
            return;
        }

        console.log(`📋 Processing ${audienceData.length} connections from audience`);

        const conArr = [];
        for (let i = 0; i < audienceData.length; i++) {
            const connection = audienceData[i];
            
            let netDistance = null;
            if (connection.con_distance != null) {
                netDistance = connection.con_distance.split("_");
            }

            let targetId = null;
            if (connection.con_member_urn && connection.con_member_urn.includes('urn:li:member:')) {
                targetId = connection.con_member_urn.replace('urn:li:member:', '');
            }

            // Only include connections (commented out distance filter for now)
            // if (netDistance && parseInt(netDistance[1]) == 1) {
                conArr.push({
                    name: `${connection.con_first_name} ${connection.con_last_name}`,
                    firstName: connection.con_first_name,
                    lastName: connection.con_last_name,
                    title: connection.con_job_title,
                    conId: connection.con_id,
                    totalResultCount: audienceData.length,
                    publicIdentifier: connection.con_public_identifier,
                    memberUrn: connection.con_member_urn,
                    networkDistance: netDistance ? parseInt(netDistance[1]) : 1,
                    trackingId: connection.con_tracking_id,
                    navigationUrl: `${LINKEDIN_URL}/in/${connection.con_public_identifier}`,
                    targetId: targetId ? parseInt(targetId) : null,
                    netDistance: netDistance ? parseInt(netDistance[1]) : 1,
                });
            // }
        }

        console.log(`✅ Prepared ${conArr.length} connections for messaging`);

        if (conArr.length > 0) {
            console.log('🚀 About to call mtuSendMessageToConnection with:', {
                message: mtuMessage,
                delay: mtuDelay,
                connections: conArr.length
            });
            await mtuSendMessageToConnection(mtuMessage, mtuDelay, conArr);
        } else {
            console.log('❌ No valid connections found');
            $('#displayMessageTargetStatus').html(`
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle"></i> No 1st degree connections found.<br>Messages can only be sent to first degree connections
                </div>
            `);
            $('.messageTargetUserAction').attr('disabled', false);
        }

    } catch (error) {
        console.error('❌ Error in mtuGetAudienceData:', error);
        
        let errorMessage = 'Failed to load audience data';
        if (error.responseJSON && error.responseJSON.message) {
            errorMessage = error.responseJSON.message;
        } else if (error.responseText) {
            errorMessage = error.responseText;
        } else if (error.message) {
            errorMessage = error.message;
        }

        $('#displayMessageTargetStatus').html(`
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-circle"></i> Error: ${errorMessage}
            </div>
        `);
        $('.messageTargetUserAction').attr('disabled', false);
    }
};

const mtuGetProfileInfo = (mtuMessage, mtuDelay, totalMessage) => {
    $('#displayMessageTargetStatus').html('Getting connection info. Please wait...')
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
                mtuSendMessageToConnection(mtuMessage, mtuDelay, profileInfos);
        }, 30000)
    }
    gciLooper()
}

// var timeOutMsgTargetUsers;
// const mtuSendMessage = async (mtuMessage, mtuDelay, totalMessage) => {
//     var displayLi = '', i = 0, x= 0, newMessage = '', displayAutomationRecord = '';
//     let getMtuStore = JSON.parse(localStorage.getItem('lkm-mtu'));

//     $('.message-target-notice').show()

//     // automation table data setup
//     displayAutomationRecord = `
//         <tr id="message-targeted-users-record">
//             <td>Message Targeted Users</td>
//             <td id="mtu-status">Running</td>
//             <td>${totalMessage.length}</td>
//             <td id="mtu-numbered">0/${totalMessage.length}</td>
//             <td id="mtu-bot-action" title="Stop automation"><i class="far fa-dot-circle fa-lg text-danger cursorr"></i></td>
//             <td id="mtu-remained-time">${remainedTime(mtuDelay,totalMessage.length)}</td>
//         </tr>
//     `;
//     $('#no-job').hide()
//     $('#automation-list').append(displayAutomationRecord)
    

//     var mtuLooper = () => {
//         timeOutMsgTargetUsers = setTimeout(async function(){
//             newMessage = changeMessageVariableNames(mtuMessage, totalMessage[i])

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
//                                     attachments: getMtuStore.uploads.length ? getMtuStore.uploads : [],
//                                     body: newMessage, // message
//                                 }
//                             }
//                         },
//                         recipients: [totalMessage[i].conId],
//                         subtype: totalMessage[i].netDistance == 1 ? "MEMBER_TO_MEMBER" : "INMAIL"
//                     }
//                 }),
//                 success: function(data){
//                     if(data.value.createdAt){
//                         let conversationUrnId = data.value.backendEventUrn.replace('urn:li:messagingMessage:','')

//                         sendDeliveryAcknowledgement(conversationUrnId)

//                         $('#displayMessageTargetStatus').empty()
//                         displayLi = `
//                             <li>Message sent to: <b>${totalMessage[i].name}</b></li>
//                             <li>Total message sent: <b>${x +1}</b></li>
//                         `;
//                         $('#displayMessageTargetStatus').append(displayLi)

//                         // update automation count done and time remained
//                         $('#mtu-numbered').text(`${x +1}/${totalMessage.length}`)
//                         $('#mtu-remained-time').text(`${remainedTime(mtuDelay, totalMessage.length - (x +1))}`)

//                         if($('#mtu-viewProfile').prop('checked') == true){
//                             // mtuViewProfile(totalMessage[i])
//                         }
//                         x++;

//                     }else{
//                         $('#displayMessageTargetStatus').empty()
//                         $('#displayMessageTargetStatus').html('Something went wrong. Please try again')
//                         $('.messageTargetUserAction').attr('disabled', false)
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
//                             Message inbox might be locked or user is not a 1st degree connection.
//                         `;
//                     }else {
//                         msg = ''
//                     }
                    
//                     $('#displayMessageTargetStatus').empty()
//                     $('#displayMessageTargetStatus').html(msg)
//                     $('.messageTargetUserAction').attr('disabled', false)
//                 }
//             })
//             i++;
//             if(i < totalMessage.length)
//                 mtuLooper()
//             if(i >= totalMessage.length){
//                 $('.messageTargetUserAction').attr('disabled', false)

//                 let module = 'Message sent';
//                 sendStats(x, module)

//                 if($('#mtu-viewProfile').prop('checked') == true){
//                     let module = 'Profile viwed';
//                     sendStats(x, module)
//                 }

//                 // update automation status
//                 $('#mtu-status').text('Completed')
//                 setTimeout(function(){
//                     $('#message-targeted-users-record').remove()
//                 }, 5000)
//             }
//         }, mtuDelay*1000)
//     }
//     mtuLooper()
// }

const mtuSendMessageToConnection = async (mtuMessage, mtuDelay, totalMessage) => {
    try {
        console.log('🔍 Starting Message Targeted Users for', totalMessage.length, 'connections');
        console.log('🔍 mtuSendMessageToConnection called with:', {
            messageLength: mtuMessage?.length || 0,
            delay: mtuDelay,
            connectionsCount: totalMessage?.length || 0,
            firstConnection: totalMessage?.[0]?.name || 'N/A'
        });
        
        var displayLi = '';
        let x = 0;
        
        // Initialize storage if not exists
        let getMtuStore = localStorage.getItem('lkm-mtu');
        if (!getMtuStore) {
            getMtuStore = { uploads: [] };
        } else {
            getMtuStore = JSON.parse(getMtuStore);
        }

        $('.message-target-notice').show();

        // automation table data setup
        const displayAutomationRecord = `
            <tr id="message-targeted-users-record">
                <td>Message Targeted Users</td>
                <td id="mtu-status">Running</td>
                <td>${totalMessage.length}</td>
                <td id="mtu-numbered">0/${totalMessage.length}</td>
                <td id="mtu-bot-action" title="Stop automation">
                    <i class="far fa-dot-circle fa-lg text-danger cursorr"></i>
                </td>
                <td id="mtu-remained-time">${remainedTime(mtuDelay, totalMessage.length)}</td>
            </tr>
        `;
        $('#no-job').hide();
        $('#automation-list').append(displayAutomationRecord);

        for (const [i, item] of totalMessage.entries()) {
            try {
                // Prepare message parameters with fallbacks
                const params = {
                    message: mtuMessage || '',
                    name: item.name || `${item.firstName || ''} ${item.lastName || ''}`.trim(),
                    firstName: item.firstName || '',
                    lastName: item.lastName || '',
                    distance: item.netDistance || 2,
                    connectionId: item.conId,
                    attachement: getMtuStore?.uploads?.length ? getMtuStore.uploads : []
                };

                console.log(`📧 Sending message to: ${params.name} (${i + 1}/${totalMessage.length})`);

                // Check if sendMessageToConnection function exists
                if (typeof sendMessageToConnection !== 'function') {
                    throw new Error('sendMessageToConnection function is not available. Make sure universalAction.js is loaded.');
                }

                // Send message using async/await
                const result = await sendMessageToConnection(params);
                
                if (result.status === 'successful') {
                    console.log('✅ Message sent successfully to:', params.name);
                    displayLi = `
                        <li>✅ Message sent to: <b>${params.name}</b></li>
                        <li>Total sent: <b>${i + 1}</b></li>
                    `;
                    $('#displayMessageTargetStatus').html(displayLi);

                    // Update automation count and time remaining
                    $('#mtu-numbered').text(`${i + 1}/${totalMessage.length}`);
                    $('#mtu-remained-time').text(`${remainedTime(mtuDelay, totalMessage.length - (i + 1))}`);
                    x++;
                } else {
                    console.log('❌ Failed to send message to:', params.name, result.message);
                    $('#displayMessageTargetStatus').html(`
                        <li style="color: red;">❌ Failed to send message to: <b>${params.name}</b></li>
                        <li>Error: ${result.message || 'Unknown error'}</li>
                        <li>Continuing with next connection...</li>
                    `);
                }

                // Add delay between messages (except for the last one)
                if (i < totalMessage.length - 1) {
                    console.log(`⏱️ Waiting ${mtuDelay} seconds before next message...`);
                    await sleep(mtuDelay * 1000);
                }

            } catch (itemError) {
                console.error('❌ Error processing connection:', item.name, itemError);
                $('#displayMessageTargetStatus').html(`
                    <li style="color: red;">❌ Error with: <b>${item.name}</b></li>
                    <li>Error: ${itemError.message}</li>
                    <li>Continuing with next connection...</li>
                `);
                continue; // Continue with next connection
            }
        }

        // Enable button and update status
        $('.messageTargetUserAction').attr('disabled', false);
        $('#mtu-status').text('Completed');
        
        // Remove automation record after delay
        setTimeout(() => {
            $('#message-targeted-users-record').remove();
        }, 5000);

        // Send stats
        if (x > 0) {
            console.log('📊 Sending stats:', x, 'messages sent');
            sendStats(x, 'Message sent');
        }

    } catch (error) {
        console.error('❌ Fatal error in mtuSendMessageToConnection:', error);
        $('#displayMessageTargetStatus').html(`
            <li style="color: red;">❌ Fatal error: ${error.message}</li>
            <li>Please try again or check console for details</li>
        `);
        $('.messageTargetUserAction').attr('disabled', false);
        $('#mtu-status').text('Error');
    }
};

const mtuViewProfile = async (totalMessage) => {
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
                    targetId: totalMessage.targetId,
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
                        trackingId: totalMessage.trackingId
                    },
                    time: dInt
                },
                networkDistance: totalMessage.networkDistance,
                profileTrackingId: totalMessage.trackingId,
                requestHeader: {
                    interfaceLocale: "en_US",
                    pageKey: "d_flagship3_profile_view_base",
                    path: totalMessage.navigationUrl,
                    referer: LINKEDIN_URL,
                    trackingCode: "d_flagship3_feed"
                },
                vieweeMemberUrn: totalMessage.memberUrn,
                viewerPrivacySetting: "F",
            },
            eventInfo: {
                appId: "com.linkedin.flagship3.d_web",
                eventName: "ProfileViewEvent",
                topicName: "ProfileViewEvent"
            }
        }]),
        success: function(data){
            
        },
        error: function(error){
            console.log(error)
            $('.endorseConnectionAction').attr('disabled', false)
        }
    })
}

// stop automation 
$('body').on('click','#mtu-bot-action',function(){
    clearTimeout(timeOutMsgTargetUsers);
    $('#mtu-status').text('Stopped')
    $('.messageTargetUserAction').attr('disabled', false)
    setTimeout(function(){
        $('#message-targeted-users-record').remove()
    }, 5000)
})