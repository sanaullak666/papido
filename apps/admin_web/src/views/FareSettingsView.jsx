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
  Layers,
  Building,
  Grid,
  AlertCircle,
  X,
  Compass,
  Check,
  ShieldAlert,
  ChevronRight,
  TrendingUp,
  Settings2
} from 'lucide-react';

const PRESET_EMOJIS = ['🏡', '🏛️', '🔬', '🎓', '⚽', '🚪', '📚', '☕', '🏨', '🏋️', '🏥', '🌳', '🚌', '📍', '🏢'];
const PRESET_COLORS = [
  { label: 'Pink', hex: '#EC4899', bg: 'rgba(236, 72, 153, 0.12)' },
  { label: 'Blue', hex: '#3B82F6', bg: 'rgba(59, 130, 246, 0.12)' },
  { label: 'Emerald', hex: '#10B981', bg: 'rgba(16, 185, 129, 0.12)' },
  { label: 'Amber', hex: '#F59E0B', bg: 'rgba(245, 158, 11, 0.12)' },
  { label: 'Purple', hex: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.12)' },
  { label: 'Cyan', hex: '#06B6D4', bg: 'rgba(6, 182, 212, 0.12)' },
  { label: 'Orange', hex: '#F97316', bg: 'rgba(249, 115, 22, 0.12)' },
  { label: 'Indigo', hex: '#6366F1', bg: 'rgba(99, 102, 241, 0.12)' }
];

