// Tests for patient portal authentication (PORTAL-02)
// Implementation: src/lib/portal/authenticate-portal.ts

// Mock rate limit module
jest.mock("@/lib/portal/rate-limit", () => ({
  checkRateLimit: jest.fn().mockResolvedValue({ allowed: true }),
  recordAttempt: jest.fn().mockResolvedValue(undefined),
}));

// Mock the Drizzle db client
// We intercept the chained call: db.select().from().innerJoin().where().limit()
const mockLimit = jest.fn();
const mockWhere = jest.fn(() => ({ limit: mockLimit }));
const mockInnerJoin = jest.fn(() => ({ where: mockWhere }));
const mockFrom = jest.fn(() => ({ innerJoin: mockInnerJoin }));
const mockSelect = jest.fn(() => ({ from: mockFrom }));

jest.mock("@/lib/db", () => ({
  db: {
    select: mockSelect,
  },
}));

import { authenticatePortal } from "@/lib/portal/authenticate-portal";
import { checkRateLimit, recordAttempt } from "@/lib/portal/rate-limit";

const mockCheckRateLimit = checkRateLimit as jest.Mock;

const VALID_ROW = {
  orderId: "order-uuid",
  pdfPath: "results/order-uuid.pdf",
  status: "delivered",
  docType: "CC",
  docNumber: "12345678",
  dob: "1990-01-15",
};

beforeEach(() => {
  jest.clearAllMocks();
  mockCheckRateLimit.mockResolvedValue({ allowed: true });
  mockLimit.mockResolvedValue([VALID_ROW]);
});

describe("authenticatePortal", () => {
  it("returns orderId and pdfPath on correct credentials", async () => {
    const result = await authenticatePortal("code123", "CC", "12345678", "1990-01-15");
    expect(result).toEqual({ success: true, orderId: "order-uuid", pdfPath: "results/order-uuid.pdf" });
  });

  it("returns generic error for wrong document number (no field hint)", async () => {
    mockLimit.mockResolvedValue([{ ...VALID_ROW, docNumber: "99999999" }]);
    const result = await authenticatePortal("code123", "CC", "12345678", "1990-01-15");
    expect(result).toEqual({ success: false, error: "Datos no coinciden" });
  });

  it("returns generic error for wrong DOB (no field hint)", async () => {
    mockLimit.mockResolvedValue([{ ...VALID_ROW, dob: "2000-01-01" }]);
    const result = await authenticatePortal("code123", "CC", "12345678", "1990-01-15");
    expect(result).toEqual({ success: false, error: "Datos no coinciden" });
  });

  it("returns generic error when verification_code does not exist", async () => {
    mockLimit.mockResolvedValue([]);
    const result = await authenticatePortal("badcode", "CC", "12345678", "1990-01-15");
    expect(result).toEqual({ success: false, error: "Datos no coinciden" });
  });

  it("returns rate limit error when blocked", async () => {
    mockCheckRateLimit.mockResolvedValue({ allowed: false });
    const result = await authenticatePortal("code123", "CC", "12345678", "1990-01-15");
    expect(result).toMatchObject({ success: false, error: expect.stringContaining("Demasiados intentos") });
  });
});
