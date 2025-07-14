export const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

// Debug logging
console.log('BACKEND_URL:', BACKEND_URL);
console.log('NEXT_PUBLIC_BACKEND_URL env var:', process.env.NEXT_PUBLIC_BACKEND_URL);

export async function post<T>(path: string, data: unknown): Promise<T> {
  const fullUrl = `${BACKEND_URL}${path}`;
  console.log('Making request to:', fullUrl);
  
  try {
    const res = await fetch(fullUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    
    console.log('Response status:', res.status);
    
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      console.error('Response error:', json);
      throw new Error(json.detail ?? "Server error");
    }
    
    const result = await res.json();
    console.log('Response success:', result);
    return result;
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
}
