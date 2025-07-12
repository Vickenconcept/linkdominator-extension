/**
 * Global single filter power
 */
let typeObj = {}, query = '()', display='';

const singleSearchFilter = (elemId, name, type, query, listElem, selectedElem) => {
   let elemVal = $(elemId).val();
   typeObj = {name: name, type: type};

	if(elemVal != '' && type != 'language')
		fetchSingleSearchFilter(elemVal, typeObj, query, listElem, selectedElem)
	else
		fetchLanguage(elemVal, typeObj, listElem, selectedElem)
}

const fetchSingleSearchFilter = (keyword, typeObj, query, listElem, selectedElem) => {
   fetch(`${voyagerSingleSearchUrl}&keywords=${encodeURIComponent(keyword)}&q=type&query=${query}&type=${typeObj.name}`, {
		headers: {
			'Cookie': document.cookie,
			'csrf-token': jsession,
			'X-Li-Lang': xLiLang,
			'X-Li-Page-Instance': xLiPageInstanceFIlter,
			'X-Li-Track': JSON.stringify(xLiTrackFilter),
			'X-Restli-Protocol-Version': xRestliProtocolVersion
		}
	})
	.then(res => res.json())
	.then(res => {
		setSingleSearchFilterResultToList(res, typeObj, listElem, selectedElem)
	})
}

const fetchLanguage = (lang, typeObj, listElem, selectedElem) => {
   fetch(`${filterApi}/lang?` + (new URLSearchParams({lang: lang}).toString()))
		.then(res => res.json())
		.then(res => {
			setSingleSearchFilterResultToList(res, typeObj, listElem, selectedElem)
   	})
}

