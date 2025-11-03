import { Card } from "./ui/card";
import { PieChart as PieChartIcon } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useState, useEffect } from "react";
import { transactionApi } from "../utils/api";

interface CategorySpendingProps {
  accessToken: string;
  activeFileId: string | null;
}

const categoryColors: Record<string, string> = {
  "Food": "#ef4444",
  "Grocery": "#10b981",
  "Entertainment": "#8b5cf6",
  "Travel": "#3b82f6",
  "EMIs": "#f59e0b",
  "Bills": "#ec4899",
  "Transport": "#14b8a6",
  "Others": "#6b7280",
};

export function CategorySpending({ accessToken, activeFileId }: CategorySpendingProps) {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTransactions();
  }, [activeFileId]);

  const fetchTransactions = async () => {
    try {
      setIsLoading(true);
      
      // Only fetch if we have an active file
      if (!activeFileId) {
        setTransactions([]);
        setIsLoading(false);
        return;
      }
      
      const filters: any = { type: "Expense", fileId: activeFileId };
      const { transactions } = await transactionApi.getAll(accessToken, filters);
      setTransactions(transactions || []);
    } catch (error: any) {
      console.error('Failed to fetch transactions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Group by category
  const categoryMap = new Map<string, number>();
  transactions.forEach(t => {
    categoryMap.set(t.category, (categoryMap.get(t.category) || 0) + t.amount);
  });

  const categoryData = Array.from(categoryMap.entries()).map(([name, value]) => ({
    name,
    value,
    color: categoryColors[name] || "#6b7280",
  }));

  const totalSpending = categoryData.reduce((sum, cat) => sum + cat.value, 0);

  // Show message if no file is active
  if (!activeFileId) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <PieChartIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl text-gray-900 mb-2">No Data Available</h3>
          <p className="text-gray-600 mb-4">Upload a file to view category spending analysis</p>
        </div>
      </div>
    );
  }

  // Show empty state if no transactions
  if (categoryData.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <PieChartIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl text-gray-900 mb-2">No Expense Data</h3>
          <p className="text-gray-600 mb-4">The selected file has no expense transactions</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pie Chart */}
      <Card className="p-6">
        <h3 className="text-lg text-gray-900 mb-4">Category Distribution</h3>
        <ResponsiveContainer width="100%" height={400}>
          <PieChart>
            <Pie
              data={categoryData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={120}
              fill="#8884d8"
              dataKey="value"
            >
              {categoryData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => `₹${value.toLocaleString()}`}
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </Card>

      {/* Category Breakdown List */}
      <Card className="p-6">
        <h3 className="text-lg text-gray-900 mb-4">Detailed Breakdown</h3>
        <div className="space-y-4">
          {categoryData.map((category, index) => {
            const percentage = ((category.value / totalSpending) * 100).toFixed(1);
            
            return (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="text-sm text-gray-900">{category.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm text-gray-900">
                      ₹{category.value.toLocaleString()}
                    </span>
                    <span className="text-xs text-gray-600 ml-2">({percentage}%)</span>
                  </div>
                </div>
                <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="absolute h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: category.color,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-gray-900">Total Spending</span>
            <span className="text-xl text-gray-900">₹{totalSpending.toLocaleString()}</span>
          </div>
        </div>
      </Card>

      {/* Top Categories */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {categoryData.slice(0, 3).map((category, index) => (
          <Card key={index} className="p-4" style={{ borderLeftWidth: 4, borderLeftColor: category.color }}>
            <p className="text-xs text-gray-600 mb-1">#{index + 1} Highest Expense</p>
            <h4 className="text-lg text-gray-900">{category.name}</h4>
            <p className="text-xl text-gray-900 mt-1">₹{category.value.toLocaleString()}</p>
            <p className="text-xs text-gray-600 mt-1">
              {((category.value / totalSpending) * 100).toFixed(1)}% of total
            </p>
          </Card>
        ))}
      </div>

      {/* Insights */}
      {categoryData.length >= 3 && (
        <Card className="p-6 bg-orange-50 border-orange-200">
          <h4 className="text-sm text-orange-900 mb-2">💡 Spending Insight</h4>
          <p className="text-sm text-orange-700">
            Your top 3 categories ({categoryData.slice(0, 3).map(c => c.name).join(', ')}) account for{' '}
            {(((categoryData[0].value + (categoryData[1]?.value || 0) + (categoryData[2]?.value || 0)) / totalSpending) * 100).toFixed(0)}% 
            of your total spending. Consider setting category-specific budgets to better control expenses.
          </p>
        </Card>
      )}
    </div>
  );
}
