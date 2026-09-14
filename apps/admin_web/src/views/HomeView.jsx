import React, { useState } from 'react';
import {
  Bike,
  User,
  ShieldCheck,
  Zap,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Clock,
  MapPin,
  Sparkles,
  Navigation,
  Phone,
  Mail,
  Heart,
  Award,
  ChevronRight,
  ChevronLeft,
  Menu,
  X,
  Compass,
  DollarSign,
  Users
} from 'lucide-react';

export function HomeView({ onGoToLogin, onGoToRegister, onGoToAdmin, user }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [activeInfoSlide, setActiveInfoSlide] = useState(0);

  const scrollToSection = (id) => {
    setMobileNavOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const infoBarItems = [
    {
      icon: <MapPin size={24} color="#F97316" />,
      title: 'Pay Us a Visit',
      subtitle: 'Pondicherry University, Kalapet, Puducherry 605014'
    },
    {
      icon: <Phone size={24} color="#F97316" />,
      title: 'Give Us a Call',
      subtitle: '+91 94430 00000 / 24x7 Student Helpline'
    },
    {
      icon: <Mail size={24} color="#F97316" />,
      title: 'Send Us a Message',
      subtitle: 'support@papido.com • Instant Campus Support'
    }
  ];

  const handleNextInfo = () => {
    setActiveInfoSlide((prev) => (prev + 1) % infoBarItems.length);
  };

  const handlePrevInfo = () => {
    setActiveInfoSlide((prev) => (prev - 1 + infoBarItems.length) % infoBarItems.length);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#1A140E',
        backgroundImage: `
          radial-gradient(1000px 600px at 15% 10%, rgba(249, 115, 22, 0.12) 0%, transparent 60%),
          radial-gradient(1000px 600px at 85% 30%, rgba(234, 88, 12, 0.10) 0%, transparent 60%),
          radial-gradient(800px 500px at 50% 80%, rgba(249, 115, 22, 0.08) 0%, transparent 60%),
          #18120C
        `,
        color: '#FAF5EE',
        fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        overflowX: 'hidden'
      }}
    >
      {/* ============================================================ */}
      {/* 1. TOP NAVBAR (HYDRA STYLE)                                  */}
      {/* ============================================================ */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          background: 'rgba(26, 20, 14, 0.85)',
          borderBottom: '1px solid rgba(249, 115, 22, 0.15)',
          transition: 'all 0.2s ease'
        }}
      >
        <div
          style={{
            maxWidth: '1280px',
            margin: '0 auto',
            padding: '16px 28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          {/* Brand Logo & Stylized Name */}
          <div
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            style={{ display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer' }}
          >
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #2A1D13, #1F150D)',
                border: '1.5px solid rgba(249, 115, 22, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 6px 20px rgba(249, 115, 22, 0.25)',
                overflow: 'hidden'
              }}
            >
              <img
                src="/papidologo.jpeg"
                alt="Papido Logo"
                style={{
                  width: '38px',
                  height: '38px',
                  objectFit: 'contain',
                  borderRadius: '10px'
                }}
              />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    fontSize: '24px',
                    fontWeight: 900,
                    letterSpacing: '2px',
                    color: '#FAF5EE',
                    textTransform: 'uppercase'
                  }}
                >
                  PAPIDO
                </span>
                <span
                  style={{
                    background: 'rgba(249, 115, 22, 0.15)',
                    color: '#FB923C',
                    border: '1px solid rgba(249, 115, 22, 0.35)',
                    fontSize: '10px',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    letterSpacing: '1px'
                  }}
                >
                  PU
                </span>
              </div>
              <span
                style={{
                  fontSize: '10.5px',
                  color: '#A39485',
                  fontWeight: 600,
                  letterSpacing: '1px',
                  display: 'block',
                  textTransform: 'uppercase'
                }}
              >
                Pondicherry University Mobility
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links (Hydra Uppercase Style) */}
          <nav
            style={{
              display: 'none',
              alignItems: 'center',
              gap: '32px'
            }}
            className="hydra-desktop-nav"
          >
            <button
              onClick={() => scrollToSection('about')}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '13px',
                fontWeight: 700,
                color: '#D6C8BB',
                cursor: 'pointer',
                letterSpacing: '1.8px',
                textTransform: 'uppercase',
                transition: 'color 0.15s ease'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#F97316')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#D6C8BB')}
            >
              ABOUT
            </button>
            <button
              onClick={() => scrollToSection('services')}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '13px',
                fontWeight: 700,
                color: '#D6C8BB',
                cursor: 'pointer',
                letterSpacing: '1.8px',
                textTransform: 'uppercase',
                transition: 'color 0.15s ease'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#F97316')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#D6C8BB')}
            >
              SERVICES
            </button>
            <button
              onClick={() => scrollToSection('fares')}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '13px',
                fontWeight: 700,
                color: '#D6C8BB',
                cursor: 'pointer',
                letterSpacing: '1.8px',
                textTransform: 'uppercase',
                transition: 'color 0.15s ease'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#F97316')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#D6C8BB')}
            >
              CAMPUS FARES
            </button>
            <button
              onClick={() => scrollToSection('how-it-works')}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '13px',
                fontWeight: 700,
                color: '#D6C8BB',
                cursor: 'pointer',
                letterSpacing: '1.8px',
                textTransform: 'uppercase',
                transition: 'color 0.15s ease'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#F97316')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#D6C8BB')}
            >
              HOW TO
            </button>
          </nav>

          {/* Action CTAs (Hydra Outlined + Filled Pill Pair) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {user ? (
              <button
                type="button"
                onClick={onGoToLogin}
                style={{
                  height: '44px',
                  padding: '0 22px',
                  borderRadius: '9999px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #F97316, #EA580C)',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  letterSpacing: '0.8px',
                  textTransform: 'uppercase',
                  boxShadow: '0 6px 20px rgba(249, 115, 22, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <span>PORTAL ({user.role})</span>
                <ArrowRight size={15} />
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onGoToAdmin || onGoToLogin}
                  style={{
                    height: '44px',
                    padding: '0 22px',
                    borderRadius: '9999px',
                    border: '2px solid rgba(249, 115, 22, 0.5)',
                    background: 'transparent',
                    color: '#FAF5EE',
                    fontSize: '12.5px',
                    fontWeight: 800,
                    letterSpacing: '1.5px',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#F97316';
                    e.currentTarget.style.background = 'rgba(249, 115, 22, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(249, 115, 22, 0.5)';
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  CONTACT US
                </button>

                <button
                  type="button"
                  onClick={() => onGoToRegister ? onGoToRegister() : onGoToLogin()}
                  style={{
                    height: '44px',
                    padding: '0 24px',
                    borderRadius: '9999px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #F97316, #EA580C)',
                    color: '#FFFFFF',
                    fontSize: '12.5px',
                    fontWeight: 800,
                    letterSpacing: '1.5px',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    boxShadow: '0 6px 20px rgba(249, 115, 22, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'transform 0.15s ease'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
                >
                  <span>JOIN PAPIDO</span>
                </button>
              </>
            )}

            {/* Mobile Nav Toggle Button */}
            <button
              type="button"
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              style={{
                display: 'none',
                background: '#2A1F16',
                border: '1px solid rgba(249, 115, 22, 0.3)',
                borderRadius: '10px',
                padding: '8px',
                cursor: 'pointer',
                color: '#FAF5EE'
              }}
              className="hydra-mobile-nav-toggle"
            >
              {mobileNavOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile Nav Dropdown */}
        {mobileNavOpen && (
          <div
            style={{
              padding: '20px 28px 24px',
              background: '#201811',
              borderTop: '1px solid rgba(249, 115, 22, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
          >
            <button
              onClick={() => scrollToSection('about')}
              style={{
                background: 'none',
                border: 'none',
                textAlign: 'left',
                fontSize: '14px',
                fontWeight: 700,
                color: '#FAF5EE',
                letterSpacing: '1px',
                textTransform: 'uppercase'
              }}
            >
              ABOUT
            </button>
            <button
              onClick={() => scrollToSection('services')}
              style={{
                background: 'none',
                border: 'none',
                textAlign: 'left',
                fontSize: '14px',
                fontWeight: 700,
                color: '#FAF5EE',
                letterSpacing: '1px',
                textTransform: 'uppercase'
              }}
            >
              SERVICES
            </button>
            <button
              onClick={() => scrollToSection('fares')}
              style={{
                background: 'none',
                border: 'none',
                textAlign: 'left',
                fontSize: '14px',
                fontWeight: 700,
                color: '#FAF5EE',
                letterSpacing: '1px',
                textTransform: 'uppercase'
              }}
            >
              CAMPUS FARES
            </button>
            <button
              onClick={() => scrollToSection('how-it-works')}
              style={{
                background: 'none',
                border: 'none',
                textAlign: 'left',
                fontSize: '14px',
                fontWeight: 700,
                color: '#FAF5EE',
                letterSpacing: '1px',
                textTransform: 'uppercase'
              }}
            >
              HOW TO
            </button>
            <div style={{ paddingTop: '12px', borderTop: '1px solid rgba(249, 115, 22, 0.15)', display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={onGoToLogin}
                style={{
                  flex: 1,
                  height: '44px',
                  borderRadius: '9999px',
                  border: '1.5px solid rgba(249, 115, 22, 0.5)',
                  background: 'transparent',
                  color: '#FAF5EE',
                  fontWeight: 800,
                  fontSize: '12.5px',
                  letterSpacing: '1px'
                }}
              >
                SIGN IN
              </button>
              <button
                type="button"
                onClick={() => onGoToRegister ? onGoToRegister() : onGoToLogin()}
                style={{
                  flex: 1,
                  height: '44px',
                  borderRadius: '9999px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #F97316, #EA580C)',
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: '12.5px',
                  letterSpacing: '1px'
                }}
              >
                JOIN PAPIDO
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ============================================================ */}
      {/* 2. HERO SECTION (HYDRA 2-COLUMN WITH ASYMMETRIC PEBBLE HERO)  */}
      {/* ============================================================ */}
      <section
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '64px 28px 48px',
          position: 'relative'
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '56px',
            alignItems: 'center'
          }}
        >
          {/* Left Column: Typography + CTA + Companion Arrow */}
          <div style={{ zIndex: 2 }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(249, 115, 22, 0.12)',
                border: '1px solid rgba(249, 115, 22, 0.35)',
                padding: '6px 16px',
                borderRadius: '9999px',
                marginBottom: '20px'
              }}
            >
              <Sparkles size={14} color="#FB923C" />
              <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#FB923C', letterSpacing: '1.2px', textTransform: 'uppercase' }}>
                Pondicherry University Campus Mobility
              </span>
            </div>

            <h1
              style={{
                fontSize: 'clamp(38px, 5.2vw, 62px)',
                fontWeight: 900,
                lineHeight: 1.14,
                letterSpacing: '-0.03em',
                color: '#FAF5EE',
                margin: '0 0 20px 0'
              }}
            >
              <span style={{ display: 'block', color: '#FAF5EE' }}>
                Dive Into The Speed
              </span>
              <span
                style={{
                  background: 'linear-gradient(135deg, #F97316 0%, #EA580C 50%, #FED7AA 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  display: 'block'
                }}
              >
                Of Campus Mobility
              </span>
            </h1>

            <p
              style={{
                fontSize: '15.5px',
                lineHeight: 1.7,
                color: '#C7B7A7',
                maxWidth: '520px',
                margin: '0 0 36px 0',
                fontWeight: 500
              }}
            >
              Affordable, reliable peer-to-peer two-wheeler mobility across all hostels, academic complexes, library, and gates at Pondicherry University. Flat <strong style={{ color: '#F97316' }}>₹20 campus rides</strong> with verified student peers.
            </p>

            {/* Hydra CTA Action Row: Pill Button + Companion Arrow Circle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={onGoToLogin}
                style={{
                  height: '54px',
                  padding: '0 36px',
                  borderRadius: '9999px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #F97316, #EA580C)',
                  color: '#FFFFFF',
                  fontSize: '13.5px',
                  fontWeight: 900,
                  letterSpacing: '1.5px',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  boxShadow: '0 8px 28px rgba(249, 115, 22, 0.45)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10px',
                  transition: 'transform 0.15s ease'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
              >
                <span>BUILD YOUR RIDE</span>
              </button>

              {/* Standalone Arrow Circle (Hydra Signature Element) */}
              <button
                type="button"
                onClick={() => scrollToSection('services')}
                style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '50%',
                  border: '2px solid rgba(249, 115, 22, 0.4)',
                  background: 'rgba(249, 115, 22, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#FAF5EE',
                  transition: 'all 0.15s ease'
                }}
                title="Explore Services"
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#F97316';
                  e.currentTarget.style.background = 'rgba(249, 115, 22, 0.2)';
                  e.currentTarget.style.transform = 'translateX(4px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(249, 115, 22, 0.4)';
                  e.currentTarget.style.background = 'rgba(249, 115, 22, 0.08)';
                  e.currentTarget.style.transform = 'translateX(0)';
                }}
              >
                <ArrowRight size={20} color="#F97316" />
              </button>

              <button
                type="button"
                onClick={() => onGoToRegister ? onGoToRegister('RIDER') : onGoToLogin()}
                style={{
                  height: '54px',
                  padding: '0 26px',
                  borderRadius: '9999px',
                  border: '2px solid rgba(249, 115, 22, 0.4)',
                  background: 'transparent',
                  color: '#FAF5EE',
                  fontSize: '13px',
                  fontWeight: 800,
                  letterSpacing: '1.2px',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#F97316';
                  e.currentTarget.style.background = 'rgba(249, 115, 22, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(249, 115, 22, 0.4)';
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <Bike size={17} color="#F97316" />
                <span>EARN AS RIDER</span>
              </button>
            </div>
          </div>

          {/* Right Column: Hydra Organic Asymmetric Rounded Hero Card */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              position: 'relative'
            }}
          >
            {/* Background Concentric Glowing Wireframe Arcs (Hydra Motif) */}
            <div
              style={{
                position: 'absolute',
                width: '460px',
                height: '460px',
                borderRadius: '50%',
                border: '1.5px solid rgba(249, 115, 22, 0.2)',
                pointerEvents: 'none',
                transform: 'scale(1.15)'
              }}
            />
            <div
              style={{
                position: 'absolute',
                width: '520px',
                height: '520px',
                borderRadius: '50%',
                border: '1px dashed rgba(249, 115, 22, 0.12)',
                pointerEvents: 'none'
              }}
            />

            {/* Signature Hydra Asymmetric Pebble Container */}
            <div
              style={{
                width: '100%',
                maxWidth: '430px',
                height: '430px',
                borderRadius: '100px 100px 100px 240px',
                background: 'linear-gradient(145deg, #2D1E13 0%, #1A120B 100%)',
                border: '2px solid rgba(249, 115, 22, 0.35)',
                boxShadow: '0 28px 60px rgba(0, 0, 0, 0.6), 0 0 45px rgba(249, 115, 22, 0.2)',
                overflow: 'hidden',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                padding: '32px'
              }}
            >
              {/* Radial backdrop inside pebble */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'radial-gradient(circle at 60% 30%, rgba(249, 115, 22, 0.35) 0%, rgba(26, 20, 14, 0.95) 75%)',
                  zIndex: 1
                }}
              />

              {/* Graphical Centerpiece */}
              <div
                style={{
                  position: 'absolute',
                  top: '18%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  zIndex: 2,
                  textAlign: 'center'
                }}
              >
                <div
                  style={{
                    width: '120px',
                    height: '120px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.3), rgba(234, 88, 12, 0.1))',
                    border: '2px solid #F97316',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                    boxShadow: '0 0 35px rgba(249, 115, 22, 0.5)'
                  }}
                >
                  <Bike size={58} color="#FAF5EE" />
                </div>
                <div style={{ fontSize: '13px', fontWeight: 800, letterSpacing: '2px', color: '#FB923C', textTransform: 'uppercase' }}>
                  PEER 2-WHEELER FLEET
                </div>
              </div>

              {/* Bottom Badge inside the pebble */}
              <div
                style={{
                  position: 'relative',
                  zIndex: 3,
                  background: 'rgba(26, 20, 14, 0.85)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(249, 115, 22, 0.3)',
                  borderRadius: '20px',
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ fontSize: '11px', color: '#A39485', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>
                    CAMPUS BASE FARE
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: 900, color: '#FAF5EE' }}>
                    ₹20 <span style={{ fontSize: '12px', color: '#FB923C', fontWeight: 700 }}>Flat Rate</span>
                  </div>
                </div>
                <div
                  style={{
                    background: 'linear-gradient(135deg, #F97316, #EA580C)',
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFF'
                  }}
                >
                  <Zap size={20} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 3. DOCKED FLOATING QUICK INFO BAR (HYDRA SIGNATURE DOCK)      */}
      {/* ============================================================ */}
      <section
        style={{
          maxWidth: '1280px',
          margin: '20px auto 72px',
          padding: '0 28px'
        }}
      >
        {/* Desktop Dock (3 segments with vertical dividers) */}
        <div
          className="hydra-desktop-dock"
          style={{
            background: 'linear-gradient(135deg, #251B12 0%, #1E150E 100%)',
            border: '1.5px solid rgba(249, 115, 22, 0.3)',
            borderRadius: '90px',
            padding: '24px 44px',
            boxShadow: '0 20px 45px rgba(0, 0, 0, 0.5), 0 0 25px rgba(249, 115, 22, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          {/* Segment 1: Location */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flex: 1 }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: 'rgba(249, 115, 22, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <MapPin size={24} color="#F97316" />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#FAF5EE', letterSpacing: '0.5px' }}>
                Pay Us a Visit
              </div>
              <div style={{ fontSize: '12.5px', color: '#B3A495', marginTop: '3px' }}>
                Pondicherry University, Kalapet, Puducherry
              </div>
            </div>
          </div>

          {/* Divider 1 */}
          <div style={{ width: '1.5px', height: '48px', background: 'rgba(249, 115, 22, 0.25)', margin: '0 28px' }} />

          {/* Segment 2: Phone */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flex: 1 }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: 'rgba(249, 115, 22, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <Phone size={24} color="#F97316" />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#FAF5EE', letterSpacing: '0.5px' }}>
                Give Us a Call
              </div>
              <div style={{ fontSize: '12.5px', color: '#B3A495', marginTop: '3px' }}>
                +91 94430 00000 (24x7 PU Helpline)
              </div>
            </div>
          </div>

          {/* Divider 2 */}
          <div style={{ width: '1.5px', height: '48px', background: 'rgba(249, 115, 22, 0.25)', margin: '0 28px' }} />

          {/* Segment 3: Email */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flex: 1 }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: 'rgba(249, 115, 22, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <Mail size={24} color="#F97316" />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#FAF5EE', letterSpacing: '0.5px' }}>
                Send Us a Message
              </div>
              <div style={{ fontSize: '12.5px', color: '#B3A495', marginTop: '3px' }}>
                support@papido.com
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Dock Slider (Hydra Mobile with Left/Right Arrows) */}
        <div
          className="hydra-mobile-dock"
          style={{
            display: 'none',
            background: 'linear-gradient(135deg, #251B12 0%, #1E150E 100%)',
            border: '1.5px solid rgba(249, 115, 22, 0.3)',
            borderRadius: '24px',
            padding: '20px',
            boxShadow: '0 16px 36px rgba(0, 0, 0, 0.5)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button
              type="button"
              onClick={handlePrevInfo}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                border: '1px solid rgba(249, 115, 22, 0.4)',
                background: 'rgba(249, 115, 22, 0.1)',
                color: '#FAF5EE',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <ChevronLeft size={18} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', textAlign: 'center', flex: 1, padding: '0 12px' }}>
              <div style={{ margin: '0 auto' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '6px' }}>
                  {infoBarItems[activeInfoSlide].icon}
                </div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#FAF5EE' }}>
                  {infoBarItems[activeInfoSlide].title}
                </div>
                <div style={{ fontSize: '12px', color: '#B3A495', marginTop: '2px' }}>
                  {infoBarItems[activeInfoSlide].subtitle}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleNextInfo}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                border: '1px solid rgba(249, 115, 22, 0.4)',
                background: 'rgba(249, 115, 22, 0.1)',
                color: '#FAF5EE',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 4. INTRODUCTION SECTION (HYDRA ABOUT WITH LONG ARROW)        */}
      {/* ============================================================ */}
      <section
        id="about"
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '48px 28px 72px'
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '40px',
            alignItems: 'center'
          }}
        >
          {/* Left: Title + Arrow */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 900, letterSpacing: '2px', color: '#F97316', textTransform: 'uppercase' }}>
                INTRODUCTION
              </div>
              <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 900, color: '#FAF5EE', margin: '4px 0 0 0', letterSpacing: '-0.02em' }}>
                TO PAPIDO
              </h2>
            </div>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', color: '#F97316' }}>
              <div style={{ height: '2px', flex: 1, background: 'linear-gradient(90deg, #F97316, transparent)' }} />
              <ArrowRight size={28} />
            </div>
          </div>

          {/* Right: Paragraph */}
          <div>
            <p style={{ fontSize: '15px', lineHeight: 1.8, color: '#BFAF9F', margin: 0 }}>
              Papido was engineered exclusively for the students and scholars of Pondicherry University. We eliminate long walks under hot weather, predatory auto-rickshaw fares, and safety concerns. By connecting student riders with fellow campus passengers heading in the same direction, everyone commutes quickly, safely, and affordably.
            </p>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 5. SERVICES SECTION (HYDRA 4-CARD GRID WITH CIRCULAR ICONS)   */}
      {/* ============================================================ */}
      <section
        id="services"
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '32px 28px 80px'
        }}
      >
        {/* Section Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '48px' }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 900, letterSpacing: '2px', color: '#F97316', textTransform: 'uppercase' }}>
              WHY RIDE WITH
            </div>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 900, color: '#FAF5EE', margin: '4px 0 0 0', letterSpacing: '-0.02em' }}>
              PAPIDO MOBILITY
            </h2>
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', color: '#F97316' }}>
            <div style={{ height: '2px', flex: 1, background: 'linear-gradient(90deg, #F97316, transparent)' }} />
            <ArrowRight size={28} />
          </div>
        </div>

        {/* 4 Hydra Service Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '24px'
          }}
        >
          {/* Card 1: Flat ₹20 */}
          <div
            style={{
              background: 'linear-gradient(145deg, #281D14 0%, #1C140E 100%)',
              border: '1.5px solid rgba(249, 115, 22, 0.25)',
              borderRadius: '36px',
              padding: '36px 24px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              boxShadow: '0 16px 36px rgba(0, 0, 0, 0.4)',
              transition: 'transform 0.2s ease, border-color 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-6px)';
              e.currentTarget.style.borderColor = '#F97316';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = 'rgba(249, 115, 22, 0.25)';
            }}
          >
            <div
              style={{
                width: '110px',
                height: '110px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.2), rgba(234, 88, 12, 0.05))',
                border: '2px solid rgba(249, 115, 22, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px'
              }}
            >
              <DollarSign size={46} color="#F97316" />
            </div>

            <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#FAF5EE', margin: '0 0 12px 0', letterSpacing: '0.5px' }}>
              ₹20 FLAT FARE
            </h3>

            <div style={{ width: '48px', height: '2px', background: 'rgba(249, 115, 22, 0.4)', marginBottom: '16px' }} />

            <p style={{ fontSize: '13px', color: '#B3A495', lineHeight: 1.6, flex: 1, margin: '0 0 24px 0' }}>
              Fixed transparent pricing between all Pondicherry University hostels, departments, library, and main gates. No surge pricing ever.
            </p>

            <button
              type="button"
              onClick={onGoToLogin}
              style={{
                height: '42px',
                padding: '0 28px',
                borderRadius: '9999px',
                border: 'none',
                background: 'linear-gradient(135deg, #F97316, #EA580C)',
                color: '#FFFFFF',
                fontSize: '11.5px',
                fontWeight: 900,
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
                cursor: 'pointer',
                boxShadow: '0 6px 18px rgba(249, 115, 22, 0.35)'
              }}
            >
              BOOK NOW
            </button>
          </div>

          {/* Card 2: 100% Student Verified */}
          <div
            style={{
              background: 'linear-gradient(145deg, #281D14 0%, #1C140E 100%)',
              border: '1.5px solid rgba(249, 115, 22, 0.25)',
              borderRadius: '36px',
              padding: '36px 24px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              boxShadow: '0 16px 36px rgba(0, 0, 0, 0.4)',
              transition: 'transform 0.2s ease, border-color 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-6px)';
              e.currentTarget.style.borderColor = '#F97316';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = 'rgba(249, 115, 22, 0.25)';
            }}
          >
            <div
              style={{
                width: '110px',
                height: '110px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.2), rgba(234, 88, 12, 0.05))',
                border: '2px solid rgba(249, 115, 22, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px'
              }}
            >
              <ShieldCheck size={46} color="#F97316" />
            </div>

            <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#FAF5EE', margin: '0 0 12px 0', letterSpacing: '0.5px' }}>
              100% VERIFIED
            </h3>

            <div style={{ width: '48px', height: '2px', background: 'rgba(249, 115, 22, 0.4)', marginBottom: '16px' }} />

            <p style={{ fontSize: '13px', color: '#B3A495', lineHeight: 1.6, flex: 1, margin: '0 0 24px 0' }}>
              Every rider uploads their official Campus ID card, government driving licence, and vehicle registration before approvals.
            </p>

            <button
              type="button"
              onClick={() => onGoToRegister ? onGoToRegister('RIDER') : onGoToLogin()}
              style={{
                height: '42px',
                padding: '0 28px',
                borderRadius: '9999px',
                border: 'none',
                background: 'linear-gradient(135deg, #F97316, #EA580C)',
                color: '#FFFFFF',
                fontSize: '11.5px',
                fontWeight: 900,
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
                cursor: 'pointer',
                boxShadow: '0 6px 18px rgba(249, 115, 22, 0.35)'
              }}
            >
              VERIFY KYC
            </button>
          </div>

          {/* Card 3: Female Rider Protection */}
          <div
            style={{
              background: 'linear-gradient(145deg, #281D14 0%, #1C140E 100%)',
              border: '1.5px solid rgba(249, 115, 22, 0.25)',
              borderRadius: '36px',
              padding: '36px 24px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              boxShadow: '0 16px 36px rgba(0, 0, 0, 0.4)',
              transition: 'transform 0.2s ease, border-color 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-6px)';
              e.currentTarget.style.borderColor = '#F97316';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = 'rgba(249, 115, 22, 0.25)';
            }}
          >
            <div
              style={{
                width: '110px',
                height: '110px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.2), rgba(234, 88, 12, 0.05))',
                border: '2px solid rgba(249, 115, 22, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px'
              }}
            >
              <Heart size={46} color="#F97316" />
            </div>

            <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#FAF5EE', margin: '0 0 12px 0', letterSpacing: '0.5px' }}>
              FEMALE SAFETY
            </h3>

            <div style={{ width: '48px', height: '2px', background: 'rgba(249, 115, 22, 0.4)', marginBottom: '16px' }} />

            <p style={{ fontSize: '13px', color: '#B3A495', lineHeight: 1.6, flex: 1, margin: '0 0 24px 0' }}>
              Female students have the safety option to request rides exclusively with verified female campus riders for maximum comfort.
            </p>

            <button
              type="button"
              onClick={onGoToLogin}
              style={{
                height: '42px',
                padding: '0 28px',
                borderRadius: '9999px',
                border: 'none',
                background: 'linear-gradient(135deg, #F97316, #EA580C)',
                color: '#FFFFFF',
                fontSize: '11.5px',
                fontWeight: 900,
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
                cursor: 'pointer',
                boxShadow: '0 6px 18px rgba(249, 115, 22, 0.35)'
              }}
            >
              LEARN MORE
            </button>
          </div>

          {/* Card 4: Instant 3-Min Pickup */}
          <div
            style={{
              background: 'linear-gradient(145deg, #281D14 0%, #1C140E 100%)',
              border: '1.5px solid rgba(249, 115, 22, 0.25)',
              borderRadius: '36px',
              padding: '36px 24px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              boxShadow: '0 16px 36px rgba(0, 0, 0, 0.4)',
              transition: 'transform 0.2s ease, border-color 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-6px)';
              e.currentTarget.style.borderColor = '#F97316';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = 'rgba(249, 115, 22, 0.25)';
            }}
          >
            <div
              style={{
                width: '110px',
                height: '110px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.2), rgba(234, 88, 12, 0.05))',
                border: '2px solid rgba(249, 115, 22, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px'
              }}
            >
              <Clock size={46} color="#F97316" />
            </div>

            <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#FAF5EE', margin: '0 0 12px 0', letterSpacing: '0.5px' }}>
              3-MIN PICKUP
            </h3>

            <div style={{ width: '48px', height: '2px', background: 'rgba(249, 115, 22, 0.4)', marginBottom: '16px' }} />

            <p style={{ fontSize: '13px', color: '#B3A495', lineHeight: 1.6, flex: 1, margin: '0 0 24px 0' }}>
              Active student riders on campus ensure rapid dispatch directly outside your hostel or department block in minutes.
            </p>

            <button
              type="button"
              onClick={onGoToLogin}
              style={{
                height: '42px',
                padding: '0 28px',
                borderRadius: '9999px',
                border: 'none',
                background: 'linear-gradient(135deg, #F97316, #EA580C)',
                color: '#FFFFFF',
                fontSize: '11.5px',
                fontWeight: 900,
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
                cursor: 'pointer',
                boxShadow: '0 6px 18px rgba(249, 115, 22, 0.35)'
              }}
            >
              RIDE FAST
            </button>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 6. POPULAR CAMPUS ROUTES & FIXED FARES (CAMPUS FARES)        */}
      {/* ============================================================ */}
      <section
        id="fares"
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '40px 28px 80px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '40px' }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 900, letterSpacing: '2px', color: '#F97316', textTransform: 'uppercase' }}>
              TRANSPARENT PRICING
            </div>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 900, color: '#FAF5EE', margin: '4px 0 0 0', letterSpacing: '-0.02em' }}>
              POPULAR PU ROUTES
            </h2>
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', color: '#F97316' }}>
            <div style={{ height: '2px', flex: 1, background: 'linear-gradient(90deg, #F97316, transparent)' }} />
            <ArrowRight size={28} />
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '20px'
          }}
        >
          {/* Route 1 */}
          <div
            style={{
              background: 'linear-gradient(135deg, #241A12 0%, #1A120C 100%)',
              border: '1.5px solid rgba(249, 115, 22, 0.25)',
              borderRadius: '24px',
              padding: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#FAF5EE' }}>
                Gate 1 ↔ Science Complex
              </div>
              <div style={{ fontSize: '12.5px', color: '#A39485', marginTop: '4px' }}>
                Main Campus Direct Corridor
              </div>
            </div>
            <div
              style={{
                fontSize: '18px',
                fontWeight: 900,
                color: '#F97316',
                background: 'rgba(249, 115, 22, 0.15)',
                padding: '8px 16px',
                borderRadius: '16px',
                border: '1px solid rgba(249, 115, 22, 0.3)'
              }}
            >
              ₹20
            </div>
          </div>

          {/* Route 2 */}
          <div
            style={{
              background: 'linear-gradient(135deg, #241A12 0%, #1A120C 100%)',
              border: '1.5px solid rgba(249, 115, 22, 0.25)',
              borderRadius: '24px',
              padding: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#FAF5EE' }}>
                Girls Hostels ↔ Central Library
              </div>
              <div style={{ fontSize: '12.5px', color: '#A39485', marginTop: '4px' }}>
                Curie, Teresa, Ganga, Yamuna Hostels
              </div>
            </div>
            <div
              style={{
                fontSize: '18px',
                fontWeight: 900,
                color: '#F97316',
                background: 'rgba(249, 115, 22, 0.15)',
                padding: '8px 16px',
                borderRadius: '16px',
                border: '1px solid rgba(249, 115, 22, 0.3)'
              }}
            >
              ₹20
            </div>
          </div>

          {/* Route 3 */}
          <div
            style={{
              background: 'linear-gradient(135deg, #241A12 0%, #1A120C 100%)',
              border: '1.5px solid rgba(249, 115, 22, 0.25)',
              borderRadius: '24px',
              padding: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#FAF5EE' }}>
                Boys Hostels ↔ Silver Jubilee
              </div>
              <div style={{ fontSize: '12.5px', color: '#A39485', marginTop: '4px' }}>
                Tagore, Bharathi, Kamban Hostels
              </div>
            </div>
            <div
              style={{
                fontSize: '18px',
                fontWeight: 900,
                color: '#F97316',
                background: 'rgba(249, 115, 22, 0.15)',
                padding: '8px 16px',
                borderRadius: '16px',
                border: '1px solid rgba(249, 115, 22, 0.3)'
              }}
            >
              ₹20
            </div>
          </div>

          {/* Route 4 */}
          <div
            style={{
              background: 'linear-gradient(135deg, #241A12 0%, #1A120C 100%)',
              border: '1.5px solid rgba(249, 115, 22, 0.25)',
              borderRadius: '24px',
              padding: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#FAF5EE' }}>
                PU Campus ↔ White Town / Beach
              </div>
              <div style={{ fontSize: '12.5px', color: '#A39485', marginTop: '4px' }}>
                Custom Outside Campus Trip Dispatch
              </div>
            </div>
            <div
              style={{
                fontSize: '14px',
                fontWeight: 900,
                color: '#FB923C',
                background: 'rgba(249, 115, 22, 0.15)',
                padding: '8px 14px',
                borderRadius: '16px',
                border: '1px solid rgba(249, 115, 22, 0.3)'
              }}
            >
              Fair Quote
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 7. HOW IT WORKS (HYDRA 01-02-03-04 CIRCULAR STEP PROCESS)     */}
      {/* ============================================================ */}
      <section
        id="how-it-works"
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '40px 28px 80px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '56px' }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 900, letterSpacing: '2px', color: '#F97316', textTransform: 'uppercase' }}>
              HOW WE OPERATE
            </div>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 900, color: '#FAF5EE', margin: '4px 0 0 0', letterSpacing: '-0.02em' }}>
              HOW TO RIDE & EARN
            </h2>
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', color: '#F97316' }}>
            <div style={{ height: '2px', flex: 1, background: 'linear-gradient(90deg, #F97316, transparent)' }} />
            <ArrowRight size={28} />
          </div>
        </div>

        {/* 4 Numbered Steps */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '24px',
            position: 'relative'
          }}
        >
          {/* Step 1 */}
          <div
            style={{
              background: 'linear-gradient(145deg, #241A12 0%, #1A120C 100%)',
              border: '1.5px solid rgba(249, 115, 22, 0.25)',
              borderRadius: '28px',
              padding: '36px 24px',
              textAlign: 'center',
              position: 'relative'
            }}
          >
            <div
              style={{
                width: '74px',
                height: '74px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #F97316, #EA580C)',
                color: '#FFFFFF',
                fontSize: '24px',
                fontWeight: 900,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
                boxShadow: '0 8px 24px rgba(249, 115, 22, 0.4)'
              }}
            >
              01
            </div>
            <h3 style={{ fontSize: '16.5px', fontWeight: 800, color: '#FAF5EE', marginBottom: '10px' }}>
              Pick Campus Stops
            </h3>
            <p style={{ fontSize: '13px', color: '#B3A495', lineHeight: 1.6, margin: 0 }}>
              Select your pickup hostel or gate and destination academic department.
            </p>
          </div>

          {/* Step 2 */}
          <div
            style={{
              background: 'linear-gradient(145deg, #241A12 0%, #1A120C 100%)',
              border: '1.5px solid rgba(249, 115, 22, 0.25)',
              borderRadius: '28px',
              padding: '36px 24px',
              textAlign: 'center',
              position: 'relative'
            }}
          >
            <div
              style={{
                width: '74px',
                height: '74px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #F97316, #EA580C)',
                color: '#FFFFFF',
                fontSize: '24px',
                fontWeight: 900,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
                boxShadow: '0 8px 24px rgba(249, 115, 22, 0.4)'
              }}
            >
              02
            </div>
            <h3 style={{ fontSize: '16.5px', fontWeight: 800, color: '#FAF5EE', marginBottom: '10px' }}>
              Instant Peer Match
            </h3>
            <p style={{ fontSize: '13px', color: '#B3A495', lineHeight: 1.6, margin: 0 }}>
              Matched instantly with a verified student rider heading your way on a bike/scooter.
            </p>
          </div>

          {/* Step 3 */}
          <div
            style={{
              background: 'linear-gradient(145deg, #241A12 0%, #1A120C 100%)',
              border: '1.5px solid rgba(249, 115, 22, 0.25)',
              borderRadius: '28px',
              padding: '36px 24px',
              textAlign: 'center',
              position: 'relative'
            }}
          >
            <div
              style={{
                width: '74px',
                height: '74px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #F97316, #EA580C)',
                color: '#FFFFFF',
                fontSize: '24px',
                fontWeight: 900,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
                boxShadow: '0 8px 24px rgba(249, 115, 22, 0.4)'
              }}
            >
              03
            </div>
            <h3 style={{ fontSize: '16.5px', fontWeight: 800, color: '#FAF5EE', marginBottom: '10px' }}>
              Verify 4-Digit OTP
            </h3>
            <p style={{ fontSize: '13px', color: '#B3A495', lineHeight: 1.6, margin: 0 }}>
              Share your secure ride-start code with the rider before moving for verified passenger safety.
            </p>
          </div>

          {/* Step 4 */}
          <div
            style={{
              background: 'linear-gradient(145deg, #241A12 0%, #1A120C 100%)',
              border: '1.5px solid rgba(249, 115, 22, 0.25)',
              borderRadius: '28px',
              padding: '36px 24px',
              textAlign: 'center',
              position: 'relative'
            }}
          >
            <div
              style={{
                width: '74px',
                height: '74px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #F97316, #EA580C)',
                color: '#FFFFFF',
                fontSize: '24px',
                fontWeight: 900,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
                boxShadow: '0 8px 24px rgba(249, 115, 22, 0.4)'
              }}
            >
              04
            </div>
            <h3 style={{ fontSize: '16.5px', fontWeight: 800, color: '#FAF5EE', marginBottom: '10px' }}>
              Flat ₹20 Settle
            </h3>
            <p style={{ fontSize: '13px', color: '#B3A495', lineHeight: 1.6, margin: 0 }}>
              Reach your classroom on time. Settle the fixed ₹20 flat rate via UPI QR or cash.
            </p>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 8. JOIN PAPIDO CARD / RIDER RECRUITMENT BANNER (HYDRA FORM)   */}
      {/* ============================================================ */}
      <section
        style={{
          maxWidth: '1280px',
          margin: '0 auto 80px',
          padding: '0 28px'
        }}
      >
        <div
          style={{
            background: 'linear-gradient(135deg, #2A1D13 0%, #1C130B 100%)',
            border: '2px solid rgba(249, 115, 22, 0.35)',
            borderRadius: '40px',
            padding: '56px 40px',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 24px 60px rgba(0, 0, 0, 0.6), 0 0 35px rgba(249, 115, 22, 0.15)'
          }}
        >
          <div style={{ maxWidth: '640px', margin: '0 auto', position: 'relative', zIndex: 2 }}>
            <span
              style={{
                background: 'rgba(249, 115, 22, 0.2)',
                color: '#FB923C',
                padding: '4px 16px',
                borderRadius: '9999px',
                fontSize: '11px',
                fontWeight: 900,
                letterSpacing: '1.5px',
                display: 'inline-block',
                marginBottom: '16px',
                textTransform: 'uppercase'
              }}
            >
              STUDENT DRIVER NETWORK
            </span>

            <h2
              style={{
                fontSize: 'clamp(28px, 4vw, 42px)',
                fontWeight: 900,
                letterSpacing: '-0.03em',
                color: '#FAF5EE',
                marginBottom: '16px'
              }}
            >
              Have a Bike or Scooter? Earn Between Classes!
            </h2>

            <p style={{ fontSize: '15px', color: '#D6C8BB', lineHeight: 1.6, marginBottom: '36px' }}>
              Give fellow campus students a lift on your usual commute. Earn daily pocket money with 100% transparent payouts and zero hidden cuts.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => onGoToRegister ? onGoToRegister('RIDER') : onGoToLogin()}
                style={{
                  height: '52px',
                  padding: '0 36px',
                  borderRadius: '9999px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #F97316, #EA580C)',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 900,
                  letterSpacing: '1.5px',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  boxShadow: '0 8px 24px rgba(249, 115, 22, 0.4)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <span>REGISTER AS RIDER</span>
                <ArrowRight size={18} />
              </button>

              <button
                type="button"
                onClick={onGoToLogin}
                style={{
                  height: '52px',
                  padding: '0 32px',
                  borderRadius: '9999px',
                  border: '2px solid rgba(249, 115, 22, 0.4)',
                  background: 'transparent',
                  color: '#FAF5EE',
                  fontSize: '13px',
                  fontWeight: 900,
                  letterSpacing: '1.5px',
                  textTransform: 'uppercase',
                  cursor: 'pointer'
                }}
              >
                <span>SIGN IN TO BOOK</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 9. FOOTER (HYDRA STYLE WITH PAPIDO BRAND)                    */}
      {/* ============================================================ */}
      <footer
        style={{
          borderTop: '1px solid rgba(249, 115, 22, 0.2)',
          background: '#150F09',
          padding: '56px 28px 36px'
        }}
      >
        <div
          style={{
            maxWidth: '1280px',
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '28px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <img
              src="/papidologo.jpeg"
              alt="Papido Logo"
              style={{ width: '40px', height: '40px', borderRadius: '12px', objectFit: 'contain' }}
            />
            <div>
              <div style={{ fontSize: '18px', fontWeight: 900, color: '#FAF5EE', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                PAPIDO
              </div>
              <div style={{ fontSize: '11.5px', color: '#A39485', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                Pondicherry University Campus Mobility
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', fontSize: '12px', color: '#C7B7A7', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>
            <button
              type="button"
              onClick={onGoToLogin}
              style={{ background: 'none', border: 'none', color: '#C7B7A7', cursor: 'pointer', fontSize: '12px', fontWeight: 700, letterSpacing: '1px' }}
            >
              SIGN IN
            </button>
            <button
              type="button"
              onClick={() => onGoToRegister ? onGoToRegister() : onGoToLogin()}
              style={{ background: 'none', border: 'none', color: '#C7B7A7', cursor: 'pointer', fontSize: '12px', fontWeight: 700, letterSpacing: '1px' }}
            >
              CREATE ACCOUNT
            </button>
            {onGoToAdmin && (
              <button
                type="button"
                onClick={onGoToAdmin}
                style={{ background: 'none', border: 'none', color: '#F97316', cursor: 'pointer', fontSize: '12px', fontWeight: 800, letterSpacing: '1px' }}
              >
                ADMIN PORTAL
              </button>
            )}
          </div>
        </div>

        <div
          style={{
            maxWidth: '1280px',
            margin: '32px auto 0',
            paddingTop: '24px',
            borderTop: '1px solid rgba(249, 115, 22, 0.12)',
            textAlign: 'center',
            fontSize: '12px',
            color: '#807062',
            letterSpacing: '0.5px'
          }}
        >
          &copy; {new Date().getFullYear()} Papido Campus Mobility &bull; Pondicherry University &bull; Built For Fast & Safe Student Travel
        </div>
      </footer>

      {/* Responsive Breakpoint Styles */}
      <style>{`
        @media (min-width: 900px) {
          .hydra-desktop-nav {
            display: flex !important;
          }
          .hydra-mobile-nav-toggle {
            display: none !important;
          }
          .hydra-desktop-dock {
            display: flex !important;
          }
          .hydra-mobile-dock {
            display: none !important;
          }
        }
        @media (max-width: 899px) {
          .hydra-desktop-nav {
            display: none !important;
          }
          .hydra-mobile-nav-toggle {
            display: block !important;
          }
          .hydra-desktop-dock {
            display: none !important;
          }
          .hydra-mobile-dock {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
}
