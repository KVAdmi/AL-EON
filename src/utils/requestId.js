/**
 * requestId.js - Generador de Request IDs únicos
 * Para correlacionar logs entre Frontend y Core
 */

/**
 * Generar UUID v4 simple
 */
export function generateRequestId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Logger de requests con formato obligatorio
 * [REQ] id=<requestId> endpoint=<url> status=<code>
 */
export function logRequest(requestId, endpoint, statusCode, extras = {}) {
  const timestamp = new Date().toISOString();
  const extraStr = Object.keys(extras).length > 0 
    ? ' ' + Object.entries(extras).map(([k, v]) => `${k}=${v}`).join(' ')
    : '';
  
  console.log(`[REQ] id=${requestId} endpoint=${endpoint} status=${statusCode}${extraStr} timestamp=${timestamp}`);
}

/**
 * Logger de errores con Request ID
 */
export function logRequestError(requestId, endpoint, error) {
  console.error(`[REQ ERROR] id=${requestId} endpoint=${endpoint} error=${error.message || error}`);
}
