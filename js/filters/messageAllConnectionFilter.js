/**
 * Trigger single search filter
 */
$('body').on('click', '.mac-searchCon', function(){
    singleSearchFilter('#mac-exConnection','CONNECTIONS','connections_of',query,'#mac-resultConnect','mac-conn-click')
})

/**
 * Select specific search result
 */
$('body').on('click','.mac-conn-click',function(){
    selectedDataItem = {
        name: $(this).data('name'),
        trackId: $(this).data('id'),
        identifier: $(this).data('identifier'),
        connectionId: $(this).data('connectionid'),
        inputClass: 'mac-conn-of',
        removeClass: 'mac-remove-conof',
        dataAttr: 'idf',
        selectedElem: '#mac-selectedConnect',
        resultElem: '#mac-resultConnect',
        elemVal: '#mac-exConnection',
        owner: 'connectionOf'
    }
    setSelectedSingleSearchFilter(selectedDataItem)
})

/**
 * Remove selected search result
 */
$('body').on('click','.mac-remove-conof',function(){
    let id = $(this).data('idf')
    $('#mac-selectedConnect').find(`li#${id}`).remove()
    return false;
})