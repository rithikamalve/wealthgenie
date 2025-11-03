import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Upload, FileSpreadsheet, CheckCircle2, ArrowRight, AlertCircle } from "lucide-react";
import { useState } from "react";
import { transactionApi } from "../utils/api";
import { toast } from "sonner@2.0.3";
import * as XLSX from "https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs";

interface UploadPageProps {
  accessToken: string;
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

export function UploadPage({ accessToken, onUploadComplete }: UploadPageProps) {
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedTransactions, setParsedTransactions] = useState<ParsedTransaction[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);

  const parseExcelFile = async (file: File): Promise<ParsedTransaction[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          
          // Get the first sheet
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          
          // Convert to JSON
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          
          if (jsonData.length === 0) {
            reject(new Error('Excel file is empty'));
            return;
          }

          // Parse and validate transactions
          const transactions: ParsedTransaction[] = [];
          
          for (let i = 0; i < jsonData.length; i++) {
            const row: any = jsonData[i];
            
            // Try to find date column (case insensitive)
            const dateKey = Object.keys(row).find(key => 
              key.toLowerCase().includes('date')
            );
            
            // Try to find description column
            const descKey = Object.keys(row).find(key => 
              key.toLowerCase().includes('description') || 
              key.toLowerCase().includes('details') ||
              key.toLowerCase().includes('particulars')
            );
            
            // Try to find category column
            const categoryKey = Object.keys(row).find(key => 
              key.toLowerCase().includes('category')
            );
            
            // Try to find amount column
            const amountKey = Object.keys(row).find(key => 
              key.toLowerCase().includes('amount')
            );
            
            // Try to find type column
            const typeKey = Object.keys(row).find(key => 
              key.toLowerCase().includes('type')
            );
            
            // Try to find source column
            const sourceKey = Object.keys(row).find(key => 
              key.toLowerCase().includes('source')
            );
            
            if (!dateKey || !descKey || !amountKey || !typeKey) {
              console.warn(`Row ${i + 2} is missing required fields, skipping`);
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
            const amount = parseFloat(String(row[amountKey]).replace(/[₹,\s]/g, ''));
            
            if (isNaN(amount)) {
              console.warn(`Row ${i + 2} has invalid amount, skipping`);
              continue;
            }
            
            transactions.push({
              date: dateStr,
              description: String(row[descKey]),
              category: categoryKey ? String(row[categoryKey]) : 'Uncategorized',
              amount: Math.abs(amount),
              type: String(row[typeKey]),
              source: sourceKey ? String(row[sourceKey]) : undefined
            });
          }
          
          if (transactions.length === 0) {
            reject(new Error('No valid transactions found in file. Please check the format.'));
            return;
          }
          
          resolve(transactions);
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFile(file.name);
    setIsProcessing(true);
    setParseError(null);

    try {
      // Parse the Excel file
      const transactions = await parseExcelFile(file);
      setParsedTransactions(transactions);

      // Add transactions to backend
      for (const transaction of transactions) {
        await transactionApi.add(accessToken, transaction);
      }

      toast.success(`File uploaded! ${transactions.length} transactions imported.`);
    } catch (error: any) {
      console.error('Upload error:', error);
      setParseError(error.message || 'Failed to process file');
      toast.error(error.message || 'Failed to process file');
      setUploadedFile(null);
      setParsedTransactions([]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 p-6">
      <div className="max-w-4xl mx-auto space-y-8 pt-12">
        {/* Header */}
        <div className="text-center space-y-3">
          <h1 className="text-4xl text-gray-900">Upload Your Financial Data</h1>
          <p className="text-gray-600">
            Import your transaction data to get started with personalized insights
          </p>
        </div>

        {/* Upload Card */}
        <Card className="p-8">
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl text-gray-900 mb-2">Excel File Upload</h3>
              <p className="text-sm text-gray-600">Upload .xlsx or .xls files</p>
            </div>

            {/* Drag and Drop Area */}
            <label
              htmlFor="file-upload"
              className={`
                block border-2 border-dashed rounded-xl p-12 text-center cursor-pointer
                transition-all duration-200 hover:border-blue-400 hover:bg-blue-50
                ${uploadedFile ? 'border-green-400 bg-green-50' : 'border-gray-300 bg-gray-50'}
              `}
            >
              <input
                id="file-upload"
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleFileUpload}
              />
              
              <div className="flex flex-col items-center gap-4">
                {uploadedFile ? (
                  <>
                    <div className="bg-green-100 p-4 rounded-full">
                      <CheckCircle2 className="w-12 h-12 text-green-600" />
                    </div>
                    <div>
                      <p className="text-green-700 mb-1">File uploaded successfully!</p>
                      <p className="text-sm text-gray-600">{uploadedFile}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="bg-blue-100 p-4 rounded-full">
                      <Upload className="w-12 h-12 text-blue-600" />
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
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <FileSpreadsheet className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="text-sm">
                  <h4 className="text-blue-900 mb-1">Expected Format</h4>
                  <p className="text-blue-700">
                    Your Excel file should contain columns for: Date, Description, Category, 
                    Amount, Type (Income/Expense), and optional Source.
                  </p>
                </div>
              </div>
            </div>

            {/* Error Display */}
            {parseError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                  <div className="text-sm">
                    <h4 className="text-red-900 mb-1">Parse Error</h4>
                    <p className="text-red-700">{parseError}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Preview Section */}
            {uploadedFile && parsedTransactions.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-gray-900">File Analysis - {parsedTransactions.length} transactions found</h4>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="overflow-x-auto max-h-80 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-gray-50">
                        <tr className="border-b border-gray-300">
                          <th className="text-left py-2 px-3 text-gray-700">Date</th>
                          <th className="text-left py-2 px-3 text-gray-700">Description</th>
                          <th className="text-left py-2 px-3 text-gray-700">Category</th>
                          <th className="text-right py-2 px-3 text-gray-700">Amount</th>
                          <th className="text-left py-2 px-3 text-gray-700">Type</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedTransactions.slice(0, 10).map((txn, idx) => (
                          <tr key={idx} className="border-b border-gray-200">
                            <td className="py-2 px-3 text-gray-600">
                              {new Date(txn.date).toLocaleDateString()}
                            </td>
                            <td className="py-2 px-3 text-gray-600">{txn.description}</td>
                            <td className="py-2 px-3 text-gray-600">{txn.category}</td>
                            <td className={`py-2 px-3 text-right ${
                              txn.type === 'Income' ? 'text-green-600' : 'text-red-600'
                            }`}>
                              ₹{txn.amount.toLocaleString('en-IN')}
                            </td>
                            <td className="py-2 px-3 text-gray-600">{txn.type}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {parsedTransactions.length > 10 && (
                      <p className="text-xs text-gray-500 mt-2 text-center">
                        Showing first 10 of {parsedTransactions.length} transactions
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Processing Status */}
            {isProcessing && (
              <div className="flex items-center justify-center gap-2 text-blue-600">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                <span className="text-sm">Processing file...</span>
              </div>
            )}

            {/* Action Button */}
            <Button
              onClick={onUploadComplete}
              disabled={!uploadedFile || isProcessing || parsedTransactions.length === 0}
              className="w-full bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white py-6 disabled:opacity-50"
            >
              {isProcessing ? "Processing..." : "Proceed to Dashboard"}
              {!isProcessing && <ArrowRight className="w-5 h-5 ml-2" />}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
