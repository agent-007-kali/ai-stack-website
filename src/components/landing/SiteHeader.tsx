"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import BrandLogo from "./BrandLogo";

const NAV_ITEMS = [
  { label: "The system", href: "#system" },
  { label: "Accountant of the future", href: "#future-accountant" },
  { label: "How it works", href: "#how-it-works" },
  { label: "AI classes", href: "#classes" },
];

const MOBILE_NAV_ID = "site-mobile-nav";

export default function SiteHeader() {
  const [open, setOpen] = useState(false);
  const headerRef = useRef<HTMLElement | null>(null);
  const toggleRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const closeMenu = useCallback((returnFocus = false) => {
    setOpen(false);
    if (returnFocus) {
      toggleRef.current?.focus();
    }
  }, []);

  const handleNavigate = useCallback(
    (href: string) => {
      setOpen(false);
      const id = href.replace(/^#/, "");
      window.requestAnimationFrame(() => {
        const target = document.getElementById(id);
        if (target) {
          target.focus({ preventScroll: true });
        }
      });
    },
    []
  );

  useEffect(() => {
    if (!open) return;

    const firstLink = panelRef.current?.querySelector<HTMLElement>("a[href]");
    firstLink?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu(true);
        return;
      }

      if (event.key !== "Tab") return;

      const panel = panelRef.current;
      const toggle = toggleRef.current;
      if (!panel || !toggle) return;

      const focusables = [
        toggle,
        ...Array.from(panel.querySelectorAll<HTMLElement>("a[href], button:not([disabled])")),
      ];

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;

      if (event.shiftKey) {
        if (active === first || !focusables.includes(active as HTMLElement)) {
          event.preventDefault();
          last.focus();
        }
      } else if (active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const onPointerDown = (event: MouseEvent) => {
      const header = headerRef.current;
      if (header && event.target instanceof Node && !header.contains(event.target)) {
        closeMenu(false);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [open, closeMenu]);

  return (
    <>
      <a className="as-skip" href="#main-content">
        Skip to content
      </a>

      <header className="as-header" ref={headerRef}>
        <div className="as-container as-header-inner">
          <Link
            className="as-brand"
            href="/"
            aria-label="AI Solutions home"
            onClick={() => setOpen(false)}
          >
            <BrandLogo variant="header-dark" width={180} height={42} alt="AI Solutions" />
          </Link>

          <nav className="as-nav" aria-label="Primary">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.href}
                className="as-nav-link"
                href={item.href}
                onClick={() => setOpen(false)}
              >
                {item.label}
              </a>
            ))}
            <a
              className="as-btn as-btn-primary as-header-cta"
              href="#classes"
              onClick={() => setOpen(false)}
            >
              See session dates
            </a>
          </nav>

          <button
            ref={toggleRef}
            type="button"
            className="as-menu-toggle"
            aria-expanded={open}
            aria-controls={MOBILE_NAV_ID}
            aria-label={open ? "Close navigation" : "Open navigation"}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X aria-hidden="true" size={20} /> : <Menu aria-hidden="true" size={20} />}
            <span>{open ? "Close" : "Menu"}</span>
          </button>
        </div>

        {open && (
          <div
            className="as-mobile-nav"
            id={MOBILE_NAV_ID}
            ref={panelRef}
          >
            <nav className="as-container" aria-label="Mobile">
              <ul>
                {NAV_ITEMS.map((item) => (
                  <li key={item.href}>
                    <a href={item.href} onClick={() => handleNavigate(item.href)}>
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
              <a
                className="as-btn as-btn-primary"
                href="#classes"
                onClick={() => handleNavigate("#classes")}
              >
                See session dates
              </a>
            </nav>
          </div>
        )}
      </header>
    </>
  );
}
