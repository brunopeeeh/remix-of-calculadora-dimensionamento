import { monthNames } from "./format";
import { MonthPoint } from "./types";

const MONTH_LIMIT = 24;
const BASE_YEAR = 2026;

export const getTimelineKey = (year: number, month: number) =>
  `${year}-${String(month).padStart(2, "0")}`;

export const buildTimeline = (startMonth: number, endMonth: number): MonthPoint[] => {
  const timeline: MonthPoint[] = [];
  const start = new Date(BASE_YEAR, startMonth - 1, 1);
  const endYear = endMonth >= startMonth ? BASE_YEAR : BASE_YEAR + 1;
  const end = new Date(endYear, endMonth - 1, 1);

  const cursor = new Date(start);
  while (cursor <= end && timeline.length < MONTH_LIMIT) {
    const month = cursor.getMonth() + 1;
    const year = cursor.getFullYear();
    timeline.push({
      key: getTimelineKey(year, month),
      month,
      year,
      label: `${monthNames[month - 1]}/${String(year).slice(-2)}`,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return timeline;
};
