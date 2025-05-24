# Email Confirmation Setup Guide

This guide explains how to properly configure email confirmation for your AlkaForge application.

## Problem

Users were unable to login or create accounts because the app was configured to require email confirmation, but the UI didn't inform users to check their email after signup.

## Solution Implemented

1. **Updated Signup Flow**: The signup page now properly handles both scenarios:
   - If email confirmation is disabled: Users are immediately logged in
   - If email confirmation is enabled: Users see a message to check their email

2. **Added Email Confirmation Page**: Created `/auth/callback` page to handle email verification links

3. **Improved UX**: Clear messaging and proper error handling throughout the flow

## Required Supabase Configuration

### 1. Email Confirmation Settings

In your Supabase project dashboard:

1. Go to **Authentication > Settings**
2. Under **Email** section:
   - **Enable email confirmations**: Toggle this based on your preference
   - **Secure email change**: Recommended to enable

### 2. Site URL Configuration

Configure the following URLs in **Authentication > URL Configuration**:

- **Site URL**: `https://yourdomain.com` (for production) or `http://localhost:3000` (for development)
- **Redirect URLs**: Add these URLs to allow redirects:
  - `http://localhost:3000/auth/callback` (for development)
  - `https://yourdomain.com/auth/callback` (for production)

### 3. Email Templates (Optional)

You can customize the email templates in **Authentication > Email Templates**:

- **Confirm signup**: Customize the email users receive to confirm their account
- **Magic link**: For passwordless login (if you implement it later)
- **Change email address**: For email change confirmations

## Testing the Flow

### With Email Confirmation Enabled:

1. User signs up with email/password
2. User sees "Check your email" message
3. User clicks link in email
4. User is redirected to `/auth/callback`
5. User is automatically logged in and redirected to dashboard

### With Email Confirmation Disabled:

1. User signs up with email/password
2. User is immediately logged in and redirected to dashboard

## Troubleshooting

### "Invalid or expired confirmation link" Error

- Check that your Site URL and Redirect URLs are correctly configured in Supabase
- Ensure the email link hasn't expired (default is 24 hours)
- Verify that the user hasn't already confirmed their email

### Email Not Received

- Check spam/junk folder
- Verify email address was entered correctly
- Check Supabase logs for delivery issues
- Consider using a custom SMTP provider in production

### Redirect Issues

- Ensure redirect URLs in Supabase match your domain exactly
- Check that the `/auth/callback` page is accessible
- Verify SSL configuration for production domains

## Environment Variables

Make sure these are set in your `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Files Modified

- `src/app/signup/page.tsx` - Added email confirmation handling
- `src/app/auth/callback/page.tsx` - New page for handling email confirmations
- `src/lib/react-icons-compat.tsx` - May need to add more icons if needed

## Production Considerations

1. **Custom Email Provider**: Consider using SendGrid, Mailgun, or similar for better email delivery
2. **Email Rate Limiting**: Implement rate limiting to prevent abuse
3. **Email Verification Status**: Consider showing verification status in user dashboard
4. **Resend Verification**: Add option for users to resend confirmation emails

## Next Steps

1. Test the signup flow with email confirmation enabled
2. Configure proper redirect URLs for your production domain
3. Customize email templates to match your brand
4. Consider implementing additional features like password reset emails 