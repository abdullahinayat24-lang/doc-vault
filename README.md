# DocVault — Professional Solicitor & Document Vault

A Google Workspace / Gmail-styled document management and multi-format viewing platform built with React, TypeScript, Tailwind CSS, Supabase, and PDF.js.

Designed specifically for solicitors, legal practices, and professionals to manage client cases, track required vs. approved documents, and share secure viewer links protected by 4-digit PINs.

---

## Key Features

### 1. Google / Gmail White Aesthetic
- Clean, crisp white background (`#FFFFFF` / `#F8FAFD`) with Google Material styling.
- Responsive top bar with company logo, document search, Export options, Share modal, Session Lock, and Solicitor Profile chip.

### 2. Client Tabs & Case Management
- Organize documents into client tabs (e.g. *Application in 2024*, *Wife Application in 2025*).
- Tab metadata includes Client Name and Case Reference numbers.
- One-click sorting of tabs and documents by **Date** or by **Name**.

### 3. Document Status & Color Coding System
- **Missing Document / Disapproved Document -> RED** (`#d93025`):
  - When a solicitor creates a required document slot (e.g. *Police Clearance Certificate* or *Marriage Certificate*) before any file is uploaded, it is automatically marked in **RED**.
  - Clicking the slot provides an instant "+ Upload File Now" button for the solicitor or client.
  - Disapproved documents are highlighted in **RED** with a solicitor feedback note.
- **Approved Document -> GREEN** (`#137333`):
  - Clicking the **Approve** checkmark marks the document **GREEN** ("Verified & Approved by Solicitor").
- **Pending / Normal -> WHITE** (Normal neutral color):
  - Uploaded documents awaiting review remain in clean white with neutral badges.

### 4. Multi-Format Document Viewer with Pan & Zoom
- Supports **PDF**, **PNG**, **JPG**, and **EPUB** e-books.
- **Viewer Toolbar Controls**:
  - Zoom In (`+`), Zoom Out (`-`), Zoom % display, Reset Zoom (`1:1`).
  - Pan left, right, up, and down controls (plus click-and-drag mouse panning).
  - Rotate 90° clockwise.
  - Multi-page navigation for PDFs and chapter progression for EPUBs.
  - Fullscreen toggle.

### 5. Multi-Format Export Options
- **Original Format**: Download the exact uploaded file.
- **Convert & Export as PDF**: Converts photos, certificates, and images into formatted PDF files.
- **Convert & Export as JPG**: High-resolution image export.
- **Batch Export as ZIP**: Export multiple selected documents or an entire client tab in an organized `.zip` file.

### 6. Client Sharing with 4-Digit Privacy PIN
- Create shareable links for an entire client tab, selected documents, or single files.
- Protected by a custom **4-digit Privacy PIN** (e.g. `4829`).
- **Viewer-Only Access**:
  - Clients cannot delete or view other non-shared tabs.
  - Clients see their solicitor's official company logo, name, and contact details.
  - Clients can upload missing files directly into the red "Missing" slots.

### 7. Instant Privacy Lock
- Lock the workspace anytime using the Lock button in the top bar.
- Resumes only upon entering your 4-digit PIN (default: `1234`).

---

## Quick Start (Local Development)

```bash
# Navigate to the doc-vault folder
cd doc-vault

# Install dependencies
npm install

# Start Vite local development server
npm run dev
```

Open `http://localhost:5173` in your browser. The app runs immediately with sample solicitor client tabs, documents, and local isolated storage.

---

## Supabase Setup (Cloud Sync & Storage)

1. Create a project at [supabase.com](https://supabase.com).
2. Open the **SQL Editor** in Supabase and run the SQL script found in `supabase/schema.sql`.
3. In Supabase **Storage**, create a bucket named `documents`.
4. In DocVault, click your solicitor profile chip at the top right -> **Account & Storage Settings** -> **Supabase Cloud Sync**.
5. Paste your **Supabase URL** and **Anon Key** and click **Connect**.

---

## Deploying to GitHub & Render

### Step 1: Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit: DocVault application"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
git push -u origin main
```

### Step 2: Deploy on Render
1. Log in to [render.com](https://render.com).
2. Click **New +** -> **Static Site**.
3. Connect your GitHub repository.
4. Set:
   - **Build Command**: `npm run build`
   - **Publish Directory**: `dist`
5. Under **Environment Variables**, optionally add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. Click **Create Static Site**.
