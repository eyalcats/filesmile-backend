'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Paperclip, Loader2, FileIcon } from 'lucide-react';
import { useDocumentStore } from '@/stores/document-store';
import { api } from '@/lib/api';

interface AttachmentListProps {
  open: boolean;
  onClose: () => void;
}

export function AttachmentList({ open, onClose }: AttachmentListProps) {
  const t = useTranslations('priority');
  const {
    selectedDocument,
    attachments,
    isLoadingAttachments,
    setAttachments,
    setIsLoadingAttachments,
  } = useDocumentStore();

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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Paperclip className="h-5 w-5" />
            {t('attachments')}
          </DialogTitle>
        </DialogHeader>

        {isLoadingAttachments ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-1">
              {attachments.map((attachment) => (
                <div
                  key={attachment.EXTFILENUM}
                  className="p-3 rounded-lg border bg-muted/50"
                >
                  <div className="flex items-start gap-3">
                    <FileIcon className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        {attachment.EXTFILEDES || attachment.EXTFILENAME}
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
                        {attachment.EXTFILENAME && (
                          <span className="truncate">{attachment.EXTFILENAME}</span>
                        )}
                        {attachment.SUFFIX && (
                          <span className="uppercase text-xs bg-muted px-1.5 py-0.5 rounded">
                            {attachment.SUFFIX}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                        {attachment.CURDATE && <span>{attachment.CURDATE}</span>}
                        {attachment.FILESIZE && (
                          <span>{formatFileSize(attachment.FILESIZE)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {attachments.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  {t('noAttachments')}
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
