
/**
 * Trigger single search filter
 */
$('body').on('click', '.vcp-searchCon', function(){
    singleSearchFilter('#vcp-connectionOf','CONNECTIONS','connections_of',query,'#vcp-resultConnectOf','vcp-conn-click')
})
$('body').on('click', '.vcp-searchLoc', function(){
    query = '(typeaheadFilterQuery:(geoSearchTypes:List(MARKET_AREA,COUNTRY_REGION,ADMIN_DIVISION_1,CITY)))';

    singleSearchFilter('#vcp-location','GEO','region',query,'#vcp-resultLocation','vcp-loc-click')
})
$('body').on('click','.vcp-searchCurrComp', function(){
    singleSearchFilter('#vcp-currComp','COMPANY','curr_compnay',query,'#vcp-resultCurrComp','vcp-curr-comp-click')
})
$('body').on('click','.vcp-searchPastComp', function(){
    singleSearchFilter('#vcp-pastComp','COMPANY','past_compnay',query,'#vcp-resultPastComp','vcp-past-comp-click')
})
$('body').on('click','.vcp-searchIndustry', function(){
    query = '(typeaheadFilterQuery:(standardizationEntityType:industry))';

    singleSearchFilter('#vcp-industy','INDUSTRY','industy',query,'#vcp-resultIndustry','vcp-industy-click')
})
$('body').on('click','.vcp-searchSchool', function(){
    singleSearchFilter('#vcp-school-search','SCHOOL','school',query,'#vcp-resultSchool','vcp-school-click')
})
$('body').on('click','#vcp-search-lang', function(){
    singleSearchFilter('#vcp-language','LANGUAGE','language',query,'#vcp-resultLanguage','vcp-language-click')
})

/**
 * Select specific search result
 */
$('body').on('click','.vcp-conn-click',function(){
    selectedDataItem = {
        name: $(this).data('name'),
        trackId: $(this).data('id'),
        identifier: $(this).data('identifier'),
        connectionId: $(this).data('connectionid'),
        inputClass: 'vcp-conn-of',
        removeClass: 'vcp-remove-conof',
        dataAttr: 'idf',
        selectedElem: '#vcp-selectedConnectOf',
        resultElem: '#vcp-resultConnectOf',
        elemVal: '#vcp-connectionOf',
        owner: 'connectionOf'
    }
    setSelectedSingleSearchFilter(selectedDataItem)
})
$('body').on('click','.vcp-loc-click',function(){
    let regionUrn = $(this).data('regionid');

    selectedDataItem = {
        name: $(this).data('name'),
        trackId: $(this).data('id'),
        regionid: regionUrn.replace('urn:li:geo:',''),
        inputClass: 'vcp-loctn',
        removeClass: 'vcp-remove-loc',
        dataAttr: 'id',
        selectedElem: '#vcp-selectedLocation',
        resultElem: '#vcp-resultLocation',
        elemVal: '#vcp-location',
        owner: 'location'
    }
    setSelectedSingleSearchFilter(selectedDataItem)
})
$('body').on('click','.vcp-curr-comp-click',function(){
    let currCompUrn = $(this).data('currcomp');

    selectedDataItem = {
        name: $(this).data('name'),
        trackId: $(this).data('id'),
        compId: currCompUrn.replace('urn:li:organization:',''),
        inputClass: 'vcp-curr-comp',
        removeClass: 'vcp-remove-curr-comp',
        listDataAttr: 'currcompid',
        dataAttr: 'id',
        selectedElem: '#vcp-selectedCurrComp',
        resultElem: '#vcp-resultCurrComp',
        elemVal: '#vcp-currComp',
        owner: 'company'
    }
    setSelectedSingleSearchFilter(selectedDataItem)

})
$('body').on('click','.vcp-past-comp-click',function(){
    let pastCompUrn = $(this).data('pastcomp');

    selectedDataItem = {
        name: $(this).data('name'),
        trackId: $(this).data('id'),
        compId: pastCompUrn.replace('urn:li:organization:',''),
        inputClass: 'vcp-past-comp',
        removeClass: 'vcp-remove-past-comp',
        listDataAttr: 'pastcompid',
        dataAttr: 'id',
        selectedElem: '#vcp-selectedPastComp',
        resultElem: '#vcp-resultPastComp',
        elemVal: '#vcp-pastComp',
        owner: 'company'
    }
    setSelectedSingleSearchFilter(selectedDataItem)
})
$('body').on('click','.vcp-industy-click',function(){
    let industryUrn = $(this).data('industry');
    
    selectedDataItem = {
        name: $(this).data('name'),
        trackId: $(this).data('id'),
        industryId: industryUrn.replace('urn:li:industry:',''),
        inputClass: 'vcp-industy',
        removeClass: 'vcp-remove-industy',
        dataAttr: 'id',
        selectedElem: '#vcp-selectedIndustry',
        resultElem: '#vcp-resultIndustry',
        elemVal: '#vcp-industy',
        owner: 'industry'
    }
    setSelectedSingleSearchFilter(selectedDataItem)
})
$('body').on('click','.vcp-school-click',function(){
    let schoolIdUrn = $(this).data('schoolid');

    selectedDataItem = {
        name: $(this).data('name'),
        trackId: $(this).data('id'),
        schoolId: schoolIdUrn.replace('urn:li:fsd_company:',''),
        inputClass: 'vcp-school',
        removeClass: 'vcp-remove-school',
        dataAttr: 'id',
        selectedElem: '#vcp-selectedSchool',
        resultElem: '#vcp-resultSchool',
        elemVal: '#vcp-school-search',
        owner: 'school'
    }
    setSelectedSingleSearchFilter(selectedDataItem)
})
$('body').on('click','.vcp-language-click',function(){
    selectedDataItem = {
        name: $(this).data('name'),
        trackId: $(this).data('id'),
        inputClass: 'vcp-language',
        removeClass: 'vcp-remove-language',
        dataAttr: 'id',
        selectedElem: '#vcp-selectedLanguage',
        resultElem: '#vcp-resultLanguage',
        elemVal: '#vcp-language',
        owner: 'language'
    }
    setSelectedSingleSearchFilter(selectedDataItem)
})

/**
 * Remove selected search result
 */
$('body').on('click','.vcp-remove-conof',function(){
    let id = $(this).data('idf')
    $('#vcp-selectedConnectOf').find(`li#${id}`).remove()
    return false;
})
$('body').on('click','.vcp-remove-loc',function(){
    let id = $(this).data('id')
    $('#vcp-selectedLocation').find(`li#${id}`).remove()
    return false;
})
$('body').on('click','.vcp-remove-curr-comp',function(){
    let id = $(this).data('id')
    $('#vcp-selectedCurrComp').find(`li#${id}`).remove()
    return false;
})
$('body').on('click','.vcp-remove-past-comp',function(){
    let id = $(this).data('id')
    $('#vcp-selectedPastComp').find(`li#${id}`).remove()
    return false;
})
$('body').on('click','.vcp-remove-industy',function(){
    let id = $(this).data('id')
    $('#vcp-selectedIndustry').find(`li#${id}`).remove()
    return false;
})
$('body').on('click','.vcp-remove-school',function(){
    let id = $(this).data('id')
    $('#vcp-selectedSchool').find(`li#${id}`).remove()
    return false;
})
$('body').on('click','.vcp-remove-language',function(){
    let id = $(this).data('id')
    $('#vcp-selectedLanguage').find(`li#${id}`).remove()
    return false;
})