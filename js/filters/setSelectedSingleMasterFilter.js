let selectedItem = '';
let selectedDataItem = {}

const setSelectedSingleSearchFilter = selectedDataItem => {

    switch (selectedDataItem.owner) {
        case 'connectionOf':
            selectedItem = `
                <li class="list-group-item d-flex justify-content-between" id="${selectedDataItem.identifier}" 
                    data-name="${selectedDataItem.name}" 
                    data-connectionid="${selectedDataItem.connectionId}">
                    <div class="">
                        <input type="checkbox" class="shadow-none ${selectedDataItem.inputClass}" checked>
                        <label class="" for="customFirstCheck">${selectedDataItem.name}</label>
                    </div>
                    <div class="">
                        <button class="close text-black mt-3 ${selectedDataItem.removeClass}" 
                        data-${selectedDataItem.dataAttr}="${selectedDataItem.identifier}">
                            &times;
                        </button>
                    </div>
                </li>
            `;
            break;

        case 'location':
            selectedItem = `
                <li class="list-group-item d-flex justify-content-between" id="${selectedDataItem.trackId}" 
                    data-regionid="${selectedDataItem.regionid}">
                    <div class="">
                        <input type="checkbox" class="shadow-none ${selectedDataItem.inputClass}" checked>
                        <label class="" for="customFirstCheck">${selectedDataItem.name}</label>
                    </div>
                    <div class="">
                        <button class="close text-black mt-3 ${selectedDataItem.removeClass}" 
                        data-${selectedDataItem.dataAttr}="${selectedDataItem.trackId}">&times;</button>
                    </div>
                </li>
            `;
            break;

        case 'company':
            selectedItem = `
                <li class="list-group-item d-flex justify-content-between" id="${selectedDataItem.trackId}" 
                    data-${selectedDataItem.listDataAttr}="${selectedDataItem.compId}">
                    <div class="">
                        <input type="checkbox" class="shadow-none ${selectedDataItem.inputClass}" checked>
                        <label class="" for="customFirstCheck">${selectedDataItem.name}</label>
                    </div>
                    <div class="">
                        <button class="close text-black mt-3 ${selectedDataItem.removeClass}" 
                        data-${selectedDataItem.dataAttr}="${selectedDataItem.trackId}">&times;</button>
                    </div>
                </li>
            `;
            break;

        case 'industry':
            selectedItem = `
                <li class="list-group-item d-flex justify-content-between" id="${selectedDataItem.trackId}" 
                    data-industryid="${selectedDataItem.industryId}">
                    <div class="">
                        <input type="checkbox" class="shadow-none ${selectedDataItem.inputClass}" checked>
                        <label class="custom-control-label" for="customFirstCheck">${selectedDataItem.name}</label>
                    </div>
                    <div class="">
                        <button class="close text-black mt-3 ${selectedDataItem.removeClass}" 
                        data-${selectedDataItem.dataAttr}="${selectedDataItem.trackId}">&times;</button>
                    </div>
                </li>
            `;
            break;

        case 'school':
            selectedItem = `
                <li class="list-group-item d-flex justify-content-between" id="${selectedDataItem.trackId}" data-schoolid="${selectedDataItem.schoolId}">
                    <div class="">
                        <input type="checkbox" class="shadow-none ${selectedDataItem.inputClass}" 
                        value="${selectedDataItem.schoolId}" checked>
                        <label class="" for="customFirstCheck">${selectedDataItem.name}</label>
                    </div>
                    <div class="">
                        <button class="close text-black mt-3 ${selectedDataItem.removeClass}"
                        data-${selectedDataItem.dataAttr}="${selectedDataItem.trackId}">&times;</button>
                    </div>
                </li>
            `;
            break;

        case 'language':
            selectedItem = `
                <li class="list-group-item d-flex justify-content-between" id="${selectedDataItem.trackId}" data-langcode="${selectedDataItem.trackId}">
                    <div class="">
                        <input type="checkbox" class="shadow-none ${selectedDataItem.inputClass}" checked>
                        <label class="" for="customFirstCheck">${selectedDataItem.name}</label>
                    </div>
                    <div class="">
                        <button class="close text-black mt-3 ${selectedDataItem.removeClass}" 
                        data-${selectedDataItem.dataAttr}="${selectedDataItem.trackId}">&times;</button>
                    </div>
                </li>
            `;
            break;
    }

    $(selectedDataItem.selectedElem).append(selectedItem)
    $(selectedDataItem.resultElem).empty()
    $(selectedDataItem.elemVal).val("")
}