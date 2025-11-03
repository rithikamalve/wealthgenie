import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";
import { Download, FileSpreadsheet, CheckCircle2, FileText } from "lucide-react";
import { useState } from "react";
import { exportApi } from "../utils/api";
import { toast } from "sonner@2.0.3";

interface ExportModalProps {
  accessToken: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExportModal({ accessToken, open, onOpenChange }: ExportModalProps) {
  const [exportOptions, setExportOptions] = useState({
    income: true,
    expenses: true,
    savings: true,
    categories: true,
    emis: true,
    summary: true,
  });
  const [exported, setExported] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<'xlsx' | 'pdf'>('xlsx');

  const generateExcelExport = async (data: any) => {
    // Dynamically import xlsx library
    const XLSX = await import("xlsx");
    
    const { transactions = [], emis = [], savings = [], profile } = data;

    // Calculate summary metrics
    const totalIncome = transactions
      .filter((t: any) => t.type === 'Income')
      .reduce((sum: number, t: any) => sum + t.amount, 0);

    const totalExpenses = transactions
      .filter((t: any) => t.type === 'Expense')
      .reduce((sum: number, t: any) => sum + t.amount, 0);

    const netSavings = totalIncome - totalExpenses;

    const totalEmiAmount = emis.reduce((sum: number, e: any) => sum + e.amount, 0);
    const totalEmiPaid = emis.reduce((sum: number, e: any) => sum + (e.paid || 0), 0);

    const totalSavingsTarget = savings.reduce((sum: number, s: any) => sum + s.targetAmount, 0);
    const totalSavingsCurrent = savings.reduce((sum: number, s: any) => sum + (s.currentAmount || 0), 0);

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Summary Sheet
    const summaryData = [
      ['WealthGenie Financial Report'],
      ['Generated on:', new Date().toLocaleString()],
      ['User:', profile?.name || 'N/A'],
      [],
      ['Financial Summary'],
      ['Metric', 'Value (₹)'],
      ['Total Income', totalIncome.toFixed(2)],
      ['Total Expenses', totalExpenses.toFixed(2)],
      ['Net Savings', netSavings.toFixed(2)],
      [],
      ['EMI Summary'],
      ['Total Monthly EMI', totalEmiAmount.toFixed(2)],
      ['Total Paid', totalEmiPaid.toFixed(2)],
      ['Remaining', (totalEmiAmount - totalEmiPaid).toFixed(2)],
      [],
      ['Savings Goals Summary'],
      ['Total Target', totalSavingsTarget.toFixed(2)],
      ['Total Current', totalSavingsCurrent.toFixed(2)],
      ['Progress %', totalSavingsTarget > 0 ? ((totalSavingsCurrent / totalSavingsTarget) * 100).toFixed(1) : '0'],
      [],
      ['Data Counts'],
      ['Transactions', transactions.length],
      ['EMIs', emis.length],
      ['Savings Goals', savings.length],
    ];

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

    // Transactions Sheet
    if (exportOptions.income || exportOptions.expenses) {
      let filteredTransactions = transactions;
      
      if (!exportOptions.income || !exportOptions.expenses) {
        filteredTransactions = transactions.filter((t: any) => {
          if (exportOptions.income && t.type === 'Income') return true;
          if (exportOptions.expenses && t.type === 'Expense') return true;
          return false;
        });
      }

      const transactionsFormatted = filteredTransactions.map((t: any) => ({
        Date: t.date,
        Description: t.description,
        Category: t.category,
        Type: t.type,
        Amount: t.amount,
        Source: t.source || 'N/A',
      }));

      const wsTransactions = transactionsFormatted.length > 0
        ? XLSX.utils.json_to_sheet(transactionsFormatted)
        : XLSX.utils.aoa_to_sheet([['No transactions found']]);
      
      XLSX.utils.book_append_sheet(wb, wsTransactions, 'Transactions');
    }

    // EMIs Sheet
    if (exportOptions.emis) {
      const emisFormatted = emis.map((e: any) => ({
        Name: e.name,
        'Monthly Amount': e.amount,
        'Due Date': e.dueDate,
        'Total Amount': e.totalAmount || 0,
        'Amount Paid': e.paid || 0,
        'Remaining': (e.totalAmount || 0) - (e.paid || 0),
        Status: e.status || 'upcoming',
      }));

      const wsEmis = emisFormatted.length > 0
        ? XLSX.utils.json_to_sheet(emisFormatted)
        : XLSX.utils.aoa_to_sheet([['No EMIs found']]);
      
      XLSX.utils.book_append_sheet(wb, wsEmis, 'EMIs');
    }

    // Savings Goals Sheet
    if (exportOptions.savings) {
      const savingsFormatted = savings.map((s: any) => ({
        Goal: s.name,
        'Target Amount': s.targetAmount,
        'Current Amount': s.currentAmount || 0,
        'Progress %': s.targetAmount > 0 ? ((s.currentAmount / s.targetAmount) * 100).toFixed(1) : 0,
        Deadline: s.deadline,
        Status: s.status || 'on-track',
      }));

      const wsSavings = savingsFormatted.length > 0
        ? XLSX.utils.json_to_sheet(savingsFormatted)
        : XLSX.utils.aoa_to_sheet([['No savings goals found']]);
      
      XLSX.utils.book_append_sheet(wb, wsSavings, 'SavingsGoals');
    }

    // Category Breakdown Sheet
    if (exportOptions.categories) {
      const categoryMap = new Map<string, number>();
      transactions
        .filter((t: any) => t.type === 'Expense')
        .forEach((t: any) => {
          const current = categoryMap.get(t.category) || 0;
          categoryMap.set(t.category, current + t.amount);
        });

      const categoryData = [
        ['Category', 'Amount (₹)', 'Percentage'],
        ...Array.from(categoryMap.entries())
          .sort((a, b) => b[1] - a[1])
          .map(([category, amount]) => {
            const percentage = totalExpenses > 0 ? ((amount / totalExpenses) * 100).toFixed(1) : '0';
            return [category, amount.toFixed(2), `${percentage}%`];
          })
      ];

      const wsCategories = XLSX.utils.aoa_to_sheet(categoryData);
      XLSX.utils.book_append_sheet(wb, wsCategories, 'Categories');
    }

    // Write to buffer
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });

