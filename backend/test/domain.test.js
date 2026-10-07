import test from "node:test";
import assert from "node:assert/strict";
import { isValidMonth, numericRows, paymentStatus } from "../src/domain.js";

test("paymentStatus computes full, partial, and unpaid balances", () => {
  assert.equal(paymentStatus(600, 600), "Paid");
  assert.equal(paymentStatus(700, 600), "Paid");
  assert.equal(paymentStatus(200, 600), "Partial");
  assert.equal(paymentStatus(0, 600), "Unpaid");
  assert.equal(paymentStatus(0, 0), "Unpaid");
});

test("isValidMonth accepts only valid YYYY-MM values", () => {
  assert.equal(isValidMonth("2026-10"), true);
  assert.equal(isValidMonth("2026-00"), false);
  assert.equal(isValidMonth("2026-13"), false);
  assert.equal(isValidMonth("26-10"), false);
});

test("numericRows converts selected database decimal fields", () => {
  assert.deepEqual(
    numericRows([{ id: 3, fee: "600.50", name: "Student" }], ["id", "fee"]),
    [{ id: 3, fee: 600.5, name: "Student" }],
  );
});
