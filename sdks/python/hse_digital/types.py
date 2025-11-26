from dataclasses import dataclass
from typing import Optional, List, Any, Dict
from datetime import datetime


@dataclass
class AuthTokens:
    access_token: str
    refresh_token: str


@dataclass
class User:
    id: str
    name: str
    email: str
    role: str
    organization_id: str
    region: Optional[str] = None
    is_email_verified: bool = False
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


@dataclass
class Organization:
    id: str
    name: str
    subscription_plan: str
    subscription_status: str
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


@dataclass
class Station:
    id: str
    organization_id: str
    name: str
    brand: Optional[str] = None
    region: Optional[str] = None
    address: Optional[str] = None
    risk_category: Optional[str] = None
    audit_frequency: Optional[str] = None
    is_active: bool = True
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


@dataclass
class Audit:
    id: str
    organization_id: str
    station_id: str
    auditor_id: str
    audit_number: str
    scheduled_date: str
    status: str
    form_id: str
    findings: List[Dict[str, Any]]
    overall_score: float
    completed_date: Optional[str] = None
    station: Optional[Station] = None
    auditor: Optional[User] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


@dataclass
class Incident:
    id: str
    organization_id: str
    station_id: str
    reporter_id: str
    incident_type: str
    severity: str
    description: str
    status: str
    reported_at: str
    resolved_at: Optional[str] = None
    station: Optional[Station] = None
    reporter: Optional[User] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


@dataclass
class Contractor:
    id: str
    organization_id: str
    name: str
    license_number: Optional[str] = None
    specialization: Optional[str] = None
    contact_person: Optional[str] = None
    email: Optional[str] = None
    status: str = "Active"
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


@dataclass
class WorkPermit:
    id: str
    organization_id: str
    station_id: str
    requested_by: str
    permit_type: str
    description: str
    status: str
    valid_from: str
    valid_to: str
    approved_by: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


@dataclass
class PaginatedResponse:
    data: List[Any]
    has_more: bool
    next_cursor: Optional[str] = None


@dataclass
class APIError:
    error: str
    details: Optional[List[Dict[str, Any]]] = None
    code: Optional[str] = None
