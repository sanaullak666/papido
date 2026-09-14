import React, { useState } from 'react';
import {
  Bike,
  User,
  ShieldCheck,
  Zap,
  ArrowRight,
  CheckCircle2,
  Clock,
  MapPin,
  Sparkles,
  Navigation,
  Phone,
  Heart,
  Award,
  ChevronRight,
  Menu,
  X,
  Compass,
  DollarSign,
  Users
} from 'lucide-react';

export function HomeView({ onGoToLogin, onGoToRegister, onGoToAdmin, user }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const scrollToSection = (id) => {
    setMobileNavOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(1200px 800px at 50% -10%, #FFF7ED 0%, #FAF5EE 45%, #F5EFEB 100%)',
        color: '#271E16',
        fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        overflowX: 'hidden'
      }}
    >
      {/* ============================================================ */}
      {/* 1. TOP NAVBAR */}
      {/* ============================================================ */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          background: 'rgba(255, 255, 255, 0.88)',
          borderBottom: '1.5px solid rgba(239, 228, 214, 0.8)',
          transition: 'all 0.2s ease'
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '14px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          {/* Brand Logo & Name */}
          <div
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
          >
            <img
              src="/papidologo.jpeg"
              alt="Papido Logo"
              style={{
                width: '42px',
                height: '42px',
                objectFit: 'contain',
                borderRadius: '12px',
                boxShadow: '0 4px 14px rgba(234, 88, 12, 0.25)',
                border: '1.5px solid #F3ECE2'
              }}
            />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '22px', fontWeight: 900, letterSpacing: '-0.03em', color: '#1F1A16' }}>
                  PAPIDO
                </span>
                <span
                  style={{
                    background: '#FFF7ED',
                    color: '#EA580C',
                    border: '1px solid #FED7AA',
                    fontSize: '10.5px',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    letterSpacing: '0.4px'
                  }}
                >
                  CAMPUS MOBILITY
                </span>
              </div>
              <span style={{ fontSize: '11px', color: '#796D61', fontWeight: 600, display: 'block', marginTop: '-2px' }}>
                Pondicherry University
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav style={{ display: 'none', alignItems: 'center', gap: '28px' }} className="desktop-nav">
            <button
              onClick={() => scrollToSection('how-it-works')}
              style={{ background: 'none', border: 'none', fontSize: '14px', fontWeight: 600, color: '#57483B', cursor: 'pointer' }}
            >
              How it Works
            </button>
            <button
              onClick={() => scrollToSection('fares')}
              style={{ background: 'none', border: 'none', fontSize: '14px', fontWeight: 600, color: '#57483B', cursor: 'pointer' }}
            >
              Campus Fares
            </button>
            <button
              onClick={() => scrollToSection('safety')}
              style={{ background: 'none', border: 'none', fontSize: '14px', fontWeight: 600, color: '#57483B', cursor: 'pointer' }}
            >
              Safety & Verification
            </button>
            <button
              onClick={() => scrollToSection('drive')}
              style={{ background: 'none', border: 'none', fontSize: '14px', fontWeight: 600, color: '#57483B', cursor: 'pointer' }}
            >
              Drive with Us
            </button>
          </nav>

          {/* Action CTAs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {user ? (
              <button
                type="button"
                onClick={onGoToLogin}
                style={{
                  height: '42px',
                  padding: '0 20px',
                  borderRadius: '9999px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #F97316, #EA580C)',
                  color: '#FFFFFF',
                  fontSize: '13.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 6px 18px rgba(234, 88, 12, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>Go to Portal ({user.role})</span>
                <ArrowRight size={15} />
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onGoToLogin}
                  style={{
                    height: '42px',
                    padding: '0 18px',
                    borderRadius: '9999px',
                    border: '1.5px solid #E5DBD0',
                    background: '#FFFFFF',
                    color: '#271E16',
                    fontSize: '13.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => onGoToRegister ? onGoToRegister() : onGoToLogin()}
                  style={{
                    height: '42px',
                    padding: '0 20px',
                    borderRadius: '9999px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #F97316, #EA580C)',
                    color: '#FFFFFF',
                    fontSize: '13.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 6px 18px rgba(234, 88, 12, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <span>Book a Ride</span>
                  <ArrowRight size={15} />
                </button>
              </>
            )}

            {/* Mobile Menu Toggle Button */}
            <button
              type="button"
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              style={{
                display: 'none',
                background: '#F8F3EC',
                border: '1px solid #E8DCCB',
                borderRadius: '10px',
                padding: '8px',
                cursor: 'pointer',
                color: '#271E16'
              }}
              className="mobile-nav-toggle"
            >
              {mobileNavOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Nav Dropdown */}
        {mobileNavOpen && (
          <div
            style={{
              padding: '16px 24px 20px',
              background: '#FFFFFF',
              borderTop: '1px solid #EFE4D6',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}
          >
            <button
              onClick={() => scrollToSection('how-it-works')}
              style={{ background: 'none', border: 'none', textAlign: 'left', fontSize: '15px', fontWeight: 600, color: '#3A2E23' }}
            >
              How it Works
            </button>
            <button
              onClick={() => scrollToSection('fares')}
              style={{ background: 'none', border: 'none', textAlign: 'left', fontSize: '15px', fontWeight: 600, color: '#3A2E23' }}
            >
              Campus Fares
            </button>
            <button
              onClick={() => scrollToSection('safety')}
              style={{ background: 'none', border: 'none', textAlign: 'left', fontSize: '15px', fontWeight: 600, color: '#3A2E23' }}
            >
              Safety & Verification
            </button>
            <button
              onClick={() => scrollToSection('drive')}
              style={{ background: 'none', border: 'none', textAlign: 'left', fontSize: '15px', fontWeight: 600, color: '#3A2E23' }}
            >
              Drive with Us
            </button>
            <div style={{ paddingTop: '8px', borderTop: '1px solid #F0E8DD', display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={onGoToLogin}
                style={{
                  flex: 1,
                  height: '42px',
                  borderRadius: '9999px',
                  border: '1.5px solid #E5DBD0',
                  background: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '13.5px'
                }}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={onGoToLogin}
                style={{
                  flex: 1,
                  height: '42px',
                  borderRadius: '9999px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #F97316, #EA580C)',
                  color: '#FFF',
                  fontWeight: 700,
                  fontSize: '13.5px'
                }}
              >
                Book Ride
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ============================================================ */}
      {/* 2. HERO SECTION */}
      {/* ============================================================ */}
      <section
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '64px 24px 72px',
          textAlign: 'center'
        }}
      >
        {/* Badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: '#FFF7ED',
            border: '1.5px solid #FED7AA',
            padding: '6px 16px',
            borderRadius: '9999px',
            marginBottom: '24px',
            boxShadow: '0 2px 8px rgba(234, 88, 12, 0.08)'
          }}
        >
          <Sparkles size={16} color="#EA580C" />
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#C2410C' }}>
            Official Peer Campus Mobility for Pondicherry University
          </span>
        </div>

        {/* Hero Main Heading */}
        <h1
          style={{
            fontSize: 'clamp(36px, 5.5vw, 64px)',
            fontWeight: 900,
            lineHeight: 1.12,
            letterSpacing: '-0.04em',
            color: '#1A140E',
            maxWidth: '960px',
            margin: '0 auto 20px'
          }}
        >
          Campus Rides Made{' '}
          <span
            style={{
              background: 'linear-gradient(135deg, #F97316, #EA580C)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}
          >
            Fast, Safe & Simple
          </span>{' '}
          at PU
        </h1>

        {/* Hero Subtitle */}
        <p
          style={{
            fontSize: 'clamp(16px, 2vw, 19px)',
            lineHeight: 1.6,
            color: '#645447',
            maxWidth: '720px',
            margin: '0 auto 36px',
            fontWeight: 500
          }}
        >
          Affordable, reliable peer-to-peer two-wheeler mobility across all hostels, departments, library, gates, and city dispatch. Starting at just <strong style={{ color: '#EA580C' }}>₹20 flat</strong>.
        </p>

        {/* Hero CTA Buttons (Figma Pill Styles) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            flexWrap: 'wrap',
            marginBottom: '54px'
          }}
        >
          <button
            type="button"
            onClick={onGoToLogin}
            style={{
              height: '52px',
              padding: '0 32px',
              borderRadius: '9999px',
              border: 'none',
              background: 'linear-gradient(135deg, #F97316, #EA580C)',
              color: '#FFFFFF',
              fontSize: '15.5px',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 10px 28px rgba(234, 88, 12, 0.35)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              transition: 'transform 0.15s ease'
            }}
          >
            <User size={18} />
            <span>Book Ride as Passenger</span>
            <ArrowRight size={18} />
          </button>

          <button
            type="button"
            onClick={() => onGoToRegister ? onGoToRegister('RIDER') : onGoToLogin()}
            style={{
              height: '52px',
              padding: '0 28px',
              borderRadius: '9999px',
              border: '2px solid #E5DBD0',
              background: '#FFFFFF',
              color: '#271E16',
              fontSize: '15.5px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.04)',
              transition: 'all 0.15s ease'
            }}
          >
            <Bike size={18} color="#EA580C" />
            <span>Earn as Student Rider</span>
          </button>
        </div>

        {/* 4 Feature Highlights Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '18px',
            maxWidth: '1080px',
            margin: '0 auto'
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              border: '1.5px solid #EFE4D6',
              borderRadius: '20px',
              padding: '20px',
              textAlign: 'left',
              boxShadow: '0 4px 16px rgba(0,0,0,0.03)'
            }}
          >
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: '#FFF7ED',
                color: '#EA580C',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '12px'
              }}
            >
              <DollarSign size={22} />
            </div>
            <div style={{ fontSize: '17px', fontWeight: 800, color: '#1F1A16', marginBottom: '4px' }}>
              ₹20 Flat Campus Fare
            </div>
            <div style={{ fontSize: '13px', color: '#796D61', lineHeight: 1.5 }}>
              Fixed transparent pricing. No surge, no hidden charges anywhere inside PU.
            </div>
          </div>

          <div
            style={{
              background: '#FFFFFF',
              border: '1.5px solid #EFE4D6',
              borderRadius: '20px',
              padding: '20px',
              textAlign: 'left',
              boxShadow: '0 4px 16px rgba(0,0,0,0.03)'
            }}
          >
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: '#FFF7ED',
                color: '#EA580C',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '12px'
              }}
            >
              <ShieldCheck size={22} />
            </div>
            <div style={{ fontSize: '17px', fontWeight: 800, color: '#1F1A16', marginBottom: '4px' }}>
              100% Student Verified
            </div>
            <div style={{ fontSize: '13px', color: '#796D61', lineHeight: 1.5 }}>
              Strict verification with Campus ID, Driving Licence, and Vehicle RC document.
            </div>
          </div>

          <div
            style={{
              background: '#FFFFFF',
              border: '1.5px solid #EFE4D6',
              borderRadius: '20px',
              padding: '20px',
              textAlign: 'left',
              boxShadow: '0 4px 16px rgba(0,0,0,0.03)'
            }}
          >
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: '#FDF2F8',
                color: '#DB2777',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '12px'
              }}
            >
              <Heart size={22} />
            </div>
            <div style={{ fontSize: '17px', fontWeight: 800, color: '#1F1A16', marginBottom: '4px' }}>
              Female Rider Option
            </div>
            <div style={{ fontSize: '13px', color: '#796D61', lineHeight: 1.5 }}>
              Optional 1-tap filter for female students to ride exclusively with female drivers.
            </div>
          </div>

          <div
            style={{
              background: '#FFFFFF',
              border: '1.5px solid #EFE4D6',
              borderRadius: '20px',
              padding: '20px',
              textAlign: 'left',
              boxShadow: '0 4px 16px rgba(0,0,0,0.03)'
            }}
          >
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: '#FFF7ED',
                color: '#EA580C',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '12px'
              }}
            >
              <Zap size={22} />
            </div>
            <div style={{ fontSize: '17px', fontWeight: 800, color: '#1F1A16', marginBottom: '4px' }}>
              Instant Campus Pickup
            </div>
            <div style={{ fontSize: '13px', color: '#796D61', lineHeight: 1.5 }}>
              Average pickup time of 2-4 minutes from Gate 1, 2, Mess, and Silver Jubilee.
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 3. HOW IT WORKS SECTION */}
      {/* ============================================================ */}
      <section
        id="how-it-works"
        style={{
          background: '#FFFFFF',
          borderTop: '1.5px solid #EFE4D6',
          borderBottom: '1.5px solid #EFE4D6',
          padding: '80px 24px'
        }}
      >
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#EA580C', letterSpacing: '1px' }}>
              EFFORTLESS MOBILITY
            </span>
            <h2 style={{ fontSize: '34px', fontWeight: 900, letterSpacing: '-0.03em', marginTop: '6px', color: '#1F1A16' }}>
              How Papido Works in 3 Steps
            </h2>
            <p style={{ fontSize: '15px', color: '#796D61', maxWidth: '540px', margin: '8px auto 0' }}>
              Designed specifically around Pondicherry University stops and daily student schedules.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '32px'
            }}
          >
            {/* Step 1 */}
            <div
              style={{
                background: '#FAF5EE',
                border: '1.5px solid #EFE4D6',
                borderRadius: '24px',
                padding: '32px 28px',
                position: 'relative'
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, #F97316, #EA580C)',
                  color: '#FFFFFF',
                  fontWeight: 900,
                  fontSize: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '20px',
                  boxShadow: '0 6px 16px rgba(234, 88, 12, 0.3)'
                }}
              >
                1
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#1F1A16', marginBottom: '8px' }}>
                Pick Stops & Request
              </h3>
              <p style={{ fontSize: '14px', color: '#68594D', lineHeight: 1.6, margin: 0 }}>
                Select your pickup spot (Gate 1, Hostel Mess, Library, Science block) and destination. Tap "Request Ride".
              </p>
            </div>

            {/* Step 2 */}
            <div
              style={{
                background: '#FAF5EE',
                border: '1.5px solid #EFE4D6',
                borderRadius: '24px',
                padding: '32px 28px',
                position: 'relative'
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, #F97316, #EA580C)',
                  color: '#FFFFFF',
                  fontWeight: 900,
                  fontSize: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '20px',
                  boxShadow: '0 6px 16px rgba(234, 88, 12, 0.3)'
                }}
              >
                2
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#1F1A16', marginBottom: '8px' }}>
                Instant Driver Match & OTP
              </h3>
              <p style={{ fontSize: '14px', color: '#68594D', lineHeight: 1.6, margin: 0 }}>
                A nearby verified student driver accepts your ride. Verify the 4-digit ride start OTP when they arrive.
              </p>
            </div>

            {/* Step 3 */}
            <div
              style={{
                background: '#FAF5EE',
                border: '1.5px solid #EFE4D6',
                borderRadius: '24px',
                padding: '32px 28px',
                position: 'relative'
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, #F97316, #EA580C)',
                  color: '#FFFFFF',
                  fontWeight: 900,
                  fontSize: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '20px',
                  boxShadow: '0 6px 16px rgba(234, 88, 12, 0.3)'
                }}
              >
                3
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#1F1A16', marginBottom: '8px' }}>
                Reach Safely & Pay ₹20
              </h3>
              <p style={{ fontSize: '14px', color: '#68594D', lineHeight: 1.6, margin: 0 }}>
                Arrive on time for class or food without walking long distances under the sun. Pay with cash or any UPI app.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 4. CAMPUS FARES & POPULAR ROUTES */}
      {/* ============================================================ */}
      <section
        id="fares"
        style={{
          maxWidth: '1100px',
          margin: '0 auto',
          padding: '80px 24px'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <span style={{ fontSize: '12px', fontWeight: 800, color: '#EA580C', letterSpacing: '1px' }}>
            TRANSPARENT RATES
          </span>
          <h2 style={{ fontSize: '34px', fontWeight: 900, letterSpacing: '-0.03em', marginTop: '6px', color: '#1F1A16' }}>
            Popular Campus Routes & Pricing
          </h2>
          <p style={{ fontSize: '15px', color: '#796D61', maxWidth: '540px', margin: '8px auto 0' }}>
            Standard fixed rate across the university, plus flat student quotes for outside trips.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '20px'
          }}
        >
          {/* Route 1 */}
          <div
            style={{
              background: '#FFFFFF',
              border: '1.5px solid #EFE4D6',
              borderRadius: '20px',
              padding: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 4px 16px rgba(0,0,0,0.03)'
            }}
          >
            <div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#1F1A16' }}>
                Gate 1 ↔ Science Block
              </div>
              <div style={{ fontSize: '13px', color: '#796D61', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={14} color="#EA580C" /> ~3 mins &bull; Inside Campus
              </div>
            </div>
            <div
              style={{
                fontSize: '22px',
                fontWeight: 900,
                color: '#EA580C',
                background: '#FFF7ED',
                padding: '6px 14px',
                borderRadius: '12px'
              }}
            >
              ₹20
            </div>
          </div>

          {/* Route 2 */}
          <div
            style={{
              background: '#FFFFFF',
              border: '1.5px solid #EFE4D6',
              borderRadius: '20px',
              padding: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 4px 16px rgba(0,0,0,0.03)'
            }}
          >
            <div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#1F1A16' }}>
                Silver Jubilee ↔ Mega Mess
              </div>
              <div style={{ fontSize: '13px', color: '#796D61', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={14} color="#EA580C" /> ~4 mins &bull; Inside Campus
              </div>
            </div>
            <div
              style={{
                fontSize: '22px',
                fontWeight: 900,
                color: '#EA580C',
                background: '#FFF7ED',
                padding: '6px 14px',
                borderRadius: '12px'
              }}
            >
              ₹20
            </div>
          </div>

          {/* Route 3 */}
          <div
            style={{
              background: '#FFFFFF',
              border: '1.5px solid #EFE4D6',
              borderRadius: '20px',
              padding: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 4px 16px rgba(0,0,0,0.03)'
            }}
          >
            <div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#1F1A16' }}>
                Gate 2 ↔ Central Library
              </div>
              <div style={{ fontSize: '13px', color: '#796D61', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={14} color="#EA580C" /> ~3 mins &bull; Inside Campus
              </div>
            </div>
            <div
              style={{
                fontSize: '22px',
                fontWeight: 900,
                color: '#EA580C',
                background: '#FFF7ED',
                padding: '6px 14px',
                borderRadius: '12px'
              }}
            >
              ₹20
            </div>
          </div>

          {/* Route 4 (Outside Trip) */}
          <div
            style={{
              background: '#FFFFFF',
              border: '1.5px solid #FED7AA',
              borderRadius: '20px',
              padding: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 4px 16px rgba(234, 88, 12, 0.08)'
            }}
          >
            <div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#1F1A16' }}>
                PU Campus ↔ White Town / Beach
              </div>
              <div style={{ fontSize: '13px', color: '#796D61', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Navigation size={14} color="#EA580C" /> Outside Campus Dispatch
              </div>
            </div>
            <div
              style={{
                fontSize: '15px',
                fontWeight: 800,
                color: '#C2410C',
                background: '#FFF7ED',
                padding: '6px 12px',
                borderRadius: '12px'
              }}
            >
              Fair Quote
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 5. SAFETY & VERIFICATION SECTION */}
      {/* ============================================================ */}
      <section
        id="safety"
        style={{
          background: '#FAF5EE',
          borderTop: '1.5px solid #EFE4D6',
          borderBottom: '1.5px solid #EFE4D6',
          padding: '80px 24px'
        }}
      >
        <div
          style={{
            maxWidth: '1100px',
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '48px',
            alignItems: 'center'
          }}
        >
          <div>
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#EA580C', letterSpacing: '1px' }}>
              CAMPUS SECURITY FIRST
            </span>
            <h2 style={{ fontSize: '34px', fontWeight: 900, letterSpacing: '-0.03em', marginTop: '6px', color: '#1F1A16' }}>
              Built Exclusively For Student Safety & Trust
            </h2>
            <p style={{ fontSize: '15px', color: '#68594D', lineHeight: 1.7, marginTop: '12px', marginBottom: '24px' }}>
              Unlike commercial aggregators, Papido is run within the Pondicherry University community. Every member is verified before they can book or ride.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <CheckCircle2 size={20} color="#059669" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong style={{ fontSize: '15px', color: '#1F1A16' }}>Official University ID Check</strong>
                  <p style={{ fontSize: '13px', color: '#796D61', margin: '2px 0 0' }}>
                    Drivers must upload their valid Campus ID card alongside official Government DL and RC.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <CheckCircle2 size={20} color="#059669" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong style={{ fontSize: '15px', color: '#1F1A16' }}>Secure Ride Start OTP</strong>
                  <p style={{ fontSize: '13px', color: '#796D61', margin: '2px 0 0' }}>
                    A unique 4-digit code is verified before the trip starts so only the booked passenger can ride.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <CheckCircle2 size={20} color="#059669" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong style={{ fontSize: '15px', color: '#1F1A16' }}>Female Passenger Protection</strong>
                  <p style={{ fontSize: '13px', color: '#796D61', margin: '2px 0 0' }}>
                    Female students can request rides dispatched strictly to registered female campus drivers.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Safety Visual Card */}
          <div
            style={{
              background: '#FFFFFF',
              border: '2px solid #EFE4D6',
              borderRadius: '28px',
              padding: '36px',
              boxShadow: '0 20px 45px rgba(234, 88, 12, 0.08)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '16px',
                  background: '#FFF7ED',
                  color: '#EA580C',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <ShieldCheck size={28} />
              </div>
              <div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#1F1A16' }}>
                  Safety Rating & Monitoring
                </div>
                <div style={{ fontSize: '13px', color: '#796D61' }}>
                  Active campus control & live status
                </div>
              </div>
            </div>

            <div style={{ background: '#FAF5EE', padding: '16px', borderRadius: '16px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                <span>Driver KYC Approval Rate</span>
                <span style={{ color: '#059669' }}>100% Verified</span>
              </div>
              <div style={{ height: '8px', background: '#E8DFD5', borderRadius: '9999px', overflow: 'hidden' }}>
                <div style={{ width: '100%', height: '100%', background: '#059669' }} />
              </div>
            </div>

            <div style={{ background: '#FAF5EE', padding: '16px', borderRadius: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                <span>Emergency Campus Support</span>
                <span style={{ color: '#EA580C' }}>24/7 Available</span>
              </div>
              <div style={{ fontSize: '12px', color: '#796D61' }}>
                Direct hotline to PU Security & Papido Student Controllers.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 6. DRIVE WITH US (STUDENT EARNING SECTION) */}
      {/* ============================================================ */}
      <section
        id="drive"
        style={{
          maxWidth: '1100px',
          margin: '0 auto',
          padding: '80px 24px',
          textAlign: 'center'
        }}
      >
        <div
          style={{
            background: 'linear-gradient(135deg, #271E16 0%, #15100B 100%)',
            color: '#FFFFFF',
            borderRadius: '32px',
            padding: '56px 36px',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 24px 50px rgba(0,0,0,0.15)'
          }}
        >
          <div style={{ maxWidth: '640px', margin: '0 auto', position: 'relative', zIndex: 2 }}>
            <span
              style={{
                background: 'rgba(249, 115, 22, 0.2)',
                color: '#FB923C',
                padding: '4px 12px',
                borderRadius: '9999px',
                fontSize: '12px',
                fontWeight: 800,
                letterSpacing: '0.8px',
                display: 'inline-block',
                marginBottom: '16px'
              }}
            >
              FOR UNIVERSITY STUDENTS & RIDERS
            </span>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: '16px' }}>
              Have a Bike or Scooter? Earn Flexible Pocket Money!
            </h2>
            <p style={{ fontSize: '15px', color: '#D6C8BB', lineHeight: 1.6, marginBottom: '32px' }}>
              Drive between your classes and free hours. Give fellow campus students a lift and earn daily settlements with zero hidden deductions.
            </p>

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
                fontSize: '15px',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 8px 24px rgba(234, 88, 12, 0.4)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>Register as Driver Now</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 7. FOOTER */}
      {/* ============================================================ */}
      <footer
        style={{
          borderTop: '1.5px solid #EFE4D6',
          background: '#FFFFFF',
          padding: '48px 24px 32px'
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '24px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img
              src="/papidologo.jpeg"
              alt="Papido Logo"
              style={{ width: '36px', height: '36px', borderRadius: '10px', objectFit: 'contain' }}
            />
            <div>
              <div style={{ fontSize: '16px', fontWeight: 900, color: '#1F1A16' }}>PAPIDO</div>
              <div style={{ fontSize: '11.5px', color: '#796D61' }}>
                Pondicherry University Campus Mobility
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', fontSize: '13px', color: '#57483B', fontWeight: 600 }}>
            <button
              type="button"
              onClick={onGoToLogin}
              style={{ background: 'none', border: 'none', color: '#57483B', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => onGoToRegister ? onGoToRegister() : onGoToLogin()}
              style={{ background: 'none', border: 'none', color: '#57483B', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
            >
              Create Account
            </button>
            {onGoToAdmin && (
              <button
                type="button"
                onClick={onGoToAdmin}
                style={{ background: 'none', border: 'none', color: '#EA580C', cursor: 'pointer', fontSize: '13px', fontWeight: 700 }}
              >
                Admin Portal
              </button>
            )}
          </div>
        </div>

        <div
          style={{
            maxWidth: '1200px',
            margin: '24px auto 0',
            paddingTop: '20px',
            borderTop: '1px solid #F3ECE2',
            textAlign: 'center',
            fontSize: '12px',
            color: '#A39587'
          }}
        >
          &copy; {new Date().getFullYear()} Papido Campus Mobility &bull; Pondicherry University &bull; Built for Safe Student Rides
        </div>
      </footer>

      <style>{`
        @media (min-width: 768px) {
          .desktop-nav {
            display: flex !important;
          }
          .mobile-nav-toggle {
            display: none !important;
          }
        }
        @media (max-width: 767px) {
          .mobile-nav-toggle {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
}
