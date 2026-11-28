// Google shares one auth cookie set (.google.com) across every service. All
// Google hosts must therefore use the same cookie scope, otherwise a session
// saved on Gemini and a switch on Classroom operate on different cookie sets.
const GOOGLE_REGISTRABLE_DOMAIN = /(?:^|\.)(google\.[a-z]{2,}(?:\.[a-z]{2,})?)$/;

export function isGoogleHost(domain: string): boolean {
  return GOOGLE_REGISTRABLE_DOMAIN.test(domain);
}

export function getCookieScope(domain: string): string {
  const host = domain.split(":")[0];
  const match = host.match(GOOGLE_REGISTRABLE_DOMAIN);
  return match ? match[1] : host;
}

export function shouldManageCookie(cookieDomain: string, scope: string): boolean {
  const sliced = cookieDomain.startsWith(".") ? cookieDomain.slice(1) : cookieDomain;

  if (isGoogleHost(scope)) {
    // Whole Google family, shared auth cookies included, so account switching works.
    return sliced === scope || sliced.endsWith(`.${scope}`);
  }

  const isExact = sliced === scope || sliced === `www.${scope}`;
  const isSubdomain = sliced.endsWith(`.${scope}`);
  const isParent = scope.endsWith(`.${sliced}`);
  return isExact || isSubdomain || isParent;
}

export class CookieHandler {
  async getCookiesForDomain(domain: string): Promise<chrome.cookies.Cookie[]> {
    try {
      const stores = await chrome.cookies.getAllCookieStores();
      const allCookies: chrome.cookies.Cookie[] = [];
      const scope = getCookieScope(domain);

      for (const store of stores) {
        const cookies = await chrome.cookies.getAll({ storeId: store.id });
        allCookies.push(...cookies.filter((cookie) => shouldManageCookie(cookie.domain, scope)));
      }

      return allCookies;
    } catch (error) {
      console.error("Error getting cookies for domain:", domain, error);
      return [];
    }
  }

  /**
   * Removes cookies in this domain's scope. When `onlyNames` is given, only
   * those cookie names are removed - used when switching so a saved session
   * that predates auth capture cannot wipe the live login.
   */
  async clearCookiesForDomain(domain: string, onlyNames?: Set<string>): Promise<void> {
    const cookies = (await this.getCookiesForDomain(domain)).filter(
      (cookie) => !onlyNames || onlyNames.has(cookie.name)
    );

    await Promise.all(
      cookies.map(async (cookie) => {
        try {
          await chrome.cookies.remove({
            url: this.buildCookieUrl(cookie, domain),
            name: cookie.name,
            storeId: cookie.storeId,
            ...(cookie.partitionKey ? { partitionKey: cookie.partitionKey } : {}),
          });
        } catch (error) {
          console.warn("Failed to remove cookie:", cookie.name, error);
        }
      })
    );
  }

  async restoreCookies(cookies: chrome.cookies.Cookie[], domain: string): Promise<void> {
    const scope = getCookieScope(domain);
    const nowSeconds = Date.now() / 1000;

    await Promise.all(
      cookies
        .filter((cookie) => shouldManageCookie(cookie.domain, scope))
        .filter((cookie) => cookie.session || !cookie.expirationDate || cookie.expirationDate > nowSeconds)
        .map(async (cookie) => {
          try {
            await chrome.cookies.set(this.prepareCookieForRestore(cookie, domain));
          } catch (error) {
            console.warn("Failed to restore cookie:", cookie.name, error);
          }
        })
    );
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
      ...(cookie.partitionKey ? { partitionKey: cookie.partitionKey } : {}),
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
