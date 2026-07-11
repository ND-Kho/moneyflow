import { useEffect, useState } from "react";
import "./App.css";

import { supabase } from "./lib/supabase";
import AuthPage from "./components/AuthPage";

import Sidebar from "./components/Sidebar";
import SummaryCard from "./components/SummaryCard";
import TransactionForm from "./components/TransactionForm";
import TransactionFilters from "./components/TransactionFilters";
import TransactionTable from "./components/TransactionTable";

import {
  ExpensePieChart,
  MonthlyBarChart,
} from "./components/FinanceCharts";


function formatCurrency(amount) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
}

function getMonthKey(dateValue) {
  if (!dateValue) {
    return "";
  }

  return String(dateValue).slice(0, 7);
}

function formatMonthLabel(monthKey) {
  if (!monthKey) {
    return "Chưa có dữ liệu";
  }

  const [year, month] = monthKey.split("-");
  return `Tháng ${month} / ${year}`;
}

function isValidDate(value) {
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

function isValidTransaction(transaction) {
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
    isValidDate(date)
  );
}

const RECEIPTS_BUCKET = "receipts";
const MAX_RECEIPT_SIZE = 5 * 1024 * 1024;
const ALLOWED_RECEIPT_TYPES = ["image/jpeg", "image/png", "image/webp"];

function isValidReceiptFile(file) {
  return (
    !file ||
    (ALLOWED_RECEIPT_TYPES.includes(file.type) &&
      file.size > 0 &&
      file.size <= MAX_RECEIPT_SIZE)
  );
}

function getReceiptExtension(file) {
  const extensions = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };

  return extensions[file.type];
}

