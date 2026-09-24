import React, { useState, useEffect } from 'react';
import './CoreTeamView.css';
import { apiRequest } from '../api';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  Copy,
  Check,
  UserPlus,
  Bike,
  Phone,
  Mail,
  Search,
  ExternalLink,
  Users,
  Award,
  Sparkles,
  Crown,
  Star,
  Activity,
  TrendingUp,
  UserCheck,
  QrCode,
  Link2,
  RefreshCw
} from 'lucide-react';

export function CoreTeamView() {
  const { adminToken } = useAuth();
  const [coreMembers, setCoreMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState({});

  const inviteLink = `${window.location.origin}/register/core`;

  const fetchCoreMembers = async () => {
    try {
      setLoading(true);
      const res = await apiRequest('/admin/core-members', 'GET', null, adminToken);
      const list = Array.isArray(res.data) ? res.data : (res.data?.items || []);
      setCoreMembers(list);
    } catch (err) {
      console.warn('Failed to fetch core members:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoreMembers();
  }, [adminToken]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleToggleCoreStatus = async (userId, currentStatus) => {
    try {
      setActionLoading(prev => ({ ...prev, [userId]: true }));
      await apiRequest(`/admin/users/${userId}/core-status`, 'PATCH', { isCoreMember: !currentStatus }, adminToken);
      await fetchCoreMembers();
    } catch (err) {
      alert(err.message || 'Failed to update core status.');
    } finally {
      setActionLoading(prev => ({ ...prev, [userId]: false }));
    }
  };

  const filteredMembers = coreMembers.filter(m => {
    const term = searchTerm.toLowerCase();
    return (
      (m.name || '').toLowerCase().includes(term) ||
      (m.email || '').toLowerCase().includes(term) ||
      (m.phone || '').includes(term)
    );
  });

  const onlineCount = coreMembers.filter(m => Boolean(m.is_online)).length;
  const totalTrips = coreMembers.reduce((acc, m) => acc + (parseInt(m.total_rides || 0, 10)), 0);

  return (
    <div className="ct-page">
      {/* ============================================================
          INVITE HERO CARD
          ============================================================ */}
      <div className="ct-invite-card ct-fade-up">
        <div className="ct-invite-body">
          <div className="ct-invite-left">
            <div className="ct-invite-badge">
              <Sparkles size={12} /> EXCLUSIVE CORE DRIVER INVITATION
            </div>

            <h2 className="ct-invite-title">
              Papido Core Team Driver Invitation Link
            </h2>
            <p className="ct-invite-desc">
              Share this dedicated link with Papido Core Organizers. They can register with{' '}
              <strong>zero vehicle friction</strong> (only Name, Email, Phone &amp; Password) and are{' '}
              <strong>pre-approved as drivers</strong> with fleet privileges.
            </p>
          </div>

          <div className="ct-invite-actions">
            <button
              type="button"
              className={`ct-copy-btn ${copied ? 'is-copied' : ''}`}
              onClick={handleCopyLink}
            >
              {copied ? <Check size={16} color="#000" /> : <Copy size={16} color="#000" />}
              <span>{copied ? 'Invite Link Copied!' : 'Copy Core Invite Link'}</span>
            </button>

            <a
              href={inviteLink}
              target="_blank"
              rel="noopener noreferrer"
              className="ct-preview-btn"
            >
              <span>Preview Form</span>
              <ExternalLink size={14} />
            </a>
          </div>
        </div>

        <div className="ct-invite-link-row">
          <div className="ct-invite-link-left">
            <Link2 size={14} className="ct-invite-link-icon" />
            <span className="ct-invite-link-text">{inviteLink}</span>
          </div>
          <span className="ct-invite-link-hint">
            Instant Driver KYC Pre-Approval
          </span>
        </div>
      </div>

      {/* ============================================================
          METRIC ROW
          ============================================================ */}
      <div className="ct-metric-row">
        <div className="ct-metric-card ct-fade-up" style={{ animationDelay: '60ms' }}>
          <div className="ct-metric-icon ct-metric-icon--amber">
            <Crown size={18} />
          </div>
          <div className="ct-metric-body">
            <div className="ct-metric-label">REGISTERED CORE DRIVERS</div>
            <div className="ct-metric-value ct-metric-value--amber">
              {coreMembers.length}
            </div>
          </div>
        </div>

        <div className="ct-metric-card ct-fade-up" style={{ animationDelay: '120ms' }}>
          <div className="ct-metric-icon ct-metric-icon--emerald">
            <Activity size={18} />
          </div>
          <div className="ct-metric-body">
            <div className="ct-metric-label">ACTIVE ON RADAR NOW</div>
            <div className="ct-metric-value ct-metric-value--emerald">
              {onlineCount}
            </div>
          </div>
        </div>

        <div className="ct-metric-card ct-fade-up" style={{ animationDelay: '180ms' }}>
          <div className="ct-metric-icon ct-metric-icon--cyan">
            <TrendingUp size={18} />
          </div>
          <div className="ct-metric-body">
            <div className="ct-metric-label">TOTAL CORE TRIPS</div>
            <div className="ct-metric-value ct-metric-value--cyan">
              {totalTrips}
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================
          DIRECTORY PANEL
          ============================================================ */}
      <div className="ct-directory-panel ct-fade-up" style={{ animationDelay: '200ms' }}>
        <div className="ct-directory-head">
          <div className="ct-directory-title-row">
            <Award size={18} color="#F59E0B" />
            <h3 className="ct-directory-title">
              Papido Core Team Directory ({filteredMembers.length})
            </h3>
          </div>

          <div className="ct-directory-actions">
            <div className="ct-search-wrap">
              <Search size={14} className="ct-search-icon" />
              <input
                type="text"
                placeholder="Search core members..."
                className="ct-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <button
              type="button"
              className="ct-icon-btn"
              onClick={fetchCoreMembers}
              title="Refresh directory"
            >
              <RefreshCw size={14} className={loading ? 'ct-spin' : ''} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="ct-skeletons">
            {[1, 2, 3].map((n) => (
              <div key={`ct-skel-${n}`} className="ct-skeleton-row">
                <div className="ct-skeleton-line ct-skeleton-line--short" />
                <div className="ct-skeleton-line" />
              </div>
            ))}
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="ct-empty">
            <UserPlus size={32} />
            <div className="ct-empty-title">No core members found</div>
            <div className="ct-empty-sub">
              Share the invite link above to onboard your first core driver.
            </div>
          </div>
        ) : (
          <div className="ct-table-wrap">
            <table className="ct-table">
              <thead>
                <tr>
                  <th>Core Member</th>
                  <th>Contact Info</th>
                  <th>Shift Vehicle</th>
                  <th>Total Rides</th>
                  <th>Driver Status</th>
                  <th>Joined Date</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map((member, idx) => (
                  <tr
                    key={member.id}
                    className="ct-fade-up"
                    style={{ animationDelay: `${idx * 30}ms` }}
                  >
                    <td>
                      <div className="ct-member-cell">
                        <div className="ct-member-avatar">
                          {(member.name || 'C').charAt(0).toUpperCase()}
                        </div>
                        <div className="ct-member-info">
                          <div className="ct-member-name-row">
                            <span className="ct-member-name">{member.name}</span>
                            <span className="ct-core-chip">
                              <Star size={9} color="#D97706" /> CORE
                            </span>
                          </div>
                          <div className="ct-member-id">
                            ID #{member.id} · {member.gender || 'OTHER'}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div className="ct-contact-email">
                        <Mail size={11} /> {member.email}
                      </div>
                      <div className="ct-contact-phone">
                        <Phone size={11} /> {member.phone}
                      </div>
                    </td>

                    <td>
                      <div className="ct-vehicle-cell">
                        <Bike size={14} color="#F59E0B" />
                        <span className="ct-vehicle-model">
                          {member.vehicle_model || 'Campus Fleet'}
                        </span>
                      </div>
                      <div className="ct-vehicle-plate">
                        {member.vehicle_number || 'PU-CORE-01'}
                      </div>
                    </td>

                    <td>
                      <strong className="ct-trips-value">
                        {member.total_rides || 0}
                      </strong>
                      <span className="ct-trips-label"> trips</span>
                    </td>

                    <td>
                      <span className={`ct-status-pill ${member.is_online ? 'ct-status-pill--online' : 'ct-status-pill--offline'}`}>
                        <span className="ct-status-dot" />
                        {member.is_online ? 'Online' : 'Offline'}
                      </span>
                    </td>

                    <td>
                      <span className="ct-joined-date">
                        {new Date(member.created_at).toLocaleDateString()}
                      </span>
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className={`ct-toggle-btn ${member.is_core_member ? 'is-core' : 'is-regular'}`}
                        onClick={() => handleToggleCoreStatus(member.id, member.is_core_member)}
                        disabled={actionLoading[member.id]}
                      >
                        {actionLoading[member.id] ? (
                          <RefreshCw size={12} className="ct-spin" />
                        ) : member.is_core_member ? (
                          <Crown size={12} />
                        ) : (
                          <UserCheck size={12} />
                        )}
                        <span>
                          {member.is_core_member ? 'Demote to Regular' : 'Promote to Core'}
                        </span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
export default CoreTeamView;
