import React, { useMemo, useState } from 'react';
import { User, Phone, Mail, Lock, ShieldCheck, MapPin, Contact, CheckCircle2 } from 'lucide-react';

const CAMPUS_PICKUP_STATIONS = [
  { id: 'hostel-curie', label: 'Madam Curie PG Girls Hostel (East Gate Loop)' },
  { id: 'dept-cs', label: 'Silver Jubilee Campus - Dept. of Computer Science' },
  { id: 'hostel-cauvery', label: 'Cauvery Girls Hostel • Main Ring Road' },
  { id: 'lib-ananda', label: 'Ananda Ranga Pillai Central Library Curb' },
  { id: 'gate-main', label: 'Main Gate 1 / ECR Highway Terminal' },
  { id: 'hostel-kamban', label: 'Kamban Boys Hostel • South Campus' },
  { id: 'canteen-central', label: 'Central University Cafeteria & Student Centre' }
];

export function ProfileForm({ user, onSave }) {
  const initial = useMemo(() => ({
    name: user?.name || '',
    phone: user?.phone || '',
    pickupStation: user?.pickupStation || localStorage.getItem('papido_pref_pickup') || 'gate-main',
    emergencyContact: user?.emergency_contact || user?.emergencyContact || ''
  }), [user]);

  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);

  const isDirty =
    form.name.trim() !== initial.name.trim() ||
    form.phone.trim() !== initial.phone.trim() ||
    form.pickupStation !== initial.pickupStation ||
    form.emergencyContact.trim() !== initial.emergencyContact.trim();

  const isValid =
    form.name.trim().length >= 2 &&
    form.phone.trim().length >= 10;

  const update = (key, value) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleReset = () => {
    setForm(initial);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid || saving) return;

    setSaving(true);
    const ok = await onSave({
      name: form.name.trim(),
      phone: form.phone.trim(),
      pickupStation: form.pickupStation,
      emergencyContact: form.emergencyContact.trim()
    });
    setSaving(false);
  };

  return (
    <div className="ps-profile-form-card ps-fade-up">
      <div className="flex items-center justify-between pb-3 border-b border-outline-variant/30">
        <div className="flex items-center gap-2">
          <Contact size={20} color="#EA580C" />
          <h3 className="font-headline-md text-lg font-bold text-on-surface m-0">
            Passenger Profile Details
          </h3>
        </div>
        <span className="font-label-sm text-xs text-on-surface-variant bg-surface-container px-3 py-1 rounded-full font-semibold">
          Official ID Synced
        </span>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-3">

        {/* Full Name Field */}
        <div className="flex flex-col gap-1.5">
          <label className="font-label-md text-xs text-on-surface font-semibold flex items-center justify-between">
            <span>Full Legal Name</span>
            <span className="font-label-sm text-[11px] text-on-surface-variant font-normal">
              As per PU Enrollment
            </span>
          </label>
          <div className="relative flex items-center">
            <span className="absolute left-3.5 text-outline pointer-events-none">
              <User size={18} color="#EA580C" />
            </span>
            <input
              type="text"
              className="ps-profile-input"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder="Enter full name"
              required
            />
          </div>
        </div>

        {/* University Email Field (Readonly with Lock) */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="font-label-md text-xs text-on-surface font-semibold">
              Campus Email Address
            </label>
            <span className="inline-flex items-center gap-1 font-label-sm text-[11px] text-tertiary font-bold">
              <Lock size={12} /> Read-Only Identity
            </span>
          </div>
          <div className="relative flex items-center">
            <span className="absolute left-3.5 text-outline pointer-events-none">
              <Mail size={18} color="#EA580C" />
            </span>
            <input
              type="email"
              className="ps-profile-input ps-profile-input--readonly"
              value={user?.email || 'ananya.sharma@pondiuni.ac.in'}
              readOnly
            />
            <span className="absolute right-3.5 text-outline-variant pointer-events-none">
              <ShieldCheck size={18} color="#00855B" />
            </span>
          </div>
          <p className="font-body-sm text-[11px] text-on-surface-variant pl-2 m-0">
            Synced with PU Google Workspace LDAP. Contact the Computer Center to modify credentials.
          </p>
        </div>

        {/* Mobile Phone Number */}
        <div className="flex flex-col gap-1.5">
          <label className="font-label-md text-xs text-on-surface font-semibold flex items-center justify-between">
            <span>Mobile Phone Number</span>
            <span className="font-label-sm text-[11px] text-tertiary font-bold">
              SMS Dispatch Active
            </span>
          </label>
          <div className="relative flex items-center">
            <span className="absolute left-3.5 text-outline pointer-events-none">
              <Phone size={18} color="#EA580C" />
            </span>
            <input
              type="tel"
              className="ps-profile-input"
              value={form.phone}
              onChange={(e) => update('phone', e.target.value)}
              placeholder="+91 XXXXX XXXXX"
              required
            />
          </div>
        </div>

        {/* Default Pickup Station Selector */}
        <div className="flex flex-col gap-1.5">
          <label className="font-label-md text-xs text-on-surface font-semibold flex items-center justify-between">
            <span>Default Campus Pickup Station</span>
            <span className="font-label-sm text-[11px] text-primary font-semibold">
              Pre-selected for 1-Tap Booking
            </span>
          </label>
          <div className="relative flex items-center">
            <span className="absolute left-3.5 text-outline pointer-events-none">
              <MapPin size={18} color="#EA580C" />
            </span>
            <select
              className="ps-profile-input ps-profile-select"
              value={form.pickupStation}
              onChange={(e) => update('pickupStation', e.target.value)}
            >
              {CAMPUS_PICKUP_STATIONS.map((station) => (
                <option key={station.id} value={station.id}>
                  {station.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Hostel Warden / Guardian Emergency Tel */}
        <div className="flex flex-col gap-1.5">
          <label className="font-label-md text-xs text-on-surface font-semibold flex items-center justify-between">
            <span>Hostel Warden / Local Guardian Emergency Tel</span>
            <span className="font-label-sm text-[11px] text-on-surface-variant">
              Campus Safety Net
            </span>
          </label>
          <div className="relative flex items-center">
            <span className="absolute left-3.5 text-outline pointer-events-none">
              <Phone size={18} color="#DC2626" />
            </span>
            <input
              type="tel"
              className="ps-profile-input"
              value={form.emergencyContact}
              onChange={(e) => update('emergencyContact', e.target.value)}
              placeholder="Guardian / Warden Contact"
            />
          </div>
        </div>

        {/* Action Dock */}
        <div className="flex items-center justify-end gap-3 pt-2">
          {isDirty && (
            <button
              type="button"
              className="px-4 py-2 rounded-full font-label-md text-xs text-on-surface-variant hover:text-on-surface transition-colors bg-transparent border-0 cursor-pointer"
              onClick={handleReset}
            >
              Reset Changes
            </button>
          )}

          <button
            type="submit"
            disabled={!isValid || saving}
            className="ps-profile-save-btn"
          >
            <CheckCircle2 size={16} />
            <span>{saving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>

      </form>
    </div>
  );
}

export default ProfileForm;
