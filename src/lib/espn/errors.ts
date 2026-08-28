/** Errors the ingestion layer can distinguish and react to. */

export class EspnError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message)
    this.name = 'EspnError'
  }
}

/** Non-2xx from ESPN. */
export class EspnHttpError extends EspnError {
  constructor(readonly status: number, readonly url: string, readonly body?: string) {
    super(`ESPN returned ${status} for ${url}`)
    this.name = 'EspnHttpError'
  }
  /** 401/403 on a league that used to work almost always means auth, not outage. */
  get isAuthFailure() {
    return this.status === 401 || this.status === 403
  }
  get isRetryable() {
    return this.status === 429 || this.status >= 500
  }
}

/**
 * Payload did not match the expected shape. Per spec §43: record diagnostics,
 * mark the sync failed, keep serving last-known-good data, corrupt nothing.
 */
export class EspnValidationError extends EspnError {
  constructor(readonly view: string, readonly issues: unknown) {
    super(`ESPN payload failed validation for view "${view}"`)
    this.name = 'EspnValidationError'
  }
}
