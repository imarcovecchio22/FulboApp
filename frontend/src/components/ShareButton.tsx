'use client';

import { useState } from 'react';
import { Share2, Check } from 'lucide-react';

export function ShareButton({ eventId }: { eventId: string }) {
  const [copied, setCopied] = useState(false);

  function handleShare() {
    const url = `${window.location.origin}/events/${eventId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button onClick={handleShare} className="btn-secondary">
      {copied ? <Check className="w-4 h-4 text-pitch-400" /> : <Share2 className="w-4 h-4" />}
      {copied ? 'Link copiado!' : 'Compartir link'}
    </button>
  );
}
