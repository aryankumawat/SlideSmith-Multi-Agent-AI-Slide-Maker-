'use client';

import React from 'react';

const SYNE = 'var(--font-syne), Syne, sans-serif';
const MONO = 'var(--font-geist-mono), monospace';

interface StudioShellProps {
  status?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export default function StudioShell({ status, actions, children }: StudioShellProps) {
  return (
    <div style={{
      minHeight: '100dvh',
      background: 'var(--ss-bg-deep)',
      color: 'var(--ss-text)',
      fontFamily: SYNE,
      display: 'flex',
      flexDirection: 'column',
    }}>
      <nav style={{
        height: 52,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 40px',
        background: 'var(--ss-surface)',
        borderBottom: '1px solid var(--ss-border)',
      }}>
        <span style={{
          fontSize: 12,
          fontWeight: 800,
          letterSpacing: '0.18em',
          textTransform: 'uppercase' as const,
          color: 'var(--ss-text)',
        }}>
          SlideSmith
        </span>
        {status && (
          <span style={{
            fontSize: 11,
            color: 'var(--ss-text-secondary)',
            fontFamily: MONO,
            letterSpacing: '0.08em',
          }}>
            {status}
          </span>
        )}
        {actions ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {actions}
          </div>
        ) : <div />}
      </nav>
      <div style={{ flex: 1, minHeight: 0 }}>
        {children}
      </div>
    </div>
  );
}
