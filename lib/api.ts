export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string | null } = {}
): Promise<T> {
  const { token, ...init } = options;

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? body.error ?? `Request failed: ${res.status}`);
  }

  return res.json() as Promise<T>;
}

// Maps a handful of known backend error codes (see app/capacity.py etc.)
// to copy a player should actually see, instead of the raw code. Anything
// not in this map is returned unchanged.
const FRIENDLY_ERRORS: Record<string, string> = {
  SERVER_FULL: "Server ပြည့်နေပါသည်၊ ခဏစောင့်ပြီးမှ ထပ်ကြိုးစားပါ",
};

export function friendlyErrorMessage(raw: string): string {
  return FRIENDLY_ERRORS[raw] ?? raw;
}
