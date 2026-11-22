export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;

  return (...args: Parameters<T>) => {
    lastArgs = args;
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      if (lastArgs) {
        fn(...lastArgs);
        lastArgs = null;
      }
      timeoutId = null;
    }, delay);
  };
}

export function debounceAsync<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => Promise<void> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;

  return async (...args: Parameters<T>) => {
    lastArgs = args;
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    return new Promise<void>((resolve, reject) => {
      timeoutId = setTimeout(async () => {
        if (lastArgs) {
          try {
            await fn(...lastArgs);
            lastArgs = null;
            resolve();
          } catch (error) {
            lastArgs = null;
            reject(error);
          }
        } else {
          resolve();
        }
        timeoutId = null;
      }, delay);
    });
  };
}

export class Debouncer {
  private timeouts = new Map<string, ReturnType<typeof setTimeout>>();
  private pendingPromises = new Map<string, Promise<unknown>>();

  debounce(key: string, fn: () => void, delay: number): void {
    const existing = this.timeouts.get(key);
    if (existing) {
      clearTimeout(existing);
    }
    const timeoutId = setTimeout(() => {
      fn();
      this.timeouts.delete(key);
    }, delay);
    this.timeouts.set(key, timeoutId);
  }

  async debounceAsync<T>(key: string, fn: () => Promise<T>, delay: number): Promise<T> {
    const existing = this.timeouts.get(key);
    if (existing) {
      clearTimeout(existing);
    }

    // Return existing pending promise if available
    const pending = this.pendingPromises.get(key);
    if (pending) {
      return pending as Promise<T>;
    }

    const promise = new Promise<T>((resolve, reject) => {
      const timeoutId = setTimeout(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.timeouts.delete(key);
          this.pendingPromises.delete(key);
        }
      }, delay);
      this.timeouts.set(key, timeoutId);
    });

    this.pendingPromises.set(key, promise);
    return promise;
  }

  /**
   * Flush all pending debounced operations (for testing)
   */
  flush(): Promise<unknown>[] {
    const promises = Array.from(this.pendingPromises.values());
    this.timeouts.forEach((timeoutId) => clearTimeout(timeoutId));
    this.timeouts.clear();
    this.pendingPromises.clear();
    return promises;
  }

  cancel(key: string): void {
    const existing = this.timeouts.get(key);
    if (existing) {
      clearTimeout(existing);
      this.timeouts.delete(key);
    }
    this.pendingPromises.delete(key);
  }

  cancelAll(): void {
    this.timeouts.forEach((timeoutId) => clearTimeout(timeoutId));
    this.timeouts.clear();
    this.pendingPromises.clear();
  }
}
