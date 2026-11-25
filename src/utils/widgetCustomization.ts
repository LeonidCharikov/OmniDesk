export const MAX_WIDGET_SLOTS = 3;

export function normalizeWidgetSlotList(
  list: string[] | undefined,
  fallback: string,
  maxSlots: number = MAX_WIDGET_SLOTS
): string[] {
  const safeMax = Math.max(1, maxSlots);
  const unique: string[] = [];
  if (Array.isArray(list)) {
    for (const raw of list) {
      if (typeof raw !== 'string') continue;
      const trimmed = raw.trim();
      if (!trimmed || unique.includes(trimmed)) continue;
      unique.push(trimmed);
      if (unique.length >= safeMax) break;
    }
  }
  if (unique.length === 0) {
    return [fallback];
  }
  return unique;
}

export function resizeWidgetSlotList(
  current: string[],
  targetCount: number,
  availableIds: string[],
  fallback: string,
  maxSlots: number = MAX_WIDGET_SLOTS
): string[] {
  const clamped = Math.max(1, Math.min(maxSlots, Math.round(targetCount)));
  const normalized = normalizeWidgetSlotList(current, fallback, maxSlots);
  if (clamped <= normalized.length) {
    return normalized.slice(0, clamped);
  }
  const next = [...normalized];
  for (const candidate of availableIds) {
    if (next.length >= clamped) break;
    if (!next.includes(candidate)) {
      next.push(candidate);
    }
  }
  while (next.length < clamped) {
    next.push(fallback);
  }
  return next;
}

export function updateWidgetSlotAt(
  current: string[],
  index: number,
  nextValue: string,
  fallback: string,
  maxSlots: number = MAX_WIDGET_SLOTS
): string[] {
  const normalized = normalizeWidgetSlotList(current, fallback, maxSlots);
  if (index < 0 || index >= normalized.length) {
    return normalized;
  }
  const next = [...normalized];
  const existingIdx = next.indexOf(nextValue);
  if (existingIdx !== -1 && existingIdx !== index) {
    const prevValue = next[index];
    next[index] = nextValue;
    next[existingIdx] = prevValue;
    return next;
  }
  next[index] = nextValue;
  return next;
}

export function removeWidgetSlotAt(
  current: string[],
  index: number,
  fallback: string,
  maxSlots: number = MAX_WIDGET_SLOTS
): string[] {
  const normalized = normalizeWidgetSlotList(current, fallback, maxSlots);
  if (normalized.length <= 1 || index < 0 || index >= normalized.length) {
    return normalized;
  }
  return normalized.filter((_, i) => i !== index);
}

export function selectPrimaryWidgetSlot(
  current: string[] | undefined,
  nextPrimary: string,
  fallback: string,
  maxSlots: number = MAX_WIDGET_SLOTS
): string[] {
  const normalized = normalizeWidgetSlotList(current, fallback, maxSlots);
  const existingIdx = normalized.indexOf(nextPrimary);
  if (existingIdx !== -1) {
    if (existingIdx === 0) return normalized;
    return [nextPrimary, ...normalized.filter((_, i) => i !== existingIdx)];
  }
  return [nextPrimary, ...normalized.slice(1)];
}
