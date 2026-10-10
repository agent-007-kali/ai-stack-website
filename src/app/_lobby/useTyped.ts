'use client';
import { useEffect, useState } from 'react';

export function useTyped(text: string, delay = 900) {
    const [n, setN] = useState(0);
    useEffect(() => {
        if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) { const t = window.setTimeout(() => setN(text.length), 0); return () => window.clearTimeout(t); }
        let i = 0; let id: number | undefined;
        const t = window.setTimeout(() => { id = window.setInterval(() => { i += 1; setN(i); if (i >= text.length && id) window.clearInterval(id); }, 38); }, delay);
        return () => { window.clearTimeout(t); if (id) window.clearInterval(id); };
    }, [text, delay]);
    return text.slice(0, n);
}