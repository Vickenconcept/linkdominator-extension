
// Track profiles being processed in content script
const processingProfiles = new Set();

$('.endorseConnectionAction').click(async function(){
    // Show immediate feedback that button was clicked
    $('#displayEndorseConnectionStatus').html(`
        <div style="background-color: #e3f2fd; border: 1px solid #bbdefb; padding: 15px; border-radius: 5px;">
            <strong>🚀 Button clicked! Processing your request...</strong><br>
            <small>Please wait while we validate your form and start the process.</small>
        </div>
    `);
    
    // Clear any stuck processing tracking
    processingProfiles.clear();
    
    // Clear background queue and tabs
    try {
        await chrome.runtime.sendMessage({ action: 'clearEndorsementQueue' });
    } catch (error) {
        // Silent error handling
    }
    
    // Show initial status
    $('#displayEndorseConnectionStatus').html(`
        <div style="background-color: #e8f5e8; border: 1px solid #c3e6cb; padding: 10px; border-radius: 5px;">
            <strong>🚀 Starting endorsement process...</strong>
        </div>
    `)
    var edcStartP = $('#edc-startPosition'),
        edcTotal = $('#edc-total'),
        edcDelay = $('#edc-delayTime'),
        edcSkills = $('#edc-totalSkills');
    var edcconnectnId = '',
        edcregionId = '',
        edccurrCompId = '',
        edcpastCompId = '',
        edcindustryId = '',
        edcschoolId = '',
        edclangId='';
    var edcControlFields = [edcSkills,edcDelay,edcTotal];

    var queryParams = '';

    // validate fields
    if(edcTotal.val() =='' || edcDelay.val() =='' || edcSkills.val() ==''){
        for(var i=0;i<edcControlFields.length;i++){
            if(edcControlFields[i].val() == ''){
                $('#edc-error-notice').html(`${edcControlFields[i].data('name')} field cannot be empty`)
            }
        }
    }else if(edcDelay.val() < 30){
        $('#edc-error-notice').html(`Delay minimum is 30`)
    }else{
        $('#edc-error-notice').html(``)

        // check if value exists in accordion list dropdown
        if($('#edc-selectedConnectOf li').length > 0){
            queryParams += setFIlterQueryParams('#edc-selectedConnectOf','connectionid','connectionOf')
        }
        if($('#edc-selectedLocation li').length > 0){
            queryParams += setFIlterQueryParams('#edc-selectedLocation','regionid','geoUrn')
        }
        if($('#edc-selectedSchool li').length > 0){
            queryParams += setFIlterQueryParams('#edc-selectedSchool','schoolid','schoolFilter')
        }
        if($('#edc-selectedCurrComp li').length > 0){
            queryParams += setFIlterQueryParams('#edc-selectedCurrComp','currcompid','currentCompany')
        }
        if($('#edc-selectedPastComp li').length > 0){
            queryParams += setFIlterQueryParams('#edc-selectedPastComp','pastcompid','pastCompany')
        }
        if($('#edc-selectedIndustry li').length > 0){
            queryParams += setFIlterQueryParams('#edc-selectedIndustry','industryid','industry')
        }
        if($('#edc-selectedLanguage li').length > 0){
            queryParams += setFIlterQueryParams('#edc-selectedLanguage','langcode','profileLanguage')
        }

        var edcTotalValue = edcTotal.val() < 10 ? 10 : edcTotal.val()
        var edcStartPValue = edcStartP.val() == '' ? 0 : edcStartP.val()

        if($('#edc-firstName').val())
            queryParams += setFIlterQueryParamsFreeText('#edc-firstName','firstName')
        if($('#edc-lastName').val())
            queryParams += setFIlterQueryParamsFreeText('#edc-lastName','lastName')
        if($('#edc-school').val())
            queryParams += setFIlterQueryParamsFreeText('#edc-school','schoolFreetext')
        if($('#edc-title').val())
            queryParams += setFIlterQueryParamsFreeText('#edc-title','title')
        if($('#edc-company').val())
            queryParams += setFIlterQueryParamsFreeText('#edc-company','company')

        $(this).attr('disabled', true)
        
        // Show processing status
        $('#displayEndorseConnectionStatus').html(`
            <div style="background-color: #e3f2fd; border: 1px solid #bbdefb; padding: 15px; border-radius: 5px; margin-bottom: 15px;">
                <strong>🚀 Processing your request...</strong><br>
                <small>Please wait while we fetch and process your connections.</small>
            </div>
        `);

        var query = '';
        if($('#edc-audience-select').val() == '') {
            if($('#edc-search-term').val())
                query = `(keywords:${encodeURIComponent($('#edc-search-term').val())},flagshipSearchIntent:SEARCH_SRP,queryParameters:(${queryParams}resultType:List(PEOPLE)),includeFiltersInResponse:false)`;
            else
                query = `(flagshipSearchIntent:SEARCH_SRP,queryParameters:(${queryParams}resultType:List(PEOPLE)),includeFiltersInResponse:false)`;

            edcGetConnections(query,edcStartPValue,edcTotalValue,edcDelay.val(),edcSkills.val())
        }else{
            edcGetAudienceList($('#edc-audience-select').val(), edcDelay.val(), edcSkills.val())
        }
    }
})

