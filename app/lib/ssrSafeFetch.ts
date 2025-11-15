export function isBuildPhase(): boolean {
  return (
    process.env.NEXT_PHASE === 'phase-production-build' ||
    typeof window === 'undefined' && process.env.NODE_ENV === 'production' && !process.env.EXPRESS_URL
  );
}

export async function ssrSafeFetch<T>(
  url: string,
  options: RequestInit & { fallback: T }
): Promise<T> {
  if (isBuildPhase()) {
    console.log(`[SSR Safe Fetch] Build phase - returning fallback for ${url}`);
    return options.fallback;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!res.ok) {
      console.warn(`[SSR Safe Fetch] Failed (${res.status}) - using fallback for ${url}`);
      return options.fallback;
    }
    
    return await res.json();
  } catch (error) {
    console.warn(`[SSR Safe Fetch] Error - using fallback for ${url}:`, error);
    return options.fallback;
  }
}
