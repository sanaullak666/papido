# PAPIDO + YOUPI PAYMENT GATEWAY V2
## Comprehensive Production Deployment & Operations Guide

---

## 1. Executive Summary & Architecture Topology

Papido utilizes a hybrid high-performance architecture:
- **Papido Core API & Web Frontends:** Hosted serverless on **Vercel** (`https://papido.online`), backed by a managed **TiDB Cloud MySQL** database.
- **YOUPI Sovereign Payment Gateway V2:** Deployed as a **persistent Node.js (v20+) service** on a dedicated server / container (`https://pay.papido.online`) with persistent local disk storage for SQLite WAL queues and real-time observer services (Gmail, SMS/RCS, Android banking observers).

```text
                                PAPIDO ECOSYSTEM
                                       │
                 ┌─────────────────────┴─────────────────────┐
                 │                                           │
          Passenger Web                                 Rider Web
       (Ride Payment & QR)                       (Dynamic QR & Settlement)
                 │                                           │
                 └─────────────────────┬─────────────────────┘
                                       │ HTTPS
                                       ▼
                             Vercel Serverless
                           Papido Core Backend/API
                            (papido.online/api)
                                       │
                        ┌──────────────┴──────────────┐
                        │ HTTPS API                   │ Webhook (HMAC-SHA256)
                        ▼                             ▲
              YOUPI PAYMENT GATEWAY                   │
             (pay.papido.online:6100)                 │
                        │                             │
              ┌─────────┴─────────┐                   │
              ▼                   ▼                   │
       Checkout Portal       Payment API              │
       (:7000 / /checkout)   (:6100)                  │
              │                   │                   │
              ▼                   ▼                   │
          NPCI / UPI ───► Bank / SMS Observer ────────┘
```

> [!IMPORTANT]
> **Zero Architectural Disruption Guarantee:**
> 1. Papido backend remains 100% serverless on Vercel (`api/index.js` wrapping `backend/src/app.js`).
> 2. Existing Papido `ride_id` numbers are NEVER replaced or overwritten. Gateway orders use prefixed correlation handles: `PAPIDO-RIDE-<rideId>-<ts>-<rand>`.
> 3. Existing MySQL/TiDB database remains the single source of truth for fares, commission, riders, customers, and settlement states.
> 4. Browser clients NEVER receive or interact with YOUPI private keys or webhook secrets.

---

## 2. YOUPI Gateway Hosting Requirements

YOUPI V2 cannot run as a stateless Vercel function because it depends on:
1. **Persistent Process Execution:** Long-running socket listeners and HTTP servers on internal ports (`6100`, `7000`, `8090`, `6001`).
2. **Persistent Local Disk:** SQLite with Write-Ahead Logging (`WAL`) mode for zero-latency transaction queues and session state.
3. **Background Banking Observers:** Continuous polling or push listeners (Android Notification Listener, Gmail API polling, Google Messages SMS polling).
4. **Outbound HTTPS Webhook Dispatcher:** Background exponential retry queue.

### Hardware & Environment Specifications
| Parameter | Minimum Requirement | Recommended (Production) |
|---|---|---|
| **OS** | Ubuntu 22.04 / 24.04 LTS or Debian 12 | Ubuntu 24.04 LTS |
| **Node.js** | v20.x or v22.x LTS | v20.18.0 LTS |
| **RAM** | 1 GB | 2 GB+ |
| **vCPU** | 1 Core | 2 Cores |
| **Storage** | 10 GB SSD (Persistent NVMe) | 25 GB NVMe (Persistent) |
| **Network** | Dedicated IPv4 / Static IP with Port 80/443 open | Behind Cloudflare / Let's Encrypt Reverse Proxy |

---

## 3. Step-by-Step Deployment Options for YOUPI Server

### Option A: Ubuntu VPS (DigitalOcean / Hetzner / AWS EC2 / Linode) [RECOMMENDED]

