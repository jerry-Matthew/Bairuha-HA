import { NextRequest, NextResponse } from "next/server";
import { discoveryService } from "@/lib/discovery";
import { getFlowConfig } from "@/lib/config-flow/flow-type-resolver";
import { getFlowById } from "@/components/addDevice/server/config-flow.registry";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { flowId, integrationDomain } = body;

    if (!flowId && !integrationDomain) {
      return NextResponse.json(
        { error: "flowId or integrationDomain required" },
        { status: 400 }
      );
    }

    let domain = integrationDomain;
    let flowConfig;

    if (flowId) {
      const flow = await getFlowById(flowId);
      if (!flow) {
        return NextResponse.json({ error: "Flow not found" }, { status: 404 });
      }
      domain = flow.integrationDomain || integrationDomain;
      if (domain) {
        flowConfig = await getFlowConfig(domain);
      }
    } else if (integrationDomain) {
      flowConfig = await getFlowConfig(integrationDomain);
    }

    if (!domain) {
      return NextResponse.json(
        { error: "Integration domain required" },
        { status: 400 }
      );
    }

    // Refresh discovery (clear cache and rediscover)
    const devices = await discoveryService.refreshDiscovery(domain, flowConfig || undefined);

    return NextResponse.json({ devices });
  } catch (error: any) {
    console.error("[Discovery API] Error:", error);
    return NextResponse.json(
      { error: error.message || "Discovery refresh failed" },
      { status: 500 }
    );
  }
}