async function uploadReceipt(userId, transactionId, file) {
  const extension = getReceiptExtension(file);
  const path = `${userId}/${transactionId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage
    .from(RECEIPTS_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    throw error;
  }

  return path;
}

async function removeReceipt(path) {
  if (!path) {
    return;
  }

  const { error } = await supabase.storage
    .from(RECEIPTS_BUCKET)
    .remove([path]);

  if (error) {
    console.error("Không thể xóa ảnh hóa đơn:", error);
  }
}

async function exportTransactionsToExcel(transactionsToExport) {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Giao dịch", {
    views: [{ state: "frozen", ySplit: 4, showGridLines: false }],
    pageSetup: {
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    },
  });

  workbook.creator = "MoneyFlow";
  workbook.created = new Date();
  workbook.modified = new Date();

  worksheet.mergeCells("A1:G1");
  worksheet.getCell("A1").value = "BÁO CÁO GIAO DỊCH MONEYFLOW";
  worksheet.getCell("A1").font = {
    name: "Arial",
    size: 16,
    bold: true,
    color: { argb: "FFFFFFFF" },
  };
  worksheet.getCell("A1").fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF5662D8" },
  };
  worksheet.getCell("A1").alignment = {
    horizontal: "center",
    vertical: "middle",
  };
  worksheet.getRow(1).height = 30;

  worksheet.mergeCells("A2:G2");
  worksheet.getCell("A2").value =
    `Xuất lúc ${new Intl.DateTimeFormat("vi-VN", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date())} • ${transactionsToExport.length} giao dịch`;
  worksheet.getCell("A2").font = {
    name: "Arial",
    size: 10,
    italic: true,
    color: { argb: "FF667085" },
  };
  worksheet.getCell("A2").alignment = { horizontal: "center" };

  const rows = transactionsToExport.map((transaction) => {
    const [year, month, day] = transaction.date.split("-").map(Number);

    return [
      new Date(year, month - 1, day),
      transaction.type === "income" ? "Khoản thu" : "Khoản chi",
      transaction.title,
      transaction.category,
      Number(transaction.amount),
      transaction.note || "",
      transaction.receipt_path ? "Có" : "Không",
    ];
  });

  worksheet.addTable({
    name: "MoneyFlowTransactions",
    ref: "A4",
    headerRow: true,
    totalsRow: false,
    style: {
      theme: "TableStyleMedium2",
      showRowStripes: true,
      showColumnStripes: false,
    },
    columns: [
      { name: "Ngày", filterButton: true },
      { name: "Loại", filterButton: true },
      { name: "Nội dung", filterButton: true },
      { name: "Danh mục", filterButton: true },
      { name: "Số tiền", filterButton: true },
      { name: "Ghi chú", filterButton: true },
      { name: "Hóa đơn", filterButton: true },
    ],
    rows,
  });

  const columnWidths = [14, 15, 28, 18, 18, 36, 12];
  columnWidths.forEach((width, index) => {
    worksheet.getColumn(index + 1).width = width;
  });

  worksheet.getRow(4).height = 24;
  worksheet.getRow(4).alignment = {
    horizontal: "center",
    vertical: "middle",
  };

  for (let rowNumber = 5; rowNumber < rows.length + 5; rowNumber += 1) {
    worksheet.getCell(`A${rowNumber}`).numFmt = "dd/mm/yyyy";
    worksheet.getCell(`A${rowNumber}`).alignment = { horizontal: "center" };
    worksheet.getCell(`B${rowNumber}`).alignment = { horizontal: "center" };
    worksheet.getCell(`E${rowNumber}`).numFmt = '#,##0 "VND"';
    worksheet.getCell(`E${rowNumber}`).alignment = { horizontal: "right" };
    worksheet.getCell(`F${rowNumber}`).alignment = {
      vertical: "top",
      wrapText: true,
    };
    worksheet.getCell(`G${rowNumber}`).alignment = { horizontal: "center" };
  }

  if (rows.length > 0) {
    const lastRow = rows.length + 4;

    worksheet.addConditionalFormatting({
      ref: `E5:E${lastRow}`,
      rules: [
        {
          type: "expression",
          formulae: ['$B5="Khoản thu"'],
          style: { font: { color: { argb: "FF15803D" } } },
        },
        {
          type: "expression",
          formulae: ['$B5="Khoản chi"'],
          style: { font: { color: { argb: "FFDC2626" } } },
        },
      ],
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const downloadUrl = URL.createObjectURL(blob);
  const downloadLink = document.createElement("a");

  downloadLink.href = downloadUrl;
  downloadLink.download = `moneyflow-${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  downloadLink.remove();
  URL.revokeObjectURL(downloadUrl);
}



function App() {
  const [session, setSession] = useState(null);
const [isAuthLoading, setIsAuthLoading] = useState(true);

 const [transactions, setTransactions] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  
  const [searchTerm, setSearchTerm] = useState("");
const [typeFilter, setTypeFilter] = useState("all");
const [categoryFilter, setCategoryFilter] = useState("all");
const [startDateFilter, setStartDateFilter] = useState("");
const [endDateFilter, setEndDateFilter] = useState("");
const [isExporting, setIsExporting] = useState(false);

const [selectedMonth, setSelectedMonth] = useState("");
const [monthlyBudgetLimit, setMonthlyBudgetLimit] = useState(10000000);
const [budgetInput, setBudgetInput] = useState("10000000");

const [activeSection, setActiveSection] = useState("overview");

function handleSidebarNavigate(sectionId) {
  setActiveSection(sectionId);

  const section = document.getElementById(sectionId);

  if (section) {
    section.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }
}

const fetchTransactions = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    setTransactions([]);
    return;
  }

  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", user.id)
    .order("transaction_date", { ascending: false });

  if (error) {
    console.error("Lỗi lấy giao dịch:", error);
    alert(`Không thể tải danh sách giao dịch: ${error.message}`);
    return;
  }

  const mappedTransactions = (data || []).map((item) => ({
    ...item,
    date: item.transaction_date,
  }));

  setTransactions(mappedTransactions);
};

