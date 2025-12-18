import { words } from "./wordList";

const EST_TZ = "America/New_York";
const MS_PER_DAY = 1000 * 60 * 60 * 24;
const cycleStartUtc = Date.UTC(2025, 0, 1); // 2025-01-01 is index 0

export function getEstDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: EST_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const lookup = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const year = Number(lookup.year);
  const month = Number(lookup.month);
  const day = Number(lookup.day);

  return {
    year,
    month,
    day,
    dateString: `${lookup.year}-${lookup.month}-${lookup.day}`,
  };
}

export function getWordOfTheDay(referenceDate = new Date()) {
  const { year, month, day, dateString } = getEstDateParts(referenceDate);
  const todayUtc = Date.UTC(year, month - 1, day);
  const diffDays = Math.floor((todayUtc - cycleStartUtc) / MS_PER_DAY);
  const index = ((diffDays % words.length) + words.length) % words.length;

  const entry = words[index];
  return {
    date: dateString,
    ...entry,
  };
}
