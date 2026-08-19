import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api';
import {
  MapPin,
  Save,
  Plus,
  Edit2,
  CheckCircle,
  RefreshCw,
  Trash2,
  ArrowRight,
  Sparkles,
  FolderTree,
  Building
} from 'lucide-react';

const CATEGORY_META = [
  { key: 'GIRLS_HOSTEL', label: 'Girls Hostels', token: '[Girls Hostels]', icon: '👧', color: '#EC4899', bg: 'rgba(236, 72, 153, 0.12)' },
  { key: 'BOYS_HOSTEL', label: 'Boys Hostels', token: '[Boys Hostels]', icon: '👦', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.12)' },
  { key: 'DEPARTMENT', label: 'Departments & Schools', token: '[Departments & Schools]', icon: '🏛️', color: '#10B981', bg: 'rgba(16, 185, 129, 0.12)' },
  { key: 'GATE_HUB', label: 'Gates & Campus Hubs', token: '[Gates & Hubs]', icon: '🚪', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.12)' }
];

export function FareSettingsView() {
  const [activeTab, setActiveTab] = useState('routes'); // 'routes', 'locations', 'fallback'
  const [fareConfigs, setFareConfigs] = useState([]);
  const [routeFares, setRouteFares] = useState([]);
  const [campusStops, setCampusStops] = useState([]);
  const [groupedStops, setGroupedStops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingFare, setSavingFare] = useState(false);
  const [editingConfig, setEditingConfig] = useState(null);
  const [editingRoute, setEditingRoute] = useState(null);
  const [showAddRoute, setShowAddRoute] = useState(false);
  const [showAddStopModal, setShowAddStopModal] = useState(false);
  const [routeFilter, setRouteFilter] = useState('ALL'); // 'ALL', 'GROUPS', 'SPECIFIC'
  const [searchQuery, setSearchQuery] = useState('');

  // Route Form State
  const [newRoute, setNewRoute] = useState({
    pickupStop: 'Silver Jubilee Hostel (SJC)',
    destinationStop: '[Girls Hostels]',
    fareAmount: '25.00',
    distanceKm: '1.8'
  });

  // Stop Form State
  const [newStop, setNewStop] = useState({
    name: '',
    category: 'GIRLS_HOSTEL',
    latitude: '12.0220',
    longitude: '79.8560',
    displayOrder: 0
  });

  // Live Rule Tester State
  const [testPickup, setTestPickup] = useState('');
  const [testDrop, setTestDrop] = useState('');
  const [testResult, setTestResult] = useState(null);
  const [testingRoute, setTestingRoute] = useState(false);

  const [successMsg, setSuccessMsg] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [configsRes, routesRes, stopsRes] = await Promise.all([
        apiRequest('/admin/fare-settings'),
        apiRequest('/admin/route-fares'),
        apiRequest('/admin/campus-stops')
      ]);
      setFareConfigs(configsRes.data || []);
      setRouteFares(routesRes.data || []);
      if (stopsRes.data) {
        setCampusStops(stopsRes.data.stops || []);
        setGroupedStops(stopsRes.data.grouped || []);
        if (stopsRes.data.stops && stopsRes.data.stops.length > 0 && !testPickup) {
          setTestPickup(stopsRes.data.stops[0].name);
          setTestDrop(stopsRes.data.stops[1] ? stopsRes.data.stops[1].name : stopsRes.data.stops[0].name);
        }
      }
    } catch (err) {
      console.error('Failed to load fare settings', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateFare = async (config) => {
    try {
      setSavingFare(true);
      await apiRequest(`/admin/fare-settings/${config.vehicle_type}`, 'PATCH', {
        baseFare: parseFloat(config.base_fare),
        baseDistanceKm: parseFloat(config.base_distance_km),
        perKmFare: parseFloat(config.per_km_fare),
        perMinuteFare: parseFloat(config.per_minute_fare),
        minimumFare: parseFloat(config.minimum_fare),
        cancellationFee: parseFloat(config.cancellation_fee)
      });
      setSuccessMsg(`Default rates for ${config.vehicle_type} updated successfully!`);
      setTimeout(() => setSuccessMsg(''), 4000);
      setEditingConfig(null);
      loadData();
    } catch (err) {
      alert(`Failed to update fare: ${err.message}`);
    } finally {
      setSavingFare(false);
    }
  };

  const handleSaveRoute = async (routeData) => {
    try {
      const p = routeData.pickup_stop || routeData.pickupStop;
      const d = routeData.destination_stop || routeData.destinationStop;
      if (!p || !d) {
        alert('Please select or specify both Pickup and Destination.');
        return;
      }
      if (p.trim().toLowerCase() === d.trim().toLowerCase()) {
        alert('Pickup and Destination cannot be the same location.');
        return;
      }

      await apiRequest('/admin/route-fares', 'POST', {
        id: routeData.id,
        pickupStop: p,
        destinationStop: d,
        fareAmount: parseFloat(routeData.fare_amount || routeData.fareAmount),
        distanceKm: parseFloat(routeData.distance_km || routeData.distanceKm || 1.5),
        isActive: routeData.is_active !== undefined ? routeData.is_active : 1
      });
      setSuccessMsg('Campus route pricing saved successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
      setEditingRoute(null);
      setShowAddRoute(false);
      loadData();
    } catch (err) {
      alert(`Failed to save route fare: ${err.message}`);
    }
  };

  const handleDeleteRoute = async (id) => {
    if (!window.confirm('Are you sure you want to delete this route fare rule?')) return;
    try {
      await apiRequest(`/admin/route-fares/${id}`, 'DELETE');
      setSuccessMsg('Route fare rule deleted.');
      setTimeout(() => setSuccessMsg(''), 4000);
      loadData();
    } catch (err) {
      alert(`Failed to delete route: ${err.message}`);
    }
  };

  const handleSaveCampusStop = async (e) => {
    e.preventDefault();
    if (!newStop.name.trim()) {
      alert('Please enter a location / building name.');
      return;
    }
    try {
      await apiRequest('/admin/campus-stops', 'POST', {
        name: newStop.name.trim(),
        category: newStop.category,
        latitude: parseFloat(newStop.latitude || 12.0240),
        longitude: parseFloat(newStop.longitude || 79.8530),
        displayOrder: parseInt(newStop.displayOrder || 0)
      });
      setSuccessMsg(`"${newStop.name}" added to campus locations!`);
      setTimeout(() => setSuccessMsg(''), 4000);
      setNewStop({ name: '', category: 'GIRLS_HOSTEL', latitude: '12.0220', longitude: '79.8560', displayOrder: 0 });
      setShowAddStopModal(false);
      loadData();
    } catch (err) {
      alert(`Failed to save campus stop: ${err.message}`);
    }
  };

  const handleDeleteCampusStop = async (id, name) => {
    if (!window.confirm(`Are you sure you want to remove "${name}" from campus locations?`)) return;
    try {
      await apiRequest(`/admin/campus-stops/${id}`, 'DELETE');
      setSuccessMsg(`"${name}" removed from campus locations.`);
      setTimeout(() => setSuccessMsg(''), 4000);
      loadData();
    } catch (err) {
      alert(`Failed to delete location: ${err.message}`);
    }
  };

  const handleTestFareRule = async () => {
    if (!testPickup || !testDrop) return;
    try {
      setTestingRoute(true);
      const res = await apiRequest('/admin/route-fares/test', 'POST', {
        pickupStop: testPickup,
        destinationStop: testDrop
      });
      setTestResult(res.data);
    } catch (err) {
      alert(`Testing error: ${err.message}`);
    } finally {
      setTestingRoute(false);
    }
  };

  const isGroupToken = (val) => val && val.startsWith('[') && val.endsWith(']');

  const filteredRoutes = routeFares.filter(r => {
    const isGroup = isGroupToken(r.pickup_stop) || isGroupToken(r.destination_stop);
    if (routeFilter === 'GROUPS' && !isGroup) return false;
    if (routeFilter === 'SPECIFIC' && isGroup) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (r.pickup_stop || '').toLowerCase().includes(q) || (r.destination_stop || '').toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div>
      {/* Success Notification Banner */}
      {successMsg && (
        <div style={{
          padding: '14px 20px',
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.4)',
          borderRadius: 'var(--radius-md)',
          color: '#34D399',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <CheckCircle size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Tab Navigation */}
      <div style={{
        display: 'flex',
        gap: '8px',
        borderBottom: '1px solid var(--border)',
        paddingBottom: '12px',
        marginBottom: '24px',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={() => setActiveTab('routes')}
          className="btn"
          style={{
            background: activeTab === 'routes' ? 'var(--primary)' : 'var(--bg-card)',
            color: activeTab === 'routes' ? '#000' : 'var(--text-primary)',
            border: '1px solid var(--border)',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <FolderTree size={16} /> Campus Route & Group Pricing Matrix
          <span style={{
            background: activeTab === 'routes' ? 'rgba(0,0,0,0.2)' : 'var(--bg-sidebar)',
            padding: '2px 8px',
            borderRadius: '10px',
            fontSize: '11px'
          }}>
            {routeFares.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('locations')}
          className="btn"
          style={{
            background: activeTab === 'locations' ? 'var(--primary)' : 'var(--bg-card)',
            color: activeTab === 'locations' ? '#000' : 'var(--text-primary)',
            border: '1px solid var(--border)',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Building size={16} /> Campus Location Lists & Stops
          <span style={{
            background: activeTab === 'locations' ? 'rgba(0,0,0,0.2)' : 'var(--bg-sidebar)',
            padding: '2px 8px',
            borderRadius: '10px',
            fontSize: '11px'
          }}>
            {campusStops.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('fallback')}
          className="btn"
          style={{
            background: activeTab === 'fallback' ? 'var(--primary)' : 'var(--bg-card)',
            color: activeTab === 'fallback' ? '#000' : 'var(--text-primary)',
            border: '1px solid var(--border)',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          ⚡ Vehicle Fallback Rates & Driver Splits
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: CAMPUS ROUTE & GROUP PRICING MATRIX */}
      {/* ========================================================================= */}
      {activeTab === 'routes' && (
        <>
          {/* Quick Group Rule Overview Banner */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(99, 102, 241, 0.12))',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: 'var(--radius-lg)',
            padding: '16px 20px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={18} /> Group & List-Based Fare Pricing Active
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Define fixed pricing between specific stops (e.g. <strong>SJC</strong>) and entire location groups (e.g. <strong>[Girls Hostels]</strong>). All stops inside that group automatically inherit the price!
              </div>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => setShowAddRoute(true)}>
              <Plus size={14} /> Add Route / Group Fare
            </button>
          </div>

          {/* Add / Edit Route Form */}
          {showAddRoute && (
            <div className="panel" style={{ border: '1px solid var(--primary)', marginBottom: '24px' }}>
              <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 className="panel-title" style={{ color: 'var(--primary)' }}>
                  {editingRoute ? 'Edit Campus Route Fare' : 'Create Route / Group Fare Rule'}
                </h3>
                <button className="btn btn-secondary btn-sm" onClick={() => { setShowAddRoute(false); setEditingRoute(null); }}>Cancel</button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginTop: '14px' }}>
                {/* Pickup Selection */}
                <div>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 700 }}>
                    Pickup Location / Group
                  </label>
                  <select
                    className="form-input"
                    value={newRoute.pickupStop}
                    onChange={(e) => setNewRoute({ ...newRoute, pickupStop: e.target.value })}
                  >
                    <optgroup label="🌟 Entire Location Groups (List Rules)">
                      {CATEGORY_META.map(c => (
                        <option key={`p-grp-${c.key}`} value={c.token}>
                          {c.icon} {c.token} (Applies to all {c.label})
                        </option>
                      ))}
                    </optgroup>

                    {groupedStops.map(group => (
                      <optgroup key={`p-${group.key}`} label={`${group.icon} ${group.label}`}>
                        {group.stops.map(stop => (
                          <option key={`p-stop-${stop.id}`} value={stop.name}>
                            {stop.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                {/* Destination Selection */}
                <div>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 700 }}>
                    Destination Location / Group
                  </label>
                  <select
                    className="form-input"
                    value={newRoute.destinationStop}
                    onChange={(e) => setNewRoute({ ...newRoute, destinationStop: e.target.value })}
                  >
                    <optgroup label="🌟 Entire Location Groups (List Rules)">
                      {CATEGORY_META.map(c => (
                        <option key={`d-grp-${c.key}`} value={c.token}>
                          {c.icon} {c.token} (Applies to all {c.label})
                        </option>
                      ))}
                    </optgroup>

                    {groupedStops.map(group => (
                      <optgroup key={`d-${group.key}`} label={`${group.icon} ${group.label}`}>
                        {group.stops.map(stop => (
                          <option key={`d-stop-${stop.id}`} value={stop.name}>
                            {stop.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                {/* Fixed Fare */}
                <div>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 700 }}>
                    Fixed Fare (₹)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="10"
                    max="200"
                    className="form-input"
                    value={newRoute.fareAmount}
                    onChange={(e) => setNewRoute({ ...newRoute, fareAmount: e.target.value })}
                    placeholder="25.00"
                  />
                </div>

                {/* Distance */}
                <div>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 700 }}>
                    Estimated Distance (km)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    className="form-input"
                    value={newRoute.distanceKm}
                    onChange={(e) => setNewRoute({ ...newRoute, distanceKm: e.target.value })}
                    placeholder="1.5"
                  />
                </div>
              </div>

              {/* Rule Summary Tip */}
              <div style={{
                marginTop: '16px',
                padding: '12px 16px',
                background: 'var(--bg-sidebar)',
                borderRadius: '8px',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <span style={{ fontSize: '16px' }}>💡</span>
                <span>
                  Rule Preview: Any trip between <strong>{newRoute.pickupStop}</strong> and <strong>{newRoute.destinationStop}</strong> will be charged exactly <strong>₹{parseFloat(newRoute.fareAmount || 0).toFixed(2)}</strong>.
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowAddRoute(false)}>Cancel</button>
                <button className="btn btn-primary btn-sm" onClick={() => handleSaveRoute(newRoute)}>
                  <Save size={13} /> Save Route Fare Rule
                </button>
              </div>
            </div>
          )}

          {/* Interactive Live Fare Tester */}
          <div className="panel" style={{ marginBottom: '24px', background: 'var(--bg-card)' }}>
            <div className="panel-header">
              <div>
                <h3 className="panel-title" style={{ fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={16} color="var(--primary)" /> Live Campus Fare Rule Simulator
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Test any pickup and destination combination to instantly verify which Group or Route rule applies and what fare the student will see.
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '14px', alignItems: 'flex-end', marginTop: '12px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '11px' }}>Test Pickup Stop</label>
                <select
                  className="form-input"
                  value={testPickup}
                  onChange={(e) => { setTestPickup(e.target.value); setTestResult(null); }}
                >
                  {groupedStops.map(group => (
                    <optgroup key={`tp-${group.key}`} label={`${group.icon} ${group.label}`}>
                      {group.stops.map(stop => (
                        <option key={`tp-stop-${stop.id}`} value={stop.name}>
                          {stop.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '11px' }}>Test Destination Stop</label>
                <select
                  className="form-input"
                  value={testDrop}
                  onChange={(e) => { setTestDrop(e.target.value); setTestResult(null); }}
                >
                  {groupedStops.map(group => (
                    <optgroup key={`td-${group.key}`} label={`${group.icon} ${group.label}`}>
                      {group.stops.map(stop => (
                        <option key={`td-stop-${stop.id}`} value={stop.name}>
                          {stop.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              <button
                className="btn btn-primary"
                onClick={handleTestFareRule}
                disabled={testingRoute || !testPickup || !testDrop}
                style={{ padding: '10px 18px', fontWeight: 700 }}
              >
                {testingRoute ? 'Simulating...' : 'Test Fare Rule'}
              </button>
            </div>

            {testResult && (
              <div style={{
                marginTop: '16px',
                padding: '14px 18px',
                background: testResult.matched ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                border: `1px solid ${testResult.matched ? '#10B981' : '#F59E0B'}`,
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '14px', color: testResult.matched ? '#34D399' : '#FBBF24' }}>
                    {testResult.matched ? '✅ Matched Fare Rule Found' : 'ℹ️ Fallback Base Rate Applied'}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-primary)', marginTop: '2px' }}>
                    {testResult.description || 'Standard base charge calculation applies.'}
                  </div>
                  {testResult.ruleType && (
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Rule Type: <span className="badge badge-warning" style={{ fontSize: '10px' }}>{testResult.ruleType}</span>
                    </div>
                  )}
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Passenger Fare</div>
                  <div style={{ fontSize: '24px', fontWeight: 900, color: 'var(--primary)' }}>
                    ₹{parseFloat(testResult.fare || 25).toFixed(2)}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Route Table Panel */}
          <div className="panel">
            <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MapPin className="text-primary" size={20} /> Campus Route & Group Fare Rules
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  Total {filteredRoutes.length} rules active. Directly synced with Passenger Booking & Driver Dispatch.
                </p>
              </div>

              {/* Filters & Search */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', background: 'var(--bg-sidebar)', padding: '2px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <button
                    onClick={() => setRouteFilter('ALL')}
                    style={{
                      padding: '4px 10px',
                      fontSize: '12px',
                      borderRadius: '6px',
                      border: 'none',
                      background: routeFilter === 'ALL' ? 'var(--primary)' : 'transparent',
                      color: routeFilter === 'ALL' ? '#000' : 'var(--text-secondary)',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    All ({routeFares.length})
                  </button>
                  <button
                    onClick={() => setRouteFilter('GROUPS')}
                    style={{
                      padding: '4px 10px',
                      fontSize: '12px',
                      borderRadius: '6px',
                      border: 'none',
                      background: routeFilter === 'GROUPS' ? 'var(--primary)' : 'transparent',
                      color: routeFilter === 'GROUPS' ? '#000' : 'var(--text-secondary)',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Group Rules ({routeFares.filter(r => isGroupToken(r.pickup_stop) || isGroupToken(r.destination_stop)).length})
                  </button>
                  <button
                    onClick={() => setRouteFilter('SPECIFIC')}
                    style={{
                      padding: '4px 10px',
                      fontSize: '12px',
                      borderRadius: '6px',
                      border: 'none',
                      background: routeFilter === 'SPECIFIC' ? 'var(--primary)' : 'transparent',
                      color: routeFilter === 'SPECIFIC' ? '#000' : 'var(--text-secondary)',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Stop-to-Stop
                  </button>
                </div>

                <input
                  type="text"
                  placeholder="Filter routes..."
                  className="form-input"
                  style={{ width: '160px', padding: '6px 10px', fontSize: '12px' }}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />

                <button className="btn btn-secondary btn-sm" onClick={loadData} title="Refresh Table">
                  <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Rule Type</th>
                    <th>Pickup Stop / Group</th>
                    <th style={{ textAlign: 'center' }}>Direction</th>
                    <th>Destination Stop / Group</th>
                    <th>Est. Distance</th>
                    <th>Fixed Fare (₹)</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRoutes.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                        No route fare rules found matching filter. Click "Add Route / Group Fare" above.
                      </td>
                    </tr>
                  ) : (
                    filteredRoutes.map((r) => {
                      const isEditing = editingRoute?.id === r.id;
                      const current = isEditing ? editingRoute : r;
                      const isPickupGroup = isGroupToken(r.pickup_stop);
                      const isDestGroup = isGroupToken(r.destination_stop);
                      const isGroupRule = isPickupGroup || isDestGroup;

                      return (
                        <tr key={r.id} style={{ background: isGroupRule ? 'rgba(245, 158, 11, 0.02)' : 'transparent' }}>
                          <td>
                            {isGroupRule ? (
                              <span className="badge" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818CF8', border: '1px solid rgba(99, 102, 241, 0.3)', fontSize: '11px' }}>
                                🌟 Group Rule
                              </span>
                            ) : (
                              <span className="badge" style={{ background: 'rgba(148, 163, 184, 0.15)', color: '#94A3B8', fontSize: '11px' }}>
                                📍 Stop-to-Stop
                              </span>
                            )}
                          </td>

                          {/* Pickup Column */}
                          <td>
                            {isEditing ? (
                              <input
                                type="text"
                                className="form-input"
                                style={{ padding: '4px 8px', fontSize: '12px' }}
                                value={current.pickup_stop}
                                onChange={(e) => setEditingRoute({ ...editingRoute, pickup_stop: e.target.value })}
                              />
                            ) : (
                              <span style={{ fontWeight: isPickupGroup ? 800 : 600, color: isPickupGroup ? '#F59E0B' : 'var(--text-primary)' }}>
                                {r.pickup_stop}
                              </span>
                            )}
                          </td>

                          <td style={{ textAlign: 'center', color: 'var(--primary)' }}>
                            <ArrowRight size={16} />
                          </td>

                          {/* Destination Column */}
                          <td>
                            {isEditing ? (
                              <input
                                type="text"
                                className="form-input"
                                style={{ padding: '4px 8px', fontSize: '12px' }}
                                value={current.destination_stop}
                                onChange={(e) => setEditingRoute({ ...editingRoute, destination_stop: e.target.value })}
                              />
                            ) : (
                              <span style={{ fontWeight: isDestGroup ? 800 : 600, color: isDestGroup ? '#F59E0B' : 'var(--text-primary)' }}>
                                {r.destination_stop}
                              </span>
                            )}
                          </td>

                          {/* Distance Column */}
                          <td>
                            {isEditing ? (
                              <input
                                type="number"
                                step="0.1"
                                style={{ width: '70px', padding: '4px 6px' }}
                                className="form-input"
                                value={current.distance_km}
                                onChange={(e) => setEditingRoute({ ...editingRoute, distance_km: e.target.value })}
                              />
                            ) : (
                              `${r.distance_km || 1.5} km`
                            )}
                          </td>

                          {/* Fare Column */}
                          <td>
                            {isEditing ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span>₹</span>
                                <input
                                  type="number"
                                  step="1"
                                  style={{ width: '80px', padding: '4px 6px', fontWeight: 'bold' }}
                                  className="form-input"
                                  value={current.fare_amount}
                                  onChange={(e) => setEditingRoute({ ...editingRoute, fare_amount: e.target.value })}
                                />
                              </div>
                            ) : (
                              <span style={{ fontWeight: 900, color: 'var(--primary)', fontSize: '15px' }}>
                                ₹{parseFloat(r.fare_amount).toFixed(2)}
                              </span>
                            )}
                          </td>

                          <td>
                            <span className={`badge ${r.is_active ? 'badge-success' : 'badge-danger'}`}>
                              {r.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>

                          <td style={{ textAlign: 'right' }}>
                            {isEditing ? (
                              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                                <button className="btn btn-primary btn-sm" onClick={() => handleSaveRoute(editingRoute)}>
                                  <Save size={12} /> Save
                                </button>
                                <button className="btn btn-secondary btn-sm" onClick={() => setEditingRoute(null)}>
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                                <button className="btn btn-secondary btn-sm" onClick={() => setEditingRoute({ ...r })}>
                                  <Edit2 size={12} /> Edit
                                </button>
                                <button className="btn btn-danger btn-sm" onClick={() => handleDeleteRoute(r.id)}>
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: CAMPUS LOCATIONS & CATEGORY LISTS */}
      {/* ========================================================================= */}
      {activeTab === 'locations' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h2 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building className="text-primary" size={20} /> Campus Location Categories & Lists
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Organize hostels, departments, school blocks, and gates into lists. Route fares configured with group tokens automatically apply to all stops inside that group!
              </p>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => setShowAddStopModal(true)}>
              <Plus size={14} /> Add Campus Stop
            </button>
          </div>

          {/* Add Stop Modal / Panel */}
          {showAddStopModal && (
            <div className="panel" style={{ border: '1px solid var(--primary)', marginBottom: '24px' }}>
              <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 className="panel-title" style={{ color: 'var(--primary)' }}>Add New Campus Building / Stop</h3>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowAddStopModal(false)}>Close</button>
              </div>

              <form onSubmit={handleSaveCampusStop}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginTop: '14px' }}>
                  <div>
                    <label className="form-label" style={{ fontSize: '11px' }}>Building / Stop Name</label>
                    <input
                      type="text"
                      className="form-input"
                      value={newStop.name}
                      onChange={(e) => setNewStop({ ...newStop, name: e.target.value })}
                      placeholder="e.g. Ganga Girls Hostel"
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label" style={{ fontSize: '11px' }}>Category / List</label>
                    <select
                      className="form-input"
                      value={newStop.category}
                      onChange={(e) => setNewStop({ ...newStop, category: e.target.value })}
                    >
                      {CATEGORY_META.map(c => (
                        <option key={c.key} value={c.key}>
                          {c.icon} {c.label} ({c.token})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="form-label" style={{ fontSize: '11px' }}>Latitude (Map Pin)</label>
                    <input
                      type="number"
                      step="0.000001"
                      className="form-input"
                      value={newStop.latitude}
                      onChange={(e) => setNewStop({ ...newStop, latitude: e.target.value })}
                      placeholder="12.0220"
                    />
                  </div>

                  <div>
                    <label className="form-label" style={{ fontSize: '11px' }}>Longitude (Map Pin)</label>
                    <input
                      type="number"
                      step="0.000001"
                      className="form-input"
                      value={newStop.longitude}
                      onChange={(e) => setNewStop({ ...newStop, longitude: e.target.value })}
                      placeholder="79.8560"
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowAddStopModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary btn-sm">
                    <Save size={13} /> Save Location
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Categorized Location Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            {groupedStops.map(group => {
              const meta = CATEGORY_META.find(c => c.key === group.key) || CATEGORY_META[3];

              return (
                <div
                  key={group.key}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '24px' }}>{group.icon || meta.icon}</span>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '16px' }}>{group.label}</div>
                        <div style={{ fontSize: '11px', color: meta.color, fontWeight: 700 }}>
                          Group Token: <code>{meta.token}</code>
                        </div>
                      </div>
                    </div>

                    <span className="badge" style={{ background: meta.bg, color: meta.color, fontWeight: 800 }}>
                      {group.stops.length} locations
                    </span>
                  </div>

                  <div style={{
                    background: 'var(--bg-sidebar)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px',
                    maxHeight: '300px',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}>
                    {group.stops.length === 0 ? (
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '16px' }}>
                        No locations added to this list yet.
                      </div>
                    ) : (
                      group.stops.map(stop => (
                        <div
                          key={stop.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 10px',
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border)',
                            borderRadius: '6px'
                          }}
                        >
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 600 }}>{stop.name}</div>
                            {stop.latitude && stop.longitude && (
                              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                📍 {parseFloat(stop.latitude).toFixed(4)}, {parseFloat(stop.longitude).toFixed(4)}
                              </div>
                            )}
                          </div>

                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleDeleteCampusStop(stop.id, stop.name)}
                            title="Delete location"
                            style={{ padding: '4px 6px', color: '#F87171' }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: VEHICLE FALLBACK RATES & DRIVER SPLIT POLICIES */}
      {/* ========================================================================= */}
      {activeTab === 'fallback' && (
        <div>
          {/* Default Vehicle Fallback Rates */}
          <div className="panel" style={{ marginBottom: '24px' }}>
            <div className="panel-header">
              <div>
                <h2 className="panel-title">Default Fallback Rates (Unlisted Routes)</h2>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  Standard base charges and per-kilometer fallback pricing when a trip does not match any preset route or group rule.
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              {fareConfigs.map((fc) => {
                const isEditing = editingConfig?.id === fc.id;
                const current = isEditing ? editingConfig : fc;

                return (
                  <div
                    key={fc.id}
                    style={{
                      background: 'var(--bg-sidebar)',
                      border: isEditing ? '1px solid var(--primary)' : '1px solid var(--border)',
                      borderRadius: 'var(--radius-lg)',
                      padding: '20px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="badge badge-warning" style={{ fontSize: '12px' }}>{current.vehicle_type} (Bike)</span>
                      {!isEditing ? (
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => setEditingConfig({ ...fc })}
                        >
                          <Edit2 size={13} /> Edit Rates
                        </button>
                      ) : (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleUpdateFare(editingConfig)}
                            disabled={savingFare}
                          >
                            <Save size={13} /> Save
                          </button>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => setEditingConfig(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '8px' }}>
                      <div>
                        <div className="form-label" style={{ fontSize: '11px' }}>Base Fare (₹)</div>
                        {isEditing ? (
                          <input
                            type="number"
                            className="form-input"
                            style={{ padding: '6px 10px' }}
                            value={current.base_fare}
                            onChange={(e) => setEditingConfig({ ...editingConfig, base_fare: e.target.value })}
                          />
                        ) : (
                          <div style={{ fontSize: '16px', fontWeight: 800 }}>₹{parseFloat(fc.base_fare).toFixed(2)}</div>
                        )}
                      </div>

                      <div>
                        <div className="form-label" style={{ fontSize: '11px' }}>Base Distance (km)</div>
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.1"
                            className="form-input"
                            style={{ padding: '6px 10px' }}
                            value={current.base_distance_km}
                            onChange={(e) => setEditingConfig({ ...editingConfig, base_distance_km: e.target.value })}
                          />
                        ) : (
                          <div style={{ fontSize: '16px', fontWeight: 800 }}>{fc.base_distance_km} km</div>
                        )}
                      </div>

                      <div>
                        <div className="form-label" style={{ fontSize: '11px' }}>Per Km Rate (₹)</div>
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.5"
                            className="form-input"
                            style={{ padding: '6px 10px' }}
                            value={current.per_km_fare}
                            onChange={(e) => setEditingConfig({ ...editingConfig, per_km_fare: e.target.value })}
                          />
                        ) : (
                          <div style={{ fontSize: '16px', fontWeight: 800 }}>₹{parseFloat(fc.per_km_fare).toFixed(2)}/km</div>
                        )}
                      </div>

                      <div>
                        <div className="form-label" style={{ fontSize: '11px' }}>Min Fare (₹)</div>
                        {isEditing ? (
                          <input
                            type="number"
                            className="form-input"
                            style={{ padding: '6px 10px' }}
                            value={current.minimum_fare}
                            onChange={(e) => setEditingConfig({ ...editingConfig, minimum_fare: e.target.value })}
                          />
                        ) : (
                          <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--primary)' }}>₹{parseFloat(fc.minimum_fare).toFixed(2)}</div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Company Revenue & Driver Split Policy */}
          <div className="panel">
            <div className="panel-header">
              <h2 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>⚖️</span> Company Revenue & Driver Split Policy
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Automated settlement policy applied to all completed campus and outside trips.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginTop: '16px' }}>
              <div style={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border)', borderRadius: '12px', padding: '18px' }}>
                <div style={{ display: 'inline-block', background: 'rgba(245, 158, 11, 0.15)', color: 'var(--primary)', padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 800, marginBottom: '8px' }}>
                  CAMPUS & SHORT TRIPS (FARE &lt; ₹80)
                </div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
                  Flat ₹4 Company Cut
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  From each ride below <strong>₹80</strong>, the platform deducts a flat <strong>₹4.00</strong> fee. The driver takes home the full remainder. Controller cut is ₹0.
                </p>
                <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-muted)', background: 'var(--bg-card)', padding: '8px 12px', borderRadius: '8px' }}>
                  Example: ₹35 Campus Ride ➔ Driver gets <strong>₹31</strong>, Company gets <strong>₹4</strong>.
                </div>
              </div>

              <div style={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border)', borderRadius: '12px', padding: '18px' }}>
                <div style={{ display: 'inline-block', background: 'rgba(6, 182, 212, 0.15)', color: '#06B6D4', padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 800, marginBottom: '8px' }}>
                  OUTSIDE & LONG TRIPS (FARE ≥ ₹80)
                </div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
                  10% Company + ₹2 Controller
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  For rides of <strong>₹80 or above</strong>, the company takes <strong>10%</strong> of the total fare, and <strong>₹2.00</strong> is allocated to the controller. The driver receives the remaining 90% minus ₹2.
                </p>
                <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-muted)', background: 'var(--bg-card)', padding: '8px 12px', borderRadius: '8px' }}>
                  Example: ₹120 Outside Ride ➔ Driver gets <strong>₹106</strong> (90% - ₹2), Company gets <strong>₹12</strong> (10%), Controller gets <strong>₹2</strong>.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
