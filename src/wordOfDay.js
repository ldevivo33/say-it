import { words } from "./wordList.js";

const EST_TZ = "America/New_York";
const MS_PER_DAY = 1000 * 60 * 60 * 24;
// Start cycle on 2025-12-17 00:00 EST (which is 05:00 UTC)
const cycleStartUtc = Date.UTC(2025, 11, 17, 5);

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

  return {
    date: dateString,
    ...words[index],
  };
}