const fetchMonthlyBudget = async (monthKey) => {
  if (!monthKey) {
    setMonthlyBudgetLimit(10000000);
    setBudgetInput("10000000");
    return;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  const { data, error } = await supabase
    .from("monthly_budgets")
    .select("*")
    .eq("user_id", user.id)
    .eq("month_key", monthKey)
    .maybeSingle();

  if (error) {
    console.error("Lỗi lấy ngân sách tháng:", error);
    return;
  }

  if (!data) {
    setMonthlyBudgetLimit(10000000);
    setBudgetInput("10000000");
    return;
  }

  setMonthlyBudgetLimit(Number(data.amount));
  setBudgetInput(String(Number(data.amount)));
};

useEffect(() => {
  if (session && selectedMonth) {
    // Budget is loaded from Supabase after the selected month changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchMonthlyBudget(selectedMonth);
  }
}, [session, selectedMonth]);

useEffect(() => {
  async function loadSession() {
    const {
      data: { session: currentSession },
    } = await supabase.auth.getSession();

    setSession(currentSession);
    setIsAuthLoading(false);
  }

  loadSession();

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, currentSession) => {
    setSession(currentSession);
    setIsAuthLoading(false);
  });

  return () => {
    subscription.unsubscribe();
  };
}, []);

useEffect(() => {
  if (transactions.length === 0) {
    // Keep the month selector consistent with the available transaction data.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedMonth("");
    return;
  }

  const latestTransaction = [...transactions].sort(
    (firstTransaction, secondTransaction) =>
      new Date(secondTransaction.date) - new Date(firstTransaction.date)
  )[0];

  const latestMonthKey = getMonthKey(latestTransaction.date);

  if (!selectedMonth) {
    setSelectedMonth(latestMonthKey);
  }
}, [transactions, selectedMonth]);

useEffect(() => {
  if (session) {
    // Transaction state is populated asynchronously from Supabase.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTransactions();
  } else {
    setTransactions([]);
  }
}, [session]);

async function handleLogout() {
  const confirmed = window.confirm(
    "Bạn có chắc chắn muốn đăng xuất không?"
  );

  if (!confirmed) {
    return;
  }

  const { error } = await supabase.auth.signOut({
    scope: "local",
  });

  if (error) {
    alert(`Không thể đăng xuất: ${error.message}`);
  }
}

const availableMonths = [
  ...new Set(
    transactions
      .map((transaction) => getMonthKey(transaction.date))
      .filter(Boolean)
  ),

  ].sort((firstMonth, secondMonth) =>
  secondMonth.localeCompare(firstMonth)
);

const selectedMonthTransactions = transactions.filter(
  (transaction) => getMonthKey(transaction.date) === selectedMonth
);

const hasDateRange = Boolean(startDateFilter || endDateFilter);
const hasInvalidDateRange = Boolean(
  startDateFilter && endDateFilter && startDateFilter > endDateFilter
);
const dateRangeTransactions = hasInvalidDateRange
  ? []
  : transactions.filter((transaction) => {
      const matchesStartDate =
        !startDateFilter || transaction.date >= startDateFilter;
      const matchesEndDate =
        !endDateFilter || transaction.date <= endDateFilter;

      return matchesStartDate && matchesEndDate;
    });

const dashboardTransactions = hasDateRange
  ? dateRangeTransactions
  : selectedMonth
  ? selectedMonthTransactions
  : transactions;

const activePeriodLabel = hasDateRange
  ? `${startDateFilter || "đầu kỳ"} đến ${endDateFilter || "hiện tại"}`
  : formatMonthLabel(selectedMonth);

const totalIncome = dashboardTransactions
  .filter((transaction) => transaction.type === "income")
  .reduce(
    (sum, transaction) => sum + Number(transaction.amount),
    0
  );

const totalExpense = dashboardTransactions
  .filter((transaction) => transaction.type === "expense")
  .reduce(
    (sum, transaction) => sum + Number(transaction.amount),
    0
  );

const balance = totalIncome - totalExpense;


