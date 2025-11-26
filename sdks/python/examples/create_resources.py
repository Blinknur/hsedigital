from hse_digital import HSEClient
from datetime import datetime

def main():
    client = HSEClient(base_url='http://localhost:3001')

    client.login(
        email='admin@example.com',
        password='password123',
    )

    station = client.create_station(
        name='Alpha Station',
        brand='Shell',
        region='North',
        address='123 Industrial Rd',
        risk_category='High',
        audit_frequency='Monthly',
    )
    print('Created station:', station)

    audit = client.create_audit(
        station_id=station['id'],
        auditor_id='user-id',
        scheduled_date=datetime.now().isoformat(),
        form_id='form-id',
    )
    print('Created audit:', audit)

    incident = client.create_incident(
        station_id=station['id'],
        incident_type='Safety Violation',
        severity='Medium',
        description='Minor safety equipment issue detected',
    )
    print('Created incident:', incident)

    updated_incident = client.update_incident(
        incident['id'],
        status='In Progress',
    )
    print('Updated incident:', updated_incident)


if __name__ == '__main__':
    main()
