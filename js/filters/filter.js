
/**
 * Trigger single search filter
 */

$('body').on('click', '.searchCon', function() {
    singleSearchFilter('#connectionOf','CONNECTIONS','connections_of',query,'#resultConnectOf','conn-click')
})
$('body').on('click', '.searchLoc', function() {
    query = '(typeaheadFilterQuery:(geoSearchTypes:List(MARKET_AREA,COUNTRY_REGION,ADMIN_DIVISION_1,CITY)))';

    singleSearchFilter('#location','GEO','region',query,'#resultLocation','loc-click')
})
$('body').on('click','.searchCurrComp', function() {    
    singleSearchFilter('#currComp','COMPANY','curr_compnay',query,'#resultCurrComp','curr-comp-click')
})
$('body').on('click','.searchPastComp', function() {
    singleSearchFilter('#pastComp','COMPANY','past_compnay',query,'#resultPastComp','past-comp-click')
})
$('body').on('click','.searchIndustry', function() {
    query = '(typeaheadFilterQuery:(standardizationEntityType:industry))';

    singleSearchFilter('#industy','INDUSTRY','industy',query,'#resultIndustry','industy-click')
})
$('body').on('click','.searchSchool', function() {
    singleSearchFilter('#school-search','SCHOOL','school',query,'#resultSchool','school-click')
})
$('body').on('click','#search-lang', function() {
    singleSearchFilter('#language','LANGUAGE','language',query,'#resultLanguage','language-click')
})

/**
 * Select specific search result
 */

$('body').on('click','.language-click',function(){
    selectedDataItem = {
        name: $(this).data('name'),
        trackId: $(this).data('id'),
        inputClass: 'language',
        removeClass: 'remove-language',
        dataAttr: 'id',
        selectedElem: '#selectedLanguage',
        resultElem: '#resultLanguage',
        elemVal: '#language',
        owner: 'language'
    }
    setSelectedSingleSearchFilter(selectedDataItem)
})
$('body').on('click','.school-click',function(){
    let schoolIdUrn = $(this).data('schoolid');

    selectedDataItem = {
        name: $(this).data('name'),
        trackId: $(this).data('id'),
        schoolId: schoolIdUrn.replace('urn:li:fsd_company:',''),
        inputClass: 'school',
        removeClass: 'remove-school',
        dataAttr: 'id',
        selectedElem: '#selectedSchool',
        resultElem: '#resultSchool',
        elemVal: '#school-search',
        owner: 'school'
    }
    setSelectedSingleSearchFilter(selectedDataItem)
})
$('body').on('click','.industy-click',function(){
    let industryUrn = $(this).data('industry');
    
    selectedDataItem = {
        name: $(this).data('name'),
        trackId: $(this).data('id'),
        industryId: industryUrn.replace('urn:li:industry:',''),
        inputClass: 'industy',
        removeClass: 'remove-industy',
        dataAttr: 'id',
        selectedElem: '#selectedIndustry',
        resultElem: '#resultIndustry',
        elemVal: '#industy',
        owner: 'industry'
    }
    setSelectedSingleSearchFilter(selectedDataItem)
})
$('body').on('click','.past-comp-click',function(){
    let pastCompUrn = $(this).data('pastcomp');

    selectedDataItem = {
        name: $(this).data('name'),
        trackId: $(this).data('id'),
        compId: pastCompUrn.replace('urn:li:organization:',''),
        inputClass: 'past-comp',
        removeClass: 'remove-past-comp',
        listDataAttr: 'pastcompid',
        dataAttr: 'id',
        selectedElem: '#selectedPastComp',
        resultElem: '#resultPastComp',
        elemVal: '#pastComp',
        owner: 'company'
    }
    setSelectedSingleSearchFilter(selectedDataItem)
})
$('body').on('click','.curr-comp-click',function(){
    let currCompUrn = $(this).data('currcomp');

    selectedDataItem = {
        name: $(this).data('name'),
        trackId: $(this).data('id'),
        compId: currCompUrn.replace('urn:li:organization:',''),
        inputClass: 'curr-comp',
        removeClass: 'remove-curr-comp',
        listDataAttr: 'currcompid',
        dataAttr: 'id',
        selectedElem: '#selectedCurrComp',
        resultElem: '#resultCurrComp',
        elemVal: '#currComp',
        owner: 'company'
    }
    setSelectedSingleSearchFilter(selectedDataItem)
})
$('body').on('click','.loc-click',function(){
    let regionUrn = $(this).data('regionid');

    selectedDataItem = {
        name: $(this).data('name'),
        trackId: $(this).data('id'),
        regionid: regionUrn.replace('urn:li:geo:',''),
        inputClass: 'loctn',
        removeClass: 'remove-loc',
        dataAttr: 'id',
        selectedElem: '#selectedLocation',
        resultElem: '#resultLocation',
        elemVal: '#location',
        owner: 'location'
    }
    setSelectedSingleSearchFilter(selectedDataItem)
})
$('body').on('click','.conn-click',function(){
    selectedDataItem = {
        name: $(this).data('name'),
        trackId: $(this).data('id'),
        identifier: $(this).data('identifier'),
        connectionId: $(this).data('connectionid'),
        inputClass: 'conn-of',
        removeClass: 'remove-conof',
        dataAttr: 'idf',
        selectedElem: '#selectedConnectOf',
        resultElem: '#resultConnectOf',
        elemVal: '#connectionOf',
        owner: 'connectionOf'
    }
    setSelectedSingleSearchFilter(selectedDataItem)
})

/**
 * Remove selected search result
 */
$('body').on('click','.remove-conof',function(){
    let id = $(this).data('idf')
    $('#selectedConnectOf').find(`li#${id}`).remove()
    return false;
})
$('body').on('click','.remove-loc',function(){
    let id = $(this).data('id')
    $('#selectedLocation').find(`li#${id}`).remove()
    return false;
})
$('body').on('click','.remove-curr-comp',function(){
    let id = $(this).data('id')
    $('#selectedCurrComp').find(`li#${id}`).remove()
    return false;
})
$('body').on('click','.remove-past-comp',function(){
    let id = $(this).data('id')
    $('#selectedPastComp').find(`li#${id}`).remove()
    return false;
})
$('body').on('click','.remove-industy',function(){
    let id = $(this).data('id')
    $('#selectedIndustry').find(`li#${id}`).remove()
    return false;
})
$('body').on('click','.remove-school',function(){
    let id = $(this).data('id')
    $('#selectedSchool').find(`li#${id}`).remove()
    return false;
})
$('body').on('click','.remove-language',function(){
    let id = $(this).data('id')
    $('#selectedLanguage').find(`li#${id}`).remove()
    return false;
})