const selectedMonthExpense = selectedMonthTransactions
  .filter((transaction) => transaction.type === "expense")
  .reduce(
    (sum, transaction) => sum + Number(transaction.amount),
    0
  );

const selectedMonthBudgetPercent =
  monthlyBudgetLimit > 0
    ? Math.round((selectedMonthExpense / monthlyBudgetLimit) * 100)
    : 0;

const budgetStatus =
  selectedMonthBudgetPercent >= 100
    ? {
        label: "Đã vượt ngân sách",
        message: "Chi tiêu tháng này đã vượt giới hạn. Bạn nên kiểm tra lại các khoản chi.",
        className: "danger",
      }
    : selectedMonthBudgetPercent >= 80
    ? {
        label: "Sắp vượt ngân sách",
        message: "Chi tiêu đang tiến gần giới hạn ngân sách tháng.",
        className: "warning",
      }
    : selectedMonthBudgetPercent >= 50
    ? {
        label: "Cần chú ý",
        message: "Bạn đã sử dụng hơn một nửa ngân sách tháng.",
        className: "notice",
      }
    : {
        label: "An toàn",
        message: "Chi tiêu hiện tại vẫn nằm trong mức an toàn.",
        className: "safe",
      };

const monthlyData = Object.values(
  transactions.reduce((result, transaction) => {
    const transactionDate = new Date(transaction.date);

    if (Number.isNaN(transactionDate.getTime())) {
      return result;
    }

    const monthKey = `${transactionDate.getFullYear()}-${String(
      transactionDate.getMonth() + 1
    ).padStart(2, "0")}`;

    const monthLabel = `T${String(
      transactionDate.getMonth() + 1
    ).padStart(2, "0")}/${transactionDate.getFullYear()}`;

    if (!result[monthKey]) {
      result[monthKey] = {
        monthKey,
        month: monthLabel,
        income: 0,
        expense: 0,
      };
    }

    if (transaction.type === "income") {
      result[monthKey].income += Number(transaction.amount);
    }

    if (transaction.type === "expense") {
      result[monthKey].expense += Number(transaction.amount);
    }

    return result;
  }, {})
)
  .sort((firstMonth, secondMonth) =>
    firstMonth.monthKey.localeCompare(secondMonth.monthKey)
  )
  .slice(-6)
  .map((monthData) => ({
    month: monthData.month,
    income: monthData.income,
    expense: monthData.expense,
  }));

  const expenseCategoryData = Object.values(
  dashboardTransactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((result, transaction) => {
      if (!result[transaction.category]) {
        result[transaction.category] = {
          name: transaction.category,
          value: 0,
        };
      }

      result[transaction.category].value += Number(transaction.amount);
      return result;
    }, {})
);

  const categories = [
  ...new Set(
    dashboardTransactions.map(
      (transaction) => transaction.category
    )
  ),
].sort((firstCategory, secondCategory) =>
  firstCategory.localeCompare(secondCategory, "vi")
);

