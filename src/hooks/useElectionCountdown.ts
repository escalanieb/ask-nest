import { useEffect, useState } from "react";

// Philippine General Elections — 2028
// Second Monday of May 2028 = May 8, 2028 (7:00 AM PHT = UTC+8)
const ELECTION_DATE = new Date("2028-05-08T07:00:00+08:00");

export interface ElectionCountdown {
  months: number;
  weeks: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isPast: boolean;
  totalMs: number;
}

function compute(): ElectionCountdown {
  const now = new Date();
  const diff = ELECTION_DATE.getTime() - now.getTime();

  if (diff <= 0) {
    return {
      months: 0,
      weeks: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isPast: true,
      totalMs: 0,
    };
  }

  // Months (calendar-aware)
  let months =
    (ELECTION_DATE.getFullYear() - now.getFullYear()) * 12 +
    (ELECTION_DATE.getMonth() - now.getMonth());

  // Walk back one month if we've overshot
  const afterMonths = new Date(
    now.getFullYear(),
    now.getMonth() + months,
    now.getDate(),
    now.getHours(),
    now.getMinutes(),
    now.getSeconds(),
    now.getMilliseconds(),
  );
  if (afterMonths > ELECTION_DATE) months--;

  const monthBase = new Date(
    now.getFullYear(),
    now.getMonth() + months,
    now.getDate(),
    now.getHours(),
    now.getMinutes(),
    now.getSeconds(),
    now.getMilliseconds(),
  );

  let remaining = ELECTION_DATE.getTime() - monthBase.getTime();

  const MS_WEEK = 7 * 24 * 60 * 60 * 1000;
  const MS_DAY = 24 * 60 * 60 * 1000;
  const MS_HOUR = 60 * 60 * 1000;
  const MS_MIN = 60 * 1000;

  const weeks = Math.floor(remaining / MS_WEEK);
  remaining -= weeks * MS_WEEK;
  const days = Math.floor(remaining / MS_DAY);
  remaining -= days * MS_DAY;
  const hours = Math.floor(remaining / MS_HOUR);
  remaining -= hours * MS_HOUR;
  const minutes = Math.floor(remaining / MS_MIN);
  remaining -= minutes * MS_MIN;
  const seconds = Math.floor(remaining / 1000);

  return {
    months,
    weeks,
    days,
    hours,
    minutes,
    seconds,
    isPast: false,
    totalMs: diff,
  };
}

export function useElectionCountdown(): ElectionCountdown {
  const [countdown, setCountdown] = useState<ElectionCountdown>(compute);

  useEffect(() => {
    const id = setInterval(() => setCountdown(compute()), 1000);
    return () => clearInterval(id);
  }, []);

  return countdown;
}
