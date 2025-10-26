import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // ✅ Construct a clean payload object to send to the print server
    const payload = {
      transactionId: body.transactionId,
      customerName: body.customerName,
      total: body.total,
      date: body.date,
      items: body.items?.map((i: any) => ({
        id: i.id,
        name: i.name,
        quantity: i.quantity,
        price: i.price,
      })),
    };

    const response = await fetch("http://localhost:3001/print", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    let data;
    try {
      data = await response.json();
    } catch {
      data = { success: false, error: "Invalid response from print server" };
    }

    return NextResponse.json(data, { status: response.ok ? 200 : 500 });
  } catch (error: any) {
    console.error("Error in /api/print:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
