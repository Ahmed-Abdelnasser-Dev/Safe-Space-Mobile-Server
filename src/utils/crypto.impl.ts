import { createHash, timingSafeEqual, type BinaryLike } from "node:crypto";

export function sha256Hex(input: BinaryLike): string {
  return createHash("sha256").update(input).digest("hex");
}

export function safeEqual(a: unknown, b: unknown): boolean {
  const aa = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (aa.length !== bb.length) return false;
  return timingSafeEqual(aa, bb);
}