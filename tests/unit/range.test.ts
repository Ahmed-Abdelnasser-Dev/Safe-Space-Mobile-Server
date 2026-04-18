test("haversineMeters returns ~0 for same point", async () => {
  const { haversineMeters } = await import("../../src/modules/accidents/accidents.service.js");
  const d = haversineMeters({ lat: 30, lng: 31 }, { lat: 30, lng: 31 });
  expect(d).toBeLessThan(0.001);
});

test("isInRange returns true within radius", async () => {
  const { isInRange } = await import("../../src/modules/accidents/accidents.service.js");
  const a = { lat: 30.0444, lng: 31.2357 };
  const b = { lat: 30.045, lng: 31.2357 };
  expect(isInRange(a, b, 100)).toBe(true);
});

test("isInRange returns false outside radius", async () => {
  const { isInRange } = await import("../../src/modules/accidents/accidents.service.js");
  const a = { lat: 30.0444, lng: 31.2357 };
  const b = { lat: 30.0544, lng: 31.2357 };
  expect(isInRange(a, b, 100)).toBe(false);
});

