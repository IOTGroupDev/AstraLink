# Nginx Configuration for AstraLink

This directory contains nginx configuration files for the AstraLink API reverse proxy.

## Files

- `nginx.conf` - Main nginx configuration with performance and security settings
- `conf.d/astralink.conf` - Server block configuration (uses environment variables)
- `docker-entrypoint.sh` - Script to substitute environment variables at runtime

## Environment Variables

The nginx configuration uses the following environment variables:

- `DOMAIN` - Your domain name (e.g., `api.astralink.com`)

These variables are automatically substituted when the nginx container starts.

## Usage

### Development (without SSL)

For local development without nginx:

```bash
docker-compose up backend redis
```

### Production (with nginx and SSL)

1. Set the `DOMAIN` environment variable in your `.env` file:

```bash
DOMAIN=api.astralink.com
SSL_EMAIL=admin@astralink.com
```

2. Start services with production profile:

```bash
docker-compose --profile production up -d
```

3. The nginx container will:
   - Automatically substitute `${DOMAIN}` in the configuration
   - Handle HTTP to HTTPS redirect
   - Proxy requests to the backend
   - Serve static uploads from `/app/uploads`
   - Apply rate limiting and security headers

## SSL Certificates

The configuration expects SSL certificates from Let's Encrypt at:
- `/etc/letsencrypt/live/${DOMAIN}/fullchain.pem`
- `/etc/letsencrypt/live/${DOMAIN}/privkey.pem`

To obtain certificates:

```bash
# Run certbot service once to get initial certificates
docker-compose --profile production run --rm certbot

# Reload nginx after certificates are obtained
docker-compose --profile production restart nginx
```

## Rate Limiting

The configuration includes rate limiting:

- **API endpoints** (`/api`): 10 requests/second (burst: 20)
- **Auth endpoints** (`/auth`, `/login`, etc.): 5 requests/minute (burst: 3)
- **Health check** (`/health`): No rate limiting

## Security Headers

All HTTPS responses include:
- Strict-Transport-Security (HSTS)
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- X-XSS-Protection
- Referrer-Policy: strict-origin-when-cross-origin

## File Uploads

- Maximum upload size: 10MB (configurable via `client_max_body_size`)
- Uploads are proxied to `/api/upload` with extended timeouts (120s)
- Static uploads are served from `/uploads` with 7-day cache

## Logs

Nginx logs are available in the container:
- Access log: `/var/log/nginx/access.log`
- Error log: `/var/log/nginx/error.log`

View logs:

```bash
docker-compose logs -f nginx
```

## Custom Configuration

To add custom nginx configuration:

1. Create a new `.conf` file in `nginx/conf.d/`
2. Use `${VARIABLE_NAME}` for environment variables
3. Mount the file in `docker-compose.yml`
4. Restart the nginx container

## Troubleshooting

### Container fails to start

Check if environment variables are set:

```bash
docker-compose config
```

### 502 Bad Gateway

- Verify backend container is running: `docker-compose ps`
- Check backend health: `docker-compose exec backend curl http://localhost:3000/health`
- Check nginx logs: `docker-compose logs nginx`

### SSL certificate errors

- Ensure DNS records point to your server
- Verify DOMAIN and SSL_EMAIL are set in `.env`
- Check certbot logs: `docker-compose logs certbot`
- Verify certificate files exist in the certbot volume
