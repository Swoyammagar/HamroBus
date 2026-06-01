const BACK_ROW_SEATS = 5;
const STANDARD_ROW_SEATS = 4;

const buildRowSizes = (capacity) => {
  const count = Number(capacity);
  if (!Number.isInteger(count) || count <= 0) {
    return [];
  }

  if (count <= BACK_ROW_SEATS) {
    return [count];
  }

  const rows = [BACK_ROW_SEATS];
  const remaining = count - BACK_ROW_SEATS;
  const standardRows = Math.floor(remaining / STANDARD_ROW_SEATS);
  const remainder = remaining % STANDARD_ROW_SEATS;

  if (remainder === 1 && standardRows > 0) {
    for (let i = 0; i < standardRows - 1; i += 1) {
      rows.push(STANDARD_ROW_SEATS);
    }
    rows.push(3, 2);
    return rows;
  }

  for (let i = 0; i < standardRows; i += 1) {
    rows.push(STANDARD_ROW_SEATS);
  }

  if (remainder > 0) {
    rows.push(remainder);
  }

  return rows;
};

const buildSeatLayout = (capacity) =>
  buildRowSizes(capacity).map((seatCount, rowIndex) => ({
    rowLabel: String.fromCharCode(65 + rowIndex),
    rowIndex,
    seatCount,
    rowType: rowIndex === 0 ? 'back' : 'regular',
    seats: Array.from({ length: seatCount }, (_, index) => ({
      id: `${String.fromCharCode(65 + rowIndex)}${index + 1}`,
      rowIndex,
      position: index + 1,
      rowType: rowIndex === 0 ? 'back' : 'regular',
    })),
  }));

const buildSeatLabelMap = (capacity) =>
  buildSeatLayout(capacity).flatMap((row) => row.seats.map((seat) => seat.id));

module.exports = {
  buildRowSizes,
  buildSeatLayout,
  buildSeatLabelMap,
};
