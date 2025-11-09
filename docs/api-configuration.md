# API Configuration and Deployment

This document describes how to configure and deploy the WOD Wiki API server for production use.

## Overview

The WOD Wiki application consists of two parts:
1. **Frontend**: Storybook static site (deployed to GitHub Pages at https://wod.wiki)
2. **API Server**: Node.js/Express API (needs separate deployment)

The frontend is built with a configurable API URL, allowing it to connect to any deployed API server.

## Configuration

### Environment Variables

The API URL is configured via environment variable at **build time**:

- `VITE_API_URL` - Base URL for the API (e.g., `https://api.wod.wiki/api`)

#### Development (Local)

For local development, the API runs on `localhost:6007` by default:

```bash
# .env.development (created automatically)
VITE_API_URL=http://localhost:6007/api
API_PORT=6007
```

Run both frontend and API together:
```bash
npm run storybook
```

#### Production

Set `VITE_API_URL` during the frontend build:

```bash
# Build with custom API URL
VITE_API_URL=https://api.wod.wiki/api npm run build:frontend

# Or set in .env file before building
echo "VITE_API_URL=https://api.wod.wiki/api" > .env
npm run build:frontend
```

### GitHub Actions Configuration

The build workflow supports API URL configuration via repository variables:

1. Go to repository Settings → Secrets and variables → Actions → Variables
2. Add variable `VITE_API_URL` with your production API URL
3. Builds will automatically use this URL

If not set, defaults to `http://localhost:6007/api` for compatibility.

## Building the API

### Build Command

```bash
npm run build:api
```

This creates a standalone Node.js application in `dist/api/` with:
- `server.js` - Express application
- `package.json` - Dependencies configuration
- `lambda.js` - AWS Lambda handler template
- `data/` - Workout and exercise data
- `DEPLOYMENT.md` - Deployment guide

### Build All (API + Frontend)

```bash
npm run build:all
# or simply
npm run build
```

This builds both the API server and the frontend Storybook site.

## Deployment Options

### Option 1: GitHub Pages + Separate API Server

**Frontend (GitHub Pages):**
- Automatically deployed by GitHub Actions to https://wod.wiki
- Configure `VITE_API_URL` in repository variables

**API Server (Any Node.js Host):**
1. Build the API: `npm run build:api`
2. Deploy `dist/api/` to your hosting platform
3. See [dist/api/DEPLOYMENT.md](../dist/api/DEPLOYMENT.md) for platform-specific guides

Recommended platforms:
- **Heroku**: Simple deployment with Git push
- **AWS Lambda**: Serverless deployment (see Lambda section below)
- **DigitalOcean App Platform**: Container-based deployment
- **Railway.app**: Quick deployment from GitHub

### Option 2: AWS Lambda Deployment

The API is packaged with a Lambda handler template:

1. Build the API:
   ```bash
   npm run build:api
   cd dist/api
   npm install serverless-http
   ```

2. Update `lambda.js` to use serverless-http (uncomment the relevant lines)

3. Deploy using AWS SAM, Serverless Framework, or AWS CDK

**Example with Serverless Framework:**

```yaml
# serverless.yml
service: wod-wiki-api
provider:
  name: aws
  runtime: nodejs18.x
  region: us-east-1
functions:
  api:
    handler: lambda.handler
    events:
      - http:
          path: /
          method: ANY
      - http:
          path: /{proxy+}
          method: ANY
```

Deploy:
```bash
npx serverless deploy
```

4. Update `VITE_API_URL` with your Lambda endpoint URL

### Option 3: Docker Deployment

Build and run as Docker container:

1. Create Dockerfile in `dist/api/`:
   ```dockerfile
   FROM node:18-alpine
   WORKDIR /app
   COPY . .
   RUN npm install --production
   EXPOSE 6007
   CMD ["npm", "start"]
   ```

2. Build and deploy:
   ```bash
   docker build -t wod-wiki-api dist/api
   docker run -p 6007:6007 wod-wiki-api
   ```

3. Deploy to Docker-based platforms (AWS ECS, Google Cloud Run, Azure Container Instances)

## Testing Your Deployment

After deploying the API, test it:

```bash
# Health check
curl https://your-api-url/api/health

# Get workout categories
curl https://your-api-url/api/workouts/categories

# Get specific workout
curl https://your-api-url/api/workouts/crossfit/Fran
```

Then rebuild the frontend with your API URL:

```bash
VITE_API_URL=https://your-api-url/api npm run build:frontend
```

## API Endpoints

The API provides the following endpoints:

### Health & Status
- `GET /api/health` - Health check

### Workouts
- `GET /api/workouts/categories` - List all workout categories
- `GET /api/workouts/:category` - Get all workouts in a category
- `GET /api/workouts/:category/:name` - Get specific workout

### Exercises
- `GET /api/exercises/index` - Get complete exercise index (873+ exercises)
- `GET /api/exercises/search?q=<query>&limit=<n>` - Search exercises
- `GET /api/exercises/:path` - Get specific exercise details

## Security Considerations

### CORS Configuration

The API server is configured with CORS for local development. For production:

1. Update CORS origins in `server.js`:
   ```javascript
   app.use(cors({
     origin: ['https://wod.wiki', 'https://www.wod.wiki'],
     credentials: true
   }));
   ```

2. Or set environment variable:
   ```bash
   CORS_ORIGIN=https://wod.wiki node server.js
   ```

### Rate Limiting

Consider adding rate limiting for production:

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

## Troubleshooting

### Frontend can't connect to API

1. Check browser console for CORS errors
2. Verify `VITE_API_URL` was set correctly during build
3. Test API endpoint directly: `curl https://your-api-url/api/health`
4. Check API CORS configuration allows your frontend domain

### API returns 404 for exercises

1. Verify `dist/api/data/exercises/` directory exists and has content
2. Check `exercise-path-index.json` is present
3. Rebuild API: `npm run build:api`

### Exercise data loading slowly

The API includes 873+ exercise definitions. Consider:
- Using a CDN to serve exercise images
- Implementing Redis caching for frequently accessed exercises
- Adding gzip compression middleware

## Future Enhancements

Potential improvements for production deployments:

1. **CDN Integration**: Serve static exercise data from CDN
2. **Caching Layer**: Redis for frequently accessed workouts/exercises
3. **Database Migration**: Move from JSON files to PostgreSQL/MongoDB
4. **API Versioning**: Support multiple API versions (v1, v2)
5. **Authentication**: Add user accounts and personalized workouts
6. **Real-time Updates**: WebSocket support for live workout tracking

## Support

For issues with API deployment:
- Check [GitHub Issues](https://github.com/SergeiGolos/wod-wiki/issues)
- Review [API Server README](../.storybook/api/README.md)
- See platform-specific guides in `dist/api/DEPLOYMENT.md`