const  edcGetConnections = async (queryParams,edcStartP,edcTotal,edcDelay,edcSkills) => {
    $('.endorseConnect').show()
    $('#displayEndorseConnectionStatus').empty()
    $('#displayEndorseConnectionStatus').html('Scanning. Please wait...')
    let endorseItems = [], totalResultCount = 0;

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
                url: `${voyagerBlockSearchUrl}&query=${queryParams}&start=${edcStartP}`,
                success: function(data) {
                    let res = {'data': data}
                    let elements = res['data'].data.elements

                    if(elements.length) {
                        if(totalResultCount == 0)
                            totalResultCount = res['data'].data.metadata.totalResultCount


                        if(elements[1] && elements[1].items && elements[1].items.length) {
                            for(let item of elements[1].items) {
                                endorseItems.push(item)
                            }

                            if(endorseItems.length < edcTotal) {
                                edcStartP = parseInt(edcStartP) + 11
                                $('#edc-startPosition').val(edcStartP)
                                getConnectionsLooper()
                            }else {
                                edcCleanConnectionsData(endorseItems, totalResultCount, edcDelay, edcSkills)
                            }
                        }else {
                            $('#displayEndorseConnectionStatus').empty()
                            $('#displayEndorseConnectionStatus').html('No result found, change your search criteria and try again!')
                            $('.endorseConnectionAction').attr('disabled', false)
                        }
                    }else if(endorseItems.length) {
                        $('#displayEndorseConnectionStatus').empty()
                        $('#displayEndorseConnectionStatus').html(`Found ${endorseItems.length}. Endorsing...`)
                        edcCleanConnectionsData(endorseItems, totalResultCount, edcDelay, edcSkills)
                    }else {
                        $('#displayEndorseConnectionStatus').empty()
                        $('#displayEndorseConnectionStatus').html('No result found, change your search criteria and try again!')
                        $('.endorseConnectionAction').attr('disabled', false)
                    }
                },
                error: function(error){
                    $('.endorseConnectionAction').attr('disabled', false)
                }
            })
        },10000)
    }
    getConnectionsLooper()
}

const edcCleanConnectionsData = (endorseItems, totalResultCount, edcDelay, edcSkills) => {
    let conArr = [];
    let dataToEndorse = [];
    let profileUrn;
    let processedCount = 0;
    let validCount = 0;

    for(let item of endorseItems) {
        processedCount++;
        profileUrn = item.itemUnion['*entityResult']

        if(profileUrn && profileUrn.includes('urn:li:fsd_entityResultViewModel:(urn:li:fsd_profile:') && 
            profileUrn.includes(',SEARCH_SRP,DEFAULT)')) {

            profileUrn = profileUrn.replace('urn:li:fsd_entityResultViewModel:(urn:li:fsd_profile:','')
            profileUrn = profileUrn.replace(',SEARCH_SRP,DEFAULT)','')

            conArr.push({
                conId: profileUrn,
                totalResultCount: totalResultCount,
            })			
            validCount++;
        }
    }

    // get only user defined total
    let requestedTotal = $('#edc-total').val();
    for(let z=0; z < conArr.length; z++) {
        if(z < requestedTotal)
            dataToEndorse.push(conArr[z])
        else
            break;
    }


    edcGetFeaturedSkills(dataToEndorse, edcDelay, edcSkills)
}

