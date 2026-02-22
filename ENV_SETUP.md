# Environment Variables Setup

This document explains all environment variables used in the Contest App.

## Quick Setup

1. Copy the example file:
   ```bash
   cd backend
   cp .env.example .env
   ```

2. Edit `.env` with your values (see below)

3. The `.env` file is already in `.gitignore` - it won't be committed to Git.

## Environment Variables

### Server Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Environment mode (`development` or `production`) | `development` | No |
| `PORT` | Server port number | `5000` | No |
| `FRONTEND_URL` | Frontend URL for CORS (comma-separated for multiple) | `http://localhost:5173` | No |

### Security (JWT Secrets)

| Variable | Description | Required |
|----------|-------------|----------|
| `JWT_SECRET` | Secret key for signing participant JWT tokens | **Yes** |
| `ADMIN_JWT_SECRET` | Secret key for signing admin JWT tokens | **Yes** |

**⚠️ Important:** Generate secure random secrets for production:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Admin Credentials

| Variable | Description | Required |
|----------|-------------|----------|
| `ADMIN_EMAIL` | Admin login email address | **Yes** |
| `ADMIN_PASSWORD` | Admin login password | **Yes** |

## Example .env File

```env
# Server Configuration
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:5173

# JWT Secrets (generate secure random strings)
JWT_SECRET=your-64-character-hex-string-here
ADMIN_JWT_SECRET=your-64-character-hex-string-here

# Admin Credentials
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=your-secure-password
```

## Production Deployment

When deploying to Render, Railway, or other platforms:

1. **Set environment variables** in your platform's dashboard
2. **Generate new secrets** for production (don't reuse development secrets)
3. **Set `NODE_ENV=production`**
4. **Set `FRONTEND_URL`** to your production frontend URL (e.g., `https://your-app.com`)

### Render
- Go to your service → **Environment** tab
- Add each variable manually or use `render.yaml` (already configured)

### Railway
- Go to your project → **Variables** tab
- Add each variable

## Security Best Practices

1. ✅ **Never commit `.env` files** to Git (already in `.gitignore`)
2. ✅ **Use different secrets** for development and production
3. ✅ **Generate strong random secrets** (64+ characters)
4. ✅ **Change default admin credentials** in production
5. ✅ **Use environment variables** for all sensitive data

## How to Generate Secure Secrets

```bash
# Generate JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate ADMIN_JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Troubleshooting

**"JWT_SECRET is not defined" error:**
- Make sure `.env` file exists in the `backend/` directory
- Check that `dotenv` is loaded: `require('dotenv').config()` in `server.js`
- Restart your server after creating/editing `.env`

**CORS errors:**
- Set `FRONTEND_URL`` to your frontend URL
- Include protocol: `http://` or `https://`
- For multiple URLs, use comma-separated values
