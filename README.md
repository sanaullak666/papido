# PAPIDO — Ride-Hailing Platform

Production-ready ride-hailing platform architected for university and metropolitan communities, featuring real-time Socket.IO dispatching, role-based authorization, dynamic configurable fare calculation, and dynamic driver/platform revenue split ledgers.

---

## 1. Role Definitions

Papido has three strictly segregated roles:
* **CUSTOMER**: The passenger booking rides via mobile application.
* **RIDER**: The driver providing rides via mobile application.
* **ADMIN**: The platform operator managing fleet, dispatch, fares, and revenue via the Web Administration Dashboard.

---

## 2. Technology Stack

* **Backend**: Node.js, Express.js, REST API, Socket.IO, JWT, bcryptjs, Helmet, Rate Limiter.
* **Database**: MySQL 8.0 (primary with connection pool) + SQLite embedded automatic fallback for zero-config local testing.
* **Admin Web**: React 18, Vite, Lucide Icons, Leaflet Maps, Responsive Dark Theme.
* **Mobile App**: Unified Flutter / Dart App for both Passengers (Customers) and Bike Drivers (Riders).
* **Admin Web**: React 18, Vite, Lucide Icons, Leaflet Maps, Responsive Dark Theme.

---

## 3. Project Structure

```
papido/
├── apps/
│   ├── papido_app/        # Unified Flutter Mobile App (Passenger & Bike Driver)
│   └── admin_web/         # React + Vite Admin Command Center & Simulator
├── backend/
│   ├── src/
│   │   ├── config/        # Database, Environment, Constants
│   │   ├── controllers/   # Auth, Customer, Rider, Admin, Fare
│   │   ├── middleware/    # JWT Auth, Strict Role Guard, Rate Limiter
│   │   ├── models/        # User, Rider, Customer, Ride, Fare, Payment, Earning
│   │   ├── routes/        # REST Route definitions
│   │   ├── services/      # State Machine, Fare Engine, Map Telemetry
│   │   ├── sockets/       # Real-time room management & dispatching
│   │   ├── utils/         # Geo calculations, standard responses, logger
│   │   ├── app.js
│   │   └── server.js
│   ├── tests/             # Automated test suite
│   └── package.json
├── database/
│   ├── schema.sql         # MySQL schema with foreign keys and indexes
│   ├── seed.sql           # Initial accounts, fares, and split rules
│   └── migrate.js         # Migration utility
├── docs/                  # Architecture, API specs, Split rules
├── .env.example
├── docker-compose.yml
└── README.md
```

---

## 4. Quick Start & Running Locally

### Step 1: Install and Start Backend

```bash
cd backend
npm install
npm start
```
The backend starts at `http://localhost:5000`. Database tables and seeds are auto-initialized.

### Step 2: Run Backend Tests

```bash
cd backend
npm test
```
Executes the comprehensive automated test suite (verifying auth, roles, fare engine, split tiers, state machine, payments, and ratings).

### Step 3: Start Admin Web Dashboard & Interactive Simulator

```bash
cd apps/admin_web
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 5. Default Demo Credentials

All test users share the password: `Password@123`

| Role | Email | Password | Description |
|---|---|---|---|
| **ADMIN** | `admin@papido.com` | `Password@123` | Platform Administrator |
| **RIDER** | `rider.rahul@papido.com` | `Password@123` | Approved Bike Driver |
| **RIDER** | `rider.amit@papido.com` | `Password@123` | Approved Auto Driver |
| **RIDER** | `rider.vikram@papido.com` | `Password@123` | Pending KYC Verification |
| **CUSTOMER** | `customer.ananya@papido.com` | `Password@123` | Passenger Account |
| **CUSTOMER** | `customer.rohan@papido.com` | `Password@123` | Passenger Account |

---

## 6. Live Multi-App Simulator

Inside the Admin Web Portal (`http://localhost:5173`), navigate to the **"Live Multi-App Test"** tab to test Customer & Rider interactions simultaneously:
1. **Customer Side**: Select pickup and destination on campus, choose vehicle type, view fare estimate, and click "Book Papido Ride".
2. **Rider Side**: Driver gets instant incoming ride request banner with sound/visual alert.
3. Click "Accept" &rarr; Step through "Arriving" &rarr; "Reached" &rarr; Enter Customer OTP &rarr; "Complete Trip".
4. Driver earnings and company commission are calculated instantly based on Papido split rules!

---

## 7. Docker Deployment

To launch the complete platform with MySQL, Backend, and Admin Web:

```bash
docker-compose up --build
```
