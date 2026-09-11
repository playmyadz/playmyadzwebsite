import assert from "node:assert/strict";
import test from "node:test";
import { calculatePricing, getCampaignDates } from "./pricing.js";

test("calculates the advertised one-day evening total", () => {
  const price = calculatePricing({
    packageCode: "day1",
    routeCode: "metro",
    slot: "Evening",
    radiusKm: 8,
    durationSeconds: 30,
    creativeType: "video",
    needsVideo: false,
  });

  assert.equal(price.subtotalPaise, 1_820_000);
  assert.equal(price.gstPaise, 327_600);
  assert.equal(price.totalPaise, 2_147_600);
});

test("adds video creation without trusting a client total", () => {
  const price = calculatePricing({
    packageCode: "day1",
    routeCode: "retail",
    slot: "Morning",
    radiusKm: 8,
    durationSeconds: 30,
    creativeType: "video",
    needsVideo: true,
  });

  assert.equal(price.creativeCostPaise, 700_000);
  assert.equal(price.totalPaise, 2_596_000);
});

test("expands multi-day packages into consecutive reserved dates", () => {
  const tomorrow = new Date();
  tomorrow.setUTCHours(0, 0, 0, 0);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const dates = getCampaignDates(tomorrow.toISOString().slice(0, 10), 3);

  assert.equal(dates.length, 3);
  assert.equal(new Date(`${dates[2]}T00:00:00Z`) - new Date(`${dates[0]}T00:00:00Z`), 2 * 86_400_000);
});
