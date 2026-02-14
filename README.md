# Quazian

Authentication + invitation flow for Professors and Students (Next.js App Router + Prisma SQLite).

## Features added

- Professor login (`/prof/login`) with email/password.
- Professor student dashboard (`/prof/students`) with CSV upload (`name,class,email`) and invitation links.
- Student invitation activation (`/invite/[token]`) to set password and activate account.
- Student login (`/student/login`).
- Single-use invitation tokens stored in DB.
- Password hashing with bcrypt.

## Local run

1. Install deps:

```bash
npm install
```

2. Create `.env`:

```bash
DATABASE_URL="file:./dev.db"
SESSION_SECRET="replace-with-long-random-secret"
```

3. Apply migrations + generate client:

```bash
npm run prisma:migrate
npm run prisma:generate
```

4. Seed one professor account:

```bash
npm run db:seed
```

Seeded credentials:
- `prof@example.com`
- `prof12345`

5. Start app:

```bash
npm run dev
```

## CSV format

Upload a CSV with this header in `/prof/students`:

```csv
name,class,email
Alice Martin,4A,alice@example.com
Bob Durant,4A,bob@example.com
```

Importing creates/updates students in `INVITED` state and regenerates a single active invitation token per student.