function normalizeText(text) {
  return String(text)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

const normalizedSearchTerm = normalizeText(searchTerm.trim());

const filteredTransactions = dashboardTransactions
  .filter((transaction) => {
    const searchableText = normalizeText(
      `${transaction.title} ${transaction.note} ${transaction.category}`
    );

    const matchesSearch =
      !normalizedSearchTerm ||
      searchableText.includes(normalizedSearchTerm);

    const matchesType =
      typeFilter === "all" ||
      transaction.type === typeFilter;

    const matchesCategory =
      categoryFilter === "all" ||
      transaction.category === categoryFilter;

    return matchesSearch && matchesType && matchesCategory;
  })
  .sort(
    (firstTransaction, secondTransaction) =>
      new Date(secondTransaction.date) -
      new Date(firstTransaction.date)
  );

  function closeForm() {
  setIsFormOpen(false);
  setEditingTransaction(null);
}

async function handleSaveTransaction(transaction) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    alert("Bạn cần đăng nhập trước khi lưu giao dịch.");
    return false;
  }

  if (!isValidTransaction(transaction)) {
    alert("Dữ liệu giao dịch không hợp lệ. Vui lòng kiểm tra lại.");
    return false;
  }

  if (!isValidReceiptFile(transaction.receiptFile)) {
    alert("Ảnh hóa đơn phải là JPG, PNG hoặc WebP và không vượt quá 5 MB.");
    return false;
  }

  if (editingTransaction) {
    let uploadedReceiptPath = null;

    if (transaction.receiptFile) {
      try {
        uploadedReceiptPath = await uploadReceipt(
          user.id,
          editingTransaction.id,
          transaction.receiptFile
        );
      } catch (uploadError) {
        console.error("Lỗi tải ảnh hóa đơn:", uploadError);
        alert(`Tải ảnh hóa đơn thất bại: ${uploadError.message}`);
        return false;
      }
    }

    const nextReceiptPath = uploadedReceiptPath
      ? uploadedReceiptPath
      : transaction.removeReceipt
      ? null
      : editingTransaction.receipt_path || null;
    const { data, error } = await supabase
      .from("transactions")
      .update({
        title: transaction.title,
        note: transaction.note || "",
        category: transaction.category,
        transaction_date: transaction.date,
        amount: Number(transaction.amount),
        type: transaction.type,
        icon: transaction.icon || "💳",
        receipt_path: nextReceiptPath,
        receipt_ocr_confidence:
          transaction.receiptOcrConfidence ?? null,
        receipt_ocr_processed_at:
          transaction.receiptOcrProcessedAt ?? null,
      })
      .eq("id", editingTransaction.id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      await removeReceipt(uploadedReceiptPath);
      console.error("Lỗi cập nhật giao dịch:", error);
      alert(`Cập nhật giao dịch thất bại: ${error.message}`);
      return false;
    }

    if (
      editingTransaction.receipt_path &&
      editingTransaction.receipt_path !== nextReceiptPath
    ) {
      await removeReceipt(editingTransaction.receipt_path);
    }

    const mappedTransaction = {
      ...data,
      date: data.transaction_date,
    };

    setTransactions((currentTransactions) =>
      currentTransactions.map((currentTransaction) =>
        currentTransaction.id === editingTransaction.id
          ? mappedTransaction
          : currentTransaction
      )
    );
  } else {
    const newTransaction = {
      user_id: user.id,
      title: transaction.title,
      note: transaction.note || "",
      category: transaction.category,
      transaction_date: transaction.date,
      amount: Number(transaction.amount),
      type: transaction.type,
      icon: transaction.icon || "💳",
      receipt_ocr_confidence:
        transaction.receiptOcrConfidence ?? null,
      receipt_ocr_processed_at:
        transaction.receiptOcrProcessedAt ?? null,
    };

    const { data, error } = await supabase
      .from("transactions")
      .insert(newTransaction)
      .select()
      .single();

    if (error) {
      console.error("Lỗi thêm giao dịch:", error);
      alert(`Thêm giao dịch thất bại: ${error.message}`);
      return false;
    }

    let savedTransaction = data;

    if (transaction.receiptFile) {
      let uploadedReceiptPath = null;

      try {
        uploadedReceiptPath = await uploadReceipt(
          user.id,
          data.id,
          transaction.receiptFile
        );

        const { data: transactionWithReceipt, error: receiptUpdateError } =
          await supabase
            .from("transactions")
            .update({ receipt_path: uploadedReceiptPath })
            .eq("id", data.id)
            .eq("user_id", user.id)
            .select()
            .single();

        if (receiptUpdateError) {
          throw receiptUpdateError;
        }

        savedTransaction = transactionWithReceipt;
      } catch (receiptError) {
        await removeReceipt(uploadedReceiptPath);
        await supabase
          .from("transactions")
          .delete()
          .eq("id", data.id)
          .eq("user_id", user.id);
        console.error("Lỗi lưu ảnh hóa đơn:", receiptError);
        alert(`Lưu ảnh hóa đơn thất bại: ${receiptError.message}`);
        return false;
      }
    }

    const mappedTransaction = {
      ...savedTransaction,
      date: savedTransaction.transaction_date,
    };

    setTransactions((currentTransactions) => [
      mappedTransaction,
      ...currentTransactions,
    ]);
  }

  closeForm();
  return true;
}

