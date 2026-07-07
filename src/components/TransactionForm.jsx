import { useState } from "react";

const expenseCategories = [
  "Ăn uống",
  "Di chuyển",
  "Học tập",
  "Giải trí",
  "Mua sắm",
  "Hóa đơn",
  "Khác",
];

const incomeCategories = [
  "Lương",
  "Làm thêm",
  "Thưởng",
  "Quà tặng",
  "Khác",
];

const categoryIcons = {
  "Ăn uống": "🍜",
  "Di chuyển": "⛽",
  "Học tập": "📘",
  "Giải trí": "🎬",
  "Mua sắm": "🛍️",
  "Hóa đơn": "🧾",
  Lương: "💼",
  "Làm thêm": "💻",
  Thưởng: "🎁",
  "Quà tặng": "🎉",
  Khác: "💳",
};

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function TransactionForm({
  initialTransaction,
  onClose,
  onSubmit,
}) {
  const isEditing = Boolean(initialTransaction);

  const [form, setForm] = useState(
    initialTransaction || {
      type: "expense",
      title: "",
      amount: "",
      category: "Ăn uống",
      date: getToday(),
      note: "",
    }
  );

  const categories =
    form.type === "income" ? incomeCategories : expenseCategories;

  function handleTypeChange(type) {
    const defaultCategory =
      type === "income" ? incomeCategories[0] : expenseCategories[0];

    setForm({
      ...form,
      type,
      category: defaultCategory,
    });
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setForm({
      ...form,
      [name]: value,
    });
  }

  function handleSubmit(event) {
    event.preventDefault();

    const amount = Number(form.amount);

    if (!form.title.trim()) {
      alert("Vui lòng nhập nội dung giao dịch.");
      return;
    }

    if (!amount || amount <= 0) {
      alert("Số tiền phải lớn hơn 0.");
      return;
    }

    onSubmit({
      ...form,
      title: form.title.trim(),
      note: form.note.trim() || "Không có ghi chú",
      amount,
      icon: categoryIcons[form.category] || "💳",
    });
  }

  return (
    <div className="modal-backdrop">
      <section className="transaction-modal">
        <div className="modal-header">
          <div>
            <p className="page-label">
              {isEditing ? "CHỈNH SỬA GIAO DỊCH" : "GIAO DỊCH MỚI"}
            </p>

            <h2>
              {isEditing
                ? "Cập nhật thông tin giao dịch"
                : "Thêm khoản thu hoặc chi"}
            </h2>
          </div>

          <button
            className="close-button"
            type="button"
            onClick={onClose}
            aria-label="Đóng form"
          >
            ×
          </button>
        </div>

        <form className="transaction-form" onSubmit={handleSubmit}>
          <div className="type-switch">
            <button
              className={form.type === "expense" ? "selected expense" : ""}
              type="button"
              onClick={() => handleTypeChange("expense")}
            >
              Khoản chi
            </button>

            <button
              className={form.type === "income" ? "selected income" : ""}
              type="button"
              onClick={() => handleTypeChange("income")}
            >
              Khoản thu
            </button>
          </div>

          <label>
            Nội dung giao dịch
            <input
              name="title"
              type="text"
              value={form.title}
              onChange={handleChange}
              placeholder="Ví dụ: Ăn trưa, đổ xăng, lương làm thêm..."
            />
          </label>

          <label>
            Số tiền
            <input
              name="amount"
              type="number"
              min="1"
              value={form.amount}
              onChange={handleChange}
              placeholder="Ví dụ: 45000"
            />
          </label>

          <div className="form-grid">
            <label>
              Danh mục
              <select
                name="category"
                value={form.category}
                onChange={handleChange}
              >
                {categories.map((category) => (
                  <option value={category} key={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Ngày giao dịch
              <input
                name="date"
                type="date"
                value={form.date}
                onChange={handleChange}
              />
            </label>
          </div>

          <label>
            Ghi chú
            <textarea
              name="note"
              rows="3"
              value={form.note}
              onChange={handleChange}
              placeholder="Có thể bỏ trống"
            />
          </label>

          <div className="form-actions">
            <button
              className="secondary-button"
              type="button"
              onClick={onClose}
            >
              Hủy
            </button>

            <button className="primary-button" type="submit">
              {isEditing ? "Lưu thay đổi" : "Lưu giao dịch"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default TransactionForm;