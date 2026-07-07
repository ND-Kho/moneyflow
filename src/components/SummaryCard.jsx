function SummaryCard({ title, value, description, type }) {
  return (
    <article className={`summary-card ${type}`}>
      <div className="summary-card-header">
        <p>{title}</p>

        <div className="summary-icon">
          {type === "income" && "↗"}
          {type === "expense" && "↘"}
          {type === "balance" && "₫"}
        </div>
      </div>

      <h3>{value}</h3>
      <span>{description}</span>
    </article>
  );
}

export default SummaryCard;