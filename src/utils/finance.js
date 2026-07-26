const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("vi-VN", {
  maximumFractionDigits: 0,
});

export function formatCurrency(amount) {
  const numericAmount = Number(amount);
  return currencyFormatter.format(Number.isFinite(numericAmount) ? numericAmount : 0);
}

export function sanitizeCurrencyInput(value) {
  const digits = String(value ?? "").replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  return digits;
}

export function formatCurrencyInput(value) {
  const digits = sanitizeCurrencyInput(value);

  if (!digits) {
    return "";
  }

  const amount = Number(digits);
  return Number.isSafeInteger(amount) ? numberFormatter.format(amount) : digits;
}

export function parseCurrencyInput(value) {
  const digits = sanitizeCurrencyInput(value);
  return digits ? Number(digits) : 0;
}

export function getTransactionTotals(transactions) {
  return transactions.reduce(
    (totals, transaction) => {
      const amount = Number(transaction.amount) || 0;

      if (transaction.type === "income") {
        totals.income += amount;
      } else if (transaction.type === "expense") {
        totals.expense += amount;
      }

      totals.balance = totals.income - totals.expense;
      return totals;
    },
    { income: 0, expense: 0, balance: 0 }
  );
}

export function getBudgetStatus(percent) {
  if (percent >= 100) {
    return {
      label: "Nguy hiểm",
      message: "Bạn đã chi tiêu vượt ngân sách tháng!",
      className: "danger",
    };
  }

  if (percent >= 80) {
    return {
      label: "Cảnh báo",
      message: "Sắp đạt giới hạn ngân sách!",
      className: "warning",
    };
  }

  return {
    label: "An toàn",
    message: "Chi tiêu hiện tại vẫn nằm trong mức an toàn.",
    className: "safe",
  };
}

export function getOcrConfidenceStatus(confidence) {
  const normalizedConfidence = Number(confidence);

  if (!Number.isFinite(normalizedConfidence)) {
    return {
      className: "unknown",
      label: "Chưa xác định",
      message: "Hãy kiểm tra lại các trường OCR đã điền trước khi lưu.",
    };
  }

  if (normalizedConfidence >= 0.85) {
    return {
      className: "high",
      label: "Tin cậy cao",
      message: "Kết quả nhận diện khá rõ. Bạn vẫn nên kiểm tra tổng tiền và ngày.",
    };
  }

  if (normalizedConfidence >= 0.7) {
    return {
      className: "medium",
      label: "Cần kiểm tra",
      message: "Độ tin cậy trung bình. Hãy đối chiếu cửa hàng, ngày và tổng tiền.",
    };
  }

  return {
    className: "low",
    label: "Tin cậy thấp",
    message: "Ảnh khó đọc. Hãy kiểm tra kỹ và sửa dữ liệu trước khi lưu.",
  };
}
