const packages = {
  day1: { name: "1 Day", days: 1, basePaise: 1_500_000 },
  day10: { name: "10 Days", days: 10, basePaise: 13_500_000 },
  day20: { name: "20 Days", days: 20, basePaise: 24_000_000 },
  day30: { name: "30 Days", days: 30, basePaise: 31_500_000 },
};

const routes = {
  metro: { name: "Airport Axis", distanceKm: 32 },
  retail: { name: "Central Retail Loop", distanceKm: 11 },
  campus: { name: "Tech Park Circuit", distanceKm: 14 },
};

const slotPricingPaise = {
  Morning: 0,
  Afternoon: 150_000,
  Evening: 320_000,
  Night: 260_000,
};

export function getPackage(packageCode) {
  return packages[packageCode] || null;
}

export function calculatePricing(input) {
  const selectedPackage = getPackage(input.packageCode);
  const selectedRoute = routes[input.routeCode];
  const slotCostPaise = slotPricingPaise[input.slot];

  if (!selectedPackage || !selectedRoute || slotCostPaise === undefined) {
    throw new Error("Unsupported package, route, or time slot.");
  }

  const radiusKm = Number(input.radiusKm);
  const durationSeconds = Number(input.durationSeconds);
  if (!Number.isInteger(radiusKm) || radiusKm < 5 || radiusKm > 25) {
    throw new Error("Campaign radius must be between 5 and 25 km.");
  }
  if (!Number.isInteger(durationSeconds) || durationSeconds < 10 || durationSeconds > 60) {
    throw new Error("Ad duration must be between 10 and 60 seconds.");
  }

  const routeCostPaise = Math.max(selectedRoute.distanceKm - 50, 0) * 22_000;
  const radiusCostPaise = Math.max(radiusKm - 8, 0) * 28_500;
  const durationCostPaise = Math.max(durationSeconds - 30, 0) * 11_000;
  const creativeCostPaise = input.creativeType === "video" && input.needsVideo ? 700_000 : 0;
  const subtotalPaise = selectedPackage.basePaise
    + routeCostPaise
    + radiusCostPaise
    + durationCostPaise
    + creativeCostPaise
    + slotCostPaise;
  const gstPaise = Math.round(subtotalPaise * 0.18);

  return {
    packageName: selectedPackage.name,
    packageDays: selectedPackage.days,
    routeName: selectedRoute.name,
    distanceKm: selectedRoute.distanceKm,
    packageCostPaise: selectedPackage.basePaise,
    routeAndRadiusPaise: routeCostPaise + radiusCostPaise + durationCostPaise,
    creativeCostPaise,
    slotCostPaise,
    subtotalPaise,
    gstPaise,
    totalPaise: subtotalPaise + gstPaise,
  };
}

export function getCampaignDates(startDate, packageDays) {
  const parsed = new Date(`${startDate}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Select a valid campaign date.");
  }

  const tomorrow = new Date();
  tomorrow.setUTCHours(0, 0, 0, 0);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const latest = new Date(tomorrow);
  latest.setUTCDate(latest.getUTCDate() + 180);
  if (parsed < tomorrow || parsed > latest) {
    throw new Error("Campaigns can be booked from tomorrow through the next 180 days.");
  }

  return Array.from({ length: packageDays }, (_, index) => {
    const date = new Date(parsed);
    date.setUTCDate(parsed.getUTCDate() + index);
    return date.toISOString().slice(0, 10);
  });
}
