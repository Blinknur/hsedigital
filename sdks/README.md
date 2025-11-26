# HSE Digital API Client SDKs

Comprehensive, production-ready API client SDKs for the HSE Digital platform.

## Available SDKs

### TypeScript/JavaScript SDK

📦 **Package**: `@hse-digital/sdk`  
📁 **Location**: `./typescript/`  
📖 **Documentation**: [TypeScript SDK README](./typescript/README.md)

**Features:**
- Full TypeScript type definitions
- Automatic token refresh
- Built-in retry logic with exponential backoff
- Promise-based async/await API
- Works in Node.js and browsers

**Installation:**
```bash
npm install @hse-digital/sdk
```

**Quick Example:**
```typescript
import { HSEClient } from '@hse-digital/sdk';

const client = new HSEClient({
  baseUrl: 'https://api.hse.digital',
});

await client.login({
  email: 'user@example.com',
  password: 'password',
});

const stations = await client.listStations();
```

---

### Python SDK

📦 **Package**: `hse-digital-sdk`  
📁 **Location**: `./python/`  
📖 **Documentation**: [Python SDK README](./python/README.md)

**Features:**
- Type hints for better IDE support
- Automatic token refresh
- Built-in retry logic with exponential backoff
- Pythonic API with keyword arguments
- Persistent HTTP session

**Installation:**
```bash
pip install hse-digital-sdk
```

**Quick Example:**
```python
from hse_digital import HSEClient

client = HSEClient(base_url='https://api.hse.digital')

client.login(
    email='user@example.com',
    password='password',
)

stations = client.list_stations()
```

---

## Common Features

Both SDKs provide:

### 🔐 Authentication Management
- Automatic JWT token storage
- Automatic token refresh on expiry
- Token persistence callbacks
- Secure logout

### 🔄 Automatic Retry Logic
- Exponential backoff for failed requests
- Configurable retry attempts and delays
- Smart retry on network errors, 429, and 5xx errors
- No retry on 4xx client errors (except 429)

### 📝 Type Safety
- **TypeScript**: Full TypeScript definitions
- **Python**: Type hints and dataclasses
- IDE autocomplete support
- Compile-time/runtime type checking

### 🛡️ Error Handling
- Typed exceptions for different error scenarios
- Detailed error messages and context
- HTTP status code access
- Validation error details

### ⚡ Performance
- Connection pooling and reuse
- Configurable timeouts
- Efficient JSON serialization
- Minimal dependencies

## API Coverage

Both SDKs provide complete coverage of the HSE Digital API:

### Authentication
- ✅ Signup with organization
- ✅ Login
- ✅ Logout
- ✅ Token refresh
- ✅ Password reset

### Stations
- ✅ List stations (with filtering)
- ✅ Create station
- ✅ Update station
- ✅ Delete station

### Audits
- ✅ List audits (with pagination)
- ✅ Get audit details
- ✅ Create audit
- ✅ Update audit
- ✅ Delete audit

### Incidents
- ✅ List incidents (with pagination)
- ✅ Get incident details
- ✅ Create incident
- ✅ Update incident
- ✅ Delete incident

### Other Resources
- ✅ List contractors
- ✅ List work permits
- ✅ List users
- ✅ Get usage statistics

## OpenAPI Specification

The SDKs are generated from and conform to the OpenAPI 3.0 specification located at `./openapi.yaml`.

You can use this specification to:
- Generate SDKs in other languages
- Import into API testing tools (Postman, Insomnia)
- Generate API documentation
- Validate API contracts

## Examples

Each SDK includes comprehensive examples:

### TypeScript Examples
- `typescript/examples/basic-usage.ts` - Authentication and basic CRUD
- `typescript/examples/create-resources.ts` - Creating stations, audits, incidents

### Python Examples
- `python/examples/basic_usage.py` - Authentication and basic CRUD
- `python/examples/create_resources.py` - Creating stations, audits, incidents
- `python/examples/error_handling.py` - Comprehensive error handling

## Development

### Building TypeScript SDK

```bash
cd typescript
npm install
npm run build
```

### Building Python SDK

```bash
cd python
pip install -e ".[dev]"
python -m build
```

## Contributing

When contributing to the SDKs:

1. Update the OpenAPI spec first (`openapi.yaml`)
2. Regenerate/update both SDKs to match
3. Add tests for new functionality
4. Update documentation and examples
5. Ensure backward compatibility

## Testing

### TypeScript Tests
```bash
cd typescript
npm test
```

### Python Tests
```bash
cd python
pytest
```

## License

MIT

## Support

For issues, questions, or contributions:
- 📧 Email: support@hse.digital
- 📚 Documentation: https://docs.hse.digital
- 🐛 Issues: https://github.com/hse-digital/sdks/issues
