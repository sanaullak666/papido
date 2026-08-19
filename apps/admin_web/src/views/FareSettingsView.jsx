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
  ArrowLeftRight,
  Sparkles,
  Layers,
  Building,
  AlertCircle,
  X,
  Compass,
  Check,
  Search,
  Filter,
  TrendingUp,
  Settings2
} from 'lucide-react';

const PRESET_EMOJIS = ['👦', '👧', '🎓', '🔬', '🚪', '📚', '🏡', '🏛️', '☕', '🏨', '🏋️', '🏥', '🌳', '🚌', '📍'];
const PRESET_COLORS = [
  { label: 'Blue', hex: '#3B82F6', bg: 'rgba(59, 130, 246, 0.12)' },
  { label: 'Pink', hex: '#EC4899', bg: 'rgba(236, 72, 153, 0.12)' },
  { label: 'Purple', hex: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.12)' },
  { label: 'Emerald', hex: '#10B981', bg: 'rgba(16, 185, 129, 0.12)' },
  { label: 'Amber', hex: '#F59E0B', bg: 'rgba(245, 158, 11, 0.12)' },
  { label: 'Cyan', hex: '#06B6D4', bg: 'rgba(6, 182, 212, 0.12)' },
  { label: 'Orange', hex: '#F97316', bg: 'rgba(249, 115, 22, 0.12)' },
  { label: 'Indigo', hex: '#6366F1', bg: 'rgba(99, 102, 241, 0.12)' }
];

