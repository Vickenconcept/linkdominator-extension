
const setFIlterQueryParams = (listElemId, dataAttr, queryType) => {
    let params = '';

    $(`${listElemId} li`).each(function(index) {
        if(index == ($(`${listElemId} li`).length -1)) {
            params += $(this).data(dataAttr);
        }else {
            params += $(this).data(dataAttr)+',';
        }
    });
    return `${queryType}:List(${params}),`;
}

const setFIlterQueryParamsFreeText = (elem, queryType) => {
    return `${queryType}:List(${encodeURIComponent($(elem).val())}),`
}