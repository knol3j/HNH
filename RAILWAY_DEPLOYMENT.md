# Railway Deployment Guide for HashNHedge

This guide covers deploying all backend services to Railway.

## Prerequisites

1. Railway account (https://railway.app)
2. GitHub repository connected to Railway
3. PostgreSQL database (Railway provides this)

## Services Overview

The backend consists of two services:

1. **API Service** (`backend/api/`) - Main REST API for authentication and user management
2. **Stratum Proxy** (`backend/stratum/`) - Mining pool proxy service

## Step 1: Create Railway Project

1. Go to Railway dashboard
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your repository

## Step 2: Add PostgreSQL Database

1. In your Railway project, click "New"
2. Select "Database" → "Add PostgreSQL"
3. Railway will automatically create a `DATABASE_URL` environment variable
4. Note the database URL for later use

## Step 3: Deploy API Service

1. In Railway project, click "New" → "GitHub Repo"
2. Select your repository
3. Set the **Root Directory** to: `backend/api`
4. Railway will auto-detect the `railway.json` configuration

### Environment Variables for API Service

Add these in Railway dashboard under the API service:

```
DATABASE_URL=<auto-provided by Railway PostgreSQL>
JWT_SECRET=<generate a strong random secret>
NODE_ENV=production
PORT=8080
```

**Generate JWT_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Railway Configuration

The `backend/api/railway.json` is already configured:
- Builds with Nixpacks
- Runs Prisma migrations automatically
- Health check at `/health`
- Auto-restart on failure

## Step 4: Deploy Stratum Proxy

1. In Railway project, click "New" → "GitHub Repo"
2. Select the same repository
3. Set the **Root Directory** to: `backend/stratum`
4. Railway will auto-detect the `railway.json` configuration

### Environment Variables for Stratum Proxy

```
DATABASE_URL=<same as API service>
PORT=3333
HEALTH_PORT=3334
UPSTREAM_HOST=rvn.2miners.com
UPSTREAM_PORT=6060
NODE_ENV=production
```

## Step 5: Configure Frontend

After deploying, Railway will provide public URLs for each service.

### Get Service URLs

1. Go to each service in Railway dashboard
2. Click "Settings" → "Generate Domain"
3. Copy the public URL (e.g., `https://your-api.up.railway.app`)

### Update Frontend Environment

Create a `.env.production` file in the project root:

```env
VITE_API_URL=https://your-api-service.up.railway.app
VITE_STRATUM_PROXY_URL=https://your-stratum-service.up.railway.app
VITE_GEMINI_API_KEY=your-gemini-api-key
```

Or set these in Railway if deploying frontend there, or in your hosting provider.

## Step 6: Database Migrations

Railway will automatically run migrations during build:

```json
"buildCommand": "npm install && npm run build && npx prisma migrate deploy"
```

For manual migrations:

```bash
cd backend/api
npx prisma migrate deploy
```

## Step 7: Verify Deployment

### Test API Service

```bash
curl https://your-api-service.up.railway.app/health
```

Should return:
```json
{"status":"ok","service":"hnh-api"}
```

### Test Stratum Proxy

```bash
curl https://your-stratum-service.up.railway.app/health
```

Should return:
```json
{"status":"ok","service":"hnh-stratum-proxy","port":3333}
```

## Step 8: Update Frontend Code

The frontend is already configured to use environment variables:

- `services/authService.ts` uses `import.meta.env.VITE_API_URL`
- Set `VITE_API_URL` in your frontend deployment environment

## Environment Variables Summary

### API Service (`backend/api`)
- `DATABASE_URL` - PostgreSQL connection string (auto-provided)
- `JWT_SECRET` - Secret for JWT token signing
- `PORT` - Server port (default: 8080)
- `NODE_ENV` - Environment (production)

### Stratum Proxy (`backend/stratum`)
- `DATABASE_URL` - PostgreSQL connection string (auto-provided)
- `PORT` - Stratum proxy port (default: 3333)
- `HEALTH_PORT` - Health check port (default: 3334)
- `UPSTREAM_HOST` - Upstream mining pool host
- `UPSTREAM_PORT` - Upstream mining pool port
- `NODE_ENV` - Environment (production)

### Frontend
- `VITE_API_URL` - Backend API URL
- `VITE_STRATUM_PROXY_URL` - Stratum proxy URL (optional)
- `VITE_GEMINI_API_KEY` - Gemini AI API key

## Monitoring

Railway provides:
- **Logs** - View real-time logs in Railway dashboard
- **Metrics** - CPU, Memory, Network usage
- **Deployments** - View deployment history

## Troubleshooting

### Database Connection Issues

1. Verify `DATABASE_URL` is set correctly
2. Check Railway PostgreSQL service is running
3. Ensure database is accessible (Railway handles this automatically)

### Build Failures

1. Check logs in Railway dashboard
2. Verify `package.json` scripts are correct
3. Ensure all dependencies are listed in `package.json`

### Service Not Starting

1. Check service logs in Railway
2. Verify `PORT` environment variable matches Railway's expected port
3. Ensure health check endpoint is responding

### Prisma Migration Issues

If migrations fail:
1. Check `DATABASE_URL` is correct
2. Run migrations manually: `npx prisma migrate deploy`
3. Check Prisma schema is valid: `npx prisma validate`

## Custom Domains

Railway allows custom domains:

1. Go to service → Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed
4. Update `VITE_API_URL` in frontend

## Scaling

Railway automatically scales services. For manual scaling:

1. Go to service → Settings → Resources
2. Adjust CPU/Memory limits
3. Railway will restart with new resources

## Cost Optimization

- Use Railway's free tier for development
- Monitor usage in Railway dashboard
- Set up usage alerts
- Consider Railway Pro for production workloads

## Support

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- Railway Status: https://status.railway.app

