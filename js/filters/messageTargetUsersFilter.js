
/**
 * Trigger single search filter
 */

$('body').on('click', '.mtu-searchExCon', function(){
    singleSearchFilter('#mtu-exConnection','CONNECTIONS','ex_connections',query,'#mtu-resultExConnect','mtu-exconn-click')
})
$('body').on('click', '.mtu-searchCon', function(){
    singleSearchFilter('#mtu-connectionOf','CONNECTIONS','connections_of',query,'#mtu-resultConnectOf','mtu-conn-click')
})
$('body').on('click', '.mtu-searchLoc', function(){
    query = '(typeaheadFilterQuery:(geoSearchTypes:List(MARKET_AREA,COUNTRY_REGION,ADMIN_DIVISION_1,CITY)))';

    singleSearchFilter('#mtu-location','GEO','region',query,'#mtu-resultLocation','mtu-loc-click')
})
$('body').on('click','.mtu-searchCurrComp', function(){
    singleSearchFilter('#mtu-currComp','COMPANY','curr_compnay',query,'#mtu-resultCurrComp','mtu-curr-comp-click')
})
$('body').on('click','.mtu-searchPastComp', function(){
    singleSearchFilter('#mtu-pastComp','COMPANY','past_compnay',query,'#mtu-resultPastComp','mtu-past-comp-click')
})
$('body').on('click','.mtu-searchIndustry', function(){
    query = '(typeaheadFilterQuery:(standardizationEntityType:industry))';

    singleSearchFilter('#mtu-industy','INDUSTRY','industy',query,'#mtu-resultIndustry','mtu-industy-click')
})
$('body').on('click','.mtu-searchSchool', function(){
    singleSearchFilter('#mtu-school-search','SCHOOL','school',query,'#mtu-resultSchool','mtu-school-click')
})
$('body').on('click','#mtu-search-lang', function(){
    singleSearchFilter('#mtu-language','LANGUAGE','language',query,'#mtu-resultLanguage','mtu-language-click')
})

/**
 * Select specific search result
 */

