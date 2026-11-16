import React, { useState, useEffect, useRef } from 'react';
import {
  IoCloseOutline,
  IoCameraOutline,
  IoFlashOutline,
  IoFlashOffOutline,
  IoSearchOutline,
  IoCartOutline,
  IoCheckmarkCircleOutline,
  IoAlertCircleOutline,
  IoBarcodeOutline,
  IoRefreshOutline,
} from 'react-icons/io5';
import {
  MultiFormatReader,
  BarcodeFormat,
  DecodeHintType,
  RGBLuminanceSource,
  HybridBinarizer,
  BinaryBitmap,
} from '@zxing/library';
import api from '../utils/api';
import { getCachedCatalog } from '../utils/offlineSync';

// Format barcode industri otomotif (termasuk Code 39 untuk Yamaha & Honda AHM, serta DataMatrix & Code 128)
const formats = [
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.CODE_93,
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.DATA_MATRIX,
  BarcodeFormat.QR_CODE,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.ITF,
];

const hints = new Map();
hints.set(DecodeHintType.POSSIBLE_FORMATS, formats);
hints.set(DecodeHintType.TRY_HARDER, true);

// Fungsi normalisasi kode part (menghilangkan strip, spasi, karakter non-alfanumerik)
const normalizeCode = (str) => {
  if (!str) return '';
  return String(str).toUpperCase().replace(/[^A-Z0-9]/g, '');
};

// Cek kecocokan cerdas kode barcode terhadap SKU & Nama Barang (mendukung barcode bawaan Yamaha & Honda)
export const isBarcodeMatch = (targetCode, productSku, productName) => {
  if (!targetCode) return false;
  const rawTarget = targetCode.trim().toLowerCase();
  const normTarget = normalizeCode(rawTarget);

  if (productSku) {
    const rawSku = productSku.trim().toLowerCase();
    const normSku = normalizeCode(rawSku);

    // Cocok persis
    if (rawSku === rawTarget || normSku === normTarget) return true;

    // Barcode OEM Yamaha (12 digit, contoh '3C1H21003000' cocok dengan SKU '3C1-H2100-30' atau '3C1H210030')
    if (normTarget.endsWith('00') && normTarget.slice(0, -2) === normSku) return true;
    if (normSku.endsWith('00') && normSku.slice(0, -2) === normTarget) return true;

    // Prefiks cocok
    if (normTarget.length >= 6 && normSku.length >= 6) {
      if (normTarget.startsWith(normSku) || normSku.startsWith(normTarget)) {
        return true;
      }
    }
  }

  // Cek apakah kode barcode ada di dalam nama barang
  if (productName) {
    const cleanName = productName.toLowerCase();
    const normName = normalizeCode(cleanName);
    if (normName.includes(normTarget) || (normTarget.length >= 6 && normName.includes(normTarget.slice(0, -2)))) {
      return true;
    }
  }

  return false;
};

// Format kode barcode Yamaha OEM (contoh: '3C1H21003000' -> '3C1-H2100-30')
export const formatYamahaOemCode = (code) => {
  if (!code) return '';
  const clean = normalizeCode(code);
  if (clean.length === 12 && clean.endsWith('00')) {
    const core = clean.slice(0, 10);
    return `${core.slice(0, 3)}-${core.slice(3, 8)}-${core.slice(8, 10)}`;
  }
  return code;
};

// Bunyi BEEP kasir saat scan berhasil (Web Audio API)
const playBeep = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400, ctx.currentTime);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  } catch (e) {}
};

