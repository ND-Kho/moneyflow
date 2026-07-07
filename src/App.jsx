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



function App() {
  const [session, setSession] = useState(null);
const [isAuthLoading, setIsAuthLoading] = useState(true);

 const [transactions, setTransactions] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  
  const [searchTerm, setSearchTerm] = useState("");
const [typeFilter, setTypeFilter] = useState("all");
const [categoryFilter, setCategoryFilter] = useState("all");

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

const dashboardTransactions = selectedMonth
  ? selectedMonthTransactions
  : transactions;

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


const selectedMonthIncome = selectedMonthTransactions
  .filter((transaction) => transaction.type === "income")
  .reduce(
    (sum, transaction) => sum + Number(transaction.amount),
    0
  );

const selectedMonthExpense = selectedMonthTransactions
  .filter((transaction) => transaction.type === "expense")
  .reduce(
    (sum, transaction) => sum + Number(transaction.amount),
    0
  );

const selectedMonthBalance = selectedMonthIncome - selectedMonthExpense;

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
  .map(({ monthKey, ...monthData }) => monthData);

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
    return;
  }

  if (editingTransaction) {
    const { data, error } = await supabase
      .from("transactions")
      .update({
        title: transaction.title,
        note: transaction.note || "",
        category: transaction.category,
        transaction_date: transaction.date,
        amount: Number(transaction.amount),
        type: transaction.type,
      })
      .eq("id", editingTransaction.id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      console.error("Lỗi cập nhật giao dịch:", error);
      alert(`Cập nhật giao dịch thất bại: ${error.message}`);
      return;
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
    };

    const { data, error } = await supabase
      .from("transactions")
      .insert(newTransaction)
      .select()
      .single();

    if (error) {
      console.error("Lỗi thêm giao dịch:", error);
      alert(`Thêm giao dịch thất bại: ${error.message}`);
      return;
    }

    const mappedTransaction = {
      ...data,
      date: data.transaction_date,
    };

    setTransactions((currentTransactions) => [
      mappedTransaction,
      ...currentTransactions,
    ]);
  }

  closeForm();
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

  setTransactions((currentTransactions) =>
    currentTransactions.filter(
      (transaction) => transaction.id !== id
    )
  );
}

function resetFilters() {
  setSearchTerm("");
  setTypeFilter("all");
  setCategoryFilter("all");
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
  description={`Thu nhập trong ${formatMonthLabel(selectedMonth)}`}
  type="income"
/>

<SummaryCard
  title="Tổng chi tiêu"
  value={formatCurrency(totalExpense)}
  description={`Chi tiêu trong ${formatMonthLabel(selectedMonth)}`}
  type="expense"
/>

<SummaryCard
  title="Số dư hiện tại"
  value={formatCurrency(balance)}
  description={`Thu nhập trừ chi tiêu trong ${formatMonthLabel(selectedMonth)}`}
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
    categories={categories}
    resultCount={filteredTransactions.length}
    onSearchChange={setSearchTerm}
    onTypeChange={setTypeFilter}
    onCategoryChange={setCategoryFilter}
    onReset={resetFilters}
  />

  <TransactionTable
    transactions={filteredTransactions}
    onEdit={handleEditTransaction}
    onDelete={handleDeleteTransaction}
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