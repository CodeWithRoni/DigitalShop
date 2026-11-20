'use client';
import Icon from './Icon';
export default function PrintButton() {
  return <button type="button" onClick={() => window.print()} className="btn-ghost"><Icon name="printer" size={16} />Print / Save PDF</button>;
}
