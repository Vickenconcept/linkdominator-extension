$('.connectionInfoAction').click(function(){
    console.log('🔍 Get Connections Info: Starting process...');
    $('#displayGetConnectInfoStatus').empty()
    var gciStartP = $('#gci-startPosition'),
        gciTotal = $('#gci-totalScrape'),
        gciDelay = $('#gci-delayTime');
    var gciconnectnId = '',
        gciregionId = '',
        gcicurrCompId = '',
        gcipastCompId = '',
        gciindustryId = '',
        gcischoolId = '',
        gcilangId='',
        gciconnDegree = '';
    var gciControlFiels = [gciDelay,gciTotal];

    var queryParams = '';

    console.log('📋 Get Connections Info: Form values:', {
        audienceSelected: $('#gci-audience-select').val(),
        searchTerm: $('#gci-search-term').val(),
        startPosition: gciStartP.val(),
        totalToScrape: gciTotal.val(),
        delayBetweenScrapes: gciDelay.val()
    });

    // validate fields
    if(gciTotal.val() =='' || gciDelay.val() =='' ){
        console.log('❌ Get Connections Info: Validation failed - missing required fields');
        for(var i=0;i<gciControlFiels.length;i++){
            if(gciControlFiels[i].val() == ''){
                console.log(`❌ Get Connections Info: Missing field: ${gciControlFiels[i].data('name')}`);
                $('#gci-error-notice').html(`${gciControlFiels[i].data('name')} field cannot be empty`)
            }
        }
    }else if(gciDelay.val() < 30){
        console.log('❌ Get Connections Info: Validation failed - delay too low:', gciDelay.val());
        $('#gci-error-notice').html(`Delay minimum is 30`)
    }else{
        console.log('✅ Get Connections Info: Validation passed');
        $('#gci-error-notice').html(``)

        // check if value exists in accordion list dropdown
        if($('#gci-selectedConnectOf li').length > 0){
            queryParams += setFIlterQueryParams('#gci-selectedConnectOf','connectionid','connectionOf')
        }
        if($('#gci-selectedLocation li').length > 0){
            queryParams += setFIlterQueryParams('#gci-selectedLocation','regionid','geoUrn')
        }
        if($('#gci-selectedSchool li').length > 0){
            queryParams += setFIlterQueryParams('#gci-selectedSchool','schoolid','schoolFilter')
        }
        if($('#gci-selectedCurrComp li').length > 0){
            queryParams += setFIlterQueryParams('#gci-selectedCurrComp','currcompid','currentCompany')
        }
        if($('#gci-selectedPastComp li').length > 0){
            queryParams += setFIlterQueryParams('#gci-selectedPastComp','pastcompid','pastCompany')
        }
        if($('#gci-selectedIndustry li').length > 0){
            queryParams += setFIlterQueryParams('#gci-selectedIndustry','industryid','industry')
        }
        if($('#gci-selectedLanguage li').length > 0){
            queryParams += setFIlterQueryParams('#gci-selectedLanguage','langcode','profileLanguage')
        }
        // set degree network to array and pass on
        var degreeArr = []; 
        $('.gci-conn-degree input').each(function(index){
            if($(this).prop('checked') == true){
                degreeArr.push($(this).val())
            }
        })
        for (var i = 0; i < degreeArr.length; i++) {
            if(i == (degreeArr.length -1)){
                gciconnDegree += degreeArr[i]
            }else{
                gciconnDegree += degreeArr[i] +','
            }
        }
        if(degreeArr.length)
            queryParams += `network:List(${gciconnDegree}),`

        if($('#gci-firstName').val())
            queryParams += setFIlterQueryParamsFreeText('#gci-firstName','firstName')
        if($('#gci-lastName').val())
            queryParams += setFIlterQueryParamsFreeText('#gci-lastName','lastName')
        if($('#gci-school').val())
            queryParams += setFIlterQueryParamsFreeText('#gci-school','schoolFreetext')
        if($('#gci-title').val())
            queryParams += setFIlterQueryParamsFreeText('#gci-title','title')
        if($('#gci-company').val())
            queryParams += setFIlterQueryParamsFreeText('#gci-company','company')


        gciTotal = gciTotal.val() < 10 ? 10 : gciTotal.val()
        gciStartP = gciStartP.val() == '' ? 0 : gciStartP.val()

        $(this).attr('disabled', true)  

        // Check which method is selected
        let audienceMethodSelected = $('#gci-audience-method-card').hasClass('selected');
        let searchMethodSelected = $('#gci-search-method-card').hasClass('selected');
        let audienceSelected = $('#gci-audience-select').val() != '';
        let searchTermEntered = $('#gci-search-term').val() != '';
        
        console.log('📊 Get Connections Info: Method selection:', {
            audienceMethodSelected: audienceMethodSelected,
            searchMethodSelected: searchMethodSelected,
            audienceSelected: audienceSelected,
            searchTermEntered: searchTermEntered
        });
        
        // Determine method based on both class and actual form state
        if (audienceSelected) {
            console.log('📊 Get Connections Info: Using selected audience:', $('#gci-audience-select').val());
            gciAudienceList($('#gci-totalScrape').val(), gciDelay.val(), $('#gci-audience-select').val())
        } else if (searchTermEntered || queryParams != '') {
            console.log('🔍 Get Connections Info: Using PhantomBuster search');
            
            // Get keywords
            const keywords = $('#gci-search-term').val() ? $('#gci-search-term').val().trim() : '';
            
            if (!keywords) {
                $('#gci-error-notice').html('Please enter search keywords');
                $('.connectionInfoAction').attr('disabled', false);
                return;
            }

            // Map connection degrees from UI checkboxes (F, S, O) to PhantomBuster format ('1', '2', '3+')
            const degreeMap = {
                'F': '1',
                'S': '2',
                'O': '3+'
            };
            const mappedDegrees = degreeArr.length
                ? degreeArr.map(d => degreeMap[d] || d)
                : ['2', '3+']; // Default to 2nd and 3rd+ if none selected

            // Build LinkedIn search URL using reusable function
            const searchUrl = window.buildLinkedInSearchUrl ? 
                window.buildLinkedInSearchUrl(keywords, 'gci-', degreeArr.length ? degreeArr : ['S', 'O']) : '';

            console.log('🔍 Get Connections Info: Using PhantomBuster search:', { searchUrl, keywords, connectionDegrees: mappedDegrees });
            gciGetConnections(searchUrl, keywords, mappedDegrees, gciStartP, gciTotal, gciDelay.val())
        } else {
            console.log('❌ Get Connections Info: No method properly selected');
            $('#gci-error-notice').html('Please select a method: either choose an audience or use search parameters');
            $('.connectionInfoAction').attr('disabled', false);
            return;
        }    
    }
})

