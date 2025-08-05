
$('.messageConnectsAction').click(async function() {
    try {
        console.log('🔍 Starting message send process...');
        
        // Clear previous status
        $('#displayMessageConnectsStatus').empty();
        $('#mac-error-notice').empty();

        // Get form values
        const form = {
            startPosition: $('#mac-startPosition'),
            total: $('#mac-totalMessage'),
            delay: $('#mac-delayFollowTime'),
            message: $('#mac-personalMessage'),
            audience: $('#mac-selectAudience')
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
            $('#mac-error-notice').html(`
                <div class="alert alert-danger">
                    <ul style="margin-bottom: 0;">
                        ${errors.map(error => `<li>${error}</li>`).join('')}
                    </ul>
                </div>
            `);
            return;
        }

        // Clear any previous errors
        $('#mac-error-notice').html('');

        // Disable send button
        $(this).attr('disabled', true);
        
        // Get excluded connection IDs
        const macConnectionIds = [];
        $('#mac-selectedConnect li').each(function() {
            const connectionId = $(this).data('connectionid');
            if (connectionId) macConnectionIds.push(connectionId);
        });

        // Set minimum total and default start position
        const processedValues = {
            total: Math.max(parseInt(form.total.val()), 10),
            startPosition: parseInt(form.startPosition.val()) || 0,
            delay: parseInt(form.delay.val()),
            message: form.message.val()
        };

        console.log('📝 Processed values:', processedValues);

        // Show processing state
        $('.message-connects-notice').show();
        $('#displayMessageConnectsStatus').html(`
            <div class="alert alert-info">
                <i class="fas fa-spinner fa-spin"></i> Processing request...
            </div>
        `);

        // Process based on audience selection
        if (!form.audience.val()) {
            console.log('🔍 No audience selected, using connection search...');
            const query = `(flagshipSearchIntent:SEARCH_SRP,queryParameters:(network:List(F),resultType:List(PEOPLE)),includeFiltersInResponse:false)`;
            
            await macGetConnections(
                query,
                processedValues.startPosition,
                processedValues.total,
                processedValues.message,
                processedValues.delay,
                macConnectionIds
            );
        } else {
            console.log('👥 Using selected audience:', form.audience.val());
            await macAudienceList(
                form.audience.val(),
                processedValues.message,
                processedValues.delay
            );
        }

    } catch (error) {
        console.error('❌ Error in send button handler:', error);
        $('#mac-error-notice').html(`
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-circle"></i> Error: ${error.message}
            </div>
        `);
        $('.messageConnectsAction').attr('disabled', false);
    }
});

