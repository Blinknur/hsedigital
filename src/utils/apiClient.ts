export interface QuotaError {
    error: string;
    code: 'QUOTA_EXCEEDED' | 'FEATURE_NOT_AVAILABLE';
    resource?: string;
    limit?: number;
    current?: number;
    plan?: string;
    feature?: string;
    upgrade_required?: boolean;
}

export const isQuotaError = (error: any): error is QuotaError => {
    return error && (error.code === 'QUOTA_EXCEEDED' || error.code === 'FEATURE_NOT_AVAILABLE');
};

export const handleApiError = async (response: Response) => {
    const data = await response.json();
    if (isQuotaError(data)) {
        return data;
    }
    throw new Error(data.error || 'An error occurred');
};

export const apiClient = {
    async get(url: string, options: RequestInit = {}) {
        const token = localStorage.getItem('token');
        const response = await fetch(url, {
            ...options,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                ...options.headers
            }
        });

        if (!response.ok) {
            throw await handleApiError(response);
        }

        return response.json();
    },

    async post(url: string, data: any, options: RequestInit = {}) {
        const token = localStorage.getItem('token');
        const response = await fetch(url, {
            method: 'POST',
            ...options,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                ...options.headers
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const error = await response.json();
            throw error;
        }

        return response.json();
    },

    async put(url: string, data: any, options: RequestInit = {}) {
        const token = localStorage.getItem('token');
        const response = await fetch(url, {
            method: 'PUT',
            ...options,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                ...options.headers
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw await handleApiError(response);
        }

        return response.json();
    },

    async delete(url: string, options: RequestInit = {}) {
        const token = localStorage.getItem('token');
        const response = await fetch(url, {
            method: 'DELETE',
            ...options,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                ...options.headers
            }
        });

        if (!response.ok) {
            throw await handleApiError(response);
        }

        return response.json();
    }
};
