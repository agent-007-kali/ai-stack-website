"use client";

import { useEffect, useRef, useState } from "react";
import BrandLogo from "./BrandLogo";

const SESSION_KEY = "ai-solutions:welcome:v1:seen";

type ContactType = "email" | "phone";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(value: string) {
  const trimmed = value.trim();
  if (trimmed.length === 0) return false;
  if (trimmed.length > 200) return false;
  return emailRegex.test(trimmed);
}

function isValidPhone(value: string) {
  const trimmed = value.trim();
  if (trimmed.length < 7) return false;
  if (trimmed.length > 50) return false;
  if (!/\d/.test(trimmed)) return false;
  return true;
}

export default function WelcomeGate({
  onComplete,
}: {
  onComplete?: (skipped: boolean) => void;
}) {
  const [active, setActive] = useState(false);
  const [visible, setVisible] = useState(false);
  const [contactType, setContactType] = useState<ContactType>("email");
  const [contactValue, setContactValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isPreview] = useState(true);

  const inputRef = useRef<HTMLInputElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const hasSeen = sessionStorage.getItem(SESSION_KEY);
      if (hasSeen === "seen") {
        setActive(false);
        setVisible(false);
        onComplete?.(true);
        return;
      }
    } catch (e) {
      // ignore
    }
    setActive(true);
    // slight delay to allow CSS transitions
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, [onComplete]);

  useEffect(() => {
    if (visible && headingRef.current) {
      headingRef.current.focus();
    }
  }, [visible]);

  const validate = () => {
    if (contactType === "email") {
      if (!isValidEmail(contactValue)) {
        setError("Enter a valid email address.");
        return false;
      }
    } else {
      if (!isValidPhone(contactValue)) {
        setError("Enter a phone number with its country code.");
        return false;
      }
    }
    setError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      inputRef.current?.focus();
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      // Preview only: no data leaves the browser. Gate any live submission
      // behind the preview flag so it stays genuinely inert until a real
      // transport is approved.
      if (!isPreview) {
        await fetch("/api/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contactType,
            contactValue: contactValue.trim(),
          }),
        });
      }
    } catch (err) {
      // ignore network errors in preview
    } finally {
      try {
        if (typeof window !== "undefined") {
          sessionStorage.setItem(SESSION_KEY, "seen");
        }
      } catch (e) {
        // ignore
      }
      setSubmitting(false);
      onComplete?.(false);
      setVisible(false);
      // keep active briefly for animation if needed? but just unmount logic by parent
    }
  };

  const handleSkip = () => {
    try {
      if (typeof window !== "undefined") {
        sessionStorage.setItem(SESSION_KEY, "seen");
      }
    } catch (e) {
      // ignore
    }
    onComplete?.(true);
    setVisible(false);
  };

  if (!active) return null;

  return (
    <div
      className={`as-welcome ${visible ? "as-welcome--visible" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-title"
      aria-live="polite"
    >
      <div className="as-welcome__backdrop" />
      <div className="as-welcome__container">
        <div className="as-welcome__preview-banner" aria-live="polite">
          <strong>Preview only</strong> — form submission is disabled in effect; no live email/lead collection.
        </div>

        <div className="as-welcome__logo">
          <BrandLogo
            variant="symbol"
            width={160}
            height={160}
            alt="AI Solutions"
          />
          <BrandLogo
            variant="header-dark"
            width={320}
            height={74}
            alt=""
            decorative
          />
        </div>

        <h1 className="as-welcome__title" id="welcome-title" tabIndex={-1} ref={headingRef}>
          Your AI team starts here.
        </h1>
        <p className="as-welcome__body">
          Explore local-first AI agents for your business. Leave an email or phone number if you&apos;d like us to contact you about a setup or demonstration.
        </p>

        <form className="as-welcome__form" onSubmit={handleSubmit} noValidate>
          <fieldset className="as-welcome__fieldset">
            <legend className="as-welcome__legend">How should we contact you?</legend>
            <div className="as-welcome__choice">
              <label className="as-welcome__radio">
                <input
                  type="radio"
                  name="contactType"
                  value="email"
                  checked={contactType === "email"}
                  onChange={() => {
                    setContactType("email");
                    setError(null);
                  }}
                />
                <span>Email</span>
              </label>
              <label className="as-welcome__radio">
                <input
                  type="radio"
                  name="contactType"
                  value="phone"
                  checked={contactType === "phone"}
                  onChange={() => {
                    setContactType("phone");
                    setError(null);
                  }}
                />
                <span>Phone</span>
              </label>
            </div>
          </fieldset>

          <div className="as-welcome__field">
            <label htmlFor="contactValue" className="as-welcome__label">
              {contactType === "email" ? "Email address" : "Phone number"}
            </label>
            <input
              ref={inputRef}
              id="contactValue"
              name="contactValue"
              type={contactType === "email" ? "email" : "tel"}
              inputMode={contactType === "email" ? "email" : "tel"}
              className="as-welcome__input"
              placeholder={
                contactType === "email" ? "you@example.com" : "+44 7700 900000"
              }
              value={contactValue}
              onChange={(e) => {
                setContactValue(e.target.value);
                setError(null);
              }}
              aria-describedby={
                error ? "contact-error" : contactType === "phone" ? "phone-help" : undefined
              }
              required
            />
            {contactType === "phone" && (
              <p className="as-welcome__help" id="phone-help">
                Include your country code.
              </p>
            )}
            {error && (
              <p className="as-welcome__error" id="contact-error" role="alert">
                {error}
              </p>
            )}
          </div>

          <button
            type="submit"
            className="as-welcome__primary"
            disabled={submitting}
          >
            {submitting ? "Saving..." : "Get started"}
          </button>

          <button
            type="button"
            className="as-welcome__secondary"
            onClick={handleSkip}
            disabled={submitting}
          >
            Continue without sharing
          </button>
        </form>

        <p className="as-welcome__privacy">
          AI Solutions will use your details to respond about our services. Entering the site does not sign you up for marketing.{" "}
          <a href="/privacy">How we use your details</a>
        </p>
      </div>
    </div>
  );
}
