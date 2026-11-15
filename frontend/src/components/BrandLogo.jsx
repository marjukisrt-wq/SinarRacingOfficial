import React from 'react';

/**
 * Pure Vector Icon & Brand Component: Sinar Racing Official
 * Desain vector murni (SVG), tajam di semua resolusi, tanpa artefak AI raster.
 */
export const BrandIcon = ({ size = 40, monochrome = false, className = '' }) => {
  const iconId = React.useId();
  const gradBlueId = `sr-grad-blue-${iconId}`;
  const gradGoldId = `sr-grad-gold-${iconId}`;
  const gradDarkId = `sr-grad-dark-${iconId}`;

  if (monochrome) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        {/* Border Shield */}
        <path
          d="M32 4L54 14V34C54 47 44 57 32 60C20 57 10 47 10 34V14L32 4Z"
          fill="#000000"
        />
        <path
          d="M32 7L51 16V34C51 45 42 54 32 57C22 54 13 45 13 34V16L32 7Z"
          fill="#ffffff"
        />
        {/* Speed Cut Stripes */}
        <path d="M19 22L24 16H29L24 22H19Z" fill="#000000" />
        <path d="M16 30L21 24H26L21 30H16Z" fill="#000000" />
        {/* Bold Racing Lightning S */}
        <path
          d="M38 16H27L22 32H32L26 48L44 28H33L38 16Z"
          fill="#000000"
        />
      </svg>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ filter: 'drop-shadow(0 4px 14px rgba(37, 99, 235, 0.45))' }}
    >
      <defs>
        {/* Gradient Biru Racing Turbo */}
        <linearGradient id={gradBlueId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="50%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>

        {/* Gradient Sinar Kilat (Gold/Amber Spark) */}
        <linearGradient id={gradGoldId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="40%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#ea580c" />
        </linearGradient>

        {/* Background Dark Carbon/Shield */}
        <linearGradient id={gradDarkId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#0b1120" />
        </linearGradient>

        <filter id={`glow-${iconId}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Outer Hex-Shield Racing Emblem */}
      <path
        d="M32 3L56 14V34C56 48 45 58 32 61C19 58 8 48 8 34V14L32 3Z"
        fill={`url(#${gradDarkId})`}
        stroke={`url(#${gradBlueId})`}
        strokeWidth="2.5"
      />

      {/* Internal Racing Speed Stripes */}
      <path d="M16 26L22 18H27L21 26H16Z" fill="white" fillOpacity="0.08" />
      <path d="M14 34L20 26H25L19 34H14Z" fill="white" fillOpacity="0.05" />
      <path d="M12 42L18 34H23L17 42H12Z" fill="white" fillOpacity="0.03" />

      {/* Inner Speed Accent Lines */}
      <path
        d="M49 19V33C49 43 41 51 32 54"
        stroke={`url(#${gradBlueId})`}
        strokeWidth="1.5"
        strokeDasharray="4 3"
        strokeOpacity="0.6"
      />

      {/* Central Bold Racing Lightning Bolt (Simbol SINAR & SPEED) */}
      <path
        d="M37 12H26L20 30H31L24 50L45 27H33L37 12Z"
        fill={`url(#${gradGoldId})`}
        stroke="#ffffff"
        strokeWidth="1"
        strokeLinejoin="round"
        filter={`url(#glow-${iconId})`}
      />

      {/* High-speed spark dots */}
      <circle cx="46" cy="18" r="1.5" fill="#38bdf8" />
      <circle cx="18" cy="46" r="1.5" fill="#f59e0b" />
    </svg>
  );
};

export const BrandLogo = ({
  variant = 'vertical', // 'vertical' | 'horizontal' | 'icon-only' | 'thermal'
  size = 'md',          // 'sm' | 'md' | 'lg'
  showBadge = true,
  subtitle,
  style = {},
  className = '',
}) => {
  const isThermal = variant === 'thermal';

  // Preset ukuran icon
  const iconSize = {
    sm: 32,
    md: 44,
    lg: 64,
  }[size] || 44;

  if (variant === 'icon-only') {
    return <BrandIcon size={iconSize} monochrome={isThermal} className={className} />;
  }

  // Desain Struk Thermal (Monochrome, bersih, 100% vector kompatibel cetak struk)
  if (isThermal) {
    return (
      <div
        className={`brand-logo-thermal ${className}`}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#000000',
          textAlign: 'center',
          margin: '0 auto',
          ...style,
        }}
      >
        <BrandIcon size={iconSize || 36} monochrome={true} />
        <div style={{
          fontFamily: 'var(--font-main, sans-serif)',
          fontWeight: 900,
          fontSize: '15px',
          letterSpacing: '0.08em',
          marginTop: '6px',
          textTransform: 'uppercase',
        }}>
          SINAR RACING
        </div>
        <div style={{
          fontFamily: 'var(--font-mono, monospace)',
          fontSize: '10px',
          fontWeight: 700,
          letterSpacing: '0.2em',
          borderTop: '1px solid #000',
          borderBottom: '1px solid #000',
          padding: '1px 8px',
          marginTop: '2px',
        }}>
          OFFICIAL GARAGE
        </div>
      </div>
    );
  }

  // Tampilan Horizontal (Cocok untuk Navbar)
  if (variant === 'horizontal') {
    return (
      <div
        className={`brand-logo-horizontal ${className}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: size === 'sm' ? '0.65rem' : '0.85rem',
          userSelect: 'none',
          ...style,
        }}
      >
        <BrandIcon size={iconSize} />
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontFamily: 'var(--font-main, sans-serif)',
            fontWeight: 900,
            fontStyle: 'italic',
            letterSpacing: '0.04em',
            fontSize: size === 'sm' ? '1.05rem' : size === 'lg' ? '1.45rem' : '1.2rem',
            color: '#ffffff',
            transform: 'skewX(-4deg)',
          }}>
            <span style={{ color: '#ffffff' }}>SINAR</span>
            <span style={{
              background: 'linear-gradient(135deg, #38bdf8 0%, #2563eb 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              RACING
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '2px' }}>
            <span style={{
              fontSize: size === 'sm' ? '0.62rem' : '0.72rem',
              fontWeight: 800,
              fontFamily: 'var(--font-mono, monospace)',
              letterSpacing: '0.16em',
              color: '#f59e0b',
              textTransform: 'uppercase',
            }}>
              OFFICIAL
            </span>
            {subtitle && (
              <span style={{ fontSize: '0.65rem', color: '#64748b' }}>
                • {subtitle}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Tampilan Vertical / Hero (Cocok untuk Login Screen & Splash Loading)
  return (
    <div
      className={`brand-logo-vertical ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        userSelect: 'none',
        ...style,
      }}
    >
      <div style={{ marginBottom: size === 'lg' ? '0.85rem' : '0.5rem' }}>
        <BrandIcon size={iconSize} />
      </div>

      <div style={{
        fontFamily: 'var(--font-main, sans-serif)',
        fontWeight: 900,
        fontStyle: 'italic',
        fontSize: size === 'lg' ? '1.65rem' : size === 'sm' ? '1.1rem' : '1.35rem',
        letterSpacing: '0.05em',
        lineHeight: 1.15,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.45rem',
        transform: 'skewX(-4deg)',
      }}>
        <span style={{
          color: '#ffffff',
          textShadow: '0 2px 10px rgba(0,0,0,0.5)',
        }}>
          SINAR
        </span>
        <span style={{
          background: 'linear-gradient(135deg, #38bdf8 0%, #3b82f6 50%, #2563eb 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          filter: 'drop-shadow(0 2px 8px rgba(56, 189, 248, 0.4))',
        }}>
          RACING
        </span>
      </div>

      {showBadge && (
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
          marginTop: '0.45rem',
          padding: '0.2rem 0.65rem',
          background: 'rgba(245, 158, 11, 0.12)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          borderRadius: '999px',
        }}>
          <span style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: '#f59e0b',
            boxShadow: '0 0 8px #f59e0b',
          }} />
          <span style={{
            fontSize: '0.68rem',
            fontWeight: 800,
            fontFamily: 'var(--font-mono, monospace)',
            letterSpacing: '0.16em',
            color: '#fbbf24',
            textTransform: 'uppercase',
          }}>
            OFFICIAL GARAGE & POS
          </span>
        </div>
      )}

      {subtitle && (
        <div style={{
          fontSize: '0.8rem',
          color: '#94a3b8',
          marginTop: '0.5rem',
        }}>
          {subtitle}
        </div>
      )}
    </div>
  );
};

export default BrandLogo;
