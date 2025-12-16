# Railway Deployment Troubleshooting

## Common Issues and Fixes

### Issue 1: Prisma Schema Not Found
**Error:** `Error: Can't find schema.prisma`

**Fix:** ✅ FIXED - Schema is now in `backend/api/prisma/schema.prisma`

### Issue 2: Build Failing on Prisma Migrate
**Error:** `No migrations found` or `Migration failed`

**Fix:** ✅ FIXED - Changed from `prisma migrate deploy` to `prisma db push` which creates tables directly from schema

### Issue 3: Health Check Timeout
**Error:** Service keeps restarting, health check failing

**Fix:** ✅ FIXED - Increased health check timeout from 100ms to 300ms

### Issue 4: Port Binding Issues
**Error:** `EADDRINUSE` or service not starting

**Solution:**
- Railway automatically sets `PORT` environment variable
- Make sure your code uses `process.env.PORT || 8080`
- ✅ Already configured correctly

### Issue 5: Database Connection
**Error:** `Can't reach database server` or `Connection refused`

**Solution:**
1. Ensure PostgreSQL service is added to Railway project
2. Check `DATABASE_URL` is set (Railway auto-sets this)
3. Verify database service is running
4. Check database URL format: `postgresql://user:pass@host:port/dbname`

### Issue 6: Missing Environment Variables
**Error:** Service starts but API calls fail

**Required Variables for API Service:**
- `DATABASE_URL` - Auto-provided by Railway PostgreSQL
- `JWT_SECRET` - **MUST BE SET MANUALLY**
- `PORT` - Auto-set by Railway
- `NODE_ENV` - Optional, set to `production`

**To Set JWT_SECRET:**
1. Generate a secret:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
2. In Railway dashboard → API Service → Variables
3. Add: `JWT_SECRET` = `<generated-secret>`

### Issue 7: Build Command Failing
**Error:** Build times out or fails during npm install

**Check:**
1. Railway logs in dashboard
2. Ensure `package.json` has all dependencies
3. Check Node.js version compatibility
4. Verify build command in `railway.json`

### Issue 8: Service Deploys But Returns 502/503
**Possible Causes:**
1. Health check failing - check `/health` endpoint
2. Service crashing on startup - check logs
3. Port mismatch - verify `PORT` env var matches service config
4. Database connection failing - check `DATABASE_URL`

## Verification Steps

### 1. Check Service Status
In Railway dashboard, verify:
- ✅ Service shows "Deployed" status
- ✅ No error indicators
- ✅ Logs show successful startup

### 2. Test Health Endpoint
```bash
curl https://your-api-service.up.railway.app/health
```

Expected response:
```json
{"status":"ok","service":"hnh-api"}
```

### 3. Check Logs
In Railway dashboard → Service → Logs:
- Look for "Backend API running on port XXXX"
- Check for database connection messages
- Verify no error messages

### 4. Test Database Connection
Logs should show:
```
Database: Connected
```

If it shows "Not configured", check `DATABASE_URL` environment variable.

## Quick Fixes Applied

1. ✅ **Moved Prisma schema** to `backend/api/prisma/schema.prisma`
2. ✅ **Changed build command** from `prisma migrate deploy` to `prisma db push`
3. ✅ **Added postinstall script** to auto-generate Prisma client
4. ✅ **Increased health check timeout** to 300ms
5. ✅ **Fixed Prisma client generation** in build process

## Next Steps

1. **Redeploy the API service** in Railway
2. **Set JWT_SECRET** environment variable
3. **Verify database** is connected
4. **Check service logs** for any errors
5. **Test health endpoint** to confirm service is running

## Still Having Issues?

1. Check Railway logs for specific error messages
2. Verify all environment variables are set
3. Ensure database service is running
4. Check Railway status page: https://status.railway.app
5. Review Railway documentation: https://docs.railway.app



