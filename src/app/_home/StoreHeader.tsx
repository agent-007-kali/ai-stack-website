'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { BUNDLE, GUIDES, priceLabel } from '@/lib/guides';
import { withUsd } from '@/lib/usd';

type Hit = {
  id: string;
  label: string;
  hint: string;
  terms: string;
};

const SECTION_HITS: Hit[] = [
  {
    id: 'hero',
    label: 'Bow Bot hero - frontier-grade AI agent',
    hint: 'Hero',
    terms: 'bow bot whatsapp agent hero free trial setup launch price',
  },
  {
    id: 'bowbot',
    label: 'Bow Bot WhatsApp assistant',
    hint: 'Agent',
    terms: 'bow bot whatsapp assistant trial buy stripe monthly agent',
  },
  {
    id: 'boxes',
    label: 'The Boxes - Vega, Altair, Rigel',
    hint: 'Hardware',
    terms: 'boxes pc desktop hardware vega altair rigel box pro max gpu',
  },
  {
    id: 'academy',
    label: 'AI Solutions Academy',
    hint: 'Academy',
    terms: 'academy training sessions learn modules ana classes taster',
  },
  {
    id: 'agents',
    label: 'Tailored agents for your business',
    hint: 'Custom agents',
    terms: 'tailored custom agents business sol reception sales bespoke',
  },
];

function guideHits(): Hit[] {
  const rows = [...GUIDES, BUNDLE];
  return rows.map((g) => ({
    id: 'guides',
    label: g.title,
    hint: priceLabel(g) ? `Guides · ${withUsd(priceLabel(g))}` : 'Guides',
    terms: `${g.slug} ${g.description} ${g.bullets.join(' ')} pdf guide bundle`,
  }));
}

export default function StoreHeader() {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  const hits = useMemo(() => {
    const all = [...guideHits(), ...SECTION_HITS];
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return all
      .filter((h) => `${h.label} ${h.terms}`.toLowerCase().includes(q))
      .slice(0, 8);
  }, [query]);

  function goTo(id: string) {
    setQuery('');
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    el.classList.remove('sf-pulse');
    window.requestAnimationFrame(() => el.classList.add('sf-pulse'));
    window.setTimeout(() => el.classList.remove('sf-pulse'), 1600);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (hits[0]) goTo(hits[0].id);
  }

  return (
    <header className="sf-header">
      <div className="sf-header-inner">
        <Link href="/" className="sf-brand" aria-label="AI Solutions home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/ai-solutions-header-dark.svg"
            alt="AI Solutions"
            width={180}
            height={42}
            className="sf-brand-logo"
          />
        </Link>

        <form className="sf-search" role="search" onSubmit={onSubmit}>
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the store: guides, Bow Bot, Boxes…"
            aria-label="Search products on this page"
            autoComplete="off"
          />
          {hits.length > 0 && (
            <ul className="sf-hits">
              {hits.map((h, i) => (
                <li key={`${h.id}-${i}`}>
                  <button
                    type="button"
                    className="sf-hit"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => goTo(h.id)}
                  >
                    {h.label}
                    <small>{h.hint}</small>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </form>

        <nav className="sf-nav" aria-label="Storefront">
          <a href="#guides">Guides</a>
          <a href="#bowbot">Bow Bot</a>
          <a href="#boxes">Boxes</a>
          <a href="#academy">Academy</a>
          <a href="#agents">Agents</a>
          <Link className="sf-nav-cta" href="/lobby">
            Lobby
          </Link>
        </nav>
      </div>
    </header>
  );
}
