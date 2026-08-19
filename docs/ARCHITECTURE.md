# PAPIDO PLATFORM ARCHITECTURE SPECIFICATION

## 1. System Overview

Papido is a production-ready, university-to-metropolitan ride-hailing platform architected for ultra-low latency dispatch, reliable state machines, dynamic revenue split calculations, and role-based security.

```
┌──────────────────────────────────────────────┐
│             PAPIDO CLIENT LAYER              │
│                                              │
│  [Customer Mobile App]  [Rider Driver App]   │
│         (Flutter)             (Flutter)      │
│                     │                        │
│                     ▼                        │
│        [Admin Web Dashboard (React)]         │
└──────────────────────┬───────────────────────┘
                       │ HTTP REST / WebSocket
                       ▼
┌──────────────────────────────────────────────┐
│           BACKEND APPLICATION TIER           │
│                                              │
│  Express.js REST APIs ── Socket.IO Server    │
│  ├── Auth & JWT Guard  ├── State Machine     │
│  ├── Fare Engine       ├── Map Telemetry     │
│  └── Split Ledger      └── Audit Logger      │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│               PERSISTENCE TIER               │
│                                              │
│  MySQL 8.0 (Primary with Pooling & Triggers) │
│  SQLite3 (Zero-Config Embedded Fallback)     │
└──────────────────────────────────────────────┘
```

## 2. Core Roles Definition

* **CUSTOMER**: The passenger booking rides. Has access only to passenger booking, active tracking, history, ratings, and wallet APIs.
* **RIDER**: The driver providing the ride. Has access to online/offline toggle, GPS telemetry broadcasts, accepting requests, ride execution steps, and earnings ledgers.
* **ADMIN**: Platform operator. Has complete visibility over users, verification/KYC, live ride dispatching, dynamic fare settings, split tier rules, and financial exports.

## 3. Ride State Machine Lifecycle

```
[REQUESTED] ──(Rider Accepts)──> [ACCEPTED]
                                     │
                             (Rider Moves)
                                     ▼
                            [RIDER_ARRIVING]
                                     │
                             (Rider Reaches)
                                     ▼
                            [RIDER_REACHED]
                                     │
                         (Enter 4-Digit OTP)
                                     ▼
                                [STARTED]
                                     │
                         (Reached Destination)
                                     ▼
                               [COMPLETED]
                                     │
                       (Calculates Fare Split &
                        Records Rider Earnings)

* Cancellation possible from REQUESTED, ACCEPTED, ARRIVING, REACHED -> [CANCELLED]
```
