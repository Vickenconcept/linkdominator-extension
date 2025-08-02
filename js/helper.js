let allowedFileTypes = ['ai','pdf','doc','docx','csv','ppt','pptx','pps','ppsx','odt','rtf','xls','xlsx','txt']
let allowedImageTypes = ['png','jpg','jpeg']

const helper = {
    toJson(str) {
        if(str) return JSON.parse(str);
    },
    truncateString(str, len) {
        if (str) {
          if (str.length <= len) {
            return str;
          }
          return str.slice(0, len) + "...";
        }
        return str;
    },
    async handleFileUpload(ev, elemId, type) {
        let fileUrl = ''
        let file = ev.target.files[0]
        let extension = file.type.split('/')[1]

        if (type === 'image' && allowedImageTypes.includes(extension) === false) {
            ev.target.value = null;
            return;
        } else if(type === 'file' && allowedFileTypes.includes(extension) === false) {
            ev.target.value = null;
            return;
        }

        let files = [...ev.target.files];
        fileUrl = await Promise.all(files.map(f=>{return this.readAsDataURL(f)}));
        return fileUrl
    },
    readAsDataURL(file) {
		return new Promise((resolve, reject)=>{
			let fileReader = new FileReader();
			fileReader.onload = function(){
				return resolve({data:fileReader.result, name:file.name, size: file.size, type: file.type});
			}
			fileReader.readAsBinaryString(file);
		})
    },
    setAIContentToDropdown(fieldId) {
        console.log('🔄 Setting up message template dropdown...');
        
        // Clear and show loading state
        $(`#${fieldId}`).empty().append(
            $('<option/>', {
                value: '',
                html: '⏳ Loading message templates...'
            })
        );

        // Load templates
        getAIContents()
            .then(templates => {
                console.log(`✅ Populating dropdown with ${templates.length} templates`);
                
                // Clear loading state
                $(`#${fieldId}`).empty();
                
                // Add default option
                $('<option/>', {
                    value: '',
                    html: 'Select content'
                }).appendTo(`#${fieldId}`);

                // Add templates
                if (templates && templates.length > 0) {
                    for (const [i, template] of templates.entries()) {
                        $('<option/>', {
                            value: template.contents,
                            html: template.title
                        }).appendTo(`#${fieldId}`);
                    }
                } else {
                    // No templates found
                    $('<option/>', {
                        value: '',
                        html: '-- No templates available --',
                        disabled: true
                    }).appendTo(`#${fieldId}`);
                }
            })
            .catch(error => {
                console.error('❌ Failed to load templates:', error);
                
                // Show error state in dropdown
                $(`#${fieldId}`).empty().append(
                    $('<option/>', {
                        value: '',
                        html: '❌ Failed to load templates'
                    })
                );
                
                // Add refresh hint
                $(`#${fieldId}`).append(
                    $('<option/>', {
                        value: '',
                        html: 'Please refresh and try again',
                        disabled: true
                    })
                );
            });
    },
    transformText(text, type){
        if(type == 'capitalize'){
            text = text.charAt(0).toUpperCase() + text.slice(1);
        }
        return text;
    }
    
}

// Unified audience fetching function to avoid duplicates across modules
window.fetchAudiencesFromAPI = async () => {
    console.log('🔍 fetchAudiencesFromAPI called...');
    
    // Check if LinkedIn ID is available
    var publicId = $('#me-publicIdentifier').val();
    
    if (!publicId || publicId.trim() === '') {
        if (typeof linkedinId !== 'undefined' && linkedinId) {
            publicId = linkedinId;
            console.log('✅ Got LinkedIn ID from global variable:', publicId);
        } else {
            throw new Error('LinkedIn ID not available. Please ensure you are logged into LinkedIn and the extension has loaded properly.');
        }
    }
    
    console.log('🔍 Fetching audiences for LinkedIn ID:', publicId);
    console.log('🌐 API URL:', `${filterApi}/audience?linkedinId=${publicId}`);
    
    // Use enhanced apiRequest if available, otherwise fallback to jQuery
    if (typeof apiRequest !== 'undefined') {
        console.log('✅ Using enhanced apiRequest function');
        const response = await apiRequest(`${filterApi}/audience?linkedinId=${publicId}`, {
            method: 'GET'
        });
        return response;
    } else {
        console.log('⚠️ Using fallback jQuery AJAX');
        return new Promise((resolve, reject) => {
            $.ajax({
                method: 'GET',
                url: `${filterApi}/audience?linkedinId=${publicId}`,
                timeout: 15000, // 15 second timeout
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'lk-id': publicId
                },
                success: function(data) {
                    console.log('✅ jQuery AJAX success:', data);
                    resolve({ data: data, success: true });
                },
                error: function(xhr, status, error) {
                    console.error('❌ jQuery AJAX error:', { xhr, status, error });
                    
                    let errorMessage = 'Failed to fetch audiences';
                    if (xhr.status === 0) {
                        errorMessage = 'Network error or CORS issue';
                    } else if (xhr.status === 500) {
                        errorMessage = 'Server error (500)';
                    } else if (xhr.status === 404) {
                        errorMessage = 'API endpoint not found (404)';
                    } else if (xhr.status === 403) {
                        errorMessage = 'Access forbidden (403)';
                    }
                    
                    reject(new Error(`${errorMessage}: ${error}`));
                }
            });
        });
    }
};