const macGetConnections = async (queryParams, macStartP, macTotal, macMessage, macDelay, macConnectionIds) => {
    try {
        console.log('🔍 Scanning for connections...');
        $('.message-connects-notice').show();
        $('#displayMessageConnectsStatus').html(`
            <div class="alert alert-info">
                <i class="fas fa-spinner fa-spin"></i> Scanning for connections...
            </div>
        `);

        let messageItems = [];
        let totalResultCount = 0;
        let retryCount = 0;
        const MAX_RETRIES = 3;

        const getConnectionsLooper = async () => {
            try {
                console.log(`📥 Fetching connections batch starting at ${macStartP}`);
                
                const response = await fetch(`${voyagerBlockSearchUrl}&query=${queryParams}&start=${macStartP}`, {
                    method: 'GET',
                    headers: {
                        'csrf-token': jsession,
                        'accept': 'application/vnd.linkedin.normalized+json+2.1',
                        'content-type': contentType,
                        'x-li-lang': xLiLang,
                        'x-li-page-instance': 'urn:li:page:d_flagship3_search_srp_people;QazGJ/pNTwuq6OTtMClfPw==',
                        'x-li-track': JSON.stringify({
                            "clientVersion": "1.10.1335",
                            "osName": "web",
                            "timezoneOffset": 1,
                            "deviceFormFactor": "DESKTOP",
                            "mpName": "voyager-web"
                        }),
                        'x-restli-protocol-version': xRestliProtocolVersion
                    },
                    credentials: 'include'
                });

                if (!response.ok) {
                    throw new Error(`API call failed: ${response.status} ${response.statusText}`);
                }

                const data = await response.json();
                const elements = data.data.elements;

                if (!elements || !elements.length) {
                    throw new Error('No elements found in response');
                }

                // Update total count if first batch
                if (totalResultCount === 0) {
                    totalResultCount = data.data.metadata.totalResultCount;
                    console.log(`📊 Total connections found: ${totalResultCount}`);
                }

                // Process items
                if (elements[1] && elements[1].items && elements[1].items.length) {
                    console.log(`✅ Found ${elements[1].items.length} connections in this batch`);
                    messageItems.push(...elements[1].items);

                    // Update status
                    $('#displayMessageConnectsStatus').html(`
                        <div class="alert alert-info">
                            <i class="fas fa-spinner fa-spin"></i> Found ${messageItems.length} connections so far...
                        </div>
                    `);

                    // Check if we need more
                    if (messageItems.length < macTotal) {
                        macStartP = parseInt(macStartP) + 11;
                        $('#mac-startPosition').val(macStartP);
                        console.log(`⏱️ Waiting 10 seconds before next batch...`);
                        await new Promise(resolve => setTimeout(resolve, 10000));
                        await getConnectionsLooper();
                    } else {
                        console.log(`✅ Found enough connections (${messageItems.length}), processing...`);
                        await macCleanConnectionsData(messageItems, totalResultCount, macMessage, macDelay, macConnectionIds);
                    }
                } else {
                    console.log('⚠️ No items found in this batch');
                    if (messageItems.length > 0) {
                        console.log(`✅ Using ${messageItems.length} previously found connections`);
                        $('#displayMessageConnectsStatus').html(`Found ${messageItems.length}. Messaging...`);
                        await macCleanConnectionsData(messageItems, totalResultCount, macMessage, macDelay, macConnectionIds);
                    } else {
                        $('#displayMessageConnectsStatus').html(`
                            <div class="alert alert-warning">
                                <i class="fas fa-exclamation-triangle"></i> No connections found.<br>
                                Please change your search criteria and try again.
                            </div>
                        `);
                        $('.messageConnectsAction').attr('disabled', false);
                    }
                }

            } catch (error) {
                console.error('❌ Error in connection loop:', error);
                retryCount++;

                if (retryCount < MAX_RETRIES) {
                    console.log(`🔄 Retry ${retryCount} of ${MAX_RETRIES}...`);
                    $('#displayMessageConnectsStatus').html(`
                        <div class="alert alert-warning">
                            <i class="fas fa-sync fa-spin"></i> Connection error, retrying (${retryCount}/${MAX_RETRIES})...
                        </div>
                    `);
                    await new Promise(resolve => setTimeout(resolve, 5000));
                    await getConnectionsLooper();
                } else {
                    throw new Error(`Failed after ${MAX_RETRIES} retries: ${error.message}`);
                }
            }
        };

        await getConnectionsLooper();

    } catch (error) {
        console.error('❌ Fatal error in macGetConnections:', error);
        $('#displayMessageConnectsStatus').html(`
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-circle"></i> Error scanning connections:<br>
                ${error.message}
            </div>
        `);
        $('.messageConnectsAction').attr('disabled', false);
    }
};

const macCleanConnectionsData = (messageItems, totalResultCount, macMessage, macDelay, macConnectionIds) => {
    let conArr = [];
    let totalMessage = [];
    let newConArr, profileUrn;
    let getMacStore = JSON.parse(localStorage.getItem('lkm-mac'));

    // update store params
    if($('#mac-startPosition').val()) {
        getMacStore.position = parseInt($('#mac-startPosition').val())
    }
    if($('#mac-totalMessage').val()) {
        getMacStore.total = parseInt($('#mac-totalMessage').val())
    }
    if($('#mac-delayFollowTime').val()) {
        getMacStore.delay = parseInt($('#mac-delayFollowTime').val())
    }
    localStorage.setItem('lkm-mac', JSON.stringify(getMacStore))

    for(let item of messageItems) {
        profileUrn = item.itemUnion['*entityResult']
        if(profileUrn.includes('urn:li:fsd_entityResultViewModel:(urn:li:fsd_profile:') && 
            profileUrn.includes(',SEARCH_SRP,DEFAULT)')) {

            profileUrn = profileUrn.replace('urn:li:fsd_entityResultViewModel:(urn:li:fsd_profile:','')
            profileUrn = profileUrn.replace(',SEARCH_SRP,DEFAULT)','')

            conArr.push({
                conId: profileUrn,
                totalResultCount: totalResultCount
            })			
        }
    }

    // exclude connection if connectid exist in conArr
    if(macConnectionIds.length > 0){
        const namesToDeleteSet = new Set(macConnectionIds);
        newConArr = conArr.filter((conArr) => {
            return !namesToDeleteSet.has(conArr.conId);
          });
    }else{
        newConArr = conArr;
    }

    // get only user defined total
    for(let z=0;z<newConArr.length;z++) {
        if(z < $('#mac-totalMessage').val()) {
            totalMessage.push(newConArr[z])
        }else{
            break;
        }
    }

    macGetProfileInfo(macMessage, macDelay, totalMessage)
}

