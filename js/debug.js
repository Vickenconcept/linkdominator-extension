// Debug utilities for LinkDominator Extension
// Use these functions in the browser console to debug issues

window.LinkDominatorDebug = {
    
    // Test API connection
    testApiConnection: async function() {
        console.log('🔍 Testing API connection...');
        try {
            const response = await fetch(`${filterApi}/accessCheck`);
            const data = await response.json();
            console.log('✅ API Response:', data);
            console.log('📊 Status:', response.status);
            return { success: true, data, status: response.status };
        } catch (error) {
            console.error('❌ API Error:', error);
            return { success: false, error: error.message };
        }
    },

    // Test backend health
    testBackendHealth: async function() {
        console.log('🏥 Testing backend health...');
        
        const endpoints = [
            { name: 'Access Check', url: `${filterApi}/accessCheck` },
            { name: 'Audience List', url: `${filterApi}/audience?linkedinId=test` },
            { name: 'Root API', url: `${filterApi}/` }
        ];

        const results = [];

        for (const endpoint of endpoints) {
            try {
                console.log(`🔍 Testing ${endpoint.name}...`);
                const response = await fetch(endpoint.url, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                
                results.push({
                    name: endpoint.name,
                    url: endpoint.url,
                    status: response.status,
                    statusText: response.statusText,
                    ok: response.ok,
                    error: null
                });
                
                console.log(`📊 ${endpoint.name}: ${response.status} ${response.statusText}`);
                
            } catch (error) {
                results.push({
                    name: endpoint.name,
                    url: endpoint.url,
                    status: 'ERROR',
                    statusText: error.message,
                    ok: false,
                    error: error.message
                });
                
                console.error(`❌ ${endpoint.name}: ${error.message}`);
            }
        }

        console.log('📋 Backend Health Summary:', results);
        return results;
    },

    // Test audience list
    testAudienceList: async function(linkedinId = null) {
        const id = linkedinId || $('#me-publicIdentifier').val() || 'test-user';
        console.log('🔍 Testing audience list for:', id);
        
        try {
            const response = await fetch(`${filterApi}/audience?linkedinId=${id}`);
            const data = await response.json();
            console.log('✅ Audience Response:', data);
            console.log('📊 Status:', response.status);
            return { success: true, data, status: response.status };
        } catch (error) {
            console.error('❌ Audience Error:', error);
            return { success: false, error: error.message };
        }
    },

    // Test audience creation
    testAudienceCreation: async function() {
        console.log('🔍 Testing audience creation...');
        
        const testData = {
            audienceName: "Debug Test Audience",
            audienceId: "debug-test-" + Date.now(),
            linkedInId: $('#me-publicIdentifier').val() || 'test-user',
            audienceType: "debug"
        };

        try {
            const response = await fetch(`${filterApi}/audience`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(testData)
            });
            
            const data = await response.json();
            console.log('✅ Creation Response:', data);
            console.log('📊 Status:', response.status);
            return { success: true, data, status: response.status };
        } catch (error) {
            console.error('❌ Creation Error:', error);
            return { success: false, error: error.message };
        }
    },

    // Check configuration
    checkConfig: function() {
        console.log('🔧 Configuration Check:');
        console.log('PLATFORM_URL:', typeof PLATFORM_URL !== 'undefined' ? PLATFORM_URL : 'UNDEFINED');
        console.log('LINKEDIN_URL:', typeof LINKEDIN_URL !== 'undefined' ? LINKEDIN_URL : 'UNDEFINED');
        console.log('filterApi:', typeof filterApi !== 'undefined' ? filterApi : 'UNDEFINED');
        console.log('voyagerApi:', typeof voyagerApi !== 'undefined' ? voyagerApi : 'UNDEFINED');
        console.log('LinkedIn ID:', $('#me-publicIdentifier').val() || 'NOT FOUND');
        
        return {
            platformUrl: typeof PLATFORM_URL !== 'undefined' ? PLATFORM_URL : 'UNDEFINED',
            filterApi: typeof filterApi !== 'undefined' ? filterApi : 'UNDEFINED',
            linkedinId: $('#me-publicIdentifier').val() || 'NOT FOUND'
        };
    },

    // Test all functions
    runAllTests: async function() {
        console.log('🚀 Running all debug tests...');
        
        // Check config
        const config = this.checkConfig();
        console.log('📋 Config result:', config);
        
        // Test backend health
        const healthTest = await this.testBackendHealth();
        console.log('🏥 Backend health result:', healthTest);
        
        // Test API connection
        const apiTest = await this.testApiConnection();
        console.log('🌐 API test result:', apiTest);
        
        // Test audience list
        const audienceTest = await this.testAudienceList();
        console.log('👥 Audience test result:', audienceTest);
        
        // Test audience creation
        const creationTest = await this.testAudienceCreation();
        console.log('➕ Creation test result:', creationTest);
        
        return {
            config,
            healthTest,
            apiTest,
            audienceTest,
            creationTest
        };
    },

    // Force refresh audience list
    refreshAudienceList: function() {
        console.log('🔄 Refreshing audience list...');
        if (typeof getAudienceNameList === 'function') {
            getAudienceNameList();
            console.log('✅ Audience list refresh triggered');
        } else {
            console.error('❌ getAudienceNameList function not found');
        }
    },

    // Check if we're on LinkedIn
    checkLinkedIn: function() {
        const isLinkedIn = window.location.hostname.includes('linkedin.com');
        console.log('🔗 On LinkedIn:', isLinkedIn);
        console.log('📍 Current URL:', window.location.href);
        return isLinkedIn;
    },

    // Test extension loading
    checkExtension: function() {
        console.log('🔧 Extension Check:');
        console.log('jQuery loaded:', typeof $ !== 'undefined');
        console.log('Bootstrap loaded:', typeof bootstrap !== 'undefined');
        console.log('FontAwesome loaded:', typeof FontAwesome !== 'undefined');
        
        return {
            jquery: typeof $ !== 'undefined',
            bootstrap: typeof bootstrap !== 'undefined',
            fontawesome: typeof FontAwesome !== 'undefined'
        };
    }
};
