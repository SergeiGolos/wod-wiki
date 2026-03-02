# WOD Wiki TV Casting - AWS Production Deployment Guide

This guide details the architecture and steps required to deploy the WOD Wiki application and its WebSocket Relay Server to AWS for production use.

## Target Architecture

*   **Frontend Web App (Storybook/React App):** `https://wod.wiki`
*   **WebSocket Relay Server:** `wss://chromecast.wod.wiki/ws` (Note: Must be `wss://` because modern browsers block insecure `ws://` connections from secure `https://` pages).

---

## 1. Architecture Overview

### Frontend (Static Site)
*   **Storage:** Amazon S3 (configured for static website hosting).
*   **CDN / SSL:** Amazon CloudFront (distributes the S3 content globally and terminates the SSL connection).
*   **DNS:** Amazon Route 53 (points `wod.wiki` to the CloudFront distribution).
*   **SSL Certificate:** AWS Certificate Manager (ACM) - Must be in `us-east-1` for CloudFront.

### WebSocket Relay Server (Node.js/Bun)
*   **Compute:** Amazon ECS (Elastic Container Service) with AWS Fargate (serverless containers), or a simple EC2 instance (e.g., t3.micro).
*   **Load Balancer:** Application Load Balancer (ALB). ALBs natively support WebSockets and will handle SSL termination.
*   **DNS:** Amazon Route 53 (points `chromecast.wod.wiki` to the ALB).
*   **SSL Certificate:** AWS Certificate Manager (ACM) - Can be in your local region (e.g., `us-west-2`).

---

## 2. Configuration Updates for Production

Before building, you must ensure the application points to the correct production WebSocket URL.

### Update `src/services/cast/config.ts`

Modify your configuration to use the production URL when deployed:

```typescript
/**
 * Cast Configuration
 */
const getRelayUrl = () => {
    // 1. URL Override
    const params = new URLSearchParams(window.location.search || window.location.hash.split('?')[1]);
    const override = params.get('relay');
    if (override) return override;

    // 2. Production Environment
    if (import.meta.env.PROD || window.location.hostname === 'wod.wiki') {
        return 'wss://chromecast.wod.wiki/ws';
    }

    // 3. Local Development (Tailscale / LAN)
    const host = import.meta.env.VITE_CAST_RELAY_HOST || window.location.hostname;
    return `ws://${host}:8080/ws`;
};

export const RELAY_URL = getRelayUrl();
```

---

## 3. Step-by-Step Deployment Instructions

### Phase 1: SSL Certificates (ACM)
1.  Go to **AWS Certificate Manager (ACM)**.
2.  Request a public certificate for `wod.wiki` and `*.wod.wiki`.
3.  Validate via DNS (Route 53 will do this automatically if your domain is hosted there).
4.  *Crucial:* Request the certificate in the `us-east-1` (N. Virginia) region. CloudFront requires certificates to be in this region.

### Phase 2: Frontend Deployment (S3 + CloudFront)
1.  **Build the app:** Run `npm run build:app` (or `npm run build` for Storybook).
2.  **S3 Bucket:** Create an S3 bucket named `wod.wiki` (or similar). Disable "Block all public access" and apply a bucket policy allowing public read (`s3:GetObject`).
3.  **Upload:** Upload the contents of your `dist/` or `storybook-static/` folder to the S3 bucket.
4.  **CloudFront:**
    *   Create a new CloudFront Distribution.
    *   Set the Origin Domain to your S3 bucket endpoint.
    *   Under "Viewer Protocol Policy", select **Redirect HTTP to HTTPS**.
    *   Under "Alternate Domain Names (CNAMEs)", add `wod.wiki` and `www.wod.wiki`.
    *   Select the Custom SSL certificate you created in Phase 1.
    *   Set the "Default Root Object" to `index.html`.
5.  **Route 53:** Create an `A` record (Alias) for `wod.wiki` pointing to your CloudFront distribution.

### Phase 3: WebSocket Relay Server Deployment (ECS + ALB)
1.  **Containerize the Server:**
    *   Create a `Dockerfile` in your root directory for the relay server.
    ```dockerfile
    FROM oven/bun:1
    WORKDIR /app
    COPY package.json bun.lock ./
    COPY server/package.json ./server/
    RUN bun install
    COPY server/ ./server/
    EXPOSE 8080
    CMD ["bun", "server/src/index.ts"]
    ```
2.  **Push to ECR:** Build your Docker image and push it to Amazon Elastic Container Registry (ECR).
3.  **Create an ECS Cluster & Task Definition:**
    *   Create a Fargate cluster.
    *   Create a Task Definition using your ECR image. Map port `8080`.
4.  **Application Load Balancer (ALB):**
    *   Create an Internet-facing ALB.
    *   Create an HTTPS Listener (Port 443) using the SSL certificate for `*.wod.wiki`.
    *   Create a Target Group pointing to your ECS Tasks on port `8080`. Ensure "Stickiness" (Session affinity) is enabled if you ever scale beyond 1 instance (though WebSockets are long-lived, ALB handles them well).
5.  **ECS Service:** Run your Task Definition as a Service, placing it behind the Target Group created above.
6.  **Route 53:** Create an `A` record (Alias) for `chromecast.wod.wiki` pointing to your ALB.

---

## 4. Why `wss://` is Required
Because your frontend (`wod.wiki`) will be served over HTTPS, browser security models **strictly forbid** opening a non-secure WebSocket (`ws://`) from a secure page. You *must* use `wss://`.

The Application Load Balancer (ALB) makes this easy. The ALB terminates the SSL connection (`wss://`) and passes the traffic as plain HTTP/WS (`ws://`) to your container running on port 8080. You do not need to install SSL certificates inside your Node/Bun app.

## 5. Chromecast "Just Works" Flow
When deployed this way:
1.  User opens `https://wod.wiki` on their phone/laptop.
2.  They click Cast.
3.  The Web App connects to `wss://chromecast.wod.wiki/ws`.
4.  The Chromecast opens `https://wod.wiki/#/tv`.
5.  The Chromecast connects to `wss://chromecast.wod.wiki/ws`.
6.  The relay server pairs them up. No local IP addresses or Tailscale needed!
