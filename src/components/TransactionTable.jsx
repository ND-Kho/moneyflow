function formatCurrency(amount) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
}

function formatDate(date) {
  return new Intl.DateTimeFormat("vi-VN").format(
    new Date(`${date}T00:00:00`)
  );
}

function TransactionTable({
  transactions,
  onEdit,
  onDelete,
  onViewReceipt,
  onExport,
  isExporting,
  isLoading = false,
}) {
  return (
    <section className="panel transaction-panel">
      <div className="panel-header">
  <div>
    <h2>Danh sách giao dịch</h2>
    <p>Các khoản thu và chi phù hợp với bộ lọc hiện tại</p>
  </div>

  <div className="transaction-header-actions">
    <span className="transaction-count">
      {transactions.length} giao dịch
    </span>

    <button
      className="export-button"
      type="button"
      onClick={onExport}
      disabled={transactions.length === 0 || isExporting}
    >
      {isExporting ? "Đang xuất..." : "Xuất Excel"}
    </button>
  </div>
</div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Nội dung</th>
              <th>Danh mục</th>
              <th>Ngày</th>
              <th>Số tiền</th>
              <th>Thao tác</th>
            </tr>
          </thead>

          <tbody>
            {isLoading && Array.from({ length: 3 }, (_, index) => (
              <tr className="table-skeleton-row" key={`skeleton-${index}`}>
                <td colSpan="5"><div className="skeleton-block"></div></td>
              </tr>
            ))}
            {!isLoading && transactions.map((transaction) => (
              <tr key={transaction.id}>
                <td data-label="Nội dung">
                  <div className="transaction-name">
                    <div className="transaction-icon">
                      {transaction.icon}
                    </div>

                    <div>
                      <strong>{transaction.title}</strong>
                      <p>{transaction.note}</p>
                    </div>
                  </div>
                </td>

                <td data-label="Danh mục">
                  <span className="category-badge">
                    {transaction.category}
                  </span>
                </td>

                <td data-label="Ngày">{formatDate(transaction.date)}</td>

                <td
                  data-label="Số tiền"
                  className={
                    transaction.type === "income"
                      ? "amount income-text"
                      : "amount expense-text"
                  }
                >
                  {transaction.type === "income" ? "+" : "-"}
                  {formatCurrency(transaction.amount)}
                </td>

                <td data-label="Thao tác">
                  <div className="table-actions">
                    {transaction.receipt_path && (
                      <button
                        className="receipt-button"
                        type="button"
                        onClick={() => onViewReceipt(transaction.receipt_path)}
                      >
                        Hóa đơn
                      </button>
                    )}

                    <button
                      className="edit-button"
                      type="button"
                      onClick={() => onEdit(transaction)}
                    >
                      Sửa
                    </button>

                    <button
                      className="delete-button"
                      type="button"
                      onClick={() => onDelete(transaction.id)}
                    >
                      Xóa
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {!isLoading && transactions.length === 0 && (
              <tr>
                <td className="empty-message" colSpan="5">
                  Chưa có giao dịch nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default TransactionTable;
