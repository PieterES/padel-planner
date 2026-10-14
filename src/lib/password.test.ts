import { describe, expect, it } from "vitest";
import {
  clearLoginFailures,
  hashPassword,
  loginLocked,
  passwordProblem,
  recordLoginFailure,
  verifyPassword,
} from "./password";

describe("password hashing", () => {
  it("verifies the right password and rejects others", () => {
    const stored = hashPassword("padel123");
    expect(stored).toMatch(/^scrypt\$[0-9a-f]{32}\$[0-9a-f]{128}$/);
    expect(verifyPassword("padel123", stored)).toBe(true);
    expect(verifyPassword("padel124", stored)).toBe(false);
    expect(verifyPassword("padel123", null)).toBe(false);
    expect(verifyPassword("padel123", "garbage")).toBe(false);
  });

  it("salts: same password, different hashes", () => {
    expect(hashPassword("same-password")).not.toBe(hashPassword("same-password"));
  });
});

describe("passwordProblem", () => {
  it("enforces length and confirmation", () => {
    expect(passwordProblem("12345")).toMatch(/at least 6/);
    expect(passwordProblem("123456")).toBeNull();
    expect(passwordProblem("123456", "123457")).toMatch(/don’t match/);
    expect(passwordProblem("123456", "123456")).toBeNull();
  });
});

describe("login lockout", () => {
  it("locks a name after 5 failures for a minute, case-insensitively", () => {
    const t = 1_000_000;
    for (let i = 0; i < 4; i++) recordLoginFailure("Anna", t);
    expect(loginLocked("anna", t)).toBe(false);
    recordLoginFailure("ANNA", t);
    expect(loginLocked("anna", t + 1)).toBe(true);
    expect(loginLocked("anna", t + 61_000)).toBe(false);
    clearLoginFailures("Anna");
    expect(loginLocked("anna", t + 1)).toBe(false);
  });
});
