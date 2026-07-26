import { describe, expect, it } from "vitest";
import {
  filterTransactions,
  isValidTransaction,
  normalizeText,
} from "./transactions";

const validTransaction = {
  title: "Ăn trưa",
  note: "",
  amount: 45000,
  type: "expense",
  category: "Ăn uống",
  date: "2026-07-20",
};

describe("transaction helpers", () => {
  it("accepts valid transactions and rejects invalid values", () => {
    expect(isValidTransaction(validTransaction)).toBe(true);
    expect(isValidTransaction({ ...validTransaction, amount: 0 })).toBe(false);
    expect(
      isValidTransaction({ ...validTransaction, date: "2099-01-01" })
    ).toBe(false);
  });

  it("normalizes Vietnamese text for accent-insensitive search", () => {
    expect(normalizeText("Đổ XĂNG")).toBe("do xang");
  });

  it("searches without accents and sorts newest first", () => {
    const result = filterTransactions(
      [
        { ...validTransaction, id: 1, title: "Đổ xăng", date: "2026-07-10" },
        { ...validTransaction, id: 2, title: "Đổ xăng xe", date: "2026-07-22" },
        { ...validTransaction, id: 3, title: "Ăn trưa", date: "2026-07-23" },
      ],
      { searchTerm: "do xang" }
    );

    expect(result.map((transaction) => transaction.id)).toEqual([2, 1]);
  });

  it("filters by type and category", () => {
    const result = filterTransactions(
      [
        validTransaction,
        {
          ...validTransaction,
          type: "income",
          category: "Lương",
          title: "Lương tháng",
        },
      ],
      { type: "income", category: "Lương" }
    );

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Lương tháng");
  });
});
