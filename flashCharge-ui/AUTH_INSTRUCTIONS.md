# Authentication Required - Instructions

## If you see the UI but Start/Stop buttons don't work:

### Step 1: Clear Browser Cache
**On Mobile (Chrome/Safari):**
- Hold the refresh button and select "Hard Refresh" or "Empty Cache and Hard Reload"
- Or go to Settings → Clear Browsing Data → Cached Images and Files

**On Desktop:**
- Press `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)

### Step 2: You Should See Login Page
After clearing cache, you should be redirected to `/login.html`

### Step 3: Login
Use your credentials:
- Username: `rivot`
- Password: `rivot123`

### Step 4: Start/Stop Will Work
After login, the token is saved and buttons will work.

---

## Manual Token Setup (For Testing)

If you want to set token manually:

1. Open browser console (F12)
2. Run:
```javascript
localStorage.setItem('authToken', 'YOUR_TOKEN_HERE');
location.reload();
```

---

## Get a Token via API

```bash
curl -X POST https://ocpp.rivotmotors.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"rivot","password":"rivot123"}'
```

Copy the token from response and use it in browser console.

---

## Direct Login URL

https://ocpp.rivotmotors.com/login.html
