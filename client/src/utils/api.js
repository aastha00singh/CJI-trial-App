const API_BASE_URL = 'http://localhost:5000/api';

let accessToken = '';

export const setAccessToken = (token) => {
  accessToken = token;
};

export const getAccessToken = () => accessToken;

// Queues to handle requests made while refresh-token is in-flight
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(token);
    }
  });
  failedQueue = [];
};

/**
 * Base API Request wrapper using native fetch
 */
export const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  // Always send cookies (for refresh token HttpOnly cookie)
  options.credentials = 'include';
  
  // Initialize headers
  options.headers = {
    ...options.headers,
  };

  // Inject Bearer token if we have one in memory
  if (accessToken) {
    options.headers['Authorization'] = `Bearer ${accessToken}`;
  }

  // Set default Content-Type if sending body and it is not FormData
  if (options.body && !(options.body instanceof FormData)) {
    options.headers['Content-Type'] = 'application/json';
  }

  try {
    const response = await fetch(url, options);

    // Intercept 401 errors to refresh token (except on login or refresh endpoint itself)
    if (response.status === 401 && endpoint !== '/auth/refresh-token' && endpoint !== '/auth/login') {
      
      // If we are already refreshing, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            options.headers['Authorization'] = `Bearer ${token}`;
            return apiRequest(endpoint, options);
          })
          .catch((err) => Promise.reject(err));
      }

      isRefreshing = true;

      try {
        // Attempt to rotate tokens via POST refresh
        const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
          method: 'POST',
          credentials: 'include',
        });

        if (!refreshResponse.ok) {
          throw new Error('Refresh session expired');
        }

        const refreshData = await refreshResponse.json();
        const newToken = refreshData.accessToken;
        
        setAccessToken(newToken);
        isRefreshing = false;
        processQueue(null, newToken);

        // Retry the original request with the new token
        options.headers['Authorization'] = `Bearer ${newToken}`;
        return apiRequest(endpoint, options);
      } catch (refreshErr) {
        isRefreshing = false;
        processQueue(refreshErr, null);
        
        // Clear memory token and notify UI to redirect to login
        setAccessToken('');
        window.dispatchEvent(new Event('auth-expired'));
        
        throw new Error('Your session has expired. Please log in again.');
      }
    }

    return response;
  } catch (error) {
    console.error(`[API Network Error] ${endpoint}:`, error.message);
    throw error;
  }
};

// HTTP verb wrappers
export const api = {
  get: (endpoint, options = {}) => apiRequest(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options = {}) =>
    apiRequest(endpoint, {
      ...options,
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  put: (endpoint, body, options = {}) =>
    apiRequest(endpoint, {
      ...options,
      method: 'PUT',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  delete: (endpoint, options = {}) => apiRequest(endpoint, { ...options, method: 'DELETE' }),
};
