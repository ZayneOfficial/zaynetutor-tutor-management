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

- Node.js + Express backend
- MySQL database
- Secure login
- Cloud database
- Automatic backups
- Real PDF invoice files
- Official WhatsApp Business API integration
- Multi-device access

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
