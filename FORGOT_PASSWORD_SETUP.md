# Forgot Password Setup Guide

## Backend Implementation Complete ✅

The forgot password functionality has been successfully implemented with the following features:

### New API Endpoints

1. **POST /api/auth/forgot-password**
   - Sends 6-digit OTP to user's email
   - OTP valid for 10 minutes
   - Request body: `{ "email": "user@example.com" }`

2. **POST /api/auth/verify-otp**
   - Verifies the OTP before password reset
   - Request body: `{ "email": "user@example.com", "otp": "123456" }`

3. **POST /api/auth/reset-password**
   - Resets password with verified OTP
   - Request body: `{ "email": "user@example.com", "otp": "123456", "newPassword": "newpass123", "confirmPassword": "newpass123" }`

### Email Configuration

You need to configure email settings in your `.env` file:

```env
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-specific-password
```

#### For Gmail:
1. Go to your Google Account settings
2. Enable 2-Step Verification
3. Generate an App Password: https://myaccount.google.com/apppasswords
4. Use the generated password in `EMAIL_PASSWORD`

#### For Other Email Services:
Change `EMAIL_SERVICE` to your provider (e.g., 'outlook', 'yahoo', 'hotmail')

### Security Features

- OTP is hashed before storing in database
- OTP expires after 10 minutes
- All refresh tokens cleared on password reset
- Email validation and sanitization
- Password confirmation required
- Cannot reuse old password
- Secure error messages (doesn't reveal if email exists)

### Testing the API

Use Postman or any API client:

**Step 1: Request OTP**
```bash
POST http://localhost:5000/api/auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Step 2: Verify OTP (Optional)**
```bash
POST http://localhost:5000/api/auth/verify-otp
Content-Type: application/json

{
  "email": "user@example.com",
  "otp": "123456"
}
```

**Step 3: Reset Password**
```bash
POST http://localhost:5000/api/auth/reset-password
Content-Type: application/json

{
  "email": "user@example.com",
  "otp": "123456",
  "newPassword": "newPassword123",
  "confirmPassword": "newPassword123"
}
```

## Next Steps: Frontend Implementation

Now you can build the React frontend with these pages:

### 1. Forgot Password Page
- Input field for email
- "Send OTP" button
- Navigate to OTP verification page on success

### 2. OTP Verification Page
- Input field for 6-digit OTP
- "Verify OTP" button
- Resend OTP option
- Navigate to reset password page on success

### 3. Reset Password Page
- Input field for new password
- Input field for confirm password
- "Reset Password" button
- Navigate to login page on success

### Frontend Flow Example

```javascript
// 1. Send OTP
const sendOTP = async (email) => {
  const response = await fetch('http://localhost:5000/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  return response.json();
};

// 2. Verify OTP
const verifyOTP = async (email, otp) => {
  const response = await fetch('http://localhost:5000/api/auth/verify-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp })
  });
  return response.json();
};

// 3. Reset Password
const resetPassword = async (email, otp, newPassword, confirmPassword) => {
  const response = await fetch('http://localhost:5000/api/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp, newPassword, confirmPassword })
  });
  return response.json();
};
```

## Files Modified/Created

- ✅ `src/routes/auth.js` - Added 3 new endpoints
- ✅ `src/models/User.js` - Added OTP fields
- ✅ `src/services/emailService.js` - Created email service
- ✅ `.env.example` - Added email configuration
- ✅ `package.json` - Added nodemailer dependency

## Important Notes

- Make sure to restart your backend server after updating `.env`
- Test email sending before deploying to production
- OTP emails might go to spam folder initially
- Consider adding rate limiting for OTP requests in production