const gciGetConnections = async (searchUrl, keywords, connectionDegrees, gciStartP, gciTotal, gciDelay) => {
    $('.getConnectInfo').show()
    $('#displayGetConnectInfoStatus').empty()
    $('#displayGetConnectInfoStatus').html('Scanning. Please wait...')
    let connectionItems = [], totalResultCount = 0;

    let getConnectionsLooper = async () => {
        try {
            // Use PhantomBuster instead of Voyager API
            const response = await window.fetchPhantomSearchResults({
                searchUrl: searchUrl || null,
                keywords: keywords,
                connectionDegrees: connectionDegrees,
                limit: gciTotal,
                startPosition: gciStartP
            });

            // Response format: { data: { elements: [...], included: [...] }, included: [...] }
            let elements = response.data?.elements || response.elements || [];
            let included = response.included || [];

            console.log('📊 Get Connections Info: Response structure:', {
                elementsLength: elements.length,
                includedLength: included.length
            });

            if(elements && elements.length) {
                if(totalResultCount == 0) {
                    totalResultCount = response.data?.metadata?.totalResultCount || included.length;
                }

                console.log(`📈 Get Connections Info: Total results available: ${totalResultCount}`);

                // Find the element that contains the search results
                let searchResultElement = null;
                for(let i = 0; i < elements.length; i++) {
                    if(elements[i] && elements[i].items && elements[i].items.length > 0) {
                        console.log(`✅ Get Connections Info: Found search results in elements[${i}]`);
                        searchResultElement = elements[i];
                        break;
                    }
                }

                if(searchResultElement && searchResultElement.items && searchResultElement.items.length > 0) {
                    console.log(`👥 Get Connections Info: Found ${searchResultElement.items.length} connections in this batch`);
                    
                    // Add items from elements
                    for(let item of searchResultElement.items) {
                        connectionItems.push(item);
                    }

                    // Also add items from included array
                    for(let item of included) {
                        if(item.title && item.title.text && !item.title.text.includes('LinkedIn Member')) {
                            // Check if already added (avoid duplicates)
                            const alreadyAdded = connectionItems.some(c => 
                                c.trackingId === item.trackingId || 
                                c.navigationUrl === item.navigationUrl
                            );
                            if(!alreadyAdded) {
                                connectionItems.push(item);
                            }
                        }
                    }

                    console.log(`📊 Get Connections Info: Total connections collected: ${connectionItems.length}/${gciTotal}`);

                    if(connectionItems.length < gciTotal) {
                        gciStartP = parseInt(gciStartP) + connectionItems.length;
                        $('#gci-startPosition').val(gciStartP);
                        console.log(`🔄 Get Connections Info: Getting more results, new start position: ${gciStartP}`);
                        setTimeout(() => {
                            getConnectionsLooper();
                        }, 10000);
                    } else {
                        console.log('✅ Get Connections Info: Collected enough connections, starting data extraction...');
                        gciCleanConnectionsData(connectionItems, totalResultCount, gciDelay);
                    }
                } else {
                    console.log('⚠️ Get Connections Info: No connection items found in any elements');
                    if(connectionItems.length) {
                        console.log(`✅ Get Connections Info: No more results from API, but have ${connectionItems.length} connections to process`);
                        $('#displayGetConnectInfoStatus').html(`Found ${connectionItems.length}. Getting Info...`);
                        gciCleanConnectionsData(connectionItems, totalResultCount, gciDelay);
                    } else {
                        $('#displayGetConnectInfoStatus').html('No result found, change your search criteria and try again!');
                        $('.connectionInfoAction').attr('disabled', false);
                    }
                }
            } else if(connectionItems.length) {
                console.log(`✅ Get Connections Info: No more results from API, but have ${connectionItems.length} connections to process`);
                $('#displayGetConnectInfoStatus').html(`Found ${connectionItems.length}. Getting Info...`);
                gciCleanConnectionsData(connectionItems, totalResultCount, gciDelay);
            } else {
                console.log('❌ Get Connections Info: No results found at all');
                $('#displayGetConnectInfoStatus').html('No result found, change your search criteria and try again!');
                $('.connectionInfoAction').attr('disabled', false);
            }
        } catch(error) {
            console.error('❌ Get Connections Info: Error fetching connections:', error);
            
            // Check for session expired error
            if (window.displaySessionExpiredError && window.displaySessionExpiredError(error, '#displayGetConnectInfoStatus')) {
                // Error message already displayed
            } else {
                $('#displayGetConnectInfoStatus').html(`Error: ${error.message || 'Error searching LinkedIn. Please try again or check console for details.'}`);
            }
            
            $('.connectionInfoAction').attr('disabled', false);
        }
    }
    
    getConnectionsLooper();
}



