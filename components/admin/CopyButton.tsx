'use client';
import { useState } from 'react';
import Icon from './Icon';

export default function CopyButton({ text, label }: { text: string; label?: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button type="button" title="Copy"
      onClick={async () => { try { await navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 1500); } catch {} }}
      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs transition ${ok ? 'text-green-400' : 'text-zinc-500 hover:bg-white/5 hover:text-white'}`}>
      <Icon name={ok ? 'check' : 'copy'} size={13} />{label && <span>{ok ? 'Copied' : label}</span>}
    </button>
  );
}
