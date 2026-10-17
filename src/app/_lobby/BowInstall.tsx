'use client';
import React, { useEffect, useState } from 'react';
import './bow-pwa.css';

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const media = window.matchMedia('(display-mode: standalone)').matches;
  const ios = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  return media || ios;
}

export function BowInstall() {
  const [deferred, setDeferred] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [hint, setHint] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as InstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };

    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);

    const detect = window.setTimeout(() => {
      if (isStandalone()) {
        setInstalled(true);
        return;
      }
      setIsIOS(/iphone|ipad|ipod/i.test(window.navigator.userAgent));
    }, 0);

    return () => {
      window.clearTimeout(detect);
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (installed || dismissed) return null;

  const onAdd = async () => {
    if (deferred) {
      await deferred.prompt();
      await deferred.userChoice;
      setDeferred(null);
      return;
    }
    setHint(true);
  };

  return (
    <aside className="bow-install" aria-label="Install Bow Chat">
      <div className="bow-install-copy">
        <b>Install Bow Chat</b>
        <span>Add it to your home screen and open it full-screen.</span>
      </div>
      <button type="button" className="bow-install-btn" onClick={onAdd}>
        Add to Home Screen
      </button>
      {hint && (
        <p className="bow-install-help">
          {isIOS
            ? 'Tap the Share icon, then “Add to Home Screen”.'
            : 'Open your browser menu and choose “Install app” or “Add to Home Screen”.'}
        </p>
      )}
      <button
        type="button"
        className="bow-install-x"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss install prompt"
      >
        ×
      </button>
    </aside>
  );
}
