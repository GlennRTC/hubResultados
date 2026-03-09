// Tests for portal rate limiting (PORTAL-05)
// Implementation: src/lib/portal/rate-limit.ts

const mockGte = jest.fn().mockReturnThis();
const mockEq = jest.fn().mockReturnThis();
const mockSelect = jest.fn().mockReturnThis();
const mockInsert = jest.fn().mockResolvedValue({ error: null });

// Supabase chain: from().select().eq().gte() or from().insert()
const mockFrom = jest.fn();

jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(() => ({
    from: mockFrom,
  })),
}));

// Must import AFTER mocks are set up
import { checkRateLimit, recordAttempt } from "@/lib/portal/rate-limit";

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
  mockGte.mockReset();
  mockEq.mockReset();
  mockSelect.mockReset();
  mockFrom.mockReset();
  mockInsert.mockReset();

  // Default chain for select path: from() -> { select } -> { eq } -> { gte }
  mockSelect.mockReturnValue({ eq: mockEq });
  mockEq.mockReturnValue({ gte: mockGte });
  mockFrom.mockReturnValue({ select: mockSelect, insert: mockInsert });
  mockInsert.mockResolvedValue({ error: null });
});

describe("checkRateLimit", () => {
  it("allows attempt when fewer than 5 attempts in the last hour", async () => {
    // count = 4 → should be allowed (4 < 5)
    mockGte.mockResolvedValue({ count: 4, error: null });
    const result = await checkRateLimit("test-code");
    expect(result).toEqual({ allowed: true });
  });

  it("blocks attempt when 5 or more attempts exist in the last hour", async () => {
    // count = 5 → should be blocked (5 >= 5)
    mockGte.mockResolvedValue({ count: 5, error: null });
    const result = await checkRateLimit("test-code");
    expect(result).toEqual({ allowed: false });
  });
});

describe("recordAttempt", () => {
  it("inserts a row into portal_auth_attempts table", async () => {
    await recordAttempt("test-code");
    expect(mockFrom).toHaveBeenCalledWith("portal_auth_attempts");
    expect(mockInsert).toHaveBeenCalledWith({ verification_code: "test-code" });
  });
});
