import { NextRequest, NextResponse } from "next/server";

function extractDetail(data: any): string {
  if (!data) return "送信に失敗しました。";
  if (typeof data.detail === "string") return data.detail;
  if (Array.isArray(data.detail)) {
    // Pydantic/FASTAPI error list -> join messages
    const msgs = data.detail.map((d: any) => d?.msg || JSON.stringify(d));
    return msgs.join(" / ");
  }
  if (typeof data.message === "string") return data.message;
  if (typeof data.error === "string") return data.error;
  return "送信に失敗しました。";
}

export async function POST(request: NextRequest) {
  try {
    const { name, email, message } = await request.json();

    const backendUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

    // Map frontend payload -> FastAPI schema ({ body } not { message })
    const upstream = await fetch(`${backendUrl}/email/contact_form`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, body: message }),
    });

    const data = await upstream.json().catch(() => ({}));

    if (upstream.ok) {
      // FastAPI success shape: { success: true, message: "..." }
      return NextResponse.json(data, { status: 200 });
    }

    // FastAPI error shape: { detail: "..." }
    return NextResponse.json(
      { detail: extractDetail(data) || "送信に失敗しました。" },
      { status: upstream.status || 400 }
    );
  } catch {
    return NextResponse.json(
      { detail: "Internal server error" },
      { status: 500 }
    );
  }
}
