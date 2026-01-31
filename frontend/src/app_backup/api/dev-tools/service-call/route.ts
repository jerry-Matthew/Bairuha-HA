/**
 * Service Call Testing API
 * POST /api/dev-tools/service-call
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { getServiceCallTester } from "@/lib/dev-tools/service-call-tester";

export const dynamic = "force-dynamic";

export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { domain, service, serviceData } = body;

    if (!domain || !service) {
      return NextResponse.json(
        { error: "domain and service are required" },
        { status: 400 }
      );
    }

    const tester = getServiceCallTester();
    const result = await tester.testServiceCall({
      domain,
      service,
      serviceData: serviceData || {},
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Service call testing API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to execute service call" },
      { status: 500 }
    );
  }
});
