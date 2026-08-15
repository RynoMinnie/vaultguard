'use client';

import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { useAuthStore, useVaultStore } from '@/store';
import { decryptEntry, encryptEntry } from '@/lib/crypto';
import type { VaultEntryData } from '@/lib/crypto';
import { saveEntries, getAllEntries, deleteEntries as deleteEntriesDB } from '@/lib/db-local';
import { toast } from 'sonner';
import { Loader2, FileDown, FileUp, AlertTriangle, Lock, FileSpreadsheet, ShieldOff } from 'lucide-react';

interface ImportExportDialogProps {
  mode: 'export' | 'import';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete?: () => void;
}

export function ImportExportDialog({ mode, open, onOpenChange, onImportComplete }: ImportExportDialogProps) {
  const { encryptionKey } = useAuthStore();
  const { entries, setEntries, addEntry } = useVaultStore();
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('json');
  const [importFormat, setImportFormat] = useState<'json' | 'csv'>('json');
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    if (!entries.length || !encryptionKey) return;
    setLoading(true);
    try {
      // Re-encrypt each entry's data for the export file
      const encryptedEntries = await Promise.all(
        entries.map(async (e) => {
          const { encryptedData, iv } = await encryptEntry(e.data, encryptionKey);
          return { encryptedData, iv };
        })
      );

      const exportData = {
        entries: encryptedEntries,
        entryCount: entries.length,
        exportedAt: new Date().toISOString(),
      };

      // Create and download file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vault-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Exported ${exportData.entryCount} entries as encrypted JSON`);
      localStorage.setItem('vault_last_export', Date.now().toString());
      onOpenChange(false);
    } catch {
      toast.error('Failed to export vault');
    } finally {
      setLoading(false);
    }
  };

  const handleCsvExport = () => {
    const headers = ['Platform', 'URL', 'Username', 'Email', 'Password', 'Category', 'Notes', 'Expiry Date', 'TOTP Secret', 'Favorite', 'Created', 'Updated', 'Tags'];
    const rows = entries.map(e => [
      e.data.platform,
      e.data.platformUrl,
      e.data.username,
      e.data.email,
      e.data.password,
      e.data.category,
      e.data.other,
      e.data.expiryDate,
      e.data.totpSecret || '',
      e.data.isFavorite ? 'Yes' : 'No',
      e.createdAt,
      e.updatedAt,
      e.data.tags || '',
    ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(','));

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vault-export-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${entries.length} entries as CSV`);
    localStorage.setItem('vault_last_export', Date.now().toString());
    onOpenChange(false);
  };

  const handleExportClick = () => {
    if (exportFormat === 'csv') {
      handleCsvExport();
    } else {
      handleExport();
    }
  };

  const handleImport = async () => {
    if (!encryptionKey || !selectedFile) return;
    setLoading(true);
    try {
      const text = await selectedFile.text();
      const data = JSON.parse(text);

      if (!data.entries || !Array.isArray(data.entries)) {
        throw new Error('Invalid vault file format');
      }

      // In replace mode, clear existing entries first
      if (importMode === 'replace') {
        const existingEntries = await getAllEntries();
        if (existingEntries.length > 0) {
          await deleteEntriesDB(existingEntries.map(e => e.id));
        }
        // Clear in-memory entries
        setEntries([]);
      }

      // Store entries directly in IndexedDB
      const storedEntries = data.entries.map((e: { encryptedData: string; iv: string }) => ({
        id: crypto.randomUUID(),
        encryptedData: e.encryptedData,
        iv: e.iv,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

      await saveEntries(storedEntries);

      // Reload vault entries (decrypt from IndexedDB)
      if (onImportComplete) {
        await onImportComplete();
      }

      toast.success(`Imported ${storedEntries.length} entries (${importMode} mode)`);
      onOpenChange(false);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to import vault');
    } finally {
      setLoading(false);
    }
  };

  const handleCsvImport = async () => {
    if (!encryptionKey || !selectedFile) return;

    setLoading(true);
    try {
      const text = await selectedFile.text();
      const parsed = parseCsv(text);
      if (parsed.length === 0) {
        throw new Error('No valid entries found in CSV file');
      }

      // In replace mode, clear existing entries first
      if (importMode === 'replace') {
        const existingEntries = await getAllEntries();
        if (existingEntries.length > 0) {
          await deleteEntriesDB(existingEntries.map(e => e.id));
        }
        setEntries([]);
      }

      const storedEntries: { id: string; encryptedData: string; iv: string; createdAt: string; updatedAt: string }[] = [];
      for (const row of parsed) {
        const entryData: VaultEntryData = {
          platform: row['Platform'] || '',
          platformUrl: row['URL'] || '',
          username: row['Username'] || '',
          email: row['Email'] || '',
          password: row['Password'] || '',
          category: row['Category'] || '',
          other: row['Notes'] || '',
          lastAccessed: new Date().toISOString(),
          isFavorite: (row['Favorite'] || '').toLowerCase() === 'yes',
          expiryDate: row['Expiry Date'] || '',
          totpSecret: row['TOTP Secret'] || '',
          passwordHistory: [],
          tags: row['Tags'] || '',
        };

        const { encryptedData, iv } = await encryptEntry(entryData, encryptionKey);
        storedEntries.push({
          id: crypto.randomUUID(),
          encryptedData,
          iv,
          createdAt: row['Created'] ? new Date(row['Created']).toISOString() : new Date().toISOString(),
          updatedAt: row['Updated'] ? new Date(row['Updated']).toISOString() : new Date().toISOString(),
        });
      }

      await saveEntries(storedEntries);

      // Reload vault entries
      if (onImportComplete) {
        await onImportComplete();
      }

      toast.success(`Imported ${storedEntries.length} entries from CSV (${importMode} mode)`);
      onOpenChange(false);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to import CSV');
    } finally {
      setLoading(false);
    }
  };

  const handleImportClick = () => {
    if (importFormat === 'csv') {
      handleCsvImport();
    } else {
      handleImport();
    }
  };

  const handleFileChange = (file: File | null) => {
    setSelectedFile(file);
    setImportFormat(file?.name.endsWith('.csv') ? 'csv' : 'json');
  };

  const getFileAccept = () => {
    if (importFormat === 'csv') return '.csv';
    if (importFormat === 'json') return '.json';
    return '.json,.csv';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    if (importFormat === 'csv' && file.name.endsWith('.csv')) {
      setSelectedFile(file);
    } else if (importFormat === 'json' && file.name.endsWith('.json')) {
      setSelectedFile(file);
    } else if (file.name.endsWith('.json') || file.name.endsWith('.csv')) {
      handleFileChange(file);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === 'export' ? (
              <FileDown className="h-5 w-5 text-primary" />
            ) : (
              <FileUp className="h-5 w-5 text-primary" />
            )}
            {mode === 'export' ? 'Export Vault' : 'Import Vault'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'export'
              ? 'Download your vault data. Choose between encrypted or plain text format.'
              : 'Import vault entries from a file. Supports encrypted JSON or plain CSV.'}
          </DialogDescription>
        </DialogHeader>

        {mode === 'export' ? (
          <div className="py-4 space-y-3">
            <div className="rounded-lg border border-border bg-muted/30 p-4 text-center space-y-2">
              <FileDown className="h-10 w-10 mx-auto text-primary" />
              <p className="text-sm text-muted-foreground">
                Your vault contains <strong className="text-foreground">{entries.length}</strong>{' '}
                encrypted {entries.length === 1 ? 'entry' : 'entries'}.
              </p>
            </div>

            {/* Export format selector */}
            <div className="space-y-2.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Format</Label>
              <RadioGroup
                value={exportFormat}
                onValueChange={(v) => setExportFormat(v as 'json' | 'csv')}
                className="gap-2"
              >
                <label
                  htmlFor="export-json"
                  className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                    exportFormat === 'json'
                      ? 'border-primary/50 bg-primary/5'
                      : 'border-border hover:border-primary/30 hover:bg-muted/30'
                  }`}
                >
                  <RadioGroupItem value="json" id="export-json" className="mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Lock className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Encrypted JSON</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Your data stays encrypted — only decryptable with your master password
                    </p>
                  </div>
                </label>

                <label
                  htmlFor="export-csv"
                  className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                    exportFormat === 'csv'
                      ? 'border-amber-500/50 bg-amber-500/5'
                      : 'border-border hover:border-amber-500/30 hover:bg-muted/30'
                  }`}
                >
                  <RadioGroupItem value="csv" id="export-csv" className="mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4 text-amber-500" />
                      <span className="text-sm font-medium">Plain CSV</span>
                      <Badge variant="outline" className="text-amber-500 border-amber-500/50 text-[10px] px-1.5 py-0">
                        <ShieldOff className="h-3 w-3 mr-0.5" />
                        Plaintext
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Readable spreadsheet format — passwords will be visible in plain text
                    </p>
                  </div>
                </label>
              </RadioGroup>
            </div>

            {/* CSV warning */}
            {exportFormat === 'csv' && (
              <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-200">
                  <strong>Warning:</strong> CSV export saves your passwords in plain text. Only use this if you understand the security implications.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="py-4 space-y-4">
            {/* Import format selector */}
            <div className="space-y-2.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">File Format</Label>
              <RadioGroup
                value={importFormat}
                onValueChange={(v) => {
                  setImportFormat(v as 'json' | 'csv');
                  setSelectedFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="gap-2"
              >
                <label
                  htmlFor="import-json"
                  className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                    importFormat === 'json'
                      ? 'border-primary/50 bg-primary/5'
                      : 'border-border hover:border-primary/30 hover:bg-muted/30'
                  }`}
                >
                  <RadioGroupItem value="json" id="import-json" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Lock className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Encrypted JSON</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Encrypted vault backup file (.json)
                    </p>
                  </div>
                </label>

                <label
                  htmlFor="import-csv"
                  className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                    importFormat === 'csv'
                      ? 'border-amber-500/50 bg-amber-500/5'
                      : 'border-border hover:border-amber-500/30 hover:bg-muted/30'
                  }`}
                >
                  <RadioGroupItem value="csv" id="import-csv" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4 text-amber-500" />
                      <span className="text-sm font-medium">Plain CSV</span>
                      <Badge variant="outline" className="text-amber-500 border-amber-500/50 text-[10px] px-1.5 py-0">
                        <ShieldOff className="h-3 w-3 mr-0.5" />
                        Plaintext
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Spreadsheet file — passwords will be encrypted on import (.csv)
                    </p>
                  </div>
                </label>
              </RadioGroup>
            </div>

            <div
              className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={getFileAccept()}
                className="hidden"
                onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
              />
              {selectedFile ? (
                <div className="space-y-1">
                  <FileUp className="h-8 w-8 mx-auto text-primary" />
                  <p className="text-sm font-medium">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <FileUp className="h-8 w-8 mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Click to select or drag & drop a {importFormat === 'csv' ? 'CSV' : 'JSON'} file
                  </p>
                </div>
              )}
            </div>

            {/* CSV import warning */}
            {importFormat === 'csv' && (
              <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-200">
                  <strong>Info:</strong> CSV entries will be encrypted with your master password before being stored. Make sure the CSV file is deleted after import.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Import Mode</Label>
              <Select value={importMode} onValueChange={(v) => setImportMode(v as 'merge' | 'replace')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="merge">Merge — Add to existing entries</SelectItem>
                  <SelectItem value="replace">Replace — Overwrite all entries</SelectItem>
                </SelectContent>
              </Select>
              {importMode === 'replace' && (
                <div className="flex items-start gap-2 text-destructive text-xs bg-destructive/10 rounded-md p-2.5">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>
                    Replace mode will delete all your current entries. This action cannot be undone.
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={mode === 'export' ? handleExportClick : handleImportClick}
            disabled={
              loading ||
              (mode === 'import' && !selectedFile) ||
              (mode === 'export' && entries.length === 0)
            }
            className="min-w-[100px]"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : mode === 'export' ? (
              <FileDown className="h-4 w-4 mr-2" />
            ) : (
              <FileUp className="h-4 w-4 mr-2" />
            )}
            {mode === 'export'
              ? `Export ${exportFormat === 'csv' ? 'CSV' : 'JSON'}`
              : `Import ${importFormat === 'csv' ? 'CSV' : 'JSON'}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Parse a CSV string into an array of objects keyed by header names.
 * Handles quoted fields with escaped double-quotes per RFC 4180.
 */
function parseCsv(csvText: string): Record<string, string>[] {
  const lines: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const ch = csvText[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < csvText.length && csvText[i + 1] === '"') {
          current += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        lines.push(current);
        current = '';
      } else if (ch === '\n') {
        lines.push(current);
        current = '';
        lines.push('\n'); // newline marker
      } else if (ch === '\r') {
        // skip \r
      } else {
        current += ch;
      }
    }
  }
  lines.push(current); // last field

  // Split into rows
  const rows: string[][] = [];
  let row: string[] = [];
  for (const line of lines) {
    if (line === '\n') {
      rows.push(row);
      row = [];
    } else {
      row.push(line);
    }
  }
  if (row.length > 0) rows.push(row);

  if (rows.length < 2) return [];

  const headers = rows[0];
  const result: Record<string, string>[] = [];

  for (let i = 1; i < rows.length; i++) {
    const obj: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j].trim()] = (rows[i][j] ?? '').trim();
    }
    // Skip completely empty rows
    if (Object.values(obj).some(v => v !== '')) {
      result.push(obj);
    }
  }

  return result;
}