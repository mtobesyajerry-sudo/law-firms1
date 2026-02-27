# Deployment Guide - Free Testing Environment

## Overview

This guide shows how to deploy your AML Risk Assessment System for **internal testing only** using free tiers.

**CRITICAL**: This is for TESTING ONLY. Do not use with real DNFBP data. See limitations below.

---

## Prerequisites

1. GitHub account (free)
2. Vercel account (free) - https://vercel.com
3. Supabase account (already set up)
4. Git installed locally

---

## Step 1: Push Code to GitHub (First Time Only)

```bash
# If you haven't initialized git yet
git init

# Add all files
git add .

# Commit (ensure .env is NOT included - it's in .gitignore)
git commit -m "Initial commit - ready for deployment"

# Create a new repository on GitHub
# Then connect and push
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

**VERIFY**: Go to GitHub and confirm `.env` is NOT in your repository.

---

## Step 2: Deploy to Vercel

### Option A: Via Vercel Dashboard (Recommended for First Time)

1. **Go to Vercel**: https://vercel.com
2. **Sign up/Login** with GitHub
3. **Click "Add New Project"**
4. **Import your GitHub repository**
5. **Configure Project**:
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

6. **Add Environment Variables**:
   Click "Environment Variables" section and add:
   ```
   Name: VITE_SUPABASE_URL
   Value: https://dntxxrojucoyrkvmgtsw.supabase.co

   Name: VITE_SUPABASE_ANON_KEY
   Value: [your anon key from .env file]
   ```

   **IMPORTANT**: Use the environment dropdown to select "Production", "Preview", and "Development"

7. **Click "Deploy"**

8. **Wait 2-3 minutes** for deployment to complete

9. **Get your URL**: `https://your-project-name.vercel.app`

### Option B: Via Vercel CLI (Faster for Updates)

```bash
# Install Vercel CLI globally
npm install -g vercel

# Login to Vercel
vercel login

# First deployment (interactive)
vercel

# Follow prompts:
# - Link to existing project? No
# - Project name? [accept default or enter custom]
# - Directory? ./
# - Override settings? No

# Add environment variables
vercel env add VITE_SUPABASE_URL
# Paste: https://dntxxrojucoyrkvmgtsw.supabase.co
# Select: Production, Preview, Development

vercel env add VITE_SUPABASE_ANON_KEY
# Paste: [your anon key]
# Select: Production, Preview, Development

# Deploy to production
vercel --prod
```

---

## Step 3: Verify Deployment

1. **Visit your Vercel URL**
2. **Test login/registration**
3. **Create a test organization**
4. **Start a test assessment**
5. **Verify data appears in Supabase dashboard**

### Check Security Headers

```bash
# Test security headers are working
curl -I https://your-project-name.vercel.app

# Should see:
# - strict-transport-security
# - x-frame-options
# - x-content-type-options
```

---

## Step 4: Create Test Accounts

**DO NOT use real email addresses for testing**

### Create First Admin Account

1. Go to your deployed site
2. Register with: `admin@test-internal.local` (or similar)
3. This becomes the first admin (per your migration)

### Create Test Client Accounts

Register additional users:
- `client1@test-internal.local`
- `client2@test-internal.local`

**Note**: These emails won't receive confirmations (email confirmation is disabled in your Supabase config)

---

## Ongoing Deployments

### Every time you make code changes:

```bash
# Option 1: Automatic (via GitHub)
git add .
git commit -m "Description of changes"
git push

# Vercel automatically deploys from GitHub
# Wait 2-3 minutes, refresh your site

# Option 2: Manual (via CLI)
vercel --prod
```

---

## Free Tier Limitations

### Vercel Free Tier
- ✅ Unlimited deployments
- ✅ HTTPS/SSL included
- ✅ 100GB bandwidth/month
- ✅ Fast global CDN
- ❌ No DDoS protection beyond basic
- ❌ No advanced analytics
- ❌ 100 deployments/day limit

### Supabase Free Tier
- ✅ 500MB database storage
- ✅ 50,000 monthly active users
- ✅ 2GB file storage
- ✅ 50MB file uploads
- ❌ No point-in-time recovery
- ❌ Database pauses after 7 days inactivity
- ❌ 1-week backup retention only
- ❌ Limited support (community only)

---

## Testing Guidelines

### ✅ ALLOWED for Testing:

1. **Internal team testing**
   - Your employees only
   - Fake/test data only
   - Simulated scenarios

2. **UI/UX validation**
   - Does it look right?
   - Does navigation work?
   - Are there bugs?

3. **Functionality testing**
   - Can you create assessments?
   - Do calculations work?
   - Can you generate reports?

4. **Performance testing**
   - How fast does it load?
   - Can it handle multiple users?
   - Are there bottlenecks?

