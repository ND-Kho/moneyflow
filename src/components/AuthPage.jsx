import { useState } from "react";
import { supabase } from "../lib/supabase";
import Brand from "./Brand";
import Icon from "./Icon";

function AuthPage({ recoveryMode = false, onRecoveryComplete }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isRegisterMode = mode === "register";
  const isRecoveryMode = recoveryMode;

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

    if ((!isRecoveryMode && !email) || !password) {
      setErrorMessage("Vui lòng nhập đầy đủ email và mật khẩu.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Mật khẩu phải có ít nhất 6 ký tự.");
      return;
    }

    if ((isRegisterMode || isRecoveryMode) && password !== form.confirmPassword) {
      setErrorMessage("Mật khẩu xác nhận không khớp.");
      return;
    }

    setIsSubmitting(true);

    try {
      if (isRecoveryMode) {
        const { error } = await supabase.auth.updateUser({ password });

        if (error) {
          throw error;
        }

        window.history.replaceState({}, document.title, window.location.pathname);
        onRecoveryComplete?.();
      } else if (isRegisterMode) {
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

  async function handleForgotPassword() {
    const email = form.email.trim();

    setMessage("");
    setErrorMessage("");

    if (!email) {
      setErrorMessage("Nhập email trước khi yêu cầu đặt lại mật khẩu.");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });

      if (error) {
        throw error;
      }

      setMessage("Đã gửi liên kết đặt lại mật khẩu. Hãy kiểm tra hộp thư của bạn.");
    } catch (error) {
      setErrorMessage(
        error.message || "Không thể gửi email đặt lại mật khẩu."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-introduction">
        <Brand
          className="auth-brand"
          subtitle="Quản lý tài chính cá nhân"
        />

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
          <Brand
            className="auth-mobile-brand"
            subtitle="Quản lý tài chính cá nhân"
          />

          <div>
            <p className="page-label">
              {isRecoveryMode
                ? "BẢO MẬT TÀI KHOẢN"
                : isRegisterMode
                ? "TẠO TÀI KHOẢN"
                : "CHÀO MỪNG TRỞ LẠI"}
            </p>

            <h2>
              {isRecoveryMode
                ? "Đặt mật khẩu mới"
                : isRegisterMode
                ? "Đăng ký MoneyFlow"
                : "Đăng nhập"}
            </h2>

            <p className="auth-card-description">
              {isRecoveryMode
                ? "Tạo mật khẩu mới có ít nhất 6 ký tự cho tài khoản của bạn."
                : isRegisterMode
                ? "Tạo tài khoản để bắt đầu theo dõi tài chính cá nhân."
                : "Nhập thông tin tài khoản để tiếp tục quản lý chi tiêu."}
            </p>
          </div>

          {!isRecoveryMode && (
            <label htmlFor="auth-email">
              Email
              <input
                id="auth-email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="name@example.com"
                autoComplete="email"
              />
            </label>
          )}

          <label htmlFor="auth-password">
            Mật khẩu
            <span className="password-input">
              <input
                id="auth-password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={handleChange}
                placeholder="Tối thiểu 6 ký tự"
                autoComplete={
                  isRegisterMode || isRecoveryMode
                    ? "new-password"
                    : "current-password"
                }
              />
              <button
                type="button"
                onClick={() => setShowPassword((currentValue) => !currentValue)}
                aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                aria-pressed={showPassword}
              >
                <Icon name={showPassword ? "eyeOff" : "eye"} size={18} />
              </button>
            </span>
          </label>

          {(isRegisterMode || isRecoveryMode) && (
            <label htmlFor="auth-confirm-password">
              Xác nhận mật khẩu
              <input
                id="auth-confirm-password"
                name="confirmPassword"
                type={showPassword ? "text" : "password"}
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="Nhập lại mật khẩu"
                autoComplete="new-password"
              />
            </label>
          )}

          {!isRegisterMode && !isRecoveryMode && (
            <button
              className="forgot-password-button"
              type="button"
              onClick={handleForgotPassword}
              disabled={isSubmitting}
            >
              Quên mật khẩu?
            </button>
          )}

          {errorMessage && (
            <p className="auth-message error" role="alert">{errorMessage}</p>
          )}

          {message && (
            <p className="auth-message success" role="status">{message}</p>
          )}

          <button
            className="auth-submit-button"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? "Đang xử lý..."
              : isRecoveryMode
              ? "Lưu mật khẩu mới"
              : isRegisterMode
              ? "Tạo tài khoản"
              : "Đăng nhập"}
          </button>

          {!isRecoveryMode && <p className="auth-switch">
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
          </p>}
        </form>
      </section>
    </main>
  );
}

export default AuthPage;
