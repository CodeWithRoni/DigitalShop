'use client';
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from 'react';

const COLORS = ['#ef4444', '#22c55e', '#3b82f6', '#a855f7', '#f59e0b', '#ec4899', '#14b8a6'];

export default function ProductIcon({ src, name, size = 56 }: { src: string | null; name: string; size?: number }) {
  const [broken, setBroken] = useState(false);
  const ref = useRef<HTMLImageElement>(null);
  // The image may fail before React hydrates (onError missed) — check once mounted.
  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0) setBroken(true);
  }, []);
  const color = COLORS[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length];
  const showImg = src && !broken;
  return (
    <div className="grid shrink-0 place-items-center overflow-hidden rounded-xl"
      style={{ width: size, height: size, background: showImg ? '#fff' : color }}>
      {showImg ? (
        <img ref={ref} src={src} alt="" onError={() => setBroken(true)} className="object-contain" style={{ width: size * 0.7, height: size * 0.7 }} />
      ) : (
        <span className="font-extrabold text-white" style={{ fontSize: size * 0.42 }}>{name[0]}</span>
      )}
    </div>
  );
}