5. **Security testing**
   - Can users access other's data?
   - Do RLS policies work?
   - Are there vulnerabilities?

### ❌ NOT ALLOWED for Testing:

1. **Real DNFBP data** - NO real client information
2. **Real assessments** - Only test/dummy assessments
3. **Personal data** - No real names, addresses, tax IDs
4. **Production use** - Not ready for actual business use
5. **External sharing** - Don't give access to real clients yet
6. **Compliance reliance** - Can't use for actual AML compliance

---

## Testing Banner (Add This to Your App)

You should add a prominent testing notice to your application:

### Add to src/App.jsx:

```jsx
// Add this after your existing imports
import { useState } from 'react';

// Add this component
function TestingBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div style={{
      background: '#ff6b35',
      color: 'white',
      padding: '12px 20px',
      textAlign: 'center',
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      fontSize: '14px',
      fontWeight: '500'
    }}>
      ⚠️ TESTING ENVIRONMENT - Do not enter real DNFBP data or use for actual compliance purposes
      <button
        onClick={() => setDismissed(true)}
        style={{
          marginLeft: '20px',
          background: 'white',
          color: '#ff6b35',
          border: 'none',
          padding: '4px 12px',
          borderRadius: '4px',
          cursor: 'pointer',
          fontWeight: '600'
        }}
      >
        Dismiss
      </button>
    </div>
  );
}

// Then add <TestingBanner /> at the top of your App return
```

---

## Daily Backup Script (Free Option)

Since you don't have automatic backups on free tier:

### Create `backup.sh`:

```bash
#!/bin/bash

# Configuration
PROJECT_REF="dntxxrojucoyrkvmgtsw"
DB_PASSWORD="your_database_password" # Get from Supabase dashboard
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
pg_dump "postgresql://postgres:${DB_PASSWORD}@db.${PROJECT_REF}.supabase.co:5432/postgres" \
  > "${BACKUP_DIR}/backup_${DATE}.sql"

# Compress
gzip "${BACKUP_DIR}/backup_${DATE}.sql"

# Keep only last 7 days
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +7 -delete

echo "Backup completed: backup_${DATE}.sql.gz"
```

### Run manually:

```bash
chmod +x backup.sh
./backup.sh
```

### Or schedule with cron (Mac/Linux):

```bash
# Edit crontab
crontab -e

# Add this line (runs daily at 2 AM)
0 2 * * * /path/to/your/project/backup.sh
```

---

## Monitoring (Free Options)

### 1. UptimeRobot (Free)

1. Sign up: https://uptimerobot.com
2. Add monitor: Your Vercel URL
3. Check interval: 5 minutes
4. Alert contacts: Your email

### 2. Vercel Analytics (Free tier available)

1. Go to Vercel dashboard
2. Your project → Analytics
3. Enable (free tier: 2,500 events/month)

### 3. Supabase Monitoring

1. Go to Supabase dashboard
2. Your project → Database → Logs
3. Check daily for errors

---

## Cost Breakdown

### Current (Free Tier):
- Vercel hosting: **$0/month**
- Supabase database: **$0/month**
- Domain: **$0/month** (yourapp.vercel.app)
- SSL certificate: **$0/month** (included)
- **Total: $0/month**

### When You Need to Upgrade:

**Scenario 1: Small Production (10-50 users)**
- Vercel Pro: $20/month (better DDoS protection)
- Supabase Pro: $25/month (backups, support)
- Custom domain: $10-15/year
- **Total: ~$45-50/month**

**Scenario 2: Medium Production (50-200 users)**
- Vercel Pro: $20/month
- Supabase Pro: $25/month
- Monitoring (Sentry): $26/month
- Custom domain: $10-15/year
- **Total: ~$70-75/month**

**Scenario 3: Enterprise (200+ users)**
- Vercel Enterprise: $2,000+/month
- Supabase Team: $599/month
- Advanced monitoring: $200+/month
- Security tools: $500+/month
- **Total: $3,000+/month**

---

## Upgrade Triggers

You should upgrade from free tier when:

### Storage/Performance:
- ⚠️ Database approaching 400MB (80% of 500MB)
- ⚠️ Slow query performance
- ⚠️ Database pausing from inactivity
- ⚠️ File storage approaching 2GB

### Users:
- ⚠️ More than 10 regular users
- ⚠️ Any external clients (not just internal team)
- ⚠️ Real DNFBP data being entered

### Business:
- ⚠️ Moving from test to production
- ⚠️ Clients paying for the service
- ⚠️ Need for support/SLA
- ⚠️ Compliance requirements
- ⚠️ Need backups/disaster recovery

---

## Troubleshooting

### Deployment fails

