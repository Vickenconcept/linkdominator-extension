
/**
 * Trigger single search filter
 */
$('body').on('click', '.afs-searchCon', function(){
    singleSearchFilter('#afs-connectionOf','CONNECTIONS','connections_of',query,'#afs-resultConnectOf','afs-conn-click')
})
$('body').on('click', '.afs-searchLoc', function(){
    query = '(typeaheadFilterQuery:(geoSearchTypes:List(MARKET_AREA,COUNTRY_REGION,ADMIN_DIVISION_1,CITY)))';

    singleSearchFilter('#afs-location','GEO','region',query,'#afs-resultLocation','afs-loc-click')
})
$('body').on('click','.afs-searchCurrComp', function(){
    singleSearchFilter('#afs-currComp','COMPANY','curr_compnay',query,'#afs-resultCurrComp','afs-curr-comp-click')
})
$('body').on('click','.afs-searchPastComp', function(){
    singleSearchFilter('#afs-pastComp','COMPANY','past_compnay',query,'#afs-resultPastComp','afs-past-comp-click')
})
$('body').on('click','.afs-searchIndustry', function(){
    query = '(typeaheadFilterQuery:(standardizationEntityType:industry))';

    singleSearchFilter('#afs-industy','INDUSTRY','industy',query,'#afs-resultIndustry','afs-industy-click')
})
$('body').on('click','.afs-searchSchool', function(){
    singleSearchFilter('#afs-school-search','SCHOOL','school',query,'#afs-resultSchool','afs-school-click')
})
$('body').on('click','#afs-search-lang', function(){
    singleSearchFilter('#afs-language','LANGUAGE','language',query,'#afs-resultLanguage','afs-language-click')
})

/**
 * Select specific search result
 */

$('body').on('click','.afs-conn-click',function(){
    selectedDataItem = {
        name: $(this).data('name'),
        trackId: $(this).data('id'),
        identifier: $(this).data('identifier'),
        connectionId: $(this).data('connectionid'),
        inputClass: 'afs-conn-of',
        removeClass: 'afs-remove-conof',
        dataAttr: 'idf',
        selectedElem: '#afs-selectedConnectOf',
        resultElem: '#afs-resultConnectOf',
        elemVal: '#afs-connectionOf',
        owner: 'connectionOf'
    }
    setSelectedSingleSearchFilter(selectedDataItem)
})
$('body').on('click','.afs-loc-click',function(){
    let regionUrn = $(this).data('regionid');

    selectedDataItem = {
        name: $(this).data('name'),
        trackId: $(this).data('id'),
        regionid: regionUrn.replace('urn:li:geo:',''),
        inputClass: 'afs-loctn',
        removeClass: 'afs-remove-loc',
        dataAttr: 'id',
        selectedElem: '#afs-selectedLocation',
        resultElem: '#afs-resultLocation',
        elemVal: '#afs-location',
        owner: 'location'
    }
    setSelectedSingleSearchFilter(selectedDataItem)
})
$('body').on('click','.afs-curr-comp-click',function(){
    let currCompUrn = $(this).data('currcomp');

    selectedDataItem = {
        name: $(this).data('name'),
        trackId: $(this).data('id'),
        compId: currCompUrn.replace('urn:li:organization:',''),
        inputClass: 'afs-curr-comp',
        removeClass: 'afs-remove-curr-comp',
        listDataAttr: 'currcompid',
        dataAttr: 'id',
        selectedElem: '#afs-selectedCurrComp',
        resultElem: '#afs-resultCurrComp',
        elemVal: '#afs-currComp',
        owner: 'company'
    }
    setSelectedSingleSearchFilter(selectedDataItem)
})
$('body').on('click','.afs-past-comp-click',function(){
    let pastCompUrn = $(this).data('pastcomp');

    selectedDataItem = {
        name: $(this).data('name'),
        trackId: $(this).data('id'),
        compId: pastCompUrn.replace('urn:li:organization:',''),
        inputClass: 'afs-past-comp',
        removeClass: 'afs-remove-past-comp',
        listDataAttr: 'pastcompid',
        dataAttr: 'id',
        selectedElem: '#afs-selectedPastComp',
        resultElem: '#afs-resultPastComp',
        elemVal: '#afs-pastComp',
        owner: 'company'
    }
    setSelectedSingleSearchFilter(selectedDataItem)
})
$('body').on('click','.afs-industy-click',function(){
    let industryUrn = $(this).data('industry');
    
    selectedDataItem = {
        name: $(this).data('name'),
        trackId: $(this).data('id'),
        industryId: industryUrn.replace('urn:li:industry:',''),
        inputClass: 'afs-industy',
        removeClass: 'afs-remove-industy',
        dataAttr: 'id',
        selectedElem: '#afs-selectedIndustry',
        resultElem: '#afs-resultIndustry',
        elemVal: '#afs-industy',
        owner: 'industry'
    }
    setSelectedSingleSearchFilter(selectedDataItem)
})
$('body').on('click','.afs-school-click',function(){
    let schoolIdUrn = $(this).data('schoolid');

    selectedDataItem = {
        name: $(this).data('name'),
        trackId: $(this).data('id'),
        schoolId: schoolIdUrn.replace('urn:li:fsd_company:',''),
        inputClass: 'afs-school',
        removeClass: 'afs-remove-school',
        dataAttr: 'id',
        selectedElem: '#afs-selectedSchool',
        resultElem: '#afs-resultSchool',
        elemVal: '#afs-school-search',
        owner: 'school'
    }
    setSelectedSingleSearchFilter(selectedDataItem)
})
$('body').on('click','.afs-language-click',function(){
    selectedDataItem = {
        name: $(this).data('name'),
        trackId: $(this).data('id'),
        inputClass: 'afs-language',
        removeClass: 'afs-remove-language',
        dataAttr: 'id',
        selectedElem: '#afs-selectedLanguage',
        resultElem: '#afs-resultLanguage',
        elemVal: '#afs-language',
        owner: 'language'
    }
    setSelectedSingleSearchFilter(selectedDataItem)
})

/**
 * Remove selected search result
 */
$('body').on('click','.afs-remove-conof',function(){
    let id = $(this).data('idf')
    $('#afs-selectedConnectOf').find(`li#${id}`).remove()
    return false;
})
$('body').on('click','.afs-remove-loc',function(){
    let id = $(this).data('id')
    $('#afs-selectedLocation').find(`li#${id}`).remove()
    return false;
})
$('body').on('click','.afs-remove-curr-comp',function(){
    let id = $(this).data('id')
    $('#afs-selectedCurrComp').find(`li#${id}`).remove()
    return false;
})
$('body').on('click','.afs-remove-past-comp',function(){
    let id = $(this).data('id')
    $('#afs-selectedPastComp').find(`li#${id}`).remove()
    return false;
})
$('body').on('click','.afs-remove-industy',function(){
    let id = $(this).data('id')
    $('#afs-selectedIndustry').find(`li#${id}`).remove()
    return false;
})
$('body').on('click','.afs-remove-school',function(){
    let id = $(this).data('id')
    $('#afs-selectedSchool').find(`li#${id}`).remove()
    return false;
})
$('body').on('click','.afs-remove-language',function(){
    let id = $(this).data('id')
    $('#afs-selectedLanguage').find(`li#${id}`).remove()
    return false;
})