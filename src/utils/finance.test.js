import { describe, expect, it } from "vitest";
import {
  formatCurrency,
  formatCurrencyInput,
  getBudgetStatus,
  getOcrConfidenceStatus,
  getTransactionTotals,
  parseCurrencyInput,
  sanitizeCurrencyInput,
} from "./finance";

describe("currency helpers", () => {
  it("formats Vietnamese currency without decimal places", () => {
    expect(formatCurrency(10000000)).toContain("10.000.000");
    expect(formatCurrency(10000000)).toContain("₫");
  });

  it("sanitizes and formats a currency input", () => {
    expect(sanitizeCurrencyInput("00a10.000.000 ₫")).toBe("10000000");
    expect(formatCurrencyInput("10000000")).toBe("10.000.000");
    expect(formatCurrencyInput("")).toBe("");
    expect(formatCurrencyInput("99999999999999999999")).toBe(
      "99999999999999999999"
    );
  });

  it("parses a displayed value back to a number", () => {
    expect(parseCurrencyInput("10.000.000 ₫")).toBe(10000000);
    expect(parseCurrencyInput("")).toBe(0);
  });
});

describe("financial summaries", () => {
  it("calculates income, expense and balance", () => {
    expect(
      getTransactionTotals([
        { type: "income", amount: 150000 },
        { type: "expense", amount: 40000 },
        { type: "ignored", amount: 90000 },
        { type: "income", amount: "không hợp lệ" },
      ])
    ).toEqual({ income: 150000, expense: 40000, balance: 110000 });
  });

  it.each([
    [30, "safe"],
    [80, "warning"],
    [100, "danger"],
  ])("maps %s%% to the %s budget state", (percent, className) => {
    expect(getBudgetStatus(percent).className).toBe(className);
  });
});

describe("OCR confidence", () => {
  it.each([
    [0.9, "high"],
    [0.71, "medium"],
    [0.45, "low"],
    [null, "low"],
    [undefined, "unknown"],
  ])("maps %s to the %s state", (confidence, className) => {
    expect(getOcrConfidenceStatus(confidence).className).toBe(className);
  });
});
