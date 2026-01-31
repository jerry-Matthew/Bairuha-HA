
import "dotenv/config";
import { getFlowById } from "./config-flow.registry";
import { query } from "@/lib/db";

async function checkFlow() {
    const flowId = "9fdcc9cf-cd43-474a-a5f1-6d6c608c2739";
    try {
        const res = await query("SELECT * FROM config_flows WHERE id = $1", [flowId]);
        console.log("Flow Record:", res[0]);

        if (res.length > 0) {
            const domain = res[0].integration_domain;
            console.log("Domain:", domain);

            // Check catalog
            const cat = await query("SELECT flow_config FROM integration_catalog WHERE domain = $1", [domain]);
            if (cat.length > 0) {
                console.log("Catalog Config:", JSON.stringify(cat[0].flow_config, null, 2));
            } else {
                console.log("No catalog entry found");
            }
        }
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}

checkFlow();
