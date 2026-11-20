'use client';
import { useRef, useState } from 'react';
import { uploadImage } from '@/app/admin/feature-actions';
import Icon from './Icon';

/** Resizes the picked image in the browser (max 512px, WebP) and uploads it. */
export default function ImageUpload({ onUploaded }: { onUploaded: (url: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function handle(file: File) {
    setErr(''); setBusy(true);
    try {
      if (!file.type.startsWith('image/')) throw new Error('Choose an image file');
      const bmp = await createImageBitmap(file);
      const scale = Math.min(1, 512 / Math.max(bmp.width, bmp.height));
      const c = document.createElement('canvas');
      c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
      c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
      const blob = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/webp', 0.86));
      if (!blob) throw new Error('Could not process the image');
      const fd = new FormData();
      fd.append('file', new File([blob], 'logo.webp', { type: blob.type || 'image/webp' }));
      const res = await uploadImage(fd);
      if (res.error || !res.url) throw new Error(res.error || 'Upload failed');
      onUploaded(res.url);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  }

  return (
    <div>
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && handle(e.target.files[0])} />
      <button type="button" disabled={busy} onClick={() => input.current?.click()} className="btn-ghost w-full !py-2.5">
        <Icon name="upload" size={16} />{busy ? 'Uploading…' : 'Upload from device'}
      </button>
      {err && <p className="mt-1.5 text-xs text-red-300">{err}</p>}
    </div>
  );
}
