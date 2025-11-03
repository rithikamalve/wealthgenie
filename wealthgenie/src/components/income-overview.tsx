import { Card } from "./ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, DollarSign, Wallet } from "lucide-react";
import { useState, useEffect } from "react";
import { transactionApi } from "../utils/api";

interface IncomeOverviewProps {
  accessToken: string;
  activeFileId: string | null;
}

export function IncomeOverview({ accessToken, activeFileId }: IncomeOverviewProps) {
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
      
      const filters: any = { type: "Income", fileId: activeFileId };
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

  // Calculate metrics from transactions
  const totalIncome = transactions.reduce((sum, t) => sum + t.amount, 0);
  
  // Group by source
  const sourceMap = new Map<string, number>();
  transactions.forEach(t => {
    const source = t.source || t.category || "Other";
    sourceMap.set(source, (sourceMap.get(source) || 0) + t.amount);
  });
  
  const incomeSources = Array.from(sourceMap.entries()).map(([name, amount]) => ({
    name,
    amount,
    percentage: totalIncome > 0 ? Math.round((amount / totalIncome) * 100) : 0,
  }));

  // Group by month for chart
  const monthMap = new Map<number, number>();
  transactions.forEach(t => {
    const month = new Date(t.date).getMonth();
    monthMap.set(month, (monthMap.get(month) || 0) + t.amount);
  });

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthlyData = Array.from({ length: 12 }, (_, i) => ({
    month: monthNames[i],
    income: monthMap.get(i) || 0,
  }));

  const avgMonthlyIncome = monthlyData.length > 0 
    ? Math.round(monthlyData.reduce((sum, m) => sum + m.income, 0) / monthlyData.filter(m => m.income > 0).length) || 0
    : 0;

  // Show message if no file is active
  if (!activeFileId) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <TrendingUp className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl text-gray-900 mb-2">No Data Available</h3>
          <p className="text-gray-600 mb-4">Upload a file to view income analysis</p>
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
        <Card className="p-6 border-l-4 border-l-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Income</p>
              <h3 className="text-2xl text-gray-900">₹{totalIncome.toLocaleString()}</h3>
              <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6 border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Avg. Monthly Income</p>
              <h3 className="text-2xl text-gray-900">₹{avgMonthlyIncome.toLocaleString()}</h3>
              <p className="text-xs text-blue-600 mt-1">
                Based on {monthlyData.filter(m => m.income > 0).length || 0} month{monthlyData.filter(m => m.income > 0).length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <Wallet className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6 border-l-4 border-l-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Income Sources</p>
              <h3 className="text-2xl text-gray-900">{incomeSources.length}</h3>
              <p className="text-xs text-purple-600 mt-1">Active streams</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-full">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Income Chart */}
      <Card className="p-6">
        <h3 className="text-lg text-gray-900 mb-4">Monthly Income Trend</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={monthlyData}>
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
            <Line
              type="monotone"
              dataKey="income"
              stroke="#10b981"
              strokeWidth={3}
              dot={{ fill: '#10b981', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Income Sources Breakdown */}
      <Card className="p-6">
        <h3 className="text-lg text-gray-900 mb-4">Income Sources Breakdown</h3>
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : incomeSources.length > 0 ? (
          <div className="space-y-4">
            {incomeSources.map((source, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{source.name}</span>
                  <span className="text-sm text-gray-900">₹{source.amount.toLocaleString()}</span>
                </div>
                <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="absolute h-full bg-gradient-to-r from-green-500 to-blue-500 rounded-full"
                    style={{ width: `${source.percentage}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500">{source.percentage}% of total income</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-8">No income data available</p>
        )}
      </Card>
    </div>
  );
}
