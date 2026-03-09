// Tests for QR verification page data (PORTAL-06)
// Implementation: src/lib/portal/get-verification-data.ts

// Mock the Drizzle db client
// Chain: db.select().from().innerJoin().innerJoin().leftJoin().where().limit()
const mockLimit = jest.fn();
const mockWhere = jest.fn(() => ({ limit: mockLimit }));
const mockLeftJoin = jest.fn(() => ({ where: mockWhere }));
const mockInnerJoin2 = jest.fn(() => ({ leftJoin: mockLeftJoin }));
const mockInnerJoin1 = jest.fn(() => ({ innerJoin: mockInnerJoin2 }));
const mockFrom = jest.fn(() => ({ innerJoin: mockInnerJoin1 }));
const mockSelect = jest.fn(() => ({ from: mockFrom }));

jest.mock("@/lib/db", () => ({
  db: {
    select: mockSelect,
  },
}));

import { getVerificationData } from "@/lib/portal/get-verification-data";

const MOCK_ROW = {
  labName: "Lab Central",
  firstName: "Ana",
  lastName: "García",
  orderCreatedAt: new Date("2026-03-01T00:00:00Z"),
  validatedAt: new Date("2026-03-02T00:00:00Z"),
  validatedByName: "Dr. Pérez",
};

beforeEach(() => {
  jest.clearAllMocks();
  mockLimit.mockResolvedValue([MOCK_ROW]);
});

describe("getVerificationData", () => {
  it("returns lab name, partial patient name, order date, validation date for valid code", async () => {
    const data = await getVerificationData("valid-code");
    expect(data).not.toBeNull();
    expect(data!.labName).toBe("Lab Central");
    expect(data!.patientPartialName).toBe("Ana G.");
    expect(data!.orderDate).toBe(new Date("2026-03-01T00:00:00Z").toISOString());
    expect(data!.validatedAt).toBe(new Date("2026-03-02T00:00:00Z").toISOString());
    expect(data!.validatedByName).toBe("Dr. Pérez");
  });

  it("returns null for unknown verification_code", async () => {
    mockLimit.mockResolvedValue([]);
    const data = await getVerificationData("unknown-code");
    expect(data).toBeNull();
  });
});
