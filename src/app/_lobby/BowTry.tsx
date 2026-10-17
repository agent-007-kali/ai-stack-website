'use client';
import React from 'react';
import Link from 'next/link';
import { Stage } from './Stage';
import { BowChat } from './BowChat';
import { BowInstall } from './BowInstall';
import { SCRIPTED_DEMO_LABEL } from '@/lib/chat-label';

export function BowTry() {
  return (
    <div className="bow-pwa">
      <Link className="back" href="/">
        ← Back to home
      </Link>
      <BowInstall />
      <header className="hero left">
        <div className="eyebrow">
          <span className="pulse" />
          Try Bow Bot
        </div>
        <h1>
          Bow Bot <em>3-day free trial</em>
        </h1>
        <p className="sub">
          Chat with Bow Bot. This is a scripted demo, not a live model.
        </p>
      </header>
      <BowChat />
      <p className="foot">{SCRIPTED_DEMO_LABEL}</p>
    </div>
  );
}

export function BowTryStage() {
  return (
    <Stage>
      <BowTry />
    </Stage>
  );
}