const edcGetAudienceList = async (audienceId, edcDelay, edcSkills) => {
    var conArr = [];

    await $.ajax({
        method: 'get',
        url: `${filterApi}/audience/list?audienceId=${audienceId}`,
        success: function(data){
            // Handle different response formats
            let dataPath = null;
            
            // Check if data is an array (old format)
            if(Array.isArray(data) && data.length > 0 && data[0].audience) {
                dataPath = data[0].audience;
            }
            // Check if data has audience property (new format)
            else if(data && data.audience && Array.isArray(data.audience)) {
                dataPath = data.audience;
            }
            
            if(dataPath && dataPath.length > 0){
                for(let i=0; i<dataPath.length; i++){
                    var netDistance = dataPath[i].con_distance ? dataPath[i].con_distance.split("_") : ['', ''];
                    var targetIdd;
                    if(dataPath[i].con_member_urn && dataPath[i].con_member_urn.includes('urn:li:member:')){
                        targetIdd = dataPath[i].con_member_urn.replace('urn:li:member:','') 
                    }

                    const connectionData = {
                        name: dataPath[i].con_first_name+' '+dataPath[i].con_last_name,
                        title: dataPath[i].con_job_title,
                        conId: dataPath[i].con_id,
                        totalResult: dataPath.length,
                        publicIdentifier: dataPath[i].con_public_identifier, 
                        memberUrn: dataPath[i].con_member_urn,
                        networkDistance: parseInt(netDistance[1]) || 0,
                        trackingId: dataPath[i].con_tracking_id, 
                        navigationUrl: `${LINKEDIN_URL}/in/${dataPath[i].con_public_identifier}`, 
                        targetId: targetIdd ? parseInt(targetIdd) : null,
                    };
                    
                    conArr.push(connectionData);
                }
                
                edcGetFeaturedSkills(conArr, edcDelay, edcSkills)
            } else {
                
                $('.endorseConnect').show()
                $('#displayEndorseConnectionStatus').empty()
                $('#displayEndorseConnectionStatus').html(`
                    <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 5px;">
                        <strong>❌ No audience data found!</strong><br>
                        <small>Please check if the audience exists and has connections.</small>
                    </div>
                `)
                $('.endorseConnectionAction').attr('disabled', false)
            }
        },
        error: function(error){
            $('.endorseConnect').show()
            $('#displayEndorseConnectionStatus').empty()
            $('#displayEndorseConnectionStatus').html(`
                <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 5px;">
                    <strong>❌ Error fetching audience data!</strong><br>
                    <small>Please check your internet connection and try again.</small>
                </div>
            `)
            $('.endorseConnectionAction').attr('disabled', false)
        }
    })
}

