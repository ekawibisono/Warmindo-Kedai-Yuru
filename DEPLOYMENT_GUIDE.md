# 🚀 VPS Deployment Checklist & Troubleshooting

## 📋 Pre-Deployment Checklist

### ✅ Files to Upload to VPS:
```bash
# Upload entire build folder to your web directory
rsync -avz build/ user@your-server:/var/www/kedaiyuru/
# or
scp -r build/* user@your-server:/var/www/kedaiyuru/
```

### ✅ Server Configuration Required:

#### For **Apache** (.htaccess already included in build):
- Ensure `mod_rewrite` is enabled
- Check `.htaccess` file is in web root

#### For **Nginx** (use nginx.conf.example):
```bash
# Copy nginx config
sudo cp nginx.conf.example /etc/nginx/sites-available/kedaiyuru
sudo ln -s /etc/nginx/sites-available/kedaiyuru /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### ✅ SSL Certificate (if using HTTPS):
```bash
# Using certbot (Let's Encrypt)
sudo certbot --nginx -d kedaiyuru.click -d www.kedaiyuru.click
```

## 🔍 Debugging Steps

### 1. **Check Browser Console**
- Open Developer Tools (F12)
- Look for JavaScript errors
- Check Network tab for failed requests

### 2. **Test API Connectivity**
```javascript
// Run in browser console:
fetch('https://api.kedaiyuru.click/api/public/menu')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);
```

### 3. **Verify Files on Server**
```bash
# Check if files uploaded correctly
ls -la /var/www/kedaiyuru/
cat /var/www/kedaiyuru/index.html | head
```

### 4. **Test Server Response**
```bash
# Test if server returns index.html for unknown routes
curl -I http://kedaiyuru.click/non-existent-route
# Should return 200, not 404
```

### 5. **Check Server Logs**
```bash
# Apache
sudo tail -f /var/log/apache2/error.log

# Nginx  
sudo tail -f /var/log/nginx/error.log
```

## 🚨 Common Issues & Solutions

### Issue: Blank White Screen
**Causes:**
- Server not configured for SPA routing
- JavaScript errors blocking render 
- API connection failed
- Missing environment variables

**Solutions:**
1. Check console for errors (our ErrorBoundary will show details)
2. Ensure server returns index.html for all routes
3. Verify API URL is accessible
4. Check CORS headers from API

### Issue: 404 Not Found
**Cause:** Server not configured for SPA  
**Solution:** Configure server to fallback to index.html

### Issue: CORS Errors
**Cause:** API doesn't allow frontend domain  
**Solution:** Add domain to backend CORS config

### Issue: SSL/Mixed Content
**Cause:** HTTPS site trying to access HTTP API  
**Solution:** Ensure API also uses HTTPS

## 🔧 Emergency Debug Mode

If you see the Error Boundary screen, it will show:
- JavaScript error details
- Environment variables status  
- API URL configuration
- Browser information

This helps identify exactly what's wrong!

## 📞 Support Commands

```bash
# Test API from server
curl https://api.kedaiyuru.click/api/public/menu

# Check DNS resolution
dig kedaiyuru.click

# Test website response
curl -I https://kedaiyuru.click

# Check server status
systemctl status nginx  # or apache2
```