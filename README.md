# VaultGuard

![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)
![Version](https://img.shields.io/badge/Version-v1.1.0-blue)

**A zero-knowledge encrypted password manager that runs entirely in your browser. No server. No cloud. Your data never leaves your device.**

VaultGuard is a 100% client-side password manager that encrypts everything locally using your browser's built-in Web Crypto API. There is no server, no database, no accounts, and no data transmission of any kind. Your vault lives entirely in your browser's IndexedDB storage. It offers a polished, app-like experience with TOTP support, security auditing, and a beautiful glass-morphism UI that works on any device.

---

## Features

### 🔒 Privacy-First Architecture

- **100% client-side** — no server stores your data
- **IndexedDB storage** — data lives in your browser
- **No accounts, no tracking, no analytics**
- **Works completely offline** after first load
- **Static site** — deploy anywhere for free

### 🔐 Security

- **Zero-knowledge encryption** — all encryption and decryption happens in your browser using the Web Crypto API
- **AES-256-GCM** symmetric encryption for every vault entry
- **PBKDF2 key derivation** with 600,000 iterations to resist brute-force attacks
- **Client-side only encryption** — your master password never leaves your browser
- **Clipboard auto-clear** — copied passwords are automatically erased after 30 seconds
- **Inactivity auto-lock** — vault locks after 5 minutes of inactivity (with a 1-minute warning countdown)

### 📋 Vault Management

- Create, edit, and delete vault entries
- **12+ fields per entry**: platform, URL, username, email, password, notes, category, tags, TOTP secret, expiry date, password history, and more
- **Duplicate entries** with one click (creates a copy you can customize)
- **Bulk select and delete** — select multiple entries and delete them at once
- **Built-in password generator** with presets (Strong, Passphrase, PIN, Memorable) and a full requirements checklist
- **Quick-copy** — click any field on a card to instantly copy it
- **Copy All** — copies every field from an entry as formatted text

### 🔍 Organization

- **9 color-coded categories**: Social, Email, Finance, Shopping, Work, Entertainment, Development, Gaming, Other
- **Custom tags** with filter chips — add any tags you want and filter by them
- **Favorites / pinning** — mark important entries and filter them instantly
- **Full-text search** across platform names, usernames, URLs, notes, and tags
- **Sort by any field** — name, category, date created, last accessed, password strength, and more
- **Grid and list views** — switch between a visual card grid and a compact table
- **Recently accessed section** — see your 5 most recently used entries at the top

### 🛡️ 2FA / TOTP

- Store TOTP secrets for any service that supports two-factor authentication
- **Real-time TOTP code generation** with a 30-second countdown
- **Circular countdown indicator** — visual ring shows time remaining, shifts to amber at ≤5 seconds
- **One-click copy** for TOTP codes with auto-clear after 30 seconds
- **"2FA Enabled" badge** on entries that have a TOTP secret configured
- Collapsible raw secret view when you need to transfer the key

### 📊 Security Audit

- **Overall security score** (0–100%) with a breakdown of what's affecting it
- **Weak password detection** — flags entries that don't meet strength requirements
- **Expired password tracking** — shows passwords past their expiry date
- **Password health metric** — average strength percentage across all entries (color-coded green/amber/red)
- **Password strength trend** — visual bar chart showing how an entry's password strength has changed over time
- **10 stat cards** at a glance: Total entries, Favorites, With Password, With URL, Accessed Today, Expiring Soon, Password Health, Top Category, 2FA Enabled, Tags Used

### 📤 Import / Export

- **Encrypted JSON export** — exports your vault in a format that can only be decrypted with your master password
- **Plain CSV export** — for interoperability with other tools (includes a prominent plaintext warning)
- **Import with auto-format detection** — drop a `.json` or `.csv` file and VaultGuard figures out the format
- **RFC 4180 compliant CSV parsing** — handles quoted fields, escaped double-quotes, and special characters
- CSV entries are encrypted before being stored, maintaining zero-knowledge guarantees
- **Backup reminder** — an amber banner appears if you haven't exported your vault in 7+ days

### 🎨 Design

- **Dark / light theme toggle** — switch themes from the auth screen or vault footer
- **Glass morphism UI** — frosted glass cards and overlays with a distinctive emerald/teal color system
- **40+ micro-interaction animations** — hover effects, entrance animations, press feedback, skeleton loading shimmer, and more
- **Platform-specific icons** — recognizes 17+ platforms (GitHub, Gmail, Netflix, AWS, etc.) and shows the right icon
- **Responsive design** with 44px mobile touch targets and iOS safe-area support
- **Keyboard shortcuts**: `⌘K` / `Ctrl+K` (search), `⌘N` / `Ctrl+N` (new entry), `Esc` (close dialogs)
- **First-run onboarding** — welcoming empty state with quick-action cards to help you get started

### 📱 PWA

- **Installable as a native app** on both desktop and mobile
- PWA manifest and service worker included in `/public`
- Works offline after first load

---

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) 18+ (or [Bun](https://bun.sh/))
- npm, yarn, or bun

### Setup

```bash
# 1. Clone the repo
git clone <repo-url>
cd vaultguard

# 2. Install dependencies
bun install

# 3. Start the development server
bun run dev

# 4. Open in your browser
# Visit http://localhost:3000
```

That's it — no database setup, no environment variables, no configuration. Just install and run.

---

## How It Works (Security Architecture)

VaultGuard uses a **zero-knowledge, fully local architecture**. Everything happens in your browser — no data is ever sent anywhere.

```
┌─────────────────────────────────────────────┐
│              Your Browser Only              │
│                                             │
│  Master Password                            │
│       │                                     │
│       ▼                                     │
│  PBKDF2 (600,000 iterations)               │
│       │                                     │
│       ▼                                     │
│  AES-256-GCM Encryption Key                │
│       │                                     │
│       ▼                                     │
│  Encrypt / Decrypt Vault Entries            │
│       │                                     │
│       ▼                                     │
│  IndexedDB (local browser storage)          │
│                                             │
│  ❌ No data sent to any server              │
│  ❌ No accounts or tracking                 │
│  ❌ No cloud storage                        │
└─────────────────────────────────────────────┘
```

**In plain English:**

- Your **master password never leaves your browser** — it's used only to derive an encryption key locally
- All encryption and decryption happens **in your browser** using the built-in Web Crypto API — no JavaScript libraries doing crypto
- Your encrypted data is stored in **IndexedDB** — your browser's local database. It never touches the network.
- There are **no accounts, no sessions, no tokens** — just "Create Vault" (first time) or "Unlock Vault" (return visits)
- Clearing your browser data permanently deletes your vault (unless you've exported a backup)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 + shadcn/ui |
| Storage | IndexedDB (client-side storage) |
| State | Zustand |
| Encryption | Web Crypto API (AES-256-GCM, PBKDF2) |
| 2FA/TOTP | otpauth |
| Icons | Lucide React |
| Animations | CSS Keyframes + Transitions |
| Theming | next-themes (dark/light) |
| Notifications | Sonner |

---

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx          # Root layout with ThemeProvider
│   ├── page.tsx            # Main application page (auth screen + vault screen)
│   └── globals.css         # Global styles, animations, and theme variables
├── components/
│   ├── ui/                 # shadcn/ui base components
│   ├── vault/              # Application-specific components
│   │   ├── entry-card.tsx          # Grid view card
│   │   ├── entry-row.tsx           # List view row
│   │   ├── entry-form-dialog.tsx   # Create/edit entry form
│   │   ├── entry-detail-sheet.tsx  # Entry detail side panel
│   │   ├── vault-header.tsx        # Search, filters, sort, view toggle
│   │   ├── stats-overview.tsx      # 10 stat cards with security metrics
│   │   ├── password-generator.tsx  # Password generation with presets
│   │   ├── password-strength-meter.tsx  # Strength indicator + requirements
│   │   ├── totp-display.tsx        # Real-time TOTP code with countdown
│   │   ├── import-export-dialog.tsx # Import/export (JSON/CSV)
│   │   ├── inactivity-warning.tsx  # Auto-lock warning dialog
│   │   ├── category-tag.tsx        # Color-coded category badges
│   │   └── theme-toggle.tsx        # Dark/light theme switcher
│   └── error-boundary.tsx  # React error boundary (graceful crash recovery)
├── hooks/                  # Custom React hooks
│   ├── use-clipboard-auto-clear.ts  # Copy with 30s auto-clear
│   ├── use-mobile.ts               # Mobile viewport detection
│   ├── use-pwa.ts                  # PWA install prompt
│   └── use-toast.ts                # Toast notifications
├── lib/                    # Utilities & helpers
│   ├── crypto.ts           # Encryption/decryption (Web Crypto API)
│   ├── db-local.ts         # IndexedDB storage layer
│   ├── platform-icons.tsx  # Platform name → icon mappings
│   └── utils.ts            # General utility functions
├── store/                  # Zustand state management
│   └── index.ts            # Auth store, vault store, inactivity timeout store
└── public/                 # Static assets & PWA files
    ├── manifest.json       # PWA manifest
    ├── sw.js               # Service worker
    ├── icon.svg            # App icon
    └── logo.svg            # App logo
```

---

## No Server Required

VaultGuard is a fully client-side application. There are no API endpoints, no server communication, and no data transmission. Everything runs in your browser using IndexedDB for storage.

---

## Deployment (Free)

VaultGuard builds to a static `out/` folder (HTML + CSS + JS). No server, no database — just upload the files. See [PUBLIC_STORE_PACKAGES.md](./PUBLIC_STORE_PACKAGES.md) for detailed ELI10 step-by-step guides.

### Vercel (Recommended — Easiest)

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and sign in with GitHub
3. Click **"New Project"** → Import your repository
4. Vercel auto-detects Next.js static export and uses the `out/` directory
5. Click **"Deploy"** — done!

### Netlify

1. Push your code to GitHub
2. Go to [netlify.com](https://netlify.com) and sign in with GitHub
3. Click **"Add new site"** → **"Import an existing project"**
4. Set **Publish directory** to `out`
5. Click **"Deploy site"**

### GitHub Pages

1. Push your code to GitHub
2. Create a `.github/workflows/static-site.yml` file (see `PUBLIC_STORE_PACKAGES.md` for the exact content)
3. Go to **Settings** → **Pages** → Set source to **GitHub Actions**
4. Your site is live at `username.github.io/repo-name`

### Any Static Host

Run `npm run build` (or `bun run build`), then upload the `out/` folder to any web host.

> **Note:** `next.config.ts` already has `output: 'export'` configured — no changes needed.

---

## License

This project is licensed under the **MIT License**. You are free to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the software, with the only requirement being that the copyright notice and license text are included in all copies or substantial portions of the software.

```
MIT License

Copyright (c) 2025 VaultGuard

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## Contributing

Contributions are welcome! If you'd like to contribute to VaultGuard, please **open an issue first** to discuss what you'd like to change. This helps avoid duplicate work and ensures your contribution aligns with the project's direction.