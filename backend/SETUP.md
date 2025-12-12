# Backend Setup Guide

## Environment Configuration

### Initial Setup

1. **Copy environment variables**: The backend requires a `.env` file with proper Supabase credentials:

```bash
# The .env file should be created from .env.migration or .env.example
cp .env.migration .env
```

2. **Verify Supabase credentials**: Ensure the following variables are set in `.env`:
   - `SUPABASE_URL` - Your Supabase project URL
   - `SUPABASE_ANON_KEY` - Your Supabase anon/public key
   - `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (for admin operations)
   - `DATABASE_URL` - PostgreSQL connection string

3. **Restart the backend**: After creating or modifying `.env`, restart the backend server:

```bash
npm run start:dev
```

## Authentication Flow

### How Token Authentication Works

1. **Frontend**: User authenticates via Supabase (Email/OTP or OAuth)
2. **Token Storage**: Supabase returns `access_token` which is stored locally
3. **API Requests**: Frontend adds `Authorization: Bearer {token}` header to all requests
4. **Backend Validation**: `SupabaseAuthGuard` validates token by calling `supabaseService.getUser(token)`
5. **Token Refresh**: Supabase SDK automatically refreshes expired tokens

### Common Issues

#### 401 Unauthorized - "Недействительный токен" (Invalid Token)

**Symptoms:**
```
ERROR ❌ [API] ❌ HTTP 401 for /api/v1/user/profile-extended
{"error": "Unauthorized", "message": "Недействительный токен", "statusCode": 401}
```

**Cause:** Backend Supabase credentials are not configured or don't match the frontend.

**Solution:**
1. Verify `backend/.env` file exists and contains correct Supabase credentials
2. Ensure `SUPABASE_URL` and `SUPABASE_ANON_KEY` match the frontend configuration (see `frontend/app.json` > `extra.eas`)
3. Restart the backend server to pick up environment variable changes

**Quick Fix:**
```bash
cd backend
cp .env.migration .env  # Copy credentials from migration file
npm run start:dev       # Restart backend
```

### Security Notes

- `.env` file is git-ignored (never commit it to version control)
- Use `.env.example` as a template with placeholder values
- In production, use proper secret management (e.g., AWS Secrets Manager, Kubernetes Secrets)
- Rotate `SUPABASE_SERVICE_ROLE_KEY` regularly (it has admin privileges)

## Development Checklist

Before starting development, ensure:

- [x] `.env` file exists in `backend/` directory
- [x] Supabase credentials match between frontend and backend
- [x] Database connection is working (`DATABASE_URL` is correct)
- [x] Backend server starts without errors
- [x] Frontend can authenticate and make API requests

## Troubleshooting

### Check Environment Variables

```bash
cd backend
node -e "require('dotenv').config(); console.log(process.env.SUPABASE_URL)"
```

Should output: `https://ayoucajwdyinyhamousz.supabase.co`

### Test Supabase Connection

```bash
cd backend
npm run start:dev
# Check logs for "Supabase client initialized"
```

### Verify Token Validation

Check backend logs when frontend makes a request:
- ✅ Good: `Supabase client initialized`
- ❌ Bad: `Supabase URL and Anon Key are required`
