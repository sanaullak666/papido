// Rigorous Sound Alert & Routing Simulation Test Suite for Papido
const assert = require('assert');

console.log('================================================================');
console.log('  🔊 PAPIDO SOUND ALERT & AUDIENCE ROUTING SIMULATION TEST');
console.log('================================================================\n');

// 1. Mock AlertManager state machine
class MockAlertManager {
  constructor(name) {
    this.name = name;
    this.soundMuted = false;
    this.isRinging = false;
    this.playCount = 0;
    this.ringtoneCount = 0;
    this.notifications = [];
  }

  isSoundEnabled() { return !this.soundMuted; }
  setSoundEnabled(val) { this.soundMuted = !val; }

  triggerRideAlert({ title, body, repeat = true }) {
    if (this.soundMuted) return;
    this.notifications.push({ title, body, timestamp: Date.now() });
    if (repeat) {
      this.startRingtone();
    } else {
      this.playOneShot();
    }
  }

  startRingtone() {
    if (this.soundMuted) return;
    if (this.isRinging) return; // Prevent duplicate overlapping ringtones
    this.isRinging = true;
    this.ringtoneCount++;
    this.playCount++;
  }

  stopRingtone() {
    this.isRinging = false;
  }

  playOneShot() {
    if (this.soundMuted) return;
    this.playCount++;
  }

  reset() {
    this.playCount = 0;
    this.ringtoneCount = 0;
    this.notifications = [];
    this.isRinging = false;
  }
}

// 2. Simulated Database Table
const db = {
  rides: [],
  insertRide(ride) {
    const id = this.rides.length + 1;
    const record = { id, is_dispatched: 0, status: 'REQUESTED', ...ride };
    this.rides.push(record);
    return record;
  },
  // Rider endpoint query: RideModel.getAvailableRequestsForRider
  getRiderRequests() {
    return this.rides.filter(r => 
      r.status === 'REQUESTED' && 
      (Number(r.is_outside || 0) === 0 || Number(r.is_dispatched || 0) === 1)
    );
  },
  // Admin outside rides query: RideModel.listPendingOutsideRides
  getAdminPendingOutsideRides() {
    return this.rides.filter(r => 
      r.status === 'PENDING_ADMIN_QUOTE' && Number(r.is_outside || 0) === 1
    );
  },
  dispatchOutsideRide(id, fare) {
    const ride = this.rides.find(r => r.id === id);
    if (!ride) throw new Error('Ride not found');
    ride.status = 'REQUESTED';
    ride.is_dispatched = 1;
    ride.final_fare = fare;
    ride.total_fare = fare;
    return ride;
  }
};

// 3. Simulated Client Sessions
class RiderClient {
  constructor(name) {
    this.name = name;
    this.alertManager = new MockAlertManager(name);
    this.hasInitialFetched = false;
    this.prevRequestIds = new Set();
    this.incomingRequests = [];
  }

  // Poll loop: mimics fetchAvailableRequests in RiderContext.jsx
  poll() {
    const available = db.getRiderRequests();
    const mapped = available.map(r => ({
      id: r.id,
      pickup_address: r.pickup_address,
      destination_address: r.destination_address,
      total_fare: r.total_fare || r.final_fare || 20,
      is_outside: Boolean(r.is_outside)
    }));

    const newRides = mapped.filter(r => !this.prevRequestIds.has(String(r.id)));
    if (newRides.length > 0 && this.alertManager.isSoundEnabled() && this.hasInitialFetched) {
      const topRide = newRides[0];
      this.alertManager.triggerRideAlert({
        title: `New Ride Request: ₹${topRide.total_fare}`,
        body: `Pickup: ${topRide.pickup_address} → Drop: ${topRide.destination_address}`,
        repeat: true
      });
    }

    this.hasInitialFetched = true;
    this.prevRequestIds = new Set(mapped.map(r => String(r.id)));
    this.incomingRequests = mapped;
  }

