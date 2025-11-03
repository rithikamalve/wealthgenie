import { Card } from "./ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Clock, AlertCircle, CheckCircle2, Calendar, Plus, CreditCard, Edit2, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { emiApi } from "../utils/api";
import { toast } from "sonner@2.0.3";

interface EmiTrackerProps {
  accessToken: string;
  activeFileId: string | null;
}

export function EmiTracker({ accessToken, activeFileId }: EmiTrackerProps) {
  const [emiData, setEmiData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [emiModalOpen, setEmiModalOpen] = useState(false);
  const [editingEmi, setEditingEmi] = useState<any>(null);
  const [emiForm, setEmiForm] = useState({
    name: '',
    amount: '',
    dueDate: '',
    totalAmount: '',
    paid: '',
  });

  useEffect(() => {
    fetchEmis();
  }, [activeFileId]);

  const fetchEmis = async () => {
    try {
      setIsLoading(true);
      
      // Only fetch if we have an active file
      if (!activeFileId) {
        setEmiData([]);
        setIsLoading(false);
        return;
      }
      
      const { emis } = await emiApi.getAll(accessToken, { fileId: activeFileId });
      
      // Calculate days left for each EMI using real-time date
      const now = new Date();
      const processedEmis = (emis || []).map((emi: any) => {
        const dueDate = new Date(emi.dueDate);
        const daysLeft = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        return {
          ...emi,
          daysLeft,
          status: emi.status || (daysLeft < 0 ? 'overdue' : 'upcoming'),
        };
      });
      
      setEmiData(processedEmis);
    } catch (error: any) {
      console.error('Failed to fetch EMIs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenEmiModal = (emi?: any) => {
    if (emi) {
      setEditingEmi(emi);
      setEmiForm({
        name: emi.name,
        amount: emi.amount.toString(),
        dueDate: emi.dueDate,
        totalAmount: emi.totalAmount?.toString() || '',
        paid: emi.paid?.toString() || '0',
      });
    } else {
      setEditingEmi(null);
      setEmiForm({
        name: '',
        amount: '',
        dueDate: '',
        totalAmount: '',
        paid: '0',
      });
    }
    setEmiModalOpen(true);
  };

  const handleSaveEmi = async () => {
    try {
      if (!emiForm.name || !emiForm.amount || !emiForm.dueDate) {
        toast.error('Please fill in all required fields');
        return;
      }

      if (!activeFileId) {
        toast.error('Please select a file first');
        return;
      }

      if (editingEmi) {
        await emiApi.update(accessToken, editingEmi.id, {
          name: emiForm.name,
          amount: parseFloat(emiForm.amount),
          dueDate: emiForm.dueDate,
          totalAmount: emiForm.totalAmount ? parseFloat(emiForm.totalAmount) : 0,
          paid: emiForm.paid ? parseFloat(emiForm.paid) : 0,
          fileId: activeFileId,
        });
        toast.success('EMI updated successfully!');
      } else {
        await emiApi.add(accessToken, {
          name: emiForm.name,
          amount: parseFloat(emiForm.amount),
          dueDate: emiForm.dueDate,
          totalAmount: emiForm.totalAmount ? parseFloat(emiForm.totalAmount) : 0,
          paid: emiForm.paid ? parseFloat(emiForm.paid) : 0,
          fileId: activeFileId,
        });
        toast.success('EMI added successfully!');
      }

      setEmiModalOpen(false);
      fetchEmis();
    } catch (error: any) {
      console.error('Failed to save EMI:', error);
      toast.error('Failed to save EMI');
    }
  };

  const handleDeleteEmi = async (emiId: string) => {
    if (!confirm('Are you sure you want to delete this EMI?')) return;

    try {
      await emiApi.delete(accessToken, emiId);
      toast.success('EMI deleted successfully!');
      fetchEmis();
    } catch (error: any) {
      console.error('Failed to delete EMI:', error);
      toast.error('Failed to delete EMI');
    }
  };

  // Show message if no file is active
  if (!activeFileId) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <CreditCard className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl text-gray-900 mb-2">No EMI Data</h3>
          <p className="text-gray-600 mb-4">Upload a file to track EMIs and loans for that file</p>
        </div>
      </div>
    );
  }

  const totalMonthlyEmi = emiData.reduce((sum, emi) => sum + emi.amount, 0);
  const upcomingEmis = emiData.filter(emi => emi.status === "upcoming" && emi.daysLeft >= 0);
  const overdueEmis = emiData.filter(emi => emi.daysLeft < 0 && emi.status !== "paid");
  
  // Find next payment due (upcoming EMI with least days left)
  const nextPayment = upcomingEmis.sort((a, b) => a.daysLeft - b.daysLeft)[0];
  
  // Find most urgent reminder
  const urgentReminder = upcomingEmis.filter(emi => emi.daysLeft <= 7).sort((a, b) => a.daysLeft - b.daysLeft)[0];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 border-l-4 border-l-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Monthly EMIs</p>
              <h3 className="text-2xl text-gray-900">₹{totalMonthlyEmi.toLocaleString()}</h3>
              <p className="text-xs text-purple-600 mt-1">{emiData.length} EMIs tracked</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-full">
              <Calendar className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6 border-l-4 border-l-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Upcoming Payments</p>
              <h3 className="text-2xl text-gray-900">{upcomingEmis.length}</h3>
              <p className="text-xs text-orange-600 mt-1">
                {overdueEmis.length > 0 ? `${overdueEmis.length} overdue` : 'All on track'}
              </p>
            </div>
            <div className="bg-orange-100 p-3 rounded-full">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6 border-l-4 border-l-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Next Payment Due</p>
              {nextPayment ? (
                <>
                  <h3 className="text-lg text-gray-900">{nextPayment.name}</h3>
                  <p className="text-xs text-green-600 mt-1">
                    {nextPayment.daysLeft === 0 ? 'Today' : 
                     nextPayment.daysLeft === 1 ? 'Tomorrow' : 
                     `In ${nextPayment.daysLeft} days`}
                  </p>
                </>
              ) : (
                <>
                  <h3 className="text-lg text-gray-900">None</h3>
                  <p className="text-xs text-green-600 mt-1">No upcoming EMIs</p>
                </>
              )}
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <AlertCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* EMI Table */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg text-gray-900">EMI & Loan Details</h3>
          <Button
            size="sm"
            onClick={() => handleOpenEmiModal()}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add EMI
          </Button>
        </div>
        
        {emiData.length === 0 ? (
          <div className="text-center py-8">
            <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600 mb-2">No EMIs/Loans for this file</p>
            <p className="text-xs text-gray-500">Click "Add EMI" to track your loans and monthly payments</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Loan Name</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Days Left</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {emiData.map((emi, index) => {
                  const progress = emi.totalAmount > 0 ? (emi.paid / emi.totalAmount) * 100 : 0;
                  const dueDate = new Date(emi.dueDate);
                  
                  return (
                    <TableRow key={index}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-900">{emi.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-900">₹{emi.amount.toLocaleString()}</TableCell>
                      <TableCell className="text-gray-600">
                        {dueDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </TableCell>
                      <TableCell>
                        {emi.status === "paid" ? (
                          <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Paid
                          </Badge>
                        ) : emi.daysLeft < 0 ? (
                          <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Overdue
                          </Badge>
                        ) : emi.daysLeft <= 3 ? (
                          <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Urgent
                          </Badge>
                        ) : (
                          <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">
                            <Clock className="w-3 h-3 mr-1" />
                            Upcoming
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {emi.status === "paid" ? (
                          <span className="text-green-600">Completed</span>
                        ) : emi.daysLeft < 0 ? (
                          <span className="text-red-600">{Math.abs(emi.daysLeft)} days overdue</span>
                        ) : emi.daysLeft === 0 ? (
                          <span className="text-red-600">Due today</span>
                        ) : emi.daysLeft === 1 ? (
                          <span className="text-orange-600">Tomorrow</span>
                        ) : (
                          <span className="text-gray-600">{emi.daysLeft} days</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {emi.totalAmount > 0 ? (
                          <div className="flex items-center gap-2 min-w-[120px]">
                            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-500 rounded-full"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-600">{progress.toFixed(0)}%</span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenEmiModal(emi)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteEmi(emi.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* EMI Form Modal */}
      <Dialog open={emiModalOpen} onOpenChange={setEmiModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingEmi ? 'Edit EMI/Loan' : 'Add EMI/Loan'}</DialogTitle>
            <DialogDescription>
              {editingEmi ? 'Update EMI/loan details' : 'Add a new EMI or loan to track'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="emi-name">Loan Name *</Label>
              <Input
                id="emi-name"
                placeholder="e.g., Car Loan, Home Loan, Personal Loan"
                value={emiForm.name}
                onChange={(e) => setEmiForm({ ...emiForm, name: e.target.value })}
              />
            </div>
            
            <div>
              <Label htmlFor="emi-amount">Monthly EMI Amount (₹) *</Label>
              <Input
                id="emi-amount"
                type="number"
                placeholder="e.g., 15000"
                value={emiForm.amount}
                onChange={(e) => setEmiForm({ ...emiForm, amount: e.target.value })}
              />
            </div>
            
            <div>
              <Label htmlFor="due-date">Next Due Date *</Label>
              <Input
                id="due-date"
                type="date"
                value={emiForm.dueDate}
                onChange={(e) => setEmiForm({ ...emiForm, dueDate: e.target.value })}
              />
            </div>
            
            <div>
              <Label htmlFor="total-amount">Total Loan Amount (₹)</Label>
              <Input
                id="total-amount"
                type="number"
                placeholder="e.g., 500000 (optional)"
                value={emiForm.totalAmount}
                onChange={(e) => setEmiForm({ ...emiForm, totalAmount: e.target.value })}
              />
              <p className="text-xs text-gray-500 mt-1">Optional - for tracking progress</p>
            </div>
            
            <div>
              <Label htmlFor="paid-amount">Amount Paid So Far (₹)</Label>
              <Input
                id="paid-amount"
                type="number"
                placeholder="e.g., 125000 (optional)"
                value={emiForm.paid}
                onChange={(e) => setEmiForm({ ...emiForm, paid: e.target.value })}
              />
              <p className="text-xs text-gray-500 mt-1">Optional - for tracking progress</p>
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleSaveEmi}
                className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                {editingEmi ? 'Update EMI' : 'Add EMI'}
              </Button>
              <Button
                onClick={() => setEmiModalOpen(false)}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Loan Progress Cards */}
      {emiData.filter(emi => emi.totalAmount > 0).length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {emiData.filter(emi => emi.totalAmount > 0).map((emi, index) => {
            const progress = (emi.paid / emi.totalAmount) * 100;
            const remaining = emi.totalAmount - emi.paid;

            return (
              <Card key={index} className="p-6">
                <h4 className="text-lg text-gray-900 mb-4">{emi.name}</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Total Loan</span>
                    <span className="text-sm text-gray-900">₹{emi.totalAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Paid</span>
                    <span className="text-sm text-green-600">₹{emi.paid.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Remaining</span>
                    <span className="text-sm text-red-600">₹{remaining.toLocaleString()}</span>
                  </div>
                  
                  <div className="pt-2">
                    <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-600 mt-2">{progress.toFixed(1)}% completed</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Reminder */}
      {urgentReminder && (
        <Card className="p-6 bg-yellow-50 border-yellow-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <h4 className="text-sm text-yellow-900 mb-1">Payment Reminder</h4>
              <p className="text-sm text-yellow-700">
                Your {urgentReminder.name} EMI of ₹{urgentReminder.amount.toLocaleString()} is due{' '}
                {urgentReminder.daysLeft === 0 ? 'today' : 
                 urgentReminder.daysLeft === 1 ? 'tomorrow' : 
                 `in ${urgentReminder.daysLeft} days`}{' '}
                ({new Date(urgentReminder.dueDate).toLocaleDateString('en-IN', { 
                  day: 'numeric', 
                  month: 'short', 
                  year: 'numeric' 
                })}). Make sure you have sufficient balance in your account.
              </p>
            </div>
          </div>
        </Card>
      )}
      
      {overdueEmis.length > 0 && (
        <Card className="p-6 bg-red-50 border-red-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <h4 className="text-sm text-red-900 mb-1">Overdue Payments</h4>
              <p className="text-sm text-red-700">
                You have {overdueEmis.length} overdue EMI payment{overdueEmis.length > 1 ? 's' : ''}. 
                Please make payment immediately to avoid penalties.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
