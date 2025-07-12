var selectedCon = '';
// trigger filter
$('body').on('click', '.addc-searchCon', function(){
    singleSearchFilter('#addc-connectionOf','CONNECTIONS','connections_of',query,'#addc-resultConnectOf','addc-conn-click')
})
$('body').on('click', '.addc-searchLoc', function(){
    query = '(typeaheadFilterQuery:(geoSearchTypes:List(MARKET_AREA,COUNTRY_REGION,ADMIN_DIVISION_1,CITY)))';

    singleSearchFilter('#addc-location','GEO','region',query,'#addc-resultLocation','addc-loc-click')
})
$('body').on('click','.addc-searchCurrComp', function(){
    singleSearchFilter('#addc-currComp','COMPANY','curr_compnay',query,'#addc-resultCurrComp','addc-curr-comp-click')
})
$('body').on('click','.addc-searchPastComp', function(){
    singleSearchFilter('#addc-pastComp','COMPANY','past_compnay',query,'#addc-resultPastComp','addc-past-comp-click')
})
$('body').on('click','.addc-searchIndustry', function(){
    query = '(typeaheadFilterQuery:(standardizationEntityType:industry))';

    singleSearchFilter('#addc-industy','INDUSTRY','industy',query,'#addc-resultIndustry','addc-industy-click')
})
$('body').on('click','.addc-searchSchool', function(){
    singleSearchFilter('#addc-school-search','SCHOOL','school',query,'#addc-resultSchool','addc-school-click')
})
$('body').on('click','#addc-search-lang', function(){
    singleSearchFilter('#addc-language','LANGUAGE','language',query,'#addc-resultLanga','addc-language-click')
})

/**
 * Select specific search result
 */
$('body').on('click','.addc-conn-click',function(){
    selectedDataItem = {
        name: $(this).data('name'),
        trackId: $(this).data('id'),
        identifier: $(this).data('identifier'),
        connectionId: $(this).data('connectionid'),
        inputClass: 'addc-conn-of',
        removeClass: 'addc-remove-conof',
        dataAttr: 'idf',
        selectedElem: '#addc-selectedConnectOf',
        resultElem: '#addc-resultConnectOf',
        elemVal: '#addc-connectionOf',
        owner: 'connectionOf'
    }
    setSelectedSingleSearchFilter(selectedDataItem)
})
$('body').on('click','.addc-loc-click',function(){
    let regionUrn = $(this).data('regionid');

    selectedDataItem = {
        name: $(this).data('name'),
        trackId: $(this).data('id'),
        regionid: regionUrn.replace('urn:li:geo:',''),
        inputClass: 'addc-loctn',
        removeClass: 'addc-remove-loc',
        dataAttr: 'id',
        selectedElem: '#addc-selectedLocation',
        resultElem: '#addc-resultLocation',
        elemVal: '#addc-location',
        owner: 'location'
    }
    setSelectedSingleSearchFilter(selectedDataItem)
})
$('body').on('click','.addc-curr-comp-click',function(){
    let currCompUrn = $(this).data('currcomp');

    selectedDataItem = {
        name: $(this).data('name'),
        trackId: $(this).data('id'),
        compId: currCompUrn.replace('urn:li:organization:',''),
        inputClass: 'addc-curr-comp',
        removeClass: 'addc-remove-curr-comp',
        listDataAttr: 'currcompid',
        dataAttr: 'id',
        selectedElem: '#addc-selectedCurrComp',
        resultElem: '#addc-resultCurrComp',
        elemVal: '#addc-currComp',
        owner: 'company'
    }
    setSelectedSingleSearchFilter(selectedDataItem)
})
$('body').on('click','.addc-past-comp-click',function(){
    let pastCompUrn = $(this).data('pastcomp');

    selectedDataItem = {
        name: $(this).data('name'),
        trackId: $(this).data('id'),
        compId: pastCompUrn.replace('urn:li:organization:',''),
        inputClass: 'addc-past-comp',
        removeClass: 'addc-remove-past-comp',
        listDataAttr: 'pastcompid',
        dataAttr: 'id',
        selectedElem: '#addc-selectedPastComp',
        resultElem: '#addc-resultPastComp',
        elemVal: '#addc-pastComp',
        owner: 'company'
    }
    setSelectedSingleSearchFilter(selectedDataItem)
})
$('body').on('click','.addc-industy-click',function(){
    let industryUrn = $(this).data('industry');

    selectedDataItem = {
        name: $(this).data('name'),
        trackId: $(this).data('id'),
        industryId: industryUrn.replace('urn:li:industry:',''),
        inputClass: 'addc-industy',
        removeClass: 'addc-remove-industy',
        dataAttr: 'id',
        selectedElem: '#addc-selectedIndustry',
        resultElem: '#addc-resultIndustry',
        elemVal: '#addc-industy',
        owner: 'industry'
    }
    setSelectedSingleSearchFilter(selectedDataItem)
})
$('body').on('click','.addc-school-click',function(){
    let schoolIdUrn = $(this).data('schoolid');

    selectedDataItem = {
        name: $(this).data('name'),
        trackId: $(this).data('id'),
        schoolId: schoolIdUrn.replace('urn:li:fsd_company:',''),
        inputClass: 'addc-school',
        removeClass: 'addc-remove-school',
        dataAttr: 'id',
        selectedElem: '#addc-selectedSchool',
        resultElem: '#addc-resultSchool',
        elemVal: '#addc-school-search',
        owner: 'school'
    }
    setSelectedSingleSearchFilter(selectedDataItem)
})
$('body').on('click','.addc-language-click',function() {
    selectedDataItem = {
        name: $(this).data('name'),
        trackId: $(this).data('id'),
        inputClass: 'addc-language',
        removeClass: 'addc-remove-language',
        dataAttr: 'id',
        selectedElem: '#addc-selectedLanguage',
        resultElem: '#addc-resultLanga',
        elemVal: '#addc-language',
        owner: 'language'
    }
    setSelectedSingleSearchFilter(selectedDataItem)
})

$('body').on('click','.addc-remove-conof',function(){
    let id = $(this).data('idf')
    $('#addc-selectedConnectOf').find(`li#${id}`).remove()
    return false;
})
$('body').on('click','.addc-remove-loc',function(){
    let id = $(this).data('id')
    $('#addc-selectedLocation').find(`li#${id}`).remove()
    return false;
})
$('body').on('click','.addc-remove-curr-comp',function(){
    let id = $(this).data('id')
    $('#addc-selectedCurrComp').find(`li#${id}`).remove()
    return false;
})
$('body').on('click','.addc-remove-past-comp',function(){
    let id = $(this).data('id')
    $('#addc-selectedPastComp').find(`li#${id}`).remove()
    return false;
})
$('body').on('click','.addc-remove-industy',function(){
    let id = $(this).data('id')
    $('#addc-selectedIndustry').find(`li#${id}`).remove()
    return false;
})
$('body').on('click','.addc-remove-school',function(){
    let id = $(this).data('id')
    $('#addc-selectedSchool').find(`li#${id}`).remove()
    return false;
})
$('body').on('click','.addc-remove-language',function(){
    let id = $(this).data('id')
    $('#addc-selectedLanguage').find(`li#${id}`).remove()
    return false;
})