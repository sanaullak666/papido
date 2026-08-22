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
  Sparkles
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
      <div style={{
        background: 'linear-gradient(135deg, #2A1D13 0%, #1F150D 100%)',
        border: '1px solid #433323',
        borderRadius: '16px',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
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
              Share this dedicated link with Papido Core Organizers. They can register with <strong>zero vehicle friction</strong> (only Name, Email, Phone & Password) and are <strong>pre-approved as drivers</strong> with fleet privileges.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={handleCopyLink}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 20px',
                background: copied ? '#10B981' : 'linear-gradient(135deg, #F59E0B, #EA580C)',
                color: '#000',
                border: 'none',
                borderRadius: '10px',
                fontWeight: 900,
                fontSize: '14px',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(245, 158, 11, 0.3)',
                transition: 'all 0.2s ease'
              }}
            >
              {copied ? <Check size={16} color="#000" /> : <Copy size={16} color="#000" />}
              <span>{copied ? 'Invite Link Copied!' : 'Copy Core Invite Link'}</span>
            </button>

            <a
              href={inviteLink}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '12px 16px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#FFFFFF',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 700,
                textDecoration: 'none'
              }}
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
          fontFamily: 'monospace'
        }}>
          <span>{inviteLink}</span>
          <span style={{ fontSize: '11px', color: '#A8998A', fontFamily: 'sans-serif' }}>
            Instant Driver KYC Pre-Approval
          </span>
        </div>
      </div>

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '18px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>REGISTERED CORE DRIVERS</div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: '#F59E0B' }}>{coreMembers.length}</div>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '18px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>ACTIVE ON RADAR NOW</div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: '#10B981' }}>
            {coreMembers.filter(m => Boolean(m.is_online)).length}
          </div>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '18px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>TOTAL CORE TRIPS COMPLETED</div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: '#3B82F6' }}>
            {coreMembers.reduce((acc, m) => acc + (parseInt(m.total_rides || 0, 10)), 0)}
          </div>
        </div>
      </div>

      {/* Core Members List Table */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden' }}>
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ fontWeight: 800, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Award size={18} color="#F59E0B" />
            <span>Papido Core Team Directory ({filteredMembers.length})</span>
          </div>

          <div style={{ position: 'relative', width: '280px' }}>
            <Search size={15} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search core members..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 10px 8px 32px',
                background: 'var(--bg-sidebar)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                fontSize: '13px',
                color: 'var(--text-main)',
                outline: 'none'
              }}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '50px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading Core Team directory...
          </div>
        ) : filteredMembers.length === 0 ? (
          <div style={{ padding: '50px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No core members found. Share the invite link above to onboard your first core driver!
          </div>
        ) : (
          <div className="table-container" style={{ border: 'none' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'var(--bg-sidebar)', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '12px 16px' }}>Core Member</th>
                  <th style={{ padding: '12px 16px' }}>Contact Info</th>
                  <th style={{ padding: '12px 16px' }}>Shift Vehicle</th>
                  <th style={{ padding: '12px 16px' }}>Total Rides</th>
                  <th style={{ padding: '12px 16px' }}>Driver Status</th>
                  <th style={{ padding: '12px 16px' }}>Joined Date</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map((member) => (
                  <tr key={member.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '12px 16px' }}>
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
                          <div style={{ fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {member.name}
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
                            ID #{member.id} • {member.gender || 'OTHER'}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: '12px 16px' }}>
                      <div>{member.email}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {member.phone}
                      </div>
                    </td>

                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 700 }}>{member.vehicle_model || 'Campus Fleet'}</div>
                      <div style={{ fontSize: '11px', color: '#10B981', fontWeight: 600 }}>
                        {member.vehicle_number || 'PU-CORE-01'}
                      </div>
                    </td>

                    <td style={{ padding: '12px 16px', fontWeight: 800 }}>
                      {member.total_rides || 0} trips
                    </td>

                    <td style={{ padding: '12px 16px' }}>
                      <span className={`badge ${member.is_online ? 'badge-success' : 'badge-neutral'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: member.is_online ? '#10B981' : '#9CA3AF' }}></span>
                        <span>{member.is_online ? 'Online' : 'Offline'}</span>
                      </span>
                    </td>

                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '12px' }}>
                      {new Date(member.created_at).toLocaleDateString()}
                    </td>

                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <button
                        onClick={() => handleToggleCoreStatus(member.id, member.is_core_member)}
                        disabled={actionLoading[member.id]}
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '11px', padding: '4px 8px' }}
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
