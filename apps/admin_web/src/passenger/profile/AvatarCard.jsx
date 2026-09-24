import React from 'react';
import { PSCard } from '../shared/PassengerUI';
import { Mail, Shield, GraduationCap } from 'lucide-react';

export function AvatarCard({ user }) {
  const name = user?.name || 'Passenger';
  const email = user?.email || '';
  const gender = (user?.gender || '').toUpperCase();

  /* Build initials — max 2 chars */
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  /* Accent color per gender (visual variety) */
  const accent =
    gender === 'FEMALE' ? 'pink' :
    gender === 'MALE'   ? 'amber' :
    'neutral';

  return (
    <PSCard className="ps-avatar-card ps-fade-up">
      <div className={`ps-avatar-circle ps-avatar-circle--${accent}`}>
        <span className="ps-avatar-initials">{initials || 'P'}</span>
      </div>

      <div className="ps-avatar-info">
        <div className="ps-avatar-name">{name}</div>

        {email && (
          <div className="ps-avatar-row">
            <Mail size={12} />
            <span>{email}</span>
          </div>
        )}

        <div className="ps-avatar-chips">
          <span className="ps-avatar-chip ps-avatar-chip--green">
            <Shield size={10} />
            Verified
          </span>

          {gender && gender !== 'OTHER' && (
            <span className="ps-avatar-chip ps-avatar-chip--neutral">
              {gender === 'FEMALE' ? 'Female' : 'Male'}
            </span>
          )}

          <span className="ps-avatar-chip ps-avatar-chip--blue">
            <GraduationCap size={10} />
            Pondicherry University
          </span>
        </div>
      </div>
    </PSCard>
  );
}

export default AvatarCard;
