CREATE DATABASE IF NOT EXISTS zaynetutor
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

USE zaynetutor;

CREATE TABLE IF NOT EXISTS tutors (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(254) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  business_name VARCHAR(160) NOT NULL DEFAULT 'ZayneTutor',
  phone VARCHAR(40) NOT NULL DEFAULT '',
  currency VARCHAR(8) NOT NULL DEFAULT 'R',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tutors_email (email)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS students (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  tutor_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(160) NOT NULL,
  grade VARCHAR(40) NOT NULL,
  subject VARCHAR(120) NOT NULL,
  phone VARCHAR(40) NOT NULL DEFAULT '',
  guardian VARCHAR(160) NOT NULL DEFAULT '',
  monthly_fee DECIMAL(10,2) NOT NULL,
  status ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_students_tutor_name (tutor_id, name),
  KEY ix_students_tutor_status (tutor_id, status),
  CONSTRAINT fk_students_tutor FOREIGN KEY (tutor_id) REFERENCES tutors (id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS grades (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  tutor_id BIGINT UNSIGNED NOT NULL,
  student_id BIGINT UNSIGNED NOT NULL,
  term VARCHAR(40) NOT NULL,
  assessment VARCHAR(160) NOT NULL,
  score DECIMAL(10,2) NOT NULL,
  max_score DECIMAL(10,2) NOT NULL,
  assessment_date DATE NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_grades_tutor_student_date (tutor_id, student_id, assessment_date),
  CONSTRAINT fk_grades_tutor FOREIGN KEY (tutor_id) REFERENCES tutors (id),
  CONSTRAINT fk_grades_student FOREIGN KEY (student_id) REFERENCES students (id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS payments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  tutor_id BIGINT UNSIGNED NOT NULL,
  student_id BIGINT UNSIGNED NOT NULL,
  billing_month CHAR(7) NOT NULL,
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  payment_date DATE NULL,
  note VARCHAR(500) NOT NULL DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_payments_student_month (student_id, billing_month),
  KEY ix_payments_tutor_month (tutor_id, billing_month),
  CONSTRAINT fk_payments_tutor FOREIGN KEY (tutor_id) REFERENCES tutors (id),
  CONSTRAINT fk_payments_student FOREIGN KEY (student_id) REFERENCES students (id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS invoices (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  tutor_id BIGINT UNSIGNED NOT NULL,
  student_id BIGINT UNSIGNED NOT NULL,
  invoice_number VARCHAR(32) NOT NULL,
  billing_month CHAR(7) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status ENUM('Paid', 'Partial', 'Unpaid') NOT NULL,
  student_name VARCHAR(160) NOT NULL,
  student_grade VARCHAR(40) NOT NULL,
  student_subject VARCHAR(120) NOT NULL,
  guardian_name VARCHAR(160) NOT NULL DEFAULT '',
  business_name VARCHAR(160) NOT NULL,
  currency VARCHAR(8) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_invoices_tutor_number (tutor_id, invoice_number),
  KEY ix_invoices_tutor_created (tutor_id, created_at),
  CONSTRAINT fk_invoices_tutor FOREIGN KEY (tutor_id) REFERENCES tutors (id),
  CONSTRAINT fk_invoices_student FOREIGN KEY (student_id) REFERENCES students (id)
) ENGINE=InnoDB;
