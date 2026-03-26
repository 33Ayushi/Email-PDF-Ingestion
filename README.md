# Email PDF Ingestion Platform

A full-stack application that automatically scans email inboxes for PDF attachments, downloads them locally, and stores metadata in PostgreSQL.

## 🚀 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router) + TypeScript |
| Backend | Next.js API Routes |
| Database | PostgreSQL |
| ORM | Prisma |
| Email Client | IMAPFlow |
| Storage | Local `/pdfs` folder |

## ⚙️ Setup

### 1. Prerequisites
- Node.js 18+
- PostgreSQL running locally (or use a cloud DB)

### 2. Configure Environment
```bash
cp .env.example .env
```
Edit `.env` and set your `DATABASE_URL`:
```
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/email_ingestion"
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Run Prisma Migrations
```bash
npx prisma generate
npx prisma migrate dev --name init
```

### 5. Start Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)
deployed live link : https://email-pdf-ingestion-vnaq.vercel.app/

---

## 📧 Supported Email Providers

| Provider | Connection Type | Host |
|----------|---------------|------|
| Gmail | GMAIL | imap.gmail.com (auto) |
| Outlook/Office365 | OUTLOOK | outlook.office365.com (auto) |
| Custom IMAP | IMAP | Your mail server |
| POP3 | POP3 | Your mail server |

> **Gmail users**: Use an [App Password](https://support.google.com/accounts/answer/185833). Not your regular password.
> **Outlook users**: Enable IMAP in account settings. Use your email + password.

---

## 🗄️ Database Schema

### EmailIngestionConfig
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| emailAddress | String | Email address |
| connectionType | String | IMAP/POP3/GMAIL/OUTLOOK |
| host | String? | IMAP host |
| port | Int | Port (default 993) |
| secure | Boolean | Use TLS |
| username | String | Login username |
| password | String | Login password (stored in DB) |
| createdAt | DateTime | Timestamp |

### PdfAttachment
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| configId | String? | FK to config |
| fromAddress | String | Sender address |
| subject | String | Email subject |
| dateReceived | DateTime | When email was received |
| attachmentFileName | String | PDF filename |
| savedPath | String | Local file path |
| fileSizeBytes | Int? | File size |
| createdAt | DateTime | When downloaded |

---

## 🔌 API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/email-ingestion` | List all configs |
| POST | `/api/email-ingestion` | Create config |
| PUT | `/api/email-ingestion/:id` | Update config |
| DELETE | `/api/email-ingestion/:id` | Delete config |
| POST | `/api/email-ingestion/check` | Scan inbox for PDFs |
| GET | `/api/attachments` | List downloaded PDFs |

---

## 📁 Project Structure

```
email-pdf-ingestion/
├── app/
│   ├── api/
│   │   ├── email-ingestion/
│   │   │   ├── route.ts          # GET, POST configs
│   │   │   ├── [id]/route.ts     # GET, PUT, DELETE config
│   │   │   └── check/route.ts    # POST scan inbox
│   │   └── attachments/route.ts  # GET downloaded PDFs
│   ├── globals.css               # Full dark-mode design system
│   ├── layout.tsx
│   └── page.tsx                  # Main UI
├── lib/
│   ├── emailClient.ts            # IMAPFlow email scanner
│   └── prisma.ts                 # Prisma singleton
├── prisma/
│   └── schema.prisma
├── pdfs/                         # Downloaded PDFs saved here
├── .env                          # Your DB credentials
└── next.config.js
```

---

## 🔒 Security Notes

- Passwords are stored in the database (plain text for demo). In production, encrypt them.
- Use Gmail App Passwords, not your real password.
- For production: add authentication to protect the UI.
