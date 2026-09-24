import React, { useMemo, useState } from 'react';
import { PSCard, PSButton } from '../shared/PassengerUI';
import { User, Phone, Mail, Lock, ShieldCheck } from 'lucide-react';

export function ProfileForm({ user, onSave }) {
  const initial = useMemo(() => ({
    name:  user?.name || '',
    phone: user?.phone || ''
  }), [user]);

  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);

  /* Dirty detection */
  const isDirty =
    form.name.trim() !== initial.name.trim() ||
    form.phone.trim() !== initial.phone.trim();

  const isValid =
    form.name.trim().length >= 2 &&
    form.phone.trim().length >= 10;

  const update = (key, value) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isDirty || !isValid || saving) return;

    setSaving(true);
    const ok = await onSave({
      name:  form.name.trim(),
      phone: form.phone.trim()
    });
    setSaving(false);

    if (ok) {
      /* Reset baseline */
      setForm({
        name:  form.name.trim(),
        phone: form.phone.trim()
      });
    }
  };

  return (
    <PSCard className="ps-profile-card ps-fade-up">
      <div className="ps-profile-card-head">
        <h3 className="ps-profile-card-title">Personal Details</h3>
        <p className="ps-profile-card-sub">
          Used for rider identification and contact
        </p>
      </div>

      <form onSubmit={handleSubmit} className="ps-profile-form">

        {/* NAME */}
        <div className="ps-field">
          <label className="ps-field-label">
            <span className="ps-field-label-left">
              <User size={14} color="#EA580C" strokeWidth={2.2} />
              <span>Full Name</span>
            </span>
          </label>
          <input
            type="text"
            className="ps-input"
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder="Your full name"
            required
          />
        </div>

        {/* EMAIL (readonly) */}
        <div className="ps-field">
          <label className="ps-field-label">
            <span className="ps-field-label-left">
              <Mail size={14} color="#EA580C" strokeWidth={2.2} />
              <span>Email</span>
            </span>
            <span className="ps-field-lock">
              <Lock size={9} strokeWidth={2.5} /> Locked
            </span>
          </label>
          <input
            type="email"
            className="ps-input ps-input--readonly"
            value={user?.email || ''}
            readOnly
          />
        </div>

        {/* PHONE */}
        <div className="ps-field">
          <label className="ps-field-label">
            <span className="ps-field-label-left">
              <Phone size={14} color="#EA580C" strokeWidth={2.2} />
              <span>Phone Number</span>
            </span>
          </label>
          <input
            type="tel"
            className="ps-input"
            value={form.phone}
            onChange={(e) => update('phone', e.target.value)}
            placeholder="10-digit mobile number"
            required
          />
        </div>

        {/* GENDER (readonly — set at registration) */}
        <div className="ps-field">
          <label className="ps-field-label">
            <span className="ps-field-label-left">
              <ShieldCheck size={14} color="#EA580C" strokeWidth={2.2} />
              <span>Gender</span>
            </span>
            <span className="ps-field-lock">
              <Lock size={9} strokeWidth={2.5} /> Locked
            </span>
          </label>
          <input
            type="text"
            className="ps-input ps-input--readonly"
            value={
              (user?.gender || '').toUpperCase() === 'FEMALE' ? 'Female' :
              (user?.gender || '').toUpperCase() === 'MALE'   ? 'Male' :
              (user?.gender || '').toUpperCase() === 'OTHER'  ? 'Other' :
              'Not Specified'
            }
            readOnly
          />
        </div>

        {/* SAVE */}
        <PSButton
          type="submit"
          variant="primary"
          size="lg"
          block
          disabled={!isDirty || !isValid || saving}
        >
          {saving
            ? 'Saving...'
            : isDirty
              ? 'Save Changes'
              : 'No changes to save'}
        </PSButton>

      </form>
    </PSCard>
  );
}

export default ProfileForm;
