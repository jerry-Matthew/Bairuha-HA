import { NextRequest, NextResponse } from "next/server";
import { addCard } from "@/components/dashboards/server/dashboard.registry";

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const body = await request.json();

        if (!body.type) {
            return NextResponse.json(
                { error: "Card type is required" },
                { status: 400 }
            );
        }

        const card = await addCard(params.id, {
            type: body.type,
            config: body.config || {},
            width: body.width || 1,
        });

        return NextResponse.json(card);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