export const BarcodeScannerModal = ({
  isOpen,
  onClose,
  mode = 'CHECK_PRICE', // 'CHECK_PRICE', 'ADD_TO_CART', atau 'CAPTURE_CODE'
  products = [],
  onAddToCart,
  onCaptureCode,
}) => {
  const [manualBarcode, setManualBarcode] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [torchOn, setTorchOn] = useState(false);
  const [scannedResult, setScannedResult] = useState(null);
  const [notFoundBarcode, setNotFoundBarcode] = useState(null);
  const [searchingRemote, setSearchingRemote] = useState(false);

  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scanLoopRef = useRef(null);
  const scanningRef = useRef(false);
  const zxingReaderRef = useRef(null);

  // Pencarian produk cerdas
  const lookupProduct = async (code) => {
    if (!code || !code.trim()) return null;
    const cleanCode = code.trim().toLowerCase();

    // 1. Coba cari di daftar produk lokal (props atau offline cache)
    const allLocal = (products && products.length > 0) ? products : (getCachedCatalog() || []);
    let match = allLocal.find((p) => {
      if (String(p.id).toLowerCase() === cleanCode) return true;
      if (isBarcodeMatch(cleanCode, p.sku, p.name)) return true;
      return false;
    });

    if (match) return match;

    // 2. Jika tidak ada di daftar lokal (misal kasir sedang memfilter tab merk lain), cari ke server
    try {
      setSearchingRemote(true);
      const res = await api.get('/products', { params: { search: code.trim(), limit: 1 } });
      const serverProducts = res.data?.data || [];
      if (serverProducts.length > 0) {
        return serverProducts[0];
      }
    } catch (e) {
      console.warn('Gagal remote lookup barcode:', e);
    } finally {
      setSearchingRemote(false);
    }

    return null;
  };

  const handleBarcodeFound = async (barcodeText) => {
    if (!barcodeText || scanningRef.current) return;
    scanningRef.current = true;
    playBeep();

    // Mode Khusus: Mengisi Kode Barcode / SKU saat Input Stok Barang Baru
    if (mode === 'CAPTURE_CODE') {
      if (onCaptureCode) {
        // Berikan kode barcode asli (atau format yang dikenali)
        onCaptureCode(barcodeText.trim());
      }
      onClose();
      scanningRef.current = false;
      return;
    }

    // Mode Cek Harga / Kasir POS
    const product = await lookupProduct(barcodeText);

    if (product) {
      setScannedResult(product);
      setNotFoundBarcode(null);

      if (mode === 'ADD_TO_CART' && onAddToCart) {
        onAddToCart(product);
      }
    } else {
      setScannedResult(null);
      setNotFoundBarcode(barcodeText);
    }

    // Jeda 1.2 detik sebelum scan berikutnya
    setTimeout(() => {
      scanningRef.current = false;
    }, 1200);
  };

  // Decode frame canvas menggunakan ZXing
  const decodeCanvasWithZXing = (canvas, reader) => {
    const width = canvas.width;
    const height = canvas.height;
    if (width === 0 || height === 0) return null;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    const int32 = new Int32Array(width * height);
    for (let i = 0; i < width * height; i++) {
      const offset = i * 4;
      int32[i] = (data[offset + 3] << 24) | (data[offset] << 16) | (data[offset + 1] << 8) | data[offset + 2];
    }

    const lum = new RGBLuminanceSource(int32, width, height);
    const bin = new HybridBinarizer(lum);
    const bitmap = new BinaryBitmap(bin);

    return reader.decode(bitmap, hints);
  };

  // Loop deteksi frame video kamera
  const startScanningLoop = () => {
    if (!videoRef.current) return;

    try {
      const zxingReader = new MultiFormatReader();
      zxingReaderRef.current = zxingReader;

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      let frameCount = 0;

      const tick = () => {
        if (!streamRef.current || !videoRef.current) return;

        const video = videoRef.current;
        if (video.readyState >= 2 && video.videoWidth > 0 && !scanningRef.current) {
          frameCount++;
          try {
            const vw = video.videoWidth;
            const vh = video.videoHeight;

            // Memfokuskan pembacaan pada kotak merah di tengah (ROI: Region of Interest)
            // Memaksimalkan ketajaman garis Code 39 pada kemasan motor
            const isFullScan = frameCount % 4 === 0;
            const roiW = isFullScan ? vw : Math.min(vw * 0.8, 640);
            const roiH = isFullScan ? vh : Math.min(vh * 0.45, 320);
            const sx = isFullScan ? 0 : (vw - roiW) / 2;
            const sy = isFullScan ? 0 : (vh - roiH) / 2;

            canvas.width = roiW;
            canvas.height = roiH;
            ctx.drawImage(video, sx, sy, roiW, roiH, 0, 0, roiW, roiH);

            const res = decodeCanvasWithZXing(canvas, zxingReader);
            if (res && res.getText()) {
              handleBarcodeFound(res.getText());
            }
          } catch (e) {
            // Normal: frame tidak mengandung barcode yang terbaca
          }
        }

        if (streamRef.current) {
          scanLoopRef.current = requestAnimationFrame(tick);
        }
      };

      scanLoopRef.current = requestAnimationFrame(tick);
    } catch (e) {
      console.warn('Gagal startScanningLoop:', e);
    }
  };

  // Deteksi Barcode dari Foto / Galeri (Mendukung upload foto dari kemasan Yamaha / Honda)
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const zxingReader = new MultiFormatReader();
      const fileUrl = URL.createObjectURL(file);
      const img = new Image();
      img.src = fileUrl;

      img.onload = () => {
        let detected = null;
        try {
          const w = img.naturalWidth || img.width;
          const h = img.naturalHeight || img.height;
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);

          // 1. Coba decode gambar asli
          try {
            const res = decodeCanvasWithZXing(canvas, zxingReader);
            if (res && res.getText()) detected = res.getText();
          } catch (e1) {
            // 2. Coba perjelas kontras jika kemasan plastik silau terkena lampu
            try {
              const c2 = document.createElement('canvas');
              c2.width = w;
              c2.height = h;
              const ctx2 = c2.getContext('2d');
              ctx2.filter = 'contrast(1.6) grayscale(1)';
              ctx2.drawImage(img, 0, 0);
              const res2 = decodeCanvasWithZXing(c2, zxingReader);
              if (res2 && res2.getText()) detected = res2.getText();
            } catch (e2) {}
          }
        } catch (err) {
          console.error(err);
        }

        URL.revokeObjectURL(fileUrl);
        if (detected) {
          handleBarcodeFound(detected);
        } else {
          alert('Barcode tidak terbaca dari foto. Anda juga bisa langsung mengetik kode part yang tertera (contoh: 3C1-H2100-30 atau 1S7-E2111-00) pada kolom di bawah lalu klik tombol "Pakai Kode".');
        }
      };
    } catch (err) {
      console.error('Gagal deteksi foto:', err);
    }
  };

  // Inisialisasi Kamera
  const startCamera = async () => {
    try {
      setCameraError(null);
      scanningRef.current = false;

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Browser ini tidak mendukung akses kamera langsung melalui WebRTC.');
        setCameraActive(false);
        return;
      }

      let stream = null;

      // 1. Coba kamera belakang (ideal untuk HP di bengkel)
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
      } catch (e1) {
        // 2. Fallback ke kamera apa pun (Webcam laptop/PC)
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
        } catch (e2) {
          throw e2;
        }
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = async () => {
          try {
            await videoRef.current.play();
            setCameraActive(true);
            startScanningLoop();
          } catch (e) {
            console.warn('Gagal play video stream:', e);
          }
        };
      }
    } catch (err) {
      console.warn('Tidak dapat membuka kamera:', err);
      let message = 'Kamera tidak dapat diakses.';

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        message = 'Izin kamera ditolak di browser. Klik ikon gembok / perizinan situs di alamat URL lalu izinkan Camera.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        message = 'Tidak ada perangkat kamera yang terdeteksi. Silakan gunakan input manual atau Barcode Gun USB.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        message = 'Kamera sedang digunakan oleh aplikasi lain.';
      } else {
        message = `Gagal membuka kamera (${err.message || err.name || 'Error'}). Silakan gunakan input manual.`;
      }

      setCameraError(message);
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (scanLoopRef.current) {
      cancelAnimationFrame(scanLoopRef.current);
      scanLoopRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    setTorchOn(false);
  };

  // Toggle Senter HP
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track) {
      try {
        const capabilities = track.getCapabilities?.() || {};
        if (capabilities.torch) {
          await track.applyConstraints({
            advanced: [{ torch: !torchOn }],
          });
          setTorchOn(!torchOn);
        } else {
          alert('Lampu senter tidak didukung pada kamera perangkat ini.');
        }
      } catch (e) {
        console.warn('Gagal mengubah senter:', e);
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
      setScannedResult(null);
      setNotFoundBarcode(null);
      setManualBarcode('');
    }

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualBarcode.trim()) {
      handleBarcodeFound(manualBarcode.trim());
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(5, 8, 15, 0.88)',
      backdropFilter: 'blur(8px)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
    }}>
      <div style={{
        background: '#0f172a',
        border: '1px solid #334155',
        borderRadius: '18px',
        width: '100%',
        maxWidth: '520px',
        maxHeight: '92vh',
        overflowY: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Header Modal */}
        <div style={{
          padding: '1rem 1.25rem',
          borderBottom: '1px solid #1e293b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(15, 23, 42, 0.95)',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #dc2626, #991b1b)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
            }}>
              <IoBarcodeOutline size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                {mode === 'CAPTURE_CODE' ? 'Foto / Scan Barcode Kemasan' : (mode === 'CHECK_PRICE' ? 'Cek Harga Sparepart' : 'Scan Barcode ke Kasir')}
              </h3>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>
                {mode === 'CAPTURE_CODE' ? 'Arahkan kamera ke barcode bungkus sparepart' : (mode === 'CHECK_PRICE' ? 'Arahkan kamera ke barcode part motor' : 'Scan barang untuk langsung masuk keranjang kasir')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#1e293b',
              border: 'none',
              borderRadius: '8px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#94a3b8',
              cursor: 'pointer',
            }}
          >
            <IoCloseOutline size={20} />
          </button>
        </div>

        {/* Viewfinder Kamera */}
        <div style={{ position: 'relative', background: '#020617', overflow: 'hidden', minHeight: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <video
            ref={videoRef}
            playsInline
            muted
            style={{
              width: '100%',
              height: '260px',
              objectFit: 'cover',
              display: cameraActive ? 'block' : 'none',
            }}
          />

          {cameraActive && (
            <>
              {/* Target Aiming Box */}
              <div style={{
                position: 'absolute',
                width: '250px',
                height: '145px',
                border: '2px solid #ef4444',
                borderRadius: '12px',
                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.55), 0 0 15px rgba(239, 68, 68, 0.4)',
                pointerEvents: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <div style={{
                  width: '90%',
                  height: '2px',
                  background: '#ef4444',
                  boxShadow: '0 0 8px #ef4444',
                }} />
              </div>

              {/* Tombol Senter HP */}
              <button
                type="button"
                onClick={toggleTorch}
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  background: torchOn ? '#facc15' : 'rgba(15, 23, 42, 0.75)',
                  color: torchOn ? '#0f172a' : '#f8fafc',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '50%',
                  width: '38px',
                  height: '38px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  zIndex: 5,
                }}
                title={torchOn ? 'Matikan Senter' : 'Nyalakan Senter'}
              >
                {torchOn ? <IoFlashOutline size={20} /> : <IoFlashOffOutline size={20} />}
              </button>
            </>
          )}

          {!cameraActive && (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', zIndex: 1 }}>
              <IoCameraOutline size={48} style={{ color: '#475569', marginBottom: '0.75rem' }} />
              <p style={{ fontSize: '0.85rem', marginBottom: '1rem', color: cameraError ? '#f87171' : '#94a3b8' }}>
                {cameraError || 'Kamera sedang disiapkan...'}
              </p>
              <button
                type="button"
                onClick={startCamera}
                style={{
                  background: '#dc2626',
                  color: '#fff',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <IoRefreshOutline size={16} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Coba Buka Kamera Lagi
              </button>
            </div>
          )}
        </div>

        {/* Input Manual / Barcode Gun USB */}
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #1e293b', background: '#0b1120' }}>
          <form onSubmit={handleManualSubmit} style={{ display: 'flex', gap: '0.5rem' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <IoSearchOutline style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input
                type="text"
                placeholder={mode === 'CAPTURE_CODE' ? 'Ketik kode part (contoh: 3C1-H2100-30)...' : 'Scan Barcode Gun atau ketik kode part...'}
                value={manualBarcode}
                onChange={(e) => setManualBarcode(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.75rem 0.65rem 2.2rem',
                  background: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: '#f8fafc',
                  fontSize: '0.85rem',
                  outline: 'none',
                }}
              />
            </div>
            <button
              type="submit"
              style={{
                background: '#dc2626',
                color: '#fff',
                border: 'none',
                padding: '0.65rem 1rem',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {mode === 'CAPTURE_CODE' ? '✓ Pakai Kode' : (searchingRemote ? 'Mencari...' : 'Cek')}
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{
                background: '#1e293b',
                color: '#38bdf8',
                border: '1px solid #334155',
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                whiteSpace: 'nowrap',
              }}
              title="Pilih gambar atau foto barcode kemasan dari galeri"
            >
              📷 Foto/Galeri
            </button>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              capture="environment"
              onChange={handlePhotoUpload}
              style={{ display: 'none' }}
            />
          </form>

          {/* Kotak Petunjuk Khusus Sparepart Yamaha / Honda */}
          <div style={{
            marginTop: '0.65rem',
            background: 'rgba(30, 41, 59, 0.7)',
            border: '1px dashed #334155',
            borderRadius: '6px',
            padding: '0.5rem 0.75rem',
            fontSize: '0.73rem',
            color: '#94a3b8',
            lineHeight: 1.45,
          }}>
            <strong style={{ color: '#facc15' }}>💡 Info Barcode Yamaha / Honda:</strong> Barcode resmi motor (Code 39) mengodekan nomor part tanpa tanda strip (misal: <code>3C1H21003000</code>). Sistem otomatis mengenali dan mencocokkannya ke kode part bertanda strip (<code>3C1-H2100-30</code>). Jika kemasan plastik berkerut atau silau, Anda bisa langsung ketik nomor part yang tertera lalu klik <strong>Pakai Kode</strong>.
          </div>

          {products && products.length > 0 && mode !== 'CAPTURE_CODE' && (
            <div style={{ marginTop: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Coba tes cepat part:</span>
              {products.slice(0, 4).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleBarcodeFound(p.sku || p.name)}
                  style={{
                    background: '#1e293b',
                    color: '#cbd5e1',
                    border: '1px solid #334155',
                    borderRadius: '4px',
                    padding: '2px 8px',
                    fontSize: '0.72rem',
                    cursor: 'pointer',
                  }}
                  title={`Klik untuk tes cek harga "${p.name}"`}
                >
                  {p.name.length > 20 ? p.name.slice(0, 20) + '...' : p.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* HASIL KARTU CEK HARGA */}
        <div style={{ padding: '1.25rem', flex: 1 }}>
          {scannedResult ? (
            <div style={{
              background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.1), rgba(15, 23, 42, 0.9))',
              border: '1px solid #ef4444',
              borderRadius: '12px',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  background: 'rgba(239, 68, 68, 0.2)',
                  color: '#f87171',
                  padding: '0.2rem 0.55rem',
                  borderRadius: '4px',
                }}>
                  {scannedResult.brand?.name || 'Sinar Racing'}
                </span>
                <span style={{
                  fontSize: '0.78rem',
                  color: Number(scannedResult.stock) > 0 ? '#4ade80' : '#f87171',
                  fontWeight: 700,
                }}>
                  {scannedResult.is_service ? 'Jasa Servis' : `Stok: ${scannedResult.stock} ${scannedResult.unit || 'pcs'}`}
                </span>
              </div>

              <div>
                <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc', margin: '0 0 0.25rem 0' }}>
                  {scannedResult.name}
                </h4>
                {scannedResult.sku && (
                  <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0 0 0.2rem 0' }}>
                    Kode Part / SKU: <strong style={{ color: '#facc15' }}>{scannedResult.sku}</strong>
                  </p>
                )}
                {scannedResult.motor_compatibility && (
                  <p style={{ fontSize: '0.8rem', color: '#cbd5e1', margin: 0 }}>
                    Cocok: <span style={{ color: '#facc15' }}>{scannedResult.motor_compatibility}</span>
                  </p>
                )}
                {scannedResult.rack_location && (
                  <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '0.2rem 0 0 0' }}>
                    Lokasi Rak: <strong style={{ color: '#f8fafc' }}>{scannedResult.rack_location}</strong>
                  </p>
                )}
              </div>

              {/* Harga Jual Besar */}
              <div style={{
                background: '#090d16',
                border: '1px dashed rgba(250, 204, 21, 0.35)',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
              }}>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>Harga Jual Konsumen</span>
                <span style={{ fontSize: '1.45rem', fontWeight: 900, color: '#facc15', fontFamily: 'var(--font-mono)' }}>
                  Rp {Number(scannedResult.selling_price).toLocaleString('id-ID')}
                </span>
              </div>

              {/* Tombol Aksi */}
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                {onAddToCart && (
                  <button
                    type="button"
                    onClick={() => {
                      onAddToCart(scannedResult);
                      playBeep();
                      if (mode === 'CHECK_PRICE') {
                        setScannedResult(null);
                      }
                    }}
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
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
                    <IoCartOutline size={18} /> + Masukkan ke Kasir
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setScannedResult(null)}
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
                  Scan Lainnya
                </button>
              </div>
            </div>
          ) : notFoundBarcode ? (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px dashed #ef4444',
              borderRadius: '12px',
              padding: '1.25rem',
              textAlign: 'center',
            }}>
              <IoAlertCircleOutline size={36} style={{ color: '#f87171', marginBottom: '0.5rem' }} />
              <h5 style={{ color: '#f87171', fontSize: '0.95rem', margin: '0 0 0.35rem 0' }}>Barang Tidak Ditemukan</h5>
              <p style={{ fontSize: '0.8rem', color: '#cbd5e1', margin: 0 }}>
                Barcode <strong>"{notFoundBarcode}"</strong> belum terdaftar di data stok Sinar Racing.
              </p>
              <button
                type="button"
                onClick={() => setNotFoundBarcode(null)}
                style={{
                  marginTop: '0.75rem',
                  background: '#1e293b',
                  color: '#f8fafc',
                  border: 'none',
                  padding: '0.4rem 0.85rem',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                }}
              >
                Scan Ulang
              </button>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '1.5rem 1rem', color: '#64748b' }}>
              <p style={{ fontSize: '0.82rem', margin: 0 }}>
                Arahkan barcode part motor ke dalam kotak merah di atas, atau masukkan kode part secara manual.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
