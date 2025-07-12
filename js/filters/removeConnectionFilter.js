
/**
 * Trigger single search filter
 */
$('body').on('click', '.rmc-searchCon', function(){
    singleSearchFilter('#rmc-connectionOf','CONNECTIONS','connections_of',query,'#rmc-resultConnectOf','rmc-conn-click')
})
$('body').on('click', '.rmc-searchLoc', function(){
    query = '(typeaheadFilterQuery:(geoSearchTypes:List(MARKET_AREA,COUNTRY_REGION,ADMIN_DIVISION_1,CITY)))';

    singleSearchFilter('#rmc-location','GEO','region',query,'#rmc-resultLocation','rmc-loc-click')
})
$('body').on('click','.rmc-searchCurrComp', function(){
    singleSearchFilter('#rmc-currComp','COMPANY','curr_compnay',query,'#rmc-resultCurrComp','rmc-curr-comp-click')
})
$('body').on('click','.rmc-searchPastComp', function(){
    singleSearchFilter('#rmc-pastComp','COMPANY','past_compnay',query,'#rmc-resultPastComp','rmc-past-comp-click')
})
$('body').on('click','.rmc-searchIndustry', function(){
    query = '(typeaheadFilterQuery:(standardizationEntityType:industry))';

    singleSearchFilter('#rmc-industy','INDUSTRY','industy',query,'#rmc-resultIndustry','rmc-industy-click')
})
$('body').on('click','.rmc-searchSchool', function(){
    singleSearchFilter('#rmc-school-search','SCHOOL','school',query,'#rmc-resultSchool','rmc-school-click')
})
$('body').on('click','#rmc-search-lang', function(){
    singleSearchFilter('#rmc-language','LANGUAGE','language',query,'#rmc-resultLanguage','rmc-language-click')
})

/**
 * Select specific search result
 */
$('body').on('click','.rmc-language-click',function(){
    selectedDataItem = {
        name: $(this).data('name'),
        trackId: $(this).data('id'),
        inputClass: 'rmc-language',
        removeClass: 'rmc-remove-language',
        dataAttr: 'id',
        selectedElem: '#rmc-selectedLanguage',
        resultElem: '#rmc-resultLanguage',
        elemVal: '#rmc-language',
        owner: 'language'
    }
    setSelectedSingleSearchFilter(selectedDataItem)
})
$('body').on('click','.rmc-school-click',function(){
    let schoolIdUrn = $(this).data('schoolid');

    selectedDataItem = {
        name: $(this).data('name'),
        trackId: $(this).data('id'),
        schoolId: schoolIdUrn.replace('urn:li:fsd_company:',''),
        inputClass: 'rmc-school',
        removeClass: 'rmc-remove-school',
        dataAttr: 'id',
        selectedElem: '#rmc-selectedSchool',
        resultElem: '#rmc-resultSchool',
        elemVal: '#rmc-school-search',
        owner: 'school'
    }
    setSelectedSingleSearchFilter(selectedDataItem)
})
$('body').on('click','.rmc-industy-click',function(){
    let industryUrn = $(this).data('industry');
    
    selectedDataItem = {
        name: $(this).data('name'),
        trackId: $(this).data('id'),
        industryId: industryUrn.replace('urn:li:industry:',''),
        inputClass: 'rmc-industy',
        removeClass: 'rmc-remove-industy',
        dataAttr: 'id',
        selectedElem: '#rmc-selectedIndustry',
        resultElem: '#rmc-resultIndustry',
        elemVal: '#rmc-industy',
        owner: 'industry'
    }
    setSelectedSingleSearchFilter(selectedDataItem)
})
$('body').on('click','.rmc-past-comp-click',function(){
    let pastCompUrn = $(this).data('pastcomp');

    selectedDataItem = {
        name: $(this).data('name'),
        trackId: $(this).data('id'),
        compId: pastCompUrn.replace('urn:li:organization:',''),
        inputClass: 'rmc-past-comp',
        removeClass: 'rmc-remove-past-comp',
        listDataAttr: 'pastcompid',
        dataAttr: 'id',
        selectedElem: '#rmc-selectedPastComp',
        resultElem: '#rmc-resultPastComp',
        elemVal: '#rmc-pastComp',
        owner: 'company'
    }
    setSelectedSingleSearchFilter(selectedDataItem)
})
$('body').on('click','.rmc-curr-comp-click',function(){
    let currCompUrn = $(this).data('currcomp');

    selectedDataItem = {
        name: $(this).data('name'),
        trackId: $(this).data('id'),
        compId: currCompUrn.replace('urn:li:organization:',''),
        inputClass: 'rmc-curr-comp',
        removeClass: 'rmc-remove-curr-comp',
        listDataAttr: 'currcompid',
        dataAttr: 'id',
        selectedElem: '#rmc-selectedCurrComp',
        resultElem: '#rmc-resultCurrComp',
        elemVal: '#rmc-currComp',
        owner: 'company'
    }
    setSelectedSingleSearchFilter(selectedDataItem)
})
$('body').on('click','.rmc-loc-click',function(){
    let regionUrn = $(this).data('regionid');

    selectedDataItem = {
        name: $(this).data('name'),
        trackId: $(this).data('id'),
        regionid: regionUrn.replace('urn:li:geo:',''),
        inputClass: 'rmc-loctn',
        removeClass: 'rmc-remove-loc',
        dataAttr: 'id',
        selectedElem: '#rmc-selectedLocation',
        resultElem: '#rmc-resultLocation',
        elemVal: '#rmc-location',
        owner: 'location'
    }
    setSelectedSingleSearchFilter(selectedDataItem)
})
$('body').on('click','.rmc-conn-click',function(){
    selectedDataItem = {
        name: $(this).data('name'),
        trackId: $(this).data('id'),
        identifier: $(this).data('identifier'),
        connectionId: $(this).data('connectionid'),
        inputClass: 'rmc-conn-of',
        removeClass: 'rmc-remove-conof',
        dataAttr: 'idf',
        selectedElem: '#rmc-selectedConnectOf',
        resultElem: '#rmc-resultConnectOf',
        elemVal: '#rmc-connectionOf',
        owner: 'connectionOf'
    }
    setSelectedSingleSearchFilter(selectedDataItem)
})

/**
 * Remove selected search result
 */
$('body').on('click','.rmc-remove-conof',function(){
    let id = $(this).data('idf')
    $('#rmc-selectedConnectOf').find(`li#${id}`).remove()
    return false;
})
$('body').on('click','.rmc-remove-loc',function(){
    let id = $(this).data('id')
    $('#rmc-selectedLocation').find(`li#${id}`).remove()
    return false;
})
$('body').on('click','.rmc-remove-curr-comp',function(){
    let id = $(this).data('id')
    $('#rmc-selectedCurrComp').find(`li#${id}`).remove()
    return false;
})
$('body').on('click','.rmc-remove-past-comp',function(){
    let id = $(this).data('id')
    $('#rmc-selectedPastComp').find(`li#${id}`).remove()
    return false;
})
$('body').on('click','.rmc-remove-industy',function(){
    let id = $(this).data('id')
    $('#rmc-selectedIndustry').find(`li#${id}`).remove()
    return false;
})
$('body').on('click','.rmc-remove-school',function(){
    let id = $(this).data('id')
    $('#rmc-selectedSchool').find(`li#${id}`).remove()
    return false;
})
$('body').on('click','.rmc-remove-language',function(){
    let id = $(this).data('id')
    $('#rmc-selectedLanguage').find(`li#${id}`).remove()
    return false;
})