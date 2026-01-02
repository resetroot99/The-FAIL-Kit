/**
 * F.A.I.L. Kit Evaluation Endpoint
 * 
 * This endpoint is used by the F.A.I.L. Kit CLI to audit your agent.
 */

import { failAuditRoute } from "@fail-kit/middleware-nextjs";
import { escalationAgent } from "@/lib/agent";

export const POST = failAuditRoute(async (prompt, context) => {
  // Call your agent
  const result = await escalationAgent(prompt);
  
  // Return the response in the expected format
  return {
    response: result.text,
    actions: result.actions,
    policy: result.policy,
    metadata: {
      sources: result.sources
    }
  };
});
