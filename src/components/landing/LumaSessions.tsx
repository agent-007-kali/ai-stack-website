"use client";

import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import {
  formatSessionDate,
  formatSessionTime,
  isSessionOpen,
  landingSessions,
} from "@/lib/landing-sessions";

const CHECK_INTERVAL_MS = 30_000;

export default function LumaSessions() {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;

    const check = () => {
      if (mounted) setNow(Date.now());
    };

    check();

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") check();
    };

    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", onVisibilityChange);
    const timer = window.setInterval(check, CHECK_INTERVAL_MS);

    return () => {
      mounted = false;
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.clearInterval(timer);
    };
  }, []);

  const activeSessions =
    now === null ? [] : landingSessions.filter((session) => isSessionOpen(session, now));

  return (
    <>
      {now === null ? (
        <p className="as-loading" role="status">
          Checking session dates...
        </p>
      ) : activeSessions.length === 0 ? (
        <div className="as-empty">
          <p>
            No session dates are listed here right now. Contact AI Solutions to
            ask about the next session.
          </p>
          <a
            className="as-btn as-btn-secondary"
            href="mailto:tradersbooking@gmail.com"
          >
            Ask about the next session
          </a>
        </div>
      ) : (
        <ul className="as-sessions">
          {activeSessions.map((session) => {
            const date = formatSessionDate(session.startAt, session.timeZone);
            const time = formatSessionTime(
              session.startAt,
              session.endAt,
              session.timeZone
            );

            return (
              <li className="as-session" key={session.id}>
                <div className="as-session-when">
                  <p className="as-session-date">{date}</p>
                  <p className="as-session-time">{time}</p>
                </div>
                <a
                  className="as-btn as-btn-primary"
                  href={session.url}
                  aria-label={`View and register on Luma — ${date}`}
                >
                  View and register on Luma
                  <ArrowRight aria-hidden="true" size={18} />
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
