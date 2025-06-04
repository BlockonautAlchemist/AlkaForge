# Fix Email Confirmation for Production (Vercel)

## Problem
Email confirmation links redirect to `localhost:3000` instead of your production URL `https://alka-forge.vercel.app`

## Solution
Update Supabase redirect URLs to use your production domain.

## Step-by-Step Fix

### 1. Update Supabase URL Configuration

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your AlkaForge project
3. Navigate to **Authentication** → **URL Configuration**
4. Update these settings:

**Site URL:**
```
https://alka-forge.vercel.app
```

**Redirect URLs (add both):**
```
http://localhost:3000/auth/callback
https://alka-forge.vercel.app/auth/callback
```

### 2. Test the Email Flow

1. Go to your production site: https://alka-forge.vercel.app
2. Create a new test account
3. Check your email for the confirmation link
4. Click the confirmation link
5. Should redirect to: `https://alka-forge.vercel.app/auth/callback`
6. Then automatically redirect to dashboard

### 3. Update Email Templates (Optional)

If you want to use the custom AlkaForge email template:

1. In Supabase Dashboard: **Authentication** → **Email Templates**
2. Click **"Confirm signup"**
3. Replace with content from `email_templates/confirm_signup.html`
4. Change **Sender name** to "AlkaForge" in **Authentication** → **Settings**

## Verification Checklist

- [ ] Site URL set to `https://alka-forge.vercel.app`
- [ ] Both localhost and production URLs in redirect list
- [ ] Test account created on production site
- [ ] Email confirmation link works
- [ ] Redirects to production callback page
- [ ] User gets logged in and redirected to dashboard

## Environment Variables Check

Make sure your production environment (Vercel) has these variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

You can check/update these in your Vercel dashboard under your project settings.

## Troubleshooting

**Still redirecting to localhost:**
- Clear browser cache
- Wait 5-10 minutes for Supabase changes to propagate
- Make sure you saved the settings in Supabase

**"Invalid redirect URL" error:**
- Double-check the redirect URLs are exactly:
  - `http://localhost:3000/auth/callback`
  - `https://alka-forge.vercel.app/auth/callback`
- No trailing slashes

**Email not received:**
- Check spam folder
- Try with different email provider (Gmail, Outlook, etc.)
- Verify email templates are saved in Supabase 