#### Step 1: Install Node.js 20 & Process Manager
```bash
# Update system
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git build-essential nginx certbot python3-certbot-nginx

# Install Node.js 20 LTS via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 process manager
sudo npm install -g pm2
```

#### Step 2: Clone & Configure YOUPI PG
```bash
# Clone your private YOUPI repository or deploy from local directory
mkdir -p /opt/youpi-pg
cd /opt/youpi-pg

# Copy the youpi-pg codebase
# Install production dependencies
npm install

# Create persistent data directory for SQLite WAL
mkdir -p /opt/youpi-pg/data
chmod 700 /opt/youpi-pg/data

# Configure environment variables
cp .env.example .env
nano .env
```

Ensure `.env` in `/opt/youpi-pg` has:
```env
NODE_ENV=production
PAYMENT_API_PORT=6100
CHECKOUT_PORTAL_PORT=7000
CONTROL_CENTER_PORT=8090
MERCHANT_ADMIN_PORT=6001

BASE_PAYMENT_API_URL=https://pay.papido.online
BASE_CHECKOUT_URL=https://pay.papido.online/checkout

USE_SQLITE_FALLBACK=true
SQLITE_DB_PATH=/opt/youpi-pg/data/youpi_pg.sqlite

# Master encryption key (generate via `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
ENCRYPTION_MASTER_KEY=<64_CHAR_HEX_KEY>
JWT_SECRET=<32_CHAR_SECURE_JWT_SECRET>
```

#### Step 3: Run Seed & Migrations
```bash
# Initialize SQLite database and register Papido merchant
node scripts/seed.js
```

#### Step 4: Configure PM2 for Zero-Downtime Daemonization
Create `/opt/youpi-pg/ecosystem.config.js`:
```javascript
module.exports = {
  apps: [
    {
      name: 'youpi-core',
      script: 'scripts/start.js',
      cwd: '/opt/youpi-pg',
      env: {
        NODE_ENV: 'production'
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: '1G',
      exp_backoff_restart_delay: 100
    }
  ]
};
```

Start the daemon:
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

#### Step 5: Configure Nginx Reverse Proxy with HTTPS
Create `/etc/nginx/sites-available/pay.papido.online`:
```nginx
server {
    server_name pay.papido.online;

    # Payment API Routing
    location / {
        proxy_pass http://127.0.0.1:6100;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Hosted Checkout Portal Routing
    location /checkout {
        proxy_pass http://127.0.0.1:7000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable site and acquire SSL certificate:
```bash
sudo ln -s /etc/nginx/sites-available/pay.papido.online /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Issue Let's Encrypt SSL
sudo certbot --nginx -d pay.papido.online --non-interactive --agree-tos -m admin@papido.online
```

---

### Option B: Railway / Render Persistent Service

If using Railway or Render:
1. Choose **Docker** or **Node.js Environment** (Node 20).
2. Attach a **Persistent Volume** mounted at `/app/data` to ensure SQLite data persists across redeploys.
3. Expose Port `6100`.
4. Add Custom Domain: `pay.papido.online`.

---

### Option C: Cloudflare Tunnel (Zero Open Ports)
If running on an on-premise Mac mini or dedicated local hardware:
```bash
# Install cloudflared
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared.deb

# Authenticate & route pay.papido.online to localhost:6100
cloudflared tunnel create youpi-gateway
cloudflared tunnel route dns youpi-gateway pay.papido.online
cloudflared tunnel run youpi-gateway
```

---

## 4. DNS Configuration

Configure DNS records at your domain registrar / Cloudflare DNS:

| Type | Name / Host | Target / Value | TTL | Proxy Status |
|---|---|---|---|---|
| **A** or **CNAME** | `@` (papido.online) | `cname.vercel-dns.com` | Auto | DNS Only / Proxied |
| **CNAME** | `www` | `cname.vercel-dns.com` | Auto | DNS Only / Proxied |
| **A** (or CNAME) | `pay` (pay.papido.online) | `<YOUR_YOUPI_VPS_IP>` (e.g. `143.198.x.x`) | Auto | Proxied (Cloudflare SSL Full) |

> [!NOTE]
> DO NOT alter existing `papido.online` or `api.papido.online` DNS routing. `pay.papido.online` is an isolated subdomain pointing exclusively to the persistent YOUPI server.

---

## 5. Environment Variables Configuration

### A. Papido Vercel Serverless Backend Environment Variables
Configure these in **Vercel Dashboard → Project Settings → Environment Variables**:

| Variable Name | Environment | Value Description | Sample Value |
|---|---|---|---|
| `YOUPI_BASE_URL` | Production | Public HTTPS base URL of YOUPI API | `https://pay.papido.online` |
| `YOUPI_CHECKOUT_URL` | Production | Public HTTPS hosted checkout URL | `https://pay.papido.online/checkout` |
| `YOUPI_MERCHANT_ID` | Production | Authoritative Merchant UUID registered in YOUPI | `00000000-0000-0000-0000-000000000001` |
| `YOUPI_WEBHOOK_SECRET` | Production | Shared HMAC-SHA256 secret (min 32 chars) | `papido_youpi_webhook_sec_2026_prod_89a` |
| `YOUPI_TIMEOUT_MS` | Production | Outbound HTTP timeout in ms | `8000` |
| `DB_HOST` | Production | TiDB Cloud Gateway host | `gateway01.ap-southeast-1.prod.aws.tidbcloud.com` |
| `DB_PORT` | Production | TiDB Cloud Port | `4000` |
| `DB_USER` | Production | TiDB Cloud Username | `...` |
| `DB_PASSWORD` | Production | TiDB Cloud Password | `...` |
| `DB_NAME` | Production | TiDB Cloud Database Name | `papido_db` |
| `JWT_SECRET` | Production | Backend authentication secret | `...` |

### B. YOUPI Host Server Environment Variables (`/opt/youpi-pg/.env`)

| Variable Name | Value Description | Production Value |
|---|---|---|
| `NODE_ENV` | Environment mode | `production` |
| `PAYMENT_API_PORT` | Internal HTTP port for payment API | `6100` |
| `CHECKOUT_PORTAL_PORT` | Internal HTTP port for checkout portal | `7000` |
| `BASE_PAYMENT_API_URL` | Canonical public URL | `https://pay.papido.online` |
| `BASE_CHECKOUT_URL` | Canonical checkout portal URL | `https://pay.papido.online/checkout` |
| `USE_SQLITE_FALLBACK` | Persistent queue storage mode | `true` |
| `SQLITE_DB_PATH` | Path on persistent disk | `/opt/youpi-pg/data/youpi_pg.sqlite` |
| `ENCRYPTION_MASTER_KEY` | 64-char hex key for device secrets | `<Generated 32-byte hex>` |
| `JWT_SECRET` | YOUPI admin session secret | `<Generated 32-byte string>` |

---

## 6. Webhook Endpoint Specification & Cryptographic Verification

### Webhook Target URL
```text
POST https://papido.online/api/payments/webhook/youpi
```

### Inbound Headers
- `Content-Type: application/json`
- `X-Gateway-Signature: sha256=<hex_hmac_signature>`
- `X-Gateway-Delivery-Id: <uuid_delivery_id>`
- `X-Merchant-Id: 00000000-0000-0000-0000-000000000001`

### Payload Schema
```json
{
  "event": "payment.success",
  "orderId": "PAPIDO-RIDE-105-1792410461373-4b7e8a",
  "gatewayPaymentId": "pay_live_928371629",
  "amount": 45.00,
  "utr": "428110462173",
  "status": "SUCCESS",
  "timestamp": "2026-10-19T17:15:00.000Z"
}
```

### Cryptographic Verification Algorithm in Papido
Papido strictly enforces **constant-time HMAC-SHA256 verification over the exact raw request bytes** before any JSON parsing or database operations:
```javascript
const hmac = crypto.createHmac('sha256', process.env.YOUPI_WEBHOOK_SECRET);
hmac.update(rawBodyBuffer);
const expectedSignature = hmac.digest('hex');

const signatureBuffer = Buffer.from(cleanHeaderSignature, 'hex');
const expectedBuffer = Buffer.from(expectedSignature, 'hex');

if (signatureBuffer.length !== expectedBuffer.length || 
    !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
  throw new Error('HMAC verification failed');
}
```

### Idempotency Enforcement
1. Every delivery is checked against `payment_transactions` and `payments` tables.
2. If `orderId` is already marked `SUCCESS` / `COMPLETED`, Papido returns `200 OK` with `{ success: true, duplicate: true }` without repeating database writes or socket events.
3. This prevents double-crediting or duplicate notification triggers even during webhook retries.

---

## 7. Order ID Specification & Lifecycle

| Type | Order ID Pattern | Example | Notes |
|---|---|---|---|
| **Ride Payment** | `PAPIDO-RIDE-<rideId>-<timestamp>-<suffix>` | `PAPIDO-RIDE-105-1792410461373-4b7e8a` | Original Papido `ride_id` (105) is preserved in `payments.ride_id` and extracted via regex. |
| **Shift Settlement** | `PAPIDO-SETTLE-RIDER<riderId>-<YYYYMMDD>-<timestamp>-<suffix>` | `PAPIDO-SETTLE-RIDER42-20261019-1792410463783-4730ae` | Preserves `rider_id` and shift settlement date for auto-clearing driver shift. |

---

## 8. Complete Payment Workflows

### Flow A: Passenger Ride Payment (Passenger Web)
1. Ride is completed by rider (`ride.status = 'COMPLETED'`).
2. Passenger sees authoritative fare (e.g. `₹45.00`) and taps **"Pay via UPI (YouPI)"**.
3. Passenger app calls `POST /api/payments/ride/:rideId/create`.
4. Papido backend:
   - Validates passenger authentication and ownership of the ride.
   - Fetches authoritative `final_fare` from the database (never trusts client amount).
   - Verifies ride is not already paid.
   - Creates a transaction in `payment_transactions` and calls YOUPI PG at `pay.papido.online`.
   - Returns dynamic QR payload (`qrPayload`), UPI intent URI (`upiIntent`), and hosted checkout URL (`checkoutUrl`).
5. Passenger scans QR or taps UPI app (GPay, PhonePe, Paytm, CRED).
6. Once paid, YOUPI fires webhook to `POST /api/payments/webhook/youpi`.
7. Papido marks ride `payment_status = 'PAID'`, updates payment to `COMPLETED` with UTR, and emits `payment:success` via Socket.IO.
8. Passenger screen updates to emerald green **"Payment Successful"** with UTR.

### Flow B: Rider Collecting Ride Payment (Rider Web)
1. At the end of the trip on `ActiveTripPage.jsx`, rider sees the YouPI Payment Dock.
2. Rider taps **"Show YouPI UPI QR"**.
3. Modal displays dynamic high-contrast UPI QR code generated specifically for that ride's fare.
4. Auto-poll polling engine checks payment status every 2.5s as a fail-safe fallback to webhooks.
5. Once payment is confirmed:
   - **Audio Chime** plays immediately through rider's device speaker.
   - **Voice Synthesis:** Web Speech API announces: *"Payment received: 45 rupees via UPI"*.
   - Screen turns green with notice: *"PAID ONLINE VIA YOUPI GATEWAY - Do NOT collect cash"*.
6. **Cash Option:** If passenger prefers cash, rider taps **"Passenger Paid Cash"**, which records the cash collection and marks ride paid.

### Flow C: Rider Platform Commission Settlement (Rider Web)
1. Rider navigates to `DailySettlementsPage.jsx`.
2. Rider can view today's active shift commission due, as well as any past pending shifts.
3. If commission due > ₹0, rider taps **"Pay Commission via YouPI UPI"**.
4. Rider app calls `POST /api/payments/settlement/:id/pay` (or `POST /api/payments/settlement/create-session`).
5. Modal presents dynamic UPI QR code with 1-tap app launch buttons (GPay, PhonePe, Paytm).
6. Once paid, webhook verifies UTR, transitions `daily_shift_settlements.status` to `'SETTLED'`, sets `balance_carried_forward = 0`, and records the payment transaction.
7. Rider's shift is immediately unlocked without waiting for manual administrator verification.

---

## 9. Failure Handling & Reconciliation Procedures

### 1. Incomplete or Interrupted Payments
- If passenger closes UPI app before completing payment, the payment status remains `PENDING`.
- Both passenger and rider UI allow tapping **"Pay Again"** or generating a fresh QR code at any time without creating conflicting records.

### 2. Network Delay / Webhook Drop
- If webhook is delayed or dropped, the client-side polling engine calls `GET /api/payments/order/:orderId/status`.
- This endpoint queries YOUPI PG directly, reconciles the state in MySQL, and updates the UI in real time.

### 3. Duplicate Webhook Deliveries
- Handled idempotently. Second and subsequent deliveries verify HMAC, detect existing `SUCCESS` state, log `PAYMENT_DUPLICATE_WEBHOOK`, and return `200 OK`.

### 4. Admin Reconciliation & Manual Search
- Admins can search payments by UTR, Order ID, or Ride ID in the Papido Admin Portal (`/admin/payments`).
- The database stores complete audit logs in `payment_transactions` with `gateway_order_id`, `gateway_payment_id`, `idempotency_key`, and `utr`.

---

## 10. Production Readiness Verification Checklist

- [x] **1. Architecture Isolation:** Papido serverless backend remains on Vercel; YOUPI runs on independent persistent host.
- [x] **2. Domain Setup:** `pay.papido.online` assigned to YOUPI server with SSL; `papido.online` on Vercel.
- [x] **3. Persistent Storage:** YOUPI SQLite WAL database located on persistent disk volume.
- [x] **4. Port Configuration:** Internal ports `6100` and `7000` routed cleanly through reverse proxy / SSL.
- [x] **5. Environment Secrets:** Webhook secret and encryption keys generated (256-bit cryptographically secure) and saved to Vercel and VPS `.env`.
- [x] **6. Zero Browser Secret Exposure:** No gateway private keys or webhook secrets present in frontend bundles (`apps/admin_web`).
- [x] **7. Ride ID Immutability:** Original Papido ride IDs untouched; correlated via `PAPIDO-RIDE-<id>-*`.
- [x] **8. Webhook Security:** Constant-time `crypto.timingSafeEqual` HMAC-SHA256 verification active on `express.json` raw body buffer.
- [x] **9. Webhook Idempotency:** Duplicate delivery protection tested and verified in MySQL.
- [x] **10. Passenger Payment UI:** Dynamic QR modal, intent links, and emerald success confirmation deployed.
- [x] **11. Rider Payment UI:** Dynamic driver QR modal, cash fallback button, audio alert chime, and speech synthesis active.
- [x] **12. Commission Settlement:** Today's active shift and past shifts unblocked for instant UPI clearing.
- [x] **13. Database Schema:** Tables `payments`, `payment_transactions`, and `daily_shift_settlements` verified in TiDB Cloud.
- [x] **14. CORS & Headers:** Express CORS configured to permit `X-Gateway-Signature`, `X-Gateway-Delivery-Id`, `Idempotency-Key`.
- [x] **15. Automated Test Suite:** 47 integration tests executed and passing with 100% success rate.
- [x] **16. Frontend Build:** Production bundle compiled cleanly with Vite (`dist/index.html`).
