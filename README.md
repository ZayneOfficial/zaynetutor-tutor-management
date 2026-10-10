# ZayneTutor Tutor Management System

ZayneTutor is a tutor management app with a browser interface, authenticated
Node.js API, and MySQL persistence. Tutor accounts keep their students, grades,
payments, invoices, and settings in the database, accessible across devices.

## Run locally

### Requirements

- Node.js 20 or newer
- MySQL 8.0 or newer

### Set up MySQL

Create the database and tables from the repository root:

```sh
mysql -u root -p < backend/schema.sql
```

For a shared or production database, create a dedicated MySQL user with access
only to the `zaynetutor` database instead of using the root account.

### Configure and start the app

Copy the example environment file and set the database credentials and a
random JWT signing secret:

```sh
cp backend/.env.example backend/.env
openssl rand -base64 48
```

Put the generated secret in `backend/.env` as `JWT_SECRET`. Set `DB_HOST`,
`DB_NAME`, `DB_USER`, and `DB_PASSWORD` for your MySQL instance. For a database
provider that requires TLS, set `DB_SSL=true`.

Install and start the API and web app from the repository root:

```sh
npm ci --prefix backend
npm --prefix backend start
```

Open `http://localhost:3000`. Choose **Create a tutor account** on first use;
registration and sign-in are handled by the API, and passwords are hashed
before storage. The API health check at `/api/health` verifies database
connectivity. Existing browser-only demo data is not imported automatically;
new accounts start with empty database records.

The frontend is served by the same Node.js process as the API, so use the
application URL as a single origin; the frontend calls the API at that same
origin. Keep `WEB_ORIGIN` set to the application URL. Never commit
`backend/.env` or expose database credentials in frontend code.

## Production deployment

Deploy the Node.js application and MySQL database, not just the static files:

- Use a Node.js 20+ application host and a managed MySQL 8 database.
- Deploy the full repository from its root so the service has the frontend
  files as well as `backend/`; start it with `npm --prefix backend start`.
- Apply `backend/schema.sql` to the production database before starting the
  service.
- Configure `PORT`, `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`,
  `DB_SSL`, `JWT_SECRET`, and `WEB_ORIGIN` in the host's secret/environment
  settings. Set `NODE_ENV=production` and use a long random `JWT_SECRET`.
- Serve the site and API over HTTPS on the same origin. Use a separate,
  restricted database user and enable database TLS when supported.
- Configure automated, encrypted database backups with the database provider;
  this application does not create backups itself.

Do not configure a static-only deployment with an empty build command: it
cannot run the API or connect to MySQL. The API and frontend must be available
from the same application service for this setup.

## API

All data routes require the bearer token returned by `/api/auth/register` or
`/api/auth/login`. Records are scoped to the authenticated tutor.

| Method | Route | Purpose |
| --- | --- | --- |
| POST | `/api/auth/register`, `/api/auth/login` | Create account or sign in |
| GET | `/api/auth/me` | Get the authenticated tutor |
| GET, POST | `/api/students` | Search/list and create students |
| GET, PUT | `/api/students/:studentId` | Read and update an owned student |
| GET, POST, DELETE | `/api/grades` and `/api/grades/:gradeId` | Manage assessments |
| GET | `/api/payments?month=YYYY-MM` | List monthly payment status |
| GET | `/api/payments/history` | List saved payments for CSV/history |
| PUT | `/api/payments/:studentId/:month` | Create or update a payment |
| GET, POST | `/api/invoices` | List invoices and create snapshots |
| GET | `/api/dashboard?month=YYYY-MM` | Monthly totals and collection metrics |
| GET | `/api/reports/summary` | Annual fee run rate and average grade |
| GET, PUT | `/api/settings` | Read and update business settings |
| GET | `/api/health` | Check database connectivity |

## Main workflow

1. Create an account and sign in.
2. Add students and set individual monthly fees.
3. Record grades and monthly payments.
4. Review dashboard totals and outstanding balances.
5. Create invoices and print them or share them through WhatsApp.

Each student's monthly fee can be different.
