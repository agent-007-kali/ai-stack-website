export type LandingSession = {
  id: string;
  title: string;
  url: string;
  startAt: string;
  endAt: string;
  timeZone: string;
};

export type PreviousMeetup = {
  id: string;
  title: string;
  url: string;
  startAt: string;
  timeZone: string;
};

export const SESSION_TIME_ZONE = "Europe/London";

/**
 * One-off session dates, verified 7 October 2026. These are individual
 * events with their own Luma pages, not a recurring weekly timetable.
 */
export const landingSessions: LandingSession[] = [
  {
    id: "session-2026-10-07",
    title: "1:1 - Build Your First AI Agent",
    url: "https://luma.com/c47g3foa",
    startAt: "2026-10-07T18:30:00+01:00",
    endAt: "2026-10-07T20:00:00+01:00",
    timeZone: SESSION_TIME_ZONE,
  },
  {
    id: "session-2026-10-08",
    title: "1:1 - Build Your First AI Agent",
    url: "https://luma.com/qh6a0jm2",
    startAt: "2026-10-08T18:30:00+01:00",
    endAt: "2026-10-08T20:00:00+01:00",
    timeZone: SESSION_TIME_ZONE,
  },
  {
    id: "session-2026-10-09",
    title: "1:1 - Build Your First AI Agent",
    url: "https://luma.com/0i9hlpir",
    startAt: "2026-10-09T18:30:00+01:00",
    endAt: "2026-10-09T20:00:00+01:00",
    timeZone: SESSION_TIME_ZONE,
  },
  {
    id: "session-2026-10-10",
    title: "1:1 - Build Your First AI Agent",
    url: "https://luma.com/tk6nogeg",
    startAt: "2026-10-10T11:00:00+01:00",
    endAt: "2026-10-10T12:30:00+01:00",
    timeZone: SESSION_TIME_ZONE,
  },
];

export const previousMeetup: PreviousMeetup = {
  id: "meetup-2026-10-05",
  title: "Intro to Linux with AI Agents",
  url: "https://luma.com/ti77p1lz",
  startAt: "2026-10-05T19:00:00+01:00",
  timeZone: SESSION_TIME_ZONE,
};

const weekdayFormatters = new Map<string, Intl.DateTimeFormat>();
const dateFormatters = new Map<string, Intl.DateTimeFormat>();
const timeFormatters = new Map<string, Intl.DateTimeFormat>();

function weekdayFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = weekdayFormatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      weekday: "long",
    });
    weekdayFormatters.set(timeZone, formatter);
  }
  return formatter;
}

function dateFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = dateFormatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    dateFormatters.set(timeZone, formatter);
  }
  return formatter;
}

function timeFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = timeFormatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    timeFormatters.set(timeZone, formatter);
  }
  return formatter;
}

/** "Wednesday 7 October 2026" — always rendered in the session time zone. */
export function formatSessionDate(iso: string, timeZone = SESSION_TIME_ZONE): string {
  const date = new Date(iso);
  const weekday = weekdayFormatter(timeZone).format(date);
  const rest = dateFormatter(timeZone).format(date);
  return `${weekday} ${rest}`;
}

/** "6:30pm" — always rendered in the session time zone. */
export function formatClock(iso: string, timeZone = SESSION_TIME_ZONE): string {
  const parts = timeFormatter(timeZone).formatToParts(new Date(iso));
  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  const hour = pick("hour");
  const minute = pick("minute");
  const dayPeriod = pick("dayPeriod").toLowerCase();
  return `${hour}:${minute}${dayPeriod}`;
}

/** "6:30-8:00pm" or "11:00am-12:30pm". */
export function formatSessionTime(
  startAt: string,
  endAt: string,
  timeZone = SESSION_TIME_ZONE
): string {
  return `${formatClock(startAt, timeZone)}-${formatClock(endAt, timeZone)}`;
}

/** Registration stays visible only while now < startAt. */
export function isSessionOpen(session: LandingSession, now: number): boolean {
  return now < Date.parse(session.startAt);
}
