var edcSelectedCon = '';

/**
 * Trigger single search filter
 */

$('body').on('click', '.edc-searchCon', function(){
    singleSearchFilter('#edc-connectionOf','CONNECTIONS','connections_of',query,'#edc-resultConnectOf','edc-conn-click')
})
$('body').on('click', '.edc-searchLoc', function(){
    query = '(typeaheadFilterQuery:(geoSearchTypes:List(MARKET_AREA,COUNTRY_REGION,ADMIN_DIVISION_1,CITY)))';

    singleSearchFilter('#edc-location','GEO','region',query,'#edc-resultLocation','edc-loc-click')
})
$('body').on('click','.edc-searchCurrComp', function(){
    singleSearchFilter('#edc-currComp','COMPANY','curr_compnay',query,'#edc-resultCurrComp','edc-curr-comp-click')
})
$('body').on('click','.edc-searchPastComp', function(){
    singleSearchFilter('#edc-pastComp','COMPANY','past_compnay',query,'#edc-resultPastComp','edc-past-comp-click')
})
$('body').on('click','.edc-searchIndustry', function(){
    query = '(typeaheadFilterQuery:(standardizationEntityType:industry))';

    singleSearchFilter('#edc-industy','INDUSTRY','industy',query,'#edc-resultIndustry','edc-industy-click')
})
$('body').on('click','.edc-searchSchool', function(){
    singleSearchFilter('#edc-school-search','SCHOOL','school',query,'#edc-resultSchool','edc-school-click')
})
$('body').on('click','#edc-search-lang', function(){
    singleSearchFilter('#edc-language','LANGUAGE','language',query,'#edc-resultLanguage','edc-language-click')
})

/**
 * Selected specific search result
 */

$('body').on('click','.edc-conn-click',function(){
    selectedDataItem = {
        name: $(this).data('name'),
        trackId: $(this).data('id'),
        identifier: $(this).data('identifier'),
        connectionId: $(this).data('connectionid'),
        inputClass: 'edc-conn-of',
        removeClass: 'edc-remove-conof',
        dataAttr: 'idf',
        selectedElem: '#edc-selectedConnectOf',
        resultElem: '#edc-resultConnectOf',
        elemVal: '#edc-connectionOf',
        owner: 'connectionOf'
    }
    setSelectedSingleSearchFilter(selectedDataItem)
})
$('body').on('click','.edc-loc-click',function(){
    let regionUrn = $(this).data('regionid');

    selectedDataItem = {
        name: $(this).data('name'),
        trackId: $(this).data('id'),
        regionid: regionUrn.replace('urn:li:geo:',''),
        inputClass: 'edc-loctn',
        removeClass: 'edc-remove-loc',
        dataAttr: 'id',
        selectedElem: '#edc-selectedLocation',
        resultElem: '#edc-resultLocation',
        elemVal: '#edc-location',
        owner: 'location'
    }
    setSelectedSingleSearchFilter(selectedDataItem)
})
$('body').on('click','.edc-curr-comp-click',function(){
    let currCompUrn = $(this).data('currcomp');

    selectedDataItem = {
        name: $(this).data('name'),
        trackId: $(this).data('id'),
        currCompId: currCompUrn.replace('urn:li:organization:',''),
        inputClass: 'edc-curr-comp',
        removeClass: 'edc-remove-curr-comp',
        dataAttr: 'id',
        selectedElem: '#edc-selectedCurrComp',
        resultElem: '#edc-resultCurrComp',
        elemVal: '#edc-currComp',
        owner: 'company'
    }
    setSelectedSingleSearchFilter(selectedDataItem)
})
$('body').on('click','.edc-past-comp-click',function(){
    let pastCompUrn = $(this).data('pastcomp');

    selectedDataItem = {
        name: $(this).data('name'),
        trackId: $(this).data('id'),
        currCompId: pastCompUrn.replace('urn:li:organization:',''),
        inputClass: 'edc-past-comp',
        removeClass: 'edc-remove-past-comp',
        dataAttr: 'id',
        selectedElem: '#edc-selectedPastComp',
        resultElem: '#edc-resultPastComp',
        elemVal: '#edc-pastComp',
        owner: 'company'
    }
    setSelectedSingleSearchFilter(selectedDataItem)
})
$('body').on('click','.edc-industy-click',function(){
    let industryUrn = $(this).data('industry');

    selectedDataItem = {
        name: $(this).data('name'),
        trackId: $(this).data('id'),
        industryId: industryUrn.replace('urn:li:industry:',''),
        inputClass: 'edc-industy',
        removeClass: 'edc-remove-industy',
        dataAttr: 'id',
        selectedElem: '#edc-selectedIndustry',
        resultElem: '#edc-resultIndustry',
        elemVal: '#edc-industy',
        owner: 'industry'
    }
    setSelectedSingleSearchFilter(selectedDataItem)
})
$('body').on('click','.edc-school-click',function(){
    let schoolIdUrn = $(this).data('schoolid');

    selectedDataItem = {
        name: $(this).data('name'),
        trackId: $(this).data('id'),
        schoolId: schoolIdUrn.replace('urn:li:fsd_company:',''),
        inputClass: 'edc-school',
        removeClass: 'edc-remove-school',
        dataAttr: 'id',
        selectedElem: '#edc-selectedSchool',
        resultElem: '#edc-resultSchool',
        elemVal: '#edc-school-search',
        owner: 'school'
    }
    setSelectedSingleSearchFilter(selectedDataItem)
})
$('body').on('click','.edc-language-click',function(){
    selectedDataItem = {
        name: $(this).data('name'),
        trackId: $(this).data('id'),
        inputClass: 'edc-language',
        removeClass: 'edc-remove-language',
        dataAttr: 'id',
        selectedElem: '#edc-selectedLanguage',
        resultElem: '#edc-resultLanguage',
        elemVal: '#edc-language',
        owner: 'language'
    }
    setSelectedSingleSearchFilter(selectedDataItem)
})

/**
 * Remove selected search result
 */

$('body').on('click','.edc-remove-conof',function(){
    let id = $(this).data('idf')
    $('#edc-selectedConnectOf').find(`li#${id}`).remove()
    return false;
})
$('body').on('click','.edc-remove-loc',function(){
    let id = $(this).data('id')
    $('#edc-selectedLocation').find(`li#${id}`).remove()
    return false;
})
$('body').on('click','.edc-remove-curr-comp',function(){
    let id = $(this).data('id')
    $('#edc-selectedCurrComp').find(`li#${id}`).remove()
    return false;
})
$('body').on('click','.edc-remove-past-comp',function(){
    let id = $(this).data('id')
    $('#edc-selectedPastComp').find(`li#${id}`).remove()
    return false;
})
$('body').on('click','.edc-remove-industy',function(){
    let id = $(this).data('id')
    $('#edc-selectedIndustry').find(`li#${id}`).remove()
    return false;
})
$('body').on('click','.edc-remove-school',function(){
    let id = $(this).data('id')
    $('#edc-selectedSchool').find(`li#${id}`).remove()
    return false;
})
$('body').on('click','.edc-remove-language',function(){
    let id = $(this).data('id')
    $('#edc-selectedLanguage').find(`li#${id}`).remove()
    return false;
})