```bash
# Check build locally first
npm run build

# Clear Vercel cache
vercel --force

# Check Vercel logs
vercel logs [deployment-url]
```

### Environment variables not working

```bash
# List current env vars
vercel env ls

# Remove and re-add
vercel env rm VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_URL

# Redeploy
vercel --prod
```

### Can't login after deployment

1. Check Supabase dashboard → Authentication → URL Configuration
2. Add your Vercel URL to allowed redirect URLs:
   - Go to Authentication → URL Configuration
   - Add `https://your-app.vercel.app/**` to redirect URLs

### Database connection issues

1. Check environment variables are correct
2. Verify Supabase project is not paused
3. Check Supabase dashboard → Database → Connection pooling

### Site shows 404 errors

1. Verify `vercel.json` has correct rewrites
2. Check output directory is `dist`
3. Ensure build completed successfully

---

## Security Checklist for Testing Deployment

Before sharing test environment with team:

- [ ] `.env` file is in `.gitignore`
- [ ] `.env` file is NOT in GitHub repository
- [ ] Environment variables added to Vercel
- [ ] Security headers configured (vercel.json)
- [ ] Testing banner is visible on all pages
- [ ] Only test accounts created (no real emails)
- [ ] RLS policies tested and working
- [ ] Can only access own organization data
- [ ] Admin panel restricted to admin users
- [ ] Manual backup script created
- [ ] Monitoring configured (UptimeRobot)
- [ ] Team understands "testing only" limitations

---

## Testing Phase Timeline

### Week 1-2: Internal Testing
- Team members only
- Test all features
- Find and fix bugs
- Verify security (RLS policies)
- Test on different devices/browsers

### Week 3-4: Extended Testing
- Invite trusted colleagues (non-team)
- Gather UI/UX feedback
- Performance testing
- Load testing (simulate multiple users)

### Week 5-6: Security Hardening
- Fix all identified issues
- Run basic security tests
- Review audit logs
- Test backup/restore

### Week 7-8: Pre-Production Preparation
- Implement missing security controls
- Complete Phase 1 from SECURITY_ROADMAP.md
- Get legal review
- Obtain insurance
- Prepare for upgrade to paid tiers

---

## When You're Ready for Real Production

Complete these before allowing real DNFBP data:

1. **Upgrade to paid tiers** (Vercel Pro + Supabase Pro minimum)
2. **Enable automated backups** with point-in-time recovery
3. **Implement audit logging** (Phase 1.3 from SECURITY_ROADMAP.md)
4. **Enable MFA** for all users
5. **Complete legal review** (Privacy Policy, Terms of Service)
6. **Obtain cyber insurance** ($1-2M minimum)
7. **Run penetration test** (third-party)
8. **Document incident response plan**
9. **Train all users** on security procedures
10. **Get client approval** to store their data

**Estimated cost**: $15,000-30,000 initial + $100-500/month ongoing

---

## Summary

### ✅ What You CAN Do Now (Free):
- Deploy for internal testing
- Test all features
- Validate UI/UX
- Find bugs
- Demo to colleagues
- Prove concept works

### ❌ What You CANNOT Do Yet:
- Accept real client data
- Use for actual AML compliance
- Charge clients for service
- Rely on system for business operations
- Make compliance claims
- Guarantee uptime or backups

### 💰 Cost to Stay Free:
- $0/month while testing
- Keep under 500MB database
- Internal use only
- Manual backups
- No SLA

### 💸 Cost to Go Production:
- Minimum $45-50/month (small scale)
- Plus $15,000-30,000 one-time security investment
- Timeline: 6-8 weeks after testing complete

---

## Next Steps

1. **Deploy to Vercel** (follow steps above)
2. **Test thoroughly** (2-4 weeks)
3. **Document issues** you find
4. **Review SECURITY_ROADMAP.md** to plan production deployment
5. **Get budget approval** for production security requirements
6. **Schedule legal review** during testing phase
7. **Research cyber insurance** options
8. **Plan upgrade timeline** to production

---

## Support Resources

### Free Resources:
- Vercel Documentation: https://vercel.com/docs
- Supabase Documentation: https://supabase.com/docs
- GitHub Issues: Track bugs in your repository
- Community Support: Vercel/Supabase Discord

### When You Need Paid Support:
- Vercel Pro: Email support, faster response
- Supabase Pro: Priority support
- Security Consultant: For production preparation

---

## Questions?

**For Testing Issues**:
- Check Vercel deployment logs
- Check Supabase database logs
- Review browser console errors

**For Security Questions**:
- Review SECURITY_ROADMAP.md
- Review SECURITY_ASSURANCE.md
- Consult security professional

**For Production Planning**:
- Review cost estimates above
- Contact legal counsel
- Get quotes for insurance
- Budget for security enhancements

Good luck with your testing deployment!
