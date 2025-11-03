import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Lightbulb, TrendingDown, PiggyBank, AlertTriangle, Check, X, ArrowRight } from "lucide-react";
import { useState, useEffect } from "react";
import { transactionApi } from "../utils/api";

interface SuggestionsSectionProps {
  accessToken: string;
  activeFileId: string | null;
}

export function SuggestionsSection({ accessToken, activeFileId }: SuggestionsSectionProps) {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    generateSuggestions();
  }, [activeFileId]);

  const generateSuggestions = async () => {
    try {
      setIsLoading(true);
      
      if (!activeFileId) {
        setSuggestions([]);
        setIsLoading(false);
        return;
      }

      // Fetch transactions for the active file
      const { transactions } = await transactionApi.getAll(accessToken, { fileId: activeFileId });
      
      if (!transactions || transactions.length === 0) {
        setSuggestions([]);
        setIsLoading(false);
        return;
      }

      const generatedSuggestions: any[] = [];
      let suggestionId = 1;

      // Analyze expenses by category
      const expensesByCategory = new Map<string, number>();
      const incomeTransactions = transactions.filter((t: any) => t.type === 'Income');
      const expenseTransactions = transactions.filter((t: any) => t.type === 'Expense');
      
      expenseTransactions.forEach((t: any) => {
        const category = t.category || 'Others';
        expensesByCategory.set(category, (expensesByCategory.get(category) || 0) + t.amount);
      });

      const totalIncome = incomeTransactions.reduce((sum: number, t: any) => sum + t.amount, 0);
      const totalExpenses = expenseTransactions.reduce((sum: number, t: any) => sum + t.amount, 0);
      const savings = totalIncome - totalExpenses;
      const savingsRate = totalIncome > 0 ? (savings / totalIncome) * 100 : 0;

      // Sort categories by spending
      const sortedCategories = Array.from(expensesByCategory.entries())
        .sort((a, b) => b[1] - a[1]);

      // Suggestion 1: High category spending
      if (sortedCategories.length > 0) {
        const [topCategory, topAmount] = sortedCategories[0];
        const categoryPercentage = totalExpenses > 0 ? (topAmount / totalExpenses) * 100 : 0;
        
        if (categoryPercentage > 25) {
          generatedSuggestions.push({
            id: suggestionId++,
            type: "warning",
            icon: AlertTriangle,
            title: `High ${topCategory} Expenses`,
            description: `Your ${topCategory} expenses are ₹${topAmount.toLocaleString()}, which is ${categoryPercentage.toFixed(0)}% of your total expenses.`,
            recommendation: `Consider reducing ${topCategory} spending by 15-20% to save approximately ₹${(topAmount * 0.15).toFixed(0).toLocaleString()}/month.`,
            savings: Math.round(topAmount * 0.15),
            color: "orange",
          });
        }
      }

      // Suggestion 2: Savings rate
      if (savingsRate < 20 && totalIncome > 0) {
        generatedSuggestions.push({
          id: suggestionId++,
          type: "opportunity",
          icon: PiggyBank,
          title: "Improve Your Savings Rate",
          description: `You're currently saving ${savingsRate.toFixed(1)}% of your income (₹${savings.toLocaleString()}). Financial experts recommend saving at least 20%.`,
          recommendation: `Try to increase your savings by ₹${((totalIncome * 0.2) - savings).toFixed(0).toLocaleString()}/month to reach the 20% target.`,
          savings: 0,
          color: "green",
        });
      } else if (savingsRate >= 20) {
        generatedSuggestions.push({
          id: suggestionId++,
          type: "tip",
          icon: PiggyBank,
          title: "Excellent Savings!",
          description: `You're saving ${savingsRate.toFixed(1)}% of your income, which exceeds the recommended 20%. Great job!`,
          recommendation: `Consider investing your savings in mutual funds, fixed deposits, or other investment options for better returns.`,
          savings: 0,
          color: "blue",
        });
      }

      // Suggestion 3: Multiple high spending categories
      if (sortedCategories.length >= 2) {
        const [cat1, amt1] = sortedCategories[0];
        const [cat2, amt2] = sortedCategories[1];
        const combinedAmount = amt1 + amt2;
        const combinedPercentage = totalExpenses > 0 ? (combinedAmount / totalExpenses) * 100 : 0;

        if (combinedPercentage > 50) {
          generatedSuggestions.push({
            id: suggestionId++,
            type: "alert",
            icon: TrendingDown,
            title: "Top Two Categories Dominate Budget",
            description: `${cat1} (₹${amt1.toLocaleString()}) and ${cat2} (₹${amt2.toLocaleString()}) account for ${combinedPercentage.toFixed(0)}% of your expenses.`,
            recommendation: `Focus on reducing spending in these two areas. Even a 10% reduction could save you ₹${(combinedAmount * 0.1).toFixed(0).toLocaleString()}/month.`,
            savings: Math.round(combinedAmount * 0.1),
            color: "red",
          });
        }
      }

      // Suggestion 4: Income vs Expenses ratio
      if (totalExpenses > totalIncome * 0.9) {
        generatedSuggestions.push({
          id: suggestionId++,
          type: "alert",
          icon: AlertTriangle,
          title: "High Expense-to-Income Ratio",
          description: `Your expenses (₹${totalExpenses.toLocaleString()}) are ${((totalExpenses / totalIncome) * 100).toFixed(0)}% of your income. This leaves little room for savings.`,
          recommendation: `Review discretionary spending and identify areas where you can cut back by 10-15%.`,
          savings: Math.round(totalExpenses * 0.1),
          color: "orange",
        });
      }

      // Suggestion 5: Budget optimization tip
      if (sortedCategories.length >= 3) {
        const [cat3, amt3] = sortedCategories[2];
        generatedSuggestions.push({
          id: suggestionId++,
          type: "tip",
          icon: Lightbulb,
          title: `Optimize ${cat3} Spending`,
          description: `You're spending ₹${amt3.toLocaleString()} on ${cat3}. Look for alternatives or deals.`,
          recommendation: `Compare prices, use discount codes, or consider switching to more affordable options in this category.`,
          savings: Math.round(amt3 * 0.15),
          color: "blue",
        });
      }

      setSuggestions(generatedSuggestions.slice(0, 4)); // Show top 4 suggestions
    } catch (error: any) {
      console.error('Failed to generate suggestions:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Show message if no file is active
  if (!activeFileId) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Lightbulb className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl text-gray-900 mb-2">No Insights Available</h3>
          <p className="text-gray-600 mb-4">Upload a file to get AI-powered financial insights and recommendations</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Analyzing your transactions...</p>
        </div>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Lightbulb className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl text-gray-900 mb-2">No Insights Yet</h3>
          <p className="text-gray-600 mb-4">Not enough transaction data to generate insights</p>
        </div>
      </div>
    );
  }

  const handleSave = (id: number) => {
    setSuggestions(suggestions.map(s => 
      s.id === id ? { ...s, saved: true } : s
    ));
  };

  const handleIgnore = (id: number) => {
    setSuggestions(suggestions.filter(s => s.id !== id));
  };

  const colorMap = {
    orange: {
      border: "border-orange-200",
      bg: "bg-orange-50",
      text: "text-orange-900",
      icon: "text-orange-600",
      button: "bg-orange-600 hover:bg-orange-700",
    },
    green: {
      border: "border-green-200",
      bg: "bg-green-50",
      text: "text-green-900",
      icon: "text-green-600",
      button: "bg-green-600 hover:bg-green-700",
    },
    red: {
      border: "border-red-200",
      bg: "bg-red-50",
      text: "text-red-900",
      icon: "text-red-600",
      button: "bg-red-600 hover:bg-red-700",
    },
    blue: {
      border: "border-blue-200",
      bg: "bg-blue-50",
      text: "text-blue-900",
      icon: "text-blue-600",
      button: "bg-blue-600 hover:bg-blue-700",
    },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl text-gray-900">AI-Powered Insights</h2>
          <p className="text-sm text-gray-600 mt-1">Personalized recommendations based on your spending patterns</p>
        </div>
      </div>

      {suggestions.map((suggestion) => {
        const colors = colorMap[suggestion.color as keyof typeof colorMap];
        const Icon = suggestion.icon;

        return (
          <Card key={suggestion.id} className={`p-6 ${colors.border} ${colors.bg}`}>
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-full bg-white`}>
                <Icon className={`w-6 h-6 ${colors.icon}`} />
              </div>

              <div className="flex-1">
                <div className="flex items-start justify-between mb-2">
                  <h3 className={`text-lg ${colors.text}`}>{suggestion.title}</h3>
                  {suggestion.saved ? (
                    <span className={`text-xs px-3 py-1 rounded-full bg-white ${colors.text}`}>
                      <Check className="w-3 h-3 inline mr-1" />
                      Saved
                    </span>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleSave(suggestion.id)}
                        className="h-8"
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleIgnore(suggestion.id)}
                        className="h-8"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>

                <p className={`text-sm ${colors.text} mb-3 opacity-90`}>
                  {suggestion.description}
                </p>

                <div className={`p-3 rounded-lg bg-white border ${colors.border}`}>
                  <div className="flex items-start gap-2">
                    <ArrowRight className={`w-4 h-4 mt-0.5 ${colors.icon} flex-shrink-0`} />
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">{suggestion.recommendation}</p>
                      {suggestion.savings > 0 && (
                        <p className={`text-xs mt-2 ${colors.text}`}>
                          💰 Potential savings: ₹{suggestion.savings.toLocaleString()}/month
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        );
      })}

      {/* Summary Card */}
      <Card className="p-6 bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
        <div className="flex items-start gap-3">
          <Lightbulb className="w-5 h-5 text-purple-600 mt-0.5" />
          <div>
            <h4 className="text-sm text-purple-900 mb-1">Pro Tip</h4>
            <p className="text-sm text-purple-700">
              Review these insights regularly and implement at least one suggestion per month to improve your financial health. 
              Small changes can lead to significant savings over time!
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
