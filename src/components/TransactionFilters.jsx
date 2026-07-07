function TransactionFilters({
  searchTerm,
  typeFilter,
  categoryFilter,
  categories,
  resultCount,
  onSearchChange,
  onTypeChange,
  onCategoryChange,
  onReset,
}) {
  const hasActiveFilters =
    searchTerm || typeFilter !== "all" || categoryFilter !== "all";

  return (
    <section className="panel filter-panel">
      <div className="filter-heading">
        <div>
          <h2>Tìm kiếm và lọc giao dịch</h2>
          <p>
            Tìm thấy <strong>{resultCount}</strong> giao dịch phù hợp
          </p>
        </div>

        {hasActiveFilters && (
          <button
            className="reset-filter-button"
            type="button"
            onClick={onReset}
          >
            Xóa bộ lọc
          </button>
        )}
      </div>

      <div className="filter-grid">
        <label className="search-box">
          <span>⌕</span>

          <input
            type="search"
            value={searchTerm}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Tìm theo nội dung, ghi chú hoặc danh mục..."
          />
        </label>

        <select
          value={typeFilter}
          onChange={(event) => onTypeChange(event.target.value)}
        >
          <option value="all">Tất cả loại</option>
          <option value="income">Khoản thu</option>
          <option value="expense">Khoản chi</option>
        </select>

        <select
          value={categoryFilter}
          onChange={(event) => onCategoryChange(event.target.value)}
        >
          <option value="all">Tất cả danh mục</option>

          {categories.map((category) => (
            <option value={category} key={category}>
              {category}
            </option>
          ))}
        </select>
      </div>
    </section>
  );
}

export default TransactionFilters;