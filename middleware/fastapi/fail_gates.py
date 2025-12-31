"""
F.A.I.L. Kit - FastAPI Middleware

Drop-in middleware for enforcing agent integrity gates in FastAPI apps.

Usage:
    from fail_gates import FAILGatesMiddleware
    app.add_middleware(FAILGatesMiddleware)
"""

import re
import json
import hashlib
from typing import Dict, List, Any, Optional
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response, JSONResponse


class FAILGatesConfig:
    """Configuration for F.A.I.L. gates"""
    
    def __init__(
        self,
        enforce_receipts: bool = True,
        enforce_tool_failures: bool = True,
        enforce_policy_escalation: bool = True,
        action_verbs: Optional[List[str]] = None,
        escalation_patterns: Optional[List[str]] = None
    ):
        self.enforce_receipts = enforce_receipts
        self.enforce_tool_failures = enforce_tool_failures
        self.enforce_policy_escalation = enforce_policy_escalation
        
        self.action_verbs = action_verbs or [
            'sent', 'send', 'emailed', 'email',
            'updated', 'update', 'modified', 'modify',
            'deleted', 'delete', 'removed', 'remove',
            'created', 'create', 'added', 'add',
            'transferred', 'transfer', 'moved', 'move',
            'scheduled', 'schedule', 'booked', 'book',
            'cancelled', 'cancel', 'revoked', 'revoke'
        ]
        
        self.escalation_patterns = [
            re.compile(pattern, re.IGNORECASE)
            for pattern in (escalation_patterns or [
                r'transfer.*money',
                r'send.*payment',
                r'withdraw',
                r'purchase',
                r'sign.*contract',
                r'legal.*document',
                r'terminate.*agreement',
                r'go to hell',
                r'fuck',
                r'fire.*employee',
                r'social security',
                r'credit card',
                r'password'
            ])
        ]


class FAILGatesMiddleware(BaseHTTPMiddleware):
    """Middleware that enforces agent integrity gates"""
    
    def __init__(self, app, config: Optional[FAILGatesConfig] = None):
        super().__init__(app)
        self.config = config or FAILGatesConfig()
    
    async def dispatch(self, request: Request, call_next):
        # Get the response from the application
        response = await call_next(request)
        
        # Only process JSON responses
        if response.headers.get('content-type', '').startswith('application/json'):
            # Read response body
            body = b''
            async for chunk in response.body_iterator:
                body += chunk
            
            try:
                data = json.loads(body.decode())
                
                # Apply gates
                gated_data = self.apply_gates(request, data)
                
                # Log violations
                if '_gate_violation' in gated_data:
                    print(f"[F.A.I.L. Gates] Violation: {gated_data['_gate_violation']}")
                    del gated_data['_gate_violation']
                
                # Return gated response
                return JSONResponse(content=gated_data, status_code=response.status_code)
            
            except json.JSONDecodeError:
                pass
        
        return response
    
    def apply_gates(self, request: Request, response: Dict[str, Any]) -> Dict[str, Any]:
        """Apply all gates to agent response"""
        gated = response.copy()
        
        # Gate 1: Action receipt enforcement
        if self.config.enforce_receipts:
            gated = self.enforce_action_receipts(gated)
        
        # Gate 2: Tool failure handling
        if self.config.enforce_tool_failures:
            gated = self.enforce_tool_failure_handling(gated)
        
        # Gate 3: Policy escalation
        if self.config.enforce_policy_escalation:
            # Try to extract user input from request
            user_input = ""
            if hasattr(request, '_body'):
                try:
                    body = json.loads(request._body)
                    user_input = body.get('inputs', {}).get('user', '') or body.get('user', '')
                except:
                    pass
            
            gated = self.enforce_policy_escalation(user_input, gated)
        
        return gated
    
    def enforce_action_receipts(self, response: Dict[str, Any]) -> Dict[str, Any]:
        """Gate 1: Enforce action receipts"""
        if 'outputs' not in response:
            return response
        
        output_text = (response['outputs'].get('final_text', '')).lower()
        claims_action = any(verb in output_text for verb in self.config.action_verbs)
        
        if claims_action:
            has_receipts = bool(response.get('actions'))
            
            if not has_receipts:
                return {
                    'outputs': {
                        'final_text': 'I cannot confirm that action was completed. No execution receipt available.',
                        'decision': 'ABSTAIN'
                    },
                    'policy': {
                        'refuse': False,
                        'abstain': True,
                        'escalate': False,
                        'reasons': ['claimed action without receipt']
                    },
                    'actions': [],
                    '_gate_violation': 'action_without_receipt'
                }
        
        return response
    
    def enforce_tool_failure_handling(self, response: Dict[str, Any]) -> Dict[str, Any]:
        """Gate 2: Enforce tool failure handling"""
        actions = response.get('actions', [])
        
        if not actions:
            return response
        
        has_failed_tool = any(action.get('status') == 'failed' for action in actions)
        
        if has_failed_tool and response.get('outputs', {}).get('decision') == 'PASS':
            return {
                'outputs': {
                    'final_text': 'I encountered an error while processing your request. Please try again or contact support.',
                    'decision': 'FAIL'
                },
                'policy': {
                    'refuse': False,
                    'abstain': False,
                    'escalate': True,
                    'reasons': ['tool failure detected']
                },
                'actions': actions,
                '_gate_violation': 'tool_failure_ignored'
            }
        
        return response
    
    def enforce_policy_escalation(self, user_input: str, response: Dict[str, Any]) -> Dict[str, Any]:
        """Gate 3: Enforce policy escalation"""
        should_escalate = any(pattern.search(user_input) for pattern in self.config.escalation_patterns)
        
        if should_escalate and not response.get('policy', {}).get('escalate'):
            return {
                'outputs': {
                    'final_text': 'This request requires human review before I can proceed.',
                    'decision': 'NEEDS_REVIEW'
                },
                'policy': {
                    'refuse': False,
                    'abstain': False,
                    'escalate': True,
                    'reasons': ['high-stakes request detected']
                },
                'actions': response.get('actions', []),
                '_gate_violation': 'missing_escalation'
            }
        
        return response


def hash_data(data: Any) -> str:
    """Hash data for verification"""
    serialized = json.dumps(data, sort_keys=True)
    hash_obj = hashlib.sha256(serialized.encode())
    return f"sha256:{hash_obj.hexdigest()}"
