import React, { useEffect, useState } from 'react';
import './LandingView.css';
import { apiRequest } from '../api';
import {
  Bike, ShieldCheck, MapPin, Zap, Star, ArrowRight, Navigation, Wallet,
  PhoneCall, QrCode, Building2, Lock, Award, CalendarClock, BellRing,
  FileCheck2, Check, Menu, X, ArrowUpRight, Clock,
} from 'lucide-react';

const NAV = [
  ['how', 'How it works'],
  ['features', 'Features'],
  ['pricing', 'Pricing'],
  ['safety', 'Safety'],
];

export function LandingView({ onGoToLogin, onGoToRegister, onGoToRiderLogin }) {
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState(false);
  const [fare, setFare] = useState(25);

  // Live campus fare from Admin pricing rules (unchanged behaviour)
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await apiRequest('/fares/types');
        if (Array.isArray(res?.data)) {
          const cfg = res.data.find(c => c.vehicle_type === 'BIKE') || res.data[0];
          const n = parseFloat(cfg?.minimum_fare || cfg?.base_fare || 25);
          if (alive && !isNaN(n) && n > 0) setFare(Math.round(n));
        }
      } catch (_) {}
    };
    load();
    const t = setInterval(load, 15000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Scroll-reveal
  useEffect(() => {
    const els = document.querySelectorAll('.pm-reveal');
    const io = new IntersectionObserver(
      es => es.forEach(e => e.isIntersecting && (e.target.classList.add('is-in'), io.unobserve(e.target))),
      { threshold: 0.12 }
    );
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);

  const go = fn => { setMenu(false); if (typeof fn === 'function') fn(); };
  const doubleFare = Math.max(fare, fare * 2 - 10);

  return (
    <div className="pm-page">
      {/* NAV */}
      <header className={`pm-nav ${scrolled ? 'is-scrolled' : ''}`}>
        <div className="pm-nav-in">
          <a href="#top" className="pm-brand" aria-label="Papido home">
            <img src="/papidologo.jpeg" alt="" />
            <span>PAPIDO</span>
          </a>
          <nav className="pm-links" aria-label="Primary">
            {NAV.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}
          </nav>
          <div className="pm-nav-cta">
            <button className="pm-btn pm-btn--text" onClick={() => go(onGoToLogin)}>Sign in</button>
            <button className="pm-btn pm-btn--solid" onClick={() => go(onGoToRegister)}>
              Get started <ArrowRight size={15} />
            </button>
          </div>
          <button className="pm-burger" aria-label="Menu" aria-expanded={menu} onClick={() => setMenu(v => !v)}>
            {menu ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
        {menu && (
          <div className="pm-drawer">
            {NAV.map(([id, label]) => <a key={id} href={`#${id}`} onClick={() => setMenu(false)}>{label}</a>)}
            <button className="pm-btn pm-btn--solid pm-btn--block" onClick={() => go(onGoToRegister)}>Get started</button>
            <button className="pm-btn pm-btn--line pm-btn--block" onClick={() => go(onGoToLogin)}>Sign in</button>
          </div>
        )}
      </header>

      {/* HERO */}
      <section className="pm-hero" id="top">
        <div className="pm-glow" aria-hidden="true" />
        <div className="pm-wrap pm-hero-grid">
          <div className="pm-hero-copy">
            <span className="pm-pill"><span className="pm-live" /> Live on Pondicherry University campus</span>
            <h1>Campus rides,<br /><em>done right.</em></h1>
            <p>
              Verified student riders, one flat fare, and OTP-secured trips.
              From hostel to class, gate to city — in minutes.
            </p>
            <div className="pm-hero-btns">
              <button className="pm-btn pm-btn--solid pm-btn--lg" onClick={() => go(onGoToRegister)}>
                Book a ride <ArrowRight size={17} />
              </button>
              <button className="pm-btn pm-btn--glass pm-btn--lg" onClick={() => go(onGoToRiderLogin || onGoToLogin)}>
                <Bike size={17} /> Drive with Papido
              </button>
            </div>
            <dl className="pm-stats">
              <div><dt>~2.5 min</dt><dd>Avg. pickup</dd></div>
              <div><dt>4.8<Star size={14} fill="currentColor" /></dt><dd>Student rating</dd></div>
              <div><dt>₹{fare}</dt><dd>Flat campus fare</dd></div>
            </dl>
          </div>

          {/* Product visual */}
          <div className="pm-hero-vis" aria-hidden="true">
            <div className="pm-card pm-card--ride">
              <div className="pm-map">
                <svg viewBox="0 0 320 170" preserveAspectRatio="none">
                  <path d="M30 140 C 90 130, 110 60, 170 70 S 260 40, 292 28" className="pm-route" />
                </svg>
                <span className="pm-pin pm-pin--a" />
                <span className="pm-pin pm-pin--b" />
                <span className="pm-eta"><Clock size={12} /> 3 min away</span>
              </div>
              <div className="pm-ride-row">
                <div className="pm-avatar"><Bike size={18} /></div>
                <div>
                  <strong>Rahul S.</strong>
                  <small>Activa 6G · PY 01 AB 1234</small>
                </div>
                <span className="pm-rate"><Star size={12} fill="currentColor" /> 4.9</span>
              </div>
              <div className="pm-otp">
                <span>Share OTP to start</span>
                <b>4 2 8 1</b>
              </div>
            </div>
            <div className="pm-card pm-card--fare">
              <small>Trip fare</small>
              <strong>₹{fare}</strong>
              <span><Check size={12} /> No surge</span>
            </div>
            <div className="pm-card pm-card--ok"><ShieldCheck size={16} /> Verified rider</div>
          </div>
        </div>
      </section>

      {/* HOW */}
      <section className="pm-sec" id="how">
        <div className="pm-wrap">
          <Head kicker="How it works" title="Three taps. One campus. Zero surprises." />
          <div className="pm-steps">
            {[
              [MapPin, 'Pick your spots', 'Choose pickup and drop from 28+ campus stops — hostels, departments, gates and canteens.'],
              [Zap, 'Match in seconds', 'Nearby verified riders are pinged instantly. Typical campus match is under 30 seconds.'],
              [QrCode, 'Ride & verify', 'Share your 4-digit OTP on arrival. Pay cash or UPI at drop — no card needed.'],
            ].map(([Icon, t, b], i) => (
              <article key={t} className="pm-step pm-reveal" style={{ '--d': `${i * 90}ms` }}>
                <span className="pm-step-n">0{i + 1}</span>
                <span className="pm-ico"><Icon size={22} /></span>
                <h3>{t}</h3>
                <p>{b}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES — bento */}
      <section className="pm-sec pm-sec--alt" id="features">
        <div className="pm-wrap">
          <Head kicker="Built for two sides" title="One platform for passengers and riders." />
          <div className="pm-bento">
            <article className="pm-tile pm-tile--lg pm-reveal">
              <span className="pm-tag">For passengers</span>
              <h3>From hostel to class — without the walk.</h3>
              <ul className="pm-ticks">
                <li><Check size={15} /> Schedule rides ahead for early classes</li>
                <li><Check size={15} /> Female-rider option in a single toggle</li>
                <li><Check size={15} /> Live route, driver location and ETA</li>
              </ul>
              <button className="pm-link" onClick={() => go(onGoToRegister)}>
                Create passenger account <ArrowUpRight size={16} />
              </button>
              <div className="pm-mini">
                <div><MapPin size={14} /> SJC Hostel</div>
                <div><Navigation size={14} /> Main Gate 1</div>
                <button tabIndex={-1}>Confirm · ₹{fare}</button>
              </div>
            </article>

            <article className="pm-tile pm-tile--dark pm-reveal" style={{ '--d': '90ms' }}>
              <span className="pm-tag pm-tag--dark">For riders</span>
              <h3>Turn gaps between lectures into earnings.</h3>
              <div className="pm-earn"><small>Today’s net</small><strong>₹318</strong><span>12 trips</span></div>
              <button className="pm-link pm-link--light" onClick={() => go(onGoToRiderLogin || onGoToRegister)}>
                Register as a rider <ArrowUpRight size={16} />
              </button>
            </article>

            {[
              [Wallet, 'Transparent split', 'Clear platform cut. No hidden deductions.'],
              [CalendarClock, 'Advance bookings', 'Claim rides hours ahead and plan your shift.'],
              [BellRing, 'Never miss a request', 'Loud chime and on-screen alert for every ride.'],
              [FileCheck2, 'Fast KYC', 'Campus ID, DL and RC verified quickly.'],
            ].map(([Icon, t, b], i) => (
              <article key={t} className="pm-tile pm-tile--sm pm-reveal" style={{ '--d': `${(i + 2) * 70}ms` }}>
                <span className="pm-ico pm-ico--sm"><Icon size={18} /></span>
                <h4>{t}</h4>
                <p>{b}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="pm-sec" id="pricing">
        <div className="pm-wrap">
          <Head kicker="Pricing" title={`One flat fare. ₹${fare} anywhere on campus.`}
            sub="Only outer-campus trips are quoted by our dispatch team." />
          <div className="pm-prices">
            <Price name="Standard" price={`₹${fare}`} desc="Any hostel, department, gate or canteen."
              items={['Flat rate, all campus stops', 'Bike & scooter', 'Cash or UPI at drop']} />
            <Price featured name="Double ride" price={`₹${doubleFare}`} desc="Two passengers, one bike."
              items={['Save ₹10 vs two single rides', 'Same pickup and drop', 'One OTP, one trip']} />
            <Price name="Outside campus" price="Custom" desc="Rock Beach, Bus Stand, JIPMER, Auroville and beyond."
              items={['Fair quote before you confirm', 'Rider assigned by dispatch', 'Live status until drop']} />
          </div>
        </div>
      </section>

      {/* SAFETY */}
      <section className="pm-sec pm-sec--alt" id="safety">
        <div className="pm-wrap">
          <Head kicker="Safety" title="Trust built into every ride." />
          <div className="pm-safety">
            {[
              [ShieldCheck, 'Verified riders', 'Campus ID, licence and RC reviewed before approval.'],
              [Lock, 'OTP-secured trips', 'A ride starts only when you share your OTP.'],
              [Navigation, 'Live tracking', 'Location refreshed every few seconds.'],
              [PhoneCall, 'One-tap contact', 'Call your rider or passenger from the app.'],
              [Building2, 'Campus-only fleet', 'Core members and approved students only.'],
              [Award, 'Ratings that matter', 'Every trip is rated to uphold standards.'],
            ].map(([Icon, t, b], i) => (
              <article key={t} className="pm-safe pm-reveal" style={{ '--d': `${i * 60}ms` }}>
                <Icon size={20} />
                <div><h4>{t}</h4><p>{b}</p></div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="pm-sec">
        <div className="pm-wrap">
          <div className="pm-cta pm-reveal">
            <div className="pm-glow pm-glow--cta" aria-hidden="true" />
            <h2>Ready when you are.</h2>
            <p>Sign up in under a minute. No card required. Verified students only.</p>
            <div className="pm-hero-btns pm-center">
              <button className="pm-btn pm-btn--solid pm-btn--lg" onClick={() => go(onGoToRegister)}>
                Get started free <ArrowRight size={17} />
              </button>
              <button className="pm-btn pm-btn--glass pm-btn--lg" onClick={() => go(onGoToLogin)}>
                I have an account
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="pm-foot">
        <div className="pm-wrap pm-foot-in">
          <a href="#top" className="pm-brand"><img src="/papidologo.jpeg" alt="" /><span>PAPIDO</span></a>
          <nav>{NAV.map(([id, l]) => <a key={id} href={`#${id}`}>{l}</a>)}</nav>
          <small>© {new Date().getFullYear()} Papido · Puducherry, India · Built with students, for students.</small>
        </div>
      </footer>
    </div>
  );
}

function Head({ kicker, title, sub }) {
  return (
    <div className="pm-head pm-reveal">
      <span className="pm-kicker">{kicker}</span>
      <h2>{title}</h2>
      {sub && <p>{sub}</p>}
    </div>
  );
}

function Price({ name, price, desc, items, featured }) {
  return (
    <article className={`pm-price pm-reveal ${featured ? 'is-featured' : ''}`}>
      {featured && <span className="pm-badge">Best value</span>}
      <h3>{name}</h3>
      <div className="pm-amt">{price}</div>
      <p>{desc}</p>
      <ul>{items.map(x => <li key={x}><Check size={15} /> {x}</li>)}</ul>
    </article>
  );
}

export default LandingView;
