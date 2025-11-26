from hse_digital import HSEClient

def main():
    client = HSEClient(
        base_url='http://localhost:3001',
        max_retries=3,
        on_token_refresh=lambda tokens: print('Tokens refreshed:', tokens),
    )

    try:
        login_result = client.login(
            email='admin@example.com',
            password='password123',
        )

        print(f"Logged in as: {login_result['user']['name']}")

        stations = client.list_stations()
        print(f"Found {len(stations)} stations")

        if stations:
            result = client.list_audits(
                station_id=stations[0]['id'],
                limit=10,
            )
            audits = result['data']
            print(f"Found {len(audits)} audits for station {stations[0]['name']}")

        client.logout()
        print('Logged out successfully')

    except Exception as e:
        print(f'Error: {e}')


if __name__ == '__main__':
    main()
