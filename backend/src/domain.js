export function paymentStatus(amount, monthlyFee) {
  const paid = Number(amount);
  const fee = Number(monthlyFee);

  if (paid >= fee && fee > 0) return "Paid";
  if (paid > 0) return "Partial";
  return "Unpaid";
}

export function isValidMonth(value) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return false;
  const year = Number(value.slice(0, 4));
  return year >= 1000 && year <= 9999;
}

export function numericRows(rows, fields) {
  return rows.map((row) => {
    const result = { ...row };
    for (const field of fields) {
      if (result[field] !== null && result[field] !== undefined) {
        result[field] = Number(result[field]);
      }
    }
    return result;
  });
}
