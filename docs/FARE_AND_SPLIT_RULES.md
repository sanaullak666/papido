# PAPIDO CONFIGURABLE FARE & REVENUE SPLIT SPECIFICATION

## 1. Dynamic Fare Calculation

Fare is calculated dynamically in the backend (never trusted from clients):

$$\text{Fare} = \max(\text{Minimum Fare}, \text{Base Fare} + (\text{Distance} - \text{Base Distance}) \times \text{Per-Km Rate} + \text{Duration} \times \text{Per-Min Rate})$$

### Default Configured Rates:
* **BIKE**: Base ₹20 (1.5 km), ₹8.50/km, ₹0.75/min, Min ₹25, Cancel fee ₹10
* **AUTO**: Base ₹30 (1.5 km), ₹12.00/km, ₹1.00/min, Min ₹35, Cancel fee ₹15
* **CAB MINI**: Base ₹45 (2.0 km), ₹16.00/km, ₹1.50/min, Min ₹55, Cancel fee ₹25
* **CAB SEDAN**: Base ₹60 (2.0 km), ₹20.00/km, ₹2.00/min, Min ₹75, Cancel fee ₹35

---

## 2. Dynamic Papido Split System

Rules are configured in the `fare_split_rules` database table and editable from the Admin Web Dashboard:

| Tier | Fare Range | Rule Type | Company Deduction | Driver (Rider) Payout |
|---|---|---|---|---|
| **Tier 1** | ₹0.00 – ₹25.00 | FIXED | **₹2.00** | **₹(Fare - 2)** (₹23 on ₹25) |
| **Tier 2** | ₹25.01 – ₹35.00 | FIXED | **₹3.00** | **₹(Fare - 3)** (₹27 on ₹30) |
| **Tier 3** | ₹35.01 – ₹60.00 | FIXED | **₹4.00** | **₹(Fare - 4)** (₹46 on ₹50) |
| **Tier 4** | > ₹60.00 | PERCENTAGE | **20.00%** | **80.00%** (₹80 on ₹100) |
