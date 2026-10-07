import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import pool from "./db.js";
import { asyncHandler, requireAuth } from "./middleware.js";
import { isValidMonth, numericRows, paymentStatus } from "./domain.js";

const router = Router();
const monthSchema = z.string().refine(isValidMonth, "Expected a month in YYYY-MM format");
const idSchema = z.coerce.number().int().positive();
const moneySchema = z.coerce.number().finite().min(0).max(99999999.99);
const dateSchema = z.union([z.string().date(), z.literal(""), z.null()]).optional();

function createToken(tutorId) {
  return jwt.sign({}, process.env.JWT_SECRET, {
    subject: String(tutorId),
    expiresIn: process.env.JWT_EXPIRES_IN || "8h",
  });
}

async function ownedStudent(tutorId, studentId) {
  const [rows] = await pool.execute(
    "SELECT id, name, grade, subject, phone, guardian, monthly_fee, status FROM students WHERE id = ? AND tutor_id = ?",
    [studentId, tutorId],
  );
  return rows[0] ? numericRows(rows, ["monthly_fee"])[0] : null;
}

router.post("/auth/register", asyncHandler(async (req, res) => {
  const input = z.object({
    name: z.string().trim().min(1).max(120),
    email: z.string().trim().email().max(254).transform((email) => email.toLowerCase()),
    password: z.string().min(10).max(72),
  }).parse(req.body);
  const passwordHash = await bcrypt.hash(input.password, 12);
  const [result] = await pool.execute(
    "INSERT INTO tutors (name, email, password_hash) VALUES (?, ?, ?)",
    [input.name, input.email, passwordHash],
  );
  res.status(201).json({
    token: createToken(result.insertId),
    tutor: { id: result.insertId, name: input.name, email: input.email },
  });
}));

router.post("/auth/login", asyncHandler(async (req, res) => {
  const input = z.object({
    email: z.string().trim().email().max(254).transform((email) => email.toLowerCase()),
    password: z.string().min(1).max(72),
  }).parse(req.body);
  const [rows] = await pool.execute(
    "SELECT id, name, email, password_hash FROM tutors WHERE email = ?",
    [input.email],
  );
  const tutor = rows[0];
  if (!tutor || !(await bcrypt.compare(input.password, tutor.password_hash))) {
    return res.status(401).json({ error: "Email or password is incorrect" });
  }
  res.json({
    token: createToken(tutor.id),
    tutor: { id: tutor.id, name: tutor.name, email: tutor.email },
  });
}));

router.get("/auth/me", requireAuth, asyncHandler(async (req, res) => {
  const [rows] = await pool.execute(
    "SELECT id, name, email FROM tutors WHERE id = ?",
    [req.tutorId],
  );
  if (!rows[0]) return res.status(401).json({ error: "Tutor account not found" });
  res.json({ tutor: rows[0] });
}));

router.use(requireAuth);

router.get("/students", asyncHandler(async (req, res) => {
  const query = z.object({
    q: z.string().trim().max(160).optional(),
    status: z.enum(["Active", "Inactive"]).optional(),
  }).parse(req.query);
  const filters = ["tutor_id = ?"];
  const values = [req.tutorId];
  if (query.status) {
    filters.push("status = ?");
    values.push(query.status);
  }
  if (query.q) {
    filters.push("(name LIKE ? OR grade LIKE ? OR subject LIKE ?)");
    const term = `%${query.q}%`;
    values.push(term, term, term);
  }
  const [rows] = await pool.execute(
    `SELECT id, name, grade, subject, phone, guardian, monthly_fee AS fee, status
     FROM students WHERE ${filters.join(" AND ")} ORDER BY name`,
    values,
  );
  res.json({ students: numericRows(rows, ["id", "fee"]) });
}));

