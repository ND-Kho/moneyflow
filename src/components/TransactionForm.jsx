import { useRef, useState } from "react";
import { supabase } from "../lib/supabase";

const MAX_TITLE_LENGTH = 100;
const MAX_NOTE_LENGTH = 500;
const MAX_RECEIPT_SIZE = 5 * 1024 * 1024;
const ALLOWED_RECEIPT_TYPES = ["image/jpeg", "image/png", "image/webp"];

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
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
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

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Không thể đọc ảnh hóa đơn."));
    reader.readAsDataURL(file);
  });
}

function TransactionForm({
  initialTransaction,
  onClose,
  onSubmit,
}) {
  const isEditing = Boolean(initialTransaction);

  const [form, setForm] = useState(
    initialTransaction
      ? {
          ...initialTransaction,
          title: initialTransaction.title || "",
          amount: initialTransaction.amount ?? "",
          date: initialTransaction.date || getToday(),
          note: initialTransaction.note || "",
        }
      : {
      type: "expense",
      title: "",
      amount: "",
      category: "Ăn uống",
      date: getToday(),
      note: "",
        }
  );
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receiptFile, setReceiptFile] = useState(null);
  const [removeReceipt, setRemoveReceipt] = useState(false);
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState(null);
  const [ocrConfidence, setOcrConfidence] = useState(
    initialTransaction?.receipt_ocr_confidence ?? null
  );
  const [ocrProcessedAt, setOcrProcessedAt] = useState(
    initialTransaction?.receipt_ocr_processed_at ?? null
  );
  const receiptInputRef = useRef(null);

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
    setErrors((currentErrors) => ({
      ...currentErrors,
      type: "",
      category: "",
    }));
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setForm({
      ...form,
      [name]: value,
    });

    if (errors[name]) {
      setErrors((currentErrors) => ({
        ...currentErrors,
        [name]: "",
      }));
    }
  }

  function handleReceiptChange(event) {
    const [file] = event.target.files;

    if (!file) {
      setReceiptFile(null);
      return;
    }

    if (!ALLOWED_RECEIPT_TYPES.includes(file.type)) {
      setErrors((currentErrors) => ({
        ...currentErrors,
        receipt: "Chỉ chấp nhận ảnh JPG, PNG hoặc WebP.",
      }));
      setReceiptFile(null);
      event.target.value = "";
      return;
    }

    if (file.size > MAX_RECEIPT_SIZE) {
      setErrors((currentErrors) => ({
        ...currentErrors,
        receipt: "Ảnh hóa đơn không được vượt quá 5 MB.",
      }));
      setReceiptFile(null);
      event.target.value = "";
      return;
    }

    setReceiptFile(file);
    setRemoveReceipt(false);
    setOcrResult(null);
    setOcrConfidence(null);
    setOcrProcessedAt(null);
    setErrors((currentErrors) => ({
      ...currentErrors,
      receipt: "",
    }));
  }

  function clearSelectedReceipt() {
    setReceiptFile(null);
    setOcrResult(null);
    setOcrConfidence(null);
    setOcrProcessedAt(null);

    if (receiptInputRef.current) {
      receiptInputRef.current.value = "";
    }
  }

  async function handleOcrReceipt() {
    if (!receiptFile || isOcrLoading) {
      return;
    }

    setIsOcrLoading(true);
    setErrors((currentErrors) => ({
      ...currentErrors,
      receipt: "",
      ocr: "",
    }));

    try {
      const imageDataUrl = await readFileAsDataUrl(receiptFile);
      const { data, error } = await supabase.functions.invoke("ocr-receipt", {
        body: { image_data_url: imageDataUrl },
      });

      if (error) {
        let errorMessage = error.message;

        if (error.context instanceof Response) {
          try {
            const errorBody = await error.context.clone().json();
            errorMessage = errorBody.error || errorMessage;
          } catch {
            // Keep the original Supabase Functions error message.
          }
        }

        throw new Error(errorMessage);
      }

      const receipt = data?.receipt;

      if (!receipt || typeof receipt !== "object") {
        throw new Error("OCR không trả về dữ liệu hợp lệ.");
      }

      const nextType = receipt.suggested_type === "income" ? "income" : "expense";
      const validCategories =
        nextType === "income" ? incomeCategories : expenseCategories;
      const nextCategory = validCategories.includes(receipt.suggested_category)
        ? receipt.suggested_category
        : "Khác";
      const nextAmount = Number(receipt.amount);

      setForm((currentForm) => ({
        ...currentForm,
        type: nextType,
        category: nextCategory,
        title:
          typeof receipt.merchant === "string" && receipt.merchant.trim()
            ? receipt.merchant.trim().slice(0, MAX_TITLE_LENGTH)
            : currentForm.title,
        amount:
          Number.isFinite(nextAmount) && nextAmount > 0
            ? nextAmount
            : currentForm.amount,
        date: isValidDate(receipt.transaction_date)
          ? receipt.transaction_date
          : currentForm.date,
        note:
          !currentForm.note && typeof receipt.note === "string"
            ? receipt.note.slice(0, MAX_NOTE_LENGTH)
            : currentForm.note,
      }));
      setOcrResult(receipt);
      setOcrConfidence(
        Number.isFinite(Number(receipt.confidence))
          ? Math.min(Math.max(Number(receipt.confidence), 0), 1)
          : null
      );
      setOcrProcessedAt(new Date().toISOString());
    } catch (error) {
      console.error("Lỗi OCR hóa đơn:", error);
      setErrors((currentErrors) => ({
        ...currentErrors,
        ocr:
          error.message || "Không thể đọc hóa đơn. Vui lòng thử lại.",
      }));
    } finally {
      setIsOcrLoading(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const amount = Number(form.amount);
    const nextErrors = {};

    if (!form.title.trim()) {
      nextErrors.title = "Vui lòng nhập nội dung giao dịch.";
    } else if (form.title.trim().length > MAX_TITLE_LENGTH) {
      nextErrors.title = `Nội dung không được vượt quá ${MAX_TITLE_LENGTH} ký tự.`;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      nextErrors.amount = "Số tiền phải là một số lớn hơn 0.";
    }

    if (!isValidDate(form.date)) {
      nextErrors.date = "Vui lòng chọn ngày giao dịch hợp lệ.";
    }

    if (!categories.includes(form.category)) {
      nextErrors.category = "Danh mục không phù hợp với loại giao dịch.";
    }

    if (form.note.trim().length > MAX_NOTE_LENGTH) {
      nextErrors.note = `Ghi chú không được vượt quá ${MAX_NOTE_LENGTH} ký tự.`;
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      const wasSaved = await onSubmit({
        ...form,
        title: form.title.trim(),
        note: form.note.trim(),
        amount,
        icon: categoryIcons[form.category] || "💳",
        receiptFile,
        removeReceipt,
        receiptOcrConfidence: removeReceipt ? null : ocrConfidence,
        receiptOcrProcessedAt: removeReceipt ? null : ocrProcessedAt,
      });

      if (!wasSaved) {
        setErrors({
          submit: "Không thể lưu giao dịch. Vui lòng kiểm tra và thử lại.",
        });
        setIsSubmitting(false);
      }
    } catch {
      setErrors({
        submit: "Đã xảy ra lỗi khi lưu giao dịch. Vui lòng thử lại.",
      });
      setIsSubmitting(false);
    }
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
              maxLength={MAX_TITLE_LENGTH}
              required
              aria-invalid={Boolean(errors.title)}
              placeholder="Ví dụ: Ăn trưa, đổ xăng, lương làm thêm..."
            />
            {errors.title && <span className="field-error">{errors.title}</span>}
          </label>

          <label>
            Số tiền
            <input
              name="amount"
              type="number"
              min="1"
              value={form.amount}
              onChange={handleChange}
              required
              aria-invalid={Boolean(errors.amount)}
              placeholder="Ví dụ: 45000"
            />
            {errors.amount && <span className="field-error">{errors.amount}</span>}
          </label>

          <div className="form-grid">
            <label>
              Danh mục
              <select
                name="category"
                value={form.category}
                onChange={handleChange}
                aria-invalid={Boolean(errors.category)}
              >
                {categories.map((category) => (
                  <option value={category} key={category}>
                    {category}
                  </option>
                ))}
              </select>
              {errors.category && (
                <span className="field-error">{errors.category}</span>
              )}
            </label>

            <label>
              Ngày giao dịch
              <input
                name="date"
                type="date"
                value={form.date}
                onChange={handleChange}
                required
                aria-invalid={Boolean(errors.date)}
              />
              {errors.date && <span className="field-error">{errors.date}</span>}
            </label>
          </div>

          <label>
            Ghi chú
            <textarea
              name="note"
              rows="3"
              value={form.note}
              onChange={handleChange}
              maxLength={MAX_NOTE_LENGTH}
              aria-invalid={Boolean(errors.note)}
              placeholder="Có thể bỏ trống"
            />
            <span className="field-hint">
              {form.note.length}/{MAX_NOTE_LENGTH} ký tự
            </span>
            {errors.note && <span className="field-error">{errors.note}</span>}
          </label>

          <label className="receipt-upload">
            Ảnh hóa đơn
            <input
              type="file"
              ref={receiptInputRef}
              accept="image/jpeg,image/png,image/webp"
              onChange={handleReceiptChange}
            />
            <span className="field-hint receipt-hint">
              Không bắt buộc • JPG, PNG hoặc WebP • Tối đa 5 MB
            </span>
            {receiptFile && (
              <div className="receipt-selection">
                <span>{receiptFile.name}</span>
                <button
                  type="button"
                  onClick={clearSelectedReceipt}
                  disabled={isSubmitting}
                >
                  Bỏ chọn
                </button>
              </div>
            )}
            {receiptFile && (
              <button
                className="ocr-button"
                type="button"
                onClick={handleOcrReceipt}
                disabled={isSubmitting || isOcrLoading}
              >
                {isOcrLoading
                  ? "Đang đọc hóa đơn..."
                  : "Đọc hóa đơn bằng OCR"}
              </button>
            )}
            {ocrResult && (
              <div className="ocr-result" role="status">
                <strong>
                  OCR đã điền dữ liệu
                  {ocrConfidence !== null
                    ? ` • Tin cậy ${Math.round(ocrConfidence * 100)}%`
                    : ""}
                </strong>
                <p>
                  {Array.isArray(ocrResult.items) && ocrResult.items.length > 0
                    ? `Đã nhận diện ${ocrResult.items.length} món. Hãy kiểm tra cửa hàng, danh sách món và tổng tiền trước khi lưu.`
                    : "Hãy kiểm tra lại cửa hàng, ngày và tổng tiền trước khi lưu."}
                </p>
              </div>
            )}
            {initialTransaction?.receipt_path && !receiptFile && (
              <div className="receipt-selection existing-receipt">
                <span>
                  {removeReceipt
                    ? "Hóa đơn hiện tại sẽ bị xóa"
                    : "Giao dịch đang có ảnh hóa đơn"}
                </span>
                <button
                  type="button"
                  onClick={() => setRemoveReceipt((currentValue) => !currentValue)}
                  disabled={isSubmitting}
                >
                  {removeReceipt ? "Giữ lại" : "Xóa hóa đơn"}
                </button>
              </div>
            )}
            {errors.receipt && (
              <span className="field-error">{errors.receipt}</span>
            )}
            {errors.ocr && <span className="field-error">{errors.ocr}</span>}
          </label>

          {errors.submit && (
            <p className="form-submit-error" role="alert">
              {errors.submit}
            </p>
          )}

          <div className="form-actions">
            <button
              className="secondary-button"
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Hủy
            </button>

            <button
              className="primary-button"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? "Đang lưu..."
                : isEditing
                ? "Lưu thay đổi"
                : "Lưu giao dịch"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default TransactionForm;
