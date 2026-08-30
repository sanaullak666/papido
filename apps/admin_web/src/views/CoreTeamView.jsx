import React, { useState, useEffect } from 'react';
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Invite Card */}
      <div className="panel" style={{
        background: 'linear-gradient(135deg, #2A1D13 0%, #1F150D 100%)',
        border: '1px solid #433323',
        boxShadow: '0 8px 30px rgba(0,0,0,0.3)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid #F59E0B',
              color: '#FBBF24',
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '11px',
              fontWeight: 800,
              marginBottom: '10px'
            }}>
              <Sparkles size={12} /> EXCLUSIVE CORE DRIVER INVITATION
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#FFFFFF', margin: 0 }}>
              Papido Core Team Driver Invitation Link
            </h2>
            <p style={{ fontSize: '13px', color: '#A8998A', margin: '6px 0 0', maxWidth: '600px', lineHeight: 1.5 }}>
              Share this dedicated link with Papido Core Organizers. They can register with <strong>zero vehicle friction</strong> (only Name, Email, Phone &amp; Password) and are <strong>pre-approved as drivers</strong> with fleet privileges.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleCopyLink}
              className="btn btn-primary"
              style={{
                background: copied ? '#10B981' : undefined,
                color: copied ? '#FFF' : '#000',
                fontWeight: 800,
                minHeight: '42px'
              }}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              <span>{copied ? 'Invite Link Copied!' : 'Copy Core Invite Link'}</span>
            </button>

            <a
              href={inviteLink}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
              style={{ minHeight: '42px', fontWeight: 700 }}
            >
              <span>Preview Form</span>
              <ExternalLink size={14} />
            </a>
          </div>
        </div>

        {/* Link Input Bar */}
        <div style={{
          background: '#150E09',
          border: '1px solid #38281B',
          borderRadius: '10px',
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '13px',
          color: '#FBBF24',
          fontFamily: 'monospace',
          marginTop: '16px',
          flexWrap: 'wrap',
          gap: '8px'
        }}>
          <span style={{ wordBreak: 'break-all' }}>{inviteLink}</span>
          <span style={{ fontSize: '11px', color: '#A8998A', fontFamily: 'sans-serif' }}>
            Instant Driver KYC Pre-Approval
          </span>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="card-grid">
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-label">Registered Core Drivers</span>
            <div className="stat-card-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B' }}>
              <ShieldCheck size={22} />
            </div>
          </div>
          <div className="stat-value" style={{ color: '#F59E0B' }}>{coreMembers.length}</div>
          <div className="stat-desc">Privileged organizers in system</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-label">Active on Radar Now</span>
            <div className="stat-card-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10B981' }}>
              <Bike size={22} />
            </div>
          </div>
          <div className="stat-value" style={{ color: '#10B981' }}>
            {coreMembers.filter(m => Boolean(m.is_online)).length}
          </div>
          <div className="stat-desc">Currently online &amp; ready</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-label">Core Trips Completed</span>
            <div className="stat-card-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3B82F6' }}>
              <Award size={22} />
            </div>
          </div>
          <div className="stat-value" style={{ color: '#3B82F6' }}>
            {coreMembers.reduce((acc, m) => acc + (parseInt(m.total_rides || 0, 10)), 0)}
          </div>
          <div className="stat-desc">Total shift bookings served</div>
        </div>
      </div>

      {/* Core Members List Table */}
      <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="panel-header" style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border)',
          margin: 0
        }}>
          <div style={{ fontWeight: 800, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Award size={18} color="#F59E0B" />
            <span>Papido Core Team Directory ({filteredMembers.length})</span>
          </div>

          <div style={{ position: 'relative', width: '280px', maxWidth: '100%' }}>
            <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search core members..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '32px', height: '38px', fontSize: '13px' }}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '50px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <RefreshCw size={22} className="animate-spin" style={{ margin: '0 auto 10px' }} />
            <div>Loading Core Team directory...</div>
          </div>
        ) : filteredMembers.length === 0 ? (
          <div style={{ padding: '50px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No core members found. Share the invite link above to onboard your first core driver!
          </div>
        ) : (
          <div className="table-container" style={{ border: 'none' }}>
            <table className="data-table">
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
                {filteredMembers.map((member) => (
                  <tr key={member.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #F59E0B, #EA580C)',
                          color: '#000',
                          fontWeight: 900,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '14px',
                          flexShrink: 0
                        }}>
                          {(member.name || 'C').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>{member.name}</span>
                            <span style={{
                              background: '#FEF3C7',
                              color: '#92400E',
                              fontSize: '10px',
                              fontWeight: 800,
                              padding: '1px 6px',
                              borderRadius: '6px'
                            }}>
                              ⭐ CORE
                            </span>
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            ID #{member.id} &bull; {member.gender || 'OTHER'}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div>{member.email}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {member.phone}
                      </div>
                    </td>

                    <td>
                      <div style={{ fontWeight: 700 }}>{member.vehicle_model || 'Campus Fleet'}</div>
                      <div style={{ fontSize: '11px', color: '#10B981', fontWeight: 600 }}>
                        {member.vehicle_number || 'PU-CORE-01'}
                      </div>
                    </td>

                    <td style={{ fontWeight: 800 }}>
                      {member.total_rides || 0} trips
                    </td>

                    <td>
                      <span className={`badge ${member.is_online ? 'badge-success' : 'badge-neutral'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: member.is_online ? '#10B981' : '#9CA3AF' }}></span>
                        <span>{member.is_online ? 'Online' : 'Offline'}</span>
                      </span>
                    </td>

                    <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                      {new Date(member.created_at).toLocaleDateString()}
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => handleToggleCoreStatus(member.id, member.is_core_member)}
                        disabled={actionLoading[member.id]}
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '11px' }}
                      >
                        {member.is_core_member ? 'Demote to Regular' : 'Promote to Core'}
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
