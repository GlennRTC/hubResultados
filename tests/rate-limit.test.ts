// Tests for portal rate limiting (PORTAL-05)
// Implementation: src/lib/portal/rate-limit.ts

describe("checkRateLimit", () => {
  it.todo("allows attempt when fewer than 5 attempts in the last hour");
  it.todo("blocks attempt when 5 or more attempts exist in the last hour");
});

describe("recordAttempt", () => {
  it.todo("inserts a row into portal_auth_attempts table");
});
