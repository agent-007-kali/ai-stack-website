'use client';
import React from 'react';

export function BowAvatar() {
  return (
    <div className="solav" aria-hidden="true">
      <img
        src="/bowbot/assets/orb-static-DETHUGoC.png"
        alt=""
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = 'none';
        }}
      />
    </div>
  );
}
