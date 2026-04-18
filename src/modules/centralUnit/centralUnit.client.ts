import { randomUUID } from "node:crypto";
import type { AccidentMediaInput } from "../../types/index.js";
import type { AppError } from "../../types/errors.js";

type SendAccidentPayload = {
  accidentId: string;
  description: string;
  latitude: number;
  longitude: number;
  severity: "low" | "medium" | "high";
  media: AccidentMediaInput[];
};

type CentralUnitSendResponse = {
  centralUnitReferenceId?: string;
  referenceId?: string;
  id?: string;
} & Record<string, unknown>;

type RequestJsonOptions = {
  method: string;
  headers?: Record<string, string>;
  body?: unknown;
  idempotencyKey?: string;
  retry?: number;
};

type SendAccidentOptions = {
  idempotencyKey?: string;
};

type CentralUnitClient = {
  sendAccident: (
    payload: SendAccidentPayload,
    options?: SendAccidentOptions,
  ) => Promise<CentralUnitSendResponse>;
};

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function createCentralUnitClient({
  baseUrl,
  timeoutMs = 5000,
  fetchImpl = fetch,
}: {
  baseUrl: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}): CentralUnitClient {
  if (!baseUrl) {
    throw new Error(
      "CENTRAL_UNIT_BASE_URL is required for outbound Central Unit calls",
    );
  }

  async function requestJson(
    path: string,
    { method, headers, body, idempotencyKey, retry = 2 }: RequestJsonOptions,
  ): Promise<CentralUnitSendResponse> {
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
        const err = new Error(`Central Unit non-2xx: ${res.status}`) as AppError;
        err.statusCode = 502;
        err.code = "CENTRAL_UNIT_BAD_RESPONSE";
        err.expose = true;
        err.details = { status: res.status, body: json };
        throw err;
      }

      return (json ?? {}) as CentralUnitSendResponse;
    } catch (err) {
      // Retry only on network/timeout-like errors
      const knownErr = (err ?? {}) as { name?: string; code?: string };
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
    async sendAccident(
      payload: SendAccidentPayload,
      { idempotencyKey }: SendAccidentOptions = {},
    ): Promise<CentralUnitSendResponse> {
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
