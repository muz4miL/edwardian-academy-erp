import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const revenueData = [
  { month: "Jan", income: 450000, expense: 280000 },
  { month: "Feb", income: 520000, expense: 320000 },
  { month: "Mar", income: 480000, expense: 290000 },
  { month: "Apr", income: 610000, expense: 350000 },
  { month: "May", income: 580000, expense: 340000 },
  { month: "Jun", income: 600000, expense: 380000 },
];

const studentDistribution = [
  { name: "9th Grade", value: 45, color: "hsl(24, 95%, 53%)" },
  { name: "10th Grade", value: 38, color: "hsl(142, 76%, 36%)" },
  { name: "11th Grade", value: 52, color: "hsl(222, 47%, 40%)" },
  { name: "12th Grade", value: 41, color: "hsl(38, 92%, 50%)" },
];

export function RevenueChart() {
  return (
    <div className="rounded-xl border border-border bg-card p-6 card-shadow">
      <h3 className="mb-4 text-lg font-semibold text-foreground">
        Monthly Income vs Expense
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={revenueData}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
          <YAxis stroke="hsl(var(--muted-foreground))" />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
            }}
            formatter={(value: number) => [`PKR ${value.toLocaleString()}`, ""]}
          />
          <Bar dataKey="income" name="Income" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
          <Bar dataKey="expense" name="Expense" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function StudentDistributionChart() {
  return (
    <div className="rounded-xl border border-border bg-card p-6 card-shadow">
      <h3 className="mb-4 text-lg font-semibold text-foreground">
        Student Distribution
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={studentDistribution}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={5}
            dataKey="value"
          >
            {studentDistribution.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
            }}
            formatter={(value: number) => [`${value} students`, ""]}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