    return blob;
  };

  const generatePdfExport = async (data: any) => {
    // Dynamically import jsPDF
    const jsPDFModule = await import("jspdf");
    const jsPDF = jsPDFModule.jsPDF || jsPDFModule.default;
    
    const { transactions = [], emis = [], savings = [], profile } = data;

    // Calculate summary metrics
    const totalIncome = transactions
      .filter((t: any) => t.type === 'Income')
      .reduce((sum: number, t: any) => sum + t.amount, 0);

    const totalExpenses = transactions
      .filter((t: any) => t.type === 'Expense')
      .reduce((sum: number, t: any) => sum + t.amount, 0);

    const netSavings = totalIncome - totalExpenses;

    const totalEmiAmount = emis.reduce((sum: number, e: any) => sum + e.amount, 0);
    const totalEmiPaid = emis.reduce((sum: number, e: any) => sum + (e.paid || 0), 0);

    const totalSavingsTarget = savings.reduce((sum: number, s: any) => sum + s.targetAmount, 0);
    const totalSavingsCurrent = savings.reduce((sum: number, s: any) => sum + (s.currentAmount || 0), 0);

    // Category breakdown
    const categoryMap = new Map<string, number>();
    transactions
      .filter((t: any) => t.type === 'Expense')
      .forEach((t: any) => {
        const current = categoryMap.get(t.category) || 0;
        categoryMap.set(t.category, current + t.amount);
      });

    // Create PDF
    const doc = new jsPDF('p', 'pt', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 40;
    const maxWidth = pageWidth - (margin * 2);
    let yPos = 60;

    // Helper function to draw a simple table
    const drawTable = (headers: string[], rows: string[][], startY: number, headerColor: number[] = [59, 130, 246]) => {
      const rowHeight = 20;
      const colWidth = maxWidth / headers.length;
      let y = startY;

      // Draw header
      doc.setFillColor(...headerColor);
      doc.rect(margin, y, maxWidth, rowHeight, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      
      headers.forEach((header, i) => {
        doc.text(header, margin + (i * colWidth) + 5, y + 14);
      });

      y += rowHeight;

      // Draw rows
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);

      rows.forEach((row, rowIndex) => {
        // Alternate row colors
        if (rowIndex % 2 === 0) {
          doc.setFillColor(245, 245, 245);
          doc.rect(margin, y, maxWidth, rowHeight, 'F');
        }

        row.forEach((cell, colIndex) => {
          const text = cell.toString();
          const x = margin + (colIndex * colWidth) + 5;
          // Right align numbers (last column typically)
          if (colIndex === row.length - 1 && text.includes('₹')) {
            doc.text(text, margin + ((colIndex + 1) * colWidth) - 10, y + 14, { align: 'right' });
          } else {
            doc.text(text, x, y + 14);
          }
        });

        y += rowHeight;

        // Check if we need a new page
        if (y > pageHeight - 100) {
          doc.addPage();
          y = 60;
        }
      });

      return y + 10;
    };

    // Title Page
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(37, 99, 235);
    doc.text('WealthGenie', pageWidth / 2, yPos, { align: 'center' });
    
    yPos += 35;
    doc.setFontSize(18);
    doc.setTextColor(0, 0, 0);
    doc.text('Financial Report', pageWidth / 2, yPos, { align: 'center' });
    
    yPos += 30;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, yPos, { align: 'center' });
    
    yPos += 20;
    doc.text(`User: ${profile?.name || 'N/A'}`, pageWidth / 2, yPos, { align: 'center' });

    yPos += 60;

    // Financial Summary Section
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Financial Summary', margin, yPos);
    yPos += 30;

    const summaryData = [
      ['Total Income', `₹${totalIncome.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
      ['Total Expenses', `₹${totalExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
      ['Net Savings', `₹${netSavings.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
    ];

    yPos = drawTable(['Metric', 'Value'], summaryData, yPos);
    yPos += 20;

    // EMI Overview
    if (exportOptions.emis && emis.length > 0) {
      if (yPos > pageHeight - 250) {
        doc.addPage();
        yPos = 60;
      }

      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('EMI Overview', margin, yPos);
      yPos += 30;

      const emiSummaryData = [
        ['Total Monthly EMI', `₹${totalEmiAmount.toLocaleString('en-IN')}`],
        ['Total Paid', `₹${totalEmiPaid.toLocaleString('en-IN')}`],
        ['Remaining', `₹${(totalEmiAmount - totalEmiPaid).toLocaleString('en-IN')}`],
      ];

      yPos = drawTable(['Metric', 'Amount'], emiSummaryData, yPos);
      yPos += 20;

      // EMI Details
      if (emis.length > 0) {
        const emisTableData = emis.slice(0, 15).map((emi: any) => [
          emi.name.substring(0, 25),
          `₹${emi.amount.toLocaleString('en-IN')}`,
          emi.dueDate,
          emi.status || 'upcoming',
        ]);

        yPos = drawTable(['EMI Name', 'Monthly Amount', 'Due Date', 'Status'], emisTableData, yPos);

        if (emis.length > 15) {
          doc.setFontSize(9);
          doc.setFont('helvetica', 'italic');
          doc.setTextColor(100, 100, 100);
          doc.text(`... and ${emis.length - 15} more EMIs`, margin, yPos + 10);
          yPos += 30;
        }
      }
    }

    // Savings Goals
    if (exportOptions.savings && savings.length > 0) {
      if (yPos > pageHeight - 250) {
        doc.addPage();
        yPos = 60;
      }

      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Savings Goals', margin, yPos);
      yPos += 30;

      const savingsSummaryData = [
        ['Total Target', `₹${totalSavingsTarget.toLocaleString('en-IN')}`],
        ['Current Amount', `₹${totalSavingsCurrent.toLocaleString('en-IN')}`],
        ['Progress', `${totalSavingsTarget > 0 ? ((totalSavingsCurrent / totalSavingsTarget) * 100).toFixed(1) : 0}%`],
      ];

      yPos = drawTable(['Metric', 'Value'], savingsSummaryData, yPos, [16, 185, 129]);
      yPos += 20;

      const savingsTableData = savings.map((goal: any) => [
        goal.name.substring(0, 25),
        `₹${goal.targetAmount.toLocaleString('en-IN')}`,
        `₹${(goal.currentAmount || 0).toLocaleString('en-IN')}`,
        `${goal.targetAmount > 0 ? ((goal.currentAmount / goal.targetAmount) * 100).toFixed(1) : 0}%`,
      ]);

      yPos = drawTable(['Goal Name', 'Target', 'Current', 'Progress'], savingsTableData, yPos, [16, 185, 129]);
    }

    // Category Breakdown
    if (exportOptions.categories && categoryMap.size > 0) {
      if (yPos > pageHeight - 200) {
        doc.addPage();
        yPos = 60;
      }

      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Expense Breakdown by Category', margin, yPos);
      yPos += 30;

      const categoryTableData = Array.from(categoryMap.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([category, amount]) => {
          const percentage = totalExpenses > 0 ? ((amount / totalExpenses) * 100).toFixed(1) : 0;
          return [
            category,
            `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            `${percentage}%`,
          ];
        });

      yPos = drawTable(['Category', 'Amount', 'Percentage'], categoryTableData, yPos, [139, 92, 246]);
    }

    // Recent Transactions
    if ((exportOptions.income || exportOptions.expenses) && transactions.length > 0) {
      doc.addPage();
      yPos = 60;

      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Recent Transactions (Last 30)', margin, yPos);
      yPos += 30;

      let filteredTransactions = transactions;
      if (!exportOptions.income || !exportOptions.expenses) {
        filteredTransactions = transactions.filter((t: any) => {
          if (exportOptions.income && t.type === 'Income') return true;
          if (exportOptions.expenses && t.type === 'Expense') return true;
          return false;
        });
      }

      const recentTransactions = filteredTransactions
        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 30);

      const transactionsTableData = recentTransactions.map((txn: any) => [
        txn.date,
        txn.description.substring(0, 20),
        txn.category.substring(0, 15),
        txn.type.substring(0, 3),
        `₹${txn.amount.toLocaleString('en-IN')}`,
      ]);

      yPos = drawTable(['Date', 'Description', 'Category', 'Type', 'Amount'], transactionsTableData, yPos);

      if (filteredTransactions.length > 30) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(100, 100, 100);
        doc.text(`... and ${filteredTransactions.length - 30} more transactions`, margin, yPos + 10);
      }
    }

    // Add page numbers to all pages
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `WealthGenie Financial Tracker | Page ${i} of ${pageCount}`,
        pageWidth / 2,
        pageHeight - 30,
        { align: 'center' }
      );
    }

    return doc.output('blob');
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      
      // Fetch data from existing endpoint (no deployment calls)
      const data = await exportApi.getData(accessToken);

      let blob: Blob;
      let fileName: string;
      const timestamp = new Date().toISOString().split('T')[0];

      if (exportFormat === 'xlsx') {
        blob = await generateExcelExport(data);
        fileName = `WealthGenie_Report_${timestamp}.xlsx`;
      } else {
        blob = await generatePdfExport(data);
        fileName = `WealthGenie_Report_${timestamp}.pdf`;
      }

      // Trigger download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExported(true);
      toast.success(`${exportFormat.toUpperCase()} file exported successfully!`);

      setTimeout(() => {
        setExported(false);
        onOpenChange(false);
      }, 2000);
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error(error.message || 'Failed to export data');
    } finally {
      setIsExporting(false);
    }
  };

  const toggleOption = (key: keyof typeof exportOptions) => {
    setExportOptions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-blue-600" />
            Export Financial Data
          </DialogTitle>
          <DialogDescription>
            Choose export format and data to include
          </DialogDescription>
        </DialogHeader>

        {exported ? (
          <div className="py-8 text-center space-y-4">
            <div className="bg-green-100 p-4 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg text-gray-900 mb-1">Export Successful!</h3>
              <p className="text-sm text-gray-600">Your file has been downloaded</p>
            </div>
          </div>
        ) : (
          <>
            {/* Format Selection */}
            <div className="space-y-3 py-2">
              <Label className="text-sm text-gray-700">Export Format</Label>
              <div className="flex gap-3">
                <button
                  onClick={() => setExportFormat('xlsx')}
                  className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                    exportFormat === 'xlsx'
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <FileSpreadsheet className={`w-5 h-5 mx-auto mb-1 ${
                    exportFormat === 'xlsx' ? 'text-blue-600' : 'text-gray-500'
                  }`} />
                  <p className="text-xs text-gray-700">Excel (.xlsx)</p>
                </button>
                <button
                  onClick={() => setExportFormat('pdf')}
                  className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                    exportFormat === 'pdf'
                      ? 'border-purple-600 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <FileText className={`w-5 h-5 mx-auto mb-1 ${
                    exportFormat === 'pdf' ? 'text-purple-600' : 'text-gray-500'
                  }`} />
                  <p className="text-xs text-gray-700">PDF Report</p>
                </button>
              </div>
            </div>

            {/* Data Selection */}
            <div className="space-y-4 py-4">
              <Label className="text-sm text-gray-700">Include Data</Label>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="income"
                    checked={exportOptions.income}
                    onCheckedChange={() => toggleOption("income")}
                  />
                  <Label htmlFor="income" className="cursor-pointer">
                    <div>
                      <p className="text-sm text-gray-900">Income Data</p>
                      <p className="text-xs text-gray-600">All income sources and monthly trends</p>
                    </div>
                  </Label>
                </div>

                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="expenses"
                    checked={exportOptions.expenses}
                    onCheckedChange={() => toggleOption("expenses")}
                  />
                  <Label htmlFor="expenses" className="cursor-pointer">
                    <div>
                      <p className="text-sm text-gray-900">Expense Data</p>
                      <p className="text-xs text-gray-600">Detailed expense transactions</p>
                    </div>
                  </Label>
                </div>

                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="savings"
                    checked={exportOptions.savings}
                    onCheckedChange={() => toggleOption("savings")}
                  />
                  <Label htmlFor="savings" className="cursor-pointer">
                    <div>
                      <p className="text-sm text-gray-900">Savings & Goals</p>
                      <p className="text-xs text-gray-600">Savings goals and progress</p>
                    </div>
                  </Label>
                </div>

                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="categories"
                    checked={exportOptions.categories}
                    onCheckedChange={() => toggleOption("categories")}
                  />
                  <Label htmlFor="categories" className="cursor-pointer">
                    <div>
                      <p className="text-sm text-gray-900">Category Breakdown</p>
                      <p className="text-xs text-gray-600">Spending by category</p>
                    </div>
                  </Label>
                </div>

                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="emis"
                    checked={exportOptions.emis}
                    onCheckedChange={() => toggleOption("emis")}
                  />
                  <Label htmlFor="emis" className="cursor-pointer">
                    <div>
                      <p className="text-sm text-gray-900">EMI & Loans</p>
                      <p className="text-xs text-gray-600">Loan details and payment schedule</p>
                    </div>
                  </Label>
                </div>

                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="summary"
                    checked={exportOptions.summary}
                    onCheckedChange={() => toggleOption("summary")}
                  />
                  <Label htmlFor="summary" className="cursor-pointer">
                    <div>
                      <p className="text-sm text-gray-900">Executive Summary</p>
                      <p className="text-xs text-gray-600">Overview and key metrics</p>
                    </div>
                  </Label>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                {exportFormat === 'xlsx' ? (
                  <FileSpreadsheet className="w-5 h-5 text-blue-600 mt-0.5" />
                ) : (
                  <FileText className="w-5 h-5 text-purple-600 mt-0.5" />
                )}
                <div className="text-sm">
                  <h4 className="text-blue-900 mb-1">
                    {exportFormat === 'xlsx' ? 'Excel Workbook' : 'PDF Report'}
                  </h4>
                  <p className="text-blue-700">
                    {exportFormat === 'xlsx'
                      ? 'Multi-sheet workbook with separate tabs for transactions, EMIs, savings goals, and category breakdown.'
                      : 'Professional PDF report with summary metrics, detailed tables, and category breakdown charts.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button
                onClick={handleExport}
                disabled={!Object.values(exportOptions).some(v => v) || isExporting}
                className="flex-1 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white"
              >
                <Download className="w-4 h-4 mr-2" />
                {isExporting ? "Exporting..." : `Download ${exportFormat.toUpperCase()}`}
              </Button>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
