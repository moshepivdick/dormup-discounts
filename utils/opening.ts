export type OpeningRange = {
  openHour: number;
  openMinute: number;
  closeHour: number;
  closeMinute: number;
};

export function parseOpeningRangeFromShort(input?: string | null): OpeningRange | null {
  if (!input) return null;
  const match = input.match(/(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const [, oh, om, ch, cm] = match;
  return {
    openHour: Number(oh),
    openMinute: Number(om),
    closeHour: Number(ch),
    closeMinute: Number(cm),
  };
}

export function isOpenNow(range: OpeningRange, now: Date = new Date()) {
  const hour = now.getHours();
  const minute = now.getMinutes();
  const currentMinutes = hour * 60 + minute;
  const openMinutes = range.openHour * 60 + range.openMinute;
  const closeMinutes = range.closeHour * 60 + range.closeMinute;
  // normal day (e.g. 12:00–23:30)
  if (openMinutes < closeMinutes) {
    return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
  }
  // overnight (e.g. 18:00–02:00)
  return currentMinutes >= openMinutes || currentMinutes < closeMinutes;
}

export function formatTimeLabel(range: OpeningRange, type: 'open' | 'close') {
  const h = type === 'open' ? range.openHour : range.closeHour;
  const m = type === 'open' ? range.openMinute : range.closeMinute;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

