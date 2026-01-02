# Source Location Tracking

F.A.I.L. Kit supports capturing and displaying source location information for failures, making it easy to pinpoint exactly where in your codebase an issue occurred.

## Response Schema

To enable source location tracking, include a `source_location` object in your agent's response:

```json
{
  "outputs": {
    "final_text": "Processing complete",
    "decision": "success"
  },
  "source_location": {
    "file": "src/agents/order_processor.py",
    "function": "process_order",
    "line": 142,
    "column": 12,
    "stack_trace": "Traceback (most recent call last):\n  File \"src/agents/order_processor.py\", line 142, in process_order\n    result = validate_order(order_data)\n  File \"src/utils/validation.py\", line 67, in validate_order\n    raise ValidationError('Invalid order')"
  }
}
```

## Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | string | Yes | Relative path to the source file from project root |
| `function` | string | No | Name of the function where the issue occurred |
| `line` | integer | No | Line number in the source file |
| `column` | integer | No | Column number (for precise location) |
| `stack_trace` | string | No | Full stack trace for errors |

## Implementation Examples

### Python (FastAPI)

```python
from fail_kit import fail_audit
import traceback
import sys

@app.post("/eval/run")
@fail_audit(auto_receipts=True)
async def evaluate(prompt: str, context: dict):
    try:
        result = await your_agent_function(prompt, context)
        return {
            "response": result["text"],
            "actions": result["actions"],
            "receipts": result["receipts"],
            "source_location": {
                "file": __file__.replace(os.getcwd() + "/", ""),
                "function": "evaluate",
                "line": sys._getframe().f_lineno
            }
        }
    except Exception as e:
        tb = traceback.extract_tb(e.__traceback__)
        frame = tb[-1]  # Last frame (where error occurred)
        return {
            "response": f"Error: {str(e)}",
            "source_location": {
                "file": frame.filename.replace(os.getcwd() + "/", ""),
                "function": frame.name,
                "line": frame.lineno,
                "stack_trace": traceback.format_exc()
            }
        }
```

### TypeScript (Next.js)

```typescript
import { failAuditRoute } from "@fail-kit/middleware-nextjs";
import { yourAgent } from "@/lib/your-agent";
import path from "path";

export const POST = failAuditRoute(async (prompt, context) => {
  try {
    const result = await yourAgent.process(prompt);
    
    return {
      response: result.text,
      actions: result.actions,
      receipts: result.receipts,
      source_location: {
        file: path.relative(process.cwd(), __filename),
        function: "POST",
        line: new Error().stack?.split('\n')[1]?.match(/:(\d+):/)?.[1]
      }
    };
  } catch (error) {
    const stack = error instanceof Error ? error.stack : String(error);
    const match = stack?.split('\n')[1]?.match(/at (.+?) \((.+?):(\d+):(\d+)\)/);
    
    return {
      response: `Error: ${error instanceof Error ? error.message : String(error)}`,
      source_location: {
        file: match?.[2] ? path.relative(process.cwd(), match[2]) : 'unknown',
        function: match?.[1] || 'unknown',
        line: match?.[3] ? parseInt(match[3]) : undefined,
        column: match?.[4] ? parseInt(match[4]) : undefined,
        stack_trace: stack
      }
    };
  }
});
```

### JavaScript (Express)

```javascript
const { failAuditMiddleware } = require("@fail-kit/middleware-express");
const path = require("path");

app.use("/eval", failAuditMiddleware({
  handler: async (prompt, context) => {
    try {
      const result = await yourAgent.process(prompt);
      
      return {
        response: result.text,
        actions: result.actions,
        receipts: result.receipts,
        source_location: {
          file: path.relative(process.cwd(), __filename),
          function: "handler",
          line: new Error().stack.split('\n')[1].match(/:(\d+):/)?.[1]
        }
      };
    } catch (error) {
      const stack = error.stack || String(error);
      const match = stack.split('\n')[1]?.match(/at (.+?) \((.+?):(\d+):(\d+)\)/);
      
      return {
        response: `Error: ${error.message}`,
        source_location: {
          file: match?.[2] ? path.relative(process.cwd(), match[2]) : 'unknown',
          function: match?.[1] || 'unknown',
          line: match?.[3] ? parseInt(match[3]) : undefined,
          column: match?.[4] ? parseInt(match[4]) : undefined,
          stack_trace: stack
        }
      };
    }
  }
}));
```