router.post("/students", asyncHandler(async (req, res) => {
  const input = z.object({
    name: z.string().trim().min(1).max(160),
    grade: z.string().trim().min(1).max(40),
    subject: z.string().trim().min(1).max(120),
    phone: z.string().trim().max(40).optional().default(""),
    guardian: z.string().trim().max(160).optional().default(""),
    fee: moneySchema,
    status: z.enum(["Active", "Inactive"]).optional().default("Active"),
  }).parse(req.body);
  const [result] = await pool.execute(
    `INSERT INTO students (tutor_id, name, grade, subject, phone, guardian, monthly_fee, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [req.tutorId, input.name, input.grade, input.subject, input.phone, input.guardian, input.fee, input.status],
  );
  res.status(201).json({ student: { id: result.insertId, ...input } });
}));

router.get("/students/:studentId", asyncHandler(async (req, res) => {
  const studentId = idSchema.parse(req.params.studentId);
  const student = await ownedStudent(req.tutorId, studentId);
  if (!student) return res.status(404).json({ error: "Student not found" });
  res.json({ student: { ...student, fee: student.monthly_fee } });
}));

router.put("/students/:studentId", asyncHandler(async (req, res) => {
  const studentId = idSchema.parse(req.params.studentId);
  const input = z.object({
    name: z.string().trim().min(1).max(160),
    grade: z.string().trim().min(1).max(40),
    subject: z.string().trim().min(1).max(120),
    phone: z.string().trim().max(40).optional().default(""),
    guardian: z.string().trim().max(160).optional().default(""),
    fee: moneySchema,
    status: z.enum(["Active", "Inactive"]),
  }).parse(req.body);
  const [result] = await pool.execute(
    `UPDATE students SET name = ?, grade = ?, subject = ?, phone = ?, guardian = ?, monthly_fee = ?, status = ?
     WHERE id = ? AND tutor_id = ?`,
    [input.name, input.grade, input.subject, input.phone, input.guardian, input.fee, input.status, studentId, req.tutorId],
  );
  if (!result.affectedRows) return res.status(404).json({ error: "Student not found" });
  res.json({ student: { id: studentId, ...input } });
}));

router.get("/grades", asyncHandler(async (req, res) => {
  const query = z.object({ studentId: idSchema.optional() }).parse(req.query);
  const filters = ["g.tutor_id = ?"];
  const values = [req.tutorId];
  if (query.studentId) {
    filters.push("g.student_id = ?");
    values.push(query.studentId);
  }
  const [rows] = await pool.execute(
    `SELECT g.id, g.student_id AS studentId, g.term, g.assessment,
            g.score, g.max_score AS \`max\`,
            DATE_FORMAT(g.assessment_date, '%Y-%m-%d') AS date
     FROM grades g WHERE ${filters.join(" AND ")} ORDER BY g.assessment_date DESC, g.id DESC`,
    values,
  );
  res.json({ grades: numericRows(rows, ["id", "studentId", "score", "max"]) });
}));

