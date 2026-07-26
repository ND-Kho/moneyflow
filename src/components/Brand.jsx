function Brand({
  subtitle = "Quản lý tài chính",
  compact = false,
  className = "",
}) {
  return (
    <div className={`moneyflow-brand ${compact ? "compact" : ""} ${className}`.trim()}>
      <img
        className="moneyflow-brand-mark"
        src="/moneyflow-logo-192.png"
        alt=""
        width="48"
        height="48"
      />

      <div className="moneyflow-brand-copy">
        <p className="moneyflow-wordmark" aria-label="MoneyFlow">
          <span>MONEY</span>
          <span>FLOW</span>
        </p>
        {subtitle && <p className="moneyflow-subtitle">{subtitle}</p>}
      </div>
    </div>
  );
}

export default Brand;