const gciCleanConnectionsData = (connectionItems, totalResultCount, gciDelay) => {
    console.log('🔧 Get Connections Info: Starting data extraction...', {
        totalItems: connectionItems.length,
        sampleItem: connectionItems[0]
    });
    
    let conArr = [];
    let dataToScrape = [];
    let profileUrn;
    let processedCount = 0;
    let validCount = 0;

    for(let item of connectionItems) {
        processedCount++;
        console.log(`🔍 Get Connections Info: Processing item ${processedCount}/${connectionItems.length}:`, item);
        
        let publicIdentifier = null;
        
        // Handle PhantomBuster/LinkedIn API format (new format)
        if (item.entityUrn) {
            // Extract from entityUrn: "urn:li:fsd_entityResultViewModel:(urn:li:fsd_profile:username,SEARCH_SRP,DEFAULT)"
            const match = item.entityUrn.match(/urn:li:fsd_profile:([^,]+)/);
            if (match && match[1]) {
                publicIdentifier = match[1];
            }
        } 
        
        if (!publicIdentifier && item.navigationUrl) {
            // Extract from navigationUrl: "https://www.linkedin.com/in/username"
            const match = item.navigationUrl.match(/\/in\/([^\/\?]+)/);
            if (match && match[1]) {
                publicIdentifier = match[1];
            }
        } 
        
        if (!publicIdentifier && item.trackingUrn) {
            // Extract from trackingUrn: "urn:li:member:username"
            const match = item.trackingUrn.match(/urn:li:member:(.+)/);
            if (match && match[1]) {
                publicIdentifier = match[1];
            }
        }
        
        // Handle old Voyager API format (legacy format)
        if (!publicIdentifier && item.itemUnion && item.itemUnion['*entityResult']) {
            profileUrn = item.itemUnion['*entityResult'];
            if (profileUrn && typeof profileUrn === 'string' && 
               profileUrn.includes('urn:li:fsd_entityResultViewModel:(urn:li:fsd_profile:') && 
               profileUrn.includes(',SEARCH_SRP,DEFAULT)')) {
                profileUrn = profileUrn.replace('urn:li:fsd_entityResultViewModel:(urn:li:fsd_profile:', '');
                profileUrn = profileUrn.replace(',SEARCH_SRP,DEFAULT)', '');
                publicIdentifier = profileUrn;
            }
        }

        if (publicIdentifier) {
            // Store full item data from PhantomBuster for later use (no Voyager API needed)
            conArr.push({
                conId: publicIdentifier,
                connectionId: publicIdentifier, // Alias for compatibility
                totalResultCount: totalResultCount,
                // Store full PhantomBuster data
                phantomData: {
                    name: item.title?.text || '',
                    firstName: item.firstName || (item.title?.text ? item.title.text.split(' ')[0] : ''),
                    lastName: item.lastName || (item.title?.text ? item.title.text.split(' ').slice(1).join(' ') : ''),
                    headline: item.primarySubtitle?.text || '',
                    location: item.secondarySubtitle?.text || '',
                    entityUrn: item.entityUrn || null,
                    trackingUrn: item.trackingUrn || null,
                    navigationUrl: item.navigationUrl || `https://www.linkedin.com/in/${publicIdentifier}`,
                    trackingId: item.trackingId || null,
                    memberDistance: item.entityCustomTrackingInfo?.memberDistance || null,
                }
            });
            
            validCount++;
            console.log(`✅ Get Connections Info: Valid profile extracted: ${publicIdentifier} (${validCount} total)`);
        } else {
            console.log(`⚠️ Get Connections Info: Could not extract public identifier from item:`, item);
        }
    }
    
    console.log(`📊 Get Connections Info: Extraction summary: ${validCount}/${processedCount} valid profiles found`);

    // get only user defined total
    let requestedTotal = $('#gci-totalScrape').val();
    for(let z=0; z < conArr.length; z++) {
        if(z < requestedTotal)
            dataToScrape.push(conArr[z])
        else
            break;
    }
    
    console.log(`🎯 Get Connections Info: Final data ready for scraping:`, {
        availableProfiles: conArr.length,
        requestedTotal: requestedTotal,
        willScrape: dataToScrape.length,
        profiles: dataToScrape
    });
    
    if(dataToScrape.length > 0) {
        gciGetConnectionInfo(dataToScrape, gciDelay);
    } else {
        console.log('❌ Get Connections Info: No valid profiles found to scrape');
        $('#displayGetConnectInfoStatus').empty();
        $('#displayGetConnectInfoStatus').html('No valid profiles found in search results. Try different search criteria.');
        $('.connectionInfoAction').attr('disabled', false);
    }
}

