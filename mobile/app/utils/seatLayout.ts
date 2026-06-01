export type SeatLayoutSeat = {
  id: string;
  number: string;
  rowIndex: number;
  position: number;
  rowType: 'back' | 'regular';
};

export type SeatLayoutRow = {
  rowLabel: string;
  rowIndex: number;
  rowType: 'back' | 'regular';
  seats: SeatLayoutSeat[];
};

const BACK_ROW_SEATS = 5;
const STANDARD_ROW_SEATS = 4;

export const buildSeatRowSizes = (capacity: number): number[] => {
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

export const buildSeatLayout = (capacity: number): SeatLayoutRow[] =>
  buildSeatRowSizes(capacity).map((seatCount, rowIndex) => {
    const rowLabel = String.fromCharCode(65 + rowIndex);
    const rowType = rowIndex === 0 ? 'back' : 'regular';

    return {
      rowLabel,
      rowIndex,
      rowType,
      seats: Array.from({ length: seatCount }, (_, index) => ({
        id: `${rowLabel}${index + 1}`,
        number: `${rowLabel}${index + 1}`,
        rowIndex,
        position: index + 1,
        rowType,
      })),
    };
  });
