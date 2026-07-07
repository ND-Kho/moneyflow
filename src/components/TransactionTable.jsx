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
}) {
  return (
    <section className="panel transaction-panel">
      <div className="panel-header">
  <div>
    <h2>Danh sách giao dịch</h2>
    <p>Các khoản thu và chi phù hợp với bộ lọc hiện tại</p>
  </div>

  <span className="transaction-count">
    {transactions.length} giao dịch
  </span>
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
            {transactions.map((transaction) => (
              <tr key={transaction.id}>
                <td>
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

                <td>
                  <span className="category-badge">
                    {transaction.category}
                  </span>
                </td>

                <td>{formatDate(transaction.date)}</td>

                <td
                  className={
                    transaction.type === "income"
                      ? "amount income-text"
                      : "amount expense-text"
                  }
                >
                  {transaction.type === "income" ? "+" : "-"}
                  {formatCurrency(transaction.amount)}
                </td>

                <td>
                  <div className="table-actions">
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

            {transactions.length === 0 && (
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