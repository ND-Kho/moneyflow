const menuItems = [
  { id: "overview", icon: "▦", label: "Tổng quan" },
  { id: "transactions", icon: "↕", label: "Giao dịch" },
  { id: "budget", icon: "◎", label: "Ngân sách" },
  { id: "statistics", icon: "◷", label: "Thống kê" },
];

function Sidebar({ userEmail, onLogout, onNavigate, activeSection }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-logo">₫</div>

        <div>
          <h2>MoneyFlow</h2>
          <p>Quản lý tài chính</p>
        </div>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`nav-item ${activeSection === item.id ? "active" : ""}`}
            onClick={() => onNavigate(item.id)}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-user">
        <p>{userEmail}</p>

        <button type="button" onClick={onLogout}>
          Đăng xuất
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;