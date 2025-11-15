/**
 * Build script for API server
 * 
 * Packages the API server and its dependencies for deployment.
 * Creates a standalone Node.js application in dist/api/
 */

const fs = require('fs');
const path = require('path');

const SOURCE_DIR = path.join(__dirname, '../.storybook/api');
const DIST_DIR = path.join(__dirname, '../dist/api');
const PUBLIC_DIR = path.join(__dirname, '../public');

console.log('🏗️  Building API server...');

// Clean dist directory
if (fs.existsSync(DIST_DIR)) {
  console.log('   Cleaning dist/api directory...');
  fs.rmSync(DIST_DIR, { recursive: true, force: true });
}

// Create dist directory structure
console.log('   Creating directory structure...');
fs.mkdirSync(DIST_DIR, { recursive: true });
fs.mkdirSync(path.join(DIST_DIR, 'data'), { recursive: true });

// Copy API server files
console.log('   Copying server files...');
fs.copyFileSync(
  path.join(SOURCE_DIR, 'server.js'),
  path.join(DIST_DIR, 'server.js')
);

fs.copyFileSync(
  path.join(SOURCE_DIR, 'README.md'),
  path.join(DIST_DIR, 'README.md')
);

// Copy workout data files
console.log('   Copying workout data...');
const dataFiles = fs.readdirSync(path.join(SOURCE_DIR, 'data'))
  .filter(file => file.endsWith('.json'));

for (const file of dataFiles) {
  fs.copyFileSync(
    path.join(SOURCE_DIR, 'data', file),
    path.join(DIST_DIR, 'data', file)
  );
}

// Copy exercise index
console.log('   Copying exercise index...');
const exerciseIndexPath = path.join(PUBLIC_DIR, 'exercise-path-index.json');
if (fs.existsSync(exerciseIndexPath)) {
  fs.copyFileSync(
    exerciseIndexPath,
    path.join(DIST_DIR, 'data', 'exercise-path-index.json')
  );
} else {
  console.warn('   ⚠️  Warning: exercise-path-index.json not found in public/');
}

// Copy exercises directory
console.log('   Copying exercises directory...');
const exercisesSource = path.join(PUBLIC_DIR, 'exercises');
const exercisesDest = path.join(DIST_DIR, 'data', 'exercises');

if (fs.existsSync(exercisesSource)) {
  copyDirRecursive(exercisesSource, exercisesDest);
  console.log('   ✓ Copied exercises directory');
} else {
  console.warn('   ⚠️  Warning: exercises directory not found in public/');
}

// Create package.json for the API
console.log('   Creating package.json...');
const apiPackageJson = {
  name: 'wod-wiki-api',
  version: require('../package.json').version,
  description: 'WOD Wiki API Server',
  main: 'server.js',
  scripts: {
    start: 'node server.js'
  },
  dependencies: {
    express: require('../package.json').devDependencies.express,
    cors: require('../package.json').devDependencies.cors
  },
  engines: {
    node: '>=14.0.0'
  }
};

fs.writeFileSync(
  path.join(DIST_DIR, 'package.json'),
  JSON.stringify(apiPackageJson, null, 2)
);

// Create start script for Lambda
console.log('   Creating Lambda handler...');
const lambdaHandler = `/**
 * AWS Lambda handler for WOD Wiki API
 * 
 * This file adapts the Express app to run in AWS Lambda
 * using the serverless-http package or API Gateway proxy integration.
 * 
 * For deployment:
 * 1. Install serverless-http: npm install serverless-http
 * 2. Deploy using AWS SAM, Serverless Framework, or CDK
 */

const app = require('./server');

// For serverless-http (if using that adapter)
// const serverless = require('serverless-http');
// module.exports.handler = serverless(app);

// For API Gateway Proxy Integration (direct)
exports.handler = async (event, context) => {
  // Basic API Gateway proxy integration
  // You may need to add serverless-http or aws-serverless-express for full compatibility
  console.log('Lambda invoked with event:', JSON.stringify(event, null, 2));
  
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({
      message: 'WOD Wiki API - Use serverless-http for full Express compatibility'
    })
  };
};
`;

fs.writeFileSync(
  path.join(DIST_DIR, 'lambda.js'),
  lambdaHandler
);

// Create deployment guide
console.log('   Creating deployment guide...');
const deploymentGuide = `# API Deployment Guide

## Overview

This directory contains the built API server ready for deployment.

## Deployment Options

### Option 1: Traditional Node.js Server

Deploy to any Node.js hosting platform (Heroku, DigitalOcean, AWS EC2, etc.):

\`\`\`bash
cd dist/api
npm install --production
npm start
\`\`\`

Set environment variable:
- \`API_PORT\` - Port to run on (default: 6007)

### Option 2: AWS Lambda

1. Install serverless adapter:
   \`\`\`bash
   npm install serverless-http
   \`\`\`

2. Update lambda.js to use serverless-http (uncomment lines)

3. Create SAM template or use Serverless Framework:
   \`\`\`yaml
   # serverless.yml
   service: wod-wiki-api
   provider:
     name: aws
     runtime: nodejs18.x
   functions:
     api:
       handler: lambda.handler
       events:
         - http: ANY /
         - http: ANY /{proxy+}
   \`\`\`

4. Deploy:
   \`\`\`bash
   serverless deploy
   \`\`\`

### Option 3: Docker

Create a Dockerfile:

\`\`\`dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install --production
EXPOSE 6007
CMD ["npm", "start"]
\`\`\`

Build and run:
\`\`\`bash
docker build -t wod-wiki-api .
docker run -p 6007:6007 wod-wiki-api
\`\`\`

## Required Files

- \`server.js\` - Express server
- \`package.json\` - Node dependencies
- \`data/\` - Workout data and exercises
  - \`crossfit.json\` - CrossFit workouts
  - \`swimming.json\` - Swimming workouts
  - \`strongfirst.json\` - StrongFirst workouts
  - \`dan-john.json\` - Dan John workouts
  - \`exercise-path-index.json\` - Exercise index
  - \`exercises/\` - Exercise definitions

## Configuration

Set the \`VITE_API_URL\` environment variable during frontend build to point to your API:

\`\`\`bash
VITE_API_URL=https://api.wod.wiki/api npm run build-storybook
\`\`\`

## Testing Deployment

After deployment, test with:

\`\`\`bash
curl https://your-api-url/api/health
curl https://your-api-url/api/workouts/categories
\`\`\`
`;

fs.writeFileSync(
  path.join(DIST_DIR, 'DEPLOYMENT.md'),
  deploymentGuide
);

console.log('✅ API server built successfully in dist/api/');
console.log('');
console.log('📦 Package contents:');
console.log('   - server.js (Express application)');
console.log('   - package.json (dependencies)');
console.log('   - lambda.js (AWS Lambda handler)');
console.log('   - data/ (workout and exercise data)');
console.log('   - README.md (API documentation)');
console.log('   - DEPLOYMENT.md (deployment guide)');
console.log('');
console.log('To test locally:');
console.log('   cd dist/api && npm install && npm start');

/**
 * Recursively copy directory
 * @param {string} src Source directory
 * @param {string} dest Destination directory
 */
function copyDirRecursive(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
