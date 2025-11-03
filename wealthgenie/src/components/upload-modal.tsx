import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle } from "lucide-react";
import { useState } from "react";
import { transactionApi, fileApi, emiApi, savingsApi } from "../utils/api";
import { toast } from "sonner@2.0.3";
import * as XLSX from "https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs";

interface UploadModalProps {
  accessToken: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadComplete: () => void;
}

interface ParsedTransaction {
  date: string;
  description: string;
  category: string;
  amount: number;
  type: string;
  source?: string;
}

interface ParsedEMI {
  name: string;
  amount: number;
  dueDate: string;
  totalAmount?: number;
  paid?: number;
}

interface ParsedSavingsGoal {
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
}

interface ParsedData {
  transactions: ParsedTransaction[];
  emis: ParsedEMI[];
  savingsGoals: ParsedSavingsGoal[];
}

export function UploadModal({ accessToken, open, onOpenChange, onUploadComplete }: UploadModalProps) {
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedData>({ transactions: [], emis: [], savingsGoals: [] });
  const [parseError, setParseError] = useState<string | null>(null);

  const parseExcelFile = async (file: File): Promise<ParsedData> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          
          const result: ParsedData = {
            transactions: [],
            emis: [],
            savingsGoals: []
          };
          
          // Parse each sheet
          workbook.SheetNames.forEach((sheetName) => {
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            
            if (jsonData.length === 0) return;
            
            const firstRow: any = jsonData[0];
            const availableColumns = Object.keys(firstRow);
            const sheetType = sheetName.toLowerCase();
            
            console.log(`Sheet "${sheetName}" columns:`, availableColumns);
            
            // Determine sheet type based on name or columns
            if (sheetType.includes('emi') || sheetType.includes('loan')) {
              // Parse EMIs
              result.emis = parseEMISheet(jsonData);
            } else if (sheetType.includes('saving') || sheetType.includes('goal')) {
              // Parse Savings Goals
              result.savingsGoals = parseSavingsSheet(jsonData);
            } else {
              // Default to transactions
              result.transactions.push(...parseTransactionsSheet(jsonData, availableColumns));
            }
          });
          
          console.log(`Parsed ${result.transactions.length} transactions, ${result.emis.length} EMIs, ${result.savingsGoals.length} savings goals`);
          resolve(result);
        } catch (error) {
          reject(new Error(`Failed to parse Excel file: ${error.message}`));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsBinaryString(file);
    });
  };

  const parseTransactionsSheet = (jsonData: any[], availableColumns: string[]): ParsedTransaction[] => {
    const transactions: ParsedTransaction[] = [];
    const missingFields: Set<string> = new Set();
    
    for (let i = 0; i < jsonData.length; i++) {
      const row: any = jsonData[i];
      
      // Try to find columns (case insensitive)
      const dateKey = Object.keys(row).find(key => 
        key.toLowerCase().includes('date')
      );
      
      const descKey = Object.keys(row).find(key => 
        key.toLowerCase().includes('description') || 
        key.toLowerCase().includes('details') ||
        key.toLowerCase().includes('particulars') ||
        key.toLowerCase().includes('narration')
      );
      
      const categoryKey = Object.keys(row).find(key => 
        key.toLowerCase().includes('category')
      );
      
      const amountKey = Object.keys(row).find(key => 
        key.toLowerCase().includes('amount') ||
        key.toLowerCase().includes('debit') ||
        key.toLowerCase().includes('credit')
      );
      
      const typeKey = Object.keys(row).find(key => 
        key.toLowerCase().includes('type')
      );
      
      const sourceKey = Object.keys(row).find(key => 
        key.toLowerCase().includes('source') ||
        key.toLowerCase().includes('account')
      );
      
      // Track missing fields
      if (!dateKey) missingFields.add('Date');
      if (!descKey) missingFields.add('Description');
      if (!amountKey) missingFields.add('Amount');
      
      // For required fields: date, description, and amount
      if (!dateKey || !descKey || !amountKey) {
        continue;
      }
      
      // Parse date
      let dateStr = row[dateKey];
      if (typeof dateStr === 'number') {
        // Excel date serial number
        const date = XLSX.SSF.parse_date_code(dateStr);
        dateStr = `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
      } else if (dateStr) {
        // Try to parse string date
        const parsedDate = new Date(dateStr);
        if (!isNaN(parsedDate.getTime())) {
          dateStr = parsedDate.toISOString().split('T')[0];
        }
      }
      
      // Parse amount
      let amount = parseFloat(String(row[amountKey]).replace(/[₹,\s]/g, ''));
      
      if (isNaN(amount)) {
        console.warn(`Row ${i + 2} has invalid amount, skipping`);
        continue;
      }
      
      // Determine transaction type
      let transactionType: string;
      if (typeKey && row[typeKey]) {
        transactionType = String(row[typeKey]);
      } else {
        // Auto-detect based on amount (negative = expense, positive = income)
        transactionType = amount < 0 ? 'Expense' : 'Income';
      }
      
      transactions.push({
        date: dateStr,
        description: String(row[descKey]),
        category: categoryKey ? String(row[categoryKey]) : 'Uncategorized',
        amount: Math.abs(amount),
        type: transactionType,
        source: sourceKey ? String(row[sourceKey]) : undefined
      });
    }
    
    return transactions;
  };

  const parseEMISheet = (jsonData: any[]): ParsedEMI[] => {
    const emis: ParsedEMI[] = [];
    
    for (const row of jsonData) {
      const nameKey = Object.keys(row).find(key => 
        key.toLowerCase().includes('name') ||
        key.toLowerCase().includes('loan') ||
        key.toLowerCase().includes('emi')
      );
      
      const amountKey = Object.keys(row).find(key => 
        key.toLowerCase().includes('amount') ||
        key.toLowerCase().includes('emi')
      );
      
      const dueDateKey = Object.keys(row).find(key => 
        key.toLowerCase().includes('due') ||
        key.toLowerCase().includes('date') ||
        key.toLowerCase().includes('end')
      );
      
      const totalKey = Object.keys(row).find(key => 
        key.toLowerCase().includes('total')
      );
      
      const paidKey = Object.keys(row).find(key => 
        key.toLowerCase().includes('paid')
      );
      
      if (!nameKey || !amountKey || !dueDateKey) continue;
      
      // Parse date
      let dateStr = row[dueDateKey];
      if (typeof dateStr === 'number') {
        const date = XLSX.SSF.parse_date_code(dateStr);
        dateStr = `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
      } else if (dateStr) {
        const parsedDate = new Date(dateStr);
        if (!isNaN(parsedDate.getTime())) {
          dateStr = parsedDate.toISOString().split('T')[0];
        }
      }
      
      const amount = parseFloat(String(row[amountKey]).replace(/[₹,\s]/g, ''));
      if (isNaN(amount)) continue;
      
      emis.push({
        name: String(row[nameKey]),
        amount: amount,
        dueDate: dateStr,
        totalAmount: totalKey ? parseFloat(String(row[totalKey]).replace(/[₹,\s]/g, '')) : undefined,
        paid: paidKey ? parseFloat(String(row[paidKey]).replace(/[₹,\s]/g, '')) : 0,
      });
    }
    
    return emis;
  };

  const parseSavingsSheet = (jsonData: any[]): ParsedSavingsGoal[] => {
    const goals: ParsedSavingsGoal[] = [];
    
    for (const row of jsonData) {
      const nameKey = Object.keys(row).find(key => 
        key.toLowerCase().includes('name') ||
        key.toLowerCase().includes('goal')
      );
      
      const targetKey = Object.keys(row).find(key => 
        key.toLowerCase().includes('target') ||
        key.toLowerCase().includes('goal')
      );
      
      const currentKey = Object.keys(row).find(key => 
        key.toLowerCase().includes('current') ||
        key.toLowerCase().includes('saved')
      );
      
      const deadlineKey = Object.keys(row).find(key => 
        key.toLowerCase().includes('deadline') ||
        key.toLowerCase().includes('date') ||
        key.toLowerCase().includes('target date')
      );
      
      if (!nameKey || !targetKey || !deadlineKey) continue;
      
      // Parse date
      let dateStr = row[deadlineKey];
      if (typeof dateStr === 'number') {
        const date = XLSX.SSF.parse_date_code(dateStr);
        dateStr = `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
      } else if (dateStr) {
        const parsedDate = new Date(dateStr);
        if (!isNaN(parsedDate.getTime())) {
          dateStr = parsedDate.toISOString().split('T')[0];
        }
      }
      
      const target = parseFloat(String(row[targetKey]).replace(/[₹,\s]/g, ''));
      const current = currentKey ? parseFloat(String(row[currentKey]).replace(/[₹,\s]/g, '')) : 0;
      
      if (isNaN(target)) continue;
      
      goals.push({
        name: String(row[nameKey]),
        targetAmount: target,
        currentAmount: current,
        deadline: dateStr,
      });
    }
    
    return goals;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFile(file.name);
    setIsProcessing(true);
    setParseError(null);

    try {
      // Parse the Excel file
      const data = await parseExcelFile(file);
      setParsedData(data);

      if (data.transactions.length === 0 && data.emis.length === 0 && data.savingsGoals.length === 0) {
        throw new Error('No valid data found in file. Please check the format.');
      }

      // Save file metadata and get file ID
      const { file: fileRecord } = await fileApi.add(accessToken, {
        fileName: file.name,
        transactionCount: data.transactions.length,
      });

      const fileId = fileRecord.id;

      // Add transactions to backend with file ID
      for (const transaction of data.transactions) {
        await transactionApi.add(accessToken, {
          ...transaction,
          fileId,
        });
      }

      // Add EMIs to backend with file ID
      for (const emi of data.emis) {
        await emiApi.add(accessToken, {
          ...emi,
          fileId,
        });
      }

      // Add savings goals to backend with file ID
      for (const goal of data.savingsGoals) {
        await savingsApi.add(accessToken, {
          ...goal,
          fileId,
        });
      }

      const summary = [];
      if (data.transactions.length > 0) summary.push(`${data.transactions.length} transactions`);
      if (data.emis.length > 0) summary.push(`${data.emis.length} EMIs`);
      if (data.savingsGoals.length > 0) summary.push(`${data.savingsGoals.length} savings goals`);

      toast.success(`Success! Imported ${summary.join(', ')} from ${file.name}`);
      
      // Set this file as active immediately
      await fileApi.setActive(accessToken, fileId);
      
      // Reset state and close modal after a delay
      setTimeout(() => {
        onUploadComplete();
        handleClose();
      }, 1000);
    } catch (error: any) {
      console.error('Upload error:', error);
      setParseError(error.message || 'Failed to process file');
      toast.error(error.message || 'Failed to process file');
      setUploadedFile(null);
      setParsedData({ transactions: [], emis: [], savingsGoals: [] });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setUploadedFile(null);
    setParsedData({ transactions: [], emis: [], savingsGoals: [] });
    setParseError(null);
    setIsProcessing(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Financial Data</DialogTitle>
          <DialogDescription>
            Import your transaction data from an Excel file (.xlsx or .xls)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Drag and Drop Area */}
          <label
            htmlFor="file-upload-modal"
            className={`
              block border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
              transition-all duration-200 hover:border-blue-400 hover:bg-blue-50
              ${uploadedFile ? 'border-green-400 bg-green-50' : 'border-gray-300 bg-gray-50'}
            `}
          >
            <input
              id="file-upload-modal"
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleFileUpload}
              disabled={isProcessing}
            />
            
            <div className="flex flex-col items-center gap-3">
              {uploadedFile ? (
                <>
                  <div className="bg-green-100 p-3 rounded-full">
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                  </div>
                  <div>
                    <p className="text-green-700 mb-1">File uploaded successfully!</p>
                    <p className="text-sm text-gray-600">{uploadedFile}</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-blue-100 p-3 rounded-full">
                    <Upload className="w-8 h-8 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-gray-700 mb-1">
                      Drag and drop your file here
                    </p>
                    <p className="text-sm text-gray-500">or click to browse</p>
                  </div>
                </>
              )}
            </div>
          </label>

          {/* File Format Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <FileSpreadsheet className="w-4 h-4 text-blue-600 mt-0.5" />
              <div className="text-sm space-y-1">
                <h4 className="text-blue-900">Expected Format</h4>
                <p className="text-blue-700">
                  <strong>Transactions Sheet:</strong> Date, Description, Amount
                </p>
                <p className="text-blue-700">
                  <strong>EMI Sheet (optional):</strong> Name/Loan, Amount/EMI, Due Date
                </p>
                <p className="text-blue-700">
                  <strong>Savings Sheet (optional):</strong> Name/Goal, Target Amount, Deadline
                </p>
                <p className="text-blue-600 text-xs">
                  💡 Tip: Use separate sheets named "Transactions", "EMI", and "Savings" for best results
                </p>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {parseError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
                <div className="text-sm">
                  <h4 className="text-red-900 mb-1">Parse Error</h4>
                  <p className="text-red-700">{parseError}</p>
                </div>
              </div>
            </div>
          )}

          {/* Preview Section */}
          {uploadedFile && (parsedData.transactions.length > 0 || parsedData.emis.length > 0 || parsedData.savingsGoals.length > 0) && (
            <div className="space-y-3">
              <h4 className="text-sm text-gray-900">
                File Analysis
              </h4>
              
              {/* Transactions Preview */}
              {parsedData.transactions.length > 0 && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <h5 className="text-sm text-gray-700 mb-2">
                    {parsedData.transactions.length} Transactions
                  </h5>
                  <div className="overflow-x-auto max-h-40 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-gray-50">
                        <tr className="border-b border-gray-300">
                          <th className="text-left py-1 px-2">Date</th>
                          <th className="text-left py-1 px-2">Description</th>
                          <th className="text-right py-1 px-2">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedData.transactions.slice(0, 3).map((txn, idx) => (
                          <tr key={idx} className="border-b border-gray-200">
                            <td className="py-1 px-2 text-gray-600">
                              {new Date(txn.date).toLocaleDateString()}
                            </td>
                            <td className="py-1 px-2 text-gray-600">{txn.description}</td>
                            <td className="py-1 px-2 text-right text-gray-600">
                              ₹{txn.amount.toLocaleString('en-IN')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* EMIs Preview */}
              {parsedData.emis.length > 0 && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                  <h5 className="text-sm text-purple-700 mb-2">
                    {parsedData.emis.length} EMIs
                  </h5>
                  <div className="space-y-1 text-xs">
                    {parsedData.emis.slice(0, 3).map((emi, idx) => (
                      <div key={idx} className="flex justify-between text-purple-600">
                        <span>{emi.name}</span>
                        <span>₹{emi.amount.toLocaleString('en-IN')}/month</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Savings Goals Preview */}
              {parsedData.savingsGoals.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <h5 className="text-sm text-green-700 mb-2">
                    {parsedData.savingsGoals.length} Savings Goals
                  </h5>
                  <div className="space-y-1 text-xs">
                    {parsedData.savingsGoals.slice(0, 3).map((goal, idx) => (
                      <div key={idx} className="flex justify-between text-green-600">
                        <span>{goal.name}</span>
                        <span>₹{goal.targetAmount.toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Processing Status */}
          {isProcessing && (
            <div className="flex items-center justify-center gap-2 text-blue-600">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              <span className="text-sm">Processing file...</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
