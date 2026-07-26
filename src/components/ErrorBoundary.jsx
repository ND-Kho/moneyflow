import { Component } from "react";

class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("MoneyFlow gặp lỗi giao diện:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="error-screen">
          <img src="/moneyflow-logo-192.png" alt="" width="72" height="72" />
          <h1>MoneyFlow tạm thời gặp sự cố</h1>
          <p>Dữ liệu của bạn vẫn an toàn. Hãy tải lại trang để tiếp tục.</p>
          <button type="button" onClick={() => window.location.reload()}>
            Tải lại trang
          </button>
        </main>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
