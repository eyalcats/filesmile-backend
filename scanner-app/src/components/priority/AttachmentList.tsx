import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Paperclip, Loader2, FileIcon, ImageIcon, FileTextIcon, FileSpreadsheet, Download, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDocumentStore, Attachment } from '@/stores/document-store';
import { api } from '@/lib/api';

interface AttachmentListProps {
  open: boolean;
  onClose: () => void;
}

// Get appropriate icon based on file type
function getFileIcon(suffix?: string, small = false) {
  const ext = suffix?.toLowerCase();
  const size = small ? 'h-5 w-5' : 'h-8 w-8';
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'webp'].includes(ext || '')) {
    return <ImageIcon className={`${size} text-blue-500`} />;
  }
  if (['pdf'].includes(ext || '')) {
    return <FileTextIcon className={`${size} text-red-500`} />;
  }
  if (['xls', 'xlsx', 'csv'].includes(ext || '')) {
    return <FileSpreadsheet className={`${size} text-green-500`} />;
  }
  if (['doc', 'docx', 'txt', 'rtf'].includes(ext || '')) {
    return <FileTextIcon className={`${size} text-blue-600`} />;
  }
  return <FileIcon className={`${size} text-gray-500`} />;
}

// Check if a string looks like a base64 data URL
function isBase64DataUrl(str?: string): boolean {
  if (!str) return false;
  return str.startsWith('data:');
}

// Check if a string looks like base64 data (for display purposes)
function isBase64Data(str?: string): boolean {
  if (!str) return false;
  return str.startsWith('data:') || str.length > 200;
}

// Get clean filename without base64 data
function getCleanFilename(filename?: string, description?: string): string {
  if (description && !isBase64Data(description)) {
    return description;
  }
  if (filename && !isBase64Data(filename)) {
    return filename;
  }
  return 'Attachment';
}

// Convert data URL to Blob
function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',');
  const mimeMatch = header.match(/data:([^;]+)/);
  const mimeType = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
  const byteString = atob(base64);
  const byteArray = new Uint8Array(byteString.length);
  for (let i = 0; i < byteString.length; i++) {
    byteArray[i] = byteString.charCodeAt(i);
  }
  return new Blob([byteArray], { type: mimeType });
}

export function AttachmentList({ open, onClose }: AttachmentListProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const isRTL = locale === 'he';
  const {
    selectedDocument,
    attachments,
    isLoadingAttachments,
    setAttachments,
    setIsLoadingAttachments,
  } = useDocumentStore();

  // Open attachment in new tab using blob URL (avoids base64 in browser URL)
  const handleOpenAttachment = (attachment: Attachment) => {
    const dataUrl = attachment.EXTFILENAME;
    if (dataUrl && isBase64DataUrl(dataUrl)) {
      try {
        const blob = dataUrlToBlob(dataUrl);
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
        // Clean up blob URL after a delay
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
      } catch (error) {
        console.error('Failed to open attachment:', error);
      }
    }
  };

  // Download attachment
  const handleDownloadAttachment = (attachment: Attachment) => {
    const dataUrl = attachment.EXTFILENAME;
    if (dataUrl && isBase64DataUrl(dataUrl)) {
      try {
        const blob = dataUrlToBlob(dataUrl);
        const blobUrl = URL.createObjectURL(blob);
        const filename = getCleanFilename(attachment.EXTFILENAME, attachment.EXTFILEDES);
        const extension = attachment.SUFFIX ? `.${attachment.SUFFIX.toLowerCase()}` : '';
        const downloadName = filename.includes('.') ? filename : `${filename}${extension}`;

        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = downloadName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        // Clean up blob URL
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      } catch (error) {
        console.error('Failed to download attachment:', error);
      }
    }
  };

  // Check if attachment can be opened/downloaded
  const canOpenAttachment = (attachment: Attachment) => {
    return isBase64DataUrl(attachment.EXTFILENAME);
  };

  // Load attachments when dialog opens
  useEffect(() => {
    if (open && selectedDocument) {
      loadAttachments();
    }
  }, [open, selectedDocument]);

  const loadAttachments = async () => {
    if (!selectedDocument) return;

    setIsLoadingAttachments(true);
    try {
      const files = await api.getAttachments(
        selectedDocument.Form,
        selectedDocument.FormKey,
        selectedDocument.ExtFilesForm || 'EXTFILES'
      );
      // Map API response to store format
      setAttachments(
        files.map((f) => ({
          EXTFILENUM: f.EXTFILENUM || 0,
          EXTFILEDES: f.EXTFILEDES || '',
          EXTFILENAME: f.EXTFILENAME || '',
          SUFFIX: f.SUFFIX || '',
          FILESIZE: f.FILESIZE,
          CURDATE: f.CURDATE,
        }))
      );
    } catch (error) {
      console.error('Failed to load attachments:', error);
      setAttachments([]);
    } finally {
      setIsLoadingAttachments(false);
    }
  };

  // Format file size for display
  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Format date to short format
  const formatShortDate = (dateStr?: string): string => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString('he-IL', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]" dir={isRTL ? 'rtl' : 'ltr'}>
        <DialogHeader className="pb-2">
          <DialogTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Paperclip className="h-5 w-5" />
            {t('priority.attachments')} ({attachments.length})
          </DialogTitle>
          <DialogDescription className="sr-only">
            {t('priority.attachments')}
          </DialogDescription>
        </DialogHeader>

        {isLoadingAttachments ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-2 p-1">
              {attachments.map((attachment) => (
                <div
                  key={attachment.EXTFILENUM}
                  className={`p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}
                >
                  <div className="shrink-0">
                    {getFileIcon(attachment.SUFFIX)}
                  </div>
                  <div className={`flex-1 min-w-0 ${isRTL ? 'text-right' : 'text-left'}`}>
                    <div className="font-medium text-sm truncate">
                      {getCleanFilename(attachment.EXTFILENAME, attachment.EXTFILEDES)}
                    </div>
                    <div className={`text-xs text-muted-foreground flex items-center gap-2 mt-1 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                      {attachment.SUFFIX && (
                        <span className="uppercase bg-muted px-1.5 py-0.5 rounded text-[10px]">
                          {attachment.SUFFIX}
                        </span>
                      )}
                      {attachment.FILESIZE && (
                        <span className="text-[10px]">{formatFileSize(attachment.FILESIZE)}</span>
                      )}
                      {attachment.CURDATE && (
                        <span className="text-[10px]">{formatShortDate(attachment.CURDATE)}</span>
                      )}
                    </div>
                  </div>
                  {/* Action buttons directly on card */}
                  {canOpenAttachment(attachment) && (
                    <div className={`flex items-center gap-1 shrink-0 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleOpenAttachment(attachment)}
                        title={t('priority.open')}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleDownloadAttachment(attachment)}
                        title={t('priority.download')}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}

              {attachments.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  {t('priority.noAttachments')}
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
