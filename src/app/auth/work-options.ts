export const COUNTERS = [
  { id: 'counter-1', label: 'Counter 1' },
  { id: 'counter-2', label: 'Counter 2' },
] as const;

export type CounterId = (typeof COUNTERS)[number]['id'];

export function counterLabel(id: CounterId | '' | null): string {
  return COUNTERS.find((counter) => counter.id === id)?.label ?? '';
}
