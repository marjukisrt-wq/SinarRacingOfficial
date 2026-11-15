import React from 'react';

/**
 * BrandLogo: Sinar Racing Official
 * Menggunakan logo resmi bengkel Sinar Racing Official yang diselaraskan dengan livery balap (Merah, Emas/Kuning, Chrome Silver, & Carbon Dark).
 */
export const BrandLogo = ({
  variant = 'horizontal', // 'horizontal' | 'vertical' | 'icon-only' | 'thermal'
  size = 'md',            // 'sm' | 'md' | 'lg'
  style = {},
  className = '',
}) => {
  // Pengaturan dimensi logo berdasarkan ukuran
  const heightMap = {
    sm: 34,
    md: 48,
    lg: 72,
  };
  const h = heightMap[size] || 48;

  // Mode Struk Thermal (Monochrome 1-bit)
  if (variant === 'thermal') {
    return (
      <div
        className={`brand-logo-thermal ${className}`}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto',
          ...style,
        }}
      >
        <img
          src="/logo-thermal.png"
          alt="Sinar Racing Official"
          style={{
            maxWidth: '200px',
            width: '85%',
            height: 'auto',
            display: 'block',
            margin: '0 auto',
            filter: 'contrast(180%)',
          }}
          onError={(e) => {
            // Fallback teks jika file logo thermal tidak tersedia
            e.currentTarget.style.display = 'none';
          }}
        />
      </div>
    );
  }

  // Mode Icon Only
  if (variant === 'icon-only') {
    return (
      <img
        src="/logo.png"
        alt="Sinar Racing Official"
        className={className}
        style={{
          height: `${h}px`,
          width: 'auto',
          objectFit: 'contain',
          filter: 'drop-shadow(0 2px 10px rgba(225, 29, 72, 0.45))',
          ...style,
        }}
      />
    );
  }

  // Mode Horizontal (Navbar / Header)
  if (variant === 'horizontal') {
    return (
      <div
        className={`brand-logo-horizontal ${className}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          userSelect: 'none',
          ...style,
        }}
      >
        <img
          src="/logo.png"
          alt="Sinar Racing Official"
          style={{
            height: `${h}px`,
            maxWidth: size === 'sm' ? '170px' : '220px',
            width: 'auto',
            objectFit: 'contain',
            filter: 'drop-shadow(0 3px 10px rgba(225, 29, 72, 0.4)) drop-shadow(0 1px 4px rgba(250, 204, 21, 0.3))',
            transition: 'transform 0.2s ease',
          }}
        />
      </div>
    );
  }

  // Mode Vertical (Login Screen & Splash Modal)
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
      <img
        src="/logo.png"
        alt="Sinar Racing Official"
        style={{
          height: `${h}px`,
          maxWidth: '290px',
          width: 'auto',
          objectFit: 'contain',
          marginBottom: '0.65rem',
          filter: 'drop-shadow(0 4px 18px rgba(225, 29, 72, 0.55)) drop-shadow(0 2px 8px rgba(250, 204, 21, 0.35))',
        }}
      />
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        padding: '0.2rem 0.75rem',
        background: 'rgba(225, 29, 72, 0.12)',
        border: '1px solid rgba(225, 29, 72, 0.35)',
        borderRadius: '999px',
        marginTop: '0.25rem',
      }}>
        <span style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: '#facc15',
          boxShadow: '0 0 8px #facc15',
        }} />
        <span style={{
          fontSize: '0.68rem',
          fontWeight: 800,
          fontFamily: 'var(--font-mono, monospace)',
          letterSpacing: '0.18em',
          color: '#facc15',
          textTransform: 'uppercase',
        }}>
          OFFICIAL WORKSHOP & POS
        </span>
      </div>
    </div>
  );
};

export default BrandLogo;