const macGetProfileInfo = (macMessage, macDelay, totalMessage) => {
    $('#displayMessageConnectsStatus').html('Getting connection info. Please wait...')
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
                macSendMessageToConnection(macMessage, macDelay, profileInfos);
        },30000)
    }
    gciLooper()
}

const macAudienceList = async (audienceId, macMessage, macDelay) => {
    try {
        console.log('🔍 Fetching audience list:', audienceId);
        $('.message-connects-notice').show();
        $('#displayMessageConnectsStatus').html('<center><i class="fas fa-spinner fa-spin"></i> Loading audience...</center>');

        const response = await fetch(`${filterApi}/audience/list?audienceId=${audienceId}&totalCount=${$('#mac-totalMessage').val()}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`API call failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log('✅ Audience data received:', data);

        if (!data || !data.audience || !data.audience.length) {
            console.log('⚠️ No audience data found');
            $('#displayMessageConnectsStatus').html('No audience data found. Please check your audience selection.');
            $('.messageConnectsAction').attr('disabled', false);
            return;
        }

        const audienceMembers = data.audience;
        console.log(`📊 Processing ${audienceMembers.length} audience members`);

        const conArr = audienceMembers.map(member => {
            // Extract network distance safely
            let netDistance = 2; // Default to 2nd degree
            if (member.con_distance) {
                const parts = member.con_distance.split("_");
                if (parts.length > 1) {
                    netDistance = parseInt(parts[1]) || 2;
                        }
            }

            // Extract member ID safely
            let targetId = member.con_id;
            if (member.con_member_urn && member.con_member_urn.includes('urn:li:member:')) {
                targetId = member.con_member_urn.replace('urn:li:member:', '');
                        }

            return {
                name: `${member.con_first_name || ''} ${member.con_last_name || ''}`.trim(),
                firstName: member.con_first_name || '',
                lastName: member.con_last_name || '',
                title: member.con_job_title || '',
                conId: targetId,
                totalResult: audienceMembers.length,
                netDistance: netDistance
            };
        });

        // Filter for 1st degree connections only (LinkedIn only allows direct messaging to 1st degree)
        const firstDegreeConnections = conArr.filter(conn => conn.netDistance === 1);
        const otherDegreeConnections = conArr.filter(conn => conn.netDistance > 1);

        console.log(`📊 Connection breakdown:`, {
            total: conArr.length,
            '1st degree': firstDegreeConnections.length,
            'other degrees': otherDegreeConnections.length
        });

        if (firstDegreeConnections.length === 0) {
            console.log('⚠️ No first degree connections found');
            $('#displayMessageConnectsStatus').html(`
                <div class="card border-warning" style="background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%); border-left: 4px solid #ffc107;">
                    <div class="card-body p-4">
                        <div class="d-flex align-items-center mb-3">
                            <div class="bg-warning rounded-circle p-2 mr-3" style="width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
                                <i class="fas fa-exclamation-triangle text-white"></i>
                            </div>
                            <h5 class="mb-0 text-warning font-weight-bold">No 1st Degree Connections Found</h5>
                        </div>
                        
                        <p class="text-muted mb-3">
                            <i class="fas fa-info-circle mr-2"></i>
                            Messages can only be sent to 1st degree connections on LinkedIn.
                        </p>
                        
                        <div class="row mb-3">
                            <div class="col-md-6">
                                <div class="bg-white rounded p-3 border">
                                    <h6 class="text-primary mb-2"><i class="fas fa-users mr-2"></i>Connection Summary</h6>
                                    <div class="d-flex justify-content-between">
                                        <span>Total connections:</span>
                                        <span class="font-weight-bold">${conArr.length}</span>
                                    </div>
                                    <div class="d-flex justify-content-between">
                                        <span>1st degree:</span>
                                        <span class="text-success font-weight-bold">${firstDegreeConnections.length}</span>
                                    </div>
                                    <div class="d-flex justify-content-between">
                                        <span>Other degrees:</span>
                                        <span class="text-warning font-weight-bold">${otherDegreeConnections.length}</span>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="bg-info text-white rounded p-3">
                                    <h6 class="mb-2"><i class="fas fa-lightbulb mr-2"></i>Solution</h6>
                                    <p class="mb-0 small">
                                        Use <strong>"Send Targeted Messages"</strong> feature for 2nd+ degree connections with InMail support.
                                    </p>
                                </div>
                            </div>
                        </div>
                        

                    </div>
                </div>
            `);
            $('.messageConnectsAction').attr('disabled', false);
            return;
        }

        console.log(`✅ Found ${firstDegreeConnections.length} first degree connections`);
        $('#displayMessageConnectsStatus').html(`
            <div class="card border-success" style="background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%); border-left: 4px solid #28a745;">
                <div class="card-body p-4">
                    <div class="d-flex align-items-center mb-3">
                        <div class="bg-success rounded-circle p-2 mr-3" style="width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
                            <i class="fas fa-check-circle text-white"></i>
                        </div>
                        <h5 class="mb-0 text-success font-weight-bold">Ready to Send Messages</h5>
                    </div>
                    
                    <div class="row">
                        <div class="col-md-8">
                            <div class="bg-white rounded p-3 border">
                                <h6 class="text-primary mb-2"><i class="fas fa-users mr-2"></i>Connection Summary</h6>
                                <div class="d-flex justify-content-between mb-2">
                                    <span>Total connections:</span>
                                    <span class="font-weight-bold">${conArr.length}</span>
                                </div>
                                <div class="d-flex justify-content-between mb-2">
                                    <span>1st degree (will be messaged):</span>
                                    <span class="text-success font-weight-bold">${firstDegreeConnections.length}</span>
                                </div>
                                <div class="d-flex justify-content-between">
                                    <span>Other degrees (skipped):</span>
                                    <span class="text-muted font-weight-bold">${otherDegreeConnections.length}</span>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="bg-success text-white rounded p-3 text-center">
                                <i class="fas fa-paper-plane fa-2x mb-2"></i>
                                <h6 class="mb-0">Messages Ready</h6>
                                <small>Direct messaging enabled</small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `);

        await macSendMessageToConnection(macMessage, macDelay, firstDegreeConnections);

    } catch (error) {
        console.error('❌ Error in macAudienceList:', error);
        $('#displayMessageConnectsStatus').html(`
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-circle"></i>
                Error loading audience: ${error.message}<br>
                Please try again or check console for details.
            </div>
        `);
        $('.messageConnectsAction').attr('disabled', false);
        }
}

var timeOutMessageAllCon;
// const macSendMessage = async (macMessage, macDelay, totalFollow) => {
//     var displayLi = '', i = 0, x = 0, displayAutomationRecord = '', newMessage;
//     let getMacStore = JSON.parse(localStorage.getItem('lkm-mac'));

//     $('.message-connects-notice').show()

//     // automation table data setup
//     displayAutomationRecord = `
//         <tr id="message-all-connects-record">
//             <td>Message All Connections</td>
//             <td id="mac-status">Running</td>
//             <td>${totalFollow.length}</td>
//             <td id="mac-numbered">0/${totalFollow.length}</td>
//             <td id="mac-bot-action" title="Stop automation"><i class="far fa-dot-circle fa-lg text-danger cursorr"></i></td>
//             <td id="mac-remained-time">${remainedTime(macDelay, totalFollow.length)}</td>
//         </tr>
//     `;
//     $('#no-job').hide()
//     $('#automation-list').append(displayAutomationRecord)

//     var macLooper = () => {
//         timeOutMessageAllCon = setTimeout(async function(){
//             newMessage = changeMessageVariableNames(macMessage, totalFollow[i])

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
//                                     attachments: getMacStore.uploads.length ? getMacStore.uploads : [],
//                                     body: newMessage, // message
//                                     attributedBody: {"text": newMessage, "attributes": []},
//                                     mediaAttachments: [],
//                                 }
//                             }
//                         },
//                         recipients: [totalFollow[i].conId],
//                         subtype: totalFollow[i].netDistance == 1 ? "MEMBER_TO_MEMBER" : "INMAIL"
//                     }
//                 }),
//                 success: function(response){
//                     if(response.value.createdAt){
//                         $('#displayMessageConnectsStatus').empty()
//                         displayLi = `
//                             <li>Message sent to: <b>${totalFollow[i].name}</b></li>
//                             <li>Total message sent: <b>${x +1}</b></li>
//                         `;
//                         $('#displayMessageConnectsStatus').append(displayLi)
//                         console.log( new Date())

//                         // update automation count done and time remained
//                         $('#mac-numbered').text(`${x +1}/${totalFollow.length}`)
//                         $('#mac-remained-time').text(`${remainedTime(macDelay, totalFollow.length - (x +1))}`)

//                         x++;
//                     }else{
//                         $('#displayMessageConnectsStatus').empty()
//                         $('#displayMessageConnectsStatus').html('Something went wrong. Please try again')
//                         $('.messageConnectsAction').attr('disabled', false)
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
//                             Message inbox might be locked.<br/>
//                             Not a 1st degree connection.
//                         `;
//                     }else {
//                         msg = ''
//                     }

//                     $('.message-connects-notice').show();
//                     $('#displayMessageConnectsStatus').empty()
//                     $('#displayMessageConnectsStatus').html(msg)
//                     $('.messageConnectsAction').attr('disabled', false)
//                 }
//             })
//             i++;
//             if(i < totalFollow.length)
//                 macLooper()
//             if(i >= totalFollow.length){
//                 $('.messageConnectsAction').attr('disabled', false)

//                 let module = 'Message sent';
//                 sendStats(x, module)

//                 // update automation status
//                 $('#mac-status').text('Completed')
//                 setTimeout(function(){
//                     $('#message-all-connects-record').remove()
//                 }, 5000)
//             }

//         }, macDelay*1000)
//     }
//     macLooper()
// }

const macSendMessageToConnection = async (macMessage, macDelay, dataArr) => {
    try {
        console.log('🔍 Starting Message All Connections for', dataArr.length, 'connections');
        var displayLi = '', x = 0;
    let getMacStore = JSON.parse(localStorage.getItem('lkm-mac'));

        $('.message-connects-notice').show();

    // automation table data setup
        const displayAutomationRecord = `
        <tr id="message-all-connects-record">
            <td>Message All Connections</td>
            <td id="mac-status">Running</td>
                <td>${dataArr.length}</td>
                <td id="mac-numbered">0/${dataArr.length}</td>
                <td id="mac-bot-action" title="Stop automation">
                    <i class="far fa-dot-circle fa-lg text-danger cursorr"></i>
                </td>
                <td id="mac-remained-time">${remainedTime(macDelay, dataArr.length)}</td>
        </tr>
    `;
        $('#no-job').hide();
        $('#automation-list').append(displayAutomationRecord);

        for (const [i, item] of dataArr.entries()) {
            try {
                // Prepare message parameters with fallbacks
                const params = {
                    message: macMessage || '',
                    name: item.name || `${item.firstName || ''} ${item.lastName || ''}`.trim(),
                    firstName: item.firstName || '',
                    lastName: item.lastName || '',
                    distance: item.netDistance || 2,
                    connectionId: item.conId,
                    attachement: getMacStore?.uploads?.length ? getMacStore.uploads : []
                };

                console.log(`📧 Sending message to: ${params.name} (${i + 1}/${dataArr.length})`);

                // Send message using async/await
                const result = await sendMessageToConnection(params);
                
                if (result.status === 'successful') {
                    console.log('✅ Message sent successfully to:', params.name);
                displayLi = `
                        <li>✅ Message sent to: <b>${params.name}</b></li>
                        <li>Total sent: <b>${i + 1}</b></li>
                `;
                    $('#displayMessageConnectsStatus').html(displayLi);

                    // Update automation count and time remaining
                    $('#mac-numbered').text(`${i + 1}/${dataArr.length}`);
                    $('#mac-remained-time').text(`${remainedTime(macDelay, dataArr.length - (i + 1))}`);
                x++;
                } else {
                    console.log('ℹ️ Message not sent to:', params.name, result.message);
                    $('#displayMessageConnectsStatus').html(`
                        <li style="color: blue;">ℹ️ Message not sent to: <b>${params.name}</b></li>
                        <li style="color: blue;">Info: ${result.message}</li>
                        <li style="color: gray;">Continuing with next connection...</li>
                    `);
                }

                // Add delay between messages (except for the last one)
                if (i < dataArr.length - 1) {
                    console.log(`⏱️ Waiting ${macDelay} seconds before next message...`);
                    await sleep(macDelay * 1000);
                }

            } catch (itemError) {
                console.error('❌ Error processing connection:', item.name, itemError);
                $('#displayMessageConnectsStatus').html(`
                    <li style="color: red;">❌ Error with: <b>${item.name}</b></li>
                    <li>Error: ${itemError.message}</li>
                    <li>Continuing with next connection...</li>
                `);
                continue; // Continue with next connection
            }
        }

        // Enable button and update status
        $('.messageConnectsAction').attr('disabled', false);
        $('#mac-status').text('Completed');
        
        // Remove automation record after delay
        setTimeout(() => {
            $('#message-all-connects-record').remove();
        }, 5000);

        // Send stats
        if (x > 0) {
            console.log('📊 Sending stats:', x, 'messages sent');
            sendStats(x, 'Message sent');
        }

    } catch (error) {
        console.error('❌ Fatal error in macSendMessageToConnection:', error);
        $('#displayMessageConnectsStatus').html(`
            <li style="color: red;">❌ Fatal error: ${error.message}</li>
            <li>Please try again or check console for details</li>
        `);
        $('.messageConnectsAction').attr('disabled', false);
        $('#mac-status').text('Error');
    }
}

// work in progress 
const macGetConversationDetails = async (userPublicId) => {
    await $.ajax({
        method: 'get',
        beforeSend: function(request) {
            request.setRequestHeader('csrf-token', jsession);
            request.setRequestHeader('accept', 'application/vnd.linkedin.normalized+json+2.1');
            request.setRequestHeader('x-li-lang', 'en_US');
            request.setRequestHeader('x-li-page-instance', 'urn:li:page:d_flagship3_profile_view_base;d09eqyRKSRmutOk9M8Cwqg==');
            request.setRequestHeader('x-li-track', JSON.stringify(xLiTrack));
            request.setRequestHeader('x-restli-protocol-version', xRestliProtocolVersion);
        },
        url: `${voyagerApi}/messaging/conversations?q=participants&recipients=List(${userPublicId})`,
        success: function(data) {

        },
        error: function(err) {
            console.log(err)
        }
    })
}

const positionGroups = async (userPublicId) => {
    await $.ajax({
        method: 'get',
        beforeSend: function(request) { 
            request.setRequestHeader('csrf-token', jsession);
            request.setRequestHeader('x-li-lang', xLiLang);
            request.setRequestHeader('x-li-page-instance', 'urn:li:page:d_flagship3_people_connections;+x53BOwRR0CbMjBX9vblWA==');
            request.setRequestHeader('x-li-track', JSON.stringify(xLiTrack3));
            request.setRequestHeader('x-restli-protocol-version', xRestliProtocolVersion);
        },
        url: `${voyagerApi}/identity/profiles/${userPublicId}/positionGroups`,
        success: function(data){
            
        },
        error: function(error){
            console.log(error)
        }
    })

}

// stop automation 
$('body').on('click','#mac-bot-action',function(){
    clearTimeout(timeOutMessageAllCon);
    $('#mac-status').text('Stopped')
    $('.messageConnectsAction').attr('disabled', false)
    setTimeout(function(){
        $('#message-all-connects-record').remove()
    }, 5000)
})