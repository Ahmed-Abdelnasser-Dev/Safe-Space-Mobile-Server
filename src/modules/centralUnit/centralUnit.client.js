import { randomUUID } from "node:crypto";

/**
 * @typedef {{
 *   statusCode?: number,
 *   code?: string,
 *   expose?: boolean,
 *   details?: unknown
 * }} AppErrorFields
 */

/**
 * @typedef {{
 *   accidentId: string,
 *   description: string,
 *   latitude: number,
 *   longitude: number,
 *   severity: "low" | "medium" | "high",
 *   media: import("../../types/index").AccidentMediaInput[]
 * }} SendAccidentPayload
 */

/**
 * @typedef {{
 *   centralUnitReferenceId?: string,
 *   referenceId?: string,
 *   id?: string
 * } & Record<string, unknown>} CentralUnitSendResponse
 */

/**
 * @param {number} ms
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * @param {{
 *   baseUrl: string,
 *   timeoutMs?: number,
 *   fetchImpl?: typeof fetch
 * }} deps
 */
export function createCentralUnitClient({
  baseUrl,
  timeoutMs = 5000,
  fetchImpl = fetch,
}) {
  if (!baseUrl) {
    throw new Error(
      "CENTRAL_UNIT_BASE_URL is required for outbound Central Unit calls",
    );
  }

  async function requestJson(
    path,
    { method, headers, body, idempotencyKey, retry = 2 },
  ) {
    const url = new URL(path, baseUrl).toString();
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetchImpl(url, {
        method,
        headers: {
          "content-type": "application/json",
          ...(idempotencyKey ? { "idempotency-key": idempotencyKey } : {}),
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      const text = await res.text();
      const json = text ? JSON.parse(text) : null;

      if (!res.ok) {
        /** @type {Error & AppErrorFields} */
        const err = new Error(`Central Unit non-2xx: ${res.status}`);
        err.statusCode = 502;
        err.code = "CENTRAL_UNIT_BAD_RESPONSE";
        err.expose = true;
        err.details = { status: res.status, body: json };
        throw err;
      }

      return json;
    } catch (err) {
      // Retry only on network/timeout-like errors
      /** @type {{ name?: string, code?: string }} */
      const knownErr = /** @type {{ name?: string, code?: string }} */ (err || {});
      const canRetry =
        retry > 0 &&
        (knownErr.name === "AbortError" ||
          knownErr.code === "ETIMEDOUT" ||
          knownErr.code === "ECONNRESET" ||
          knownErr.code === "ENOTFOUND");

      if (canRetry) {
        await sleep(200 * (3 - retry));
        return requestJson(path, {
          method,
          headers,
          body,
          idempotencyKey,
          retry: retry - 1,
        });
      }
      throw err;
    } finally {
      clearTimeout(t);
    }
  }

  return {
    /**
     * @param {SendAccidentPayload} payload
     * @param {{ idempotencyKey?: string }} [options]
      * @returns {Promise<CentralUnitSendResponse>}
     */
    async sendAccident(payload, { idempotencyKey } = {}) {
      const key = idempotencyKey || randomUUID();
      // NOTE: Central Unit endpoint path is not specified in docs; keep it configurable.
      return requestJson("/api/central-unit/send-accident-to-central-unit", {
        method: "POST",
        body: payload,
        idempotencyKey: key,
      });
    },
  };
}