const gciAudienceList = async (gciTotal, gciDelay, audienceId) => {
    console.log('📊 Get Connections Info: Fetching audience data...', {
        audienceId: audienceId,
        totalRequested: gciTotal,
        url: `${filterApi}/audience/list?audienceId=${audienceId}&totalCount=${gciTotal}`
    });
    
    var dataToScrape = [];

    await $.ajax({
        method: 'get',
        url: `${filterApi}/audience/list?audienceId=${audienceId}&totalCount=${gciTotal}`,
        success: function(data){
            console.log('📊 Get Connections Info: Audience API response:', data);
            
            // Handle different API response formats (same fix as other functions)
            let dataPath = null;
            
            if (data && data.audience && Array.isArray(data.audience)) {
                // New format: {audience: Array}
                console.log('✅ Get Connections Info: Found direct audience array');
                dataPath = data.audience;
            } else if (data && Array.isArray(data) && data.length > 0 && data[0].audience) {
                // Old format: [{audience: Array}]
                console.log('✅ Get Connections Info: Found audience in array format');
                dataPath = data[0].audience;
            } else if (data && Array.isArray(data)) {
                // Direct array format: [connection1, connection2, ...]
                console.log('✅ Get Connections Info: Found direct connection array');
                dataPath = data;
            }
            
            if(dataPath && dataPath.length > 0){
                console.log(`👥 Get Connections Info: Found ${dataPath.length} connections in audience`);
                for(let i=0; i<dataPath.length; i++){
                    dataToScrape.push({connectionId: dataPath[i].con_id, publicIdentifier: dataPath[i].con_public_identifier})
                }
                console.log(`✅ Get Connections Info: Prepared ${dataToScrape.length} connections for scraping`);
            }else{
                console.log('⚠️ Get Connections Info: No connections found in audience');
                $('.getConnectInfo').show()
                $('#displayGetConnectInfoStatus').empty()
                $('#displayGetConnectInfoStatus').html('No contact on audience list!')
                $('.connectionInfoAction').attr('disabled', false)
                return;
            }
        },
        error: function (error){
            console.error('❌ Get Connections Info: Error fetching audience:', error);
            $('.getConnectInfo').show()
            $('#displayGetConnectInfoStatus').empty()
            $('#displayGetConnectInfoStatus').html('Error fetching audience data. Check console for details.')
            $('.connectionInfoAction').attr('disabled', false)
            return;
        }
    })
    
    if(dataToScrape.length > 0) {
        console.log('🚀 Get Connections Info: Starting connection info scraping...');
        gciGetConnectionInfo(dataToScrape, gciDelay)
    }
}

