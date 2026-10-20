const DAY_MS = 24 * 60 * 60 * 1000;
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000; // UTC+05:30, no DST

/** The IST calendar day containing `timestamp` (epoch ms), as a UTC range [start, end). */
export function istDayRange(timestamp: number) {
  const startMs = Math.floor((timestamp + IST_OFFSET_MS) / DAY_MS) * DAY_MS - IST_OFFSET_MS;
  return { start: new Date(startMs), end: new Date(startMs + DAY_MS) };
}
