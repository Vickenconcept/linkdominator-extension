# Convert Popup Extension to Content Script (Like LinkDominator)

## ✅ What This Extension Uses (NOT Popup)

**This extension uses CONTENT SCRIPTS** - it injects HTML directly into the web page, not a popup window.

### Key Differences:

| Popup Extension | Content Script (This Extension) |
|----------------|----------------------------------|
| ❌ Separate popup window | ✅ Injected into page |
| ❌ Limited styling | ✅ Full CSS control |
| ❌ Rounded corners clipped | ✅ Perfect rounded corners |
| ❌ Isolated from page | ✅ Part of the page |

## How It Works

### 1. Manifest.json - NO Popup, Use Content Scripts

```json
{
  "manifest_version": 3,
  "name": "Your Extension",
  "action": {
    "default_icon": {
      "16": "icon16.png",
      "48": "icon48.png"
    }
    // ❌ NO "default_popup" here!
  },
  "content_scripts": [{
    "matches": ["https://example.com/*"], // Your target website
    "css": ["css/app.css"], // Your CSS file
    "js": ["js/content.js"] // Your content script
  }],
  "permissions": ["activeTab", "scripting"]
}
```

### 2. Content Script - Inject HTML into Page

Create `js/content.js`:

```javascript
// Create your sidebar HTML
const sidebarHTML = `
<div id="mySidebar" class="sidebar" style="display: none;">
    <div class="sidebar-header">
        <h3>Your Extension</h3>
        <button id="close-sidebar">×</button>
    </div>
    <div class="sidebar-content">
        <!-- Your content here -->
        <p>This is injected into the page!</p>
    </div>
</div>

<!-- Floating button to open sidebar -->
<button id="open-sidebar" class="float-btn">
    <img src="icon.png" alt="Open">
</button>
`;

// Inject into page
document.body.insertAdjacentHTML('beforeend', sidebarHTML);

// Add event listeners
document.getElementById('open-sidebar').addEventListener('click', function() {
    document.getElementById('mySidebar').style.display = 'block';
});

document.getElementById('close-sidebar').addEventListener('click', function() {
    document.getElementById('mySidebar').style.display = 'none';
});
```

### 3. CSS - Full Control, No Limitations

Create `css/app.css`:

```css
.sidebar {
    position: fixed;
    top: 0;
    left: 0;
    width: 300px;
    height: 100vh;
    background: #ffffff;
    border-radius: 0 12px 12px 0; /* Perfect rounded corners! */
    box-shadow: 4px 0 16px rgba(0, 0, 0, 0.1);
    z-index: 999999; /* High z-index to stay on top */
    overflow-y: auto;
    transition: transform 0.3s ease;
}

.float-btn {
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: #0077b5;
    border: none;
    cursor: pointer;
    z-index: 999998;
    box-shadow: 0 4px 12px rgba(0, 119, 181, 0.3);
}
```

### 4. Optional: Open Sidebar from Extension Icon

If you want clicking the extension icon to open the sidebar, add to `background.js`:

```javascript
chrome.action.onClicked.addListener((tab) => {
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: toggleSidebar
    });
});

function toggleSidebar() {
    const sidebar = document.getElementById('mySidebar');
    if (sidebar) {
        const isVisible = sidebar.style.display !== 'none';
        sidebar.style.display = isVisible ? 'none' : 'block';
    }
}
```

## Complete Example Structure

```
your-extension/
├── manifest.json
├── css/
│   └── app.css
├── js/
│   ├── content.js (injects sidebar)
│   └── background.js (optional - for icon click)
├── images/
│   └── icon.png
└── popup.html (DELETE THIS - not needed!)
```

## Advantages of Content Script Approach

✅ **No popup limitations** - Full CSS control  
✅ **Perfect rounded corners** - No browser frame clipping  
✅ **Better UX** - Sidebar stays on page  
✅ **More space** - Can use full viewport height  
✅ **Easter integration** - Feels like part of the website  

## Migration Steps

1. **Remove popup from manifest.json**
   - Delete `"default_popup": "popup.html"`

2. **Add content_scripts to manifest.json**
   - Add the content_scripts section shown above

3. **Create content.js**
   - Copy your popup HTML
   - Inject it using `insertAdjacentHTML` or `appendChild`

4. **Move CSS to content script CSS**
   - Add CSS file to manifest `content_scripts.css`

5. **Test on target website**
   - Load extension
   - Visit your target website
   - Sidebar should appear!

## Important Notes

⚠️ **Content scripts only work on matching URLs** - Set `matches` in manifest correctly  
⚠️ **Need permissions** - Add `"activeTab"` or `"scripting"` to permissions  
⚠️ **Isolated from page JS** - Use `window.postMessage` if you need to communicate  

## Example: Complete Working Version

**manifest.json:**
```json
{
  "manifest_version": 3,
  "name": "My Extension",
  "version": "1.0",
  "action": {
    "default_icon": {
      "16": "icon16.png"
    }
  },
  "content_scripts": [{
    "matches": ["https://example.com/*"],
    "css": ["css/app.css"],
    "js": ["js/content.js"]
  }],
  "permissions": ["activeTab", "scripting"]
}
```

**js/content.js:**
```javascript
// Inject sidebar
const sidebar = document.createElement('div');
sidebar.id = 'mySidebar';
sidebar.className = 'sidebar';
sidebar.innerHTML = `
    <div class="sidebar-header">
        <h3>My Extension</h3>
        <button id="close-btn">×</button>
    </div>
    <div class="sidebar-content">
        <p>Content here</p>
    </div>
`;

// Inject button
const button = document.createElement('button');
button.id = 'open-sidebar';
button.className = 'float-btn';
button.innerHTML = '☰';

// Add to page
document.body.appendChild(sidebar);
document.body.appendChild(button);

// Event listeners
button.addEventListener('click', () => {
    sidebar.style.display = sidebar.style.display === 'none' ? 'block' : 'none';
});

document.getElementById('close-btn').addEventListener('click', () => {
    sidebar.style.display = 'none';
});
```

**css/app.css:**
```css
.sidebar {
    position: fixed;
    left: 0;
    top: 0;
    width: 300px;
    height: 100vh;
    background: white;
    border-radius: 0 12px 12px 0;
    box-shadow: 4px 0 16px rgba(0,0,0,0.1);
    z-index: 999999;
    display: none;
}

.float-btn {
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background: #0077b5;
    color: white;
    border: none;
    cursor: pointer;
    z-index: 999998;
}
```

That's it! Your extension now works like LinkDominator - no popup limitations! 🎉