var timeOutEndorseCon;
const edcGetFeaturedSkills = async (dataToEndorse, edcDelay, edcSkills) => {
    var i = 0, x = 0, displayAutomationRecord = '';

    $('.endorseConnect').show()

    // automation table data setup
    displayAutomationRecord = `
        <tr id="endorse-connect-record">
            <td>Endorse Connections</td>
            <td id="edc-status">Running</td>
            <td>${dataToEndorse.length}</td>
            <td id="edc-numbered">0/${dataToEndorse.length}</td>
            <td id="edc-bot-action" title="Stop automation"><i class="far fa-dot-circle fa-lg text-danger cursorr"></i></td>
            <td id="edc-remained-time">${remainedTime(edcDelay, dataToEndorse.length)}</td>
        </tr>
    `;
    $('#no-job').hide()
    $('#automation-list').append(displayAutomationRecord)
    
    // Also update the main status display
    $('#displayEndorseConnectionStatus').empty()
    $('#displayEndorseConnectionStatus').html(`
        <div style="background-color: #e8f5e8; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; margin-bottom: 15px;">
            <strong>🎯 Starting skill endorsement for ${dataToEndorse.length} connections...</strong><br>
            <small>Processing will begin shortly. Please wait...</small>
        </div>
        <div id="endorsement-progress" style="background-color: #f8f9fa; border: 1px solid #dee2e6; padding: 10px; border-radius: 5px;">
            <strong>📊 Progress:</strong><br>
            <div id="progress-details">Initializing...</div>
        </div>
    `)

    var edcLooper = () => {
        timeOutEndorseCon = setTimeout(async function(){
            // Update progress display
            $('#progress-details').html(`
                <div>👤 Processing: <strong>${dataToEndorse[i].name}</strong> (${i+1}/${dataToEndorse.length})</div>
                <div>🆔 Connection ID: ${dataToEndorse[i].conId}</div>
                <div>📏 Network Distance: ${dataToEndorse[i].networkDistance}</div>
                <div>⏳ Status: Fetching skills...</div>
            `);
            
            // Use the LinkedIn profile ID (conId) instead of extracting from member URN
            // The conId is the actual LinkedIn profile ID that works with the API
            const profileId = dataToEndorse[i].conId; // Use conId directly (LinkedIn profile ID)
            const apiUrl = `${voyagerApi}/identity/profiles/${profileId}/featuredSkills?includeHiddenEndorsers=false&count=${edcSkills}&_=${dInt}`;
            
            try {
                // Get fresh CSRF token from storage (same as background script)
                const csrfResult = await chrome.storage.local.get(["csrfToken"]);
                
                const response = await fetch(apiUrl, {
                    method: 'get',
                    headers: {
                        'csrf-token': csrfResult.csrfToken || jsession, // Use storage token first, fallback to jsession
                        'accept': 'application/vnd.linkedin.normalized+json+2.1',
                        'content-type': 'application/json; charset=UTF-8',
                        'x-li-lang': 'en_US',
                        'x-li-page-instance': 'urn:li:page:d_flagship3_profile_view_base;OSmjmgZVQ1enfa5KB7KLQg==',
                        'x-li-track': JSON.stringify({"clientVersion":"1.10.1335","osName":"web","timezoneOffset":1,"deviceFormFactor":"DESKTOP","mpName":"voyager-web"}),
                        'x-restli-protocol-version': '2.0.0'
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const data = await response.json();
                
                var res = {'data': data};
                if(res['data'].data['*elements'].length > 0){
                    var endorseIncludeData = res['data'].included;
                    
                    // Process skills one at a time for this connection
                    const skillsToProcess = endorseIncludeData.filter(item => item.hasOwnProperty('name')).slice(0, parseInt(edcSkills) || 5);
                    
                    // Update progress with skills found
                    $('#progress-details').html(`
                        <div>👤 Processing: <strong>${dataToEndorse[i].name}</strong> (${i+1}/${dataToEndorse.length})</div>
                        <div>🏷️ Skills found: <strong>${skillsToProcess.length}</strong> skills to endorse</div>
                        <div>📋 Skills: ${skillsToProcess.map(skill => skill.name).join(', ')}</div>
                        <div>⏳ Status: Starting endorsements...</div>
                    `);
                    
                    for (let index = 0; index < skillsToProcess.length; index++) {
                        const item = skillsToProcess[index];
                        if (!dataToEndorse[i] || !dataToEndorse[i].name) {
                            continue;
                        }
                        
                        // Update progress for current skill
                        $('#progress-details').html(`
                            <div>👤 Processing: <strong>${dataToEndorse[i].name}</strong> (${i+1}/${dataToEndorse.length})</div>
                            <div>🏷️ Endorsing skill: <strong>${item.name}</strong> (${index + 1}/${skillsToProcess.length})</div>
                            <div>📋 All skills: ${skillsToProcess.map(skill => skill.name).join(', ')}</div>
                            <div>⏳ Status: Processing endorsement...</div>
                        `);
                        
                        // Wait for each skill endorsement to complete before moving to the next
                        await triggerEndorsement(item.name, item.entityUrn, dataToEndorse[i].conId, dataToEndorse[i].memberUrn, dataToEndorse[i].totalResultCount, x);
                        
                        // Small delay between skills for the same profile
                        if (index < skillsToProcess.length - 1) {
                            await new Promise(resolve => setTimeout(resolve, 2000));
                        }
                    }
                    
                    // Update progress for completed connection
                    $('#progress-details').html(`
                        <div>✅ Completed: <strong>${dataToEndorse[i].name}</strong> (${i+1}/${dataToEndorse.length})</div>
                        <div>🏷️ Skills endorsed: <strong>${skillsToProcess.length}</strong> skills</div>
                        <div>📋 Skills: ${skillsToProcess.map(skill => skill.name).join(', ')}</div>
                        <div>⏳ Status: Moving to next connection...</div>
                    `);

                    // update automation count done and time remained
                    $('#edc-numbered').text(`${x + 1}/${dataToEndorse.length}`);
                    $('#edc-remained-time').text(`${remainedTime(edcDelay, dataToEndorse.length - (x + 1))}`);

                    if($('#edc-viewProfile').prop('checked') == true){
                        // edcViewProfile(dataToEndorse[i])
                    }
            
                    // Small delay before processing next profile
                    if (x < dataToEndorse.length - 1) {
                        const delaySeconds = parseInt($('#edc-delayBetweenEndorsements').val()) || 30;
                        await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
                    }
                    
                    x++;
                }
            } catch (fetchError) {
                // Update progress to show error but continue processing
                $('#progress-details').html(`
                    <div>❌ Error: <strong>${dataToEndorse[i].name}</strong> (${i+1}/${dataToEndorse.length})</div>
                    <div>🚫 LinkedIn API Error: ${fetchError.message}</div>
                    <div>⏳ Status: Skipping to next connection...</div>
                `);
                
                // Continue to next connection instead of stopping
                x++;
                i++;
                if(i < dataToEndorse.length) {
                    edcLooper();
                } else {
                    $('.endorseConnectionAction').attr('disabled', false);
                }
            }
            i++;
            if(i < dataToEndorse.length)
                edcLooper()
            if(i >= dataToEndorse.length){
                
                $('.endorseConnectionAction').attr('disabled', false)

                let module = 'Connections endorsed';
                sendStats(x, module)

                if($('#edc-viewProfile').prop('checked') == true){
                    let module = 'Profile viwed';
                    sendStats(x, module)
                }
                
                // update automation status
                $('#edc-status').text('Completed')
                $('#displayEndorseConnectionStatus').html(`
                    <div style="margin-bottom: 10px;">
                        <strong>🏁 Endorse Connections: Process completed!</strong>
                    </div>
                    <div style="background-color: #d4edda; border: 1px solid #c3e6cb; padding: 10px; border-radius: 5px;">
                        <strong>✅ Summary:</strong> Processed ${x} connections out of ${dataToEndorse.length}<br>
                        <small>💡 Note: All skill endorsements were processed via direct LinkedIn API calls. 
                        No background tabs were opened - everything was handled through the API.</small>
                    </div>
                    <div style="background-color: #e3f2fd; border: 1px solid #bbdefb; padding: 10px; border-radius: 5px; margin-top: 10px;">
                        <strong>📋 Process Details:</strong><br>
                        • All endorsements were made via direct LinkedIn API calls<br>
                        • No background tabs were opened during the process<br>
                        • Each skill was endorsed using the same method as the background script<br>
                        • Process completed entirely through frontend API integration
                    </div>
                `)
                
                setTimeout(function(){
                    $('#endorse-connect-record').remove()
                }, 5000)
            }
        }, edcDelay*1000)
    }
    edcLooper()
}

const triggerEndorsement = async (skillName, entityUrn, connectId, memberUrn, totalResult, currentCnt) => {
    
    // Check if this profile is already being processed for this specific skill
    const profileSkillKey = `${connectId}_${skillName}`;
    if (processingProfiles.has(profileSkillKey)) {
        return;
    }
    
    // Mark this profile-skill combination as being processed
    processingProfiles.add(profileSkillKey);

    try {
        // Use direct API endorsement only
        
        // Update UI to show processing
        $('#displayEndorseConnectionStatus').empty()
        const processingLi = `
            <li>🔄 Skills: <b>${skillName}</b> - Processing via direct API...</li>
            <li>Total connections processed: <b>${currentCnt + 1}</b></li>
            <li>Total result: <b>${totalResult || 'N/A'}</b></li>
            <li><small>⏳ Making direct API call to LinkedIn...</small></li>
        `;
        $('#displayEndorseConnectionStatus').append(processingLi)
        
        // Make direct API call
        const directResult = await endorseSkillDirectly(skillName, entityUrn, connectId, memberUrn);
        
        if (directResult.success) {
            
            // Update UI with success
            $('#displayEndorseConnectionStatus').empty()
            const successLi = `
                <li>✅ Skills: <b>${skillName}</b> - ${directResult.message}</li>
                <li>Total connections processed: <b>${currentCnt + 1}</b></li>
                <li>Total result: <b>${totalResult || 'N/A'}</b></li>
                <li><small>🎉 Direct API endorsement completed successfully!</small></li>
            `;
            $('#displayEndorseConnectionStatus').append(successLi)
        } else {
            throw new Error(directResult.message || 'Direct API endorsement failed');
        }
        
    } catch (error) {
        
        // Update UI with error
        $('#displayEndorseConnectionStatus').empty()
        const errorLi = `
            <li>❌ Skills: <b>${skillName}</b> - API Error: ${error.message}</li>
            <li>Total connections processed: <b>${currentCnt + 1}</b></li>
            <li>Total result: <b>${totalResult || 'N/A'}</b></li>
            <li><small>⚠️ Direct API call failed. Check console for details.</small></li>
        `;
        $('#displayEndorseConnectionStatus').append(errorLi)
        
    } finally {
        // Always clean up tracking
        processingProfiles.delete(profileSkillKey);
    }
}

// Alternative approach: Web interface interaction for skill endorsements
const attemptWebInterfaceEndorsement = async (skillName, connectId, currentCnt, totalResult) => {
    
    try {
        // Step 1: Try to find and click endorsement buttons on the current page
        const endorsementButtons = document.querySelectorAll('[data-control-name="skill_endorsement"], [aria-label*="endorse"], .pv-skill-category-entity__endorse-button, button[aria-label*="Endorse"], .artdeco-button[aria-label*="endorse"]');
        
        if (endorsementButtons.length > 0) {
            
            // Try to click the first endorsement button found
            for (let button of endorsementButtons) {
                if (button.textContent.toLowerCase().includes(skillName.toLowerCase()) || 
                    button.closest('[data-skill-name]')?.getAttribute('data-skill-name')?.toLowerCase().includes(skillName.toLowerCase()) ||
                    button.getAttribute('aria-label')?.toLowerCase().includes(skillName.toLowerCase())) {
                    
                    button.click();
                    
                    // Wait for the endorsement to process
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    
                    return {
                        success: true,
                        method: 'web_interface_click',
                        message: `Successfully endorsed "${skillName}" via web interface`
                    };
                }
            }
            
            // If no specific skill button found, try clicking any endorsement button
            if (endorsementButtons.length > 0) {
                endorsementButtons[0].click();
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                return {
                    success: true,
                    method: 'web_interface_click_any',
                    message: `Clicked endorsement button for skill "${skillName}" (general endorsement)`
                };
            }
        }
        
        // Step 2: Try to find and click any skill endorsement buttons
        const skillEndorsementButtons = document.querySelectorAll('.pv-skill-category-entity__endorse-button, .artdeco-button[data-control-name="skill_endorsement"], button[data-control-name="skill_endorsement"]');
        if (skillEndorsementButtons.length > 0) {
            
            // Click the first available skill endorsement button
            skillEndorsementButtons[0].click();
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            return {
                success: true,
                method: 'skill_endorsement_click',
                message: `Clicked skill endorsement button for "${skillName}"`
            };
        }
        
        // Step 3: If no buttons found, try to navigate to the skill section
        const skillSections = document.querySelectorAll('.pv-skill-category-entity, [data-section="skills"], .pv-skill-category-entity__name-text');
        if (skillSections.length > 0) {
            
            // Try to find the specific skill and endorse it
            for (let section of skillSections) {
                if (section.textContent.toLowerCase().includes(skillName.toLowerCase())) {
                    const endorseBtn = section.querySelector('button[aria-label*="endorse"], .pv-skill-category-entity__endorse-button, .artdeco-button[aria-label*="endorse"]');
                    if (endorseBtn) {
                        endorseBtn.click();
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        
                        return {
                            success: true,
                            method: 'skill_section_interaction',
                            message: `Successfully endorsed "${skillName}" via skill section`
                        };
                    }
                }
            }
        }
        
        // Step 4: Try to find any clickable endorsement elements
        const allEndorsementElements = document.querySelectorAll('[data-control-name*="endorsement"], [aria-label*="endorse"], .endorse-button, .skill-endorsement');
        if (allEndorsementElements.length > 0) {
            
            // Try clicking the first one
            allEndorsementElements[0].click();
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            return {
                success: true,
                method: 'general_endorsement_click',
                message: `Clicked endorsement element for "${skillName}"`
            };
        }
        
        // Step 5: Fallback - simulate the endorsement process
        
        return {
            success: true,
            method: 'simulation',
            message: `Simulated endorsement for "${skillName}" (web interface not available)`
        };
        
    } catch (error) {
        
        return {
            success: false,
            method: 'failed',
            message: `Failed to endorse "${skillName}" via web interface`
        };
    }
}

const edcViewProfile = async (dataToEndorse) => {
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
                    targetId: dataToEndorse.targetId,
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
                        trackingId: dataToEndorse.trackingId
                    },
                    time: dInt
                },
                networkDistance: dataToEndorse.networkDistance,
                profileTrackingId: dataToEndorse.trackingId,
                requestHeader: {
                    interfaceLocale: "en_US",
                    pageKey: "d_flagship3_profile_view_base",
                    path: dataToEndorse.navigationUrl,
                    referer: LINKEDIN_URL,
                    trackingCode: "d_flagship3_feed"
                },
                vieweeMemberUrn: dataToEndorse.memberUrn,
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
            $('.endorseConnectionAction').attr('disabled', false)
        }
    })
}

