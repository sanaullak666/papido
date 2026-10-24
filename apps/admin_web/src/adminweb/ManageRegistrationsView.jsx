import React, { useState, useEffect } from 'react';
import './ManageRegistrationsView.css';
import { apiRequest } from '../api';
import {
  ShieldAlert,
  ShieldCheck,
  Users,
  Bike,
  Globe,
  RefreshCw,
  Save,
  Check,
  AlertCircle,
  Clock,
  Lock,
  Unlock,
  MessageSquare
} from 'lucide-react';

export function ManageRegistrationsView() {
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState(null);
  const [saveMessageLoading, setSaveMessageLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const [settings, setSettings] = useState({
    masterEnabled: true,
    passengerEnabled: true,
    riderEnabled: true,
    webEnabled: true,
    blockedMessage: 'Registrations are temporarily closed by campus administration.',
    updatedAt: null
  });

  const [customMessage, setCustomMessage] = useState('');

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await apiRequest('/admin/registrations/settings');
      if (res && res.data) {
        setSettings(res.data);
        setCustomMessage(res.data.blockedMessage || '');
      }
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed to load registration settings.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleToggle = async (key, currentValue) => {
    const newValue = !currentValue;
    const prevSettings = { ...settings };

    // Optimistic UI update
    setSettings(prev => ({ ...prev, [key]: newValue }));
    setSavingKey(key);
    setFeedback(null);

    try {
      const payload = { [key]: newValue };
      const res = await apiRequest('/admin/registrations/settings', 'POST', payload);
      if (res && res.data) {
        setSettings(res.data);
        setFeedback({
          type: 'success',
          text: `Setting updated: ${formatKeyName(key)} is now ${newValue ? 'ENABLED' : 'DISABLED'}.`
        });
      }
    } catch (err) {
      // Revert optimistic update
      setSettings(prevSettings);
      setFeedback({
        type: 'error',
        text: `Failed to update ${formatKeyName(key)}: ${err.message}`
      });
    } finally {
      setSavingKey(null);
    }
  };

  const handleSaveMessage = async (e) => {
    if (e) e.preventDefault();
    if (!customMessage.trim()) return;

    setSaveMessageLoading(true);
    setFeedback(null);

    try {
      const res = await apiRequest('/admin/registrations/settings', 'POST', {
        blockedMessage: customMessage.trim()
      });
      if (res && res.data) {
        setSettings(res.data);
        setFeedback({ type: 'success', text: 'Custom notice message saved successfully.' });
      }
    } catch (err) {
      setFeedback({ type: 'error', text: `Failed to save message: ${err.message}` });
    } finally {
      setSaveMessageLoading(false);
    }
  };

  const formatKeyName = (key) => {
    switch (key) {
      case 'masterEnabled': return 'Total Platform Registration';
      case 'passengerEnabled': return 'Passenger Registration';
      case 'riderEnabled': return 'Rider (Driver) Registration';
      case 'webEnabled': return 'Web Browser Registration';
      default: return key;
    }
  };

  const isGloballyOpen = settings.masterEnabled;

  return (
    <div className="mr-container">
      {/* ---------- Header Banner ---------- */}
      <div className="mr-header-card">
        <div className="mr-header-left">
          <div className={`mr-header-icon ${!isGloballyOpen ? 'is-blocked' : ''}`}>
            {isGloballyOpen ? <ShieldCheck size={28} /> : <ShieldAlert size={28} />}
          </div>
          <div>
            <h2 className="mr-header-title">Manage Registrations</h2>
            <p className="mr-header-sub">
              Control passenger and rider registration gates, master platform kill-switch, and web portal access.
            </p>
          </div>
        </div>

        <div className="mr-header-right">
          <div className={`mr-status-pill ${isGloballyOpen ? 'is-active' : 'is-blocked'}`}>
            <span className={`mr-dot ${isGloballyOpen ? 'is-active' : 'is-blocked'}`} />
            {isGloballyOpen ? 'System Open' : 'System Blocked'}
          </div>

          <button
            className="mr-refresh-btn"
            onClick={fetchSettings}
            disabled={loading}
            title="Refresh status"
          >
            <RefreshCw size={14} className={loading ? 'spin-icon' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ---------- Status Feedback ---------- */}
      {feedback && (
        <div className={`mr-banner is-${feedback.type}`}>
          {feedback.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* ---------- Master Kill-Switch Card ---------- */}
      <div className={`mr-master-card ${!settings.masterEnabled ? 'is-blocked' : 'is-active'}`}>
        <div className="mr-master-info">
          <div className="mr-master-icon">
            {settings.masterEnabled ? <Unlock size={24} /> : <Lock size={24} />}
          </div>
          <div className="mr-master-text">
            <h3>Total Platform Registration (Master Switch)</h3>
            <p>
              Emergency master kill-switch. When disabled, <strong>ALL</strong> registrations across the entire
              platform (Passenger, Rider, Mobile App, Web) are immediately blocked with zero exceptions.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span className={`mr-badge ${settings.masterEnabled ? 'is-enabled' : 'is-disabled'}`}>
            {settings.masterEnabled ? 'All Registrations Allowed' : 'Platform Totally Blocked'}
          </span>
          <label className="mr-switch" title="Toggle total platform registration">
            <input
              type="checkbox"
              checked={Boolean(settings.masterEnabled)}
              disabled={loading || savingKey === 'masterEnabled'}
              onChange={() => handleToggle('masterEnabled', settings.masterEnabled)}
            />
            <span className="mr-slider" />
          </label>
        </div>
      </div>

      {/* ---------- Specific Controls Grid ---------- */}
      <div className="mr-grid">
        {/* Card 1: Passenger Registration */}
        <div className={`mr-card ${!settings.passengerEnabled ? 'is-disabled' : 'is-active'}`}>
          <div className="mr-card-top">
            <div className="mr-card-icon">
              <Users size={22} />
            </div>
            <div className="mr-card-details">
              <h4>Passenger Registration</h4>
              <p>
                Permit or prevent new student &amp; campus passengers from registering accounts on Papido.
              </p>
            </div>
          </div>

          <div className="mr-card-bottom">
            <span className={`mr-badge ${settings.passengerEnabled ? 'is-enabled' : 'is-disabled'}`}>
              {settings.passengerEnabled ? 'Active / Enabled' : 'Disabled / Blocked'}
            </span>
            <label className="mr-switch" title="Toggle passenger registration">
              <input
                type="checkbox"
                checked={Boolean(settings.passengerEnabled)}
                disabled={loading || savingKey === 'passengerEnabled' || !settings.masterEnabled}
                onChange={() => handleToggle('passengerEnabled', settings.passengerEnabled)}
              />
              <span className="mr-slider" />
            </label>
          </div>
        </div>

        {/* Card 2: Rider (Driver) Registration */}
        <div className={`mr-card ${!settings.riderEnabled ? 'is-disabled' : 'is-active'}`}>
          <div className="mr-card-top">
            <div className="mr-card-icon">
              <Bike size={22} />
            </div>
            <div className="mr-card-details">
              <h4>Rider (Driver) Registration</h4>
              <p>
                Permit or prevent new bike and auto drivers from submitting KYC onboardings and vehicle registrations.
              </p>
            </div>
          </div>

          <div className="mr-card-bottom">
            <span className={`mr-badge ${settings.riderEnabled ? 'is-enabled' : 'is-disabled'}`}>
              {settings.riderEnabled ? 'Active / Enabled' : 'Disabled / Blocked'}
            </span>
            <label className="mr-switch" title="Toggle rider registration">
              <input
                type="checkbox"
                checked={Boolean(settings.riderEnabled)}
                disabled={loading || savingKey === 'riderEnabled' || !settings.masterEnabled}
                onChange={() => handleToggle('riderEnabled', settings.riderEnabled)}
              />
              <span className="mr-slider" />
            </label>
          </div>
        </div>

        {/* Card 3: Web Browser Registration */}
        <div className={`mr-card ${!settings.webEnabled ? 'is-disabled' : 'is-active'}`}>
          <div className="mr-card-top">
            <div className="mr-card-icon">
              <Globe size={22} />
            </div>
            <div className="mr-card-details">
              <h4>Web Browser Registration</h4>
              <p>
                Enable or disable registrations originating through web browsers. If disabled, users must use the mobile app.
              </p>
            </div>
          </div>

          <div className="mr-card-bottom">
            <span className={`mr-badge ${settings.webEnabled ? 'is-enabled' : 'is-disabled'}`}>
              {settings.webEnabled ? 'Active / Enabled' : 'Disabled / Blocked'}
            </span>
            <label className="mr-switch" title="Toggle web browser registration">
              <input
                type="checkbox"
                checked={Boolean(settings.webEnabled)}
                disabled={loading || savingKey === 'webEnabled' || !settings.masterEnabled}
                onChange={() => handleToggle('webEnabled', settings.webEnabled)}
              />
              <span className="mr-slider" />
            </label>
          </div>
        </div>
      </div>

      {/* ---------- Notice Message Customization ---------- */}
      <div className="mr-notice-card">
        <div className="mr-notice-header">
          <div className="mr-notice-title">
            <MessageSquare size={18} color="#38BDF8" />
            <span>Notice Message Shown to Blocked Users</span>
          </div>
          {settings.updatedAt && (
            <div className="mr-meta-info">
              <Clock size={13} />
              <span>Last updated: {new Date(settings.updatedAt).toLocaleString()}</span>
            </div>
          )}
        </div>

        <form onSubmit={handleSaveMessage} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <textarea
            className="mr-notice-textarea"
            rows={3}
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            placeholder="e.g. Registrations are temporarily closed by campus administration. Please contact support."
          />

          <button
            type="submit"
            className="mr-save-btn"
            disabled={saveMessageLoading || customMessage.trim() === (settings.blockedMessage || '')}
          >
            <Save size={15} />
            <span>{saveMessageLoading ? 'Saving...' : 'Save Notice Message'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}

export default ManageRegistrationsView;
