import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { FileSpreadsheet, Calendar, CheckCircle2, Clock } from "lucide-react";
import { useState, useEffect } from "react";
import { fileApi } from "../utils/api";
import { toast } from "sonner@2.0.3";

interface HistoryModalProps {
  accessToken: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFileSelect: (fileId: string) => void;
  activeFileId: string | null;
}

interface FileRecord {
  id: string;
  fileName: string;
  transactionCount: number;
  uploadedAt: string;
}

export function HistoryModal({ accessToken, open, onOpenChange, onFileSelect, activeFileId }: HistoryModalProps) {
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (open) {
      fetchFiles();
    }
  }, [open]);

  const fetchFiles = async () => {
    try {
      setIsLoading(true);
      const { files } = await fileApi.getAll(accessToken);
      // Sort by upload date, newest first
      const sortedFiles = (files || []).sort((a: FileRecord, b: FileRecord) => 
        new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
      );
      setFiles(sortedFiles);
    } catch (error: any) {
      console.error('Failed to fetch file history:', error);
      toast.error('Failed to load file history');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = async (fileId: string) => {
    try {
      await fileApi.setActive(accessToken, fileId);
      toast.success('File selected! Refreshing dashboard with new data...');
      onFileSelect(fileId);
      onOpenChange(false);
    } catch (error: any) {
      console.error('Failed to set active file:', error);
      toast.error('Failed to switch file');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload History</DialogTitle>
          <DialogDescription>
            View and switch between previously uploaded files
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">Loading history...</p>
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-8">
              <FileSpreadsheet className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">No files uploaded yet</p>
            </div>
          ) : (
            files.map((file) => {
              const isActive = file.id === activeFileId;
              const uploadDate = new Date(file.uploadedAt);
              
              return (
                <div
                  key={file.id}
                  className={`
                    p-4 border rounded-lg cursor-pointer transition-all duration-200
                    ${isActive 
                      ? 'border-blue-500 bg-blue-50 shadow-md' 
                      : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                    }
                  `}
                  onClick={() => !isActive && handleFileSelect(file.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`p-2 rounded-lg ${isActive ? 'bg-blue-100' : 'bg-gray-100'}`}>
                        <FileSpreadsheet className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-gray-600'}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-sm text-gray-900">{file.fileName}</h4>
                          {isActive && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-xs text-blue-700">
                              <CheckCircle2 className="w-3 h-3" />
                              Active
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-600">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {uploadDate.toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric', 
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {file.transactionCount} transactions
                          </div>
                        </div>
                      </div>
                    </div>
                    {!isActive && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFileSelect(file.id);
                        }}
                      >
                        View
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
