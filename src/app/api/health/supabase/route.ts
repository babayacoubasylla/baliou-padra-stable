import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        return NextResponse.json(
            {
                ok: false,
                service: "supabase",
                status: "missing_env",
                error: "Missing Supabase environment variables",
                timestamp: new Date().toISOString(),
            },
            { status: 500 }
        );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const start = Date.now();

    const { error } = await supabase
        .from("membres")
        .select("id")
        .limit(1);

    const latencyMs = Date.now() - start;

    if (error) {
        return NextResponse.json(
            {
                ok: false,
                service: "supabase",
                status: "unhealthy",
                latencyMs,
                error: error.message,
                timestamp: new Date().toISOString(),
            },
            { status: 500 }
        );
    }

    return NextResponse.json({
        ok: true,
        service: "supabase",
        status: "healthy",
        latencyMs,
        timestamp: new Date().toISOString(),
    });
}