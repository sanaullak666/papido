/**
 * Central Papido Service Areas Configuration
 * Strictly defines and validates operations for:
 * 1. PONDICHERRY_UNIVERSITY (Campus mobility)
 * 2. PONDICHERRY_CITY (Puducherry city and surrounding approved service area)
 */

const PAPIDO_SERVICE_AREAS = {
  PONDICHERRY_UNIVERSITY: {
    key: 'PONDICHERRY_UNIVERSITY',
    name: 'Pondicherry University',
    type: 'campus',
    center: {
      latitude: 12.0240,
      longitude: 79.8530
    },
    zoom: 15,
    pickupRadiusMeters: 100,
    boundary: [
      [12.0160, 79.8490],
      [12.0195, 79.8475],
      [12.0240, 79.8480],
      [12.0290, 79.8500],
      [12.0340, 79.8520],
      [12.0365, 79.8570],
      [12.0335, 79.8615],
      [12.0280, 79.8600],
      [12.0210, 79.8580],
      [12.0165, 79.8540],
      [12.0160, 79.8490]
    ],
    landmarks: [
      { id: 'pu-g1', name: 'PU Main Gate (Gate 1)', category: 'GATES', latitude: 12.0228681, longitude: 79.8509415, description: 'Main University Entrance on Kalapet Road' },
      { id: 'pu-g2', name: 'Gate 2 (ECR Gate)', category: 'GATES', latitude: 12.0295, longitude: 79.8580, description: 'East Coast Road Entrance' },
      { id: 'pu-lib', name: 'Central Library', category: 'ACADEMIC', latitude: 12.0245, longitude: 79.8532, description: 'Ananda Rangapillai Central Library' },
      { id: 'pu-food', name: 'Central Food Court & Mess', category: 'FOOD', latitude: 12.0238, longitude: 79.8541, description: 'Student Canteen & Dining Area' },
      { id: 'pu-sjc', name: 'Silver Jubilee Campus (SJC)', category: 'ACADEMIC', latitude: 12.0280, longitude: 79.8520, description: 'School of Management & Computer Science' },
      { id: 'pu-sci', name: 'Science Complex', category: 'ACADEMIC', latitude: 12.0261, longitude: 79.8550, description: 'Physics, Chemistry & Life Sciences' },
      { id: 'pu-adm', name: 'Admin Block & Exam Wing', category: 'ADMIN', latitude: 12.0252, longitude: 79.8515, description: 'Vice Chancellor Office & Registrar' },
      { id: 'pu-std', name: 'Rajiv Gandhi Sports Stadium', category: 'SPORTS', latitude: 12.0290, longitude: 79.8555, description: 'Outdoor Ground & Gymnasium' },
      { id: 'pu-h-curie', name: 'Madame Curie Girls Hostel', category: 'HOSTELS', latitude: 12.0215, longitude: 79.8565, description: 'Girls Hostel Complex' },
      { id: 'pu-h-teresa', name: 'Mother Teresa Girls Hostel', category: 'HOSTELS', latitude: 12.0218, longitude: 79.8570, description: 'Girls Hostel Complex' },
      { id: 'pu-h-bharathi', name: 'Bharathidasan Boys Hostel', category: 'HOSTELS', latitude: 12.0275, longitude: 79.8515, description: 'Boys Hostel Complex' },
      { id: 'pu-h-kabilar', name: 'Kabilar Boys Hostel', category: 'HOSTELS', latitude: 12.0270, longitude: 79.8510, description: 'Boys Hostel Complex' }
    ]
  },

  PONDICHERRY_CITY: {
    key: 'PONDICHERRY_CITY',
    name: 'Puducherry',
    type: 'city',
    center: {
      latitude: 11.9416,
      longitude: 79.8083
    },
    zoom: 12,
    boundary: [
      [12.0450, 79.8650],
      [12.0100, 79.8200],
      [11.9700, 79.7800],
      [11.9500, 79.7750],
      [11.9200, 79.7800],
      [11.8800, 79.7900],
      [11.8700, 79.8150],
      [11.9100, 79.8350],
      [11.9350, 79.8400],
      [11.9750, 79.8450],
      [12.0250, 79.8600],
      [12.0450, 79.8650]
    ],
    landmarks: [
      { id: 'py-white', name: 'White Town / French Colony', category: 'TOURISM', latitude: 11.9338, longitude: 79.8359, description: 'French Quarter & Heritage Streets' },
      { id: 'py-beach', name: 'Rock Beach / Promenade', category: 'TOURISM', latitude: 11.9310, longitude: 79.8365, description: 'Goubert Avenue seafront' },
      { id: 'py-bus', name: 'New Bus Stand', category: 'TRANSIT', latitude: 11.9350, longitude: 79.8150, description: 'Maraimalai Adigal Salai, Orleanpet' },
      { id: 'py-train', name: 'Pondicherry Railway Station', category: 'TRANSIT', latitude: 11.9280, longitude: 79.8290, description: 'Subbiah Salai, South Boulevard' },
      { id: 'py-jipmer', name: 'JIPMER Hospital', category: 'MEDICAL', latitude: 11.9560, longitude: 79.7990, description: 'Gorimedu Medical Institute' },
      { id: 'py-ashram', name: 'Sri Aurobindo Ashram', category: 'HERITAGE', latitude: 11.9360, longitude: 79.8340, description: 'Rue de la Marine' },
      { id: 'py-auroville', name: 'Auroville Visitor Centre', category: 'TOURISM', latitude: 12.0070, longitude: 79.8110, description: 'Kuilapalayam' },
      { id: 'py-airport', name: 'Puducherry Airport (Lawspet)', category: 'TRANSIT', latitude: 11.9680, longitude: 79.8120, description: 'Airport Road' },
      { id: 'py-serenity', name: 'Serenity Beach (Kottakuppam)', category: 'TOURISM', latitude: 11.9670, longitude: 79.8420, description: 'East Coast Road' },
      { id: 'py-paradise', name: 'Paradise Beach (Chunnambar)', category: 'TOURISM', latitude: 11.8840, longitude: 79.8050, description: 'Chunnambar Boat House' }
    ]
  }
};

