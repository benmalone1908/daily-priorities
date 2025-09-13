# Deployment Guide

## Vercel Environment Variables

To deploy this app to Vercel with authentication, you need to set the following environment variables in your Vercel dashboard:

### Required Environment Variables

1. **VITE_AUTH_USERNAME**
   - Your login username
   - Example: `admin`

2. **VITE_AUTH_PASSWORD**
   - Your secure password
   - Example: `YourSecurePassword123!`

### Setting Environment Variables in Vercel

1. Go to your Vercel dashboard
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add the following variables:

```
Name: VITE_AUTH_USERNAME
Value: [your-chosen-username]
Environment: Production, Preview, Development

Name: VITE_AUTH_PASSWORD
Value: [your-secure-password]
Environment: Production, Preview, Development
```

### Local Development

For local development, the app uses the credentials from `.env.local`:
- Username: `admin`
- Password: `password123`

### Security Notes

- The `.env.local` file is gitignored and won't be committed to the repository
- Environment variables are prefixed with `VITE_` to be accessible in the client
- Authentication persists for 24 hours using localStorage
- Users are automatically logged out after 24 hours

### Authentication Features

- ✅ Simple username/password authentication
- ✅ 24-hour session persistence
- ✅ Automatic session expiry
- ✅ Logout functionality
- ✅ Protected routes
- ✅ Responsive login form
- ✅ Environment variable configuration