function handleEditTransaction(transaction) {
  setEditingTransaction(transaction);
  setIsFormOpen(true);
}

async function handleDeleteTransaction(id) {
  const confirmed = window.confirm(
    "Bạn có chắc chắn muốn xóa giao dịch này không?"
  );

  if (!confirmed) {
    return;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    alert("Bạn cần đăng nhập trước khi xóa giao dịch.");
    return;
  }

  const transactionToDelete = transactions.find(
    (transaction) => transaction.id === id
  );

  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("Lỗi xóa giao dịch:", error.message);
    alert("Xóa giao dịch thất bại.");
    return;
  }

  await removeReceipt(transactionToDelete?.receipt_path);

  setTransactions((currentTransactions) =>
    currentTransactions.filter(
      (transaction) => transaction.id !== id
    )
  );
}

async function handleViewReceipt(path) {
  const { data, error } = await supabase.storage
    .from(RECEIPTS_BUCKET)
    .createSignedUrl(path, 60);

  if (error) {
    console.error("Lỗi mở ảnh hóa đơn:", error);
    alert("Không thể mở ảnh hóa đơn. Vui lòng thử lại.");
    return;
  }

  const receiptLink = document.createElement("a");
  receiptLink.href = data.signedUrl;
  receiptLink.target = "_blank";
  receiptLink.rel = "noopener noreferrer";
  receiptLink.click();
}

function resetFilters() {
  setSearchTerm("");
  setTypeFilter("all");
  setCategoryFilter("all");
  setStartDateFilter("");
  setEndDateFilter("");
}

async function handleExportTransactions() {
  if (filteredTransactions.length === 0 || isExporting) {
    return;
  }

  setIsExporting(true);

  try {
    await exportTransactionsToExcel(filteredTransactions);
  } catch (error) {
    console.error("Lỗi xuất Excel:", error);
    alert("Không thể xuất file Excel. Vui lòng thử lại.");
  } finally {
    setIsExporting(false);
  }
}

async function handleSaveBudget() {
  const budgetAmount = Number(budgetInput);

  if (!selectedMonth) {
    alert("Bạn cần chọn tháng trước khi lưu ngân sách.");
    return;
  }

  if (!budgetAmount || budgetAmount <= 0) {
    alert("Ngân sách phải lớn hơn 0.");
    return;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    alert("Bạn cần đăng nhập trước khi lưu ngân sách.");
    return;
  }

  const { data, error } = await supabase
    .from("monthly_budgets")
    .upsert(
      {
        user_id: user.id,
        month_key: selectedMonth,
        amount: budgetAmount,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id,month_key",
      }
    )
    .select()
    .single();

  if (error) {
    console.error("Lỗi lưu ngân sách:", error);
    alert(`Lưu ngân sách thất bại: ${error.message}`);
    return;
  }

  setMonthlyBudgetLimit(Number(data.amount));
  setBudgetInput(String(Number(data.amount)));
  alert("Đã lưu ngân sách tháng.");
}

if (isAuthLoading) {
  return (
    <main className="loading-screen">
      <div className="loading-card">
        <div className="brand-logo">₫</div>
        <p>Đang tải MoneyFlow...</p>
      </div>
    </main>
  );
}

