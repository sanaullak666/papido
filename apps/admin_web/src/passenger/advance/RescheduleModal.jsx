import React, { useState } from 'react';
import { apiRequest } from '../../api';
import { PSButton } from '../shared/PassengerUI';
import { X, AlertCircle, Calendar, Clock } from 'lucide-react';

/* Helpers */
const getLocalDateString = (d = new Date()) => {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
};

const getTodayDateStr = () => getLocalDateString(new Date());
const getTomorrowDateStr = () =>
  getLocalDateString(new Date(Date.now() + 86400000));

export function RescheduleModal({ ride, token, onClose, onSuccess }) {
  const [dateOption, setDateOption] = useState('TODAY');
  const [date, setDate] = useState(getTodayDateStr());
  const [hour, setHour] = useState('09');
  const [minute, setMinute] = useState('00');
  const [ampm, setAmpm] = useState('AM');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    /* Convert 12h → 24h */
    let h24 = parseInt(hour, 10);
    if (ampm === 'PM' && h24 < 12) h24 += 12;
    if (ampm === 'AM' && h24 === 12) h24 = 0;

    const timePart = `${String(h24).padStart(2, '0')}:${minute}:00`;
    const finalDateTime = `${date}T${timePart}`;

    /* Validate future time */
    const chosen = new Date(finalDateTime);
    if (isNaN(chosen.getTime()) || chosen <= new Date()) {
      setError('Please choose a future pickup time.');
      return;
    }

    setSaving(true);
    try {
      await apiRequest(
        `/customer/rides/${ride.id}/reschedule`,
        'POST',
        { scheduledTime: finalDateTime },
        token
      );
      onSuccess?.();
    } catch (err) {
      setError(err.message || 'Failed to reschedule.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="ps-modal-overlay">
      <div className="ps-modal ps-modal--md ps-modal-in ps-modal--amber">

        {/* Head */}
        <div className="ps-modal-head">
          <div>
            <h3 className="ps-modal-title">
              <Calendar size={18} color="#EA580C" /> Reschedule Ride
            </h3>
            <p className="ps-modal-sub">
              #{ride.ride_code || ride.id} · {ride.pickup_address} →{' '}
              {ride.destination_address}
            </p>
          </div>
          <button
            className="ps-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="ps-modal-error">
            <AlertCircle size={15} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>

          {/* Date */}
          <div>
            <label className="ps-field-label">1. Choose Date</label>
            <div className="ps-schedule-date-pills">
              <button
                type="button"
                onClick={() => { setDateOption('TODAY'); setDate(getTodayDateStr()); }}
                className={`ps-schedule-pill ${dateOption === 'TODAY' ? 'is-active' : ''}`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => { setDateOption('TOMORROW'); setDate(getTomorrowDateStr()); }}
                className={`ps-schedule-pill ${dateOption === 'TOMORROW' ? 'is-active' : ''}`}
              >
                Tomorrow
              </button>
              <button
                type="button"
                onClick={() => setDateOption('CUSTOM')}
                className={`ps-schedule-pill ${dateOption === 'CUSTOM' ? 'is-active' : ''}`}
              >
                Pick Date
              </button>
            </div>

            {dateOption === 'CUSTOM' && (
              <input
                type="date"
                min={getTodayDateStr()}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="ps-schedule-date-input"
                required
              />
            )}
          </div>

          {/* Time */}
          <div style={{ marginTop: 14 }}>
            <label className="ps-field-label">2. Choose Pickup Time</label>
            <div className="ps-schedule-time-row">
              <div>
                <div className="ps-schedule-time-label">Hour</div>
                <select
                  value={hour}
                  onChange={(e) => setHour(e.target.value)}
                  className="ps-select"
                >
                  {['01','02','03','04','05','06','07','08','09','10','11','12'].map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
              <div>
                <div className="ps-schedule-time-label">Minute</div>
                <select
                  value={minute}
                  onChange={(e) => setMinute(e.target.value)}
                  className="ps-select"
                >
                  {['00','05','10','15','20','25','30','35','40','45','50','55'].map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <div className="ps-schedule-time-label">Period</div>
                <div className="ps-schedule-period">
                  <button
                    type="button"
                    onClick={() => setAmpm('AM')}
                    className={`ps-period-btn ${ampm === 'AM' ? 'is-active' : ''}`}
                  >AM</button>
                  <button
                    type="button"
                    onClick={() => setAmpm('PM')}
                    className={`ps-period-btn ${ampm === 'PM' ? 'is-active' : ''}`}
                  >PM</button>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="ps-row-2" style={{ marginTop: 20 }}>
            <PSButton type="button" variant="ghost" onClick={onClose}>
              Cancel
            </PSButton>
            <PSButton type="submit" variant="primary" disabled={saving}>
              {saving ? 'Saving...' : 'Confirm Reschedule'}
            </PSButton>
          </div>

        </form>
      </div>
    </div>
  );
}

export default RescheduleModal;
