import requests
import time
from typing import Optional, List, Dict, Any, Callable
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from .types import (
    AuthTokens,
    User,
    Organization,
    Station,
    Audit,
    Incident,
    Contractor,
    WorkPermit,
    PaginatedResponse,
)
from .exceptions import (
    HSEAPIError,
    AuthenticationError,
    ValidationError,
    NotFoundError,
    RateLimitError,
    ServerError,
)


class HSEClient:
    def __init__(
        self,
        base_url: str = "http://localhost:3001",
        access_token: Optional[str] = None,
        timeout: int = 30,
        max_retries: int = 3,
        retry_delay: float = 1.0,
        on_token_refresh: Optional[Callable[[AuthTokens], None]] = None,
    ):
        self.base_url = base_url.rstrip("/")
        self.access_token = access_token
        self.refresh_token: Optional[str] = None
        self.timeout = timeout
        self.max_retries = max_retries
        self.retry_delay = retry_delay
        self.on_token_refresh = on_token_refresh

        self.session = requests.Session()
        retry_strategy = Retry(
            total=max_retries,
            backoff_factor=retry_delay,
            status_forcelist=[429, 500, 502, 503, 504],
            allowed_methods=["HEAD", "GET", "PUT", "DELETE", "OPTIONS", "TRACE", "POST"],
        )
        adapter = HTTPAdapter(max_retries=retry_strategy)
        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)

    def _get_headers(self) -> Dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if self.access_token:
            headers["Authorization"] = f"Bearer {self.access_token}"
        return headers

    def _handle_error(self, response: requests.Response) -> None:
        try:
            error_data = response.json()
            error_message = error_data.get("error", "Unknown error")
            details = error_data.get("details")
        except Exception:
            error_message = response.text or "Unknown error"
            details = None

        if response.status_code == 401:
            raise AuthenticationError(error_message, response.status_code, details)
        elif response.status_code == 400:
            raise ValidationError(error_message, response.status_code, details)
        elif response.status_code == 404:
            raise NotFoundError(error_message, response.status_code, details)
        elif response.status_code == 429:
            raise RateLimitError(error_message, response.status_code, details)
        elif response.status_code >= 500:
            raise ServerError(error_message, response.status_code, details)
        else:
            raise HSEAPIError(error_message, response.status_code, details)

    def _request(
        self,
        method: str,
        endpoint: str,
        data: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, Any]] = None,
        retry_on_401: bool = True,
    ) -> Any:
        url = f"{self.base_url}{endpoint}"
        headers = self._get_headers()

        try:
            response = self.session.request(
                method=method,
                url=url,
                json=data,
                params=params,
                headers=headers,
                timeout=self.timeout,
            )

            if response.status_code == 401 and retry_on_401 and self.refresh_token:
                try:
                    self._refresh_access_token()
                    headers = self._get_headers()
                    response = self.session.request(
                        method=method,
                        url=url,
                        json=data,
                        params=params,
                        headers=headers,
                        timeout=self.timeout,
                    )
                except Exception:
                    self.clear_tokens()
                    raise

            if not response.ok:
                self._handle_error(response)

            if response.status_code == 204 or not response.content:
                return None

            return response.json()

        except requests.exceptions.RequestException as e:
            raise HSEAPIError(f"Request failed: {str(e)}")

    def set_tokens(self, tokens: AuthTokens) -> None:
        self.access_token = tokens.access_token
        self.refresh_token = tokens.refresh_token

        if self.on_token_refresh:
            self.on_token_refresh(tokens)

    def clear_tokens(self) -> None:
        self.access_token = None
        self.refresh_token = None

    def signup(
        self, name: str, email: str, password: str, organization_name: str
    ) -> Dict[str, Any]:
        data = {
            "name": name,
            "email": email,
            "password": password,
            "organizationName": organization_name,
        }
        result = self._request("POST", "/api/auth/signup-with-org", data=data)
        tokens = AuthTokens(
            access_token=result["accessToken"],
            refresh_token=result["refreshToken"],
        )
        self.set_tokens(tokens)
        return result

    def login(self, email: str, password: str) -> Dict[str, Any]:
        data = {"email": email, "password": password}
        result = self._request("POST", "/api/auth/login", data=data)
        tokens = AuthTokens(
            access_token=result["accessToken"],
            refresh_token=result["refreshToken"],
        )
        self.set_tokens(tokens)
        return result

    def logout(self) -> None:
        if self.refresh_token:
            self._request(
                "POST", "/api/auth/logout", data={"refreshToken": self.refresh_token}
            )
        self.clear_tokens()

    def _refresh_access_token(self) -> None:
        if not self.refresh_token:
            raise AuthenticationError("No refresh token available")

        result = self._request(
            "POST",
            "/api/auth/refresh",
            data={"refreshToken": self.refresh_token},
            retry_on_401=False,
        )
        tokens = AuthTokens(
            access_token=result["accessToken"],
            refresh_token=result["refreshToken"],
        )
        self.set_tokens(tokens)

    def list_stations(self, region: Optional[str] = None) -> List[Dict[str, Any]]:
        params = {}
        if region:
            params["region"] = region
        return self._request("GET", "/api/stations", params=params)

    def create_station(self, **kwargs) -> Dict[str, Any]:
        return self._request("POST", "/api/stations", data=kwargs)

    def update_station(self, station_id: str, **kwargs) -> Dict[str, Any]:
        return self._request("PUT", f"/api/stations/{station_id}", data=kwargs)

    def delete_station(self, station_id: str) -> None:
        self._request("DELETE", f"/api/stations/{station_id}")

    def list_audits(
        self,
        station_id: Optional[str] = None,
        auditor_id: Optional[str] = None,
        status: Optional[str] = None,
        cursor: Optional[str] = None,
        limit: int = 50,
    ) -> Dict[str, Any]:
        params = {"limit": limit}
        if station_id:
            params["stationId"] = station_id
        if auditor_id:
            params["auditorId"] = auditor_id
        if status:
            params["status"] = status
        if cursor:
            params["cursor"] = cursor

        result = self._request("GET", "/api/audits", params=params)
        return {
            "data": result.get("audits", []),
            "pagination": result.get("pagination", {}),
        }

    def get_audit(self, audit_id: str) -> Dict[str, Any]:
        return self._request("GET", f"/api/audits/{audit_id}")

    def create_audit(self, **kwargs) -> Dict[str, Any]:
        return self._request("POST", "/api/audits", data=kwargs)

    def update_audit(self, audit_id: str, **kwargs) -> Dict[str, Any]:
        return self._request("PUT", f"/api/audits/{audit_id}", data=kwargs)

    def delete_audit(self, audit_id: str) -> None:
        self._request("DELETE", f"/api/audits/{audit_id}")

    def list_incidents(
        self,
        station_id: Optional[str] = None,
        severity: Optional[str] = None,
        status: Optional[str] = None,
        cursor: Optional[str] = None,
        limit: int = 50,
    ) -> Dict[str, Any]:
        params = {"limit": limit}
        if station_id:
            params["stationId"] = station_id
        if severity:
            params["severity"] = severity
        if status:
            params["status"] = status
        if cursor:
            params["cursor"] = cursor

        result = self._request("GET", "/api/incidents", params=params)
        return {
            "data": result.get("incidents", []),
            "pagination": result.get("pagination", {}),
        }

    def get_incident(self, incident_id: str) -> Dict[str, Any]:
        return self._request("GET", f"/api/incidents/{incident_id}")

    def create_incident(self, **kwargs) -> Dict[str, Any]:
        return self._request("POST", "/api/incidents", data=kwargs)

    def update_incident(self, incident_id: str, **kwargs) -> Dict[str, Any]:
        return self._request("PUT", f"/api/incidents/{incident_id}", data=kwargs)

    def delete_incident(self, incident_id: str) -> None:
        self._request("DELETE", f"/api/incidents/{incident_id}")

    def list_contractors(self) -> List[Dict[str, Any]]:
        return self._request("GET", "/api/contractors")

    def list_work_permits(self, station_id: Optional[str] = None) -> List[Dict[str, Any]]:
        params = {}
        if station_id:
            params["stationId"] = station_id
        return self._request("GET", "/api/work-permits", params=params)

    def list_users(self) -> List[Dict[str, Any]]:
        return self._request("GET", "/api/users")

    def get_current_usage(self) -> Dict[str, Any]:
        return self._request("GET", "/api/usage/current")