  // Socket event handler
  onSocketRideRequest(ride) {
    const rideId = String(ride.id);
    if (this.prevRequestIds.has(rideId)) return;
    this.prevRequestIds.add(rideId);
    if (this.alertManager.isSoundEnabled()) {
      this.alertManager.triggerRideAlert({
        title: `New Ride Request: ₹${ride.total_fare || 20}`,
        body: `Pickup: ${ride.pickup_address} → Drop: ${ride.destination_address}`,
        repeat: true
      });
    }
  }
}

class AdminClient {
  constructor() {
    this.alertManager = new MockAlertManager('Admin');
    this.hasInitialFetched = false;
    this.alertedRideIds = new Set();
    this.currentTab = 'dashboard';
    this.newOutsideAlert = null;
  }

  // Poll loop: mimics checkPendingOutsideRides in App.jsx
  poll() {
    const pending = db.getAdminPendingOutsideRides();

    if (pending.length === 0) {
      this.alertManager.stopRingtone();
      this.newOutsideAlert = null;
    }

    if (!this.hasInitialFetched) {
      this.hasInitialFetched = true;
      pending.forEach(r => this.alertedRideIds.add(String(r.id)));
      return;
    }

    const newRides = pending.filter(r => !this.alertedRideIds.has(String(r.id)));
    if (newRides.length > 0) {
      newRides.forEach(r => this.alertedRideIds.add(String(r.id)));
      const newest = newRides[0];
      const isViewingOutside = this.currentTab === 'outside-trips';

      this.alertManager.triggerRideAlert({
        title: `NEW OUTSIDE CAMPUS TRIP (${pending.length})`,
        body: `Passenger requested: ${newest.pickup_address} → ${newest.destination_address}.`,
        repeat: !isViewingOutside
      });

      if (!isViewingOutside) {
        this.newOutsideAlert = { rideId: newest.id };
      }
    }
  }
}

// ================================================================
// RUN ROUTING SCENARIO TESTS
// ================================================================

const riderA = new RiderClient('Rider A');
const riderB = new RiderClient('Rider B');
const admin = new AdminClient();

// Initial load
riderA.poll();
riderB.poll();
admin.poll();

assert.strictEqual(riderA.alertManager.playCount, 0, 'Initial load must not trigger rider sound');
assert.strictEqual(admin.alertManager.playCount, 0, 'Initial load must not trigger admin sound');

console.log('▶ TEST 1: Initial Page Load / Suppress Past Rides');
console.log('  ✅ [PASS] No sounds triggered on initial page hydration or refresh.\n');

// ----------------------------------------------------------------
// SCENARIO A: Inside-campus ride booking
// ----------------------------------------------------------------
console.log('▶ TEST 2: Scenario A — Inside-Campus Ride Booking');
const insideRide = db.insertRide({
  pickup_address: 'Academic Block A',
  destination_address: 'Main Gate',
  total_fare: 25,
  is_outside: 0,
  status: 'REQUESTED'
});

riderA.poll();
riderB.poll();
admin.poll();

assert.strictEqual(riderA.alertManager.playCount, 1, 'Rider A must receive sound alert for inside-campus ride');
assert.strictEqual(riderB.alertManager.playCount, 1, 'Rider B must receive sound alert for inside-campus ride');
assert.strictEqual(admin.alertManager.playCount, 0, 'Admin must NOT receive sound alert for inside-campus ride');
assert.strictEqual(riderA.alertManager.isRinging, true, 'Rider ringtone must be actively ringing');

// Subsequent polling check (Duplicate sound prevention)
riderA.poll();
riderA.poll();
assert.strictEqual(riderA.alertManager.ringtoneCount, 1, 'Duplicate polls must NOT re-trigger ringtone for the same ride');
console.log('  ✅ [PASS] Inside ride: Rider A (🔊), Rider B (🔊), Admin (❌). No duplicate sounds on re-polling.\n');

// Rider silences sound
riderA.alertManager.stopRingtone();
riderB.alertManager.stopRingtone();