export function FareSettingsView() {
  const [activeTab, setActiveTab] = useState('rules'); // 'rules', 'locations', 'fallback'
  const [defaultCampusFare, setDefaultCampusFare] = useState('25.00');
  const [savingDefaultFare, setSavingDefaultFare] = useState(false);
  const [routeFares, setRouteFares] = useState([]);
  const [campusStops, setCampusStops] = useState([]);
  const [groupedStops, setGroupedStops] = useState([]);
  const [categories, setCategories] = useState([]);
  const [fareConfigs, setFareConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState('');

  // Modals & forms
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [showStopModal, setShowStopModal] = useState(false);
  const [targetCategoryForStop, setTargetCategoryForStop] = useState('');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [editingConfig, setEditingConfig] = useState(null);
  const [savingFare, setSavingFare] = useState(false);

  // Fare Rule Form State
  const [ruleForm, setRuleForm] = useState({
    pickupStop: '[Girls Hostels]',
    destinationStop: '[Silver Jubilee Campus]',
    fareAmount: '30.00',
    distanceKm: '2.0',
    isBidirectional: true
  });

  // Stop Form State
  const [stopForm, setStopForm] = useState({
    name: '',
    category: 'BOYS_HOSTEL',
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

  // Simulator State
  const [testPickup, setTestPickup] = useState('');
  const [testDrop, setTestDrop] = useState('');
  const [testResult, setTestResult] = useState(null);
  const [testingRoute, setTestingRoute] = useState(false);

  // Filters
  const [ruleFilter, setRuleFilter] = useState('ALL'); // 'ALL', 'GROUPS', 'SPECIFIC'
  const [searchQuery, setSearchQuery] = useState('');

  const showToast = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [defaultFareRes, routesRes, stopsRes, catsRes, configsRes] = await Promise.all([
        apiRequest('/admin/default-campus-fare').catch(() => ({ data: { defaultCampusFare: 25 } })),
        apiRequest('/admin/route-fares'),
        apiRequest('/admin/campus-stops'),
        apiRequest('/admin/campus-categories'),
        apiRequest('/admin/fare-settings')
      ]);

      if (defaultFareRes?.data?.defaultCampusFare) {
        setDefaultCampusFare(parseFloat(defaultFareRes.data.defaultCampusFare).toFixed(2));
      }

      setRouteFares(routesRes.data || []);
      setFareConfigs(configsRes.data || []);

      const catsList = catsRes.data || (stopsRes.data?.categories) || [];
      setCategories(catsList);

      if (stopsRes.data) {
        const stopsList = stopsRes.data.stops || [];
        setCampusStops(stopsList);
        setGroupedStops(stopsRes.data.grouped || []);

        if (stopsList.length > 0 && !testPickup) {
          const birsa = stopsList.find(s => s.name.includes('Birsa')) || stopsList[0];
          const socio = stopsList.find(s => s.name.includes('Sociology')) || stopsList[1] || stopsList[0];
          setTestPickup(birsa.name);
          setTestDrop(socio.name);
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
  // 1. DEFAULT CAMPUS FARE SAVE (TIER 3)
  // -------------------------------------------------------------
  const handleSaveDefaultCampusFare = async () => {
    const fareNum = parseFloat(defaultCampusFare);
    if (isNaN(fareNum) || fareNum <= 0) {
      alert('Please enter a valid default campus fare amount.');
      return;
    }

    try {
      setSavingDefaultFare(true);
      try {
        await apiRequest('/admin/default-campus-fare', 'POST', { fareAmount: fareNum });
      } catch (err1) {
        await apiRequest('/admin/fare-settings/default-campus-fare', 'POST', { fareAmount: fareNum });
      }
      showToast(`Default Campus Fare updated to ₹${fareNum.toFixed(2)}!`);
      loadData();
    } catch (err) {
      alert(`Failed to update default campus fare: ${err.message}`);
    } finally {
      setSavingDefaultFare(false);
    }
  };

  // -------------------------------------------------------------
  // 2. FARE RULE ACTIONS (TIER 1 & TIER 2)
  // -------------------------------------------------------------
  const handleOpenRuleModal = (rule = null) => {
    if (rule) {
      setEditingRule(rule);
      setRuleForm({
        pickupStop: rule.pickup_stop || '',
        destinationStop: rule.destination_stop || '',
        fareAmount: parseFloat(rule.fare_amount || 25).toFixed(2),
        distanceKm: (rule.distance_km || 1.5).toString(),
        isBidirectional: rule.is_bidirectional !== 0 && rule.is_bidirectional !== false
      });
    } else {
      setEditingRule(null);
      setRuleForm({
        pickupStop: categories[0]?.token || '[Boys Hostels]',
        destinationStop: categories[1]?.token || '[Silver Jubilee Campus]',
        fareAmount: '30.00',
        distanceKm: '2.0',
        isBidirectional: true
      });
    }
    setShowRuleModal(true);
  };

  const handleSaveRule = async (e) => {
    if (e) e.preventDefault();
    const p = ruleForm.pickupStop?.trim();
    const d = ruleForm.destinationStop?.trim();
    if (!p || !d) {
      alert('Please select both Pickup and Destination.');
      return;
    }
    if (p.toLowerCase() === d.toLowerCase()) {
      alert('Pickup and Destination cannot be the exact same.');
      return;
    }

    try {
      await apiRequest('/admin/route-fares', 'POST', {
        id: editingRule?.id,
        pickupStop: p,
        destinationStop: d,
        fareAmount: parseFloat(ruleForm.fareAmount || 25),
        distanceKm: parseFloat(ruleForm.distanceKm || 1.5),
        isBidirectional: ruleForm.isBidirectional ? 1 : 0,
        isActive: 1
      });

      const isGroup = p.startsWith('[') || d.startsWith('[');
      showToast(isGroup ? 'Group Fare Rule saved!' : 'Specific Route Override saved!');
      setShowRuleModal(false);
      setEditingRule(null);
      loadData();
    } catch (err) {
      alert(`Failed to save fare rule: ${err.message}`);
    }
  };

  const handleDeleteRule = async (id, name) => {
    if (!window.confirm(`Delete rule "${name}"?`)) return;
    try {
      await apiRequest(`/admin/route-fares/${id}`, 'DELETE');
      showToast('Fare rule deleted.');
      loadData();
    } catch (err) {
      alert(`Failed to delete rule: ${err.message}`);
    }
  };

  const handleClearAllRules = async () => {
    const confirmPrompt = window.prompt('Type "DELETE" to remove ALL custom fare rules and reset to the ₹25 default:');
    if (confirmPrompt !== 'DELETE') return;
    try {
      await apiRequest('/admin/route-fares/all', 'DELETE');
      showToast('All custom fare rules cleared.');
      loadData();
    } catch (err) {
      alert(`Failed to clear rules: ${err.message}`);
    }
  };

  // -------------------------------------------------------------
  // 3. LIVE 4-TIER FARE SIMULATOR
  // -------------------------------------------------------------
  const handleTestFare = async () => {
    if (!testPickup || !testDrop) return;
    try {
      setTestingRoute(true);
      const res = await apiRequest('/admin/route-fares/test', 'POST', {
        pickupStop: testPickup,
        destinationStop: testDrop
      });
      setTestResult(res.data);
    } catch (err) {
      alert(`Simulator error: ${err.message}`);
    } finally {
      setTestingRoute(false);
    }
  };

  // -------------------------------------------------------------
  // 4. LOCATION & CATEGORY ACTIONS
  // -------------------------------------------------------------
  const handleOpenAddStopModal = (catKey = null) => {
    const defaultCat = catKey || (categories[0]?.category_key || 'BOYS_HOSTEL');
    setStopForm({
      name: '',
      category: defaultCat,
      latitude: '12.0240',
      longitude: '79.8530',
      displayOrder: 0
    });
    setTargetCategoryForStop(defaultCat);
    setShowStopModal(true);
  };

  const handleSaveStop = async (e) => {
    e.preventDefault();
    if (!stopForm.name.trim()) {
      alert('Please enter a location name.');
      return;
    }
    const cat = stopForm.category || targetCategoryForStop || categories[0]?.category_key || 'BOYS_HOSTEL';
    const catObj = categories.find(c => c.category_key === cat);

    try {
      await apiRequest('/admin/campus-stops', 'POST', {
        name: stopForm.name.trim(),
        category: cat,
        category_label: catObj ? catObj.label : 'Campus Location',
        latitude: parseFloat(stopForm.latitude || 12.0240),
        longitude: parseFloat(stopForm.longitude || 79.8530),
        display_order: parseInt(stopForm.displayOrder || 0)
      });
      showToast(`"${stopForm.name}" added to campus locations!`);
      setShowStopModal(false);
      loadData();
    } catch (err) {
      alert(`Failed to save stop: ${err.message}`);
    }
  };

  const handleDeleteStop = async (id, name) => {
    if (!window.confirm(`Delete "${name}"?`)) return;
    try {
      await apiRequest(`/admin/campus-stops/${id}`, 'DELETE');
      showToast(`"${name}" removed.`);
      loadData();
    } catch (err) {
      alert(`Failed to delete stop: ${err.message}`);
    }
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    if (!categoryForm.label.trim()) {
      alert('Please enter a list/category name.');
      return;
    }

    try {
      let finalToken = categoryForm.token.trim();
      if (!finalToken) finalToken = `[${categoryForm.label.trim()}]`;
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

      showToast(editingCategory ? `List "${categoryForm.label}" updated!` : `List "${categoryForm.label}" created!`);
      setShowCategoryModal(false);
      loadData();
    } catch (err) {
      alert(`Failed to save category: ${err.message}`);
    }
  };

  const handleDeleteCategory = async (cat, deleteStops = false) => {
    try {
      await apiRequest(`/admin/campus-categories/${cat.id}?deleteStops=${deleteStops}`, 'DELETE');
      showToast(`List "${cat.label}" deleted.`);
      setCategoryToDelete(null);
      loadData();
    } catch (err) {
      alert(`Failed to delete category: ${err.message}`);
    }
  };

  // -------------------------------------------------------------
  // 5. VEHICLE FALLBACK RATES
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
      showToast(`Fallback GPS rates for ${config.vehicle_type} updated!`);
      setEditingConfig(null);
      loadData();
    } catch (err) {
      alert(`Failed to update fallback rates: ${err.message}`);
    } finally {
      setSavingFare(false);
    }
  };

  const isGroupToken = (val) => val && val.startsWith('[') && val.endsWith(']');

  const formatDisplayStopName = (val) => {
    if (!val) return '';
    if (isGroupToken(val)) {
      const match = categories.find(c => c.token === val || `[${c.label}]` === val || `[${c.category_key}]` === val);
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 800, color: match?.color || 'var(--primary)' }}>
          <span>{match?.icon || '🏷️'}</span>
          <span>{match?.label || val.replace(/[\[\]]/g, '')}</span>
        </span>
      );
    }
    return <span style={{ fontWeight: 600 }}>{val}</span>;
  };

  const filteredRules = routeFares.filter(r => {
    const isGroup = isGroupToken(r.pickup_stop) || isGroupToken(r.destination_stop);
    if (ruleFilter === 'GROUPS' && !isGroup) return false;
    if (ruleFilter === 'SPECIFIC' && isGroup) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (r.pickup_stop || '').toLowerCase().includes(q) || (r.destination_stop || '').toLowerCase().includes(q);
    }
    return true;
  });

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

      {/* ========================================================================= */}
      {/* 1. CONFIGURABLE DEFAULT CAMPUS FARE CARD (TOP BANNER) */}
      {/* ========================================================================= */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(99, 102, 241, 0.12))',
        border: '1.5px solid rgba(245, 158, 11, 0.4)',
        borderRadius: 'var(--radius-lg)',
        padding: '18px 24px',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ maxWidth: '600px' }}>
          <div style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--primary)' }}>
            🏛️ Standard Campus Baseline
          </div>
          <div style={{ fontSize: '18px', fontWeight: 900, color: 'var(--text-primary)', marginTop: '2px' }}>
            Default Campus Flat Fare: ₹{parseFloat(defaultCampusFare || 25).toFixed(0)}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.4 }}>
            Any registered campus ride without an exception rule automatically uses this flat price. You only need to add rules for <strong>₹30/₹35 exceptions</strong>!
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-card)', padding: '8px 14px', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '18px', fontWeight: 900, color: 'var(--primary)' }}>₹</div>
          <input
            type="number"
            step="1"
            min="5"
            max="150"
            style={{
              width: '75px',
              fontWeight: 900,
              fontSize: '18px',
              color: 'var(--primary)',
              textAlign: 'center',
              background: 'transparent',
              border: 'none',
              borderBottom: '2px solid var(--primary)',
              outline: 'none'
            }}
            value={defaultCampusFare}
            onChange={(e) => setDefaultCampusFare(e.target.value)}
          />
          <button
            className="btn btn-primary btn-sm"
            onClick={handleSaveDefaultCampusFare}
            disabled={savingDefaultFare}
            style={{ fontWeight: 800 }}
          >
            <Save size={14} /> {savingDefaultFare ? 'Saving...' : 'Save Default'}
          </button>
        </div>
      </div>

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
          onClick={() => setActiveTab('rules')}
          className="btn"
          style={{
            background: activeTab === 'rules' ? 'var(--primary)' : 'var(--bg-card)',
            color: activeTab === 'rules' ? '#000' : 'var(--text-primary)',
            border: '1px solid var(--border)',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Compass size={16} /> Campus Fare Rules & Matrix
          <span style={{
            background: activeTab === 'rules' ? 'rgba(0,0,0,0.25)' : 'var(--bg-sidebar)',
            padding: '2px 8px',
            borderRadius: '10px',
            fontSize: '11px'
          }}>
            {routeFares.length} Rules
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
          <Layers size={16} /> Location Lists & Stops
          <span style={{
            background: activeTab === 'locations' ? 'rgba(0,0,0,0.25)' : 'var(--bg-sidebar)',
            padding: '2px 8px',
            borderRadius: '10px',
            fontSize: '11px'
          }}>
            {categories.length} Groups ({campusStops.length} Stops)
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
          ⚡ GPS Fallback Rates & Driver Splits
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: CAMPUS FARE RULES & LIVE SIMULATOR */}
      {/* ========================================================================= */}
      {activeTab === 'rules' && (
        <>
          {/* Header Actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles className="text-primary" size={20} /> Campus Pricing Rules & Exceptions
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Priority: <strong>Specific Route Override ➔ Group Rule ➔ Default Campus Fare (₹{parseFloat(defaultCampusFare || 25).toFixed(0)}) ➔ GPS Fallback</strong>
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={() => handleOpenRuleModal(null)} style={{ fontWeight: 800 }}>
                <Plus size={15} /> Add Fare Rule
              </button>
              {routeFares.length > 0 && (
                <button className="btn btn-secondary" onClick={handleClearAllRules} style={{ color: '#F87171', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
                  <Trash2 size={14} /> Clear All Rules
                </button>
              )}
            </div>
          </div>

          {/* Add / Edit Fare Rule Modal */}
          {showRuleModal && (
            <div className="panel" style={{ border: '2px solid var(--primary)', marginBottom: '24px', background: 'var(--bg-card)' }}>
              <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 className="panel-title" style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Plus size={18} /> {editingRule ? 'Edit Fare Rule' : 'Create New Fare Rule'}
                </h3>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowRuleModal(false)}>
                  <X size={14} /> Close
                </button>
              </div>

              <form onSubmit={handleSaveRule}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginTop: '14px' }}>
                  {/* From (Pickup) */}
                  <div>
                    <label className="form-label" style={{ fontSize: '12px', fontWeight: 800 }}>
                      From (Group or Specific Location)
                    </label>
                    <select
                      className="form-input"
                      value={ruleForm.pickupStop}
                      onChange={(e) => setRuleForm({ ...ruleForm, pickupStop: e.target.value })}
                      required
                    >
                      <optgroup label="🌐 GENERAL">
                        <option value="[Any]">🌟 [Any Location / Any Group]</option>
                      </optgroup>

                      <optgroup label="🏷️ LOCATION GROUPS (Applies to all inside group)">
                        {categories.map(c => (
                          <option key={`rf-p-cat-${c.id}`} value={c.token || `[${c.label}]`}>
                            {c.icon} All {c.label} ({c.stopsCount || 0} stops)
                          </option>
                        ))}
                      </optgroup>

                      {groupedStops.map(group => (
                        <optgroup key={`rf-p-grp-${group.key || group.label}`} label={`📍 Specific ${group.label}`}>
                          {group.stops.map(stop => (
                            <option key={`rf-p-stop-${stop.id}`} value={stop.name}>
                              {stop.name}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>

                  {/* To (Destination) */}
                  <div>
                    <label className="form-label" style={{ fontSize: '12px', fontWeight: 800 }}>
                      To (Group or Specific Location)
                    </label>
                    <select
                      className="form-input"
                      value={ruleForm.destinationStop}
                      onChange={(e) => setRuleForm({ ...ruleForm, destinationStop: e.target.value })}
                      required
                    >
                      <optgroup label="🌐 GENERAL">
                        <option value="[Any]">🌟 [Any Location / Any Group]</option>
                      </optgroup>

                      <optgroup label="🏷️ LOCATION GROUPS (Applies to all inside group)">
                        {categories.map(c => (
                          <option key={`rf-d-cat-${c.id}`} value={c.token || `[${c.label}]`}>
                            {c.icon} All {c.label} ({c.stopsCount || 0} stops)
                          </option>
                        ))}
                      </optgroup>

                      {groupedStops.map(group => (
                        <optgroup key={`rf-d-grp-${group.key || group.label}`} label={`📍 Specific ${group.label}`}>
                          {group.stops.map(stop => (
                            <option key={`rf-d-stop-${stop.id}`} value={stop.name}>
                              {stop.name}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>

                  {/* Fare */}
                  <div>
                    <label className="form-label" style={{ fontSize: '12px', fontWeight: 800 }}>
                      Fixed Fare Amount (₹)
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="5"
                      max="300"
                      className="form-input"
                      value={ruleForm.fareAmount}
                      onChange={(e) => setRuleForm({ ...ruleForm, fareAmount: e.target.value })}
                      placeholder="30.00"
                      required
                    />
                  </div>

                  {/* Distance */}
                  <div>
                    <label className="form-label" style={{ fontSize: '12px', fontWeight: 800 }}>
                      Est. Distance (km)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      className="form-input"
                      value={ruleForm.distanceKm}
                      onChange={(e) => setRuleForm({ ...ruleForm, distanceKm: e.target.value })}
                    />
                  </div>
                </div>

                {/* Both Directions Checkbox */}
                <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '13px' }}>
                    <input
                      type="checkbox"
                      checked={ruleForm.isBidirectional}
                      onChange={(e) => setRuleForm({ ...ruleForm, isBidirectional: e.target.checked })}
                      style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
                    />
                    <span>Apply in Both Directions (⇄ {ruleForm.pickupStop} to {ruleForm.destinationStop} and vice versa)</span>
                  </label>
                </div>

                {/* Preview Box */}
                <div style={{
                  marginTop: '14px',
                  padding: '12px 16px',
                  background: 'var(--bg-sidebar)',
                  borderRadius: '8px',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  border: '1px solid var(--border)'
                }}>
                  <span style={{ fontSize: '18px' }}>💡</span>
                  <span>
                    <strong>Rule Preview:</strong> Any ride between <strong>{ruleForm.pickupStop}</strong> and <strong>{ruleForm.destinationStop}</strong> {ruleForm.isBidirectional ? '(in both directions)' : ''} will be charged fixed <strong>₹{parseFloat(ruleForm.fareAmount || 25).toFixed(2)}</strong>.
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '18px' }}>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowRuleModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary btn-sm" style={{ fontWeight: 800 }}>
                    <Save size={14} /> Save Fare Rule
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Live Fare Simulator */}
          <div className="panel" style={{ marginBottom: '24px', background: 'var(--bg-card)' }}>
            <div className="panel-header">
              <div>
                <h3 className="panel-title" style={{ fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={16} color="var(--primary)" /> Live Fare Resolution Simulator
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Test how student routes resolve through: <strong>Specific Route ➔ Group Rule ➔ Default Campus Fare ➔ GPS Fallback</strong>.
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '14px', alignItems: 'flex-end', marginTop: '12px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '11px', fontWeight: 700 }}>Pickup Stop / Building</label>
                <select
                  className="form-input"
                  value={testPickup}
                  onChange={(e) => { setTestPickup(e.target.value); setTestResult(null); }}
                >
                  {groupedStops.map(group => (
                    <optgroup key={`tp-${group.key || group.label}`} label={`${group.icon} ${group.label}`}>
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
                <label className="form-label" style={{ fontSize: '11px', fontWeight: 700 }}>Destination Stop / Building</label>
                <select
                  className="form-input"
                  value={testDrop}
                  onChange={(e) => { setTestDrop(e.target.value); setTestResult(null); }}
                >
                  {groupedStops.map(group => (
                    <optgroup key={`td-${group.key || group.label}`} label={`${group.icon} ${group.label}`}>
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
                onClick={handleTestFare}
                disabled={testingRoute || !testPickup || !testDrop}
                style={{ padding: '10px 22px', fontWeight: 800 }}
              >
                {testingRoute ? 'Testing...' : 'Test Fare'}
              </button>
            </div>

            {testResult && (
              <div style={{
                marginTop: '16px',
                padding: '16px 20px',
                background: testResult.ruleTier === 1
                  ? 'rgba(99, 102, 241, 0.12)'
                  : (testResult.ruleTier === 2 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)'),
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
                      {testResult.ruleSource || `Tier ${testResult.ruleTier}`}
                    </span>
                    <span style={{ fontSize: '14px', fontWeight: 800 }}>
                      {testResult.description}
                    </span>
                  </div>

                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', gap: '16px', marginTop: '4px' }}>
                    <span>Pickup Group: <strong>{testResult.pickupCategory ? `${testResult.pickupCategory.token}` : 'Campus Stop'}</strong></span>
                    <span>➔</span>
                    <span>Drop Group: <strong>{testResult.destinationCategory ? `${testResult.destinationCategory.token}` : 'Campus Stop'}</strong></span>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Passenger Fare</div>
                  <div style={{ fontSize: '26px', fontWeight: 900, color: 'var(--primary)' }}>
                    ₹{parseFloat(testResult.fare || defaultCampusFare || 25).toFixed(2)}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Fare Rules Table */}
          <div className="panel">
            <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Compass className="text-primary" size={20} /> Active Campus Pricing Rules ({filteredRules.length})
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  Specific routes override group rules. All unlisted campus routes automatically use the <strong>₹{parseFloat(defaultCampusFare || 25).toFixed(0)}</strong> default fare.
                </p>
              </div>

              {/* Filters */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', background: 'var(--bg-sidebar)', padding: '2px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <button
                    onClick={() => setRuleFilter('ALL')}
                    style={{
                      padding: '4px 10px',
                      fontSize: '12px',
                      borderRadius: '6px',
                      border: 'none',
                      background: ruleFilter === 'ALL' ? 'var(--primary)' : 'transparent',
                      color: ruleFilter === 'ALL' ? '#000' : 'var(--text-secondary)',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    All ({routeFares.length})
                  </button>
                  <button
                    onClick={() => setRuleFilter('GROUPS')}
                    style={{
                      padding: '4px 10px',
                      fontSize: '12px',
                      borderRadius: '6px',
                      border: 'none',
                      background: ruleFilter === 'GROUPS' ? 'var(--primary)' : 'transparent',
                      color: ruleFilter === 'GROUPS' ? '#000' : 'var(--text-secondary)',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Group Rules
                  </button>
                  <button
                    onClick={() => setRuleFilter('SPECIFIC')}
                    style={{
                      padding: '4px 10px',
                      fontSize: '12px',
                      borderRadius: '6px',
                      border: 'none',
                      background: ruleFilter === 'SPECIFIC' ? 'var(--primary)' : 'transparent',
                      color: ruleFilter === 'SPECIFIC' ? '#000' : 'var(--text-secondary)',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Specific Overrides
                  </button>
                </div>

                <input
                  type="text"
                  placeholder="Search rules..."
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
                    <th>Rule Priority</th>
                    <th>From (Pickup)</th>
                    <th style={{ textAlign: 'center' }}>Direction</th>
                    <th>To (Destination)</th>
                    <th>Distance</th>
                    <th>Fare Amount (₹)</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRules.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                        No specific rules matching filter. All routes use the Default Campus Fare (₹{parseFloat(defaultCampusFare || 25).toFixed(0)}).
                      </td>
                    </tr>
                  ) : (
                    filteredRules.map((r) => {
                      const isGroup = isGroupToken(r.pickup_stop) || isGroupToken(r.destination_stop);
                      const isBothWays = r.is_bidirectional !== 0 && r.is_bidirectional !== false;

                      return (
                        <tr key={r.id} style={{ background: isGroup ? 'rgba(245, 158, 11, 0.02)' : 'rgba(99, 102, 241, 0.02)' }}>
                          <td>
                            {!isGroup ? (
                              <span className="badge" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818CF8', border: '1px solid rgba(99, 102, 241, 0.3)', fontWeight: 800, fontSize: '11px' }}>
                                🌟 Specific Override
                              </span>
                            ) : (
                              <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34D399', fontWeight: 800, fontSize: '11px' }}>
                                🏷️ Group Rule
                              </span>
                            )}
                          </td>

                          <td>{formatDisplayStopName(r.pickup_stop)}</td>

                          <td style={{ textAlign: 'center', color: 'var(--primary)' }}>
                            {isBothWays ? <ArrowLeftRight size={16} title="Applies in both directions" /> : <ArrowRight size={16} title="One-way route" />}
                          </td>

                          <td>{formatDisplayStopName(r.destination_stop)}</td>

                          <td>{r.distance_km || 1.5} km</td>

                          <td>
                            <span style={{ fontWeight: 900, color: 'var(--primary)', fontSize: '15px' }}>
                              ₹{parseFloat(r.fare_amount).toFixed(2)}
                            </span>
                          </td>

                          <td>
                            <span className={`badge ${r.is_active ? 'badge-success' : 'badge-danger'}`}>
                              {r.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>

                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                              <button className="btn btn-secondary btn-sm" onClick={() => handleOpenRuleModal(r)}>
                                <Edit2 size={12} /> Edit
                              </button>
                              <button className="btn btn-danger btn-sm" onClick={() => handleDeleteRule(r.id, `${r.pickup_stop} ➔ ${r.destination_stop}`)}>
                                <Trash2 size={12} />
                              </button>
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
        </>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: LOCATION LISTS & CAMPUS STOPS */}
      {/* ========================================================================= */}
      {activeTab === 'locations' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers className="text-primary" size={20} /> Campus Location Groups & Categories
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Organize stops into groups (Boys Hostels, Girls Hostels, Silver Jubilee Campus, Science Block, Gates, Library / Reading Room).
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={() => { setEditingCategory(null); setCategoryForm({ label: '', token: '', icon: '📍', color: '#3B82F6', bg_color: 'rgba(59, 130, 246, 0.12)', display_order: categories.length + 1 }); setShowCategoryModal(true); }}>
                <Plus size={15} /> Create Group / List
              </button>
              <button className="btn btn-secondary" onClick={() => handleOpenAddStopModal(null)}>
                <MapPin size={15} /> Add Campus Location
              </button>
            </div>
          </div>

          {/* Create Category Modal */}
          {showCategoryModal && (
            <div className="panel" style={{ border: '1.5px solid var(--primary)', marginBottom: '24px', background: 'var(--bg-card)' }}>
              <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 className="panel-title" style={{ color: 'var(--primary)' }}>
                  {editingCategory ? `Edit Group: ${editingCategory.label}` : 'Create Location Group'}
                </h3>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowCategoryModal(false)}>
                  <X size={14} /> Close
                </button>
              </div>

              <form onSubmit={handleSaveCategory}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginTop: '14px' }}>
                  <div>
                    <label className="form-label" style={{ fontSize: '12px', fontWeight: 800 }}>Group Name</label>
                    <input
                      type="text"
                      className="form-input"
                      value={categoryForm.label}
                      onChange={(e) => setCategoryForm({ ...categoryForm, label: e.target.value })}
                      placeholder="e.g. Science Block or Silver Jubilee Campus"
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label" style={{ fontSize: '12px', fontWeight: 800 }}>Select Emoji</label>
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

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '18px' }}>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowCategoryModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary btn-sm" style={{ fontWeight: 800 }}>
                    <Save size={13} /> Save Group
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Add Stop Modal */}
          {showStopModal && (
            <div className="panel" style={{ border: '1.5px solid var(--primary)', marginBottom: '24px', background: 'var(--bg-card)' }}>
              <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 className="panel-title" style={{ color: 'var(--primary)' }}>Add Location / Stop</h3>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowStopModal(false)}>
                  <X size={14} /> Close
                </button>
              </div>

              <form onSubmit={handleSaveStop}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginTop: '14px' }}>
                  <div>
                    <label className="form-label" style={{ fontSize: '11px', fontWeight: 800 }}>Location / Dept / Hostel Name</label>
                    <input
                      type="text"
                      className="form-input"
                      value={stopForm.name}
                      onChange={(e) => setStopForm({ ...stopForm, name: e.target.value })}
                      placeholder="e.g. Birsa Munda Hostel or Sociology Department"
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label" style={{ fontSize: '11px', fontWeight: 800 }}>Belongs to Group</label>
                    <select
                      className="form-input"
                      value={stopForm.category}
                      onChange={(e) => setStopForm({ ...stopForm, category: e.target.value })}
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
                      value={stopForm.latitude}
                      onChange={(e) => setStopForm({ ...stopForm, latitude: e.target.value })}
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

          {/* Group Cards Grid */}
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
                        <div style={{ fontWeight: 800, fontSize: '16px', color: 'var(--text-primary)' }}>{group.label}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
                          Rule Token: <code>{group.token || `[${group.label}]`}</code>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="badge" style={{ background: bg, color: color, fontWeight: 800 }}>
                        {group.stops.length} stops
                      </span>

                      {catObj.id && (
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            setEditingCategory(catObj);
                            setCategoryForm({
                              label: catObj.label || '',
                              token: catObj.token || `[${catObj.label}]`,
                              icon: catObj.icon || '📍',
                              color: catObj.color || '#3B82F6',
                              bg_color: catObj.bg_color || 'rgba(59, 130, 246, 0.12)',
                              display_order: catObj.display_order || 0
                            });
                            setShowCategoryModal(true);
                          }}
                          title="Edit group"
                          style={{ padding: '4px 6px' }}
                        >
                          <Edit2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Stops List */}
                  <div style={{
                    background: 'var(--bg-sidebar)',
                    borderRadius: 'var(--radius-md)',
                    padding: '10px',
                    maxHeight: '240px',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}>
                    {group.stops.length === 0 ? (
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>
                        No locations inside this group yet. Click below to add.
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
                            title="Delete stop"
                            style={{ padding: '4px 6px', color: '#F87171' }}
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add Stop Button */}
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleOpenAddStopModal(group.key)}
                    style={{ width: '100%', justifyContent: 'center', fontSize: '12px', fontWeight: 700 }}
                  >
                    <Plus size={13} /> Add Stop to {group.label}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: VEHICLE FALLBACK RATES & REVENUE SPLITS */}
      {/* ========================================================================= */}
      {activeTab === 'fallback' && (
        <div>
          {/* GPS Fallback Rates */}
          <div className="panel" style={{ marginBottom: '24px' }}>
            <div className="panel-header">
              <div>
                <h2 className="panel-title">Tier 4: GPS Distance Fallback Rates</h2>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  Used only when a ride takes place outside campus or between unmapped coordinates.
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

          {/* Revenue Split Policy */}
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
                  Example: ₹25 Campus Ride ➔ Driver gets <strong>₹21</strong>, Company gets <strong>₹4</strong>.
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


