import { isGoogleHost, shouldManageCookie } from "@background/handlers/cookie.handler";
import { describe, expect, test } from "@jest/globals";

describe("isGoogleHost", () => {
  test("matches bare and subdomain Google hosts", () => {
    expect(isGoogleHost("google.com")).toBe(true);
    expect(isGoogleHost("www.google.com")).toBe(true);
    expect(isGoogleHost("gemini.google.com")).toBe(true);
    expect(isGoogleHost("classroom.google.com")).toBe(true);
    expect(isGoogleHost("google.co.id")).toBe(true);
  });

  test("does not match unrelated hosts", () => {
    expect(isGoogleHost("example.com")).toBe(false);
    expect(isGoogleHost("notgoogle.com")).toBe(false);
    expect(isGoogleHost("googleapis.com")).toBe(false);
  });
});

describe("shouldManageCookie", () => {
  test("never touches shared Google auth cookies", () => {
    expect(shouldManageCookie(".google.com", "SID", "google.com")).toBe(false);
    expect(shouldManageCookie(".google.com", "__Secure-1PSID", "gemini.google.com")).toBe(false);
    expect(shouldManageCookie(".google.co.id", "SAPISID", "google.co.id")).toBe(false);
  });

  test("does not touch the shared parent domain from a Google subdomain", () => {
    expect(shouldManageCookie(".google.com", "_ga", "gemini.google.com")).toBe(false);
    expect(shouldManageCookie(".google.com", "_ga", "classroom.google.com")).toBe(false);
  });

  test("manages only non-auth cookies on the exact Google host", () => {
    expect(shouldManageCookie("gemini.google.com", "gemini_pref", "gemini.google.com")).toBe(true);
    expect(shouldManageCookie(".google.com", "_ga", "google.com")).toBe(true);
  });

  test("does not clear sibling Google services from google.com", () => {
    expect(shouldManageCookie("mail.google.com", "mail_pref", "google.com")).toBe(false);
  });

  test("keeps parent/subdomain behaviour for non-Google domains", () => {
    expect(shouldManageCookie(".example.com", "session", "example.com")).toBe(true);
    expect(shouldManageCookie("sub.example.com", "session", "example.com")).toBe(true);
    expect(shouldManageCookie("example.com", "session", "sub.example.com")).toBe(true);
    expect(shouldManageCookie("other.com", "session", "example.com")).toBe(false);
  });
});
