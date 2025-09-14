# Deployment Guide for HashNHedge

## Quick Deployment Options

### Option 1: GitHub Pages (Recommended for Quick Start)
1. Push your code to GitHub
2. Go to Settings > Pages in your repository
3. Select source: Deploy from a branch
4. Select branch: main, folder: / (root)
5. Your site will be available at: https://knol3j.github.io/hashnhedge/

### Option 2: Netlify (Recommended for Custom Domain)
1. Visit [netlify.com](https://netlify.com)
2. Drag and drop your `hashnhedge-consolidated` folder
3. Connect your custom domain (hashnhedge.com)
4. Enable automatic HTTPS

### Option 3: Vercel
1. Install Vercel CLI: `npm i -g vercel`
2. Run: `vercel` in your project directory
3. Follow the prompts
4. Add custom domain in Vercel dashboard

### Option 4: Traditional Web Hosting
1. Use FTP client (FileZilla, etc.)
2. Upload all files to public_html or www directory
3. Ensure index.html is in the root

## Custom Domain Setup (hashnhedge.com)

### DNS Configuration
Add these records to your domain registrar:

For Netlify:
```
Type: CNAME
Name: @
Value: [your-site-name].netlify.app
```

For GitHub Pages:
```
Type: A
Name: @
Value: 185.199.108.153
Value: 185.199.109.153
Value: 185.199.110.153
Value: 185.199.111.153
```

### SSL Certificate
- GitHub Pages: Automatic with custom domain
- Netlify/Vercel: Automatic
- Traditional hosting: Use Let's Encrypt

## Pre-Deployment Checklist
- [ ] Copy dashboard HTML files to pages/ directory
- [ ] Test all links work correctly
- [ ] Verify responsive design on mobile
- [ ] Check console for JavaScript errors
- [ ] Optimize images if needed
- [ ] Update meta tags for SEO

## Post-Deployment
1. Test the live site thoroughly
2. Submit to Google Search Console
3. Set up analytics (Google Analytics, etc.)
4. Monitor performance
5. Set up error tracking (Sentry, etc.)
