import Brand from "./Brand";
import Icon from "./Icon";

const menuItems = [
  { id: "overview", icon: "overview", label: "Tổng quan" },
  { id: "transactions", icon: "transactions", label: "Giao dịch" },
  { id: "budget", icon: "budget", label: "Ngân sách" },
  { id: "statistics", icon: "statistics", label: "Thống kê" },
];

function Sidebar({ userEmail, onLogout, onNavigate, activeSection }) {
  return (
    <aside className="sidebar">
      <Brand className="sidebar-brand" />

      <nav className="sidebar-nav" aria-label="Điều hướng chính">
        {menuItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`nav-item ${activeSection === item.id ? "active" : ""}`}
            onClick={() => onNavigate(item.id)}
            aria-current={activeSection === item.id ? "page" : undefined}
          >
            <Icon name={item.icon} />
            <span>{item.label}</span>
          </button>
        ))}

        <button
          type="button"
          className="nav-item mobile-logout"
          onClick={onLogout}
          aria-label="Đăng xuất"
        >
          <Icon name="logout" />
          <span>Đăng xuất</span>
        </button>
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
