import { useState } from "react";
import { supabase } from "../lib/supabase";

function AuthPage() {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isRegisterMode = mode === "register";

  function handleChange(event) {
    const { name, value } = event.target;

    setForm({
      ...form,
      [name]: value,
    });
  }

  function switchMode(nextMode) {
    setMode(nextMode);
    setMessage("");
    setErrorMessage("");

    setForm({
      email: "",
      password: "",
      confirmPassword: "",
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setMessage("");
    setErrorMessage("");

    const email = form.email.trim();
    const password = form.password;

    if (!email || !password) {
      setErrorMessage("Vui lòng nhập đầy đủ email và mật khẩu.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Mật khẩu phải có ít nhất 6 ký tự.");
      return;
    }

    if (isRegisterMode && password !== form.confirmPassword) {
      setErrorMessage("Mật khẩu xác nhận không khớp.");
      return;
    }

    setIsSubmitting(true);

    try {
      if (isRegisterMode) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) {
          throw error;
        }

        setMessage("Đăng ký thành công. Bạn đang được đăng nhập...");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          throw error;
        }
      }
    } catch (error) {
      setErrorMessage(
        error.message || "Không thể xử lý yêu cầu. Vui lòng thử lại."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-introduction">
        <div className="auth-brand">
          <div className="brand-logo">₫</div>

          <div>
            <h2>MoneyFlow</h2>
            <p>Quản lý tài chính cá nhân</p>
          </div>
        </div>

        <div className="auth-introduction-content">
          <p className="auth-eyebrow">PERSONAL FINANCE</p>

          <h1>
            Kiểm soát chi tiêu,
            <span> làm chủ tài chính.</span>
          </h1>

          <p className="auth-description">
            Ghi chép các khoản thu chi, phân tích ngân sách và theo dõi
            tình hình tài chính cá nhân trên một giao diện trực quan.
          </p>

          <div className="auth-feature-list">
            <div>
              <strong>✓</strong>
              <span>Quản lý khoản thu và chi</span>
            </div>

            <div>
              <strong>✓</strong>
              <span>Thống kê bằng biểu đồ trực quan</span>
            </div>

            <div>
              <strong>✓</strong>
              <span>Dữ liệu riêng biệt cho từng tài khoản</span>
            </div>
          </div>
        </div>
      </section>

      <section className="auth-form-section">
        <form className="auth-card" onSubmit={handleSubmit}>
          <div>
            <p className="page-label">
              {isRegisterMode ? "TẠO TÀI KHOẢN" : "CHÀO MỪNG TRỞ LẠI"}
            </p>

            <h2>
              {isRegisterMode ? "Đăng ký MoneyFlow" : "Đăng nhập"}
            </h2>

            <p className="auth-card-description">
              {isRegisterMode
                ? "Tạo tài khoản để bắt đầu theo dõi tài chính cá nhân."
                : "Nhập thông tin tài khoản để tiếp tục quản lý chi tiêu."}
            </p>
          </div>

          <label>
            Email
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="name@example.com"
              autoComplete="email"
            />
          </label>

          <label>
            Mật khẩu
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Tối thiểu 6 ký tự"
              autoComplete={
                isRegisterMode ? "new-password" : "current-password"
              }
            />
          </label>

          {isRegisterMode && (
            <label>
              Xác nhận mật khẩu
              <input
                name="confirmPassword"
                type="password"
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="Nhập lại mật khẩu"
                autoComplete="new-password"
              />
            </label>
          )}

          {errorMessage && (
            <p className="auth-message error">{errorMessage}</p>
          )}

          {message && (
            <p className="auth-message success">{message}</p>
          )}

          <button
            className="auth-submit-button"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? "Đang xử lý..."
              : isRegisterMode
              ? "Tạo tài khoản"
              : "Đăng nhập"}
          </button>

          <p className="auth-switch">
            {isRegisterMode
              ? "Bạn đã có tài khoản?"
              : "Bạn chưa có tài khoản?"}

            <button
              type="button"
              onClick={() =>
                switchMode(isRegisterMode ? "login" : "register")
              }
            >
              {isRegisterMode ? "Đăng nhập" : "Đăng ký ngay"}
            </button>
          </p>
        </form>
      </section>
    </main>
  );
}

export default AuthPage;