if (!session) {
  return <AuthPage />;
}

  return (
    <div className="app-layout">
<Sidebar
  userEmail={session.user.email}
  onLogout={handleLogout}
  onNavigate={handleSidebarNavigate}
  activeSection={activeSection}
/>

      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="page-label">TỔNG QUAN</p>
            <h1>Tổng quan tài chính</h1>
<span>Theo dõi thu nhập, chi tiêu và ngân sách của bạn.</span>          </div>
          <div className="topbar-actions">

<select
  className="month-button"
  value={selectedMonth}
  onChange={(event) => setSelectedMonth(event.target.value)}
>
  {availableMonths.length === 0 ? (
    <option value="">Chưa có dữ liệu</option>
  ) : (
    availableMonths.map((monthKey) => (
      <option key={monthKey} value={monthKey}>
        {formatMonthLabel(monthKey)}
      </option>
    ))
  )}
</select>

  <button
    className="primary-button"
    type="button"
    onClick={() => {
      setEditingTransaction(null);
      setIsFormOpen(true);
    }}
  >
    + Thêm giao dịch
  </button>
</div>
        </header>

        <section id="overview" className="summary-grid">
          <SummaryCard
  title="Tổng thu nhập"
  value={formatCurrency(totalIncome)}
  description={`Thu nhập trong ${activePeriodLabel}`}
  type="income"
/>

<SummaryCard
  title="Tổng chi tiêu"
  value={formatCurrency(totalExpense)}
  description={`Chi tiêu trong ${activePeriodLabel}`}
  type="expense"
/>

<SummaryCard
  title="Số dư hiện tại"
  value={formatCurrency(balance)}
  description={`Thu nhập trừ chi tiêu trong ${activePeriodLabel}`}
  type="balance"
/>
        </section>

        <section className="overview-grid">
          <MonthlyBarChart data={monthlyData} />

          <article id="budget" className="panel budget-panel">
            <div className="panel-header">
              <div>
                <h2>Ngân sách tháng</h2>
                <p>Kiểm soát giới hạn chi tiêu</p>
              </div>
            </div>

            <div className="budget-content">
              <strong>{formatCurrency(selectedMonthExpense)}</strong>
<span>trên ngân sách {formatCurrency(monthlyBudgetLimit)}</span>
<div className="budget-editor">
  <input
    type="number"
    min="1"
    value={budgetInput}
    onChange={(event) => setBudgetInput(event.target.value)}
    placeholder="Nhập ngân sách tháng"
  />

  <button type="button" onClick={handleSaveBudget}>
    Lưu ngân sách
  </button>
</div>
              <div className="progress-track">
                <div
                  className="progress-value"
                  style={{
                    width: `${Math.min(selectedMonthBudgetPercent, 100)}%`,
                  }}
                ></div>
              </div>

              <div className={`budget-status ${budgetStatus.className}`}>
  <strong>{budgetStatus.label}</strong>
  <p>{budgetStatus.message}</p>
</div>

<p>
  Bạn đã sử dụng {selectedMonthBudgetPercent}% ngân sách trong{" "}
  {formatMonthLabel(selectedMonth)}.
</p>
            </div>
          </article>
        </section>

        <section id="statistics">
  <ExpensePieChart data={expenseCategoryData} />
</section>

<section id="transactions">
  <TransactionFilters
    searchTerm={searchTerm}
    typeFilter={typeFilter}
    categoryFilter={categoryFilter}
    startDate={startDateFilter}
    endDate={endDateFilter}
    hasInvalidDateRange={hasInvalidDateRange}
    categories={categories}
    resultCount={filteredTransactions.length}
    onSearchChange={setSearchTerm}
    onTypeChange={setTypeFilter}
    onCategoryChange={setCategoryFilter}
    onStartDateChange={setStartDateFilter}
    onEndDateChange={setEndDateFilter}
    onReset={resetFilters}
  />

  <TransactionTable
    transactions={filteredTransactions}
    onEdit={handleEditTransaction}
    onDelete={handleDeleteTransaction}
    onViewReceipt={handleViewReceipt}
    onExport={handleExportTransactions}
    isExporting={isExporting}
  />
</section>
      </main>

      {isFormOpen && (
  <TransactionForm
    initialTransaction={editingTransaction}
    onClose={closeForm}
    onSubmit={handleSaveTransaction}
  />
)}
    </div>
  );
}

export default App;
