# Environment Setup for Railway Backend

## Issue Fixed

After moving the backend to Railway, login was failing because the frontend wasn't configured to use the Railway backend URL.

## Changes Made

1. ✅ Added `VITE_API_URL` to TypeScript type definitions
2. ✅ Fixed hardcoded `localhost:8080` URL in `Provider.tsx` 
3. ✅ Improved error handling and logging in `authService.ts`
4. ✅ Updated CORS configuration for production
5. ✅ Made error messages more user-friendly

## Required Setup

### 1. Set Environment Variable

You need to set the `VITE_API_URL` environment variable to point to your Railway backend.

**For Local Development:**
Create a `.env` file in the project root:
```env
VITE_API_URL=http://localhost:8080
```

**For Production Build:**
Set the environment variable in your deployment platform (Railway, Vercel, Netlify, etc.):
```env
VITE_API_URL=https://your-api-service.up.railway.app
```

**Important:** Replace `https://your-api-service.up.railway.app` with your actual Railway API service URL.

### 2. Get Your Railway Backend URL

1. Go to your Railway dashboard
2. Click on your API service
3. Click "Settings" → "Generate Domain" (if not already done)
4. Copy the public URL (e.g., `https://api-production-xxxx.up.railway.app`)

### 3. Verify Backend is Working

Test your backend health endpoint:
```bash
curl https://your-api-service.up.railway.app/health
```

Should return:
```json
{"status":"ok","service":"hnh-api"}
```

### 4. Rebuild Frontend

After setting `VITE_API_URL`, rebuild your frontend:

```bash
npm run build
```

Or for development:
```bash
npm run dev
```

## Debugging

If login still fails, check the browser console for detailed error messages. The updated error handling will show:

- Network connection errors (e.g., "Cannot connect to backend at...")
- HTTP status errors (e.g., "User not found", "Invalid password")
- Backend error messages

### Common Issues

1. **CORS Errors**: The backend now has explicit CORS configuration. If you still see CORS errors, check that your Railway service is accessible.

2. **Network Errors**: 
   - Verify `VITE_API_URL` is set correctly
   - Check that the Railway service is running (visit the `/health` endpoint)
   - Ensure the URL uses `https://` not `http://`

3. **Environment Variable Not Loading**:
   - Vite only loads `.env` files that start with `VITE_`
   - Restart your dev server after changing `.env` files
   - For production builds, ensure the variable is set in your build environment

## Testing

1. Open browser DevTools Console (F12)
2. Try to login - you should see detailed logs:
   - `[Auth] Attempting login to: [URL]`
   - Success or error messages with details
3. Check Network tab to see the actual API request and response