export function FareSettingsView() {
  const [activeTab, setActiveTab] = useState('area_matrix'); // 'area_matrix', 'campus_areas', 'specific_routes', 'vehicle_fallback'
  const [campusAreas, setCampusAreas] = useState([]);
  const [areaFares, setAreaFares] = useState([]);
  const [matrixData, setMatrixData] = useState(null);
  const [campusStops, setCampusStops] = useState([]);
  const [groupedStops, setGroupedStops] = useState([]);
  const [routeOverrides, setRouteOverrides] = useState([]);
  const [fareConfigs, setFareConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingMatrix, setSavingMatrix] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Modals state
  const [showAreaModal, setShowAreaModal] = useState(false);
  const [editingArea, setEditingArea] = useState(null);
  const [areaToDelete, setAreaToDelete] = useState(null);
  const [showStopModal, setShowStopModal] = useState(false);
  const [targetAreaForStop, setTargetAreaForStop] = useState('');
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [editingOverride, setEditingOverride] = useState(null);
  const [editingConfig, setEditingConfig] = useState(null);
  const [savingFare, setSavingFare] = useState(false);

  // Area Form State
  const [areaForm, setAreaForm] = useState({
    name: '',
    area_code: '',
    icon: '🏛️',
    color: '#3B82F6',
    bg_color: 'rgba(59, 130, 246, 0.12)',
    description: '',
    display_order: 0
  });

  // Stop Form State
  const [stopForm, setStopForm] = useState({
    name: '',
    area_code: 'MAIN_CAMPUS',
    category: 'DEPARTMENT',
    latitude: '12.0240',
    longitude: '79.8530',
    display_order: 0
  });

  // Specific Route Override Form State
  const [overrideForm, setOverrideForm] = useState({
    pickupStop: '',
    destinationStop: '',
    fareAmount: '30.00',
    distanceKm: '2.5'
  });

  // Live 4-Tier Simulator State
  const [testPickup, setTestPickup] = useState('');
  const [testDrop, setTestDrop] = useState('');
  const [testResult, setTestResult] = useState(null);
  const [testingRoute, setTestingRoute] = useState(false);

  // Search & Filter
  const [areaSearch, setAreaSearch] = useState('');

  const showToast = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [areasRes, matrixRes, faresRes, stopsRes, routesRes, configsRes] = await Promise.all([
        apiRequest('/admin/campus-areas'),
        apiRequest('/admin/area-fares/matrix'),
        apiRequest('/admin/area-fares'),
        apiRequest('/admin/campus-stops'),
        apiRequest('/admin/route-fares'),
        apiRequest('/admin/fare-settings')
      ]);

      const areas = areasRes.data || [];
      setCampusAreas(areas);
      setMatrixData(matrixRes.data || null);
      setAreaFares(faresRes.data || []);
      setRouteOverrides(routesRes.data || []);
      setFareConfigs(configsRes.data || []);

      if (stopsRes.data) {
        const stops = stopsRes.data.stops || [];
        setCampusStops(stops);
        setGroupedStops(stopsRes.data.grouped || []);

        if (stops.length > 0 && !testPickup) {
          setTestPickup(stops[0].name);
          setTestDrop(stops[1] ? stops[1].name : stops[0].name);
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

  // -------------------------------------------------------------
  // CAMPUS AREA (ZONE) ACTIONS
  // -------------------------------------------------------------
  const handleOpenAreaModal = (area = null) => {
    if (area) {
      setEditingArea(area);
      setAreaForm({
        name: area.name || '',
        area_code: area.area_code || '',
        icon: area.icon || '🏛️',
        color: area.color || '#3B82F6',
        bg_color: area.bg_color || 'rgba(59, 130, 246, 0.12)',
        description: area.description || '',
        display_order: area.display_order || 0
      });
    } else {
      setEditingArea(null);
      setAreaForm({
        name: '',
        area_code: '',
        icon: '🏛️',
        color: '#3B82F6',
        bg_color: 'rgba(59, 130, 246, 0.12)',
        description: '',
        display_order: campusAreas.length + 1
      });
    }
    setShowAreaModal(true);
  };

  const handleSaveArea = async (e) => {
    e.preventDefault();
    if (!areaForm.name.trim()) {
      alert('Please enter a campus area name.');
      return;
    }

    try {
      await apiRequest('/admin/campus-areas', 'POST', {
        id: editingArea?.id,
        name: areaForm.name.trim(),
        area_code: areaForm.area_code.trim() || undefined,
        icon: areaForm.icon,
        color: areaForm.color,
        bg_color: areaForm.bg_color,
        description: areaForm.description.trim(),
        display_order: parseInt(areaForm.display_order) || 0
      });

      showToast(editingArea ? `Campus Area "${areaForm.name}" updated!` : `Campus Area "${areaForm.name}" created!`);
      setShowAreaModal(false);
      loadData();
    } catch (err) {
      alert(`Failed to save campus area: ${err.message}`);
    }
  };

  const handleDeleteArea = async (area, deleteStops = false) => {
    try {
      await apiRequest(`/admin/campus-areas/${area.id}?deleteStops=${deleteStops}`, 'DELETE');
      showToast(`Campus Area "${area.name}" deleted.`);
      setAreaToDelete(null);
      loadData();
    } catch (err) {
      alert(`Failed to delete campus area: ${err.message}`);
    }
  };

  const handleResetAllAreas = async () => {
    const text = window.prompt('Type "DELETE" to clear all campus areas and reset to default:');
    if (text !== 'DELETE') return;
    try {
      await apiRequest('/admin/campus-areas/all?deleteStops=false', 'DELETE');
      showToast('Campus areas cleared.');
      loadData();
    } catch (err) {
      alert(`Failed to clear areas: ${err.message}`);
    }
  };

  // -------------------------------------------------------------
  // LOCATION / STOP ACTIONS
  // -------------------------------------------------------------
  const handleOpenAddStopModal = (areaCode = null) => {
    const defaultArea = areaCode || (campusAreas[0]?.area_code || 'MAIN_CAMPUS');
    setStopForm({
      name: '',
      area_code: defaultArea,
      category: 'DEPARTMENT',
      latitude: '12.0240',
      longitude: '79.8530',
      display_order: 0
    });
    setTargetAreaForStop(defaultArea);
    setShowStopModal(true);
  };

  const handleSaveStop = async (e) => {
    e.preventDefault();
    if (!stopForm.name.trim()) {
      alert('Please enter a location / department name.');
      return;
    }
    const area = stopForm.area_code || targetAreaForStop || campusAreas[0]?.area_code || 'MAIN_CAMPUS';

    try {
      await apiRequest('/admin/campus-stops', 'POST', {
        name: stopForm.name.trim(),
        area_code: area,
        category: stopForm.category || 'DEPARTMENT',
        category_label: stopForm.name.trim(),
        latitude: parseFloat(stopForm.latitude || 12.0240),
        longitude: parseFloat(stopForm.longitude || 79.8530),
        display_order: parseInt(stopForm.display_order || 0)
      });
      showToast(`"${stopForm.name}" added to campus locations!`);
      setShowStopModal(false);
      loadData();
    } catch (err) {
      alert(`Failed to save stop: ${err.message}`);
    }
  };

  const handleDeleteStop = async (id, name) => {
    if (!window.confirm(`Are you sure you want to remove "${name}"?`)) return;
    try {
      await apiRequest(`/admin/campus-stops/${id}`, 'DELETE');
      showToast(`"${name}" removed.`);
      loadData();
    } catch (err) {
      alert(`Failed to delete stop: ${err.message}`);
    }
  };

  // -------------------------------------------------------------
  // AREA-TO-AREA MATRIX & PRICING ACTIONS
  // -------------------------------------------------------------
  const handleMatrixCellChange = (fromIndex, toIndex, newFare) => {
    if (!matrixData || !matrixData.matrix) return;
    const newMatrix = [...matrixData.matrix];
    newMatrix[fromIndex].targets[toIndex].fareAmount = parseFloat(newFare) || 0;
    setMatrixData({ ...matrixData, matrix: newMatrix });
  };

  const handleSaveAreaFareMatrix = async () => {
    if (!matrixData || !matrixData.matrix) return;
    try {
      setSavingMatrix(true);
      const updates = [];
      matrixData.matrix.forEach(row => {
        const fromCode = row.fromArea.area_code;
        row.targets.forEach(target => {
          updates.push({
            fromAreaCode: fromCode,
            toAreaCode: target.toArea.area_code,
            fareAmount: parseFloat(target.fareAmount),
            distanceKm: parseFloat(target.distanceKm || 1.5)
          });
        });
      });

      await apiRequest('/admin/area-fares/matrix-save', 'POST', { updates });
      showToast('Area-to-Area Fare Matrix saved successfully!');
      loadData();
    } catch (err) {
      alert(`Failed to save matrix: ${err.message}`);
    } finally {
      setSavingMatrix(false);
    }
  };

  // -------------------------------------------------------------
  // SPECIFIC ROUTE OVERRIDES (TIER 1)
  // -------------------------------------------------------------
  const handleSaveOverride = async (e) => {
    e.preventDefault();
    const p = overrideForm.pickupStop;
    const d = overrideForm.destinationStop;
    if (!p || !d) {
      alert('Please select both pickup and destination stops.');
      return;
    }
    if (p.trim().toLowerCase() === d.trim().toLowerCase()) {
      alert('Pickup and Destination cannot be the same.');
      return;
    }

    try {
      await apiRequest('/admin/route-fares', 'POST', {
        id: editingOverride?.id,
        pickupStop: p,
        destinationStop: d,
        fareAmount: parseFloat(overrideForm.fareAmount),
        distanceKm: parseFloat(overrideForm.distanceKm || 1.5),
        isActive: 1
      });
      showToast('Specific Route Override saved!');
      setShowOverrideModal(false);
      setEditingOverride(null);
      loadData();
    } catch (err) {
      alert(`Failed to save override: ${err.message}`);
    }
  };

  const handleDeleteOverride = async (id) => {
    if (!window.confirm('Delete this specific route override?')) return;
    try {
      await apiRequest(`/admin/route-fares/${id}`, 'DELETE');
      showToast('Route override deleted.');
      loadData();
    } catch (err) {
      alert(`Failed to delete override: ${err.message}`);
    }
  };

  // -------------------------------------------------------------
  // VEHICLE FALLBACK RATES
  // -------------------------------------------------------------
  const handleUpdateFareConfig = async (config) => {
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
      showToast(`Default fallback rates for ${config.vehicle_type} updated!`);
      setEditingConfig(null);
      loadData();
    } catch (err) {
      alert(`Failed to update fallback rates: ${err.message}`);
    } finally {
      setSavingFare(false);
    }
  };

  // -------------------------------------------------------------
  // LIVE 4-TIER SIMULATOR
  // -------------------------------------------------------------
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
      alert(`Simulation error: ${err.message}`);
    } finally {
      setTestingRoute(false);
    }
  };

  return (
    <div>
      {/* Toast Notification */}
      {successMsg && (
        <div style={{
          padding: '12px 18px',
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.4)',
          borderRadius: 'var(--radius-md)',
          color: '#34D399',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontWeight: 700
        }}>
          <CheckCircle size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Tab Navigation */}
      <div style={{
        display: 'flex',
        gap: '10px',
        borderBottom: '1px solid var(--border)',
        paddingBottom: '14px',
        marginBottom: '24px',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={() => setActiveTab('area_matrix')}
          className="btn"
          style={{
            background: activeTab === 'area_matrix' ? 'var(--primary)' : 'var(--bg-card)',
            color: activeTab === 'area_matrix' ? '#000' : 'var(--text-primary)',
            border: '1px solid var(--border)',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Grid size={16} /> Area ➔ Area Fare Matrix
          <span style={{
            background: activeTab === 'area_matrix' ? 'rgba(0,0,0,0.25)' : 'var(--bg-sidebar)',
            padding: '2px 8px',
            borderRadius: '10px',
            fontSize: '11px'
          }}>
            {campusAreas.length} Areas
          </span>
        </button>

        <button
          onClick={() => setActiveTab('campus_areas')}
          className="btn"
          style={{
            background: activeTab === 'campus_areas' ? 'var(--primary)' : 'var(--bg-card)',
            color: activeTab === 'campus_areas' ? '#000' : 'var(--text-primary)',
            border: '1px solid var(--border)',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Layers size={16} /> Campus Areas & Locations
          <span style={{
            background: activeTab === 'campus_areas' ? 'rgba(0,0,0,0.25)' : 'var(--bg-sidebar)',
            padding: '2px 8px',
            borderRadius: '10px',
            fontSize: '11px'
          }}>
            {campusStops.length} Locations
          </span>
        </button>

        <button
          onClick={() => setActiveTab('specific_routes')}
          className="btn"
          style={{
            background: activeTab === 'specific_routes' ? 'var(--primary)' : 'var(--bg-card)',
            color: activeTab === 'specific_routes' ? '#000' : 'var(--text-primary)',
            border: '1px solid var(--border)',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Compass size={16} /> Specific Route Overrides
          <span style={{
            background: activeTab === 'specific_routes' ? 'rgba(0,0,0,0.25)' : 'var(--bg-sidebar)',
            padding: '2px 8px',
            borderRadius: '10px',
            fontSize: '11px'
          }}>
            {routeOverrides.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('vehicle_fallback')}
          className="btn"
          style={{
            background: activeTab === 'vehicle_fallback' ? 'var(--primary)' : 'var(--bg-card)',
            color: activeTab === 'vehicle_fallback' ? '#000' : 'var(--text-primary)',
            border: '1px solid var(--border)',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          ⚡ Fallback GPS Rates & Splits
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: AREA-TO-AREA FARE MATRIX (CORE SYSTEM) */}
      {/* ========================================================================= */}
      {activeTab === 'area_matrix' && (
        <>
          {/* Architecture Banner */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(99, 102, 241, 0.12))',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: 'var(--radius-lg)',
            padding: '18px 22px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '14px'
          }}>
            <div>
              <div style={{ fontWeight: 900, fontSize: '16px', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={20} /> Papido Scalable Fare System: Campus Area ➔ Location ➔ Fare Rule
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.5 }}>
                Fares are set <strong>Area ➔ Area</strong> (e.g. <em>Hostel Area ➔ Silver Jubilee Campus = ₹35</em>).
                Any department or building placed in those areas (e.g. Sociology, History) automatically gets the <strong>₹35</strong> rate.
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                className="btn btn-primary"
                onClick={handleSaveAreaFareMatrix}
                disabled={savingMatrix}
                style={{ fontWeight: 800 }}
              >
                <Save size={15} /> {savingMatrix ? 'Saving Grid...' : 'Save All Matrix Fares'}
              </button>
              <button className="btn btn-secondary" onClick={loadData} title="Refresh Fares">
                <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* Interactive Live 4-Tier Fare Simulator */}
          <div className="panel" style={{ marginBottom: '24px', background: 'var(--bg-card)' }}>
            <div className="panel-header">
              <div>
                <h3 className="panel-title" style={{ fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={16} color="var(--primary)" /> 4-Tier Fare Resolution Simulator
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Test how any pickup and destination resolves through: <strong>Tier 1 Override ➔ Tier 2 Area Rule ➔ Tier 3 Default Campus Flat ➔ Tier 4 GPS Fallback</strong>.
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '14px', alignItems: 'flex-end', marginTop: '12px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '11px', fontWeight: 700 }}>Pickup Stop / Department</label>
                <select
                  className="form-input"
                  value={testPickup}
                  onChange={(e) => { setTestPickup(e.target.value); setTestResult(null); }}
                >
                  {groupedStops.map(group => (
                    <optgroup key={`tp-${group.key || group.code}`} label={`${group.icon} ${group.label || group.name}`}>
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
                <label className="form-label" style={{ fontSize: '11px', fontWeight: 700 }}>Destination Stop / Department</label>
                <select
                  className="form-input"
                  value={testDrop}
                  onChange={(e) => { setTestDrop(e.target.value); setTestResult(null); }}
                >
                  {groupedStops.map(group => (
                    <optgroup key={`td-${group.key || group.code}`} label={`${group.icon} ${group.label || group.name}`}>
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
                style={{ padding: '10px 20px', fontWeight: 800 }}
              >
                {testingRoute ? 'Simulating...' : 'Test Fare'}
              </button>
            </div>

            {testResult && (
              <div style={{
                marginTop: '16px',
                padding: '16px 20px',
                background: testResult.ruleTier === 1 ? 'rgba(99, 102, 241, 0.12)' : (testResult.ruleTier === 2 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)'),
                border: `1.5px solid ${testResult.ruleTier === 1 ? '#6366F1' : (testResult.ruleTier === 2 ? '#10B981' : '#F59E0B')}`,
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '14px'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span className="badge" style={{
                      background: testResult.ruleTier === 1 ? '#6366F1' : (testResult.ruleTier === 2 ? '#10B981' : '#F59E0B'),
                      color: '#FFF',
                      fontWeight: 900
                    }}>
                      Tier {testResult.ruleTier || 2}: {testResult.ruleType}
                    </span>
                    <span style={{ fontSize: '14px', fontWeight: 800 }}>
                      {testResult.description}
                    </span>
                  </div>

                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', gap: '16px', marginTop: '4px' }}>
                    <span>Pickup Area: <strong>{testResult.pickupArea ? `${testResult.pickupArea.areaIcon} ${testResult.pickupArea.areaName}` : 'Campus Stop'}</strong></span>
                    <span>➔</span>
                    <span>Drop Area: <strong>{testResult.destinationArea ? `${testResult.destinationArea.areaIcon} ${testResult.destinationArea.areaName}` : 'Campus Stop'}</strong></span>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Passenger Fare</div>
                  <div style={{ fontSize: '26px', fontWeight: 900, color: 'var(--primary)' }}>
                    ₹{parseFloat(testResult.fare || 20).toFixed(2)}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Visual N x N Matrix Grid Panel */}
          <div className="panel" style={{ marginBottom: '24px' }}>
            <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Grid className="text-primary" size={20} /> Campus Area-to-Area Pricing Grid (N × N)
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  Enter fixed fares between each campus area. Click "Save All Matrix Fares" when done.
                </p>
              </div>

              <button className="btn btn-primary btn-sm" onClick={handleSaveAreaFareMatrix} disabled={savingMatrix}>
                <Save size={13} /> {savingMatrix ? 'Saving...' : 'Save Matrix'}
              </button>
            </div>

            {/* Matrix Table */}
            <div style={{ overflowX: 'auto', marginTop: '12px' }}>
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ background: 'var(--bg-sidebar)', width: '220px' }}>From Area ➔ To Area</th>
                    {matrixData?.areas?.map(toArea => (
                      <th key={`th-${toArea.area_code}`} style={{ textAlign: 'center', background: toArea.bg_color || 'var(--bg-sidebar)', color: toArea.color || 'var(--text-primary)', fontWeight: 800 }}>
                        <div style={{ fontSize: '18px' }}>{toArea.icon || '📍'}</div>
                        <div style={{ fontSize: '12px' }}>{toArea.name}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matrixData?.matrix?.map((row, rIdx) => (
                    <tr key={`row-${row.fromArea.area_code}`}>
                      <td style={{ fontWeight: 800, background: row.fromArea.bg_color || 'var(--bg-sidebar)', color: row.fromArea.color || 'var(--text-primary)', borderRight: '2px solid var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '18px' }}>{row.fromArea.icon || '📍'}</span>
                          <div>
                            <div style={{ fontSize: '13px' }}>{row.fromArea.name}</div>
                            <div style={{ fontSize: '10px', opacity: 0.8 }}>({row.fromArea.stopsCount || 0} locations)</div>
                          </div>
                        </div>
                      </td>

                      {row.targets.map((target, cIdx) => {
                        const isSame = row.fromArea.area_code === target.toArea.area_code;
                        return (
                          <td
                            key={`cell-${row.fromArea.area_code}-${target.toArea.area_code}`}
                            style={{
                              textAlign: 'center',
                              background: isSame ? 'rgba(245, 158, 11, 0.05)' : 'transparent',
                              padding: '10px'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                              <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-muted)' }}>₹</span>
                              <input
                                type="number"
                                step="1"
                                min="5"
                                max="200"
                                style={{
                                  width: '68px',
                                  textAlign: 'center',
                                  fontWeight: 900,
                                  fontSize: '14px',
                                  color: 'var(--primary)',
                                  padding: '4px 6px',
                                  border: '1.5px solid var(--border)',
                                  borderRadius: '6px',
                                  background: 'var(--bg-card)'
                                }}
                                value={target.fareAmount}
                                onChange={(e) => handleMatrixCellChange(rIdx, cIdx, e.target.value)}
                              />
                            </div>
                            {isSame && (
                              <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                (Within Area)
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: CAMPUS AREAS & LOCATIONS (HIERARCHY) */}
      {/* ========================================================================= */}
      {activeTab === 'campus_areas' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers className="text-primary" size={20} /> Campus Areas & Associated Locations
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Organize your campus into geographic zones. Add or move departments and hostels under each Campus Area.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={() => handleOpenAreaModal(null)} style={{ fontWeight: 800 }}>
                <Plus size={15} /> Create Campus Area
              </button>
              <button className="btn btn-secondary" onClick={() => handleOpenAddStopModal(null)}>
                <MapPin size={15} /> Add Location / Department
              </button>
              {campusAreas.length > 0 && (
                <button className="btn btn-secondary" onClick={handleResetAllAreas} style={{ color: '#F87171', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
                  <Trash2 size={14} /> Reset Areas
                </button>
              )}
            </div>
          </div>

          {/* Create / Edit Campus Area Modal */}
          {showAreaModal && (
            <div className="panel" style={{ border: '1.5px solid var(--primary)', marginBottom: '24px', background: 'var(--bg-card)' }}>
              <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 className="panel-title" style={{ color: 'var(--primary)' }}>
                  {editingArea ? `Edit Campus Area: ${editingArea.name}` : 'Create New Campus Area (Zone)'}
                </h3>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowAreaModal(false)}>
                  <X size={14} /> Close
                </button>
              </div>

              <form onSubmit={handleSaveArea}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginTop: '14px' }}>
                  <div>
                    <label className="form-label" style={{ fontSize: '12px', fontWeight: 800 }}>Area Name</label>
                    <input
                      type="text"
                      className="form-input"
                      value={areaForm.name}
                      onChange={(e) => setAreaForm({ ...areaForm, name: e.target.value })}
                      placeholder="e.g. Silver Jubilee Campus (SJC)"
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label" style={{ fontSize: '12px', fontWeight: 800 }}>Area Code (Unique ID)</label>
                    <input
                      type="text"
                      className="form-input"
                      value={areaForm.area_code}
                      onChange={(e) => setAreaForm({ ...areaForm, area_code: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
                      placeholder="e.g. SJC_CAMPUS"
                    />
                  </div>

                  <div>
                    <label className="form-label" style={{ fontSize: '12px', fontWeight: 800 }}>Select Emoji Icon</label>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                      {PRESET_EMOJIS.map(emoji => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setAreaForm({ ...areaForm, icon: emoji })}
                          style={{
                            fontSize: '18px',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            border: areaForm.icon === emoji ? '2px solid var(--primary)' : '1px solid var(--border)',
                            background: areaForm.icon === emoji ? 'rgba(245, 158, 11, 0.2)' : 'var(--bg-sidebar)',
                            cursor: 'pointer'
                          }}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="form-label" style={{ fontSize: '12px', fontWeight: 800 }}>Theme Color</label>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                      {PRESET_COLORS.map(c => (
                        <button
                          key={c.hex}
                          type="button"
                          onClick={() => setAreaForm({ ...areaForm, color: c.hex, bg_color: c.bg })}
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            background: c.hex,
                            border: areaForm.color === c.hex ? '3px solid #FFF' : '1px solid transparent',
                            boxShadow: areaForm.color === c.hex ? '0 0 0 2px var(--primary)' : 'none',
                            cursor: 'pointer'
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: '14px' }}>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 800 }}>Area Description</label>
                  <input
                    type="text"
                    className="form-input"
                    value={areaForm.description}
                    onChange={(e) => setAreaForm({ ...areaForm, description: e.target.value })}
                    placeholder="e.g. SJC Hostels, Sociology, History, Social Sciences & Foreign Hostel"
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowAreaModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary btn-sm" style={{ fontWeight: 800 }}>
                    <Save size={13} /> Save Campus Area
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Delete Area Modal */}
          {areaToDelete && (
            <div className="panel" style={{ border: '2px solid #EF4444', marginBottom: '24px', background: 'rgba(239, 68, 68, 0.05)' }}>
              <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 className="panel-title" style={{ color: '#EF4444', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={18} /> Delete Campus Area: {areaToDelete.name}?
                </h3>
                <button className="btn btn-secondary btn-sm" onClick={() => setAreaToDelete(null)}>Cancel</button>
              </div>

              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                How would you like to handle the <strong>{areaToDelete.stopsCount || 0} locations</strong> currently inside this area?
              </p>

              <div style={{ display: 'flex', gap: '12px', marginTop: '16px', flexWrap: 'wrap' }}>
                <button className="btn btn-danger" onClick={() => handleDeleteArea(areaToDelete, true)}>
                  <Trash2 size={14} /> Delete Area AND All its Locations
                </button>
                <button className="btn btn-secondary" onClick={() => handleDeleteArea(areaToDelete, false)}>
                  Keep Locations (Move to Main Campus) & Delete Area
                </button>
                <button className="btn btn-secondary" onClick={() => setAreaToDelete(null)}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Add Stop Modal */}
          {showStopModal && (
            <div className="panel" style={{ border: '1.5px solid var(--primary)', marginBottom: '24px', background: 'var(--bg-card)' }}>
              <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 className="panel-title" style={{ color: 'var(--primary)' }}>Add Location / Department</h3>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowStopModal(false)}>
                  <X size={14} /> Close
                </button>
              </div>

              <form onSubmit={handleSaveStop}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginTop: '14px' }}>
                  <div>
                    <label className="form-label" style={{ fontSize: '11px', fontWeight: 800 }}>Location / Building / Dept Name</label>
                    <input
                      type="text"
                      className="form-input"
                      value={stopForm.name}
                      onChange={(e) => setStopForm({ ...stopForm, name: e.target.value })}
                      placeholder="e.g. Sociology Department or Mother Teresa Hostel"
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label" style={{ fontSize: '11px', fontWeight: 800 }}>Belongs to Campus Area</label>
                    <select
                      className="form-input"
                      value={stopForm.area_code}
                      onChange={(e) => setStopForm({ ...stopForm, area_code: e.target.value })}
                    >
                      {campusAreas.map(a => (
                        <option key={a.id} value={a.area_code}>
                          {a.icon} {a.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="form-label" style={{ fontSize: '11px', fontWeight: 800 }}>Latitude</label>
                    <input
                      type="number"
                      step="0.000001"
                      className="form-input"
                      value={stopForm.latitude}
                      onChange={(e) => setStopForm({ ...stopForm, latitude: e.target.value })}
                      placeholder="12.0240"
                    />
                  </div>

                  <div>
                    <label className="form-label" style={{ fontSize: '11px', fontWeight: 800 }}>Longitude</label>
                    <input
                      type="number"
                      step="0.000001"
                      className="form-input"
                      value={stopForm.longitude}
                      onChange={(e) => setStopForm({ ...stopForm, longitude: e.target.value })}
                      placeholder="79.8530"
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowStopModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary btn-sm" style={{ fontWeight: 800 }}>
                    <Save size={13} /> Save Location
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Categorized Campus Area Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
            {groupedStops.map(group => {
              const areaObj = campusAreas.find(a => a.area_code === group.code || a.area_code === group.key) || group;
              const color = areaObj.color || '#3B82F6';
              const bg = areaObj.bg_color || 'rgba(59, 130, 246, 0.12)';
              const icon = areaObj.icon || '📍';

              return (
                <div
                  key={group.code || group.key}
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
                  {/* Card Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '10px',
                        background: bg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '22px'
                      }}>
                        {icon}
                      </div>

                      <div>
                        <div style={{ fontWeight: 800, fontSize: '16px', color: 'var(--text-primary)' }}>{group.label || group.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
                          Area Code: <code>{group.code || group.key}</code>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="badge" style={{ background: bg, color: color, fontWeight: 800 }}>
                        {group.stops.length} locations
                      </span>

                      {areaObj.id && (
                        <>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleOpenAreaModal(areaObj)}
                            title="Edit area"
                            style={{ padding: '4px 6px' }}
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => setAreaToDelete({ ...areaObj, stopsCount: group.stops.length })}
                            title="Delete area"
                            style={{ padding: '4px 6px', color: '#F87171' }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Stops List */}
                  <div style={{
                    background: 'var(--bg-sidebar)',
                    borderRadius: 'var(--radius-md)',
                    padding: '10px',
                    maxHeight: '260px',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}>
                    {group.stops.length === 0 ? (
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>
                        No locations inside this area yet. Click below to add.
                      </div>
                    ) : (
                      group.stops.map(stop => (
                        <div
                          key={stop.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '7px 10px',
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
                            onClick={() => handleDeleteStop(stop.id, stop.name)}
                            title="Delete location"
                            style={{ padding: '4px 6px', color: '#F87171' }}
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add Location Button */}
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleOpenAddStopModal(group.code || group.key)}
                    style={{ width: '100%', justifyContent: 'center', fontSize: '12px', fontWeight: 700 }}
                  >
                    <Plus size={13} /> Add Location to {group.label || group.name}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: SPECIFIC ROUTE OVERRIDES (TIER 1 OVERRIDES) */}
      {/* ========================================================================= */}
      {activeTab === 'specific_routes' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Compass className="text-primary" size={20} /> Specific Route Overrides (Tier 1 Priority)
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Set special pricing for specific stop-to-stop routes. When defined, these override the standard Area ➔ Area fare.
              </p>
            </div>

            <button className="btn btn-primary" onClick={() => { setEditingOverride(null); setShowOverrideModal(true); }}>
              <Plus size={15} /> Add Specific Route Override
            </button>
          </div>

          {/* Add Override Modal */}
          {showOverrideModal && (
            <div className="panel" style={{ border: '1.5px solid var(--primary)', marginBottom: '24px', background: 'var(--bg-card)' }}>
              <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 className="panel-title" style={{ color: 'var(--primary)' }}>
                  {editingOverride ? 'Edit Specific Route Override' : 'Create Specific Route Override'}
                </h3>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowOverrideModal(false)}>Close</button>
              </div>

              <form onSubmit={handleSaveOverride}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginTop: '14px' }}>
                  <div>
                    <label className="form-label" style={{ fontSize: '12px', fontWeight: 800 }}>Pickup Stop</label>
                    <select
                      className="form-input"
                      value={overrideForm.pickupStop}
                      onChange={(e) => setOverrideForm({ ...overrideForm, pickupStop: e.target.value })}
                      required
                    >
                      <option value="">Select Pickup...</option>
                      {groupedStops.map(group => (
                        <optgroup key={`op-${group.code}`} label={`${group.icon} ${group.label || group.name}`}>
                          {group.stops.map(s => (
                            <option key={`op-stop-${s.id}`} value={s.name}>{s.name}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="form-label" style={{ fontSize: '12px', fontWeight: 800 }}>Destination Stop</label>
                    <select
                      className="form-input"
                      value={overrideForm.destinationStop}
                      onChange={(e) => setOverrideForm({ ...overrideForm, destinationStop: e.target.value })}
                      required
                    >
                      <option value="">Select Destination...</option>
                      {groupedStops.map(group => (
                        <optgroup key={`od-${group.code}`} label={`${group.icon} ${group.label || group.name}`}>
                          {group.stops.map(s => (
                            <option key={`od-stop-${s.id}`} value={s.name}>{s.name}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="form-label" style={{ fontSize: '12px', fontWeight: 800 }}>Override Fare (₹)</label>
                    <input
                      type="number"
                      step="1"
                      min="5"
                      max="300"
                      className="form-input"
                      value={overrideForm.fareAmount}
                      onChange={(e) => setOverrideForm({ ...overrideForm, fareAmount: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label" style={{ fontSize: '12px', fontWeight: 800 }}>Est. Distance (km)</label>
                    <input
                      type="number"
                      step="0.1"
                      className="form-input"
                      value={overrideForm.distanceKm}
                      onChange={(e) => setOverrideForm({ ...overrideForm, distanceKm: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowOverrideModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary btn-sm" style={{ fontWeight: 800 }}>
                    <Save size={13} /> Save Override
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Overrides Table */}
          <div className="panel">
            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>From (Pickup)</th>
                    <th style={{ textAlign: 'center' }}>Direction</th>
                    <th>To (Destination)</th>
                    <th>Distance</th>
                    <th>Override Fare (₹)</th>
                    <th>Priority</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {routeOverrides.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                        No specific overrides active. All routes follow the Area ➔ Area matrix.
                      </td>
                    </tr>
                  ) : (
                    routeOverrides.map(r => (
                      <tr key={r.id}>
                        <td style={{ fontWeight: 600 }}>{r.pickup_stop}</td>
                        <td style={{ textAlign: 'center', color: 'var(--primary)' }}><ArrowRight size={16} /></td>
                        <td style={{ fontWeight: 600 }}>{r.destination_stop}</td>
                        <td>{r.distance_km || 1.5} km</td>
                        <td>
                          <span style={{ fontWeight: 900, color: 'var(--primary)', fontSize: '15px' }}>
                            ₹{parseFloat(r.fare_amount).toFixed(2)}
                          </span>
                        </td>
                        <td>
                          <span className="badge" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818CF8', fontWeight: 800 }}>
                            🌟 Tier 1 Override
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDeleteOverride(r.id)}>
                            <Trash2 size={12} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: VEHICLE FALLBACK RATES & REVENUE SPLITS */}
      {/* ========================================================================= */}
      {activeTab === 'vehicle_fallback' && (
        <div>
          {/* Default Vehicle Fallback Rates */}
          <div className="panel" style={{ marginBottom: '24px' }}>
            <div className="panel-header">
              <div>
                <h2 className="panel-title">Tier 4: GPS Distance Fallback Rates</h2>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  Applied only when a ride takes place outside campus or between unmapped coordinates.
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
                            onClick={() => handleUpdateFareConfig(editingConfig)}
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


