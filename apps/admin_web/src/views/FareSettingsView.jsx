import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api';
import { MapPin, Save, Plus, Edit2, CheckCircle, RefreshCw, Trash2, ArrowRight } from 'lucide-react';

const CAMPUS_STOPS = [
  'SJC (Silver Jubilee Campus)',
  'Girls Hostel',
  'Boys Hostel',
  'Gate 1 (Main Gate)',
  'Gate 2 (ECR Gate)',
  'Science Block / Departments',
  'Central Library',
  'University Canteen & Food Court',
  'Admin Block & Exam Wing'
];

export function FareSettingsView() {
  const [fareConfigs, setFareConfigs] = useState([]);
  const [routeFares, setRouteFares] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingFare, setSavingFare] = useState(false);
  const [editingConfig, setEditingConfig] = useState(null);
  const [editingRoute, setEditingRoute] = useState(null);
  const [showAddRoute, setShowAddRoute] = useState(false);
  const [newRoute, setNewRoute] = useState({
    pickupStop: '',
    destinationStop: '',
    fareAmount: '25.00',
    distanceKm: '1.5',
    isBidirectional: true
  });
  const [successMsg, setSuccessMsg] = useState('');

  // Extract unique stops from existing routes for auto-suggestions
  const knownStops = Array.from(
    new Set(
      [
        ...CAMPUS_STOPS,
        ...routeFares.flatMap((r) => [r.pickup_stop, r.destination_stop]).filter(Boolean)
      ]
    )
  );

  const loadData = async () => {
    try {
      setLoading(true);
      const [configsRes, routesRes] = await Promise.all([
        apiRequest('/admin/fare-settings'),
        apiRequest('/admin/route-fares')
      ]);
      setFareConfigs(configsRes.data || []);
      setRouteFares(routesRes.data || []);
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
      setSuccessMsg(`Default fare rates for ${config.vehicle_type} updated successfully!`);
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
      await apiRequest('/admin/route-fares', 'POST', {
        id: routeData.id,
        pickupStop: routeData.pickup_stop || routeData.pickupStop,
        destinationStop: routeData.destination_stop || routeData.destinationStop,
        fareAmount: parseFloat(routeData.fare_amount || routeData.fareAmount),
        distanceKm: parseFloat(routeData.distance_km || routeData.distanceKm || 1.5),
        isActive: routeData.is_active !== undefined ? routeData.is_active : 1,
        isBidirectional: routeData.isBidirectional !== undefined ? routeData.isBidirectional : true
      });
      setSuccessMsg('Campus route fare saved and synchronized for both directions!');
      setTimeout(() => setSuccessMsg(''), 4000);
      setEditingRoute(null);
      setShowAddRoute(false);
      loadData();
    } catch (err) {
      alert(`Failed to save route fare: ${err.message}`);
    }
  };

  const handleDeleteRoute = async (id) => {
    if (!window.confirm('Are you sure you want to delete this route fare configuration?')) return;
    try {
      await apiRequest(`/admin/route-fares/${id}`, 'DELETE');
      setSuccessMsg('Route fare deleted successfully.');
      setTimeout(() => setSuccessMsg(''), 4000);
      loadData();
    } catch (err) {
      alert(`Failed to delete route: ${err.message}`);
    }
  };

  return (
    <div>
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

      {/* 1. Campus Route Fares Manager (Admin-Controlled Fixed Route Pricing) */}
      <div className="panel" style={{ marginBottom: '24px' }}>
        <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MapPin className="text-primary" size={20} /> Campus Route-to-Route Fare Matrix
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Set exact fixed pricing (₹) between campus locations. These rates directly sync with the Papido Mobile App.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-primary btn-sm" onClick={() => setShowAddRoute(!showAddRoute)}>
              <Plus size={14} /> Add Route Fare
            </button>
            <button className="btn btn-secondary btn-sm" onClick={loadData}>
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Add New Route Form */}
        {showAddRoute && (
          <div style={{
            background: 'var(--bg-sidebar)',
            border: '1px solid var(--primary)',
            borderRadius: 'var(--radius-md)',
            padding: '18px 20px',
            marginBottom: '20px'
          }}>
            <h4 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '14px', color: 'var(--primary)' }}>
              Add New Campus Route & Pricing
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '11px' }}>Pickup Stop / Location</label>
                <input
                  type="text"
                  list="known-stops-list"
                  className="form-input"
                  value={newRoute.pickupStop}
                  onChange={(e) => setNewRoute({ ...newRoute, pickupStop: e.target.value })}
                  placeholder="Type pickup stop (e.g. Main Gate)"
                  required
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '11px' }}>Destination Stop / Location</label>
                <input
                  type="text"
                  list="known-stops-list"
                  className="form-input"
                  value={newRoute.destinationStop}
                  onChange={(e) => setNewRoute({ ...newRoute, destinationStop: e.target.value })}
                  placeholder="Type destination stop (e.g. Food Court)"
                  required
                />
              </div>

              <datalist id="known-stops-list">
                {knownStops.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>

              <div>
                <label className="form-label" style={{ fontSize: '11px' }}>Fixed Fare (₹)</label>
                <input
                  type="number"
                  step="1"
                  className="form-input"
                  value={newRoute.fareAmount}
                  onChange={(e) => setNewRoute({ ...newRoute, fareAmount: e.target.value })}
                  placeholder="25.00"
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '11px' }}>Estimated Dist (km)</label>
                <input
                  type="number"
                  step="0.1"
                  className="form-input"
                  value={newRoute.distanceKm}
                  onChange={(e) => setNewRoute({ ...newRoute, distanceKm: e.target.value })}
                  placeholder="1.5"
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowAddRoute(false)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={() => handleSaveRoute(newRoute)}>
                <Save size={13} /> Save Route Fare
              </button>
            </div>
          </div>
        )}

        {/* Route Fares Table */}
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Pickup Stop</th>
                <th style={{ textAlign: 'center' }}>Direction</th>
                <th>Destination Stop</th>
                <th>Distance</th>
                <th>Fixed Route Fare (₹)</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {routeFares.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    No campus route fares configured yet. Click "Add Route Fare" above.
                  </td>
                </tr>
              ) : (
                routeFares.map((r) => {
                  const isEditing = editingRoute?.id === r.id;
                  const current = isEditing ? editingRoute : r;

                  return (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 600 }}>{r.pickup_stop}</td>
                      <td style={{ textAlign: 'center', color: 'var(--primary)' }}>
                        <ArrowRight size={16} />
                      </td>
                      <td style={{ fontWeight: 600 }}>{r.destination_stop}</td>
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

      {/* 2. Default Vehicle Fallback Rates (When outside listed campus routes) */}
      <div className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Default Fallback Rates (Unlisted Routes)</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Standard base charges and per-kilometer fallback pricing for trips outside configured campus routes.
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

      {/* 3. Company Revenue & Driver Split Policy */}
      <div className="panel" style={{ marginTop: '24px' }}>
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
  );
}
