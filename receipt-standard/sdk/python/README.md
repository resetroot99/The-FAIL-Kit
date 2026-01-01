# Python Receipt SDK

Validate and generate receipts for AI agent actions.

## Installation

**Note: Package not yet published to PyPI. For now, copy `receipt_standard.py` directly into your project or install from source.**

When published:
```bash
pip install fail-kit-receipt-standard
```

For now (local install):
```bash
# Copy receipt_standard.py to your project
cp receipt-standard/sdk/python/receipt_standard.py ./
```

## Usage

### Validating a Receipt

```python
from receipt_standard import validate_receipt

receipt = {
    "action_id": "act_123",
    "tool_name": "email_sender",
    "timestamp": "2025-01-01T00:00:00Z",
    "status": "success",
    "input_hash": "sha256:abc...",
    "output_hash": "sha256:def..."
}

result = validate_receipt(receipt)
if result["valid"]:
    print("Receipt is valid")
else:
    print("Validation errors:", result["errors"])
```

### Generating a Receipt

```python
from receipt_standard import generate_receipt

receipt = generate_receipt(
    tool_name="email_sender",
    input_data={"to": "user@example.com", "subject": "Hello"},
    output_data={"message_id": "msg_123", "status": "sent"},
    status="success"
)

print(receipt)
# {
#     "action_id": "act_abc123...",
#     "tool_name": "email_sender",
#     "timestamp": "2025-01-01T10:00:00.000Z",
#     "status": "success",
#     "input_hash": "sha256:...",
#     "output_hash": "sha256:...",
#     "latency_ms": 0
# }
```

## API

See [receipt_standard.py](receipt_standard.py) for full API documentation.

## License

MIT
