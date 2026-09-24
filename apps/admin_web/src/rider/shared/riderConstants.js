/* ============================================================
   PAPIDO — Rider Constants & Pure Utility Helpers
   ============================================================ */

export const getTodayDateString = () => {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());
  } catch (_) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
};

export const getYesterdayDateString = () => {
  try {
    const d = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(d);
  } catch (_) {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
};

export const getHaversineDistanceKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

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

export const isScheduledTimeReached = (dateVal, bufferMinutes = 10) => {
  if (!dateVal) return true;
  try {
    const str = String(dateVal).trim();
    const d = new Date(str.includes('T') ? str : str.replace(' ', 'T'));
    if (isNaN(d.getTime())) return true;
    return Date.now() >= (d.getTime() - bufferMinutes * 60 * 1000);
  } catch (_) {
    return true;
  }
};

export const getScheduleGapConflict = (candidateTimeVal, reservedList) => {
  if (!candidateTimeVal || !reservedList || reservedList.length === 0) return null;
  try {
    const targetStr = String(candidateTimeVal).trim();
    const targetMs = new Date(targetStr.includes('T') ? targetStr : targetStr.replace(' ', 'T')).getTime();
    if (isNaN(targetMs)) return null;

    for (const res of reservedList) {
      const existTime = res.scheduled_time_ist || res.scheduled_time;
      if (!existTime) continue;
      const resStr = String(existTime).trim();
      const resMs = new Date(resStr.includes('T') ? resStr : resStr.replace(' ', 'T')).getTime();
      if (isNaN(resMs)) continue;

      const diffMin = Math.abs(targetMs - resMs) / (1000 * 60);
      if (diffMin < 15) {
        return {
          conflictingRideCode: res.ride_code || res.id,
          conflictingTime: existTime,
          diffMinutes: Math.round(diffMin)
        };
      }
    }
  } catch (_) {}
  return null;
};

export const calcDriverSplit = (rawFare) => {
  const f = parseFloat(rawFare) || 0;
  if (f <= 80) {
    const fee = Math.min(f, 4.0);
    const rider = Math.max(0, f - fee);
    return { rider, company: 2.0, controller: 2.0, platformFee: fee };
  } else {
    const comp = Number((f * 0.10).toFixed(2));
    const ctrl = 2.0;
    const fee = Number((comp + ctrl).toFixed(2));
    const rider = Number(Math.max(0, f - fee).toFixed(2));
    return { rider, company: comp, controller: ctrl, platformFee: fee };
  }
};

export const getRideLocalDay = (ride) => {
  const raw = ride?.completed_at || ride?.created_at || ride?.requested_at;
  if (!raw) return '';
  try {
    const str = String(raw).trim();
    const d = new Date(str.includes('T') ? str : str.replace(' ', 'T'));
    if (isNaN(d.getTime())) return String(raw).slice(0, 10);
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(d);
  } catch (_) {
    return String(raw).slice(0, 10);
  }
};

export const getMapLink = (address, lat = null, lng = null) => {
  if (lat && lng) {
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  }
  if (!address) return '#';
  if (address.startsWith('http://') || address.startsWith('https://')) {
    return address;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
};
