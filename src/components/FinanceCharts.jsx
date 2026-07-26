import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "../utils/finance";

const PIE_COLORS = [
  "#6873ee",
  "#f59e66",
  "#45b88a",
  "#e87979",
  "#a986e8",
];

function getYAxisMaximum(data) {
  const highestValue = Math.max(
    0,
    ...data.flatMap((item) => [Number(item.income) || 0, Number(item.expense) || 0])
  );

  if (highestValue <= 1000000) return 1000000;
  if (highestValue <= 10000000) return 10000000;

  const magnitude = 10 ** Math.floor(Math.log10(highestValue));
  const normalized = highestValue / magnitude;
  const niceMultiplier = normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return niceMultiplier * magnitude;
}

function formatYAxisTick(value) {
  if (value === 0) return "0";
  if (Math.abs(value) >= 1000000) {
    return `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(value / 1000000)} tr`;
  }
  if (Math.abs(value) >= 1000) {
    return `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(value / 1000)} nghìn`;
  }
  return new Intl.NumberFormat("vi-VN").format(value);
}

export function MonthlyBarChart({ data, isLoading = false }) {
  const yAxisMaximum = getYAxisMaximum(data);
  const ticks = Array.from({ length: 5 }, (_, index) => (yAxisMaximum / 4) * index);

  return (
    <article className="panel">
      <div className="panel-header">
        <div>
          <h2>Thu chi theo tháng</h2>
          <p>So sánh dòng tiền trong 6 tháng gần nhất</p>
        </div>
      </div>

      <div
        className="chart-box"
        role="img"
        aria-label="Biểu đồ cột thu nhập và chi tiêu trong sáu tháng gần nhất"
      >
        {isLoading ? (
          <div className="chart-skeleton skeleton-block" aria-label="Đang tải biểu đồ"></div>
        ) : <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 10, right: 12, left: 8, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="month" />
            <YAxis
              domain={[0, yAxisMaximum]}
              ticks={ticks}
              tickFormatter={formatYAxisTick}
              width={72}
            />
            <Tooltip formatter={(value) => formatCurrency(value)} />
            <Legend />

            <Bar
              dataKey="income"
              name="Thu nhập"
              fill="#45b88a"
              radius={[6, 6, 0, 0]}
            />

            <Bar
              dataKey="expense"
              name="Chi tiêu"
              fill="#f08068"
              radius={[6, 6, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>}
      </div>
    </article>
  );
}

export function ExpensePieChart({ data }) {
  const hasData = data.length > 0;

  return (
    <article className="panel expense-chart-panel">
      <div className="panel-header">
        <div>
          <h2>Cơ cấu chi tiêu</h2>
          <p>Phân loại các khoản chi trong tháng hiện tại</p>
        </div>
      </div>

      <div
        className={`pie-chart-layout ${hasData ? "" : "empty"}`}
        role="img"
        aria-label="Biểu đồ cơ cấu chi tiêu theo danh mục"
      >
        {!hasData && (
          <div className="chart-empty-state">
            <strong>Chưa có khoản chi trong kỳ này</strong>
            <p>Thêm giao dịch để xem cơ cấu chi tiêu theo danh mục.</p>
          </div>
        )}
        <div className="pie-chart-box">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              {hasData && <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={58}
                outerRadius={92}
                paddingAngle={3}
              >
                {data.map((item, index) => (
                  <Cell
                    key={item.name}
                    fill={PIE_COLORS[index % PIE_COLORS.length]}
                  />
                ))}
              </Pie>}

              <Tooltip formatter={(value) => formatCurrency(value)} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="expense-legend">
          {data.map((item, index) => (
            <div className="expense-legend-item" key={item.name}>
              <span
                className="expense-dot"
                style={{
                  backgroundColor: PIE_COLORS[index % PIE_COLORS.length],
                }}
              ></span>

              <div>
                <strong>{item.name}</strong>
                <p>{formatCurrency(item.value)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}
