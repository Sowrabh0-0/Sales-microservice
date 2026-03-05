const API_URL = process.env.NEXT_PUBLIC_API_URL!

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("token")
      : null

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  })

  if (res.status === 401) {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token")
      window.location.href = "/auth/login"
    }

    throw new Error("Session expired")
  }

  if (!res.ok) {
    let message = "Something went wrong"

    try {
      const error = await res.json()
      message = error.error ?? error.detail ?? message
    } catch {}

    throw new Error(message)
  }

  return res.json()
}