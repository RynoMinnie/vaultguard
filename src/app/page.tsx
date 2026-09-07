'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore, useVaultStore, useTimeoutStore, setTimeoutLogoutCallback, type DecryptedEntry } from '@/store';
import {
  hashPassword,
  generateSalt,
  deriveEncryptionKey,
  decryptEntry,
  encryptEntry,
} from '@/lib/crypto';
import type { VaultEntryData } from '@/lib/crypto';
import {
  vaultExists as checkVaultExists,
  getVaultCredentials,
  createVault as createVaultDB,
  getAllEntries,
  saveEntry as saveEntryDB,
  updateEntry as updateEntryDB,
  deleteEntry as deleteEntryDB,
  deleteEntries as deleteEntriesDB,
} from '@/lib/db-local';
import { VaultHeader } from '@/components/vault/vault-header';
import { EntryCard } from '@/components/vault/entry-card';
import { EntryRow } from '@/components/vault/entry-row';
import { EntryFormDialog } from '@/components/vault/entry-form-dialog';
import { PasswordGenerator } from '@/components/vault/password-generator';
import { PasswordStrengthMeter } from '@/components/vault/password-strength-meter';
import { InactivityWarning } from '@/components/vault/inactivity-warning';
import { ImportExportDialog } from '@/components/vault/import-export-dialog';
import { ChangePasswordDialog } from '@/components/vault/change-password-dialog';
import { CategoryTag, type CategoryId, CATEGORIES } from '@/components/vault/category-tag';
import { EntryDetailSheet } from '@/components/vault/entry-detail-sheet';
import { StatsOverview } from '@/components/vault/stats-overview';
import { ThemeToggle } from '@/components/vault/theme-toggle';
import { ErrorBoundary } from '@/components/error-boundary';
import { usePWA } from '@/hooks/use-pwa';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import {
  Shield,
  LogOut,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  Vault as VaultIcon,
  KeyRound,
  ChevronRight,
  Clock,
  Sparkles,
  Fingerprint,
  Trash2,
  Check,
  CheckSquare,
  Circle,
  Square,
  Download,
  Wand2,
  HardDriveDownload,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const APP_VERSION = 'v1.1.0';

// =============== AUTH SCREEN ===============
function AuthScreen({ hasVault }: { hasVault: boolean }) {
  const [vaultName, setVaultName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirm, setShowRegConfirm] = useState(false);
  const { login } = useAuthStore();
  const { setEntries } = useVaultStore();
  const [authenticating, setAuthenticating] = useState(false);
  const [storedVaultName, setStoredVaultName] = useState<string | null>(null);

  useEffect(() => {
    if (hasVault) {
      getVaultCredentials().then(c => c && setStoredVaultName(c.name)).catch(() => {});
    }
  }, [hasVault]);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      toast.error('Please enter your master password');
      return;
    }

    setLoading(true);
    setAuthenticating(true);
    try {
      const credentials = await getVaultCredentials();
      if (!credentials) {
        toast.error('No vault found. Please create one first.');
        setLoading(false);
        setAuthenticating(false);
        return;
      }

      const passwordHash = await hashPassword(password, credentials.salt);
      if (passwordHash !== credentials.passwordHash) {
        toast.error('Incorrect password');
        setLoading(false);
        setAuthenticating(false);
        return;
      }

      const key = await deriveEncryptionKey(password, credentials.encryptionSalt);

      // Load and decrypt all entries
      const storedEntries = await getAllEntries();
      const decrypted: DecryptedEntry[] = [];
      for (const entry of storedEntries) {
        const data = await decryptEntry(entry.encryptedData, entry.iv, key);
        decrypted.push({
          id: entry.id,
          data,
          createdAt: entry.createdAt,
          updatedAt: entry.updatedAt,
        });
      }

      await new Promise((r) => setTimeout(r, 300));
      login('local', 'local', credentials.name, key, credentials.encryptionSalt);
      setEntries(decrypted);
      toast.success('Vault unlocked');
      setPassword('');
    } catch (err) {
      toast.error('Failed to unlock vault');
      setAuthenticating(false);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVault = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vaultName.trim() || !regPassword || !regConfirm) {
      toast.error('Please fill in all fields');
      return;
    }
    if (regPassword !== regConfirm) {
      toast.error('Passwords do not match');
      return;
    }
    if (regPassword.length < 8) {
      toast.error('Master password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      const salt = generateSalt();
      const encryptionSalt = generateSalt();
      const passwordHash = await hashPassword(regPassword, salt);
      const key = await deriveEncryptionKey(regPassword, encryptionSalt);

      await createVaultDB({
        name: vaultName.trim() || 'My Vault',
        passwordHash,
        salt,
        encryptionSalt,
      });

      setAuthenticating(true);
      await new Promise((r) => setTimeout(r, 300));
      login('local', 'local', vaultName.trim() || 'My Vault', key, encryptionSalt);
      toast.success('Vault created successfully');
      setVaultName('');
      setRegPassword('');
      setRegConfirm('');
    } catch (err) {
      toast.error('Failed to create vault');
      setAuthenticating(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 vault-bg vault-bg-mesh">
      {/* Animated background orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-primary/5 rounded-full blur-3xl float-animate" />
        <div className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-teal/5 rounded-full blur-3xl float-animate" style={{ animationDelay: '-3s' }} />
      </div>

      <Card className="w-full max-w-md border-border/40 bg-card/70 backdrop-blur-2xl gradient-border noise-bg relative z-10 animate-fade-in">
        <div className="absolute top-4 right-4 z-20">
          <ThemeToggle />
        </div>
        <CardContent className="p-6 sm:p-8">
          {/* Logo with animated lock */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/20 to-teal/10 mb-5 breathe-glow relative overflow-hidden">
              <div className="absolute inset-0 shimmer opacity-30" />
              <VaultIcon className="h-9 w-9 text-primary relative z-10 lock-icon-animate" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent">
              {hasVault ? (storedVaultName || 'Password Vault') : 'Create Your Vault'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1.5 flex items-center justify-center gap-1.5">
              <Fingerprint className="h-3.5 w-3.5 text-primary/60" />
              {hasVault ? 'Enter your master password to unlock' : 'Zero-knowledge encrypted password manager'}
            </p>
            <p className="text-[10px] text-muted-foreground/40 mt-1 font-mono">{APP_VERSION}</p>
          </div>

          {hasVault ? (
            <form onSubmit={handleUnlock} className="space-y-4 animate-fade-in">
              {storedVaultName && (
                <div className="space-y-2">
                  <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Vault
                  </Label>
                  <div className="flex items-center gap-2.5 h-11 px-3 rounded-md border border-border/50 bg-muted/30">
                    <VaultIcon className="h-4 w-4 text-primary/60" />
                    <span className="text-sm font-medium">{storedVaultName}</span>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="unlock-password" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Master Password
                </Label>
                <div className="input-group relative">
                  <Input
                    id="unlock-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your master password"
                    autoComplete="current-password"
                    autoFocus
                    className="h-11"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="toggle-btn h-10 w-10 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <Button type="submit" className="w-full h-11 shadow-lg shadow-primary/20" disabled={loading || !password}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Lock className="h-4 w-4 mr-2" />
                )}
                Unlock Vault
              </Button>

              {/* Local-only note */}
              <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-muted/30 border border-border/30 p-3.5">
                <Shield className="h-4 w-4 text-primary/70 shrink-0 mt-0.5" />
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Your data stays on this device. All encryption and decryption happens
                  locally in your browser using <span className="text-primary/80 font-medium">AES-256-GCM</span>.
                </p>
              </div>
            </form>
          ) : (
            <form onSubmit={handleCreateVault} className="space-y-4 animate-fade-in">
              <div className="space-y-2">
                <Label htmlFor="vault-name" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Vault Name
                </Label>
                <div className="input-group relative">
                  <Input
                    id="vault-name"
                    value={vaultName}
                    onChange={(e) => setVaultName(e.target.value)}
                    placeholder="My Vault"
                    autoComplete="organization"
                    autoFocus
                    className="h-11"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-password" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Master Password
                </Label>
                <div className="input-group relative">
                  <Input
                    id="reg-password"
                    type={showRegPassword ? 'text' : 'password'}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    autoComplete="new-password"
                    className="h-11"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="toggle-btn h-10 w-10 hover:bg-transparent"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                  >
                    {showRegPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {regPassword.length > 0 && (
                  <div className="space-y-1.5 mt-2">
                    {[
                      { label: 'Minimum 8 characters', met: regPassword.length >= 8 },
                      { label: 'Contains uppercase', met: /[A-Z]/.test(regPassword) },
                      { label: 'Contains number', met: /[0-9]/.test(regPassword) },
                      { label: 'Contains symbol', met: /[^A-Za-z0-9]/.test(regPassword) },
                    ].map((req) => (
                      <div key={req.label} className="req-check-item flex items-center gap-2 text-[11px]">
                        {req.met ? (
                          <Check className="h-3 w-3 text-emerald-400" />
                        ) : (
                          <Circle className="h-3 w-3 text-muted-foreground/30" />
                        )}
                        <span className={req.met ? 'text-emerald-400/80' : 'text-muted-foreground/50'}>{req.label}</span>
                      </div>
                    ))}
                  </div>
                )}
                <PasswordStrengthMeter password={regPassword} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-confirm" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Confirm Master Password
                </Label>
                <div className="input-group relative">
                  <Input
                    id="reg-confirm"
                    type={showRegConfirm ? 'text' : 'password'}
                    value={regConfirm}
                    onChange={(e) => setRegConfirm(e.target.value)}
                    placeholder="Re-enter your master password"
                    autoComplete="new-password"
                    className={cn(
                      'h-11 transition-colors',
                      regConfirm && regPassword !== regConfirm && 'border-destructive focus-visible:ring-destructive/30'
                    )}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="toggle-btn h-10 w-10 hover:bg-transparent"
                    onClick={() => setShowRegConfirm(!showRegConfirm)}
                  >
                    {showRegConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {regConfirm && regPassword !== regConfirm && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <span>Passwords do not match</span>
                  </p>
                )}
              </div>
              <PasswordGenerator value={regPassword} onChange={setRegPassword} />
              <Button
                type="submit"
                className="w-full h-11 shadow-lg shadow-primary/20"
                disabled={loading || !vaultName.trim() || !regPassword || !regConfirm}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Shield className="h-4 w-4 mr-2" />
                )}
                Create Vault
              </Button>

              {/* Security note */}
              <div className="mt-6 flex items-start gap-2.5 rounded-xl bg-muted/30 border border-border/30 p-3.5">
                <Shield className="h-4 w-4 text-primary/70 shrink-0 mt-0.5" />
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Your master password never leaves this device. All encryption and decryption happens
                  locally in your browser using <span className="text-primary/80 font-medium">AES-256-GCM</span>.
                </p>
              </div>
              <a
                href="privacy/"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 text-[10px] text-muted-foreground/50 hover:text-emerald-400 transition-colors duration-200 mx-auto"
              >
                Privacy Policy
              </a>
            </form>
          )}

          {/* Authenticating overlay */}
          {authenticating && (
            <div className="absolute inset-0 rounded-[inherit] bg-card/90 backdrop-blur-sm flex flex-col items-center justify-center z-20 animate-fade-in">
              <VaultIcon className="h-10 w-10 text-primary auth-loading-icon" />
              <p className="text-sm text-muted-foreground mt-3">{hasVault ? 'Unlocking vault...' : 'Creating vault...'}</p>
            </div>
          )}
        </CardContent>
      </Card>
      <p className="mt-4 flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground/40">
        <Lock className="h-3 w-3 shrink-0" />
        <span>AES-256-GCM encrypted</span>
      </p>
    </div>
  );
}

// =============== RECENTLY USED SECTION ===============
function RecentlyUsedSection() {
  const { getRecentEntries } = useVaultStore();
  const recent = getRecentEntries();

  if (recent.length === 0) return null;

  return (
    <div className="mb-6 -mx-3 sm:-mx-4 md:-mx-6">
      <div className="flex items-center gap-2 mb-3 px-3 sm:px-4 md:px-6">
        <Clock className="h-4 w-4 text-primary/60" />
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recently Accessed</h2>
      </div>
      <div className="flex gap-2 overflow-x-auto scrollbar-none px-3 sm:px-4 md:px-6">
        {recent.map((entry, i) => {
          const cat = entry.data.category;
          const catColor = cat ? CATEGORIES.find(c => c.id === cat)?.color.split(' ')[0] : '';
          return (
            <button
              key={entry.id}
              className="group flex items-center gap-2.5 rounded-lg bg-muted/30 hover:bg-muted/60 border border-border/30 hover:border-primary/20 px-3 py-2.5 text-left transition-all duration-200 hover:emerald-glow-sm hover:scale-[1.02] animate-slide-up shrink-0 w-36 sm:w-auto"
              style={{ animationDelay: `${i * 0.05}s`, borderLeftWidth: '3px', borderLeftColor: catColor ? undefined : 'transparent' }}
            >
              <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                <Sparkles className="h-3.5 w-3.5 text-primary/70" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium truncate">{entry.data.platform}</p>
                <p className="text-[10px] text-muted-foreground/60 truncate">
                  {formatDistanceToNow(new Date(entry.data.lastAccessed), { addSuffix: true })}
                </p>
              </div>
            </button>
          );
        })}
      </div>
      <Separator className="mt-4 opacity-40" />
    </div>
  );
}

// =============== VAULT SCREEN ===============
function VaultScreen() {
  const { encryptionKey, username, logout } = useAuthStore();
  const { entries, isLoading, setLoading, setEntries, addEntry, updateEntry, removeEntry, removeEntries, getFilteredAndSorted, viewMode, searchQuery, selectedIds, toggleSelect, toggleSelectAll, clearSelection } =
    useVaultStore();

  const [formOpen, setFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<DecryptedEntry | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [changePwOpen, setChangePwOpen] = useState(false);
  const [detailEntry, setDetailEntry] = useState<DecryptedEntry | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const versionInfo = APP_VERSION;
  const [showBackupReminder, setShowBackupReminder] = useState(false);
  const [daysSinceBackup, setDaysSinceBackup] = useState<number>(0);

  const reloadEntries = useCallback(async () => {
    if (!encryptionKey) return;
    setLoading(true);
    try {
      const storedEntries = await getAllEntries();
      const decrypted: DecryptedEntry[] = [];
      for (const e of storedEntries) {
        try {
          const data = await decryptEntry(e.encryptedData, e.iv, encryptionKey);
          decrypted.push({ id: e.id, data, createdAt: e.createdAt, updatedAt: e.updatedAt });
        } catch {
          console.warn('Failed to decrypt entry:', e.id);
        }
      }
      setEntries(decrypted);
    } catch {
      toast.error('Failed to load vault entries');
    } finally {
      setLoading(false);
    }
  }, [encryptionKey, setLoading, setEntries]);

  useEffect(() => {
    reloadEntries();
  }, [reloadEntries]);

  useEffect(() => {
    if (entries.length === 0) return;
    const lastExport = localStorage.getItem('vault_last_export');
    if (!lastExport) {
      setDaysSinceBackup(Infinity);
      setShowBackupReminder(true);
      return;
    }
    const days = (Date.now() - parseInt(lastExport)) / (1000 * 60 * 60 * 24);
    setDaysSinceBackup(Math.floor(days));
    setShowBackupReminder(days >= 7);
  }, [entries.length]);

  const handleLogout = () => {
    logout();
    useTimeoutStore.getState().reset();
    setEntries([]);
    clearSelection();
    toast.info('Vault locked');
  };

  const handleAddEntry = () => {
    setEditingEntry(null);
    setFormOpen(true);
  };

  const handleEditEntry = (entry: DecryptedEntry) => {
    setEditingEntry(entry);
    setFormOpen(true);
  };

  const handleDuplicateEntry = (entry: DecryptedEntry) => {
    const dupData: VaultEntryData = {
      ...entry.data,
      platform: entry.data.platform + ' (Copy)',
      lastAccessed: '',
      isFavorite: false,
      expiryDate: entry.data.expiryDate,
    };
    const dup: DecryptedEntry = {
      id: '',
      data: dupData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setEditingEntry(dup);
    setFormOpen(true);
  };

  const handleViewEntry = (entry: DecryptedEntry) => {
    setDetailEntry(entry);
    setDetailOpen(true);
  };

  const handleSaved = async (entry: DecryptedEntry) => {
    if (!encryptionKey) return;
    try {
      const { encryptedData, iv } = await encryptEntry(entry.data, encryptionKey);
      await saveEntryDB({
        id: entry.id,
        encryptedData,
        iv,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
      });
      addEntry(entry);
      toast.success('Entry created successfully');
    } catch {
      toast.error('Failed to save entry');
    }
  };

  const handleUpdated = async (entry: DecryptedEntry) => {
    if (!encryptionKey) return;
    try {
      const { encryptedData, iv } = await encryptEntry(entry.data, encryptionKey);
      await updateEntryDB(entry.id, encryptedData, iv);
      updateEntry(entry.id, entry);
      toast.success('Entry updated successfully');
    } catch {
      toast.error('Failed to update entry');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteEntryDB(id);
      removeEntry(id);
      toast.success('Entry deleted');
    } catch {
      toast.error('Failed to delete entry');
    }
  };

  const filteredEntries = getFilteredAndSorted();
  const hasSelection = selectedIds.size > 0;
  const selectedCount = selectedIds.size;
  const allSelected = filteredEntries.length > 0 && filteredEntries.every((e) => selectedIds.has(e.id));

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    try {
      await deleteEntriesDB(ids);
      removeEntries(ids);
      toast.success(`Deleted ${ids.length} entries`);
      clearSelection();
    } catch {
      toast.error('Failed to delete some entries');
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col vault-bg vault-bg-mesh screen-transition"
      onMouseMove={useTimeoutStore.getState().resetTimer}
      onKeyDown={useTimeoutStore.getState().resetTimer}
      onWheel={useTimeoutStore.getState().resetTimer}
      onClick={useTimeoutStore.getState().resetTimer}
    >
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/40 glass-strong header-glow-line">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
              <VaultIcon className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-semibold leading-none tracking-tight">Password Vault</h1>
              <p className="text-[10px] text-muted-foreground font-mono">{versionInfo}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
              <div className="h-5 w-px bg-border/50" />
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-xs font-semibold text-primary">{username?.charAt(0).toUpperCase()}</span>
              </div>
              <span className="text-xs">{username}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-destructive h-8">
              <LogOut className="h-3.5 w-3.5 mr-1.5" />
              <span className="hidden sm:inline text-xs">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-3 sm:px-4 md:px-6 py-4 sm:py-6">
        <StatsOverview />
        {entries.length > 0 && showBackupReminder && (
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 animate-fade-in mb-4">
            <div className="h-8 w-8 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
              <HardDriveDownload className="h-4 w-4 text-amber-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-amber-500/90">Backup recommended</p>
              <p className="text-xs text-muted-foreground/60">You haven't exported your vault in {daysSinceBackup === Infinity ? 'over 7' : daysSinceBackup} days</p>
            </div>
            <Button variant="outline" size="sm" className="shrink-0 text-xs h-7 border-amber-500/30 hover:bg-amber-500/10" onClick={() => setExportOpen(true)}>
              Export Now
            </Button>
            <Button variant="ghost" size="sm" className="shrink-0 h-7 w-7 p-0 text-muted-foreground/50 hover:text-muted-foreground" onClick={() => setShowBackupReminder(false)}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
        <VaultHeader
          onAddEntry={handleAddEntry}
          onExport={() => setExportOpen(true)}
          onImport={() => setImportOpen(true)}
          onChangePassword={() => setChangePwOpen(true)}
        />


        {/* Bulk actions bar */}
        {hasSelection && (
          <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center gap-2 p-2.5 sm:p-3 border-t border-primary/20 bg-primary/5 glass-strong bulk-bar sm:rounded-xl sm:static sm:border sm:border-primary/20 pb-[calc(0.625rem+env(safe-area-inset-bottom))] sm:pb-2.5">
            <div className="flex items-center gap-1.5 text-sm">
              <button
                onClick={() => toggleSelectAll(filteredEntries.map((e) => e.id))}
                className="h-5 w-5 flex items-center justify-center"
                title={allSelected ? 'Deselect all' : 'Select all'}
              >
                {allSelected ? (
                  <CheckSquare className="h-5 w-5 text-primary" />
                ) : (
                  <Square className="h-5 w-5 text-muted-foreground/50" />
                )}
              </button>
              <span className="text-primary font-medium">
                {selectedCount} selected
              </span>
            </div>
            <div className="flex-1" />
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkDelete}
              className="h-8 gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="text-xs">Delete Selected</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSelection}
              className="h-8 text-xs text-muted-foreground hover:text-foreground"
            >
              Cancel
            </Button>
          </div>
        )}
        {hasSelection && <div className="h-14 sm:h-0" />}
        <div className="mt-6">
          {isLoading ? (
            <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-2'}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-3 rounded-xl border border-border/30 p-4">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-8 w-8 rounded-lg skeleton-shimmer" />
                    <Skeleton className="h-4 w-2/5 skeleton-shimmer" />
                  </div>
                  <Skeleton className="h-8 w-full rounded-md skeleton-shimmer" />
                  <Skeleton className="h-8 w-full rounded-md skeleton-shimmer" />
                  <Skeleton className="h-8 w-3/4 rounded-md skeleton-shimmer" />
                  <Skeleton className="h-3 w-1/2 skeleton-shimmer" />
                </div>
              ))}
            </div>
          ) : filteredEntries.length === 0 && !searchQuery ? (
            <div className="flex flex-col items-center justify-center py-12 text-center animate-fade-in">
              {/* Welcome message */}
              <div className="text-center mb-8 animate-fade-in">
                <h2 className="text-xl font-semibold mb-1">Welcome to your Vault</h2>
                <p className="text-sm text-muted-foreground/60">Get started by adding your first password, or try these quick actions:</p>
              </div>

              {/* Quick-action cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-2xl mb-10">
                <button
                  onClick={handleAddEntry}
                  className="flex flex-col items-center gap-3 p-5 rounded-xl bg-muted/20 border border-border/30 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all duration-200 hover:scale-[1.02] group text-left"
                >
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/15 flex items-center justify-center group-hover:bg-emerald-500/25 transition-colors">
                    <KeyRound className="h-5 w-5 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Add Password</p>
                    <p className="text-xs text-muted-foreground/60 mt-0.5">Store a login credential</p>
                  </div>
                </button>

                <button
                  onClick={() => setImportOpen(true)}
                  className="flex flex-col items-center gap-3 p-5 rounded-xl bg-muted/20 border border-border/30 hover:border-teal-500/30 hover:bg-teal-500/5 transition-all duration-200 hover:scale-[1.02] group text-left"
                >
                  <div className="h-10 w-10 rounded-xl bg-teal-500/15 flex items-center justify-center group-hover:bg-teal-500/25 transition-colors">
                    <Download className="h-5 w-5 text-teal-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Import Data</p>
                    <p className="text-xs text-muted-foreground/60 mt-0.5">Import from another manager</p>
                  </div>
                </button>

                <button
                  onClick={handleAddEntry}
                  className="flex flex-col items-center gap-3 p-5 rounded-xl bg-muted/20 border border-border/30 hover:border-amber-500/30 hover:bg-amber-500/5 transition-all duration-200 hover:scale-[1.02] group text-left"
                >
                  <div className="h-10 w-10 rounded-xl bg-amber-500/15 flex items-center justify-center group-hover:bg-amber-500/25 transition-colors">
                    <Wand2 className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Generate Password</p>
                    <p className="text-xs text-muted-foreground/60 mt-0.5">Create a strong password</p>
                  </div>
                </button>
              </div>

              {/* Vault icon + encryption note + CTA */}
              <div className="relative mb-6">
                <div className="w-24 h-24 rounded-3xl bg-muted/30 flex items-center justify-center float-animate empty-pulse-ring">
                  <VaultIcon className="h-12 w-12 text-muted-foreground/20" />
                </div>
                <div className="absolute -inset-4 rounded-[2rem] bg-primary/5 blur-xl -z-10" />
              </div>
              <p className="text-[10px] text-muted-foreground/30 flex items-center gap-1">
                <Shield className="h-3 w-3" />
                All passwords encrypted with AES-256-GCM
              </p>
              <Button onClick={handleAddEntry} className="mt-5 btn-gradient-primary">
                <Sparkles className="h-4 w-4 mr-2" />
                Add Your First Entry
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-in">
              <h3 className="text-lg font-medium text-muted-foreground">No results found</h3>
              <p className="text-sm text-muted-foreground/50 mt-2 max-w-sm">
                No entries match &ldquo;<span className="text-primary/70">{searchQuery}</span>&rdquo;. Try a different search term.
              </p>
            </div>
          ) : (
            <>
              {viewMode === 'grid' && <RecentlyUsedSection />}

              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 stagger-children">
                  {filteredEntries.map((entry) => (
                    <EntryCard key={entry.id} entry={entry} onEdit={handleEditEntry} onDuplicate={handleDuplicateEntry} onDelete={handleDelete} onView={handleViewEntry} />
                  ))}
                </div>
              ) : (
                <div className="space-y-1.5 overflow-x-auto">
                  <div className="flex items-center gap-3 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50 border-b border-border/30 mb-1 min-w-[500px]">
                    <div className="flex-1">Platform</div>
                    <div className="hidden md:block w-36">Username</div>
                    <div className="hidden lg:block w-44">Email</div>
                    <div className="w-48">Password</div>
                    <div className="hidden sm:block w-24 text-right">Modified</div>
                    <div className="w-16" />
                  </div>
                  {filteredEntries.map((entry) => (
                    <EntryRow key={entry.id} entry={entry} onEdit={handleEditEntry} onDelete={handleDelete} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="footer-gradient-border mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5">
              <span className="session-dot" />
              <span>Session active</span>
            </span>
            <span className="hidden sm:inline text-muted-foreground/30">·</span>
            <span>Password Vault {versionInfo} — Local-Only Encryption</span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <a
              href="privacy/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-emerald-400 transition-colors duration-200"
            >
              Privacy Policy
            </a>
            <span className="hidden md:flex items-center gap-1 text-muted-foreground/60">
              ⌘K Search · ⌘N New · Esc Clear
            </span>
            <span className="flex items-center gap-1">
              <Shield className="h-3 w-3" />
              AES-256-GCM · PBKDF2
            </span>
          </div>
        </div>
      </footer>

      {/* Dialogs */}
      <EntryFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingEntry(null);
        }}
        entry={editingEntry}
        onSaved={handleSaved}
        onUpdated={handleUpdated}
      />
      <ImportExportDialog mode="export" open={exportOpen} onOpenChange={setExportOpen} />
      <ImportExportDialog mode="import" open={importOpen} onOpenChange={setImportOpen} onImportComplete={reloadEntries} />
      <ChangePasswordDialog open={changePwOpen} onOpenChange={setChangePwOpen} />
      <EntryDetailSheet
        entry={detailEntry}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onEdit={handleEditEntry}
        onDuplicate={handleDuplicateEntry}
        onDelete={handleDelete}
      />
      <InactivityWarning />
    </div>
  );
}

// =============== MAIN APP ===============
export default function HomePage() {
  // usePWA removed — service worker now registered in layout.tsx via <script> tag
  const { isAuthenticated } = useAuthStore();
  const [hasVault, setHasVault] = useState<boolean | null>(null); // null = checking

  // Check vault existence on mount and whenever user logs out
  useEffect(() => {
    if (!isAuthenticated) {
      checkVaultExists().then(setHasVault).catch(() => setHasVault(false));
    }
  }, [isAuthenticated]);

  // Activity tracking + timeout
  useEffect(() => {
    if (!isAuthenticated) return;

    const TIMEOUT_MS = 5 * 60 * 1000;
    const WARNING_MS = 4 * 60 * 1000;
    const COUNTDOWN_INTERVAL = 1000;

    let countdownId: ReturnType<typeof setInterval> | undefined;

    let lastActivity = Date.now();
    let warningTriggered = false;

    const reset = () => {
      lastActivity = Date.now();
      warningTriggered = false;
      useTimeoutStore.getState().resetTimer();
    };

    const onActivity = () => {
      if (useTimeoutStore.getState().isWarning) {
        reset();
        return;
      }
      lastActivity = Date.now();
    };

    window.addEventListener('mousemove', onActivity);
    window.addEventListener('keydown', onActivity);
    window.addEventListener('scroll', onActivity);
    window.addEventListener('click', onActivity);
    window.addEventListener('touchstart', onActivity);

    const checkInterval = setInterval(() => {
      const elapsed = Date.now() - lastActivity;

      if (elapsed >= TIMEOUT_MS) {
        clearInterval(checkInterval);
        if (countdownId) clearInterval(countdownId);
        handleAutoLogout();
        return;
      }

      if (elapsed >= WARNING_MS && !warningTriggered) {
        warningTriggered = true;
        useTimeoutStore.getState().startWarning();
        const remaining = Math.ceil((TIMEOUT_MS - elapsed) / 1000);
        useTimeoutStore.setState({ countdown: remaining });

        countdownId = setInterval(() => {
          const { isWarning: stillWarning, countdown: current } = useTimeoutStore.getState();
          if (!stillWarning) {
            clearInterval(countdownId);
            return;
          }
          if (current <= 1) {
            clearInterval(countdownId);
            handleAutoLogout();
          } else {
            useTimeoutStore.setState({ countdown: current - 1 });
          }
        }, COUNTDOWN_INTERVAL);
      }
    }, 1000);

    const handleAutoLogout = () => {
      useAuthStore.getState().logout();
      useVaultStore.getState().setEntries([]);
      useTimeoutStore.getState().reset();
      toast.info('Vault locked due to inactivity');
    };

    return () => {
      clearInterval(checkInterval);
      if (countdownId) clearInterval(countdownId);
      window.removeEventListener('mousemove', onActivity);
      window.removeEventListener('keydown', onActivity);
      window.removeEventListener('scroll', onActivity);
      window.removeEventListener('click', onActivity);
      window.removeEventListener('touchstart', onActivity);
    };
  }, [isAuthenticated]);

  useEffect(() => {
    setTimeoutLogoutCallback(() => {
      useAuthStore.getState().logout();
      useVaultStore.getState().setEntries([]);
      useTimeoutStore.getState().reset();
      toast.info('Vault locked due to inactivity');
    });
  }, []);

  if (isAuthenticated) {
    return (
      <ErrorBoundary>
        <div key="vault" className="screen-transition">
          <VaultScreen />
        </div>
      </ErrorBoundary>
    );
  }

  if (hasVault === null) {
    // Brief loading state while checking IndexedDB
    return (
      <div className="min-h-screen flex items-center justify-center vault-bg">
        <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div key="auth" className="screen-transition">
        <AuthScreen hasVault={hasVault} />
      </div>
    </ErrorBoundary>
  );
}