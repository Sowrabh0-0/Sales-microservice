const API_URL = process.env.NEXT_PUBLIC_API_URL!

export async function apiFetch<T>(
    path: string,
    options?: RequestInit
): Promise<T> {
    const res = await fetch(`${API_URL}${path}`, {
        headers: {
            "Content-Type": "application/json",
        },
        ...options,
    })

    if (!res.ok) {
        let message = "Something went wrong"
        try {
            const error = await res.json()
            message = error.detail ?? message
        } catch { }

        throw new Error(message)
    }

    return res.json()
}
