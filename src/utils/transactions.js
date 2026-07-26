import { getTodayKey, isValidDate } from "./dates";

export function isValidTransaction(transaction) {
  const amount = Number(transaction.amount);
  const title = String(transaction.title || "").trim();
  const note = String(transaction.note || "").trim();
  const date = String(transaction.date || "");

  return (
    title.length > 0 &&
    title.length <= 100 &&
    note.length <= 500 &&
    Number.isFinite(amount) &&
    amount > 0 &&
    /^(income|expense)$/.test(transaction.type) &&
    Boolean(transaction.category) &&
    isValidDate(date) &&
    date <= getTodayKey()
  );
}

export function normalizeText(text) {
  return String(text)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

export function filterTransactions(
  transactions,
  { searchTerm = "", type = "all", category = "all" } = {}
) {
  const normalizedSearchTerm = normalizeText(searchTerm.trim());

  return transactions
    .filter((transaction) => {
      const searchableText = normalizeText(
        `${transaction.title} ${transaction.note} ${transaction.category}`
      );

      return (
        (!normalizedSearchTerm ||
          searchableText.includes(normalizedSearchTerm)) &&
        (type === "all" || transaction.type === type) &&
        (category === "all" || transaction.category === category)
      );
    })
    .sort(
      (firstTransaction, secondTransaction) =>
        new Date(secondTransaction.date) - new Date(firstTransaction.date)
    );
}
