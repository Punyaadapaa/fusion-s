export class CookieHandler {
  async getCookiesForDomain(domain: string): Promise<chrome.cookies.Cookie[]> {
    try {
      const stores = await chrome.cookies.getAllCookieStores();
      const allCookies: chrome.cookies.Cookie[] = [];
      const currentDomain = domain.split(":")[0];

      for (const store of stores) {
        const cookies = await chrome.cookies.getAll({ storeId: store.id });
        const domainCookies = cookies.filter((cookie) => {
          const slicedCookieDomain = cookie.domain.startsWith(".") ? cookie.domain.slice(1) : cookie.domain;

          // Exact match or subdomain of current domain
          const isExactMatch = slicedCookieDomain === currentDomain || slicedCookieDomain === `www.${currentDomain}`;

          // Cookie is for a subdomain of current domain (e.g., cookie for gemini.google.com when on gemini.google.com)
          const isSubdomainMatch = slicedCookieDomain.endsWith(`.${currentDomain}`);

          // Cookie domain is parent of current domain (e.g., cookie for .google.com when on gemini.google.com)
          // Only include if it's an exact subdomain match (not a broad parent domain)
          const isParentMatch = currentDomain.endsWith(`.${slicedCookieDomain}`);

          // For Google domains, be more precise - only capture cookies that exactly match the hostname
          // or are subdomains, NOT broad parent domain cookies that span across all Google services
          const isGoogleDomain = currentDomain.endsWith(".google.com") || slicedCookieDomain.endsWith(".google.com");

          if (isGoogleDomain) {
            // For Google: only capture cookies that exactly match or are subdomains of current hostname
            return isExactMatch || isSubdomainMatch;
          }

          return isExactMatch || isSubdomainMatch || isParentMatch;
        });
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

    const clearPromises = cookies.map(async (cookie) => {
      try {
        // Only clear cookies that are specific to this exact hostname or its subdomains
        // Don't clear broad parent domain cookies (e.g., .google.com) that affect other services
        const slicedCookieDomain = cookie.domain.startsWith(".") ? cookie.domain.slice(1) : cookie.domain;
        const currentDomain = domain.split(":")[0];

        const isExactMatch = slicedCookieDomain === currentDomain || slicedCookieDomain === `www.${currentDomain}`;
        const isSubdomainMatch = slicedCookieDomain.endsWith(`.${currentDomain}`);
        const isGoogleDomain = currentDomain.endsWith(".google.com") || slicedCookieDomain.endsWith(".google.com");

        // For Google domains, only clear exact/subdomain matches
        // For other domains, also clear parent domain matches
        const shouldClear = isGoogleDomain
          ? isExactMatch || isSubdomainMatch
          : isExactMatch || isSubdomainMatch || currentDomain.endsWith(`.${slicedCookieDomain}`);

        if (!shouldClear) {
          return; // Skip broad parent domain cookies
        }

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
    const restorePromises = cookies.map(async (cookie) => {
      try {
        // Only restore cookies that were specifically captured for this domain
        // Skip broad parent domain cookies that shouldn't be overwritten
        const slicedCookieDomain = cookie.domain.startsWith(".") ? cookie.domain.slice(1) : cookie.domain;
        const currentDomain = domain.split(":")[0];

        const isExactMatch = slicedCookieDomain === currentDomain || slicedCookieDomain === `www.${currentDomain}`;
        const isSubdomainMatch = slicedCookieDomain.endsWith(`.${currentDomain}`);
        const isGoogleDomain = currentDomain.endsWith(".google.com") || slicedCookieDomain.endsWith(".google.com");

        const shouldRestore = isGoogleDomain
          ? isExactMatch || isSubdomainMatch
          : isExactMatch || isSubdomainMatch || currentDomain.endsWith(`.${slicedCookieDomain}`);

        if (!shouldRestore) {
          return; // Skip broad parent domain cookies
        }

        const cookieDetails = this.prepareCookieForRestore(cookie, domain);

        await chrome.cookies.set(cookieDetails);
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