var timeOutGetConnInfo;
const gciGetConnectionInfo = async (dataToScrape, gciDelay) => {
    console.log('🚀 Get Connections Info: Starting profile scraping process...', {
        totalConnections: dataToScrape.length,
        delayBetweenScrapes: gciDelay
    });
    
    var displayLi = '', x = 0, displayAutomationRecord = '';
    var scrapedData = [];

    $('.getConnectInfo').show()

    // automation table data setup
    displayAutomationRecord = `
        <tr id="get-connect-info-record">
            <td>Get Connections Info</td>
            <td id="gci-status">Running</td>
            <td>${dataToScrape.length}</td>
            <td id="gci-numbered">0/${dataToScrape.length}</td>
            <td id="gci-bot-action" title="Stop automation"><i class="far fa-dot-circle fa-lg text-danger cursorr"></i></td>
            <td id="gci-remained-time">${remainedTime(gciDelay,dataToScrape.length)}</td>
        </tr>
    `;
    $('#no-job').hide()
    $('#automation-list').append(displayAutomationRecord)

    for(const [i,v] of dataToScrape.entries()) {
        const connectionId = dataToScrape[i].connectionId || dataToScrape[i].conId;
        const phantomData = dataToScrape[i].phantomData || {};
        
        console.log(`📧 Get Connections Info: Processing ${i+1}/${dataToScrape.length} - Connection ID: ${connectionId}`);
        
        // Use PhantomBuster data instead of making Voyager API calls
        const name = phantomData.name || `${phantomData.firstName || ''} ${phantomData.lastName || ''}`.trim() || 'LinkedIn Member';
        const firstName = phantomData.firstName || name.split(' ')[0] || '';
        const lastName = phantomData.lastName || name.split(' ').slice(1).join(' ') || '';
        const headline = phantomData.headline || '';
        const location = phantomData.location || '';
        const entityUrn = phantomData.entityUrn || `urn:li:fs_profile:${connectionId}`;
        
        console.log(`👤 Get Connections Info: Profile data from PhantomBuster for ${name} (${i+1}/${dataToScrape.length})`);

        // Create mock response structure similar to Voyager API format for compatibility
        const mockProfileData = {
            'data': {
                profile: {
                    firstName: firstName,
                    lastName: lastName,
                    entityUrn: entityUrn,
                    headline: headline,
                    location: location
                }
            }
        };
        
        const mockContactData = {
            'data': {
                data: {
                    // Contact info structure (if needed)
                }
            }
        };

        scrapedData.push({
            main: mockProfileData,
            contact: mockContactData,
            connectId: connectionId
        });

        $('#displayGetConnectInfoStatus').empty()
        displayLi = `
            <li>Connection: <b>${name}</b></li>
            <li>Total scraped: <b>${x +1}</b></li>
        `;
        $('#displayGetConnectInfoStatus').append(displayLi)

        // update automation count done and time remained
        $('#gci-numbered').text(`${x +1}/${dataToScrape.length}`)
        $('#gci-remained-time').text(`${remainedTime(gciDelay, dataToScrape.length - (x +1))}`)

        x++;

        await sleep(gciDelay*1000)
    }

    $('.connectionInfoAction').attr('disabled', false)
    
    console.log('🏁 Get Connections Info: Scraping completed!', {
        totalScraped: scrapedData.length,
        totalRequested: dataToScrape.length,
        successRate: `${Math.round((scrapedData.length / dataToScrape.length) * 100)}%`
    });
                
    gciSetExportData(scrapedData);
    sendStats(x, 'Profiles scraped')

    // update automation status
    $('#gci-status').text('Completed')
    setTimeout(function(){
        $('#get-connect-info-record').remove()
    }, 5000)
}

