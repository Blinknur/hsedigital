class HSEAPIError(Exception):
    def __init__(self, message: str, status_code: int = None, details: dict = None):
        self.message = message
        self.status_code = status_code
        self.details = details
        super().__init__(self.message)


class AuthenticationError(HSEAPIError):
    pass


class ValidationError(HSEAPIError):
    pass


class NotFoundError(HSEAPIError):
    pass


class RateLimitError(HSEAPIError):
    pass


class ServerError(HSEAPIError):
    pass
