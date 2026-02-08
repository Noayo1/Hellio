import type { Experience } from '../types';

export function parseDate(dateStr: string): Date {
  const [year, month] = dateStr.split('-').map(Number);
  return new Date(year, (month || 1) - 1);
}

export function calculateYearsOfExperience(experience: Experience[]): number {
  if (experience.length === 0) return 0;

  const now = new Date();

  const ranges = experience.map((exp) => ({
    start: parseDate(exp.startDate),
    end: exp.endDate ? parseDate(exp.endDate) : now,
  }));

  ranges.sort((a, b) => a.start.getTime() - b.start.getTime());

  const merged: { start: Date; end: Date }[] = [];
  for (const range of ranges) {
    if (merged.length === 0 || range.start > merged[merged.length - 1].end) {
      merged.push({ ...range });
    } else {
      merged[merged.length - 1].end = new Date(
        Math.max(merged[merged.length - 1].end.getTime(), range.end.getTime())
      );
    }
  }

  let totalMonths = 0;
  for (const range of merged) {
    const months =
      (range.end.getFullYear() - range.start.getFullYear()) * 12 +
      (range.end.getMonth() - range.start.getMonth());
    totalMonths += Math.max(0, months);
  }

  return Math.round(totalMonths / 12);
}
