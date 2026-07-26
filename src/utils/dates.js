export function getMonthKey(dateValue) {
  return dateValue ? String(dateValue).slice(0, 7) : "";
}

export function getCurrentMonthKey(referenceDate = new Date()) {
  return `${referenceDate.getFullYear()}-${String(
    referenceDate.getMonth() + 1
  ).padStart(2, "0")}`;
}

export function getTodayKey(referenceDate = new Date()) {
  return `${referenceDate.getFullYear()}-${String(
    referenceDate.getMonth() + 1
  ).padStart(2, "0")}-${String(referenceDate.getDate()).padStart(2, "0")}`;
}

export function formatMonthLabel(monthKey) {
  if (!monthKey) {
    return "Chưa có dữ liệu";
  }

  const [year, month] = monthKey.split("-");
  return `Tháng ${month} / ${year}`;
}

export function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function getRecentMonthKeys(anchorMonthKey, count = 6) {
  const anchor = /^\d{4}-\d{2}$/.test(anchorMonthKey)
    ? anchorMonthKey
    : getCurrentMonthKey();
  const [year, month] = anchor.split("-").map(Number);

  return Array.from({ length: count }, (_, index) => {
    const date = new Date(year, month - count + index, 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
      2,
      "0"
    )}`;
  });
}

export function buildMonthlyData(transactions, anchorMonthKey, count = 6) {
  const monthKeys = getRecentMonthKeys(anchorMonthKey, count);
  const totalsByMonth = new Map(
    monthKeys.map((monthKey) => [
      monthKey,
      { monthKey, income: 0, expense: 0 },
    ])
  );

  transactions.forEach((transaction) => {
    const monthKey = getMonthKey(transaction.date);
    const monthData = totalsByMonth.get(monthKey);

    if (!monthData) {
      return;
    }

    const amount = Number(transaction.amount) || 0;
    if (transaction.type === "income") {
      monthData.income += amount;
    } else if (transaction.type === "expense") {
      monthData.expense += amount;
    }
  });

  return monthKeys.map((monthKey) => {
    const [year, month] = monthKey.split("-");
    const monthData = totalsByMonth.get(monthKey);

    return {
      month: `T${month}/${year}`,
      income: monthData.income,
      expense: monthData.expense,
    };
  });
}
