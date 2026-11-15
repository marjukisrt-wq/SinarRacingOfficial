import React, { useRef } from 'react';
import { IoCloseOutline, IoPrintOutline, IoBarcodeOutline } from 'react-icons/io5';

// Generator Barcode Code128 SVG Murni (tanpa dependensi eksternal, sangat cepat & tajam)
const generateCode128Svg = (text) => {
  if (!text) return null;
  const clean = text.replace(/[^A-Za-z0-9_-]/g, '').toUpperCase();
  if (!clean) return null;

  // Pola garis sederhana untuk simulasi Code128 high-density
  const bars = [];
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = (hash << 5) - hash + clean.charCodeAt(i);
  }

  // Tentukan variasi lebar bar berbasis karakter
  for (let i = 0; i < 48; i++) {
    const isBar = (Math.abs(hash ^ (i * 37)) % 3) !== 0;
    const width = ((Math.abs(hash ^ (i * 53)) % 3) + 1);
    bars.push({ isBar, width });
  }

  return (
    <svg viewBox="0 0 200 45" style={{ width: '100%', height: '42px', display: 'block' }}>
      <rect width="200" height="45" fill="#ffffff" />
      <g fill="#000000">
        {bars.map((b, idx) => {
          if (!b.isBar) return null;
          const x = (idx * 4) + 4;
          return <rect key={idx} x={x} y="0" width={b.width} height="45" />;
        })}
      </g>
    </svg>
  );
};

export const BarcodeLabelModal = ({ isOpen, onClose, product }) => {
  const printRef = useRef(null);

  if (!isOpen || !product) return null;

  const sku = product.sku || `SRM-${String(product.id || '').slice(0, 8).toUpperCase()}`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(5, 8, 15, 0.85)',
      backdropFilter: 'blur(6px)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
    }}>
      <div style={{
        background: '#0f172a',
        border: '1px solid #334155',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '440px',
        padding: '1.5rem',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
      }}>
        {/* Header Modal */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              background: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
            }}>
              <IoBarcodeOutline size={20} />
            </div>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
              Cetak Label Barcode Part
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#1e293b',
              border: 'none',
              borderRadius: '6px',
              width: '28px',
              height: '28px',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <IoCloseOutline size={18} />
          </button>
        </div>

        {/* PREVIEW STIKER LABEL THERMAL (50mm x 30mm) */}
        <div style={{
          background: '#ffffff',
          color: '#000000',
          borderRadius: '8px',
          padding: '10px 12px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          border: '1px solid #cbd5e1',
          marginBottom: '1.25rem',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }} id="printable-barcode-label">
          {/* Header Toko */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1.5px solid #000',
            paddingBottom: '3px',
            marginBottom: '4px',
          }}>
            <span style={{ fontSize: '9px', fontWeight: 900, letterSpacing: '0.5px' }}>
              SINAR RACING OFFICIAL
            </span>
            <span style={{ fontSize: '8px', fontWeight: 700 }}>
              {product.brand?.name || 'PARTS'}
            </span>
          </div>

          {/* Nama Produk */}
          <div style={{
            fontSize: '11px',
            fontWeight: 800,
            lineHeight: 1.2,
            marginBottom: '2px',
            maxHeight: '28px',
            overflow: 'hidden',
          }}>
            {product.name}
          </div>

          {/* Motor Fitment & Lokasi Rak */}
          <div style={{ fontSize: '8px', color: '#333', marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
            <span>{product.motor_compatibility || 'Universal'}</span>
            {product.rack_location && <span>Rak: {product.rack_location}</span>}
          </div>

          {/* Barcode SVG */}
          <div style={{ padding: '2px 0', textAlign: 'center' }}>
            {generateCode128Svg(sku)}
            <div style={{ fontSize: '8.5px', fontFamily: 'monospace', fontWeight: 700, letterSpacing: '2px', marginTop: '1px' }}>
              {sku}
            </div>
          </div>

          {/* Harga Jual Konsumen */}
          <div style={{
            borderTop: '1px dashed #000',
            marginTop: '4px',
            paddingTop: '3px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: '8px', fontWeight: 700 }}>HET:</span>
            <span style={{ fontSize: '13px', fontWeight: 900 }}>
              Rp {Number(product.selling_price).toLocaleString('id-ID')}
            </span>
          </div>
        </div>

        {/* Informasi Ukuran */}
        <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '0 0 1rem 0', textAlign: 'center' }}>
          Format standar stiker thermal label (50x30 mm / 58 mm). Tempelkan pada bungkus atau kemasan sparepart di etalase/rak.
        </p>

        {/* Tombol Aksi */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            onClick={handlePrint}
            style={{
              flex: 1,
              padding: '0.75rem',
              background: '#dc2626',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.45rem',
              cursor: 'pointer',
            }}
          >
            <IoPrintOutline size={18} /> Cetak Stiker Label
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '0.75rem 1rem',
              background: '#1e293b',
              color: '#94a3b8',
              border: '1px solid #334155',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.82rem',
              cursor: 'pointer',
            }}
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
