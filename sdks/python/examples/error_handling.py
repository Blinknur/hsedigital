from hse_digital import (
    HSEClient,
    AuthenticationError,
    ValidationError,
    NotFoundError,
    RateLimitError,
    ServerError,
)

def main():
    client = HSEClient(base_url='http://localhost:3001')

    try:
        result = client.login(
            email='wrong@example.com',
            password='wrongpassword',
        )
    except AuthenticationError as e:
        print(f'Authentication failed: {e.message}')
        print(f'Status code: {e.status_code}')
    except Exception as e:
        print(f'Unexpected error: {e}')

    try:
        client.login(email='admin@example.com', password='password123')
        
        station = client.create_station(name='')
    except ValidationError as e:
        print(f'Validation failed: {e.message}')
        print(f'Details: {e.details}')
    except Exception as e:
        print(f'Unexpected error: {e}')

    try:
        audit = client.get_audit('non-existent-id')
    except NotFoundError as e:
        print(f'Not found: {e.message}')
    except Exception as e:
        print(f'Unexpected error: {e}')

    try:
        for i in range(1000):
            client.list_stations()
    except RateLimitError as e:
        print(f'Rate limited: {e.message}')
        print('Too many requests, backing off...')
    except Exception as e:
        print(f'Unexpected error: {e}')


if __name__ == '__main__':
    main()
