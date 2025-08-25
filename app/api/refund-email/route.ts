// app/api/refund-email/route.ts
import { NextRequest, NextResponse } from "next/server";

function normalizeDetail(data: any): string {
  if (!data) return "送信に失敗しました。";
  if (typeof data.detail === "string") return data.detail;
  if (Array.isArray(data.detail)) {
    const msgs = data.detail.map((d: any) => d?.msg || JSON.stringify(d));
    return msgs.join(" / ");
  }
  if (typeof data.message === "string") return data.message;
  if (typeof data.error === "string") return data.error;
  return "送信に失敗しました。";
}

export async function POST(req: NextRequest) {
  try {
    const { email, event_name, amount, currency, status, adminNotes } = await req.json();
    const backend = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

    const upstream = await fetch(`${backend}/email/refund`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        email, 
        event_name, 
        amount, 
        currency, 
        status, 
        adminNotes 
      }),
    });

    const data = await upstream.json().catch(() => ({}));
    if (upstream.ok) {
      return NextResponse.json(data, { status: 200 });
    }
    return NextResponse.json(
      { detail: normalizeDetail(data) },
      { status: upstream.status || 400 }
    );
  } catch {
    return NextResponse.json({ detail: "Internal server error" }, { status: 500 });
  }
} 