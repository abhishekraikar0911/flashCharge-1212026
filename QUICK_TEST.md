# ⚡ flashCharge Quick Test Card

## 🚀 Quick Start (30 seconds)

### Browser Test
```
1. Open: http://localhost/login.html
2. Login: user / user
3. Click: Connector 1
4. Move slider → Check predictions update ✅
5. Click: PAY button → Charging starts ✅
```

### Console Test
```javascript
// Paste in browser console (F12):
fetch('/api/auth/login', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({username:'user',password:'user'})
}).then(r=>r.json()).then(d=>{
  localStorage.setItem('authToken',d.token);
  console.log('✅ Logged in:', d.user.username);
  location.href='/select-charger.html';
});
```

---

## 🔍 What Was Fixed

| Problem | Solution |
|---------|----------|
| ❌ Null reference error | ✅ Removed start-btn reference |
| ❌ 400 validation error | ✅ Added parseInt/parseFloat |
| ❌ Generic error messages | ✅ Show specific errors |

---

## ✅ Expected Behavior

### Configuration Page
- ✅ No console errors
- ✅ Tabs switch smoothly
- ✅ Predictions update instantly
- ✅ PAY button works

### API Responses
```json
// ✅ Login Success
{"success":true,"token":"eyJ...","user":{...}}

// ✅ Session Created
{"success":true,"sessionId":123,"message":"..."}

// ✅ Charging Started
{"success":true,"message":"Charging started","result":{...}}
```

---

## 🐛 If Something Fails

### Check 1: Backend Running?
```bash
curl http://localhost:3000/health
# Expected: {"status":"Dashboard backend running"}
```

### Check 2: Token Valid?
```javascript
// In browser console:
localStorage.getItem('authToken')
// Should return: "eyJhbGc..."
```

### Check 3: Database Connected?
```bash
mysql -u steve -psteve steve -e "SELECT COUNT(*) FROM users;"
# Should show: count > 0
```

---

## 📞 Quick Commands

```bash
# Restart backend
cd /opt/ev-platform/flashCharge-backend
pm2 restart flashCharge-backend

# Check logs
pm2 logs flashCharge-backend --lines 50

# Test API
curl http://localhost:3000/api/chargers/list

# Clear browser cache
# Press: Ctrl+Shift+R (or Cmd+Shift+R on Mac)
```

---

## 📚 Full Documentation

- **Complete Testing:** `/opt/ev-platform/END_TO_END_TEST.md`
- **All Fixes:** `/opt/ev-platform/FIXES_SUMMARY.md`
- **System Overview:** `/opt/ev-platform/README.md`

---

**Status:** ✅ System Working  
**Last Test:** January 23, 2026  
**Version:** 1.0.0