$('body').on('click','.mtu-exconn-click',function(){
    selectedDataItem = {
        name: $(this).data('name'),
        trackId: $(this).data('id'),
        identifier: $(this).data('identifier'),
        connectionId: $(this).data('connectionid'),
        inputClass: 'mtu-exconn',
        removeClass: 'mtu-remove-exconn',
        dataAttr: 'mtuidf',
        selectedElem: '#mtu-selectedExConnect',
        resultElem: '#mtu-resultExConnect',
        elemVal: '#mtu-exConnection',
        owner: 'connectionOf'
    }
    setSelectedSingleSearchFilter(selectedDataItem)
})
$('body').on('click','.mtu-conn-click',function(){
    selectedDataItem = {
        name: $(this).data('name'),
        trackId: $(this).data('id'),
        identifier: $(this).data('identifier'),
        connectionId: $(this).data('connectionid'),
        inputClass: 'mtu-conn-of',
        removeClass: 'mtu-remove-conof',
        dataAttr: 'idf',
        selectedElem: '#mtu-selectedConnectOf',
        resultElem: '#mtu-resultConnectOf',
        elemVal: '#mtu-connectionOf',
        owner: 'connectionOf'
    }
    setSelectedSingleSearchFilter(selectedDataItem)
})
$('body').on('click','.mtu-loc-click',function(){
    let regionUrn = $(this).data('regionid');

    selectedDataItem = {
        name: $(this).data('name'),
        trackId: $(this).data('id'),
        regionid: regionUrn.replace('urn:li:geo:',''),
        inputClass: 'mtu-loctn',
        removeClass: 'mtu-remove-loc',
        dataAttr: 'id',
        selectedElem: '#mtu-selectedLocation',
        resultElem: '#mtu-resultLocation',
        elemVal: '#mtu-location',
        owner: 'location'
    }
    setSelectedSingleSearchFilter(selectedDataItem)
})
$('body').on('click','.mtu-curr-comp-click',function(){
    let currCompUrn = $(this).data('currcomp');

    selectedDataItem = {
        name: $(this).data('name'),
        trackId: $(this).data('id'),
        compId: currCompUrn.replace('urn:li:organization:',''),
        inputClass: 'mtu-curr-comp',
        removeClass: 'mtu-remove-curr-comp',
        listDataAttr: 'currcompid',
        dataAttr: 'id',
        selectedElem: '#mtu-selectedCurrComp',
        resultElem: '#mtu-resultCurrComp',
        elemVal: '#mtu-currComp',
        owner: 'company'
    }
    setSelectedSingleSearchFilter(selectedDataItem)
})
$('body').on('click','.mtu-past-comp-click',function(){
    let pastCompUrn = $(this).data('pastcomp');

    selectedDataItem = {
        name: $(this).data('name'),
        trackId: $(this).data('id'),
        compId: pastCompUrn.replace('urn:li:organization:',''),
        inputClass: 'mtu-past-comp',
        removeClass: 'mtu-remove-past-comp',
        listDataAttr: 'pastcompid',
        dataAttr: 'id',
        selectedElem: '#mtu-selectedPastComp',
        resultElem: '#mtu-resultPastComp',
        elemVal: '#mtu-pastComp',
        owner: 'company'
    }
    setSelectedSingleSearchFilter(selectedDataItem)
})
$('body').on('click','.mtu-industy-click',function(){
    let industryUrn = $(this).data('industry');
    
    selectedDataItem = {
        name: $(this).data('name'),
        trackId: $(this).data('id'),
        industryId: industryUrn.replace('urn:li:industry:',''),
        inputClass: 'mtu-industy',
        removeClass: 'mtu-remove-industy',
        dataAttr: 'id',
        selectedElem: '#mtu-selectedIndustry',
        resultElem: '#mtu-resultIndustry',
        elemVal: '#mtu-industy',
        owner: 'industry'
    }
    setSelectedSingleSearchFilter(selectedDataItem)
})
$('body').on('click','.mtu-school-click',function(){
    let schoolIdUrn = $(this).data('schoolid');

    selectedDataItem = {
        name: $(this).data('name'),
        trackId: $(this).data('id'),
        schoolId: schoolIdUrn.replace('urn:li:fsd_company:',''),
        inputClass: 'mtu-school',
        removeClass: 'mtu-remove-school',
        dataAttr: 'id',
        selectedElem: '#mtu-selectedSchool',
        resultElem: '#mtu-resultSchool',
        elemVal: '#mtu-school-search',
        owner: 'school'
    }
    setSelectedSingleSearchFilter(selectedDataItem)
})
$('body').on('click','.mtu-language-click',function(){
    selectedDataItem = {
        name: $(this).data('name'),
        trackId: $(this).data('id'),
        inputClass: 'mtu-language',
        removeClass: 'mtu-remove-language',
        dataAttr: 'id',
        selectedElem: '#mtu-selectedLanguage',
        resultElem: '#mtu-resultLanguage',
        elemVal: '#mtu-language',
        owner: 'language'
    }
    setSelectedSingleSearchFilter(selectedDataItem)
})

/**
 * Remove selected search result
 */

$('body').on('click','.mtu-remove-exconn',function(){
    let id = $(this).data('mtuidf')
    $('#mtu-selectedExConnect').find(`li#${id}`).remove()
    return false;
})
$('body').on('click','.mtu-remove-conof',function(){
    let id = $(this).data('idf')
    $('#mtu-selectedConnectOf').find(`li#${id}`).remove()
    return false;
})
$('body').on('click','.mtu-remove-loc',function(){
    let id = $(this).data('id')
    $('#mtu-selectedLocation').find(`li#${id}`).remove()
    return false;
})
$('body').on('click','.mtu-remove-curr-comp',function(){
    let id = $(this).data('id')
    $('#mtu-selectedCurrComp').find(`li#${id}`).remove()
    return false;
})
$('body').on('click','.mtu-remove-past-comp',function(){
    let id = $(this).data('id')
    $('#mtu-selectedPastComp').find(`li#${id}`).remove()
    return false;
})
$('body').on('click','.mtu-remove-industy',function(){
    let id = $(this).data('id')
    $('#mtu-selectedIndustry').find(`li#${id}`).remove()
    return false;
})
$('body').on('click','.mtu-remove-school',function(){
    let id = $(this).data('id')
    $('#mtu-selectedSchool').find(`li#${id}`).remove()
    return false;
})
$('body').on('click','.mtu-remove-language',function(){
    let id = $(this).data('id')
    $('#mtu-selectedLanguage').find(`li#${id}`).remove()
    return false;
})