const gciSetExportData = (scrapedData) => {
    var dataToExport = [];

    $.each(scrapedData, function(i,item){
        var mainPath = item.main && item.main['data'] ? item.main['data'] : {};
        var contactInfoPath = item.contact && item.contact['data'] && item.contact['data'].data ? item.contact['data'].data : {};
        
        // Check if this is PhantomBuster data (simpler structure) or Voyager data (full structure)
        const isPhantomBusterData = !mainPath.skillView && !mainPath.languageView && mainPath.profile;
        
        var skillPath = mainPath.skillView && mainPath.skillView.elements ? mainPath.skillView.elements : [],
            languagePath = mainPath.languageView && mainPath.languageView.elements ? mainPath.languageView.elements : [],
            certificationPath = mainPath.certificationView && mainPath.certificationView.elements ? mainPath.certificationView.elements : [],
            coursesPath = mainPath.courseView && mainPath.courseView.elements ? mainPath.courseView.elements : [],
            educationPath = mainPath.educationView && mainPath.educationView.elements ? mainPath.educationView.elements : [],
            positionPath = mainPath.positionView && mainPath.positionView.elements ? mainPath.positionView.elements : [];

        var timePeriodPath, startDate, endDate, period;
        var description, companyName, companySize, companyIndustry, companyLocation;

        if(positionPath[0]){
            if (positionPath[0].hasOwnProperty('timePeriod')) {
                timePeriodPath = positionPath[0].timePeriod;
                startDate = timePeriodPath.startDate ? monthModifier(timePeriodPath.startDate.month)+' '+timePeriodPath.startDate.year : 'Present';
                endDate = timePeriodPath.endDate ? monthModifier(timePeriodPath.endDate.month)+' '+timePeriodPath.endDate.year : 'Present';
                period = startDate+' - '+endDate;
            } else {
                period = null;
            }
            description = positionPath[0].description ? positionPath[0].description : null;
            companyName = positionPath[0].companyName ?  positionPath[0].companyName : null;
            if (positionPath[0].hasOwnProperty('company')){
                if(positionPath[0].company.hasOwnProperty('employeeCountRange')) {
                    companySize = positionPath[0].company.employeeCountRange.start;
                }else{ companySize = null; }
                if(positionPath[0].company.hasOwnProperty('industries')){
                    companyIndustry = positionPath[0].company.industries[0];
                }else{ companyIndustry = null; }
            }else{
                companyIndustry = null;
                companySize = null;
            }
            companyLocation = positionPath[0].locationName ? positionPath[0].locationName : null;
        } else {
            period = null;
            description = null;
            companyName = null;
            companySize = null;
            companyIndustry = null;
            companyLocation = null;
        }

        var timePeriodPath1, startDate1, endDate1, period1;
        var description1, companyName1, companySize1, companyIndustry1, companyLocation1;

        if(positionPath[1]){
            if (positionPath[1].hasOwnProperty('timePeriod')) {
                timePeriodPath1 = positionPath[1].timePeriod;
                startDate1 = timePeriodPath1.startDate ? monthModifier(timePeriodPath1.startDate.month)+' '+timePeriodPath1.startDate.year : 'Present';
                endDate1 = timePeriodPath1.endDate ? monthModifier(timePeriodPath1.endDate.month)+' '+timePeriodPath1.endDate.year : 'Present';
                period1 = startDate1+' - '+endDate1;
            } else {
                period1 = null;
            }
            description1 = positionPath[1].description ? positionPath[1].description : null;
            companyName1 = positionPath[1].companyName ?  positionPath[1].companyName : null;
            if(positionPath[1].hasOwnProperty('company')) {
                if(positionPath[1].company.hasOwnProperty('employeeCountRange')) {
                    companySize1 = positionPath[1].company.employeeCountRange.start;
                }else{ companySize1 = null; }
                if(positionPath[1].company.hasOwnProperty('industries')){
                    companyIndustry1 = positionPath[1].company.industries[0];
                }else{ companyIndustry1 = null; }
            }else{
                companyIndustry1 = null;
                companySize1 = null;
            }
            companyLocation1 = positionPath[1].locationName ? positionPath[1].locationName : null;
        } else {
            period1 = null;
            description1 = null;
            companyName1 = null;
            companySize1 = null;
            companyIndustry1 = null;
            companyLocation1 = null;
        }
        
        var timePeriodPath2, startDate2, endDate2, period2;
        var description2, companyName2, companySize2, companyIndustry2, companyLocation2;

        if(positionPath[2]){
            if (positionPath[2].hasOwnProperty('timePeriod')) {
                var timePeriodPath2 = positionPath[2].timePeriod;
                var startDate2 = timePeriodPath2.startDate ? monthModifier(timePeriodPath2.startDate.month)+' '+timePeriodPath2.startDate.year : 'Present';
                var endDate2 = timePeriodPath2.endDate ? monthModifier(timePeriodPath2.endDate.month)+' '+timePeriodPath2.endDate.year : 'Present';
                period2 = startDate2+' - '+endDate2;
            } else {
                period2 = null;
            }
            description2 = positionPath[2].description ? positionPath[2].description : null;
            companyName2 = positionPath[2].companyName ?  positionPath[2].companyName : null;
            if(positionPath[2].hasOwnProperty('company')) {
                if(positionPath[2].company.hasOwnProperty('employeeCountRange')) {
                    companySize2 = positionPath[2].company.employeeCountRange.start;
                }else{ companySize2 = null; }
                if(positionPath[2].company.hasOwnProperty('industries')) {
                    companyIndustry2 = positionPath[2].company.industries[0];
                }else{ companyIndustry2 = null; }
            }else{
                companyIndustry2 = null;
                companySize2 = null;
            }
            companyLocation2 = positionPath[2].locationName ? positionPath[2].locationName : null;
        }else {
            period2 = null;
            description2 = null;
            companyName2 = null;
            companySize2 = null;
            companyIndustry2 = null;
            companyLocation2 = null;
        }

        var language = '',
            skills = '',
            certification = '',
            courses = '';

        if(skillPath.length > 0){
            for(let i=0; i < skillPath.length; i++){
                if(i == (skillPath.length -1)){
                    skills += skillPath[i].name
                }else{
                    skills += skillPath[i].name+', '
                }
            }
        }
        if(languagePath.length > 0){
            for(let i=0; i < languagePath.length; i++){
                if(i == (languagePath.length -1)){
                    language += languagePath[i].name
                }else{
                    language += languagePath[i].name+', '
                }
            }
        }
        if(certificationPath.length > 0){
            for(let i=0; i < certificationPath.length; i++){
                if(i == (certificationPath.length -1)){
                    certification += certificationPath[i].name
                }else{
                    certification += certificationPath[i].name+', '
                }
            }
        }
        if(coursesPath.length > 0){
            for(let i=0; i < coursesPath.length; i++){
                if(i == (coursesPath.length -1)){
                    courses += coursesPath[i].name
                }else{
                    courses += coursesPath[i].name+', '
                }
            }
        }
        
        // Safely extract profile data (handles both PhantomBuster and Voyager formats)
        const profile = mainPath.profile || {};
        const profileLocation = profile.location || {};
        const basicLocation = profileLocation.basicLocation || {};
        const contactPhoneNumbers = contactInfoPath.phoneNumbers || [];
        const contactTwitterHandles = contactInfoPath.twitterHandles || [];
        
        dataToExport.push({
            firstName: profile.firstName || '',
            lastName: profile.lastName || '',
            Email: contactInfoPath.emailAddress || null,
            Phone: contactPhoneNumbers.length > 0 && contactPhoneNumbers[0] ? contactPhoneNumbers[0].number : null,
            Twitter: contactTwitterHandles.length > 0 && contactTwitterHandles[0] ? contactTwitterHandles[0].name : null,
            headLine: profile.headline || '',
            industry: profile.industryName || null,
            skills: skills !='' ? skills : null,
            locationName: profile.locationName || null,
            countryCode: basicLocation.countryCode || null,
            linkedUrl: `${LINKEDIN_URL}/in/${item.connectId}`,
            language: language !='' ? language: null,
            summary: profile.summary ? profile.summary : null,
            certification: certification !='' ? certification : null,
            courses: courses !='' ? courses : null,
            degreeName01: educationPath[0] ? educationPath[0].degreeName : null,
            fieldOfStudy01: educationPath[0] ? educationPath[0].fieldOfStudy : null,
            schoolName01: educationPath[0] ? educationPath[0].schoolName : null,
            degreeName02: educationPath[1] ? educationPath[1].degreeName : null,
            fieldOfStudy02: educationPath[1] ? educationPath[1].fieldOfStudy : null,
            schoolName02: educationPath[1] ? educationPath[1].schoolName : null,
            degreeName03: educationPath[2] ? educationPath[2].degreeName : null,
            fieldOfStudy03: educationPath[2] ? educationPath[2].fieldOfStudy : null,
            schoolName03: educationPath[2] ? educationPath[2].schoolName : null,
            position01: positionPath[0] ? positionPath[0].title : null,
            timePeriod01: period,
            positionDescription01: description,
            companyName01: companyName,
            employeeCount01: companySize,
            companyIndustry01: companyIndustry,
            companyLocation01: companyLocation,
            position02: positionPath[1] ? positionPath[1].title : null,
            timePeriod02: period1,
            positionDescription02: description1,
            companyName02: companyName1,
            employeeCount02: companySize1,
            companyIndustry02: companyIndustry1,
            companyLocation02: companyLocation1,
            position03: positionPath[2] ? positionPath[2].title : null,
            timePeriod03: period2,
            positionDescription03: description2,
            companyName03: companyName2,
            employeeCount03: companySize2,
            companyIndustry03: companyIndustry2,
            companyLocation03: companyLocation2
        })
    })

    gciExportData(dataToExport)

    $('.connectionInfoAction').attr('disabled', false)
}

