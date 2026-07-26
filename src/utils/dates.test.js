import { describe, expect, it } from "vitest";
import {
  buildMonthlyData,
  formatMonthLabel,
  getCurrentMonthKey,
  getMonthKey,
  getRecentMonthKeys,
  getTodayKey,
  isValidDate,
} from "./dates";

describe("date helpers", () => {
  it("creates stable local date and month keys", () => {
    const date = new Date(2026, 6, 27, 12);
    expect(getCurrentMonthKey(date)).toBe("2026-07");
    expect(getTodayKey(date)).toBe("2026-07-27");
    expect(getMonthKey("2026-07-15")).toBe("2026-07");
  });

  it("validates real calendar dates", () => {
    expect(isValidDate("2024-02-29")).toBe(true);
    expect(isValidDate("2026-02-29")).toBe(false);
    expect(isValidDate("27/07/2026")).toBe(false);
  });

  it("formats a Vietnamese month label", () => {
    expect(formatMonthLabel("2026-07")).toBe("Tháng 07 / 2026");
    expect(formatMonthLabel("")).toBe("Chưa có dữ liệu");
  });

  it("returns consecutive months across a year boundary", () => {
    expect(getRecentMonthKeys("2026-02", 4)).toEqual([
      "2025-11",
      "2025-12",
      "2026-01",
      "2026-02",
    ]);
    expect(getRecentMonthKeys("không-hợp-lệ", 2)).toHaveLength(2);
  });

  it("always builds six calendar months and fills missing months with zero", () => {
    const result = buildMonthlyData(
      [
        { date: "2026-02-02", type: "income", amount: 200000 },
        { date: "2026-07-02", type: "expense", amount: 50000 },
        { date: "2025-01-02", type: "expense", amount: 999999 },
        { date: "2026-06-02", type: "ignored", amount: 999999 },
      ],
      "2026-07"
    );

    expect(result).toHaveLength(6);
    expect(result[0]).toEqual({
      month: "T02/2026",
      income: 200000,
      expense: 0,
    });
    expect(result[1]).toEqual({
      month: "T03/2026",
      income: 0,
      expense: 0,
    });
    expect(result[5].expense).toBe(50000);
  });
});
