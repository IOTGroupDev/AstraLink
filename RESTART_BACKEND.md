# How to Restart Backend Server

## Problem

Backend code was updated but the running server still uses the old code.

**Error:**

```
❌ API ошибка: /user/photos/.../set-primary 400 Request failed with status code 400
```

**Reason:** The fix was committed (`f31a89c - fix: resolve 400 error when setting primary photo`) but the backend server needs to be restarted to apply changes.

---

## Solution: Restart Backend

### Option 1: Terminal/IDE Restart

If backend is running in a terminal or IDE:

1. **Stop the server:**
   - Press `Ctrl+C` in the terminal where backend is running
   - Or kill the process in your IDE

2. **Start the server:**

   ```bash
   cd backend
   npm run start:dev
   # or
   npm run start
   ```

3. **Verify restart:**
   - Check logs for: "Nest application successfully started"
   - Try setting primary photo again

---

### Option 2: PM2 Restart (if using PM2)

If backend is managed by PM2:

```bash
# Restart backend process
pm2 restart backend

# Check status
pm2 status

# View logs
pm2 logs backend
```

---

### Option 3: Docker Restart (if using Docker)

If backend is in a Docker container:

```bash
# Restart container
docker-compose restart backend

# Or rebuild and restart
docker-compose up --build -d backend

# Check logs
docker-compose logs -f backend
```

---

### Option 4: Systemd Restart (if using systemd)

If backend is a systemd service:

```bash
sudo systemctl restart astralink-backend

# Check status
sudo systemctl status astralink-backend
```

---

## Verify Fix Applied

After restarting backend, check:

1. **Check backend logs:**

   ```
   [Nest] INFO [NestFactory] Starting Nest application...
   [Nest] INFO [InstanceLoader] UserPhotosModule dependencies initialized
   ```

2. **Test API endpoint:**

   ```bash
   curl -X POST \
     http://localhost:3000/api/user/photos/<photoId>/set-primary \
     -H "Authorization: Bearer <token>"
   ```

3. **Expected result:**
   ```json
   { "success": true }
   ```

---

## What Was Fixed

**File:** `backend/src/user/user-photos.service.ts`

**Change:**

- Added `setPrimaryDirect()` method that uses admin client
- No longer depends on missing RPC function `set_primary_photo`

**File:** `backend/src/user/user-photos.controller.ts`

**Change:**

```typescript
// Before (broken):
await this.photosService.setPrimaryWithToken(token, photoId);

// After (fixed):
await this.photosService.setPrimaryDirect(userId, photoId);
```

---

## Frontend

Frontend changes were already applied (app rebuild/refresh):

- No changes needed on mobile app
- Just restart backend and test

---

## Expected Behavior After Restart

✅ **Before:** 400 Bad Request
✅ **After:** 200 OK with `{ "success": true }`

When user taps on a photo to set it as primary:

1. Request sent to `/user/photos/:photoId/set-primary`
2. Backend validates photo ownership
3. Sets all user photos to `is_primary = false`
4. Sets selected photo to `is_primary = true`
5. Returns `{ "success": true }`
6. Frontend shows: "Главное фото установлено" ✅

---

## Troubleshooting

### Still getting 400 after restart?

1. **Check backend logs for errors:**

   ```bash
   tail -f backend/logs/error.log
   # or
   pm2 logs backend --err
   ```

2. **Verify photoId exists:**

   ```sql
   SELECT * FROM user_photos WHERE id = '<photoId>';
   ```

3. **Check Supabase admin client:**
   - Ensure `SUPABASE_SERVICE_ROLE_KEY` is set in `.env`
   - Admin client needs full access to `user_photos` table

4. **Clear any caches:**
   ```bash
   npm run build
   # Then restart
   ```

---

## Contact

If issue persists after restart, check:

- Backend logs for detailed error
- Supabase database connection
- Environment variables (`.env` file)
