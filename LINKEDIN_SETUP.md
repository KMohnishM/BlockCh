# LinkedIn OAuth Integration Setup Guide

This guide will help you set up LinkedIn sign-in for your Vyaapar.AI platform.

## 🔧 **Setup Steps**

### 1. **Create LinkedIn App**
1. Go to [LinkedIn Developer Portal](https://developer.linkedin.com/)
2. Sign in with your LinkedIn account
3. Click "Create App"
4. Fill in your app details:
   - **App name**: Vyaapar.AI
   - **LinkedIn Page**: Create or select a LinkedIn page for your company
   - **App logo**: Upload your app logo
   - **Legal agreement**: Accept LinkedIn's API Terms of Use

### 2. **Configure OAuth Settings**
1. In your LinkedIn app dashboard, go to the **Auth** tab
2. Add these **Authorized redirect URLs**:
   ```
   http://localhost:3000/auth/linkedin/callback
   ```
   (Add your production URL when deploying)

3. **OAuth 2.0 scopes**: Select these scopes:
   - `openid` (required for OpenID Connect)
   - `profile` (to get user's profile information)
   - `email` (to get user's email address)

### 3. **Get Your Credentials**
1. In the **Auth** tab, copy:
   - **Client ID** 
   - **Client Secret**

### 4. **Update Environment Variables**

#### Backend (.env):
```bash
# Add to your backend/.env file
LINKEDIN_CLIENT_ID=your_linkedin_client_id_here
LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret_here
```

#### Frontend (.env):
```bash
# Add to your frontend/.env file  
REACT_APP_LINKEDIN_CLIENT_ID=your_linkedin_client_id_here
```

### 5. **Update Database Schema**
Run this SQL in your Supabase dashboard:

```sql
-- Add LinkedIn fields to profiles table
ALTER TABLE profiles 
ADD COLUMN linkedin_id VARCHAR(255) UNIQUE,
ADD COLUMN linkedin_profile_url TEXT,
ADD COLUMN picture TEXT;

-- Update auth_method constraint
ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS profiles_auth_method_check;

ALTER TABLE profiles 
ADD CONSTRAINT profiles_auth_method_check 
CHECK (auth_method IN ('email', 'web3', 'linkedin'));

-- Create index for LinkedIn ID
CREATE INDEX IF NOT EXISTS idx_profiles_linkedin_id ON profiles(linkedin_id);
```

## 🎯 **How It Works**

### **User Flow:**
1. User clicks "Continue with LinkedIn" on login page
2. Redirected to LinkedIn OAuth authorization
3. User grants permission to your app
4. LinkedIn redirects back to `/auth/linkedin/callback`
5. Backend exchanges authorization code for access token
6. Backend fetches user profile from LinkedIn API
7. Backend creates/updates user profile in database
8. User is logged in and redirected to dashboard

### **New Features Added:**
✅ **LinkedIn OAuth Button** - Blue LinkedIn-branded sign-in button
✅ **Callback Handler** - Processes LinkedIn OAuth response  
✅ **Backend Integration** - Exchanges codes and fetches profiles
✅ **Database Support** - Stores LinkedIn ID and profile data
✅ **Profile Pictures** - Shows LinkedIn profile photos
✅ **Auto Account Creation** - Creates accounts for new LinkedIn users

## 🚀 **Testing**

1. **Start your servers:**
   ```bash
   # Backend
   cd backend && npm run dev
   
   # Frontend  
   cd frontend && npm start
   ```

2. **Test the flow:**
   - Go to `http://localhost:3000/login`
   - Click "Continue with LinkedIn"
   - Complete LinkedIn authorization
   - Should redirect to dashboard with user logged in

## 🔒 **Security Features**

✅ **State Parameter Validation** - Prevents CSRF attacks
✅ **JWT Token Generation** - Secure session management  
✅ **Profile Data Validation** - Validates LinkedIn response
✅ **Duplicate Prevention** - Links existing accounts by email
✅ **Error Handling** - Graceful failure with user feedback

## 📱 **UI Updates**

The login page now includes:
- **LinkedIn button** with official branding
- **Wallet connect** option  
- **Traditional email/password** login
- **Responsive design** for all screen sizes

## 🎨 **Profile Integration**

LinkedIn users get:
- **Profile picture** from LinkedIn
- **Professional profile URL** stored
- **LinkedIn ID** for future API calls
- **Seamless account linking** with existing emails

## 🚨 **Important Notes**

1. **LinkedIn Review**: For production, LinkedIn may require app review
2. **HTTPS Required**: LinkedIn requires HTTPS in production
3. **Rate Limits**: LinkedIn has API rate limits (check their docs)
4. **Privacy**: Inform users about data collection in your privacy policy

## 🛠️ **Troubleshooting**

**Common Issues:**
- **Invalid redirect URI**: Ensure exact URL match in LinkedIn app settings
- **Scope issues**: Make sure you have `openid`, `profile`, and `email` scopes
- **Environment variables**: Double-check client ID/secret are correct
- **Database errors**: Run the migration SQL in Supabase

Your LinkedIn integration is now ready! Users can sign up and log in using their LinkedIn accounts seamlessly.