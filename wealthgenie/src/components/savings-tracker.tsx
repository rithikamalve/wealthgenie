import { Card } from "./ui/card";
import { Progress } from "./ui/progress";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { TrendingUp, Target, CheckCircle2, AlertTriangle, Plus, Edit2, Trash2, PiggyBank } from "lucide-react";
import { useState, useEffect } from "react";
import { transactionApi, savingsApi } from "../utils/api";
import { toast } from "sonner@2.0.3";

interface SavingsTrackerProps {
  accessToken: string;
  activeFileId: string | null;
}

export function SavingsTracker({ accessToken, activeFileId }: SavingsTrackerProps) {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<any>(null);
  const [goalForm, setGoalForm] = useState({
    name: '',
    targetAmount: '',
    currentAmount: '',
    deadline: '',
  });

  useEffect(() => {
    fetchData();
  }, [activeFileId]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      // Only fetch data if we have an active file
      if (!activeFileId) {
        setTransactions([]);
        setSavingsGoals([]);
        setIsLoading(false);
        return;
      }
      
      // Fetch savings goals filtered by file
      const savingsData = await savingsApi.getAll(accessToken, { fileId: activeFileId });
      setSavingsGoals(savingsData.savings || []);
      
      // Fetch transactions filtered by file
      const filters: any = { fileId: activeFileId };
      const transactionsData = await transactionApi.getAll(accessToken, filters);
      setTransactions(transactionsData.transactions || []);
    } catch (error: any) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const monthlyIncome = transactions
    .filter(t => t.type === "Income")
    .reduce((sum, t) => sum + t.amount, 0);
  
  const monthlyExpenses = transactions
    .filter(t => t.type === "Expense")
    .reduce((sum, t) => sum + t.amount, 0);
  
  const monthlySavings = monthlyIncome - monthlyExpenses;
  const savingsRate = monthlyIncome > 0 
    ? ((monthlySavings / monthlyIncome) * 100).toFixed(1) 
    : "0";

  // Show message if no file is active
  const noDataAvailable = !activeFileId;

  const handleOpenGoalModal = (goal?: any) => {
    if (goal) {
      setEditingGoal(goal);
      setGoalForm({
        name: goal.name,
        targetAmount: goal.targetAmount.toString(),
        currentAmount: goal.currentAmount.toString(),
        deadline: goal.deadline,
      });
    } else {
      setEditingGoal(null);
      setGoalForm({
        name: '',
        targetAmount: '',
        currentAmount: '',
        deadline: '',
      });
    }
    setGoalModalOpen(true);
  };

  const handleSaveGoal = async () => {
    try {
      if (!goalForm.name || !goalForm.targetAmount || !goalForm.deadline) {
        toast.error('Please fill in all required fields');
        return;
      }

      if (!activeFileId) {
        toast.error('Please select a file first');
        return;
      }

      if (editingGoal) {
        await savingsApi.update(accessToken, editingGoal.id, {
          name: goalForm.name,
          targetAmount: parseFloat(goalForm.targetAmount),
          currentAmount: parseFloat(goalForm.currentAmount || '0'),
          deadline: goalForm.deadline,
          fileId: activeFileId,
        });
        toast.success('Goal updated successfully!');
      } else {
        await savingsApi.add(accessToken, {
          name: goalForm.name,
          targetAmount: parseFloat(goalForm.targetAmount),
          currentAmount: parseFloat(goalForm.currentAmount || '0'),
          deadline: goalForm.deadline,
          fileId: activeFileId,
        });
        toast.success('Goal added successfully!');
      }

      setGoalModalOpen(false);
      fetchData();
    } catch (error: any) {
      console.error('Failed to save goal:', error);
      toast.error('Failed to save goal');
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (!confirm('Are you sure you want to delete this goal?')) return;

    try {
      await savingsApi.delete(accessToken, goalId);
      toast.success('Goal deleted successfully!');
      fetchData();
    } catch (error: any) {
      console.error('Failed to delete goal:', error);
      toast.error('Failed to delete goal');
    }
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      {noDataAvailable ? (
        <Card className="p-6">
          <div className="text-center py-8">
            <PiggyBank className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl text-gray-900 mb-2">No Transaction Data</h3>
            <p className="text-gray-600 mb-4">Upload a file to view income and expense analysis</p>
            <p className="text-sm text-gray-500">Savings goals are file-specific</p>
          </div>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6 border-l-4 border-l-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Monthly Savings</p>
                  <h3 className="text-2xl text-gray-900">₹{monthlySavings.toLocaleString()}</h3>
                  <p className="text-xs text-green-600 mt-1">{savingsRate}% savings rate</p>
                </div>
                <div className="bg-green-100 p-3 rounded-full">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </Card>

            <Card className="p-6 border-l-4 border-l-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Income</p>
                  <h3 className="text-2xl text-gray-900">₹{monthlyIncome.toLocaleString()}</h3>
                  <p className="text-xs text-blue-600 mt-1">From active file</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-full">
                  <Target className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </Card>

            <Card className="p-6 border-l-4 border-l-red-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Expenses</p>
                  <h3 className="text-2xl text-gray-900">₹{monthlyExpenses.toLocaleString()}</h3>
                  <p className="text-xs text-red-600 mt-1">
                    {monthlyIncome > 0 ? `${((monthlyExpenses / monthlyIncome) * 100).toFixed(0)}% of income` : 'N/A'}
                  </p>
                </div>
                <div className="bg-red-100 p-3 rounded-full">
                  <TrendingUp className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </Card>
          </div>

          {/* Income vs Expenses Comparison */}
          <Card className="p-6">
            <h3 className="text-lg text-gray-900 mb-4">Income vs Expenses</h3>
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-700">Income</span>
                  <span className="text-sm text-green-600">₹{monthlyIncome.toLocaleString()}</span>
                </div>
                <Progress value={100} className="h-3 bg-gray-200" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-700">Expenses</span>
                  <span className="text-sm text-red-600">₹{monthlyExpenses.toLocaleString()}</span>
                </div>
                <Progress 
                  value={monthlyIncome > 0 ? (monthlyExpenses / monthlyIncome) * 100 : 0} 
                  className="h-3 bg-gray-200" 
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-700">Savings</span>
                  <span className="text-sm text-blue-600">₹{monthlySavings.toLocaleString()}</span>
                </div>
                <Progress 
                  value={monthlyIncome > 0 ? (monthlySavings / monthlyIncome) * 100 : 0} 
                  className="h-3 bg-gray-200" 
                />
              </div>
            </div>
          </Card>
        </>
      )}

      {/* Savings Goals */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg text-gray-900">Savings Goals</h3>
          <Button
            onClick={() => handleOpenGoalModal()}
            size="sm"
            disabled={!activeFileId}
            className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 disabled:opacity-50"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Goal
          </Button>
        </div>
        
        <div className="space-y-6">
          {savingsGoals.length === 0 ? (
            <div className="text-center py-8">
              <Target className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600 mb-2">No savings goals for this file</p>
              <p className="text-xs text-gray-500">
                {activeFileId 
                  ? 'Click "Add Goal" to create a savings goal for this file' 
                  : 'Select a file to add savings goals'}
              </p>
            </div>
          ) : (
            savingsGoals.map((goal, index) => {
              const progress = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
              const isOnTrack = progress >= 50;

              return (
                <div key={index} className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      {isOnTrack ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <h4 className="text-sm text-gray-900">{goal.name}</h4>
                        <p className="text-xs text-gray-600">Target: {goal.deadline}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className="text-sm text-gray-900">
                          ₹{goal.currentAmount.toLocaleString()} / ₹{goal.targetAmount.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-600">{progress.toFixed(0)}% complete</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleOpenGoalModal(goal)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteGoal(goal.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </div>

                  <div className="relative">
                    <Progress 
                      value={Math.min(progress, 100)} 
                      className={`h-3 ${isOnTrack ? 'bg-green-100' : 'bg-orange-100'}`}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      isOnTrack 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-orange-100 text-orange-700'
                    }`}>
                      {isOnTrack ? 'On Track' : 'Off Track'}
                    </span>
                    <span className="text-xs text-gray-600">
                      ₹{Math.max(0, goal.targetAmount - goal.currentAmount).toLocaleString()} remaining
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>

      {/* Goal Form Modal */}
      <Dialog open={goalModalOpen} onOpenChange={setGoalModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingGoal ? 'Edit Savings Goal' : 'Add Savings Goal'}</DialogTitle>
            <DialogDescription>
              {editingGoal ? 'Update your savings goal details' : 'Create a new savings goal to track your progress'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="goal-name">Goal Name *</Label>
              <Input
                id="goal-name"
                placeholder="e.g., Emergency Fund, Vacation, New Car"
                value={goalForm.name}
                onChange={(e) => setGoalForm({ ...goalForm, name: e.target.value })}
              />
            </div>
            
            <div>
              <Label htmlFor="target-amount">Target Amount (₹) *</Label>
              <Input
                id="target-amount"
                type="number"
                placeholder="e.g., 100000"
                value={goalForm.targetAmount}
                onChange={(e) => setGoalForm({ ...goalForm, targetAmount: e.target.value })}
              />
            </div>
            
            <div>
              <Label htmlFor="current-amount">Current Amount (₹)</Label>
              <Input
                id="current-amount"
                type="number"
                placeholder="e.g., 25000"
                value={goalForm.currentAmount}
                onChange={(e) => setGoalForm({ ...goalForm, currentAmount: e.target.value })}
              />
            </div>
            
            <div>
              <Label htmlFor="deadline">Target Date *</Label>
              <Input
                id="deadline"
                type="date"
                value={goalForm.deadline}
                onChange={(e) => setGoalForm({ ...goalForm, deadline: e.target.value })}
              />
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleSaveGoal}
                className="flex-1 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700"
              >
                {editingGoal ? 'Update Goal' : 'Add Goal'}
              </Button>
              <Button
                onClick={() => setGoalModalOpen(false)}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Savings Tips */}
      {!noDataAvailable && (
        <Card className="p-6 bg-gradient-to-r from-blue-50 to-green-50 border-blue-200">
          <div className="flex items-start gap-3">
            <Target className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="text-sm text-blue-900 mb-1">Savings Insight</h4>
              <p className="text-sm text-blue-700">
                {parseFloat(savingsRate) >= 20 
                  ? `Excellent! You're saving ${savingsRate}% of your income, which exceeds the recommended 20%. Keep up the great work!`
                  : parseFloat(savingsRate) >= 10
                  ? `You're saving ${savingsRate}% of your income. Consider increasing to 20% for better financial security.`
                  : parseFloat(savingsRate) > 0
                  ? `Your savings rate is ${savingsRate}%. Try to increase it gradually to reach the recommended 20%.`
                  : `Consider setting aside at least 20% of your income for savings and emergency funds.`
                }
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
