# 🚨 URGENT: Fix Production CORS Errors

## Problem
Your frontend at `hashnhedge.com` is trying to connect to `http://localhost:8080`, which causes CORS errors because:
1. Localhost is not accessible from a remote website
2. The frontend needs your Railway backend URL instead

## Solution: Rebuild Frontend with Railway Backend URL

### Step 1: Get Your Railway Backend URL

1. Go to Railway dashboard: https://railway.app
2. Find your **API service** (the one in `backend/api/`)
3. Click on it → **Settings** → **Generate Domain** (if not already done)
4. Copy the public URL (e.g., `https://api-production-xxxx.up.railway.app`)

### Step 2: Set Environment Variable and Rebuild

**Option A: If hosting on Railway (Frontend Service)**

1. In Railway dashboard, find your frontend service
2. Go to **Variables** tab
3. Add environment variable:
   - **Name:** `VITE_API_URL`
   - **Value:** `https://your-api-service.up.railway.app` (use your actual Railway API URL)
4. Railway will automatically rebuild with the new variable

**Option B: If hosting on Vercel**

1. Go to Vercel dashboard → Your project
2. Go to **Settings** → **Environment Variables**
3. Add:
   - **Name:** `VITE_API_URL`
   - **Value:** `https://your-api-service.up.railway.app`
   - **Environment:** Production (and Preview if needed)
4. Go to **Deployments** → Click **Redeploy** on latest deployment

**Option C: If hosting on Netlify**

1. Go to Netlify dashboard → Your site
2. Go to **Site configuration** → **Environment variables**
3. Add:
   - **Key:** `VITE_API_URL`
   - **Value:** `https://your-api-service.up.railway.app`
4. Go to **Deploys** → **Trigger deploy** → **Deploy site**

**Option D: If hosting elsewhere or building locally**

1. Create `.env.production` file in project root:
   ```env
   VITE_API_URL=https://your-api-service.up.railway.app
   ```

2. Rebuild the frontend:
   ```bash
   npm run build
   ```

3. Deploy the new `dist` folder to your hosting provider

### Step 3: Verify Backend is Working

Before rebuilding, test your Railway backend:

```bash
curl https://your-api-service.up.railway.app/health
```

Should return:
```json
{"status":"ok","service":"hnh-api"}
```

### Step 4: Test After Rebuild

1. Clear browser cache (Ctrl+Shift+Delete)
2. Visit `hashnhedge.com`
3. Open DevTools Console (F12)
4. Try to register/login
5. You should see: `[Auth] Attempting login to: https://your-api-service.up.railway.app/auth/login`
6. No more CORS errors!

## Quick Test

After rebuilding, check the browser console. You should see:
- ✅ `[Auth] Attempting login to: https://your-api-service.up.railway.app/auth/login`
- ❌ NOT `[Auth] Attempting login to: http://localhost:8080/auth/login`

## Important Notes

- **Vite embeds environment variables at BUILD TIME**, not runtime
- You MUST rebuild after setting `VITE_API_URL`
- The variable must start with `VITE_` to be included in the build
- Use `https://` not `http://` for production

## Still Having Issues?

1. **Check Railway backend is running:**
   ```bash
   curl https://your-api-service.up.railway.app/health
   ```

2. **Verify CORS is configured correctly:**
   - Backend should allow your frontend domain
   - Check `backend/api/index.js` CORS configuration

3. **Check browser console for exact error:**
   - Network tab → Find the failed request
   - Check the actual URL being called
   - Verify it's using HTTPS Railway URL, not localhost

