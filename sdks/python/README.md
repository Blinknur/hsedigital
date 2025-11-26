# HSE Digital Python SDK

Official Python SDK for HSE Digital API.

## Features

- 🔐 **Authentication handling** - Automatic token management and refresh
- 🔄 **Auto-retry logic** - Configurable retry with exponential backoff
- 📝 **Type hints** - Full type annotations for better IDE support
- 🚀 **Simple API** - Pythonic interface with keyword arguments
- ⚡ **Session management** - Persistent HTTP connections
- 🛡️ **Error handling** - Typed exceptions for different error scenarios

## Installation

```bash
pip install hse-digital-sdk
```

## Quick Start

```python
from hse_digital import HSEClient

client = HSEClient(
    base_url='https://api.hse.digital',
    max_retries=3,
    timeout=30,
)

# Login
result = client.login(
    email='user@example.com',
    password='password123',
)

print(result['user']['name'])

# List stations
stations = client.list_stations(region='North')

# Create an audit
audit = client.create_audit(
    station_id='station-id',
    auditor_id='auditor-id',
    scheduled_date='2024-01-15T10:00:00Z',
    form_id='form-id',
)
```

## Configuration

```python
client = HSEClient(
    base_url='http://localhost:3001',  # API base URL
    access_token=None,                  # Initial access token
    timeout=30,                         # Request timeout in seconds
    max_retries=3,                      # Max retry attempts
    retry_delay=1.0,                    # Base delay between retries
    on_token_refresh=lambda tokens: print('Tokens refreshed'),
)
```

## Authentication

### Signup with Organization

```python
result = client.signup(
    name='John Doe',
    email='john@example.com',
    password='SecurePass123!',
    organization_name='Acme Corp',
)

print(result['organization'])
print(result['user'])
# Tokens are automatically stored
```

### Login

```python
result = client.login(
    email='john@example.com',
    password='SecurePass123!',
)

print(result['user'])
print(result['accessToken'])
```

### Token Persistence

```python
import json
from hse_digital import HSEClient, AuthTokens

def save_tokens(tokens: AuthTokens):
    with open('tokens.json', 'w') as f:
        json.dump({
            'access_token': tokens.access_token,
            'refresh_token': tokens.refresh_token,
        }, f)

client = HSEClient(
    base_url='https://api.hse.digital',
    on_token_refresh=save_tokens,
)

# Restore tokens on app start
try:
    with open('tokens.json', 'r') as f:
        tokens_data = json.load(f)
        client.set_tokens(AuthTokens(
            access_token=tokens_data['access_token'],
            refresh_token=tokens_data['refresh_token'],
        ))
except FileNotFoundError:
    pass
```

### Logout

```python
client.logout()
```

## Stations

### List Stations

```python
stations = client.list_stations()

# With filters
north_stations = client.list_stations(region='North')
```

### Create Station

```python
station = client.create_station(
    name='Station Alpha',
    brand='Shell',
    region='North',
    address='123 Main St',
    risk_category='High',
    audit_frequency='Monthly',
)
```

### Update Station

```python
updated = client.update_station(
    'station-id',
    risk_category='Critical',
)
```

### Delete Station

```python
client.delete_station('station-id')
```

## Audits

### List Audits

```python
result = client.list_audits(
    station_id='station-id',
    status='Completed',
    limit=50,
)

audits = result['data']
pagination = result['pagination']

if pagination.get('hasMore'):
    next_page = client.list_audits(
        cursor=pagination['nextCursor'],
    )
```

### Get Audit

```python
audit = client.get_audit('audit-id')
print(audit['station'])
print(audit['auditor'])
```

### Create Audit

```python
audit = client.create_audit(
    station_id='station-id',
    auditor_id='user-id',
    scheduled_date='2024-02-01T09:00:00Z',
    form_id='form-id',
    status='Scheduled',
)
```

### Update Audit

```python
updated = client.update_audit(
    'audit-id',
    status='Completed',
    overall_score=95,
    findings=[
        {'category': 'Safety', 'score': 98, 'notes': 'Excellent'},
        {'category': 'Environment', 'score': 92, 'notes': 'Good'},
    ],
)
```

### Delete Audit

```python
client.delete_audit('audit-id')
```

## Incidents

### List Incidents

```python
result = client.list_incidents(
    severity='High',
    status='Open',
)

incidents = result['data']
```

### Get Incident

```python
incident = client.get_incident('incident-id')
```

### Create Incident

```python
incident = client.create_incident(
    station_id='station-id',
    incident_type='Safety Violation',
    severity='High',
    description='Detailed description of the incident',
    status='Open',
)
```

### Update Incident

```python
updated = client.update_incident(
    'incident-id',
    status='Resolved',
)
```

### Delete Incident

```python
client.delete_incident('incident-id')
```

## Other Resources

### List Contractors

```python
contractors = client.list_contractors()
```

### List Work Permits

```python
permits = client.list_work_permits(station_id='station-id')
```

### List Users

```python
users = client.list_users()
```

### Get Current Usage Stats

```python
usage = client.get_current_usage()
print(usage['audits'])
print(usage['incidents'])
```

## Error Handling

```python
from hse_digital import (
    HSEClient,
    AuthenticationError,
    ValidationError,
    NotFoundError,
    RateLimitError,
    ServerError,
)

client = HSEClient()

try:
    station = client.create_station(name='New Station')
except AuthenticationError as e:
    print(f'Authentication failed: {e.message}')
    print(f'Status code: {e.status_code}')
except ValidationError as e:
    print(f'Validation failed: {e.message}')
    print(f'Details: {e.details}')
except NotFoundError as e:
    print(f'Resource not found: {e.message}')
except RateLimitError as e:
    print(f'Rate limited: {e.message}')
except ServerError as e:
    print(f'Server error: {e.message}')
```

## Retry Logic

The SDK automatically retries failed requests with exponential backoff:

- Network errors
- 429 (Too Many Requests)
- 5xx (Server errors)

```python
client = HSEClient(
    max_retries=5,     # Retry up to 5 times
    retry_delay=2.0,   # Start with 2 second delay
)
```

Retry delays: 2s, 4s, 8s, 16s, 32s (exponential backoff)

## Token Refresh

The SDK automatically refreshes expired access tokens:

1. Detects 401 Unauthorized response
2. Attempts to refresh using refresh token
3. Retries original request with new token
4. Clears tokens if refresh fails

```python
def handle_token_refresh(tokens):
    # Save new tokens to persistent storage
    save_to_database(tokens)

client = HSEClient(
    on_token_refresh=handle_token_refresh,
)
```

## Type Hints

Full type annotations for better IDE support:

```python
from hse_digital import (
    HSEClient,
    Station,
    Audit,
    Incident,
    User,
    Organization,
    AuthTokens,
    PaginatedResponse,
)
from typing import List, Dict, Any

client: HSEClient = HSEClient()
stations: List[Dict[str, Any]] = client.list_stations()
```

## Examples

See the `examples/` directory for complete working examples:

- `basic_usage.py` - Basic authentication and CRUD operations
- `pagination.py` - Working with paginated endpoints
- `error_handling.py` - Comprehensive error handling

## Development

```bash
# Install development dependencies
pip install -e ".[dev]"

# Run tests
pytest

# Type checking
mypy hse_digital

# Format code
black hse_digital
```

## License

MIT
