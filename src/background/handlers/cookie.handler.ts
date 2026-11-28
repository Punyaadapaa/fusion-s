// Shared Google auth cookies log the user into every Google service at once.
// Clearing or overwriting them (even from a subdomain session) signs the user
// out of Gemini, Classroom, YouTube, ... so they are never managed here.
const GOOGLE_AUTH_COOKIE_NAMES = new Set([
  "SID",
  "HSID",
  "SSID",
  "APISID",
  "SAPISID",
  "LSID",
  "OSID",
  "SIDCC",
  "__Secure-1PSID",
  "__Secure-3PSID",
  "__Secure-1PAPISID",
  "__Secure-3PAPISID",
  "__Secure-1PSIDTS",
  "__Secure-3PSIDTS",
  "__Secure-1PSIDCC",
  "__Secure-3PSIDCC",
  "__Host-GAPS",
  "__Host-1PLSID",
  "__Host-3PLSID",
  "__Host-APISID",
  "__Host-SAPISID",
  "ACCOUNT_CHOOSER",
  "AEC",
  "NID",
  "1P_JAR",
  "CONSENT",
  "SOCS",
]);

export function isGoogleHost(domain: string): boolean {
  return /(^|\.)google\.[a-z]{2,}(\.[a-z]{2,})?$/.test(domain);
}

export function shouldManageCookie(cookieDomain: string, cookieName: string, currentDomain: string): boolean {
  const sliced = cookieDomain.startsWith(".") ? cookieDomain.slice(1) : cookieDomain;
  const isExact = sliced === currentDomain || sliced === `www.${currentDomain}`;
  const isSubdomain = sliced.endsWith(`.${currentDomain}`);

  if (isGoogleHost(currentDomain)) {
    if (GOOGLE_AUTH_COOKIE_NAMES.has(cookieName)) {
      return false;
    }
    // Only this exact host - never the shared parent (.google.com) or sibling services.
    return isExact;
  }

  const isParent = currentDomain.endsWith(`.${sliced}`);
  return isExact || isSubdomain || isParent;
}

export class CookieHandler {
  async getCookiesForDomain(domain: string): Promise<chrome.cookies.Cookie[]> {
    try {
      const stores = await chrome.cookies.getAllCookieStores();
      const allCookies: chrome.cookies.Cookie[] = [];
      const currentDomain = domain.split(":")[0];

      for (const store of stores) {
        const cookies = await chrome.cookies.getAll({ storeId: store.id });
        const domainCookies = cookies.filter((cookie) => shouldManageCookie(cookie.domain, cookie.name, currentDomain));
        allCookies.push(...domainCookies);
      }

      return allCookies;
    } catch (error) {
      console.error("Error getting cookies for domain:", domain, error);
      return [];
    }
  }

  async clearCookiesForDomain(domain: string): Promise<void> {
    const cookies = await this.getCookiesForDomain(domain);
    const currentDomain = domain.split(":")[0];

    const clearPromises = cookies.map(async (cookie) => {
      if (!shouldManageCookie(cookie.domain, cookie.name, currentDomain)) {
        return;
      }

      try {
        await chrome.cookies.remove({
          url: this.buildCookieUrl(cookie, domain),
          name: cookie.name,
          storeId: cookie.storeId,
        });
      } catch (error) {
        console.warn("Failed to remove cookie:", cookie.name, error);
      }
    });

    await Promise.all(clearPromises);
  }

  async restoreCookies(cookies: chrome.cookies.Cookie[], domain: string): Promise<void> {
    const currentDomain = domain.split(":")[0];

    const restorePromises = cookies.map(async (cookie) => {
      if (!shouldManageCookie(cookie.domain, cookie.name, currentDomain)) {
        return;
      }

      try {
        await chrome.cookies.set(this.prepareCookieForRestore(cookie, domain));
      } catch (error) {
        console.warn("Failed to restore cookie:", cookie.name, error);
      }
    });

    await Promise.all(restorePromises);
  }

  private buildCookieUrl(cookie: chrome.cookies.Cookie, fallbackDomain?: string): string {
    const protocol = cookie.secure ? "https" : "http";
    let domain = cookie.domain;

    if (domain.startsWith(".")) {
      domain = domain.slice(1);
    }

    if (!domain && fallbackDomain) {
      domain = fallbackDomain;
    }

    if (!domain) {
      throw new Error(`Invalid domain for cookie ${cookie.name}: ${cookie.domain}`);
    }

    const path = cookie.path || "/";
    return `${protocol}://${domain}${path}`;
  }

  private prepareCookieForRestore(cookie: chrome.cookies.Cookie, fallbackDomain: string): chrome.cookies.SetDetails {
    const url = this.buildCookieUrl(cookie, fallbackDomain);

    const cookieDetails: chrome.cookies.SetDetails = {
      url,
      name: cookie.name,
      value: cookie.value,
      path: cookie.path,
      secure: cookie.secure,
      httpOnly: cookie.httpOnly,
      storeId: cookie.storeId,
    };

    if (cookie.domain && cookie.domain.startsWith(".")) {
      cookieDetails.domain = cookie.domain;
    }

    if (!cookie.session && cookie.expirationDate) {
      cookieDetails.expirationDate = cookie.expirationDate;
    }

    if (cookie.sameSite && cookie.sameSite !== "unspecified") {
      cookieDetails.sameSite = cookie.sameSite;
    }

    return cookieDetails;
  }
}
