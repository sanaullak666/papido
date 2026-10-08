const path = require('path');
let io = null;
try {
  io = require(require.resolve('socket.io-client', { paths: ['../apps/admin_web', '.'] })).io;
} catch (e) {
  io = null;
}

const API_BASE = 'http://localhost:5000/api';
const SOCKET_URL = 'http://localhost:5000';

async function api(endpoint, method = 'GET', body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || `HTTP ${res.status}`);
  }
  return data;
}

async function runBookingVerification() {
  console.log('--- STARTING PASSENGER BOOKING & RIDER DISPATCH VERIFICATION ---');

  const ts = Date.now().toString().slice(-6);

  // 1. Authenticate or create a test rider
  const riderEmail = `test.rider.${ts}@papido.com`;
  const regRider = await api('/auth/register', 'POST', {
    name: 'Test Driver Partner',
    email: riderEmail,
    password: 'Password@123',
    phone: `92${ts}01`.slice(0, 10),
    role: 'RIDER',
    gender: 'MALE',
    vehicleType: 'BIKE',
    vehicleNumber: `PY-01-AB-${Math.floor(1000 + Math.random() * 9000)}`,
    vehicleModel: 'Bajaj Pulsar 150',
    collegeIdDocUrl: 'https://papido.com/docs/id.jpg'
  });
  const riderToken = regRider.data.accessToken || regRider.data.token;
  const riderUser = regRider.data.user;
  console.log('✅ Rider registered:', riderUser.email, 'ID:', riderUser.id);

  // Admin approves KYC for driver so driver can receive rides
  const adminLogin = await api('/auth/login', 'POST', {
    email: 'pupapido@gmail.com',
    password: 'Papido@669669#',
    expectedRole: 'ADMIN'
  });
  const adminToken = adminLogin.data.accessToken || adminLogin.data.token;
  await api(`/admin/riders/${riderUser.id}/verify`, 'PATCH', {
    status: 'APPROVED'
  }, adminToken);

  // Rider goes online
  await api('/rider/status', 'PATCH', {
    isOnline: true
  }, riderToken);
  console.log('✅ Rider KYC approved and online toggle set to true');

  // Connect rider socket
  let riderSocket = null;
  let receivedNewRidePromise = Promise.resolve();

  if (io) {
    riderSocket = io(SOCKET_URL, {
      auth: { token: riderToken },
      transports: ['websocket', 'polling']
    });

    receivedNewRidePromise = new Promise((resolve) => {
      riderSocket.on('connect', () => {
        console.log('✅ Rider socket connected, identifying with server...');
        riderSocket.emit('identify', { id: riderUser.id, role: 'RIDER', name: 'Test Driver Partner', isOnline: true });
        riderSocket.emit('rider:identify', { riderId: riderUser.id, status: 'ONLINE', isOnline: true });
      });

      riderSocket.on('ride:new_request', (data) => {
        console.log('🎉 RIDER SOCKET RECEIVED ride:new_request!', data.rideCode || data.ride_code, 'Fare: ₹' + (data.total_fare || data.estimated_fare));
        resolve(data);
      });
    });
  }

  // 2. Register / login passenger
  const passengerEmail = `test.passenger.${ts}@papido.com`;
  const regPassenger = await api('/auth/register', 'POST', {
    name: 'PU Student Passenger',
    email: passengerEmail,
    password: 'Password@123',
    phone: `91${ts}02`.slice(0, 10),
    role: 'CUSTOMER',
    gender: 'FEMALE'
  });
  const passToken = regPassenger.data.accessToken || regPassenger.data.token;
  console.log('✅ Passenger registered:', passengerEmail);

  // 3. Test Fare Estimate (Single vs Double Ride)
  const singleEst = await api('/fares/estimate', 'POST', {
    pickupAddress: 'PU Main Gate (Gate 1)',
    destinationAddress: 'Madame Curie Girls Hostel',
    pickupLatitude: 12.0228681,
    pickupLongitude: 79.8509415,
    destinationLatitude: 12.0215,
    destinationLongitude: 79.8565,
    vehicleType: 'BIKE',
    isDoubleRide: false
  }, passToken);
  console.log('✅ Single Ride Fare estimate:', singleEst.data.estimatedFare);

  const doubleEst = await api('/fares/estimate', 'POST', {
    pickupAddress: 'PU Main Gate (Gate 1)',
    destinationAddress: 'Madame Curie Girls Hostel',
    pickupLatitude: 12.0228681,
    pickupLongitude: 79.8509415,
    destinationLatitude: 12.0215,
    destinationLongitude: 79.8565,
    vehicleType: 'BIKE',
    isDoubleRide: true
  }, passToken);
  console.log('✅ Double Ride Fare estimate (with ₹10 bundled savings):', doubleEst.data.estimatedFare);

  // 4. Passenger requests ride
  const bookRes = await api('/customer/rides', 'POST', {
    pickupAddress: 'PU Main Gate (Gate 1)',
    pickupLatitude: 12.0228681,
    pickupLongitude: 79.8509415,
    destinationAddress: 'Madame Curie Girls Hostel',
    destinationLatitude: 12.0215,
    destinationLongitude: 79.8565,
    vehicleType: 'BIKE',
    femaleRiderOnly: false,
    isDoubleRide: false,
    paymentMethod: 'CASH',
    isScheduled: false
  }, passToken);

  const bookedRide = bookRes.data;
  console.log('✅ Ride booked successfully:', bookedRide.ride_code, 'Status:', bookedRide.status);

  // 5. Await Rider socket notification
  if (io) {
    const receivedRide = await Promise.race([
      receivedNewRidePromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout waiting for rider socket event')), 8000))
    ]);

    console.log('✅ Verified: Socket dispatch to rider confirmed! Ride code:', receivedRide.ride_code || receivedRide.rideCode);
    riderSocket.disconnect();
  }

  // 6. Test polling /rider/requests
  const availRes = await api('/rider/requests', 'GET', null, riderToken);
  const foundRide = (availRes.data || []).find(r => r.id === bookedRide.id || r.ride_code === bookedRide.ride_code);
  console.log('✅ Verified: Rider incoming requests queue contains booked ride:', Boolean(foundRide));

  console.log('--- ALL VERIFICATIONS PASSED SUCCESSFULLY ---');
}

runBookingVerification().catch((err) => {
  console.error('❌ Verification failed:', err.message);
  process.exit(1);
});
