
/**
 * Trigger single search filter
 */

$('body').on('click', '.gci-searchCon', function(){
    singleSearchFilter('#gci-connectionOf','CONNECTIONS','connections_of',query,'#gci-resultConnectOf','gci-conn-click')
})
$('body').on('click', '.gci-searchLoc', function(){
    query = '(typeaheadFilterQuery:(geoSearchTypes:List(MARKET_AREA,COUNTRY_REGION,ADMIN_DIVISION_1,CITY)))';

    singleSearchFilter('#gci-location','GEO','region',query,'#gci-resultLocation','gci-loc-click')
})
$('body').on('click','.gci-searchCurrComp', function(){
    singleSearchFilter('#gci-currComp','COMPANY','curr_compnay',query,'#gci-resultCurrComp','gci-curr-comp-click')
})
$('body').on('click','.gci-searchPastComp', function(){
    singleSearchFilter('#gci-pastComp','COMPANY','past_compnay',query,'#gci-resultPastComp','gci-past-comp-click')
})
$('body').on('click','.gci-searchIndustry', function(){
    query = '(typeaheadFilterQuery:(standardizationEntityType:industry))';

    singleSearchFilter('#gci-industy','INDUSTRY','industy',query,'#gci-resultIndustry','gci-industy-click')
})
$('body').on('click','.gci-searchSchool', function(){
    singleSearchFilter('#gci-school-search','SCHOOL','school',query,'#gci-resultSchool','gci-school-click')
})
$('body').on('click','#gci-search-lang', function(){
    singleSearchFilter('#gci-language','LANGUAGE','language',query,'#gci-resultLanguage','gci-language-click')
})

/**
 * Select specific search result
 */

$('body').on('click','.gci-conn-click',function(){
    selectedDataItem = {
        name: $(this).data('name'),
        trackId: $(this).data('id'),
        identifier: $(this).data('identifier'),
        connectionId: $(this).data('connectionid'),
        inputClass: 'gci-conn-of',
        removeClass: 'gci-remove-conof',
        dataAttr: 'idf',
        selectedElem: '#gci-selectedConnectOf',
        resultElem: '#gci-resultConnectOf',
        elemVal: '#gci-connectionOf',
        owner: 'connectionOf'
    }
    setSelectedSingleSearchFilter(selectedDataItem)
})
$('body').on('click','.gci-loc-click',function(){
    let regionUrn = $(this).data('regionid');

    selectedDataItem = {
        name: $(this).data('name'),
        trackId: $(this).data('id'),
        regionid: regionUrn.replace('urn:li:geo:',''),
        inputClass: 'gci-loctn',
        removeClass: 'gci-remove-loc',
        dataAttr: 'id',
        selectedElem: '#gci-selectedLocation',
        resultElem: '#gci-resultLocation',
        elemVal: '#gci-location',
        owner: 'location'
    }
    setSelectedSingleSearchFilter(selectedDataItem)
})
$('body').on('click','.gci-curr-comp-click',function(){
    let currCompUrn = $(this).data('currcomp');

    selectedDataItem = {
        name: $(this).data('name'),
        trackId: $(this).data('id'),
        compId: currCompUrn.replace('urn:li:organization:',''),
        inputClass: 'gci-curr-comp',
        removeClass: 'gci-remove-curr-comp',
        listDataAttr: 'currcompid',
        dataAttr: 'id',
        selectedElem: '#gci-selectedCurrComp',
        resultElem: '#gci-resultCurrComp',
        elemVal: '#gci-currComp',
        owner: 'company'
    }
    setSelectedSingleSearchFilter(selectedDataItem)
})
$('body').on('click','.gci-past-comp-click',function(){
    let pastCompUrn = $(this).data('pastcomp');

    selectedDataItem = {
        name: $(this).data('name'),
        trackId: $(this).data('id'),
        compId: pastCompUrn.replace('urn:li:organization:',''),
        inputClass: 'gci-past-comp',
        removeClass: 'gci-remove-past-comp',
        listDataAttr: 'pastcompid',
        dataAttr: 'id',
        selectedElem: '#gci-selectedPastComp',
        resultElem: '#gci-resultPastComp',
        elemVal: '#gci-pastComp',
        owner: 'company'
    }
    setSelectedSingleSearchFilter(selectedDataItem)
})
$('body').on('click','.gci-industy-click',function(){
    let industryUrn = $(this).data('industry');
    
    selectedDataItem = {
        name: $(this).data('name'),
        trackId: $(this).data('id'),
        industryId: industryUrn.replace('urn:li:industry:',''),
        inputClass: 'gci-industy',
        removeClass: 'gci-remove-industy',
        dataAttr: 'id',
        selectedElem: '#gci-selectedIndustry',
        resultElem: '#gci-resultIndustry',
        elemVal: '#gci-industy',
        owner: 'industry'
    }
    setSelectedSingleSearchFilter(selectedDataItem)
})
$('body').on('click','.gci-school-click',function(){
    let schoolIdUrn = $(this).data('schoolid');

    selectedDataItem = {
        name: $(this).data('name'),
        trackId: $(this).data('id'),
        schoolId: schoolIdUrn.replace('urn:li:fsd_company:',''),
        inputClass: 'gci-school',
        removeClass: 'gci-remove-school',
        dataAttr: 'id',
        selectedElem: '#gci-selectedSchool',
        resultElem: '#gci-resultSchool',
        elemVal: '#gci-school-search',
        owner: 'school'
    }
    setSelectedSingleSearchFilter(selectedDataItem)
})
$('body').on('click','.gci-language-click',function(){
    selectedDataItem = {
        name: $(this).data('name'),
        trackId: $(this).data('id'),
        inputClass: 'gci-language',
        removeClass: 'gci-remove-language',
        dataAttr: 'id',
        selectedElem: '#gci-selectedLanguage',
        resultElem: '#gci-resultLanguage',
        elemVal: '#gci-language',
        owner: 'language'
    }
    setSelectedSingleSearchFilter(selectedDataItem)
})

/**
 * Remove selected search result
 */
$('body').on('click','.gci-remove-conof',function(){
    let id = $(this).data('idf')
    $('#gci-selectedConnectOf').find(`li#${id}`).remove()
    return false;
})
$('body').on('click','.gci-remove-loc',function(){
    let id = $(this).data('id')
    $('#gci-selectedLocation').find(`li#${id}`).remove()
    return false;
})
$('body').on('click','.gci-remove-curr-comp',function(){
    let id = $(this).data('id')
    $('#gci-selectedCurrComp').find(`li#${id}`).remove()
    return false;
})
$('body').on('click','.gci-remove-past-comp',function(){
    let id = $(this).data('id')
    $('#gci-selectedPastComp').find(`li#${id}`).remove()
    return false;
})
$('body').on('click','.gci-remove-industy',function(){
    let id = $(this).data('id')
    $('#gci-selectedIndustry').find(`li#${id}`).remove()
    return false;
})
$('body').on('click','.gci-remove-school',function(){
    let id = $(this).data('id')
    $('#gci-selectedSchool').find(`li#${id}`).remove()
    return false;
})
$('body').on('click','.gci-remove-language',function(){
    let id = $(this).data('id')
    $('#gci-selectedLanguage').find(`li#${id}`).remove()
    return false;
})