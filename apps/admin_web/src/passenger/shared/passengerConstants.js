export const DEFAULT_GROUPED_CAMPUS_STOPS = [
  {
    key: 'GIRLS_HOSTEL',
    label: 'Girls Hostels',
    stops: [
      { id: 'gh-1', name: 'Madame Curie Girls Hostel', lat: 12.0215, lng: 79.8565 },
      { id: 'gh-2', name: 'Mother Teresa Girls Hostel', lat: 12.0218, lng: 79.8570 },
      { id: 'gh-3', name: 'Ganga Girls Hostel', lat: 12.0222, lng: 79.8575 },
      { id: 'gh-4', name: 'Yamuna Girls Hostel', lat: 12.0225, lng: 79.8572 },
      { id: 'gh-5', name: 'Sarojini Naidu Girls Hostel', lat: 12.0212, lng: 79.8560 },
      { id: 'gh-6', name: 'Cauvery Girls Hostel', lat: 12.0220, lng: 79.8580 },
      { id: 'gh-7', name: 'Saraswathi Girls Hostel', lat: 12.0216, lng: 79.8568 }
    ]
  },
  {
    key: 'BOYS_HOSTEL',
    label: 'Boys Hostels',
    stops: [
      { id: 'bh-1', name: 'Silver Jubilee Hostel (SJC)', lat: 12.0280, lng: 79.8520 },
      { id: 'bh-2', name: 'Bharathidasan Boys Hostel', lat: 12.0275, lng: 79.8515 },
      { id: 'bh-3', name: 'Kabilar Boys Hostel', lat: 12.0270, lng: 79.8510 },
      { id: 'bh-4', name: 'Subramania Bharathi Boys Hostel', lat: 12.0285, lng: 79.8525 },
      { id: 'bh-5', name: 'Kalidas Boys Hostel', lat: 12.0268, lng: 79.8530 },
      { id: 'bh-6', name: 'Valmiki Boys Hostel', lat: 12.0272, lng: 79.8535 },
      { id: 'bh-7', name: 'Foreign Students Hostel', lat: 12.0288, lng: 79.8540 }
    ]
  },
  {
    key: 'DEPARTMENT',
    label: 'Departments & School Blocks',
    stops: [
      { id: 'dp-1', name: 'Science Complex / Physics Dept', lat: 12.0261, lng: 79.8550 },
      { id: 'dp-2', name: 'School of Management (SOM)', lat: 12.0255, lng: 79.8540 },
      { id: 'dp-3', name: 'Ramanujan Math & Computer Science Block', lat: 12.0265, lng: 79.8560 },
      { id: 'dp-4', name: 'School of Humanities & Social Sciences', lat: 12.0248, lng: 79.8535 },
      { id: 'dp-5', name: 'School of Life Sciences & Biotech', lat: 12.0258, lng: 79.8565 },
      { id: 'dp-6', name: 'School of Engineering & Technology', lat: 12.0270, lng: 79.8570 },
      { id: 'dp-7', name: 'School of Media & Communication', lat: 12.0250, lng: 79.8545 }
    ]
  },
  {
    key: 'GATE_HUB',
    label: 'Gates & Campus Hubs',
    stops: [
      { id: 'gt-1', name: 'PU Main Gate (Gate 1)', lat: 12.0228681, lng: 79.8509415 },
      { id: 'gt-2', name: 'Gate 2 (East Coast Road)', lat: 12.0295, lng: 79.8580 },
      { id: 'gt-3', name: 'Central Library', lat: 12.0245, lng: 79.8532 },
      { id: 'gt-4', name: 'University Canteen & Food Court', lat: 12.0238, lng: 79.8541 },
      { id: 'gt-5', name: 'Admin Block & Exam Wing', lat: 12.0252, lng: 79.8515 },
      { id: 'gt-6', name: 'Shopping Complex / Co-op Stores', lat: 12.0240, lng: 79.8538 },
      { id: 'gt-7', name: 'Rajiv Gandhi Sports Stadium', lat: 12.0290, lng: 79.8555 }
    ]
  }
];

export const CAMPUS_HOTSPOTS = DEFAULT_GROUPED_CAMPUS_STOPS.flatMap(g => g.stops);

export const POPULAR_OUTSIDE_SPOTS = [
  { name: 'White Town / Rock Beach', lat: 11.9338, lng: 79.8359 },
  { name: 'Pondicherry New Bus Stand', lat: 11.9350, lng: 79.8150 },
  { name: 'Pondicherry Railway Station', lat: 11.9280, lng: 79.8290 },
  { name: 'JIPMER Hospital & Campus', lat: 11.9560, lng: 79.7990 },
  { name: 'Auroville Visitor Centre', lat: 12.0070, lng: 79.8110 },
  { name: 'Puducherry Airport (Lawspet)', lat: 11.9680, lng: 79.8120 },
  { name: 'Sri Aurobindo Ashram', lat: 11.9360, lng: 79.8340 },
  { name: 'Mahatma Gandhi Statue (Beach)', lat: 11.9310, lng: 79.8365 },
  { name: 'ECR Toll Plaza (Kalapet)', lat: 12.0360, lng: 79.8620 }
];

export const formatRideDateTime = (dateVal) => {
  if (!dateVal) return 'Recent';
  try {
    const str = String(dateVal).trim();
    const d = new Date(str.includes('T') ? str : str.replace(' ', 'T'));
    if (isNaN(d.getTime())) return 'Recent';
    return d.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch (_) {
    return 'Recent';
  }
};

export const getLocationHint = (stopName) => {
  if (!stopName) return null;
  const s = stopName.toLowerCase();
  if (s.includes('sjc') || s.includes('silver') || s.includes('jubilee')) {
    return {
      label: 'Specific location in SJC (e.g. SOM Building, Kalidas Hostel, Mess)',
      placeholder: 'e.g. SOM Block, Kalidas Hostel Room 12'
    };
  }
  if (s.includes('girl')) {
    return {
      label: 'Specific Girls Hostel (e.g. Madame Curie, Mother Teresa, Ganga, Yamuna)',
      placeholder: 'e.g. Madame Curie Girls Hostel'
    };
  }
  if (s.includes('boy')) {
    return {
      label: 'Specific Boys Hostel (e.g. Bharathidasan, Kabilar, SJC, Kalidas)',
      placeholder: 'e.g. Bharathidasan Boys Hostel'
    };
  }
  if (s.includes('science') || s.includes('physics') || s.includes('math')) {
    return {
      label: 'Department Wing / Gate',
      placeholder: 'e.g. Physics Dept Entrance, Gate 2 side'
    };
  }
  return null;
};

