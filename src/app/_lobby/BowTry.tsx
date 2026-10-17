'use client';
import React from 'react';
import Link from 'next/link';
import { Stage } from './Stage';
import { BowChat } from './BowChat';

export function BowTry() {
  return (
    <>
      <Link className="back" href="/">
        ← Back to home
      </Link>
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
      <p className="foot">scripted demo, not live</p>
    </>
  );
}

export function BowTryStage() {
  return (
    <Stage>
      <BowTry />
    </Stage>
  );
}
