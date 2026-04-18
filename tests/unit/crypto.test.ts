test("sha256Hex returns known digest", async () => {
  const { sha256Hex } = await import("../../src/utils/crypto.js");

  expect(sha256Hex("abc")).toBe(
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
  );
});

test("safeEqual returns true for equal values", async () => {
  const { safeEqual } = await import("../../src/utils/crypto.js");

  expect(safeEqual("token", "token")).toBe(true);
  expect(safeEqual(123, "123")).toBe(true);
});

test("safeEqual returns false for different values", async () => {
  const { safeEqual } = await import("../../src/utils/crypto.js");

  expect(safeEqual("token", "token-2")).toBe(false);
  expect(safeEqual("abc", "abcd")).toBe(false);
});