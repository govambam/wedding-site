# Create Invitation Feature - Setup & Testing Guide

## ✅ Implementation Complete!

The "Create Invitation" feature has been fully implemented with:
- Backend API endpoint with authentication
- Frontend form with validation
- Success/error handling
- Navigation integration

## 🔧 Setup Instructions

### Step 1: Get Your Supabase Service Role Key

1. **Go to your Supabase Dashboard:**
   - Visit https://supabase.com/dashboard
   - Select your project

2. **Navigate to Settings:**
   - Click "Settings" in the left sidebar
   - Click "API"

3. **Copy the Service Role Key:**
   - Scroll down to "Project API keys"
   - Find the section labeled "service_role"
   - Click "Reveal" and copy the key
   - ⚠️ **WARNING**: This is a secret key with admin privileges. Never commit it to git or share it publicly!

4. **Update your .env file:**
   - Open `/Users/ivan/wedding-site/.env`
   - Replace `YOUR_SERVICE_ROLE_KEY_HERE` with your actual service role key:
   ```
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

### Step 2: Install Dependencies

Make sure you have the necessary server dependencies:

```bash
cd /Users/ivan/wedding-site
npm install @supabase/supabase-js dotenv express cors
```

### Step 3: Restart Your Development Server

After updating the .env file:

```bash
# Stop your current dev server (Ctrl+C)
# Then restart it
npm run dev
```

## 🧪 Testing the Feature

### Test Scenario 1: Create a Single Invitation

1. **Log in as admin:**
   - Go to http://localhost:5173/admin/login
   - Use your admin credentials

2. **Navigate to Create Invitation:**
   - Go to Admin Dashboard
   - Click "Guests" in the navigation
   - Click the green "+ New Invitation" button
   - You should be at `/admin/invitations/new`

3. **Fill out the form:**
   - **First Name:** John
   - **Last Name:** Doe
   - **Email:** john.doe@example.com (use a test email)
   - **Invitation Type:** Select "Single"
   - **Accommodation Group:** Villa Bokeh
   - **Lake Atitlan:** Check or uncheck
   - **Invite Code:** JOHNDOE2027

4. **Submit:**
   - Click "Create Invitation"
   - You should see a success screen with the invite code displayed

5. **Verify:**
   - Click "Back to Guests"
   - You should see John Doe in the guests list

### Test Scenario 2: Create a Couple Invitation

1. **Click "+ New Invitation" again**

2. **Fill out the form:**
   - **First Name:** Jane
   - **Last Name:** Smith
   - **Email:** jane.smith@example.com
   - **Invitation Type:** Select "Couple"
   - **Second Guest First Name:** Bob
   - **Second Guest Last Name:** Smith
   - **Accommodation Group:** El Convento Boutique Hotel
   - **Invite Code:** SMITHS2027

3. **Submit and verify success**

### Test Scenario 3: Duplicate Email Error

1. **Try to create another invitation with the same email:**
   - Use john.doe@example.com again
   - Click "Create Invitation"
   - **Expected:** Red error banner saying "This email is already registered..."

### Test Scenario 4: Duplicate Invite Code Error

1. **Use a different email but same invite code:**
   - Email: different@example.com
   - Invite Code: JOHNDOE2027 (already used)
   - **Expected:** Red error banner saying "This invite code is already in use..."

### Test Scenario 5: Validation Errors

1. **Try to submit with missing fields:**
   - Leave first name empty
   - **Expected:** Red error under the field

2. **Try invalid email:**
   - Email: notanemail
   - **Expected:** "Invalid email format" error

3. **Try invite code with spaces:**
   - Invite Code: "CODE WITH SPACES"
   - **Expected:** "Invite code must be alphanumeric with no spaces" error

### Test Scenario 6: Test Login with Created Invitation

1. **Log out of admin**

2. **Go to regular login:** http://localhost:5173/login

3. **Log in with created guest credentials:**
   - Email: john.doe@example.com
   - Password: JOHNDOE2027 (the invite code)
   - **Expected:** Successfully log in and see the wedding site

## 🎯 Feature Overview

### Backend (`/server`)

**Files Created:**
- `utils/supabaseAdmin.ts` - Supabase admin client with service role
- `middleware/adminAuth.ts` - Authentication and admin verification middleware
- `routes/invitations.ts` - API endpoint for creating invitations
- `index.ts` - Updated with new route

**API Endpoint:**
- **URL:** `POST /api/admin/invitations/create`
- **Auth:** Requires Bearer token (admin only)
- **Request Body:**
  ```json
  {
    "primaryFirstName": "John",
    "primaryLastName": "Doe",
    "primaryEmail": "john@example.com",
    "inviteType": "single",
    "secondFirstName": "",
    "secondLastName": "",
    "accommodationGroup": "Villa Bokeh",
    "invitedToAtitlan": false,
    "inviteCode": "JOHNDOE2027"
  }
  ```

### Frontend (`/client`)

**Files Created:**
- `pages/admin/AdminCreateInvitation.tsx` - Full form page with validation

**Files Modified:**
- `App.tsx` - Added route for `/admin/invitations/new`
- `pages/admin/AdminGuests.tsx` - Added "+ New Invitation" button

### Features

✅ **Form Validation:**
- Client-side validation for all fields
- Server-side validation for duplicates
- Proper error messages

✅ **Three Invitation Types:**
- Single (one guest)
- Couple (two guests)
- Plus One (one guest + unnamed plus one)

✅ **Automatic Account Creation:**
- Creates Supabase auth user
- Auto-confirms email
- Uses invite code as password

✅ **Database Records:**
- Creates invite record
- Creates primary guest record
- Creates second guest record (for couples)

✅ **Error Handling:**
- Duplicate email detection
- Duplicate invite code detection
- Transaction rollback on failure
- User-friendly error messages

✅ **Success Flow:**
- Clear success message
- Displays invite code prominently
- Options to create another or go back

## 🐛 Troubleshooting

### Error: "Missing Supabase environment variables"

**Solution:** Make sure you updated `.env` with your service role key and restarted the dev server.

### Error: "Failed to create authentication account"

**Possible causes:**
1. Service role key is incorrect
2. Email already exists in Supabase Auth
3. Network/Supabase connection issue

**Solution:** Check Supabase dashboard → Authentication → Users to see if the user was created.

### Error: "Admin access required"

**Solution:** Make sure your admin user is in the `admin_users` table with the correct email.

### Form not submitting

**Solution:** Check browser console for errors. Make sure:
- Server is running on the correct port
- CORS is enabled
- You're logged in as admin

### Cannot find created guest in guests list

**Solution:**
- Refresh the guests page
- Check Supabase dashboard → Table Editor → guests
- Verify the invite was created in the invites table

## 📝 Next Steps (Optional Enhancements)

Ideas for future improvements:
- Bulk invitation creation (CSV import)
- Email sending integration (send invite via email)
- Edit existing invitations
- Delete invitations
- Resend invitation emails
- Custom email templates
- Invitation preview before creating

## 🎉 You're All Set!

The Create Invitation feature is ready to use. Follow the testing scenarios above to verify everything works correctly!