const setSingleSearchFilterResultToList = (res, typeObj, listElem, selectedElem) => {
	let response = res.elements
	let responseLang = res.languages;
	display = '';

   if(typeObj.name == 'CONNECTIONS' && response.length > 0) {
		$(listElem).empty(); 

		$.each(response, (index, item) => {
			var jsonPath, imgRootUrl, imgPath, connectionId;

			if(item.image.attributes[0].hasOwnProperty('detailDataUnion')) {
				if(item.image.attributes[0].detailDataUnion.hasOwnProperty('nonEntityProfilePicture')) {
					if(item.image.attributes[0].detailDataUnion.nonEntityProfilePicture.hasOwnProperty('vectorImage')) {
						jsonPath = item.image.attributes[0].detailDataUnion.nonEntityProfilePicture.vectorImage;
						imgRootUrl = jsonPath.rootUrl;
						imgPath = jsonPath.artifacts[1].fileIdentifyingUrlPathSegment;
					}
				}
			}

			if(item.target.profile.hasOwnProperty('entityUrn')) {
				connectionId = item.target.profile.entityUrn.split('urn:li:fsd_profile:')[1];
			}

			display = `
				<li data-id="${connectionId}" data-identifier="${connectionId}" data-connectionid="${connectionId}"
					data-name="${item.title.text}" class="list-group-item list-group-item-action ${selectedElem} cursorr">
					
					<div style="display:inline-block;">
						<img src="${imgRootUrl}${imgPath}" class="img-thumbnail rounded-circle" 
							width="50" height="50" style="float:left;">&nbsp;&nbsp;
						<h5 class="selected-drop-list" style="float:right;position:relative;"><b>${item.title.text}</b>
							<br>${item.subtitle.text}
						</h5>
					</div>
				</li>
			`;
			$(listElem).append(display)
		})
   }else if(typeObj.name == 'GEO' && response.length > 0) {
		$(listElem).empty()

		$.each(response, (index, item) => {
			var geoId = item.trackingUrn.replace('urn:li:geo:','')

			display = `
				<li data-id="${geoId}" data-name="${item.title.text}" data-regionid="${item.trackingUrn}"
					class="list-group-item list-group-item-action selected-drop-list ${selectedElem} cursorr">${item.title.text}</li>
			`;
			$(listElem).append(display);
		})
   }else if(typeObj.name == 'COMPANY' && typeObj.type == 'curr_compnay' && response.length > 0) {
		$(listElem).empty()

		$.each(response, (index, item) => {
			var jsonPath, imgRootUrl, imgPath, compId;

			if(item.image.attributes[0].hasOwnProperty('detailDataUnion')) {
				if(item.image.attributes[0].detailDataUnion.nonEntityCompanyLogo.hasOwnProperty('vectorImage')) {
					jsonPath = item.image.attributes[0].detailDataUnion.nonEntityCompanyLogo.vectorImage;
					imgRootUrl = jsonPath.rootUrl;
					imgPath = jsonPath.artifacts[1].fileIdentifyingUrlPathSegment;
				}
			}

			compId = item.trackingUrn.replace('urn:li:organization:','')

			display = `
				<li data-id="${compId}" data-name="${item.title.text}" data-currcomp="${item.trackingUrn}"
					class="list-group-item list-group-item-action selected-drop-list ${selectedElem} cursorr">
					
					<div style="display:inline-block;">
							<img src="${imgRootUrl}${imgPath}" class="img-thumbnail rounded-circle" 
								width="50" height="50" style="float:left;">&nbsp;&nbsp;
							<h5 class="selected-drop-list" style="float:right;position:relative;"><b>${item.title.text}</b>
							<br>${item.subtitle.text}</h5>
					</div>
				</li>
			`;
			$(listElem).append(display)
		})
   }else if(typeObj.name == 'COMPANY' && typeObj.type == 'past_compnay' && response.length > 0) {
		$(listElem).empty()

		$.each(response, (index, item) => {
			var jsonPath, imgRootUrl, imgPath, compId;

			if(item.image.attributes[0].hasOwnProperty('detailDataUnion')) {
				if(item.image.attributes[0].detailDataUnion.nonEntityCompanyLogo.hasOwnProperty('vectorImage')) {
					jsonPath = item.image.attributes[0].detailDataUnion.nonEntityCompanyLogo.vectorImage;
					imgRootUrl = jsonPath.rootUrl;
					imgPath = jsonPath.artifacts[1].fileIdentifyingUrlPathSegment;
				}
			}
			compId = item.trackingUrn.replace('urn:li:organization:','')

			display = `
				<li data-id="${compId}" data-name="${item.title.text}" data-pastcomp="${item.trackingUrn}"
					class="list-group-item list-group-item-action ${selectedElem} cursorr">
					<div style="display:inline-block;">
						<img src="${imgRootUrl}${imgPath}" class="img-thumbnail rounded-circle" 
							width="50" height="50" style="float:left;">&nbsp;&nbsp;
						<h5 class="selected-drop-list" style="float:right;position:relative;"><b>${item.title.text}</b>
						<br>${item.subtitle.text}</h5>
					</div>
				</li>
			`;
			$(listElem).append(display)
		})
   }else if(typeObj.name == 'INDUSTRY' && response.length > 0) {
		$(listElem).empty()

		$.each(response, (index, item) => {
			var industryId = item.trackingUrn.replace('urn:li:industry:','')

			display = `
				<li data-id="${industryId}" data-name="${item.title.text}" data-industry="${item.trackingUrn}"
					class="list-group-item list-group-item-action selected-drop-list ${selectedElem} cursorr">${item.title.text}</li>
			`;
			$(listElem).append(display)
		})
   }else if(typeObj.name == 'SCHOOL' && response.length > 0) {
		$(listElem).empty()

		$.each(response, (index, item) => {
			var jsonPath, imgRootUrl, imgPath, schoolIdUrn;

			if(item.image.attributes[0].hasOwnProperty('detailDataUnion')) {
				if(item.image.attributes[0].detailDataUnion.nonEntityCompanyLogo.hasOwnProperty('vectorImage')) {
					jsonPath = item.image.attributes[0].detailDataUnion.nonEntityCompanyLogo.vectorImage;
					imgRootUrl = jsonPath.rootUrl;
					imgPath = jsonPath.artifacts[1].fileIdentifyingUrlPathSegment;
				}
			}

			schoolIdUrn = item.trackingUrn.replace('urn:li:fsd_company:','')

			display = `
				<li data-id="${schoolIdUrn}" data-name="${item.title.text}" data-schoolid="${item.trackingUrn}"
					class="list-group-item list-group-item-action ${selectedElem} cursorr">
					<div style="display:inline-block;">
						<img src="${imgRootUrl}${imgPath}" class="img-thumbnail rounded-circle" 
								width="50" height="50" style="float:left;">&nbsp;&nbsp;
						<h5 class="selected-drop-list" style="float:right;position:relative;"><b>${item.title.text}</b></h5>
					</div>
				</li>
			`;
			$(listElem).append(display)
	  })
	}else if(typeObj.name == 'LANGUAGE' && responseLang.length > 0) {
		$(listElem).empty()
		
		$.each(responseLang, (index, item) => {
			display = `
				<li data-id="${item.language_code}" data-name="${item.name}" 
					class="list-group-item list-group-item-action selected-drop-list ${selectedElem} cursorr">${item.name}</li>
			`;
			$(listElem).append(display)
		})
   }
}