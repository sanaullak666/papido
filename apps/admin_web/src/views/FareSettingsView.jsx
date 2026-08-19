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
  Building,
  Layers,
  AlertCircle,
  X,
  Tag,
  HelpCircle,
  Check
} from 'lucide-react';

const PRESET_EMOJIS = ['👧', '👦', '🏛️', '🚪', '📚', '☕', '🏨', '🏋️', '🔬', '🏥', '🌳', '🚌', '📍', '🏢', '🎓'];
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
  const [activeTab, setActiveTab] = useState('routes'); // 'routes', 'locations', 'fallback'
  const [fareConfigs, setFareConfigs] = useState([]);
  const [routeFares, setRouteFares] = useState([]);
  const [campusStops, setCampusStops] = useState([]);
  const [groupedStops, setGroupedStops] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingFare, setSavingFare] = useState(false);
  const [editingConfig, setEditingConfig] = useState(null);
  const [editingRoute, setEditingRoute] = useState(null);
  const [showAddRouteModal, setShowAddRouteModal] = useState(false);
  const [showAddStopModal, setShowAddStopModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [routeFilter, setRouteFilter] = useState('ALL'); // 'ALL', 'GROUPS', 'SPECIFIC'
  const [searchQuery, setSearchQuery] = useState('');
  const [targetCategoryForStop, setTargetCategoryForStop] = useState('');

  // Route Form State
  const [newRoute, setNewRoute] = useState({
    pickupStop: '',
    destinationStop: '',
    fareAmount: '20.00',
    distanceKm: '1.5'
  });

  // Stop Form State
  const [newStop, setNewStop] = useState({
    name: '',
    category: '',
    latitude: '12.0240',
    longitude: '79.8530',
    displayOrder: 0
  });

  // Category Form State
  const [categoryForm, setCategoryForm] = useState({
    label: '',
    token: '',
    icon: '📍',
    color: '#3B82F6',
    bg_color: 'rgba(59, 130, 246, 0.12)',
    display_order: 0
  });

  // Live Rule Tester State
  const [testPickup, setTestPickup] = useState('');
  const [testDrop, setTestDrop] = useState('');
  const [testResult, setTestResult] = useState(null);
  const [testingRoute, setTestingRoute] = useState(false);

  const [successMsg, setSuccessMsg] = useState('');

  const showToast = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [configsRes, routesRes, stopsRes, catsRes] = await Promise.all([
        apiRequest('/admin/fare-settings'),
        apiRequest('/admin/route-fares'),
        apiRequest('/admin/campus-stops'),
        apiRequest('/admin/campus-categories')
      ]);

      setFareConfigs(configsRes.data || []);
      setRouteFares(routesRes.data || []);

      const catsList = catsRes.data || (stopsRes.data?.categories) || [];
      setCategories(catsList);

      if (stopsRes.data) {
        const stopsList = stopsRes.data.stops || [];
        setCampusStops(stopsList);
        setGroupedStops(stopsRes.data.grouped || []);

        if (stopsList.length > 0 && !testPickup) {
          setTestPickup(stopsList[0].name);
          setTestDrop(stopsList[1] ? stopsList[1].name : stopsList[0].name);
        }
      }

      // Default route form defaults
      if (catsList.length > 0 && !newRoute.pickupStop) {
        setNewRoute(prev => ({
          ...prev,
          pickupStop: catsList[0].token || `[${catsList[0].label}]`,
          destinationStop: catsList[1] ? (catsList[1].token || `[${catsList[1].label}]`) : (catsList[0].token || `[${catsList[0].label}]`)
        }));
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
  // CATEGORY / LIST MANAGEMENT
  // -------------------------------------------------------------
  const handleOpenCategoryModal = (cat = null) => {
    if (cat) {
      setEditingCategory(cat);
      setCategoryForm({
        label: cat.label || '',
        token: cat.token || `[${cat.label || ''}]`,
        icon: cat.icon || '📍',
        color: cat.color || '#3B82F6',
        bg_color: cat.bg_color || 'rgba(59, 130, 246, 0.12)',
        display_order: cat.display_order || 0
      });
    } else {
      setEditingCategory(null);
      setCategoryForm({
        label: '',
        token: '',
        icon: '📍',
        color: '#3B82F6',
        bg_color: 'rgba(59, 130, 246, 0.12)',
        display_order: categories.length + 1
      });
    }
    setShowCategoryModal(true);
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    if (!categoryForm.label.trim()) {
      alert('Please enter a list name.');
      return;
    }

    try {
      let finalToken = categoryForm.token.trim();
      if (!finalToken) {
        finalToken = `[${categoryForm.label.trim()}]`;
      }
      if (!finalToken.startsWith('[')) finalToken = `[${finalToken}`;
      if (!finalToken.endsWith(']')) finalToken = `${finalToken}]`;

      await apiRequest('/admin/campus-categories', 'POST', {
        id: editingCategory?.id,
        label: categoryForm.label.trim(),
        token: finalToken,
        icon: categoryForm.icon,
        color: categoryForm.color,
        bg_color: categoryForm.bg_color,
        display_order: parseInt(categoryForm.display_order) || 0
      });

      showToast(editingCategory ? `List "${categoryForm.label}" updated!` : `New list "${categoryForm.label}" created!`);
      setShowCategoryModal(false);
      setEditingCategory(null);
      loadData();
    } catch (err) {
      alert(`Failed to save category list: ${err.message}`);
    }
  };

  const handleDeleteCategory = async (cat, deleteStops = false) => {
    try {
      await apiRequest(`/admin/campus-categories/${cat.id}?deleteStops=${deleteStops}`, 'DELETE');
      showToast(`Category list "${cat.label}" deleted.`);
      setCategoryToDelete(null);
      loadData();
    } catch (err) {
      alert(`Failed to delete category: ${err.message}`);
    }
  };

  const handleClearAllCategories = async () => {
    const confirmText = window.prompt('Type "DELETE" to confirm removing ALL campus categories & location lists:');
    if (confirmText !== 'DELETE') {
      if (confirmText !== null) alert('Action cancelled: text did not match.');
      return;
    }

    try {
      await apiRequest('/admin/campus-categories/all?deleteStops=true', 'DELETE');
      showToast('All category lists and stops cleared.');
      loadData();
    } catch (err) {
      alert(`Failed to clear categories: ${err.message}`);
    }
  };

  // -------------------------------------------------------------
  // LOCATION / STOP MANAGEMENT
  // -------------------------------------------------------------
  const handleOpenAddStopModal = (categoryKey = null) => {
    const defaultCat = categoryKey || (categories[0]?.category_key || 'GATE_HUB');
    setNewStop({
      name: '',
      category: defaultCat,
      latitude: '12.0240',
      longitude: '79.8530',
      displayOrder: 0
    });
    setTargetCategoryForStop(defaultCat);
    setShowAddStopModal(true);
  };

  const handleSaveCampusStop = async (e) => {
    e.preventDefault();
    if (!newStop.name.trim()) {
      alert('Please enter a location / building name.');
      return;
    }
    const cat = newStop.category || targetCategoryForStop || categories[0]?.category_key || 'GATE_HUB';
    const catObj = categories.find(c => c.category_key === cat);

    try {
      await apiRequest('/admin/campus-stops', 'POST', {
        name: newStop.name.trim(),
        category: cat,
        category_label: catObj ? catObj.label : 'Campus Location',
        latitude: parseFloat(newStop.latitude || 12.0240),
        longitude: parseFloat(newStop.longitude || 79.8530),
        displayOrder: parseInt(newStop.displayOrder || 0)
      });
      showToast(`"${newStop.name}" added to campus locations!`);
      setShowAddStopModal(false);
      loadData();
    } catch (err) {
      alert(`Failed to save campus stop: ${err.message}`);
    }
  };

  const handleDeleteCampusStop = async (id, name) => {
    if (!window.confirm(`Are you sure you want to remove "${name}"?`)) return;
    try {
      await apiRequest(`/admin/campus-stops/${id}`, 'DELETE');
      showToast(`"${name}" removed from campus locations.`);
      loadData();
    } catch (err) {
      alert(`Failed to delete location: ${err.message}`);
    }
  };

  // -------------------------------------------------------------
  // ROUTE & GROUP FARE RULES
  // -------------------------------------------------------------
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
      showToast('Campus pricing rule saved successfully!');
      setEditingRoute(null);
      setShowAddRouteModal(false);
      loadData();
    } catch (err) {
      alert(`Failed to save pricing rule: ${err.message}`);
    }
  };

  const handleDeleteRoute = async (id) => {
    if (!window.confirm('Are you sure you want to delete this pricing rule?')) return;
    try {
      await apiRequest(`/admin/route-fares/${id}`, 'DELETE');
      showToast('Pricing rule deleted.');
      loadData();
    } catch (err) {
      alert(`Failed to delete route: ${err.message}`);
    }
  };

  const handleClearAllRoutes = async () => {
    const confirmPrompt = window.prompt('Type "DELETE" to remove ALL route pricing rules from the matrix:');
    if (confirmPrompt !== 'DELETE') {
      if (confirmPrompt !== null) alert('Action cancelled: text did not match.');
      return;
    }

    try {
      await apiRequest('/admin/route-fares/all', 'DELETE');
      showToast('All route pricing rules cleared.');
      loadData();
    } catch (err) {
      alert(`Failed to clear route rules: ${err.message}`);
    }
  };

  // -------------------------------------------------------------
  // VEHICLE RATES
  // -------------------------------------------------------------
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
      showToast(`Default rates for ${config.vehicle_type} updated!`);
      setEditingConfig(null);
      loadData();
    } catch (err) {
      alert(`Failed to update fare: ${err.message}`);
    } finally {
      setSavingFare(false);
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

  const formatDisplayStopName = (val) => {
    if (!val) return '';
    if (isGroupToken(val)) {
      const match = categories.find(c => c.token === val || `[${c.label}]` === val || `[${c.category_key}]` === val);
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: 800, color: match?.color || '#F59E0B' }}>
          <span>{match?.icon || '🌟'}</span>
          <span>All {match?.label || val.replace(/[\[\]]/g, '')}</span>
        </span>
      );
    }
    return <span style={{ fontWeight: 600 }}>{val}</span>;
  };

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
          padding: '12px 18px',
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.4)',
          borderRadius: 'var(--radius-md)',
          color: '#34D399',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontWeight: 600
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
          onClick={() => setActiveTab('routes')}
          className="btn"
          style={{
            background: activeTab === 'routes' ? 'var(--primary)' : 'var(--bg-card)',
            color: activeTab === 'routes' ? '#000' : 'var(--text-primary)',
            border: '1px solid var(--border)',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <FolderTree size={16} /> Campus Pricing Rules
          <span style={{
            background: activeTab === 'routes' ? 'rgba(0,0,0,0.25)' : 'var(--bg-sidebar)',
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
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Layers size={16} /> Location Lists & Categories
          <span style={{
            background: activeTab === 'locations' ? 'rgba(0,0,0,0.25)' : 'var(--bg-sidebar)',
            padding: '2px 8px',
            borderRadius: '10px',
            fontSize: '11px'
          }}>
            {categories.length} Lists ({campusStops.length} Stops)
          </span>
        </button>

        <button
          onClick={() => setActiveTab('fallback')}
          className="btn"
          style={{
            background: activeTab === 'fallback' ? 'var(--primary)' : 'var(--bg-card)',
            color: activeTab === 'fallback' ? '#000' : 'var(--text-primary)',
            border: '1px solid var(--border)',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          ⚡ Vehicle Base Rates & Splits
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: CAMPUS ROUTE & PRICING RULES */}
      {/* ========================================================================= */}
      {activeTab === 'routes' && (
        <>
          {/* Quick Info & Action Header */}
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
            gap: '14px'
          }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={18} /> Simple & Easy Fare Rules
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Set flat prices between entire lists (e.g. <strong>All Boys Hostels ➔ All Departments = ₹20</strong>) or specific individual buildings.
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setEditingRoute(null);
                  setShowAddRouteModal(true);
                }}
                style={{ fontWeight: 800 }}
              >
                <Plus size={15} /> Add Pricing Rule
              </button>

              {routeFares.length > 0 && (
                <button
                  className="btn btn-secondary"
                  onClick={handleClearAllRoutes}
                  style={{ color: '#F87171', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                  title="Remove all pricing rules to start fresh"
                >
                  <Trash2 size={14} /> Clear All Rules
                </button>
              )}
            </div>
          </div>

          {/* Add / Edit Route Modal */}
          {showAddRouteModal && (
            <div className="panel" style={{ border: '1.5px solid var(--primary)', marginBottom: '24px', background: 'var(--bg-card)' }}>
              <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 className="panel-title" style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Plus size={18} /> {editingRoute ? 'Edit Fare Rule' : 'Create Simple Fare Rule'}
                </h3>
                <button className="btn btn-secondary btn-sm" onClick={() => { setShowAddRouteModal(false); setEditingRoute(null); }}>
                  <X size={14} /> Close
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginTop: '14px' }}>
                {/* Pickup Selection */}
                <div>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 800 }}>
                    Pickup Location / List
                  </label>
                  <select
                    className="form-input"
                    value={newRoute.pickupStop}
                    onChange={(e) => setNewRoute({ ...newRoute, pickupStop: e.target.value })}
                  >
                    <optgroup label="🏷️ ENTIRE LISTS (Applies to all stops in list)">
                      {categories.map(c => (
                        <option key={`p-cat-${c.id}`} value={c.token || `[${c.label}]`}>
                          {c.icon} All {c.label} ({c.stopsCount || 0} locations)
                        </option>
                      ))}
                    </optgroup>

                    {groupedStops.map(group => (
                      <optgroup key={`p-${group.key || group.label}`} label={`📍 Specific ${group.label}`}>
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
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 800 }}>
                    Destination Location / List
                  </label>
                  <select
                    className="form-input"
                    value={newRoute.destinationStop}
                    onChange={(e) => setNewRoute({ ...newRoute, destinationStop: e.target.value })}
                  >
                    <optgroup label="🏷️ ENTIRE LISTS (Applies to all stops in list)">
                      {categories.map(c => (
                        <option key={`d-cat-${c.id}`} value={c.token || `[${c.label}]`}>
                          {c.icon} All {c.label} ({c.stopsCount || 0} locations)
                        </option>
                      ))}
                    </optgroup>

                    {groupedStops.map(group => (
                      <optgroup key={`d-${group.key || group.label}`} label={`📍 Specific ${group.label}`}>
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
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 800 }}>
                    Fixed Fare (₹)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="5"
                    max="300"
                    className="form-input"
                    value={newRoute.fareAmount}
                    onChange={(e) => setNewRoute({ ...newRoute, fareAmount: e.target.value })}
                    placeholder="20.00"
                  />
                </div>

                {/* Distance */}
                <div>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 800 }}>
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
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <span style={{ fontSize: '18px' }}>💡</span>
                <span>
                  <strong>Rule Summary:</strong> Any trip between <strong>{newRoute.pickupStop}</strong> and <strong>{newRoute.destinationStop}</strong> will be fixed at <strong>₹{parseFloat(newRoute.fareAmount || 0).toFixed(2)}</strong>.
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowAddRouteModal(false)}>Cancel</button>
                <button className="btn btn-primary btn-sm" onClick={() => handleSaveRoute(newRoute)}>
                  <Save size={13} /> Save Pricing Rule
                </button>
              </div>
            </div>
          )}

          {/* Interactive Live Fare Tester */}
          <div className="panel" style={{ marginBottom: '24px', background: 'var(--bg-card)' }}>
            <div className="panel-header">
              <div>
                <h3 className="panel-title" style={{ fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={16} color="var(--primary)" /> Test Fare Simulator
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Verify any pickup and destination combination to see the calculated fare before students book.
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '14px', alignItems: 'flex-end', marginTop: '12px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '11px', fontWeight: 700 }}>Pickup Stop</label>
                <select
                  className="form-input"
                  value={testPickup}
                  onChange={(e) => { setTestPickup(e.target.value); setTestResult(null); }}
                >
                  {groupedStops.map(group => (
                    <optgroup key={`tp-${group.key || group.label}`} label={`${group.icon || '📍'} ${group.label}`}>
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
                <label className="form-label" style={{ fontSize: '11px', fontWeight: 700 }}>Destination Stop</label>
                <select
                  className="form-input"
                  value={testDrop}
                  onChange={(e) => { setTestDrop(e.target.value); setTestResult(null); }}
                >
                  {groupedStops.map(group => (
                    <optgroup key={`td-${group.key || group.label}`} label={`${group.icon || '📍'} ${group.label}`}>
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
                style={{ padding: '10px 18px', fontWeight: 800 }}
              >
                {testingRoute ? 'Simulating...' : 'Test Fare'}
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
                    {testResult.matched ? '✅ Matched Rule Applied' : 'ℹ️ Fallback Base Rate Applied'}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-primary)', marginTop: '2px' }}>
                    {testResult.description || 'Standard base charge calculation applies.'}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Passenger Fare</div>
                  <div style={{ fontSize: '24px', fontWeight: 900, color: 'var(--primary)' }}>
                    ₹{parseFloat(testResult.fare || 20).toFixed(2)}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Pricing Table Panel */}
          <div className="panel">
            <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MapPin className="text-primary" size={20} /> Campus Pricing Matrix
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  Total {filteredRoutes.length} rules active. Automatically applies during booking.
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
                    List Rules
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
                  placeholder="Filter rules..."
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
                    <th>Type</th>
                    <th>From (Pickup)</th>
                    <th style={{ textAlign: 'center' }}>Direction</th>
                    <th>To (Destination)</th>
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
                        No pricing rules found. Click "Add Pricing Rule" to configure your fares.
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
                                🌟 List Rule
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
                              formatDisplayStopName(r.pickup_stop)
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
                              formatDisplayStopName(r.destination_stop)
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
      {/* TAB 2: CAMPUS LOCATION LISTS & CATEGORIES */}
      {/* ========================================================================= */}
      {activeTab === 'locations' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers className="text-primary" size={20} /> Campus Location Lists & Categories
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Create, rename, or delete lists (e.g. Girls Hostels, Boys Hostels, Departments, Cafeterias). Add locations under each list.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={() => handleOpenCategoryModal(null)} style={{ fontWeight: 800 }}>
                <Plus size={15} /> Create New List
              </button>
              <button className="btn btn-secondary" onClick={() => handleOpenAddStopModal(null)}>
                <MapPin size={15} /> Add Location / Stop
              </button>
              {categories.length > 0 && (
                <button className="btn btn-secondary" onClick={handleClearAllCategories} style={{ color: '#F87171', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
                  <Trash2 size={14} /> Remove All Lists
                </button>
              )}
            </div>
          </div>

          {/* Create / Edit Category Modal */}
          {showCategoryModal && (
            <div className="panel" style={{ border: '1.5px solid var(--primary)', marginBottom: '24px', background: 'var(--bg-card)' }}>
              <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 className="panel-title" style={{ color: 'var(--primary)' }}>
                  {editingCategory ? `Edit List: ${editingCategory.label}` : 'Create New Location List / Category'}
                </h3>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowCategoryModal(false)}>
                  <X size={14} /> Close
                </button>
              </div>

              <form onSubmit={handleSaveCategory}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginTop: '14px' }}>
                  <div>
                    <label className="form-label" style={{ fontSize: '12px', fontWeight: 800 }}>List Name / Category</label>
                    <input
                      type="text"
                      className="form-input"
                      value={categoryForm.label}
                      onChange={(e) => setCategoryForm({ ...categoryForm, label: e.target.value })}
                      placeholder="e.g. Guest Houses & Faculty"
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label" style={{ fontSize: '12px', fontWeight: 800 }}>Select Emoji Icon</label>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                      {PRESET_EMOJIS.map(emoji => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setCategoryForm({ ...categoryForm, icon: emoji })}
                          style={{
                            fontSize: '18px',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            border: categoryForm.icon === emoji ? '2px solid var(--primary)' : '1px solid var(--border)',
                            background: categoryForm.icon === emoji ? 'rgba(245, 158, 11, 0.2)' : 'var(--bg-sidebar)',
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
                          onClick={() => setCategoryForm({ ...categoryForm, color: c.hex, bg_color: c.bg })}
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            background: c.hex,
                            border: categoryForm.color === c.hex ? '3px solid #FFF' : '1px solid transparent',
                            boxShadow: categoryForm.color === c.hex ? '0 0 0 2px var(--primary)' : 'none',
                            cursor: 'pointer'
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowCategoryModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary btn-sm" style={{ fontWeight: 800 }}>
                    <Save size={13} /> Save Category List
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Delete Category Confirmation Dialog */}
          {categoryToDelete && (
            <div className="panel" style={{ border: '2px solid #EF4444', marginBottom: '24px', background: 'rgba(239, 68, 68, 0.05)' }}>
              <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 className="panel-title" style={{ color: '#EF4444', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={18} /> Delete List: {categoryToDelete.label}?
                </h3>
                <button className="btn btn-secondary btn-sm" onClick={() => setCategoryToDelete(null)}>Cancel</button>
              </div>

              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                How would you like to handle the <strong>{categoryToDelete.stopsCount || 0} locations</strong> currently inside this list?
              </p>

              <div style={{ display: 'flex', gap: '12px', marginTop: '16px', flexWrap: 'wrap' }}>
                <button
                  className="btn btn-danger"
                  onClick={() => handleDeleteCategory(categoryToDelete, true)}
                >
                  <Trash2 size={14} /> Delete List AND Delete all {categoryToDelete.stopsCount || 0} Locations
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => handleDeleteCategory(categoryToDelete, false)}
                >
                  Keep Locations (Move to General Hubs) & Delete List
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => setCategoryToDelete(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Add Stop Modal / Panel */}
          {showAddStopModal && (
            <div className="panel" style={{ border: '1.5px solid var(--primary)', marginBottom: '24px', background: 'var(--bg-card)' }}>
              <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 className="panel-title" style={{ color: 'var(--primary)' }}>Add New Location / Stop</h3>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowAddStopModal(false)}>
                  <X size={14} /> Close
                </button>
              </div>

              <form onSubmit={handleSaveCampusStop}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginTop: '14px' }}>
                  <div>
                    <label className="form-label" style={{ fontSize: '11px', fontWeight: 800 }}>Building / Stop Name</label>
                    <input
                      type="text"
                      className="form-input"
                      value={newStop.name}
                      onChange={(e) => setNewStop({ ...newStop, name: e.target.value })}
                      placeholder="e.g. Ganga Girls Hostel or Central Library"
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label" style={{ fontSize: '11px', fontWeight: 800 }}>Belongs to List / Category</label>
                    <select
                      className="form-input"
                      value={newStop.category}
                      onChange={(e) => setNewStop({ ...newStop, category: e.target.value })}
                    >
                      {categories.map(c => (
                        <option key={c.id} value={c.category_key}>
                          {c.icon} {c.label}
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
                      value={newStop.latitude}
                      onChange={(e) => setNewStop({ ...newStop, latitude: e.target.value })}
                      placeholder="12.0240"
                    />
                  </div>

                  <div>
                    <label className="form-label" style={{ fontSize: '11px', fontWeight: 800 }}>Longitude</label>
                    <input
                      type="number"
                      step="0.000001"
                      className="form-input"
                      value={newStop.longitude}
                      onChange={(e) => setNewStop({ ...newStop, longitude: e.target.value })}
                      placeholder="79.8530"
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowAddStopModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary btn-sm" style={{ fontWeight: 800 }}>
                    <Save size={13} /> Save Location
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Categorized Location Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
            {groupedStops.map(group => {
              const catObj = categories.find(c => c.category_key === group.key || c.id === group.id) || {};
              const color = catObj.color || group.color || '#3B82F6';
              const bg = catObj.bg_color || group.bg || 'rgba(59, 130, 246, 0.12)';
              const icon = catObj.icon || group.icon || '📍';

              return (
                <div
                  key={group.key || group.id}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    position: 'relative'
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
                        <div style={{ fontWeight: 800, fontSize: '16px', color: 'var(--text-primary)' }}>{group.label}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
                          List Token: <code>{group.token || `[${group.label}]`}</code>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="badge" style={{ background: bg, color: color, fontWeight: 800 }}>
                        {group.stops.length} locations
                      </span>

                      {catObj.id && (
                        <>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleOpenCategoryModal(catObj)}
                            title="Edit list name / icon"
                            style={{ padding: '4px 6px' }}
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => setCategoryToDelete({ ...catObj, stopsCount: group.stops.length })}
                            title="Delete this entire list"
                            style={{ padding: '4px 6px', color: '#F87171' }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Stops List inside category */}
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
                        No locations in this list yet.
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
                            onClick={() => handleDeleteCampusStop(stop.id, stop.name)}
                            title="Delete location"
                            style={{ padding: '4px 6px', color: '#F87171' }}
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add Stop Quick Button */}
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleOpenAddStopModal(group.key)}
                    style={{ width: '100%', justifyContent: 'center', fontSize: '12px', fontWeight: 700 }}
                  >
                    <Plus size={13} /> Add Location to {group.label}
                  </button>
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
                  Example: ₹20 Campus Ride ➔ Driver gets <strong>₹16</strong>, Company gets <strong>₹4</strong>.
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