// ----------------------------------------------------------------
// SCENARIO B: Outside-campus ride booking — BEFORE DISPATCH
// ----------------------------------------------------------------
console.log('▶ TEST 3: Scenario B — Outside-Campus Ride Booking (Before Dispatch)');
const outsideRide = db.insertRide({
  pickup_address: 'Campus Gate 2',
  destination_address: 'Railway Station (City)',
  total_fare: 0,
  is_outside: 1,
  is_dispatched: 0,
  status: 'PENDING_ADMIN_QUOTE'
});

const prevRiderAPlays = riderA.alertManager.playCount;
const prevRiderBPlays = riderB.alertManager.playCount;
const prevAdminPlays = admin.alertManager.playCount;

riderA.poll();
riderB.poll();
admin.poll();

assert.strictEqual(admin.alertManager.playCount, prevAdminPlays + 1, 'Admin MUST receive sound alert for outside ride');
assert.strictEqual(riderA.alertManager.playCount, prevRiderAPlays, 'Rider A must NOT receive sound for outside ride before dispatch');
assert.strictEqual(riderB.alertManager.playCount, prevRiderBPlays, 'Rider B must NOT receive sound for outside ride before dispatch');
assert.strictEqual(riderA.incomingRequests.some(r => r.id === outsideRide.id), false, 'Outside ride must NOT appear in rider request list before dispatch');
console.log('  ✅ [PASS] Outside ride (Pre-Dispatch): Admin (🔊), Rider A (❌), Rider B (❌). Database strictly isolates undispatched rides.\n');

// ----------------------------------------------------------------
// SCENARIO C: Outside-campus ride booking — AFTER ADMIN DISPATCH
// ----------------------------------------------------------------
console.log('▶ TEST 4: Scenario C — Outside-Campus Ride Booking (After Admin Dispatch)');
// Admin sets fare of ₹280 and clicks dispatch
db.dispatchOutsideRide(outsideRide.id, 280);

// Admin polls -> queue is now empty
admin.poll();
assert.strictEqual(admin.alertManager.isRinging, false, 'Admin ringtone stops after queue cleared / dispatch');

// Riders poll
riderA.poll();
riderB.poll();

assert.strictEqual(riderA.alertManager.playCount, prevRiderAPlays + 1, 'Rider A MUST receive sound alert after outside ride dispatch');
assert.strictEqual(riderB.alertManager.playCount, prevRiderBPlays + 1, 'Rider B MUST receive sound alert after outside ride dispatch');
assert.strictEqual(riderA.incomingRequests.some(r => r.id === outsideRide.id && r.total_fare === 280), true, 'Dispatched ride with quoted fare must appear on rider page');
console.log('  ✅ [PASS] Outside ride (Post-Dispatch): Admin ringtone clears, Rider A (🔊), Rider B (🔊) receive sound and fare ₹280.\n');

// ----------------------------------------------------------------
// TEST 5: Mute Controls & Multi-Rider Isolation
// ----------------------------------------------------------------
console.log('▶ TEST 5: Rider Mute Isolation');
riderA.alertManager.stopRingtone();
riderB.alertManager.stopRingtone();

riderA.alertManager.setSoundEnabled(false);
const anotherInside = db.insertRide({
  pickup_address: 'Hostel 4',
  destination_address: 'Cafeteria',
  total_fare: 20,
  is_outside: 0,
  status: 'REQUESTED'
});

const riderAPlayBefore = riderA.alertManager.playCount;
const riderBPlayBefore = riderB.alertManager.playCount;

riderA.poll();
riderB.poll();

assert.strictEqual(riderA.alertManager.playCount, riderAPlayBefore, 'Muted rider must NOT play sound');
assert.strictEqual(riderB.alertManager.playCount, riderBPlayBefore + 1, 'Unmuted rider B MUST play sound');
console.log('  ✅ [PASS] Muted rider stays silent; unmuted rider rings cleanly.\n');

console.log('================================================================');
console.log('  🎉 ALL 5 SOUND ROUTING SCENARIOS PASSED WITH ZERO FAILURES');
console.log('================================================================\n');