router.post("/grades", asyncHandler(async (req, res) => {
  const input = z.object({
    studentId: idSchema,
    term: z.string().trim().min(1).max(40),
    assessment: z.string().trim().min(1).max(160),
    score: z.coerce.number().finite().min(0).max(99999999.99),
    max: z.coerce.number().finite().gt(0).max(99999999.99),
    date: dateSchema,
  }).refine((grade) => grade.score <= grade.max, {
    path: ["score"],
    message: "Score cannot exceed the maximum",
  }).parse(req.body);
  if (!(await ownedStudent(req.tutorId, input.studentId))) {
    return res.status(404).json({ error: "Student not found" });
  }
  const [result] = await pool.execute(
    `INSERT INTO grades (tutor_id, student_id, term, assessment, score, max_score, assessment_date)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [req.tutorId, input.studentId, input.term, input.assessment, input.score, input.max, input.date || null],
  );
  res.status(201).json({ grade: { id: result.insertId, ...input } });
}));

router.delete("/grades/:gradeId", asyncHandler(async (req, res) => {
  const gradeId = idSchema.parse(req.params.gradeId);
  const [result] = await pool.execute(
    "DELETE FROM grades WHERE id = ? AND tutor_id = ?",
    [gradeId, req.tutorId],
  );
  if (!result.affectedRows) return res.status(404).json({ error: "Grade not found" });
  res.status(204).end();
}));

router.get("/payments", asyncHandler(async (req, res) => {
  const { month } = z.object({ month: monthSchema }).parse(req.query);
  const [rows] = await pool.execute(
    `SELECT s.id AS studentId, s.name, s.grade, s.subject, s.monthly_fee AS fee,
            p.id, COALESCE(p.amount, 0) AS amount, DATE_FORMAT(p.payment_date, '%Y-%m-%d') AS date,
            COALESCE(p.note, '') AS note
     FROM students s
     LEFT JOIN payments p ON p.student_id = s.id AND p.billing_month = ?
     WHERE s.tutor_id = ?
     ORDER BY s.name`,
    [month, req.tutorId],
  );
  const payments = numericRows(rows, ["studentId", "id", "fee", "amount"]).map((row) => ({
    ...row,
    month,
    status: paymentStatus(row.amount, row.fee),
  }));
  res.json({ payments });
}));

router.put("/payments/:studentId/:month", asyncHandler(async (req, res) => {
  const studentId = idSchema.parse(req.params.studentId);
  const month = monthSchema.parse(req.params.month);
  const input = z.object({
    amount: moneySchema,
    date: dateSchema,
    note: z.string().trim().max(500).optional().default(""),
  }).parse(req.body);
  const student = await ownedStudent(req.tutorId, studentId);
  if (!student) return res.status(404).json({ error: "Student not found" });
  const [result] = await pool.execute(
    `INSERT INTO payments (tutor_id, student_id, billing_month, amount, payment_date, note)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE amount = VALUES(amount), payment_date = VALUES(payment_date), note = VALUES(note)`,
    [req.tutorId, studentId, month, input.amount, input.date || null, input.note],
  );
  res.json({
    payment: {
      id: result.insertId || null,
      studentId,
      month,
      ...input,
      status: paymentStatus(input.amount, student.monthly_fee),
    },
  });
}));

router.get("/invoices", asyncHandler(async (req, res) => {
  const [rows] = await pool.execute(
    `SELECT id, student_id AS studentId, invoice_number AS number, billing_month AS month,
            amount, status, student_name AS studentName, student_grade AS grade,
            student_subject AS subject, guardian_name AS guardian, business_name AS businessName,
            currency, created_at AS created
     FROM invoices WHERE tutor_id = ? ORDER BY created_at DESC, id DESC`,
    [req.tutorId],
  );
  res.json({ invoices: numericRows(rows, ["id", "studentId", "amount"]) });
}));

router.post("/invoices", asyncHandler(async (req, res) => {
  const input = z.object({
    studentId: idSchema,
    month: monthSchema,
    amount: moneySchema,
  }).parse(req.body);
  const student = await ownedStudent(req.tutorId, input.studentId);
  if (!student) return res.status(404).json({ error: "Student not found" });
  const [paymentRows] = await pool.execute(
    "SELECT amount FROM payments WHERE tutor_id = ? AND student_id = ? AND billing_month = ?",
    [req.tutorId, input.studentId, input.month],
  );
  const [tutorRows] = await pool.execute(
    "SELECT business_name AS businessName, currency FROM tutors WHERE id = ?",
    [req.tutorId],
  );
  const year = new Date().getFullYear();
  const paid = paymentRows[0]?.amount || 0;
  const invoice = {
    tutorId: req.tutorId,
    studentId: input.studentId,
    month: input.month,
    amount: input.amount,
    status: paymentStatus(paid, student.monthly_fee),
    studentName: student.name,
    grade: student.grade,
    subject: student.subject,
    guardian: student.guardian,
    businessName: tutorRows[0].businessName,
    currency: tutorRows[0].currency,
  };
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute("SELECT id FROM tutors WHERE id = ? FOR UPDATE", [req.tutorId]);
    const [countRows] = await connection.execute(
      "SELECT COUNT(*) AS count FROM invoices WHERE tutor_id = ? AND invoice_number LIKE ?",
      [req.tutorId, `INV-${year}-%`],
    );
    invoice.number = `INV-${year}-${String(Number(countRows[0].count) + 1).padStart(5, "0")}`;
    await connection.execute(
      `INSERT INTO invoices
         (tutor_id, student_id, invoice_number, billing_month, amount, status,
          student_name, student_grade, student_subject, guardian_name, business_name, currency)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [invoice.tutorId, invoice.studentId, invoice.number, invoice.month, invoice.amount, invoice.status,
        invoice.studentName, invoice.grade, invoice.subject, invoice.guardian, invoice.businessName, invoice.currency],
    );
    await connection.commit();
  } catch (error) {
    try {
      await connection.rollback();
    } catch (rollbackError) {
      console.error(rollbackError);
    }
    throw error;
  } finally {
    connection.release();
  }
  res.status(201).json({ invoice });
}));