const gciExportData = (dataToExport) => {
    const date = new Date();
    const d = date.getDate();
    const m = date.getMonth();
    const y = date.getFullYear();
    const mtn = date.getMinutes();
    const fileName =  `connection_data_${d}${m}${y}${mtn}.csv`; 

    console.log('📁 Get Connections Info: Preparing CSV export...', {
        totalRecords: dataToExport.length,
        fileName: fileName
    });

    if(dataToExport.length > 0){
        const csvRows = [];
        const headers = Object.keys(dataToExport[0]);
        csvRows.push(headers.join(','));

        for (const row of dataToExport) {
            const values = headers.map(header => {
                const val = row[header]
                return `"${val}"`;
            });

            // To add, sepearater between each value
            csvRows.push(values.join(','));
        }
        const download = csvRows.join('\n');

        var blob = new Blob([download]);
        var link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = fileName;
        link.click();
        
        console.log('✅ Get Connections Info: CSV file downloaded successfully!', {
            fileName: fileName,
            totalRecords: dataToExport.length,
            headers: Object.keys(dataToExport[0]).length
        });
    }
}

const monthModifier = (monthNum) => {
    const date = new Date(); 
    date.setMonth(monthNum - 1);

    return date.toLocaleString('en-US', {
        month: 'short',
    });
}

// stop automation 
$('body').on('click','#gci-bot-action',function(){
    clearTimeout(timeOutGetConnInfo);
    $('#gci-status').text('Stopped')
    $('.connectionInfoAction').attr('disabled', false)
    setTimeout(function(){
        $('#get-connect-info-record').remove()
    }, 5000)
})