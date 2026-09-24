import React, { useEffect, useRef, useState } from 'react';
import './LandingView.css';
import { apiRequest } from '../api';
import {
  Bike, ShieldCheck, MapPin, Clock, Zap, Users, Star, ArrowRight,
  Sparkles, Award, Navigation, Wallet, PhoneCall, QrCode, Route,
  Building2, GraduationCap, Car, MessageSquare, ChevronRight,
  CheckCircle2, Gauge, LayoutGrid, Lock, Sun, Moon,
  CircleDollarSign, Calendar, Volume2, FileText, Wallet as WalletIconLucide
} from 'lucide-react';

function DollarIcon(p) { return <CircleDollarSign {...p} />; }
function CalendarIcon(p) { return <Calendar {...p} />; }
function VolumeIcon(p) { return <Volume2 {...p} />; }
function FileIcon(p) { return <FileText {...p} />; }
function WalletIcon(p) { return <WalletIconLucide {...p} />; }

export function LandingView({
  onGoToLogin,
  onGoToRegister,
  onGoToAdminPortal,
  onGoToRiderLogin,
}) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [standardFare, setStandardFare] = useState(25);
  const heroRef = useRef(null);

  // Dynamically load standard campus fare configured in Admin Pricing Rules
  useEffect(() => {
    let isMounted = true;
    const fetchFare = async () => {
      try {
        const res = await apiRequest('/fares/types');
        if (Array.isArray(res?.data)) {
          const bikeCfg = res.data.find(c => c.vehicle_type === 'BIKE') || res.data[0];
          if (bikeCfg) {
            const fareNum = parseFloat(bikeCfg.minimum_fare || bikeCfg.base_fare || 25);
            if (!isNaN(fareNum) && fareNum > 0 && isMounted) {
              setStandardFare(Math.round(fareNum));
            }
          }
        }
      } catch (_) {}
    };
    fetchFare();
    const interval = setInterval(fetchFare, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const doubleRideFare = Math.max(standardFare, (standardFare * 2) - 10);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Soft parallax on hero orbs
  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;
    const onMove = (e) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 20;
      const y = (e.clientY / window.innerHeight - 0.5) * 20;
      hero.style.setProperty('--px', `${x}px`);
      hero.style.setProperty('--py', `${y}px`);
    };
    hero.addEventListener('mousemove', onMove);
    return () => hero.removeEventListener('mousemove', onMove);
  }, []);

  const go = (fn) => {
    setMobileMenuOpen(false);
    if (typeof fn === 'function') fn();
  };

  return (
    <div className="pl-page theme-orange-beige">
      {/* ============================================================
          TOP NAVBAR
          ============================================================ */}
      <header className={`pl-nav ${scrolled ? 'is-scrolled' : ''}`}>
        <div className="pl-nav-inner">
          <a className="pl-brand" href="#top" aria-label="Papido home">
            <img src="/papidologo.jpeg" alt="Papido" className="pl-brand-logo" />
            <div className="pl-brand-text">
              <span className="pl-brand-name">PAPIDO</span>
              <span className="pl-brand-tag">Campus Mobility</span>
            </div>
          </a>

          <nav className="pl-nav-links" aria-label="Primary">
            <a href="#how">How it works</a>
            <a href="#passengers">For Passengers</a>
            <a href="#riders">For Riders</a>
            <a href="#pricing">Pricing</a>
            <a href="#safety">Safety</a>
          </nav>

          <div className="pl-nav-actions">
            <button className="pl-btn pl-btn--ghost" onClick={() => go(onGoToLogin)}>
              Sign In
            </button>
            <button className="pl-btn pl-btn--primary" onClick={() => go(onGoToRegister)}>
              Get Started <ArrowRight size={14} />
            </button>
          </div>

          <button
            className="pl-nav-burger"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen(v => !v)}
          >
            <span className={`pl-burger ${mobileMenuOpen ? 'is-open' : ''}`} />
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="pl-mobile-menu">
            <a href="#how" onClick={() => setMobileMenuOpen(false)}>How it works</a>
            <a href="#passengers" onClick={() => setMobileMenuOpen(false)}>For Passengers</a>
            <a href="#riders" onClick={() => setMobileMenuOpen(false)}>For Riders</a>
            <a href="#pricing" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
            <a href="#safety" onClick={() => setMobileMenuOpen(false)}>Safety</a>
            <div className="pl-mobile-menu-cta">
              <button className="pl-btn pl-btn--ghost" onClick={() => go(onGoToLogin)}>Sign In</button>
              <button className="pl-btn pl-btn--primary" onClick={() => go(onGoToRegister)}>Get Started</button>
            </div>
          </div>
        )}
      </header>

      {/* ============================================================
          HERO
          ============================================================ */}
      <section className="pl-hero" id="top" ref={heroRef}>
        <div className="pl-hero-bg" aria-hidden="true">
          <span className="orb orb--a" />
          <span className="orb orb--b" />
          <span className="orb orb--c" />
          <div className="pl-hero-grid-overlay" />
        </div>

        <div className="pl-hero-inner">
          <div className="pl-hero-copy">
            <span className="pl-eyebrow">
              <Sparkles size={13} /> Pondicherry University Campus Mobility
            </span>

            <h1 className="pl-hero-title">
              Get anywhere on campus — <span className="pl-hero-highlight">in minutes</span>.
            </h1>

            <p className="pl-hero-sub">
              Fair, verified, student-partnered rides across Pondicherry University
              and around Puducherry. Clear fares, live tracking, and OTP-secured trips —
              from hostel to class, gate to city.
            </p>

            <div className="pl-hero-cta-row">
              <button className="pl-btn pl-btn--primary pl-btn--lg pl-btn--ripple" onClick={() => go(onGoToRegister)}>
                Book a ride <ArrowRight size={16} />
              </button>
              <button className="pl-btn pl-btn--outline pl-btn--lg" onClick={() => go(onGoToRiderLogin || onGoToLogin)}>
                <Bike size={16} /> Drive with Papido
              </button>
            </div>

            <div className="pl-hero-stats">
              <div className="pl-hero-stat">
                <Gauge size={16} />
                <div>
                  <strong>~2.5 min</strong>
                  <span>Average pickup</span>
                </div>
              </div>
              <div className="pl-hero-stat">
                <Users size={16} />
                <div>
                  <strong>14+</strong>
                  <span>Hostels &amp; blocks</span>
                </div>
              </div>
              <div className="pl-hero-stat">
                <Star size={16} />
                <div>
                  <strong>4.8 / 5</strong>
                  <span>Student rating</span>
                </div>
              </div>
            </div>
          </div>

          {/* Hero visual: stylized live-ride card stack */}
          <div className="pl-hero-visual" aria-hidden="true">
            <div className="pl-hero-card pl-hero-card--main">
              <div className="pl-mock-map">
                <span className="pl-mock-route" />
                <span className="pl-mock-dot pl-mock-dot--from" />
                <span className="pl-mock-dot pl-mock-dot--to" />
                <span className="pl-mock-rider" />
              </div>
              <div className="pl-mock-row">
                <div className="pl-mock-avatar"><Bike size={16} /></div>
                <div className="pl-mock-meta">
                  <strong>Rahul S.</strong>
                  <span>Activa 6G · PY 01 AB 1234</span>
                </div>
                <span className="pl-mock-rating"><Star size={11} fill="#D97706" color="#D97706" /> 4.9</span>
              </div>
              <div className="pl-mock-otp">
                <span>Ride OTP</span>
                <strong>4 2 8 1</strong>
              </div>
            </div>

            <div className="pl-hero-card pl-hero-card--fare">
              <span className="pl-mock-fare-label">Trip fare</span>
              <strong className="pl-mock-fare-value">₹{standardFare}</strong>
              <span className="pl-mock-fare-note">Flat campus rate</span>
            </div>

            <div className="pl-hero-card pl-hero-card--badge">
              <ShieldCheck size={14} />
              <span>OTP verified rider</span>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          HOW IT WORKS
          ============================================================ */}
      <section className="pl-section" id="how">
        <div className="pl-container">
          <div className="pl-section-head">
            <span className="pl-eyebrow"><Route size={13} /> How Papido works</span>
            <h2>Three taps. One campus. Zero surprises.</h2>
            <p>Book a ride in under 20 seconds, pay exactly what you see, and track every step.</p>
          </div>

          <div className="pl-steps">
            {[
              { n: '01', icon: MapPin, title: 'Pick your spots', body: 'Choose pickup and drop from 28+ campus stops — hostels, departments, gates, libraries and canteen.' },
              { n: '02', icon: Zap, title: 'Match in seconds', body: 'Nearby verified riders get an instant ping. Average campus match time is under 30 seconds.' },
              { n: '03', icon: QrCode, title: 'Ride & verify', body: 'Share your 4-digit OTP on arrival. Cash or UPI at drop — no card, no waiting.' },
            ].map((s, i) => (
              <article key={s.n} className="pl-step pl-fade-up" style={{ animationDelay: `${i * 80}ms` }}>
                <span className="pl-step-num">{s.n}</span>
                <span className="pl-step-icon"><s.icon size={22} /></span>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          FOR PASSENGERS
          ============================================================ */}
      <section className="pl-section pl-section--tint" id="passengers">
        <div className="pl-container pl-split">
          <div className="pl-split-copy">
            <span className="pl-eyebrow"><GraduationCap size={13} /> For passengers</span>
            <h2>From hostel to class — without the walk.</h2>
            <p className="pl-lead">
              A mobile-friendly booking flow built for student thumb zones. Everything you need is one tap away.
            </p>

            <ul className="pl-checklist">
              {[
                { icon: Clock, text: 'Schedule rides ahead — catch a bus or an early class without stress.' },
                { icon: ShieldCheck, text: 'Female-rider option for verified safety, available in a single toggle.' },
                { icon: Wallet, text: `Transparent pricing — flat ₹${standardFare} campus fares, no surge, no hidden fees.` },
                { icon: Navigation, text: 'Live route on map, driver location, and ETA updated every few seconds.' },
                { icon: MessageSquare, text: 'Rate your trip and help keep the community strong.' },
              ].map((row, i) => (
                <li key={i} className="pl-check-row pl-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
                  <span className="pl-check-icon"><row.icon size={16} /></span>
                  <span>{row.text}</span>
                </li>
              ))}
            </ul>

            <button className="pl-btn pl-btn--primary pl-btn--lg" onClick={() => go(onGoToRegister)}>
              Create passenger account <ArrowRight size={16} />
            </button>
          </div>

          <div className="pl-split-visual">
            <div className="pl-phone-frame">
              <div className="pl-phone-notch" />
              <div className="pl-phone-body">
                <div className="pl-phone-header">
                  <span className="pl-phone-title">Booking</span>
                  <span className="pl-phone-pill">Ride now</span>
                </div>
                <div className="pl-phone-field">
                  <MapPin size={14} />
                  <span>SJC Hostel</span>
                </div>
                <div className="pl-phone-field">
                  <Navigation size={14} />
                  <span>Main Gate 1</span>
                </div>
                <div className="pl-phone-fare">
                  <div>
                    <span>Total</span>
                    <strong>₹{standardFare}</strong>
                  </div>
                  <span className="pl-phone-tag">Flat campus</span>
                </div>
                <button className="pl-phone-cta">Confirm ride</button>
                <div className="pl-phone-meta">
                  <ShieldCheck size={12} /> OTP verified · Live tracked
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          FOR RIDERS
          ============================================================ */}
      <section className="pl-section" id="riders">
        <div className="pl-container pl-split pl-split--reverse">
          <div className="pl-split-visual">
            <div className="pl-phone-frame pl-phone-frame--dark">
              <div className="pl-phone-notch" />
              <div className="pl-phone-body pl-phone-body--dark">
                <div className="pl-phone-header">
                  <span className="pl-phone-title">Dispatch radar</span>
                  <span className="pl-phone-pill pl-phone-pill--emerald">Online</span>
                </div>
                <div className="pl-radar">
                  <span className="pl-radar-ring pl-radar-ring--1" />
                  <span className="pl-radar-ring pl-radar-ring--2" />
                  <span className="pl-radar-ring pl-radar-ring--3" />
                  <span className="pl-radar-core" />
                </div>
                <div className="pl-phone-row">
                  <span>Today&apos;s net</span>
                  <strong>₹318</strong>
                </div>
                <div className="pl-phone-row">
                  <span>Trips</span>
                  <strong>12</strong>
                </div>
                <button className="pl-phone-cta pl-phone-cta--emerald">Accept next ride</button>
              </div>
            </div>
          </div>

          <div className="pl-split-copy">
            <span className="pl-eyebrow"><Bike size={13} /> For riders</span>
            <h2>Turn time between lectures into real earnings.</h2>
            <p className="pl-lead">
              Papido&apos;s rider portal is built for two-wheeler students on campus — light, fast, and always in your pocket.
            </p>

            <ul className="pl-checklist">
              {[
                { icon: DollarIcon, text: 'Transparent split — clear platform and controller cuts, no hidden deductions.' },
                { icon: CalendarIcon, text: 'Advance bookings pool — claim rides hours ahead to plan your shift.' },
                { icon: VolumeIcon, text: 'Loud chime + on-screen alert for every incoming request. Never miss one.' },
                { icon: FileIcon, text: '150 KB KYC upload — Campus ID, DL and RC, verified fast.' },
                { icon: WalletIcon, text: 'Daily UPI settlement directly to your account with UTR proof.' },
              ].map((row, i) => (
                <li key={i} className="pl-check-row pl-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
                  <span className="pl-check-icon pl-check-icon--emerald"><row.icon size={16} /></span>
                  <span>{row.text}</span>
                </li>
              ))}
            </ul>

            <button className="pl-btn pl-btn--primary pl-btn--lg" onClick={() => go(onGoToRiderLogin || onGoToRegister)}>
              Register as a rider <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* ============================================================
          PRICING / FARE SNAPSHOT
          ============================================================ */}
      <section className="pl-section pl-section--tint" id="pricing">
        <div className="pl-container">
          <div className="pl-section-head">
            <span className="pl-eyebrow"><Wallet size={13} /> Simple, fair pricing</span>
            <h2>Campus flat fare — ₹{standardFare}.</h2>
            <p>Wherever you&apos;re going on campus, the fare stays the same. Only outer-campus trips are customised by our dispatch team.</p>
          </div>

          <div className="pl-price-grid">
            <div className="pl-price-card pl-fade-up">
              <span className="pl-price-tag">Standard campus</span>
              <div className="pl-price-value">₹{standardFare}</div>
              <p className="pl-price-desc">Any hostel, department, gate or canteen inside Pondicherry University.</p>
              <ul className="pl-price-list">
                <li><CheckCircle2 size={14} /> Flat rate, all campus stops</li>
                <li><CheckCircle2 size={14} /> Bike and scooter options</li>
                <li><CheckCircle2 size={14} /> Pay cash or UPI at drop</li>
              </ul>
            </div>

            <div className="pl-price-card pl-fade-up is-featured" style={{ animationDelay: '80ms' }}>
              <span className="pl-price-tag pl-price-tag--featured">Double ride</span>
              <div className="pl-price-value">₹{doubleRideFare}</div>
              <p className="pl-price-desc">Two passengers on one bike — perfect for roommates heading to class together.</p>
              <ul className="pl-price-list">
                <li><CheckCircle2 size={14} /> Save ₹10 vs two single rides</li>
                <li><CheckCircle2 size={14} /> Same pickup and drop for both</li>
                <li><CheckCircle2 size={14} /> One OTP, one smooth trip</li>
              </ul>
            </div>

            <div className="pl-price-card pl-fade-up" style={{ animationDelay: '160ms' }}>
              <span className="pl-price-tag">Outside campus</span>
              <div className="pl-price-value">Custom</div>
              <p className="pl-price-desc">Rock Beach, Bus Stand, JIPMER, Auroville and beyond — quoted by our dispatch team.</p>
              <ul className="pl-price-list">
                <li><CheckCircle2 size={14} /> Fair quote before you confirm</li>
                <li><CheckCircle2 size={14} /> Rider assigned by dispatch</li>
                <li><CheckCircle2 size={14} /> Live status until drop</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          SAFETY
          ============================================================ */}
      <section className="pl-section" id="safety">
        <div className="pl-container">
          <div className="pl-section-head">
            <span className="pl-eyebrow"><ShieldCheck size={13} /> Safety on every trip</span>
            <h2>Trust built into every ride.</h2>
            <p>Every driver is a verified Pondicherry University peer. Every trip is OTP-secured.</p>
          </div>

          <div className="pl-safety-grid">
            {[
              { icon: ShieldCheck, title: 'Verified riders', body: 'Campus ID, Driving Licence and vehicle RC reviewed before a rider is approved.' },
              { icon: Lock, title: 'OTP-secured trips', body: 'Each ride starts only when the passenger shares their 4-digit OTP with the rider.' },
              { icon: Navigation, title: 'Live tracking', body: 'Route and rider location updated every few seconds while your ride is active.' },
              { icon: PhoneCall, title: 'One-tap contact', body: 'Call your rider or passenger directly from the app — no numbers to type.' },
              { icon: Building2, title: 'Campus-only riders', body: 'Fleet is limited to Papido Core members and approved Pondicherry University students.' },
              { icon: Award, title: 'Ratings that matter', body: 'Every completed trip ends with a rating — riders are held to community standards.' },
            ].map((s, i) => (
              <article key={s.title} className="pl-safety-card pl-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
                <span className="pl-safety-icon"><s.icon size={20} /></span>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          FINAL CTA
          ============================================================ */}
      <section className="pl-final">
        <div className="pl-container pl-final-inner">
          <div>
            <h2>Ready when you are.</h2>
            <p>Sign up in under a minute. No card required. Verified students only.</p>
          </div>
          <div className="pl-final-cta">
            <button className="pl-btn pl-btn--primary pl-btn--lg pl-btn--ripple" onClick={() => go(onGoToRegister)}>
              Get started free <ArrowRight size={16} />
            </button>
            <button className="pl-btn pl-btn--outline pl-btn--lg" onClick={() => go(onGoToLogin)}>
              I already have an account
            </button>
          </div>
        </div>
      </section>

      {/* ============================================================
          FOOTER
          ============================================================ */}
      <footer className="pl-footer">
        <div className="pl-container pl-footer-inner">
          <div className="pl-footer-brand">
            <img src="/papidologo.jpeg" alt="Papido" className="pl-footer-logo" />
            <div>
              <strong>PAPIDO</strong>
              <span>Campus Mobility · Pondicherry University</span>
            </div>
          </div>

          <nav className="pl-footer-links">
            <a href="#how">How it works</a>
            <a href="#passengers">Passengers</a>
            <a href="#riders">Riders</a>
            <a href="#pricing">Pricing</a>
            <a href="#safety">Safety</a>
          </nav>
        </div>

        <div className="pl-footer-base">
          <span>© {new Date().getFullYear()} Papido · Puducherry, India</span>
          <span className="pl-footer-dot">·</span>
          <span>Built with students, for students.</span>
        </div>
      </footer>
    </div>
  );
}

export default LandingView;
