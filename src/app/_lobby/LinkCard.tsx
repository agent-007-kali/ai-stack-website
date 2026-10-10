'use client';
import Link from 'next/link';
import type { LinkItem } from './types';

export function LinkCard({ l }: { l: LinkItem }) {
    const inner = <><span><b>{l.label}</b><small>{l.sub}</small></span><i>→</i></>;
    return l.to ? <Link className="linkcard" href={l.to}>{inner}</Link>
        : <a className="linkcard" href={l.href} target={l.href!.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer">{inner}</a>;
}