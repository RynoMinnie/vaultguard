'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Copy, Check, RefreshCw, Shuffle, Zap, KeyRound, Hash, Wand2 } from 'lucide-react';
import { generatePassword } from '@/lib/crypto';
import { copyWithAutoClear } from '@/hooks/use-clipboard-auto-clear';
import { cn } from '@/lib/utils';

interface PasswordGeneratorProps {
  value: string;
  onChange: (password: string) => void;
}

const PRESETS = [
  {
    id: 'strong',
    label: 'Strong',
    description: '16 chars, all types',
    icon: Zap,
    options: { length: 16, uppercase: true, lowercase: true, numbers: true, symbols: true },
  },
  {
    id: 'passphrase',
    label: 'Passphrase',
    description: '20 chars, no symbols',
    icon: KeyRound,
    options: { length: 20, uppercase: true, lowercase: true, numbers: true, symbols: false },
  },
  {
    id: 'pin',
    label: 'PIN',
    description: '6 digits only',
    icon: Hash,
    options: { length: 6, uppercase: false, lowercase: false, numbers: true, symbols: false },
  },
  {
    id: 'memorable',
    label: 'Memorable',
    description: '12 chars, mixed case + numbers',
    icon: Wand2,
    options: { length: 12, uppercase: true, lowercase: true, numbers: true, symbols: false },
  },
];

export function PasswordGenerator({ value, onChange }: PasswordGeneratorProps) {
  const [length, setLength] = useState(16);
  const [uppercase, setUppercase] = useState(true);
  const [lowercase, setLowercase] = useState(true);
  const [numbers, setNumbers] = useState(true);
  const [symbols, setSymbols] = useState(true);
  const [copied, setCopied] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const applyPreset = useCallback((presetId: string) => {
    const preset = PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    const { options } = preset;
    setLength(options.length);
    setUppercase(options.uppercase);
    setLowercase(options.lowercase);
    setNumbers(options.numbers);
    setSymbols(options.symbols);
    setActivePreset(presetId);
    const pw = generatePassword(options);
    onChange(pw);
  }, [onChange]);

  const generate = useCallback(() => {
    const pw = generatePassword({ length, uppercase, lowercase, numbers, symbols });
    onChange(pw);
    setActivePreset(null);
    return pw;
  }, [length, uppercase, lowercase, numbers, symbols, onChange]);

  const copyToClipboard = async (text?: string) => {
    const toCopy = text || value;
    if (!toCopy) return;
    setCopied(true);
    await copyWithAutoClear(toCopy, 'Password');
    setTimeout(() => setCopied(false), 2000);
  };

  const isCustom = !activePreset;

  return (
    <div className="space-y-4 rounded-xl border border-border/50 bg-muted/20 p-4">
      {/* Header with presets */}
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Shuffle className="h-4 w-4 text-primary/70" />
          Password Generator
        </Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            const pw = generate();
            if (pw) copyToClipboard(pw);
          }}
          className="h-7 text-xs text-primary hover:text-primary/80"
        >
          Generate & Copy
        </Button>
      </div>

      {/* Preset buttons */}
      <div className="flex gap-1.5 flex-wrap">
        {PRESETS.map((preset) => {
          const Icon = preset.icon;
          const isActive = activePreset === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPreset(preset.id)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all duration-200',
                isActive
                  ? 'border-primary/30 bg-primary/10 text-primary shadow-sm shadow-primary/10'
                  : 'border-border/50 text-muted-foreground hover:text-foreground hover:border-border hover:bg-muted/40'
              )}
            >
              <Icon className={cn('h-3.5 w-3.5', isActive && 'text-primary')} />
              <span>{preset.label}</span>
            </button>
          );
        })}
      </div>

      {/* Password input */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Click generate or type..."
            className="font-mono text-sm pr-10 h-9"
          />
          {isCustom && value && (
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-muted-foreground/50 font-medium uppercase tracking-wider">
              Custom
            </span>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={generate}
          className="shrink-0 h-9 w-9"
          title="Generate password"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={copyToClipboard}
          className="shrink-0 h-9 w-9"
          title="Copy to clipboard"
        >
          {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>

      {/* Options */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Length: {length}</Label>
        </div>
        <Slider
          value={[length]}
          onValueChange={([v]) => setLength(v)}
          min={4}
          max={64}
          step={1}
          className="w-full"
        />
        <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
          <label className="flex items-center gap-2 cursor-pointer group">
            <Switch checked={uppercase} onCheckedChange={setUppercase} className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-input" />
            <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">Uppercase (A-Z)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer group">
            <Switch checked={lowercase} onCheckedChange={setLowercase} className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-input" />
            <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">Lowercase (a-z)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer group">
            <Switch checked={numbers} onCheckedChange={setNumbers} className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-input" />
            <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">Numbers (0-9)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer group">
            <Switch checked={symbols} onCheckedChange={setSymbols} className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-input" />
            <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">Symbols (!@#$)</span>
          </label>
        </div>
      </div>
    </div>
  );
}