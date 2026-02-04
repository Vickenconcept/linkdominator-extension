let allowedFileTypes = ['ai','pdf','doc','docx','csv','ppt','pptx','pps','ppsx','odt','rtf','xls','xlsx','txt']
let allowedImageTypes = ['png','jpg','jpeg']

const helper = {
    toJson(str) {
        if(str) {
            try {
                return JSON.parse(str);
            } catch(e) {
                console.warn('Failed to parse JSON:', e);
                return { status: false, image: [], file: [] };
            }
        }
        // Return default object if str is falsy
        return { status: false, image: [], file: [] };
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

/**
 * Build LinkedIn search URL with all filters for PhantomBuster
 * Works with any filter prefix (afs-, mtu-, addc-, vcp-, etc.)
 * @param {string} keywords - Search keywords
 * @param {string} prefix - Filter selector prefix (e.g., 'afs-', 'mtu-', 'addc-', 'vcp-')
 * @param {Array} connectionDegrees - Connection degrees array (e.g., ['S','O'] or ['F','S','O'])
 * @returns {string} Complete LinkedIn search URL
 */
window.buildLinkedInSearchUrl = (keywords, prefix = 'afs-', connectionDegrees = ['S','O']) => {
    if (!keywords || !keywords.trim()) return ''; // No keywords, can't build URL
    
    const params = [];
    
    // Keywords (required)
    params.push(`keywords=${encodeURIComponent(keywords.trim())}`);
    
    // Add origin parameter (LinkedIn uses this for faceted search)
    params.push(`origin=FACETED_SEARCH`);
    
    // Network (connection degrees) - LinkedIn uses JSON array format
    const networkCodes = connectionDegrees.length ? connectionDegrees : ['S','O'];
    params.push(`network=${encodeURIComponent(JSON.stringify(networkCodes))}`);
    
    // Add location (geoUrn) - LinkedIn uses JSON array format with string IDs
    const locationSelector = `#${prefix}selectedLocation li`;
    if ($(locationSelector).length > 0) {
        const geoUrns = [];
        $(locationSelector).each(function() {
            const geoUrn = $(this).data('regionid');
            if (geoUrn) {
                geoUrns.push(String(geoUrn)); // Ensure it's a string
            }
        });
        if (geoUrns.length > 0) {
            params.push(`geoUrn=${encodeURIComponent(JSON.stringify(geoUrns))}`);
        }
    }
    
    // Add current company - LinkedIn uses JSON array format with string IDs
    const currCompSelector = `#${prefix}selectedCurrComp li`;
    if ($(currCompSelector).length > 0) {
        const companies = [];
        $(currCompSelector).each(function() {
            const companyId = $(this).data('currcompid');
            if (companyId) {
                companies.push(String(companyId)); // Ensure it's a string
            }
        });
        if (companies.length > 0) {
            params.push(`currentCompany=${encodeURIComponent(JSON.stringify(companies))}`);
        }
    }
    
    // Add past company - LinkedIn uses JSON array format with string IDs
    const pastCompSelector = `#${prefix}selectedPastComp li`;
    if ($(pastCompSelector).length > 0) {
        const pastCompanies = [];
        $(pastCompSelector).each(function() {
            const pastCompanyId = $(this).data('pastcompid');
            if (pastCompanyId) {
                pastCompanies.push(String(pastCompanyId)); // Ensure it's a string
            }
        });
        if (pastCompanies.length > 0) {
            params.push(`pastCompany=${encodeURIComponent(JSON.stringify(pastCompanies))}`);
        }
    }
    
    // Add industry - LinkedIn uses JSON array format with string IDs
    const industrySelector = `#${prefix}selectedIndustry li`;
    if ($(industrySelector).length > 0) {
        const industries = [];
        $(industrySelector).each(function() {
            const industryId = $(this).data('industryid');
            if (industryId) {
                industries.push(String(industryId)); // Ensure it's a string
            }
        });
        if (industries.length > 0) {
            params.push(`industry=${encodeURIComponent(JSON.stringify(industries))}`);
        }
    }
    
    // Add school - LinkedIn uses JSON array format with string IDs
    const schoolSelector = `#${prefix}selectedSchool li`;
    if ($(schoolSelector).length > 0) {
        const schools = [];
        $(schoolSelector).each(function() {
            const schoolId = $(this).data('schoolid');
            if (schoolId) {
                schools.push(String(schoolId)); // Ensure it's a string
            }
        });
        if (schools.length > 0) {
            params.push(`schoolFilter=${encodeURIComponent(JSON.stringify(schools))}`);
        }
    }
    
    // Add profile language - LinkedIn uses JSON array format
    const languageSelector = `#${prefix}selectedLanguage li`;
    if ($(languageSelector).length > 0) {
        const languages = [];
        $(languageSelector).each(function() {
            const lang = $(this).data('langcode');
            if (lang) {
                languages.push(String(lang)); // Ensure it's a string
            }
        });
        if (languages.length > 0) {
            params.push(`profileLanguage=${encodeURIComponent(JSON.stringify(languages))}`);
        }
    }
    
    // Add firstName - LinkedIn supports this as a URL parameter
    const firstNameSelector = `#${prefix}firstName`;
    if ($(firstNameSelector).length > 0 && $(firstNameSelector).val() && $(firstNameSelector).val().trim()) {
        params.push(`firstName=${encodeURIComponent($(firstNameSelector).val().trim())}`);
    }
    
    // Add lastName - LinkedIn supports this as a URL parameter
    const lastNameSelector = `#${prefix}lastName`;
    if ($(lastNameSelector).length > 0 && $(lastNameSelector).val() && $(lastNameSelector).val().trim()) {
        params.push(`lastName=${encodeURIComponent($(lastNameSelector).val().trim())}`);
    }
    
    // Add title - LinkedIn supports this as a URL parameter
    const titleSelector = `#${prefix}title`;
    if ($(titleSelector).length > 0 && $(titleSelector).val() && $(titleSelector).val().trim()) {
        params.push(`title=${encodeURIComponent($(titleSelector).val().trim())}`);
    }
    
    const finalUrl = `https://www.linkedin.com/search/results/people/?${params.join('&')}`;
    return finalUrl;
};

/**
 * Fetch search results from PhantomBuster API
 * @param {Object} options - Search options
 * @param {string} options.searchUrl - Complete LinkedIn search URL (optional if keywords provided)
 * @param {string} options.keywords - Search keywords (required if searchUrl not provided)
 * @param {Array} options.connectionDegrees - Connection degrees array (e.g., ['3+'] or ['2', '3+'])
 * @param {number} options.limit - Maximum number of results to return
 * @param {number} options.startPosition - Starting position for pagination (default: 0)
 * @returns {Promise<Object>} Response in LinkedIn API format with elements and included arrays
 */
window.fetchPhantomSearchResults = async (options = {}) => {
    const {
        searchUrl = null,
        keywords = null,
        connectionDegrees = [],
        limit = null,
        startPosition = 0
    } = options;
    
    if (!searchUrl && !keywords) {
        throw new Error('Either searchUrl or keywords must be provided');
    }
    
    // Get LinkedIn ID from global variable or DOM
    const linkedinIdValue = (typeof linkedinId !== 'undefined' && linkedinId) 
        ? linkedinId 
        : ($('#me-publicIdentifier').val() || $('#me-plainId').val());
    
    if (!linkedinIdValue) {
        throw new Error('LinkedIn ID not available. Please ensure you are logged into LinkedIn.');
    }
    
    // Get API base URL
    const apiBaseUrl = typeof PLATFORM_URL !== 'undefined' 
        ? PLATFORM_URL 
        : (typeof filterApi !== 'undefined' ? filterApi.replace('/api', '') : '');
    
    if (!apiBaseUrl) {
        throw new Error('API base URL not configured');
    }
    
    const response = await fetch(`${apiBaseUrl}/api/audience/search-export`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'lk-id': (typeof window.getLinkedInIdForApi === 'function' ? window.getLinkedInIdForApi() : linkedinIdValue),
            'ngrok-skip-browser-warning': 'true' // Bypass ngrok warning page
        },
        body: JSON.stringify({
            search_url: searchUrl || null,
            keywords: keywords || null,
            connection_degrees: connectionDegrees,
            limit: limit ? parseInt(limit, 10) : undefined,
            start_position: startPosition
        })
    });
    
    if (!response.ok) {
        let errorData;
        try {
            errorData = await response.json();
        } catch (e) {
            const body = await response.text();
            throw new Error(`Search export failed: ${response.status} ${body}`);
        }
        
        // Check for session expired error
        if (errorData.error_code === 'LINKEDIN_SESSION_EXPIRED' || errorData.error_type === 'session_expired') {
            const error = new Error(errorData.message || 'LinkedIn session cookie expired');
            error.errorCode = 'LINKEDIN_SESSION_EXPIRED';
            error.errorType = 'session_expired';
            error.crmUrl = errorData.crm_url;
            error.helpMessage = errorData.help_message;
            error.instructions = errorData.instructions;
            throw error;
        }
        
        // Check for network timeout error
        if (errorData.error_code === 'NETWORK_TIMEOUT' || errorData.error_type === 'network_timeout') {
            const error = new Error(errorData.message || 'Network timeout');
            error.errorCode = 'NETWORK_TIMEOUT';
            error.errorType = 'network_timeout';
            error.helpMessage = errorData.help_message;
            error.suggestions = errorData.suggestions;
            throw error;
        }
        
        throw new Error(errorData.message || `Search export failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Ensure response has the expected structure
    if (data && data.data && data.data.data) {
        return data.data; // Already in correct format
    } else if (data && data.data) {
        return data.data; // Wrapped once
    } else {
        return data; // Return as-is
    }
};

/**
 * Display user-friendly error message for session expired errors
 * @param {Error} error - The error object
 * @param {string} statusElementId - The ID of the element to display the error in
 */
window.displaySessionExpiredError = function(error, statusElementId) {
    if (error.errorCode === 'LINKEDIN_SESSION_EXPIRED' || error.errorType === 'session_expired') {
        const crmUrl = error.crmUrl || (typeof PLATFORM_URL !== 'undefined' ? PLATFORM_URL.replace('/api', '') + '/social-account' : '');
        const instructions = error.instructions || [
            '1. Go to Social Accounts page in your CRM',
            '2. Find your LinkedIn account',
            '3. Update the session cookie (li_at) and user agent',
            '4. Save and try again'
        ];
        
        let errorHtml = `
            <div style="background: #fff3cd; border: 2px solid #ffc107; border-radius: 8px; padding: 15px; margin: 10px 0;">
                <h3 style="color: #856404; margin-top: 0; font-size: 16px; font-weight: bold;">
                    🔐 LinkedIn Session Cookie Expired
                </h3>
                <p style="color: #856404; margin: 10px 0;">
                    ${error.helpMessage || 'Your LinkedIn session cookie has expired or is invalid. Please update it to continue.'}
                </p>
                <div style="background: white; padding: 10px; border-radius: 4px; margin: 10px 0;">
                    <strong style="color: #856404;">Steps to fix:</strong>
                    <ol style="color: #856404; margin: 5px 0; padding-left: 20px;">
                        ${instructions.map(step => `<li>${step}</li>`).join('')}
                    </ol>
                </div>
                ${crmUrl ? `
                    <a href="${crmUrl}" target="_blank" 
                       style="display: inline-block; background: #0077b5; color: white; padding: 10px 20px; 
                              text-decoration: none; border-radius: 4px; font-weight: bold; margin-top: 10px;">
                        🔗 Open Social Accounts Page
                    </a>
                ` : ''}
            </div>
        `;
        
        $(statusElementId).html(errorHtml);
        return true;
    }
    
    // Handle network timeout errors
    if (error.errorCode === 'NETWORK_TIMEOUT' || error.errorType === 'network_timeout') {
        const suggestions = error.suggestions || [
            '1. Check your internet connection',
            '2. Verify your server can access external APIs',
            '3. Check if a firewall is blocking connections',
            '4. Try again in a few moments'
        ];
        
        let errorHtml = `
            <div style="background: #f8d7da; border: 2px solid #dc3545; border-radius: 8px; padding: 15px; margin: 10px 0;">
                <h3 style="color: #721c24; margin-top: 0; font-size: 16px; font-weight: bold;">
                    🌐 Network Connection Timeout
                </h3>
                <p style="color: #721c24; margin: 10px 0;">
                    ${error.helpMessage || 'Cannot connect to PhantomBuster API. This is usually a network connectivity issue.'}
                </p>
                <div style="background: white; padding: 10px; border-radius: 4px; margin: 10px 0;">
                    <strong style="color: #721c24;">Suggestions:</strong>
                    <ul style="color: #721c24; margin: 5px 0; padding-left: 20px;">
                        ${suggestions.map(suggestion => `<li>${suggestion}</li>`).join('')}
                    </ul>
                </div>
                <button onclick="location.reload()" 
                        style="display: inline-block; background: #dc3545; color: white; padding: 10px 20px; 
                               border: none; border-radius: 4px; font-weight: bold; margin-top: 10px; cursor: pointer;">
                    🔄 Retry
                </button>
            </div>
        `;
        
        $(statusElementId).html(errorHtml);
        return true;
    }
    
    return false;
};

// Unified audience fetching function to avoid duplicates across modules
window.fetchAudiencesFromAPI = async () => {
    
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
        try {
            const response = await apiRequest(`${filterApi}/audience?linkedinId=${publicId}`, {
                method: 'GET'
            });
            // Ensure response has the expected structure
            if (response && response.data && response.data.audience) {
                return { success: true, data: response.data };
            } else if (response && response.audience) {
                // Fallback for old format
                return { success: true, data: { audience: response.audience } };
            } else {
                return { success: true, data: response };
            }
        } catch (error) {
            // Handle ngrok blocking or other errors
            if (error.message === 'ngrok_warning_page' || 
                (error.message && error.message.includes('DOCTYPE html')) ||
                (error.message && error.message.includes('ngrok'))) {
                throw new Error('ngrok_warning_page');
            }
            throw error;
        }
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
                    'lk-id': (typeof window.getLinkedInIdForApi === 'function' ? window.getLinkedInIdForApi() : publicId)
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
                    
                    // Check if response is ngrok warning page
                    if (xhr.responseText && (xhr.responseText.includes('ngrok') || xhr.responseText.includes('ERR_NGROK'))) {
                        errorMessage = 'ngrok_warning_page';
                    }
                    
                    reject(new Error(`${errorMessage}: ${error}`));
                }
            });
        });
    }
};