# LinkDominator Extension - Local Testing Guide

## 🚀 Quick Start

### 1. Test the Extension Locally First

Before loading the extension in Chrome, test it locally to identify issues:

1. **Open the test page**: Open `test-extension.html` in your browser
2. **Run configuration test**: Check if all variables are loaded correctly
3. **Test API connection**: Verify the backend is accessible
4. **Test audience functions**: Check if audience creation and listing work

### 2. Load Extension in Chrome (Developer Mode)

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked" and select your extension folder
4. The extension should appear in your extensions list

### 3. Test on LinkedIn

1. Go to `https://www.linkedin.com/`
2. Log in to your LinkedIn account
3. Look for the LinkDominator extension icon in your browser toolbar
4. Click it to open the extension

## 🔍 Debugging Steps

### Step 1: Check Browser Console

1. **Open Developer Tools**: Press `F12` or right-click → "Inspect"
2. **Go to Console tab**: Look for error messages
3. **Look for these specific errors**:
   - Network errors (CORS, 404, 500)
   - JavaScript errors
   - API connection failures

### Step 2: Check Network Tab

1. **Go to Network tab** in Developer Tools
2. **Filter by "Fetch/XHR"** to see API calls
3. **Look for failed requests** to `https://app.linkdominator.com/api/*`
4. **Check response status codes**:
   - 200: Success
   - 401: Unauthorized (authentication issue)
   - 404: Not found (wrong endpoint)
   - 500: Server error (backend issue)

### Step 3: Test API Endpoints Manually

Open your browser and test these URLs directly:

```
https://app.linkdominator.com/api/accessCheck
https://app.linkdominator.com/api/audience?linkedinId=YOUR_LINKEDIN_ID
```

## 🐛 Common Issues & Solutions

### Issue 1: "No audience available" even after creation

**Possible Causes:**
- Backend API is down
- Authentication issues
- Wrong LinkedIn ID being sent
- Database issues

**Debug Steps:**
1. Check browser console for API errors
2. Verify the API endpoint is accessible
3. Check if your LinkedIn session is valid
4. Test with the local test page

### Issue 2: Extension not loading on LinkedIn

**Possible Causes:**
- Manifest.json issues
- Content script injection problems
- LinkedIn page structure changes

**Debug Steps:**
1. Check if extension is enabled in Chrome
2. Look for errors in extension's background page
3. Verify manifest.json is valid
4. Check if LinkedIn URL matches in manifest

### Issue 3: API calls failing

**Possible Causes:**
- CORS issues
- Network connectivity
- Backend server down
- Invalid API keys

**Debug Steps:**
1. Test API endpoints directly in browser
2. Check network tab for failed requests
3. Verify API URL configuration
4. Check if backend server is running

## 🔧 Configuration Issues

### Check Environment Variables

Make sure these are properly set in `env.js`:

```javascript
const PLATFROM_URL='https://app.linkdominator.com'
const LINKEDIN_URL='https://www.linkedin.com'
const VOYAGER_API=LINKEDIN_URL+'/voyager/api'
```

### Check API Configuration

In `js/appConfig.js`, verify:

```javascript
var filterApi=PLATFROM_URL+'/api';
```

## 📊 Testing Checklist

- [ ] Extension loads without errors
- [ ] Configuration variables are loaded
- [ ] API connection test passes
- [ ] Audience creation works
- [ ] Audience list displays correctly
- [ ] No console errors
- [ ] Network requests succeed
- [ ] Extension works on LinkedIn pages

## 🚨 Emergency Debugging

If nothing works:

1. **Clear browser cache and cookies**
2. **Disable and re-enable the extension**
3. **Check if LinkedIn is blocking the extension**
4. **Verify backend server status**
5. **Test with a different LinkedIn account**

## 📞 Getting Help

If you're still having issues:

1. **Check the console logs** in the test page
2. **Take screenshots** of error messages
3. **Note the exact steps** that cause the issue
4. **Check if the backend API is responding**

## 🔄 Backend Testing

To test if the backend is working:

```bash
# Test the access check endpoint
curl -X GET https://app.linkdominator.com/api/accessCheck

# Test audience endpoint (replace YOUR_ID with actual LinkedIn ID)
curl -X GET "https://app.linkdominator.com/api/audience?linkedinId=YOUR_ID"
```

Expected responses:
- Access check: Should return status information
- Audience: Should return audience data or empty array

If these fail, the issue is with the backend server, not the extension. 