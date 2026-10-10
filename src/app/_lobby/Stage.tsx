'use client';
import React from 'react';

export function Stage({ children }: { children: React.ReactNode }) {
    const move = (e: React.PointerEvent<HTMLDivElement>) => {
        const r = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty('--px', String(((e.clientX - r.left) / r.width - 0.5).toFixed(3)));
        e.currentTarget.style.setProperty('--py', String(((e.clientY - r.top) / r.height - 0.5).toFixed(3)));
    };
    return (
        <div className="stage" onPointerMove={move}>
            <div className="aurora a1" /><div className="aurora a2" /><div className="aurora a3" /><div className="grid" /><div className="stars" />
            <div className="content">{children}</div>
        </div>
    );
}