## Automatic Stack Trace Capture

For middleware implementations, you can automatically capture stack traces on errors:

### Python Decorator

```python
def with_source_location(func):
    @wraps(func)
    async def wrapper(*args, **kwargs):
        try:
            result = await func(*args, **kwargs)
            # Add source location to successful responses
            if isinstance(result, dict) and 'source_location' not in result:
                frame = sys._getframe(1)
                result['source_location'] = {
                    'file': frame.f_code.co_filename.replace(os.getcwd() + "/", ""),
                    'function': frame.f_code.co_name,
                    'line': frame.f_lineno
                }
            return result
        except Exception as e:
            # Capture error location
            tb = traceback.extract_tb(e.__traceback__)
            frame = tb[-1]
            raise Exception({
                'error': str(e),
                'source_location': {
                    'file': frame.filename.replace(os.getcwd() + "/", ""),
                    'function': frame.name,
                    'line': frame.lineno,
                    'stack_trace': traceback.format_exc()
                }
            })
    return wrapper
```

### TypeScript Wrapper

```typescript
function withSourceLocation<T extends (...args: any[]) => Promise<any>>(
  fn: T
): T {
  return (async (...args: any[]) => {
    try {
      const result = await fn(...args);
      
      // Add source location if not present
      if (typeof result === 'object' && !result.source_location) {
        const stack = new Error().stack;
        const match = stack?.split('\n')[2]?.match(/at (.+?) \((.+?):(\d+):(\d+)\)/);
        
        result.source_location = {
          file: match?.[2] ? path.relative(process.cwd(), match[2]) : 'unknown',
          function: match?.[1] || fn.name,
          line: match?.[3] ? parseInt(match[3]) : undefined
        };
      }
      
      return result;
    } catch (error) {
      const stack = error instanceof Error ? error.stack : String(error);
      const match = stack?.split('\n')[1]?.match(/at (.+?) \((.+?):(\d+):(\d+)\)/);
      
      throw {
        error: error instanceof Error ? error.message : String(error),
        source_location: {
          file: match?.[2] ? path.relative(process.cwd(), match[2]) : 'unknown',
          function: match?.[1] || 'unknown',
          line: match?.[3] ? parseInt(match[3]) : undefined,
          column: match?.[4] ? parseInt(match[4]) : undefined,
          stack_trace: stack
        }
      };
    }
  }) as T;
}
```

## HTML Report Display

When source location is provided, the HTML report will display:

1. **File path** - Clickable (if GitHub URL is configured)
2. **Function name** - Helps identify the specific handler
3. **Line and column numbers** - Exact location
4. **Stack trace** - Collapsible section with full error trace

This makes debugging failures much faster by pointing developers directly to the problematic code.

## Best Practices

1. **Always use relative paths** - Makes reports portable across environments
2. **Include function names** - Helps with navigation in large files
3. **Capture on both success and failure** - Useful for audit trails
4. **Strip sensitive paths** - Remove absolute paths that might leak system info
5. **Sanitize stack traces** - Remove environment variables or secrets

## Example Report Output

```
┌─ Source Location ────────────────────────────┐
│ File:     src/agents/order_processor.py      │
│ Function: process_high_value_order           │
│ Line:     142                                 │
│ Column:   12                                  │
│ ▼ Stack Trace                                 │
└──────────────────────────────────────────────┘
```

This feature is optional but highly recommended for production deployments where debugging failed test cases is critical.
