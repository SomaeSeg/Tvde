'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from './ui';

interface DetectedBarcode {
  rawValue: string;
}

interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>;
}

declare global {
  interface Window {
    BarcodeDetector?: new (options?: { formats: string[] }) => BarcodeDetectorLike;
  }
}

/**
 * Scanner de códigos de barras via câmara, usando a API nativa BarcodeDetector.
 * Em browsers sem suporte mostra entrada manual do código.
 */
export function BarcodeScanner({
  onDetected,
  onClose,
}: {
  onDetected: (code: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState('');

  useEffect(() => {
    const hasDetector = typeof window !== 'undefined' && !!window.BarcodeDetector;
    setSupported(hasDetector);
    if (!hasDetector) return;

    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });
        if (stopped || !videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        const detector = new window.BarcodeDetector!({
          formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'],
        });

        const scan = async () => {
          if (stopped || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes.length > 0) {
              onDetected(codes[0].rawValue);
              return;
            }
          } catch {
            // frame inválido — continua
          }
          raf = requestAnimationFrame(scan);
        };
        raf = requestAnimationFrame(scan);
      } catch {
        setError('Não foi possível aceder à câmara. Introduz o código manualmente.');
      }
    }

    start();
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onDetected]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95 p-4">
      <div className="mb-4 flex items-center justify-between text-white">
        <span className="font-medium">Aponta ao código de barras</span>
        <button onClick={onClose} className="rounded-full bg-white/10 px-3 py-1 text-sm">
          Fechar
        </button>
      </div>

      {supported && !error ? (
        <div className="relative flex-1 overflow-hidden rounded-2xl">
          <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
          <div className="pointer-events-none absolute inset-x-8 top-1/2 h-24 -translate-y-1/2 rounded-xl border-2 border-emerald-400" />
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center text-white">
          <p className="text-sm text-white/80">
            {error ?? 'Este browser não suporta leitura de códigos pela câmara.'}
          </p>
          <div className="flex w-full max-w-xs gap-2">
            <input
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              inputMode="numeric"
              placeholder="Código de barras"
              className="flex-1 rounded-xl border border-white/20 bg-white/10 px-3 py-2.5 text-sm text-white placeholder:text-white/40"
            />
            <Button disabled={manual.length < 6} onClick={() => onDetected(manual)}>
              OK
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