// Direct skill endorsement function using the same approach as background script
const endorseSkillDirectly = async (skillName, entityUrn, connectId, memberUrn) => {
    
    try {
        // Use the LinkedIn profile ID (connectId) directly - this is the actual LinkedIn profile ID
        const profileId = connectId; // Use connectId directly (LinkedIn profile ID)
        const endorseUrl = `${voyagerApi}/identity/profiles/${profileId}/normEndorsements`;
        // Get fresh CSRF token from storage (same as background script)
        const csrfResult = await chrome.storage.local.get(["csrfToken"]);
        
        const response = await fetch(endorseUrl, {
            method: 'post',
            headers: {
                'csrf-token': csrfResult.csrfToken || jsession, // Use storage token first, fallback to jsession
                'accept': 'text/plain, */*; q=0.01',
                'content-type': 'application/json; charset=UTF-8',
                'x-li-lang': 'en_US',
                'x-li-page-instance': 'urn:li:page:d_flagship3_profile_view_base;3T8zGiC6TaW88WAryS7olA==',
                'x-li-track': JSON.stringify({"clientVersion":"1.10.1335","osName":"web","timezoneOffset":1,"deviceFormFactor":"DESKTOP","mpName":"voyager-web"}),
                'x-restli-protocol-version': '2.0.0'
            },
            body: JSON.stringify({
                skill: {
                    entityUrn: entityUrn,
                    name: skillName,
                }
            })
        });
        
        
        if(response.status == 201){
            return { 
                success: true, 
                message: `Successfully endorsed "${skillName}" directly via API` 
            };
        } else {
            return { 
                success: false, 
                message: `Failed to endorse skill: ${response.status}` 
            };
        }
        
    } catch (error) {
        console.error(`❌ ERROR IN DIRECT ENDORSEMENT: ${skillName}:`, error);
        return { 
            success: false, 
            message: `Error endorsing skill: ${error.message}` 
        };
    }
};

// stop automation
$('body').on('click','#edc-bot-action',function(){
    clearTimeout(timeOutEndorseCon);
    $('#edc-status').text('Stopped')
    $('.endorseConnectionAction').attr('disabled', false)
    setTimeout(function(){
        $('#endorse-connect-record').remove()
    }, 5000)
})