# PAPIDO API SPECIFICATION

## 1. Authentication Endpoints

* `POST /api/auth/register` — Register a new account (`CUSTOMER`, `RIDER`, or `ADMIN`)
* `POST /api/auth/login` — Login with email/password and optional `expectedRole`
* `POST /api/auth/refresh` — Refresh access token
* `GET /api/auth/me` — Get authenticated user details & role profile
* `POST /api/auth/logout` — Logout session

## 2. Customer Endpoints (Protected: `CUSTOMER` role)

* `GET /api/customer/profile` — Get passenger profile and wallet balance
* `POST /api/customer/estimate` — Calculate real-time fare estimate
* `POST /api/customer/rides` — Book a new ride
* `GET /api/customer/rides/active` — Get active trip status & driver details
* `GET /api/customer/rides` — List ride history (paginated)
* `GET /api/customer/rides/:id` — Get single ride details
* `POST /api/customer/rides/:id/cancel` — Cancel ride request
* `POST /api/customer/rides/:id/rating` — Submit 1-5 star review

## 3. Rider Endpoints (Protected: `RIDER` role)

* `GET /api/rider/profile` — Get driver profile & vehicle information
* `PATCH /api/rider/status` — Toggle online/offline status
* `PATCH /api/rider/location` — Broadcast current GPS coordinate
* `GET /api/rider/active-ride` — Get currently assigned ride
* `GET /api/rider/requests` — View open ride requests nearby
* `POST /api/rider/rides/:id/accept` — Accept incoming ride
* `POST /api/rider/rides/:id/arriving` — Mark driver arriving at pickup
* `POST /api/rider/rides/:id/reached` — Mark driver reached pickup
* `POST /api/rider/rides/:id/start` — Verify OTP & start trip
* `POST /api/rider/rides/:id/complete` — Complete trip & calculate earnings
* `GET /api/rider/earnings` — Get today, weekly, monthly, lifetime earnings
* `GET /api/rider/rides` — Trip history

## 4. Admin Endpoints (Protected: `ADMIN` role)

* `GET /api/admin/dashboard` — Platform overview metrics & active rider count
* `GET /api/admin/customers` — Search & list customer accounts
* `GET /api/admin/riders` — Search & filter riders, view vehicle records
* `PATCH /api/admin/riders/:id/verify` — Approve or reject driver KYC
* `PATCH /api/admin/users/:id/status` — Activate, deactivate, or suspend accounts
* `GET /api/admin/rides` — Dispatch monitor & ride history
* `GET /api/admin/payments` — Transaction ledger
* `GET /api/admin/fare-settings` — List base rates by vehicle
* `PATCH /api/admin/fare-settings/:vehicleType` — Update rates
* `GET /api/admin/split-rules` — List dynamic split tiers
* `POST /api/admin/split-rules` — Create new split tier rule
* `PATCH /api/admin/split-rules/:id` — Update split rule
* `GET /api/admin/reports` — Aggregated revenue and dispatch analytics
