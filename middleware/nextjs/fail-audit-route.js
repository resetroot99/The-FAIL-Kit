"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.failAuditRoute = failAuditRoute;
exports.failAuditSimple = failAuditSimple;
const server_1 = require("next/server");
/**
 * Create a Next.js API route handler for F.A.I.L. Kit evaluation
 */
function failAuditRoute(handlerOrOptions) {
    const options = typeof handlerOrOptions === 'function'
        ? { handler: handlerOrOptions, autoReceipts: true }
        : handlerOrOptions;
    const { handler, autoReceipts = true, actionLogger } = options;
    return async (req) => {
        try {
            const body = await req.json();
            const { prompt, context } = body;
            if (!prompt) {
                return server_1.NextResponse.json({ error: 'Missing required field: prompt' }, { status: 400 });
            }
            // Call the user's handler
            const result = await handler(prompt, context || {});
            // Auto-generate receipts if enabled and not provided
            let receipts = result.receipts || [];
            if (autoReceipts && (!receipts || receipts.length === 0) && result.actions) {
                receipts = result.actions.map((action, index) => ({
                    timestamp: new Date().toISOString(),
                    tool: action.tool || `tool_${index}`,
                    status: action.status || 'success',
                    proof: action.proof || `Action completed: ${action.tool || 'unknown'}`
                }));
            }
            // Log actions if logger provided
            if (actionLogger && result.actions) {
                try {
                    await actionLogger(result.actions, receipts);
                }
                catch (logError) {
                    console.error('Action logger error:', logError);
                }
            }
            return server_1.NextResponse.json({
                response: result.response || '',
                actions: result.actions || [],
                receipts: receipts
            });
        }
        catch (error) {
            console.error('F.A.I.L. Kit handler error:', error);
            return server_1.NextResponse.json({
                error: error.message || 'Internal server error',
                details: process.env.NODE_ENV === 'development' ? error.stack : undefined
            }, { status: 500 });
        }
    };
}
/**
 * Simple wrapper for agents that don't track actions
 */
function failAuditSimple(agentFunction) {
    return failAuditRoute({
        handler: async (prompt, context) => {
            const response = await agentFunction(prompt, context);
            // If response is a string, wrap it
            if (typeof response === 'string') {
                return {
                    response,
                    actions: [],
                    receipts: []
                };
            }
            // If response is already formatted, pass through
            return response;
        },
        autoReceipts: true
    });
}
