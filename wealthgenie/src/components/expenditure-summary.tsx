import { Card } from "./ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingDown, AlertCircle, ShoppingCart } from "lucide-react";
import { useState, useEffect } from "react";
import { transactionApi } from "../utils/api";

interface ExpenditureSummaryProps {
  accessToken: string;
  activeFileId: string | null;
}

export function ExpenditureSummary({ accessToken, activeFileId }: ExpenditureSummaryProps) {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [allTransactions, setAllTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [availableYears, setAvailableYears] = useState<string[]>([]);

  useEffect(() => {
    fetchAllTransactions();
  }, [activeFileId]);

  useEffect(() => {
    applyFilters();
  }, [selectedYear, selectedMonth, allTransactions]);

  const fetchAllTransactions = async () => {
    try {
      setIsLoading(true);
      
      // Only fetch if we have an active file
      if (!activeFileId) {
        setAllTransactions([]);
        setAvailableYears([]);
        setTransactions([]);
        setIsLoading(false);
        return;
      }
      
      const filters: any = { type: "Expense", fileId: activeFileId };
      const { transactions } = await transactionApi.getAll(accessToken, filters);
      const txns = transactions || [];
      setAllTransactions(txns);
      
      // Extract available years from transactions
      const years = Array.from(new Set(
        txns.map((t: any) => new Date(t.date).getFullYear().toString())
      )).sort((a, b) => parseInt(b) - parseInt(a));
      setAvailableYears(years);
      
      // Set default year to the most recent
      if (years.length > 0 && selectedYear === "all") {
        setSelectedYear(years[0]);
      }
    } catch (error: any) {
      console.error('Failed to fetch transactions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...allTransactions];
    
    if (selectedYear !== "all") {
      filtered = filtered.filter(t => 
        new Date(t.date).getFullYear().toString() === selectedYear
      );
    }
    
    if (selectedMonth !== "all") {
      filtered = filtered.filter(t => 
        new Date(t.date).getMonth() === parseInt(selectedMonth)
      );
    }
    
    setTransactions(filtered);
  };

  const totalExpenses = transactions.reduce((sum, t) => sum + t.amount, 0);
  
  // Find most expensive category
  const categoryMap = new Map<string, number>();
  transactions.forEach(t => {
    categoryMap.set(t.category, (categoryMap.get(t.category) || 0) + t.amount);
  });
  
  const mostExpensiveCategory = Array.from(categoryMap.entries())
    .sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";
  
  // Find highest single expense
  const highestTransaction = transactions.sort((a, b) => b.amount - a.amount)[0];
  const highestExpense = highestTransaction 
    ? `${highestTransaction.description} - ₹${highestTransaction.amount.toLocaleString()}`
    : "N/A";

  // Group by month for chart
  const monthMap = new Map<number, number>();
  transactions.forEach(t => {
    const month = new Date(t.date).getMonth();
    monthMap.set(month, (monthMap.get(month) || 0) + t.amount);
  });

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthlyExpenses = Array.from({ length: 12 }, (_, i) => ({
    month: monthNames[i],
    expenses: monthMap.get(i) || 0,
  }));

  // Show message if no file is active
  if (!activeFileId) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <ShoppingCart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl text-gray-900 mb-2">No Data Available</h3>
          <p className="text-gray-600 mb-4">Upload a file to view expense analysis</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Select Year" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Years</SelectItem>
            {availableYears.map(year => (
              <SelectItem key={year} value={year}>{year}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Select Month" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Months</SelectItem>
            <SelectItem value="0">January</SelectItem>
            <SelectItem value="1">February</SelectItem>
            <SelectItem value="2">March</SelectItem>
            <SelectItem value="3">April</SelectItem>
            <SelectItem value="4">May</SelectItem>
            <SelectItem value="5">June</SelectItem>
            <SelectItem value="6">July</SelectItem>
            <SelectItem value="7">August</SelectItem>
            <SelectItem value="8">September</SelectItem>
            <SelectItem value="9">October</SelectItem>
            <SelectItem value="10">November</SelectItem>
            <SelectItem value="11">December</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 border-l-4 border-l-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Expenses</p>
              <h3 className="text-2xl text-gray-900">₹{totalExpenses.toLocaleString()}</h3>
              <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                <TrendingDown className="w-3 h-3" />
                {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="bg-red-100 p-3 rounded-full">
              <ShoppingCart className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6 border-l-4 border-l-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Most Expensive Category</p>
              <h3 className="text-lg text-gray-900">{mostExpensiveCategory}</h3>
              <p className="text-xs text-orange-600 mt-1">
                {categoryMap.get(mostExpensiveCategory) ? `₹${categoryMap.get(mostExpensiveCategory)?.toLocaleString()}` : 'N/A'}
              </p>
            </div>
            <div className="bg-orange-100 p-3 rounded-full">
              <AlertCircle className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6 border-l-4 border-l-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Highest Single Expense</p>
              <h3 className="text-base text-gray-900">{highestExpense}</h3>
              <p className="text-xs text-yellow-600 mt-1">
                {highestTransaction ? new Date(highestTransaction.date).toLocaleDateString() : 'N/A'}
              </p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-full">
              <TrendingDown className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Expense Chart */}
      <Card className="p-6">
        <h3 className="text-lg text-gray-900 mb-4">Monthly Expense Breakdown</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={monthlyExpenses}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="month" stroke="#6b7280" />
            <YAxis stroke="#6b7280" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
              }}
              formatter={(value: number) => `₹${value.toLocaleString()}`}
            />
            <Bar dataKey="expenses" fill="#ef4444" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Category Breakdown */}
      <Card className="p-6">
        <h3 className="text-lg text-gray-900 mb-4">Top Spending Categories</h3>
        <div className="space-y-4">
          {Array.from(categoryMap.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([category, amount], index) => {
              const colors = ['blue', 'green', 'purple', 'orange', 'pink'];
              const color = colors[index % colors.length];
              
              return (
                <div key={category} className={`flex items-center justify-between p-4 bg-${color}-50 border border-${color}-200 rounded-lg`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 bg-${color}-500 rounded-full`}></div>
                    <div>
                      <h4 className="text-sm text-gray-900">{category}</h4>
                      <p className="text-xs text-gray-600">#{index + 1} highest expense</p>
                    </div>
                  </div>
                  <span className="text-gray-900">₹{amount.toLocaleString()}</span>
                </div>
              );
            })}
        </div>
      </Card>
    </div>
  );
}
