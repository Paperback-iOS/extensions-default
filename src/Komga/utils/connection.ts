import { getCurrentUser } from '../sdk/index.js'
import { getKomgaBaseURL, getKomgaCredentials } from './config.js'

export interface ConnectionStatus {
  ok: boolean
  message: string
}

// Only a 400 is typed as carrying `violations`, so every other failure needs a
// message of its own rather than reaching into the error body.
function describeFailure(baseUrl: string, status: number | undefined): string {
  switch (status) {
    case undefined:
      return `Could not reach ${baseUrl}`
    case 401:
    case 403:
      return 'Invalid credentials'
    case 404:
      return 'No Komga server at that URL'
    default:
      return `Server returned ${status}`
  }
}

/**
 * Check a Komga server without persisting anything. Defaults to the saved
 * settings so callers that are not editing them can omit both arguments.
 */
export async function checkKomgaConnection(
  baseUrl: string = getKomgaBaseURL(),
  credentials: { username: string; password: string } = getKomgaCredentials()
): Promise<ConnectionStatus> {
  try {
    const { data, error, response } = await getCurrentUser({
      baseUrl,
      auth: (auth) =>
        auth.scheme === 'basic'
          ? `${credentials.username}:${credentials.password}`
          : undefined,
    })

    // Komga's SPA answers unknown paths with index.html and a 200, so a base
    // URL carrying a stray path looks successful. Require a field only the
    // real API returns before calling it connected.
    if (!error && data?.email) {
      return { ok: true, message: `Connected as ${data.email}` }
    }

    if (!error) {
      return { ok: false, message: 'That URL is not a Komga API endpoint' }
    }

    return { ok: false, message: describeFailure(baseUrl, response?.status) }
  } catch {
    return { ok: false, message: `Could not reach ${baseUrl}` }
  }
}
