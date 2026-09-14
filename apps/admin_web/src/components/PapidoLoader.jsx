import React, { useId } from 'react';

/**
 * PapidoLoader - Signature Animated SVG Brand Loader
 * Features continuous path stroke drawing and gradient rotation in Papido's warm brand theme.
 *
 * @param {string|number} size - 'xs' | 'sm' | 'md' | 'lg' | 'xl' or height in pixels
 * @param {string} text - Optional primary message displayed below the loader
 * @param {string} subtext - Optional secondary muted explanation
 * @param {boolean} fullScreen - Renders a fixed glassmorphic backdrop
 * @param {boolean} card - Wraps the loader in a styled cream card
 * @param {object} style - Additional inline styles for outer container
 * @param {string} className - Additional CSS class names
 */
export function PapidoLoader({
  size = 'md',
  text,
  subtext,
  fullScreen = false,
  card = false,
  style = {},
  className = ''
}) {
  const instanceId = useId().replace(/[:]/g, '_');

  const sizeMap = {
    xs: 20,
    sm: 28,
    md: 40,
    lg: 52,
    xl: 68
  };

  const pixelHeight = typeof size === 'number' ? size : (sizeMap[size] || 40);
  const letterWidth = Math.round(pixelHeight);
  const letterIWidth = Math.round(pixelHeight * 0.7);
  const strokeWidth = pixelHeight <= 24 ? 9 : 8;

  const gradOrangeId = `papido-grad-orange-${instanceId}`;
  const gradAmberSpinId = `papido-grad-amber-spin-${instanceId}`;
  const gradCoralId = `papido-grad-coral-${instanceId}`;

  const loaderContent = (
    <div
      className={`papido-loader-container ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        ...style
      }}
    >
      <div
        className="papido-letters-row"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: pixelHeight <= 28 ? '2px' : '4px',
          filter: 'drop-shadow(0 4px 12px rgba(234, 88, 12, 0.22))'
        }}
      >
        {/* Hidden Global Defs for Gradients */}
        <svg height="0" width="0" viewBox="0 0 64 64" style={{ position: 'absolute', pointerEvents: 'none' }}>
          <defs>
            {/* Gradient A: Warm Papido Flame Orange */}
            <linearGradient id={gradOrangeId} x1="0" y1="62" x2="0" y2="2" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#EA580C" />
              <stop offset="100%" stopColor="#F97316" />
            </linearGradient>

            {/* Gradient B: Rotating Golden Sun Amber (for O & Accents) */}
            <linearGradient id={gradAmberSpinId} x1="0" y1="64" x2="0" y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#EA580C" />
              <animateTransform
                attributeName="gradientTransform"
                type="rotate"
                dur="8s"
                repeatCount="indefinite"
                keyTimes="0; 0.125; 0.25; 0.375; 0.5; 0.625; 0.75; 0.875; 1"
                values="0 32 32;-270 32 32;-270 32 32;-540 32 32;-540 32 32;-810 32 32;-810 32 32;-1080 32 32;-1080 32 32"
                keySplines=".42,0,.58,1;.42,0,.58,1;.42,0,.58,1;.42,0,.58,1;.42,0,.58,1;.42,0,.58,1;.42,0,.58,1;.42,0,.58,1"
              />
            </linearGradient>

            {/* Gradient C: Sunset Coral Amber */}
            <linearGradient id={gradCoralId} x1="0" y1="62" x2="0" y2="2" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FB923C" />
              <stop offset="100%" stopColor="#C2410C" />
            </linearGradient>
          </defs>
        </svg>

        {/* 1. Letter P */}
        <svg
          viewBox="0 0 64 64"
          height={pixelHeight}
          width={letterWidth}
          style={{ display: 'inline-block', overflow: 'visible' }}
        >
          <path
            strokeLinejoin="round"
            strokeLinecap="round"
            strokeWidth={strokeWidth}
            stroke={`url(#${gradOrangeId})`}
            fill="none"
            d="M 18,58 V 8 H 34 A 13,13 0 0 1 34,34 H 18"
            className="papido-dash"
            pathLength="360"
          />
        </svg>

        {/* 2. Letter A */}
        <svg
          viewBox="0 0 64 64"
          height={pixelHeight}
          width={letterWidth}
          style={{ display: 'inline-block', overflow: 'visible' }}
        >
          <path
            strokeLinejoin="round"
            strokeLinecap="round"
            strokeWidth={strokeWidth}
            stroke={`url(#${gradCoralId})`}
            fill="none"
            d="M 14,58 L 32,8 L 50,58 M 21,38 H 43"
            className="papido-dash"
            pathLength="360"
          />
        </svg>

        {/* 3. Letter P */}
        <svg
          viewBox="0 0 64 64"
          height={pixelHeight}
          width={letterWidth}
          style={{ display: 'inline-block', overflow: 'visible' }}
        >
          <path
            strokeLinejoin="round"
            strokeLinecap="round"
            strokeWidth={strokeWidth}
            stroke={`url(#${gradOrangeId})`}
            fill="none"
            d="M 18,58 V 8 H 34 A 13,13 0 0 1 34,34 H 18"
            className="papido-dash"
            pathLength="360"
          />
        </svg>

        {/* 4. Letter I */}
        <svg
          viewBox="0 0 48 64"
          height={pixelHeight}
          width={letterIWidth}
          style={{ display: 'inline-block', overflow: 'visible' }}
        >
          <path
            strokeLinejoin="round"
            strokeLinecap="round"
            strokeWidth={strokeWidth}
            stroke={`url(#${gradAmberSpinId})`}
            fill="none"
            d="M 14,8 H 34 M 24,8 V 58 M 14,58 H 34"
            className="papido-dash"
            pathLength="360"
          />
        </svg>

        {/* 5. Letter D */}
        <svg
          viewBox="0 0 64 64"
          height={pixelHeight}
          width={letterWidth}
          style={{ display: 'inline-block', overflow: 'visible' }}
        >
          <path
            strokeLinejoin="round"
            strokeLinecap="round"
            strokeWidth={strokeWidth}
            stroke={`url(#${gradCoralId})`}
            fill="none"
            d="M 18,58 V 8 H 28 A 25,25 0 0 1 28,58 H 18 Z"
            className="papido-dash"
            pathLength="360"
          />
        </svg>

        {/* 6. Letter O (Signature Spinning Ring) */}
        <svg
          viewBox="0 0 64 64"
          height={pixelHeight}
          width={letterWidth}
          style={{ display: 'inline-block', overflow: 'visible' }}
        >
          <path
            strokeLinejoin="round"
            strokeLinecap="round"
            strokeWidth={strokeWidth}
            stroke={`url(#${gradAmberSpinId})`}
            fill="none"
            d="M 32 32 m 0 -25 a 25 25 0 1 1 0 50 a 25 25 0 1 1 0 -50"
            className="papido-spin"
            pathLength="360"
          />
        </svg>
      </div>

      {text && (
        <div
          style={{
            fontWeight: 800,
            fontSize: pixelHeight <= 28 ? '13px' : '15px',
            color: '#EA580C',
            letterSpacing: '0.2px',
            textAlign: 'center',
            marginTop: '4px'
          }}
        >
          {text}
        </div>
      )}

      {subtext && (
        <div
          style={{
            fontSize: '12px',
            color: '#78716C',
            textAlign: 'center',
            maxWidth: '320px',
            lineHeight: 1.4
          }}
        >
          {subtext}
        </div>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(250, 245, 238, 0.88)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}
      >
        <div
          style={{
            background: '#FFFFFF',
            border: '1.5px solid #FDBA74',
            borderRadius: '24px',
            padding: '36px 32px',
            boxShadow: '0 20px 50px rgba(234, 88, 12, 0.18)',
            maxWidth: '420px',
            width: '100%',
            textAlign: 'center'
          }}
        >
          {loaderContent}
        </div>
      </div>
    );
  }

  if (card) {
    return (
      <div
        style={{
          background: '#FFFFFF',
          border: '1.5px solid #FDBA74',
          borderRadius: '20px',
          padding: '28px 24px',
          boxShadow: '0 10px 30px rgba(234, 88, 12, 0.08)',
          textAlign: 'center',
          maxWidth: '520px',
          margin: '0 auto',
          width: '100%'
        }}
      >
        {loaderContent}
      </div>
    );
  }

  return loaderContent;
}

export default PapidoLoader;
