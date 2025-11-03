import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Button } from "./ui/button";
import { Sparkles, Download, LogOut, TrendingUp, Wallet, PiggyBank, PieChart, CreditCard, Lightbulb, MessageCircle, Upload, History } from "lucide-react";
import { IncomeOverview } from "./income-overview";
import { ExpenditureSummary } from "./expenditure-summary";
import { SavingsTracker } from "./savings-tracker";
import { CategorySpending } from "./category-spending";
import { EmiTracker } from "./emi-tracker";
import { SuggestionsSection } from "./suggestions-section";
import { ChatbotPanel } from "./chatbot-panel";
import { ExportModal } from "./export-modal";
import { UploadModal } from "./upload-modal";
import { HistoryModal } from "./history-modal";
import { useState, useEffect } from "react";
import { fileApi } from "../utils/api";
import { toast } from "sonner@2.0.3";

interface DashboardProps {
  accessToken: string;
  onLogout: () => void;
}

export function Dashboard({ accessToken, onLogout }: DashboardProps) {
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [activeFileName, setActiveFileName] = useState<string | null>(null);
  const [isLoadingFile, setIsLoadingFile] = useState(false);

  useEffect(() => {
    // Don't check for active file on mount
    // Always start with welcome screen
    setIsLoadingFile(false);
  }, []);

  const fetchActiveFile = async () => {
    try {
      const { files, activeFileId } = await fileApi.getAll(accessToken);
      
      if (activeFileId) {
        setActiveFileId(activeFileId);
        const activeFile = files?.find((f: any) => f.id === activeFileId);
        if (activeFile) {
          setActiveFileName(activeFile.fileName);
        }
      }
    } catch (error) {
      console.error('Failed to fetch active file:', error);
    }
  };

  const handleUploadComplete = async () => {
    setIsLoadingFile(true);
    await fetchActiveFile();
    setRefreshKey(prev => prev + 1);
    // Small delay to ensure data is loaded
    setTimeout(() => {
      setIsLoadingFile(false);
      // Show success message after loading complete
      setTimeout(() => {
        toast.success('Dashboard updated with new file data!');
      }, 100);
    }, 500);
  };

  const handleFileSelect = async (fileId: string) => {
    setIsLoadingFile(true);
    setActiveFileId(fileId);
    
    // Update the active file name
    try {
      const { files } = await fileApi.getAll(accessToken);
      const activeFile = files?.find((f: any) => f.id === fileId);
      if (activeFile) {
        setActiveFileName(activeFile.fileName);
      }
    } catch (error) {
      console.error('Failed to update active file name:', error);
    }
    
    // Refresh all components with new file data
    setRefreshKey(prev => prev + 1);
    
    // Small delay to ensure data is loaded
    setTimeout(() => {
      setIsLoadingFile(false);
      // Show success message after loading complete
      setTimeout(() => {
        toast.success('Dashboard updated! Now showing data from selected file.');
      }, 100);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-blue-600 to-green-600 p-2 rounded-xl">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                  WealthGenie
                </h1>
                {activeFileName ? (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 border border-green-300 text-xs text-green-700">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                      Active File
                    </span>
                    <p className="text-xs text-gray-600 truncate max-w-xs" title={activeFileName}>
                      {activeFileName}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-gray-600">
                    No file selected - Upload or select from history
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                onClick={() => setHistoryModalOpen(true)}
                variant="outline"
                className="border-gray-300"
              >
                <History className="w-4 h-4 mr-2" />
                History
              </Button>
              <Button
                onClick={() => setUploadModalOpen(true)}
                className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Data
              </Button>
              <Button
                onClick={() => setExportModalOpen(true)}
                variant="outline"
                className="border-gray-300"
              >
                <Download className="w-4 h-4 mr-2" />
                Export Data
              </Button>
              <Button
                onClick={onLogout}
                variant="outline"
                className="border-gray-300"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Screen - Show when no file is active */}
        {!activeFileId ? (
          <div className="flex items-center justify-center min-h-[70vh]">
            <div className="max-w-2xl w-full text-center space-y-8">
              {/* Icon */}
              <div className="flex justify-center">
                <div className="bg-gradient-to-br from-blue-600 to-green-600 p-6 rounded-3xl shadow-2xl">
                  <Sparkles className="w-16 h-16 text-white" />
                </div>
              </div>

              {/* Welcome Message */}
              <div className="space-y-4">
                <h2 className="text-3xl text-gray-900">Welcome to WealthGenie!</h2>
                <p className="text-lg text-gray-600">
                  Your AI-powered financial assistant is ready to analyze your data and provide personalized insights.
                </p>
              </div>

              {/* Action Cards */}
              <div className="grid md:grid-cols-2 gap-6 pt-4">
                {/* Upload Card */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-2xl p-8 hover:shadow-lg transition-shadow">
                  <div className="flex flex-col items-center space-y-4">
                    <div className="bg-blue-600 p-4 rounded-full">
                      <Upload className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl text-gray-900">Upload New File</h3>
                    <p className="text-sm text-gray-600 text-center">
                      Upload an Excel file with your transaction data to get started
                    </p>
                    <Button
                      onClick={() => setUploadModalOpen(true)}
                      className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-6"
                    >
                      <Upload className="w-5 h-5 mr-2" />
                      Upload File
                    </Button>
                  </div>
                </div>

                {/* History Card */}
                <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-2xl p-8 hover:shadow-lg transition-shadow">
                  <div className="flex flex-col items-center space-y-4">
                    <div className="bg-green-600 p-4 rounded-full">
                      <History className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl text-gray-900">View History</h3>
                    <p className="text-sm text-gray-600 text-center">
                      Select from your previously uploaded files to continue analysis
                    </p>
                    <Button
                      onClick={() => setHistoryModalOpen(true)}
                      className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white py-6"
                    >
                      <History className="w-5 h-5 mr-2" />
                      View History
                    </Button>
                  </div>
                </div>
              </div>

              {/* Info Box */}
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-6 text-left">
                <h4 className="text-sm text-purple-900 mb-3">📊 What we analyze from your file:</h4>
                <div className="grid md:grid-cols-2 gap-3 text-sm text-purple-700">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    <span>Income tracking & trends</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Wallet className="w-4 h-4" />
                    <span>Expense categorization</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <PiggyBank className="w-4 h-4" />
                    <span>Savings goals & progress</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <PieChart className="w-4 h-4" />
                    <span>Category breakdown & insights</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    <span>EMI tracking & alerts</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-4 h-4" />
                    <span>AI-powered chat assistant</span>
                  </div>
                </div>
              </div>

              {/* Important Note */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-sm text-blue-900 text-center">
                  <strong>Important:</strong> Each uploaded file is analyzed separately. Switch between files using the History button to view different datasets.
                </p>
              </div>
            </div>
          </div>
        ) : isLoadingFile ? (
          <div className="flex items-center justify-center min-h-[70vh]">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
              <div className="space-y-2">
                <h3 className="text-xl text-gray-900">Analyzing File...</h3>
                <p className="text-gray-600">Loading transactions and generating insights</p>
              </div>
            </div>
          </div>
        ) : (
          <Tabs defaultValue="income" className="space-y-6">
          <TabsList className="grid w-full grid-cols-7 bg-white border border-gray-200 p-1 h-auto">
            <TabsTrigger value="income" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-3">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs sm:text-sm">Income</span>
            </TabsTrigger>
            <TabsTrigger value="expenses" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-3">
              <Wallet className="w-4 h-4" />
              <span className="text-xs sm:text-sm">Expenses</span>
            </TabsTrigger>
            <TabsTrigger value="savings" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-3">
              <PiggyBank className="w-4 h-4" />
              <span className="text-xs sm:text-sm">Savings</span>
            </TabsTrigger>
            <TabsTrigger value="categories" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-3">
              <PieChart className="w-4 h-4" />
              <span className="text-xs sm:text-sm">Categories</span>
            </TabsTrigger>
            <TabsTrigger value="emis" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-3">
              <CreditCard className="w-4 h-4" />
              <span className="text-xs sm:text-sm">EMIs</span>
            </TabsTrigger>
            <TabsTrigger value="suggestions" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-3">
              <Lightbulb className="w-4 h-4" />
              <span className="text-xs sm:text-sm">Insights</span>
            </TabsTrigger>
            <TabsTrigger value="chatbot" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-3">
              <MessageCircle className="w-4 h-4" />
              <span className="text-xs sm:text-sm">Chat</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="income">
            <IncomeOverview key={`income-${refreshKey}`} accessToken={accessToken} activeFileId={activeFileId} />
          </TabsContent>

          <TabsContent value="expenses">
            <ExpenditureSummary key={`expenses-${refreshKey}`} accessToken={accessToken} activeFileId={activeFileId} />
          </TabsContent>

          <TabsContent value="savings">
            <SavingsTracker key={`savings-${refreshKey}`} accessToken={accessToken} activeFileId={activeFileId} />
          </TabsContent>

          <TabsContent value="categories">
            <CategorySpending key={`categories-${refreshKey}`} accessToken={accessToken} activeFileId={activeFileId} />
          </TabsContent>

          <TabsContent value="emis">
            <EmiTracker key={`emis-${refreshKey}`} accessToken={accessToken} activeFileId={activeFileId} />
          </TabsContent>

          <TabsContent value="suggestions">
            <SuggestionsSection key={`suggestions-${refreshKey}`} accessToken={accessToken} activeFileId={activeFileId} />
          </TabsContent>

          <TabsContent value="chatbot">
            <ChatbotPanel key={`chatbot-${refreshKey}`} accessToken={accessToken} activeFileId={activeFileId} />
          </TabsContent>
        </Tabs>
        )}
      </main>

      <HistoryModal
        accessToken={accessToken}
        open={historyModalOpen}
        onOpenChange={setHistoryModalOpen}
        onFileSelect={handleFileSelect}
        activeFileId={activeFileId}
      />

      <ExportModal 
        accessToken={accessToken}
        open={exportModalOpen} 
        onOpenChange={setExportModalOpen} 
      />

      <UploadModal
        accessToken={accessToken}
        open={uploadModalOpen}
        onOpenChange={setUploadModalOpen}
        onUploadComplete={handleUploadComplete}
      />
    </div>
  );
}