router.get("/dashboard", asyncHandler(async (req, res) => {
  const { month } = z.object({ month: monthSchema }).parse(req.query);
  const [totals] = await pool.execute(
    `SELECT
       COALESCE(SUM(CASE WHEN s.status = 'Active' THEN s.monthly_fee ELSE 0 END), 0) AS expected,
       COALESCE(SUM(COALESCE(p.amount, 0)), 0) AS received,
       SUM(CASE WHEN s.status = 'Active' THEN 1 ELSE 0 END) AS activeStudents,
       COUNT(s.id) AS totalStudents
     FROM students s
     LEFT JOIN payments p ON p.student_id = s.id AND p.billing_month = ?
     WHERE s.tutor_id = ?`,
    [month, req.tutorId],
  );
  const summary = numericRows(totals, ["expected", "received", "activeStudents", "totalStudents"])[0];
  const [studentRows] = await pool.execute(
    `SELECT s.id AS studentId, s.name, s.monthly_fee AS fee, COALESCE(p.amount, 0) AS amount
     FROM students s LEFT JOIN payments p
       ON p.student_id = s.id AND p.billing_month = ?
     WHERE s.tutor_id = ? AND s.status = 'Active' ORDER BY s.name`,
    [month, req.tutorId],
  );
  const activePayments = numericRows(studentRows, ["studentId", "fee", "amount"]);
  const fullyPaid = activePayments.filter((payment) =>
    paymentStatus(payment.amount, payment.fee) === "Paid").length;
  res.json({
    month,
    ...summary,
    outstanding: Math.max(summary.expected - summary.received, 0),
    fullyPaid,
    collectionRate: summary.expected
      ? Math.round((summary.received / summary.expected) * 100)
      : 0,
  });
}));

router.get("/reports/summary", asyncHandler(async (req, res) => {
  const [totals] = await pool.execute(
    `SELECT COALESCE(SUM(CASE WHEN status = 'Active' THEN monthly_fee * 12 ELSE 0 END), 0) AS annualRunRate
     FROM students WHERE tutor_id = ?`,
    [req.tutorId],
  );
  const [grades] = await pool.execute(
    `SELECT score, max_score AS \`max\` FROM grades WHERE tutor_id = ?`,
    [req.tutorId],
  );
  const averageGrade = grades.length
    ? Math.round(grades.reduce((sum, grade) => sum + (grade.score / grade.max) * 100, 0) / grades.length)
    : 0;
  res.json({
    annualRunRate: Number(totals[0].annualRunRate),
    averageGrade,
  });
}));

router.get("/settings", asyncHandler(async (req, res) => {
  const [rows] = await pool.execute(
    `SELECT name AS tutorName, business_name AS businessName, email, phone, currency
     FROM tutors WHERE id = ?`,
    [req.tutorId],
  );
  if (!rows[0]) return res.status(404).json({ error: "Tutor account not found" });
  res.json({ settings: rows[0] });
}));

router.put("/settings", asyncHandler(async (req, res) => {
  const input = z.object({
    tutorName: z.string().trim().min(1).max(120),
    businessName: z.string().trim().min(1).max(160),
    phone: z.string().trim().max(40).optional().default(""),
    currency: z.string().trim().min(1).max(8),
  }).parse(req.body);
  await pool.execute(
    "UPDATE tutors SET name = ?, business_name = ?, phone = ?, currency = ? WHERE id = ?",
    [input.tutorName, input.businessName, input.phone, input.currency, req.tutorId],
  );
  res.json({ settings: input });
}));

export default router;
