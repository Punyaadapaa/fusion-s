import { getCookieScope, isGoogleHost, shouldManageCookie } from "@background/handlers/cookie.handler";
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

describe("getCookieScope", () => {
  test("folds every Google service into one scope", () => {
    expect(getCookieScope("google.com")).toBe("google.com");
    expect(getCookieScope("www.google.com")).toBe("google.com");
    expect(getCookieScope("gemini.google.com")).toBe("google.com");
    expect(getCookieScope("classroom.google.com")).toBe("google.com");
    expect(getCookieScope("google.co.id")).toBe("google.co.id");
  });

  test("keeps other hosts unchanged", () => {
    expect(getCookieScope("example.com")).toBe("example.com");
    expect(getCookieScope("sub.example.com")).toBe("sub.example.com");
  });
});

describe("shouldManageCookie", () => {
  test("manages the whole Google family, auth cookies included", () => {
    expect(shouldManageCookie(".google.com", "google.com")).toBe(true);
    expect(shouldManageCookie("gemini.google.com", "google.com")).toBe(true);
    expect(shouldManageCookie("accounts.google.com", "google.com")).toBe(true);
    expect(shouldManageCookie("mail.google.com", "google.com")).toBe(true);
  });

  test("does not mix Google TLDs", () => {
    expect(shouldManageCookie(".google.co.id", "google.com")).toBe(false);
  });

  test("keeps parent/subdomain behaviour for non-Google domains", () => {
    expect(shouldManageCookie(".example.com", "example.com")).toBe(true);
    expect(shouldManageCookie("sub.example.com", "example.com")).toBe(true);
    expect(shouldManageCookie("example.com", "sub.example.com")).toBe(true);
    expect(shouldManageCookie("other.com", "example.com")).toBe(false);
  });
});
