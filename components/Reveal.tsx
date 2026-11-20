'use client';
import { useEffect, useRef, useState } from 'react';

/** Fades children up when they scroll into view. */
export default function Reveal({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!('IntersectionObserver' in window)) return setShown(true);
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect(); } }, { rootMargin: '0px 0px -60px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={`${className} transition-all duration-700 ease-out ${shown ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}
