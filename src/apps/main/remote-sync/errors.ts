/**
 * Base class for RemoteSync errors.
 */
export class RemoteSyncError extends Error {
  public context?: any;
  public code?: string;

  constructor(message: string, code?: string, context?: any) {
    super(message);
    this.name = 'RemoteSyncError';
    this.code = code;
    this.context = context;
  }
}

/**
 * Error thrown when the response does not contain an array of files.
 */
export class RemoteSyncInvalidResponseError extends RemoteSyncError {
  constructor(response: any) {
    super(`Expected an array of files, but received: ${JSON.stringify(response, null, 2)}`, 'INVALID_RESPONSE', {
      response,
    });
    this.name = 'RemoteSyncInvalidResponseError';
  }
}

/**
 * Error thrown when a network error occurs (example:, socket hang up or TLS connection error).
 */
export class RemoteSyncNetworkError extends RemoteSyncError {
  constructor(originalError: any) {
    const errorInfo = {
      message: originalError.message || String(originalError),
      code: originalError.code,
      status: originalError.status
    };
    super(`Network error occurred during sync: ${errorInfo.message}`, 'NETWORK_ERROR', errorInfo);
    this.name = 'RemoteSyncNetworkError';
  }
}

/**
 * Error thrown when the server responds with an error status (example, status 500).
 */
export class RemoteSyncServerError extends RemoteSyncError {
  constructor(status: number, data: any) {
    const errorMessage = data?.message || data?.error || 'Unknown server error';
    super(`Server error: request failed with status code ${status} while sync`, 'SERVER_ERROR', { 
      status, 
      message: errorMessage 
    });
    this.name = 'RemoteSyncServerError';
  }
}
