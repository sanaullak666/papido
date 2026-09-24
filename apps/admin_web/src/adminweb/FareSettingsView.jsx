import React, { useState, useEffect } from 'react';
import './FareSettingsView.css';
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
  Sliders,
  Users,
  Tag,
  Sparkles,
  Check,
  X,
  Info,
  Bike,
  Zap,
  Compass,
  Car,
  DollarSign,
  Route,
  TrendingUp,
  Building2,
  Wallet
} from 'lucide-react';

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
  const [isEditingStandardFare, setIsEditingStandardFare] = useState(false);
  const [tempStandardFare, setTempStandardFare] = useState('25.00');
  const [newRoute, setNewRoute] = useState({
    pickupStop: '',
    destinationStop: '',
    fareAmount: '25.00',
    distanceKm: '1.5',
    isBidirectional: true
  });
  const [successMsg, setSuccessMsg] = useState('');

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
      const cfgs = configsRes.data || [];
      setFareConfigs(cfgs);
      setRouteFares(routesRes.data || []);

      const bikeCfg = cfgs.find(c => c.vehicle_type === 'BIKE') || cfgs[0];
      if (bikeCfg) {
        setTempStandardFare(String(parseFloat(bikeCfg.minimum_fare || bikeCfg.base_fare || 25).toFixed(2)));
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

  const handleUpdateStandardCampusFare = async () => {
    const val = parseFloat(tempStandardFare);
    if (!val || isNaN(val) || val <= 0) {
      alert('Please enter a valid positive fare amount.');
      return;
    }

    try {
      setSavingFare(true);
      await Promise.all([
        apiRequest('/admin/fare-settings/BIKE', 'PATCH', {
          baseFare: val,
          minimumFare: val
        }),
        apiRequest('/admin/fare-settings/SCOOTER', 'PATCH', {
          baseFare: val,
          minimumFare: val
        })
      ]);
      setSuccessMsg(`Global standard campus flat fare updated to ₹${val.toFixed(2)} for all standard trips!`);
      setTimeout(() => setSuccessMsg(''), 4000);
      setIsEditingStandardFare(false);
      loadData();
    } catch (err) {
      alert(`Failed to update standard fare: ${err.message}`);
    } finally {
      setSavingFare(false);
    }
  };

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

  const vehicleIcon = (type) => {
    if (type === 'BIKE') return Bike;
    if (type === 'SCOOTER') return Zap;
    if (type === 'AUTO') return Compass;
    if (type === 'CAB' || type === 'CAB_MINI' || type === 'CAB_SEDAN') return Car;
    return Bike;
  };

  return (
    <div className="fs-page">
      {/* Success banner */}
      {successMsg && (
        <div className="fs-alert fs-alert--success fs-slide-down">
          <CheckCircle size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* ============================================================
          BASIC CAMPUS FARE POLICY
          ============================================================ */}
      <div className="fs-panel fs-fade-up">
        <div className="fs-panel-head">
          <div>
            <h2 className="fs-panel-title fs-panel-title--icon">
              <Sparkles size={18} color="#F59E0B" />
              Basic Campus Fare Policy
            </h2>
            <p className="fs-panel-sub">
              Unified campus pricing: standard flat fare, double ride discount, and outer SJC route exceptions.
            </p>
          </div>
        </div>

        <div className="fs-policy-grid">
          {/* Card 1: Standard Flat Campus Fare */}
          <div className="fs-policy-card">
            <div className="fs-policy-head">
              <span className="fs-policy-badge fs-policy-badge--amber">STANDARD CAMPUS FARE</span>
              {!isEditingStandardFare ? (
                <button
                  type="button"
                  className="fs-icon-btn"
                  onClick={() => setIsEditingStandardFare(true)}
                  title="Edit Standard Fare"
                >
                  <Edit2 size={12} />
                </button>
              ) : (
                <div className="fs-policy-actions-inline">
                  <button
                    type="button"
                    className="fs-icon-btn fs-icon-btn--success"
                    onClick={handleUpdateStandardCampusFare}
                    disabled={savingFare}
                    title="Save"
                  >
                    <Check size={12} />
                  </button>
                  <button
                    type="button"
                    className="fs-icon-btn"
                    onClick={() => setIsEditingStandardFare(false)}
                    title="Cancel"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}
            </div>

            <div className="fs-policy-value-wrap">
              {isEditingStandardFare ? (
                <div className="fs-policy-value-edit">
                  <span className="fs-policy-value-currency">₹</span>
                  <input
                    type="number"
                    step="1"
                    className="fs-policy-value-input"
                    value={tempStandardFare}
                    onChange={(e) => setTempStandardFare(e.target.value)}
                    autoFocus
                  />
                </div>
              ) : (
                <div className="fs-policy-value">
                  ₹{parseFloat(tempStandardFare || 25).toFixed(2)}
                </div>
              )}
            </div>

            <p className="fs-policy-desc">
              Default flat rate applied to all standard intra-campus rides (Hostels, Library, Departments, Canteen).
            </p>

            <div className="fs-policy-foot">
              Driver take-home:{' '}
              <strong>₹{(parseFloat(tempStandardFare || 25) - 4).toFixed(2)}</strong>
              <span> (after ₹4 platform split)</span>
            </div>
          </div>

          {/* Card 2: Double Ride Policy */}
          <div className="fs-policy-card fs-policy-card--emerald">
            <div className="fs-policy-head">
              <span className="fs-policy-badge fs-policy-badge--emerald">
                <Users size={12} /> DOUBLE RIDE (2 RIDERS)
              </span>
              <span className="fs-policy-save-tag">Save ₹10</span>
            </div>

            <div className="fs-policy-value fs-policy-value--emerald">
              ₹{(Math.max(parseFloat(tempStandardFare || 25), (parseFloat(tempStandardFare || 25) * 2) - 10)).toFixed(2)}{' '}
              <span className="fs-policy-value-sub">
                (₹{((Math.max(parseFloat(tempStandardFare || 25), (parseFloat(tempStandardFare || 25) * 2) - 10)) / 2).toFixed(2)} / student)
              </span>
            </div>

            <p className="fs-policy-desc">
              Formula: <strong>(Single Fare × 2) − ₹10</strong>. Students pool to save ₹5 each; drivers earn more per trip.
            </p>

            <div className="fs-policy-foot">
              Driver payout on double ride:{' '}
              <strong>₹{(Math.max(parseFloat(tempStandardFare || 25), (parseFloat(tempStandardFare || 25) * 2) - 10) - 4).toFixed(2)}</strong>
            </div>
          </div>

          {/* Card 3: Outer SJC Rates Summary */}
          <div className="fs-policy-card fs-policy-card--cyan">
            <div className="fs-policy-head">
              <span className="fs-policy-badge fs-policy-badge--cyan">
                <Tag size={12} /> SJC ROUTE EXCEPTIONS
              </span>
              <span className="fs-policy-count">4 active routes</span>
            </div>

            <div className="fs-route-preview">
              {[
                { from: 'Girls Hostel', to: 'SJC', fare: '30.00' },
                { from: 'Gate 1 (Main Gate)', to: 'SJC', fare: '30.00' },
                { from: 'Gate 2 (ECR Gate)', to: 'SJC', fare: '35.00' },
                { from: 'Boys Hostel', to: 'SJC', fare: '25.00' }
              ].map((r) => (
                <div key={`${r.from}-${r.to}`} className="fs-route-preview-row">
                  <span className="fs-route-preview-route">
                    {r.from} <ArrowRight size={11} /> {r.to}
                  </span>
                  <strong className="fs-route-preview-fare">₹{r.fare}</strong>
                </div>
              ))}
            </div>

            <div className="fs-policy-foot fs-policy-foot--quiet">
              Managed in the route matrix table below.
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================
          ROUTE FARES MATRIX
          ============================================================ */}
      <div className="fs-panel fs-fade-up" style={{ animationDelay: '60ms' }}>
        <div className="fs-panel-head">
          <div>
            <h2 className="fs-panel-title fs-panel-title--icon">
              <MapPin size={18} color="#F59E0B" />
              Campus Route-to-Route Fare Matrix &amp; SJC Overrides
            </h2>
            <p className="fs-panel-sub">
              Set exact fixed pricing (₹) between campus locations. These rates directly sync with the Papido Mobile App.
            </p>
          </div>
          <div className="fs-panel-actions">
            <button
              type="button"
              className="fs-btn fs-btn--primary fs-btn--sm"
              onClick={() => setShowAddRoute(!showAddRoute)}
            >
              <Plus size={14} /> Add Route Fare
            </button>
            <button
              type="button"
              className="fs-icon-btn"
              onClick={loadData}
              title="Refresh"
            >
              <RefreshCw size={14} className={loading ? 'fs-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Add route form */}
        {showAddRoute && (
          <div className="fs-add-route fs-fade-up">
            <h4 className="fs-add-route-title">
              Add New Campus Route &amp; Pricing
            </h4>

            <div className="fs-add-route-grid">
              <div className="fs-field">
                <label className="fs-label">Pickup Stop / Location</label>
                <input
                  type="text"
                  list="fs-known-stops"
                  className="fs-input"
                  value={newRoute.pickupStop}
                  onChange={(e) => setNewRoute({ ...newRoute, pickupStop: e.target.value })}
                  placeholder="Type pickup stop (e.g. Main Gate)"
                  required
                />
              </div>

              <div className="fs-field">
                <label className="fs-label">Destination Stop / Location</label>
                <input
                  type="text"
                  list="fs-known-stops"
                  className="fs-input"
                  value={newRoute.destinationStop}
                  onChange={(e) => setNewRoute({ ...newRoute, destinationStop: e.target.value })}
                  placeholder="Type destination stop (e.g. Food Court)"
                  required
                />
              </div>

              <datalist id="fs-known-stops">
                {knownStops.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>

              <div className="fs-field">
                <label className="fs-label">Fixed Fare (₹)</label>
                <input
                  type="number"
                  step="1"
                  className="fs-input"
                  value={newRoute.fareAmount}
                  onChange={(e) => setNewRoute({ ...newRoute, fareAmount: e.target.value })}
                  placeholder="25.00"
                />
              </div>

              <div className="fs-field">
                <label className="fs-label">Estimated Dist (km)</label>
                <input
                  type="number"
                  step="0.1"
                  className="fs-input"
                  value={newRoute.distanceKm}
                  onChange={(e) => setNewRoute({ ...newRoute, distanceKm: e.target.value })}
                  placeholder="1.5"
                />
              </div>
            </div>

            <div className="fs-add-route-actions">
              <button
                type="button"
                className="fs-btn fs-btn--ghost fs-btn--sm"
                onClick={() => setShowAddRoute(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="fs-btn fs-btn--primary fs-btn--sm"
                onClick={() => handleSaveRoute(newRoute)}
              >
                <Save size={13} /> Save Route Fare
              </button>
            </div>
          </div>
        )}

        {/* Route table */}
        <div className="fs-table-wrap">
          <table className="fs-table">
            <thead>
              <tr>
                <th>Pickup Stop</th>
                <th style={{ textAlign: 'center', width: 60 }}>Direction</th>
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
                  <td colSpan="7" className="fs-table-empty">
                    <Route size={22} />
                    <div>No campus route fares configured yet. Click "Add Route Fare" above.</div>
                  </td>
                </tr>
              ) : (
                routeFares.map((r) => {
                  const isEditing = editingRoute?.id === r.id;
                  const current = isEditing ? editingRoute : r;

                  return (
                    <tr key={r.id}>
                      <td className="fs-table-stop">{r.pickup_stop}</td>
                      <td className="fs-table-direction">
                        <ArrowRight size={16} />
                      </td>
                      <td className="fs-table-stop">{r.destination_stop}</td>
                      <td>
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.1"
                            className="fs-inline-input"
                            value={current.distance_km}
                            onChange={(e) => setEditingRoute({ ...editingRoute, distance_km: e.target.value })}
                          />
                        ) : (
                          <span className="fs-table-distance">{r.distance_km || 1.5} km</span>
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <div className="fs-inline-fare">
                            <span>₹</span>
                            <input
                              type="number"
                              step="1"
                              className="fs-inline-input fs-inline-input--fare"
                              value={current.fare_amount}
                              onChange={(e) => setEditingRoute({ ...editingRoute, fare_amount: e.target.value })}
                            />
                          </div>
                        ) : (
                          <span className="fs-table-fare">
                            ₹{parseFloat(r.fare_amount).toFixed(2)}
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={`fs-status-pill fs-status-pill--${r.is_active ? 'active' : 'inactive'}`}>
                          {r.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <div className="fs-row-actions">
                          {isEditing ? (
                            <>
                              <button
                                type="button"
                                className="fs-icon-btn fs-icon-btn--success"
                                onClick={() => handleSaveRoute(editingRoute)}
                                title="Save"
                              >
                                <Save size={12} />
                              </button>
                              <button
                                type="button"
                                className="fs-icon-btn"
                                onClick={() => setEditingRoute(null)}
                                title="Cancel"
                              >
                                <X size={12} />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                className="fs-icon-btn"
                                onClick={() => setEditingRoute({ ...r })}
                                title="Edit"
                              >
                                <Edit2 size={12} />
                              </button>
                              <button
                                type="button"
                                className="fs-icon-btn fs-icon-btn--danger"
                                onClick={() => handleDeleteRoute(r.id)}
                                title="Delete"
                              >
                                <Trash2 size={12} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================================
          DEFAULT FALLBACK RATES
          ============================================================ */}
      <div className="fs-panel fs-fade-up" style={{ animationDelay: '120ms' }}>
        <div className="fs-panel-head">
          <div>
            <h2 className="fs-panel-title fs-panel-title--icon">
              <Sliders size={18} color="#F59E0B" />
              Default Fallback Rates (Unlisted Routes)
            </h2>
            <p className="fs-panel-sub">
              Standard base charges and per-kilometer fallback pricing for trips outside configured campus routes.
            </p>
          </div>
        </div>

        <div className="fs-vehicle-grid">
          {fareConfigs.map((fc) => {
            const isEditing = editingConfig?.id === fc.id;
            const current = isEditing ? editingConfig : fc;
            const Icon = vehicleIcon(fc.vehicle_type);

            return (
              <div
                key={fc.id}
                className={`fs-vehicle-card ${isEditing ? 'is-editing' : ''}`}
              >
                <div className="fs-vehicle-head">
                  <span className="fs-vehicle-badge">
                    <Icon size={14} /> {current.vehicle_type}
                  </span>
                  {!isEditing ? (
                    <button
                      type="button"
                      className="fs-icon-btn"
                      onClick={() => setEditingConfig({ ...fc })}
                      title="Edit Rates"
                    >
                      <Edit2 size={13} />
                    </button>
                  ) : (
                    <div className="fs-vehicle-edit-actions">
                      <button
                        type="button"
                        className="fs-icon-btn fs-icon-btn--success"
                        onClick={() => handleUpdateFare(editingConfig)}
                        disabled={savingFare}
                        title="Save"
                      >
                        <Save size={13} />
                      </button>
                      <button
                        type="button"
                        className="fs-icon-btn"
                        onClick={() => setEditingConfig(null)}
                        title="Cancel"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="fs-vehicle-fields">
                  <div className="fs-vehicle-field">
                    <div className="fs-vehicle-field-label">Base Fare (₹)</div>
                    {isEditing ? (
                      <input
                        type="number"
                        className="fs-vehicle-field-input"
                        value={current.base_fare}
                        onChange={(e) => setEditingConfig({ ...editingConfig, base_fare: e.target.value })}
                      />
                    ) : (
                      <div className="fs-vehicle-field-value">
                        ₹{parseFloat(fc.base_fare).toFixed(2)}
                      </div>
                    )}
                  </div>

                  <div className="fs-vehicle-field">
                    <div className="fs-vehicle-field-label">Base Distance (km)</div>
                    {isEditing ? (
                      <input
                        type="number"
                        step="0.1"
                        className="fs-vehicle-field-input"
                        value={current.base_distance_km}
                        onChange={(e) => setEditingConfig({ ...editingConfig, base_distance_km: e.target.value })}
                      />
                    ) : (
                      <div className="fs-vehicle-field-value">
                        {fc.base_distance_km} km
                      </div>
                    )}
                  </div>

                  <div className="fs-vehicle-field">
                    <div className="fs-vehicle-field-label">Per Km Rate (₹)</div>
                    {isEditing ? (
                      <input
                        type="number"
                        step="0.5"
                        className="fs-vehicle-field-input"
                        value={current.per_km_fare}
                        onChange={(e) => setEditingConfig({ ...editingConfig, per_km_fare: e.target.value })}
                      />
                    ) : (
                      <div className="fs-vehicle-field-value">
                        ₹{parseFloat(fc.per_km_fare).toFixed(2)}/km
                      </div>
                    )}
                  </div>

                  <div className="fs-vehicle-field">
                    <div className="fs-vehicle-field-label">Min Fare (₹)</div>
                    {isEditing ? (
                      <input
                        type="number"
                        className="fs-vehicle-field-input"
                        value={current.minimum_fare}
                        onChange={(e) => setEditingConfig({ ...editingConfig, minimum_fare: e.target.value })}
                      />
                    ) : (
                      <div className="fs-vehicle-field-value fs-vehicle-field-value--amber">
                        ₹{parseFloat(fc.minimum_fare).toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ============================================================
          SPLIT POLICY
          ============================================================ */}
      <div className="fs-panel fs-fade-up" style={{ animationDelay: '180ms' }}>
        <div className="fs-panel-head">
          <div>
            <h2 className="fs-panel-title fs-panel-title--icon">
              <Sliders size={18} color="#F59E0B" />
              Company Revenue &amp; Driver Split Policy
            </h2>
            <p className="fs-panel-sub">
              Automated settlement policy applied to all completed campus and outside trips.
            </p>
          </div>
        </div>

        <div className="fs-split-grid">
          <div className="fs-split-card fs-split-card--amber">
            <div className="fs-split-badge fs-split-badge--amber">
              CAMPUS &amp; SHORT TRIPS (FARE ≤ ₹80)
            </div>
            <div className="fs-split-title">
              ₹2 Company + ₹2 Controller (₹4 Total)
            </div>
            <p className="fs-split-desc">
              From each ride of <strong>₹80 or below</strong>, the platform deducts a total of <strong>₹4.00</strong> (₹2.00 for Company and ₹2.00 for Controller). The driver retains the remaining fare.
            </p>

            <div className="fs-split-visual">
              <div className="fs-split-bar">
                <div className="fs-split-bar-seg fs-split-bar-seg--emerald" style={{ width: '80%' }}>
                  <span>Driver</span>
                </div>
                <div className="fs-split-bar-seg fs-split-bar-seg--amber" style={{ width: '10%' }}>
                  <span>Co</span>
                </div>
                <div className="fs-split-bar-seg fs-split-bar-seg--cyan" style={{ width: '10%' }}>
                  <span>Ctr</span>
                </div>
              </div>
            </div>

            <div className="fs-split-example">
              Example: ₹30 Campus Ride → Driver gets <strong>₹26</strong>, Company <strong>₹2</strong>, Controller <strong>₹2</strong>.
            </div>
          </div>

          <div className="fs-split-card fs-split-card--cyan">
            <div className="fs-split-badge fs-split-badge--cyan">
              OUTSIDE &amp; LONG TRIPS (FARE &gt; ₹80)
            </div>
            <div className="fs-split-title">
              10% Company + ₹2 Controller
            </div>
            <p className="fs-split-desc">
              For rides <strong>above ₹80</strong>, the company takes <strong>10%</strong> of the total fare, and <strong>₹2.00</strong> is allocated to the controller. The driver receives the remaining 90% minus ₹2.
            </p>

            <div className="fs-split-visual">
              <div className="fs-split-bar">
                <div className="fs-split-bar-seg fs-split-bar-seg--emerald" style={{ width: '88%' }}>
                  <span>Driver</span>
                </div>
                <div className="fs-split-bar-seg fs-split-bar-seg--cyan" style={{ width: '10%' }}>
                  <span>Co 10%</span>
                </div>
                <div className="fs-split-bar-seg fs-split-bar-seg--indigo" style={{ width: '2%' }}>
                  <span>Ctr</span>
                </div>
              </div>
            </div>

            <div className="fs-split-example">
              Example: ₹120 Outside Ride → Driver gets <strong>₹106</strong>, Company <strong>₹12</strong>, Controller <strong>₹2</strong>.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
export default FareSettingsView;
