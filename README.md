# ZayneTutor Tutor Management System

A simple tutor dashboard for managing:

- Students
- Individual monthly fees
- Monthly payments
- Outstanding balances
- Student grades
- Invoices
- WhatsApp invoice messages
- Expected monthly income
- Reports and CSV export
- Tutor/business settings

## Run it

No installation is required for this first version.

1. Extract the folder.
2. Open the folder in VS Code.
3. Open `index.html` with Live Server, or double-click `index.html`.
4. The demo data will load automatically.

## Important

This first version uses browser localStorage. That means the data is stored on the computer/browser where you use the site.

For a production version, the next upgrade should be:

- Connect the Node.js + Express backend in `backend/`
- MySQL database and secure tutor login (starter implementation provided)
- Cloud database
- Automatic backups
- Real PDF invoice files
- Official WhatsApp Business API integration
- Multi-device access

## Node.js + MySQL backend

The backend is a separate REST API; the current `app.js` still uses browser
localStorage and does not call it yet.

### Requirements

- Node.js 20 or newer
- MySQL 8.0 or newer

### Start the API

1. Create a MySQL user/database, or use a local MySQL development instance.
2. From the repository root, initialize the schema:

   ```sh
   mysql -u root -p < backend/schema.sql
   ```

3. Copy `backend/.env.example` to `backend/.env`, then set the database
   credentials, `WEB_ORIGIN`, and a random `JWT_SECRET` of at least 32
   characters.
4. Install dependencies and start the API:

   ```sh
   cd backend
   npm install
   npm run dev
   ```

The API listens on `http://localhost:3000`; `GET /api/health` checks the
database connection. Authenticated routes require
`Authorization: Bearer <token>`. Create an account with
`POST /api/auth/register`, then sign in with `POST /api/auth/login`.

### API outline

| Method | Route | Purpose |
| --- | --- | --- |
| POST | `/api/auth/register`, `/api/auth/login` | Create a tutor account and obtain a JWT |
| GET | `/api/auth/me` | Get the authenticated tutor |
| GET, POST | `/api/students` | Search/list and create students |
| GET, PUT | `/api/students/:studentId` | Read and update an owned student |
| GET, POST, DELETE | `/api/grades` and `/api/grades/:gradeId` | List, create, and delete assessments |
| GET | `/api/payments?month=YYYY-MM` | List month payment status for students |
| PUT | `/api/payments/:studentId/:month` | Create or update that student's monthly payment |
| GET, POST | `/api/invoices` | List invoices and create an invoice snapshot |
| GET | `/api/dashboard?month=YYYY-MM` | Monthly totals and collection metrics |
| GET | `/api/reports/summary` | Annual fee run rate and average grade |
| GET, PUT | `/api/settings` | Read and update tutor/business settings |

All tutor-owned records are scoped by the authenticated account. Apply
`backend/schema.sql` before starting; the API does not create or seed demo
accounts automatically.

## Main workflow

1. Add a student.
2. Set that student's own monthly fee.
3. Record grades whenever needed.
4. Open Payments for the current month.
5. Record the amount actually paid.
6. The dashboard automatically recalculates expected income, received income and outstanding income.
7. Create an invoice.
8. Send the invoice message through WhatsApp.

Different students can have completely different fees.
