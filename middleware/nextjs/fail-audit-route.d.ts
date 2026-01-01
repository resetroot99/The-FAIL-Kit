/**
 * F.A.I.L. Kit Next.js API Route Helper
 *
 * Drop this into your Next.js app/api directory to add the evaluation endpoint.
 *
 * Usage (app/api/eval/run/route.ts):
 *
 * import { failAuditRoute } from '@fail-kit/middleware-nextjs';
 *
 * export const POST = failAuditRoute(async (prompt, context) => {
 *   const result = await yourAgent.process(prompt);
 *   return {
 *     response: result.text,
 *     actions: result.actions,
 *     receipts: result.receipts
 *   };
 * });
 */
import { NextRequest, NextResponse } from 'next/server';
export interface FailAuditAction {
    tool: string;
    input?: any;
    output?: any;
    status?: 'success' | 'failed';
    proof?: string;
}
export interface FailAuditReceipt {
    timestamp: string;
    tool: string;
    status: 'success' | 'failed';
    proof: string;
}
export interface FailAuditResponse {
    response: string;
    actions: FailAuditAction[];
    receipts: FailAuditReceipt[];
}
export type FailAuditHandler = (prompt: string, context: Record<string, any>) => Promise<FailAuditResponse>;
export interface FailAuditOptions {
    handler: FailAuditHandler;
    autoReceipts?: boolean;
    actionLogger?: (actions: FailAuditAction[], receipts: FailAuditReceipt[]) => Promise<void>;
}
/**
 * Create a Next.js API route handler for F.A.I.L. Kit evaluation
 */
export declare function failAuditRoute(handlerOrOptions: FailAuditHandler | FailAuditOptions): (req: NextRequest) => Promise<NextResponse>;
/**
 * Simple wrapper for agents that don't track actions
 */
export declare function failAuditSimple(agentFunction: (prompt: string, context: Record<string, any>) => Promise<string | FailAuditResponse>): (req: NextRequest) => Promise<NextResponse>;
//# sourceMappingURL=fail-audit-route.d.ts.map