const MAP_MODES = {
  CAMPUS_MODE: 'CAMPUS_MODE',
  CITY_MODE: 'CITY_MODE',
  RIDE_TRACKING_MODE: 'RIDE_TRACKING_MODE',
  RIDER_NAVIGATION_MODE: 'RIDER_NAVIGATION_MODE',
  ADMIN_LIVE_OPERATIONS_MODE: 'ADMIN_LIVE_OPERATIONS_MODE'
};

/**
 * Ray-casting algorithm to test if (lat, lng) is inside a polygon
 */
function isInsidePolygon(lat, lng, polygon) {
  if (!polygon || !Array.isArray(polygon) || polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    const intersect = ((yi > lng) !== (yj > lng)) &&
      (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Tests if point is inside a specific service area (includes small bounding buffer)
 */
function isInsideServiceArea(lat, lng, areaKey) {
  const area = PAPIDO_SERVICE_AREAS[areaKey];
  if (!area) return false;

  const latNum = parseFloat(lat);
  const lngNum = parseFloat(lng);
  if (isNaN(latNum) || isNaN(lngNum)) return false;

  // 1. Direct polygon check
  if (isInsidePolygon(latNum, lngNum, area.boundary)) return true;

  // 2. Proximity tolerance (buffer: ~600m for campus, ~2km for city boundary edges)
  const dLat = Math.abs(latNum - area.center.latitude);
  const dLng = Math.abs(lngNum - area.center.longitude);
  if (areaKey === 'PONDICHERRY_UNIVERSITY') {
    return dLat <= 0.016 && dLng <= 0.018;
  }
  if (areaKey === 'PONDICHERRY_CITY') {
    return dLat <= 0.12 && dLng <= 0.10;
  }
  return false;
}

/**
 * Classifies a coordinate into one of the service areas or OUTSIDE
 */
function classifyLocationArea(lat, lng) {
  if (isInsideServiceArea(lat, lng, 'PONDICHERRY_UNIVERSITY')) {
    return 'PONDICHERRY_UNIVERSITY';
  }
  if (isInsideServiceArea(lat, lng, 'PONDICHERRY_CITY')) {
    return 'PONDICHERRY_CITY';
  }
  return 'OUTSIDE';
}

/**
 * Validates a ride's origin and destination
 */
function validateRideServiceAreas(pickup, destination) {
  const pArea = classifyLocationArea(pickup.latitude, pickup.longitude);
  const dArea = classifyLocationArea(destination.latitude, destination.longitude);

  const isCampusRide = pArea === 'PONDICHERRY_UNIVERSITY' && dArea === 'PONDICHERRY_UNIVERSITY';
  const isCityRide = (pArea === 'PONDICHERRY_CITY' || pArea === 'PONDICHERRY_UNIVERSITY') &&
                     (dArea === 'PONDICHERRY_CITY' || dArea === 'PONDICHERRY_UNIVERSITY');
  const isOutside = pArea === 'OUTSIDE' || dArea === 'OUTSIDE';

  return {
    pickupArea: pArea,
    destinationArea: dArea,
    isCampusRide,
    isCityRide,
    isOutside,
    isValid: !isOutside,
    suggestedMode: isCampusRide ? MAP_MODES.CAMPUS_MODE : MAP_MODES.CITY_MODE
  };
}

module.exports = {
  PAPIDO_SERVICE_AREAS,
  MAP_MODES,
  isInsidePolygon,
  isInsideServiceArea,
  classifyLocationArea,
  validateRideServiceAreas
};
