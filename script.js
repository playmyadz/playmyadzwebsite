const state = {
  approved: false,
  businessName: "BlueSip Beverages",
  duration: 30,
  creativeType: "video",
  uploadedImageCount: 0,
  needsVideo: false,
  route: "metro",
  customRoute: false,
  origin: "HITEC City, Hyderabad, Telangana",
  destination: "Rajiv Gandhi International Airport, Hyderabad, Telangana",
  radius: 8,
  package: "day1",
  truck: "TRK-HYD-204",
  otpVerified: false,
  slot: "Evening",
  date: "",
};

const routes = {
  metro: {
    name: "Airport Axis",
    distance: 32,
    origin: "HITEC City, Hyderabad, Telangana",
    destination: "Rajiv Gandhi International Airport, Hyderabad, Telangana",
    waypoints: ["Gachibowli, Hyderabad, Telangana"],
  },
  retail: {
    name: "Central Retail Loop",
    distance: 11,
    origin: "Abids, Hyderabad, Telangana",
    destination: "Charminar, Hyderabad, Telangana",
    waypoints: ["Koti, Hyderabad, Telangana"],
  },
  campus: {
    name: "Tech Park Circuit",
    distance: 14,
    origin: "Madhapur, Hyderabad, Telangana",
    destination: "Financial District, Hyderabad, Telangana",
    waypoints: ["Kondapur, Hyderabad, Telangana"],
  },
};

const packages = {
  day1: { name: "1 Day", base: 15000 },
  day10: { name: "10 Days", base: 135000 },
  day20: { name: "20 Days", base: 240000 },
  day30: { name: "30 Days", base: 315000 },
};

const slotPricing = {
  Morning: 0,
  Afternoon: 1500,
  Evening: 3200,
  Night: 2600,
};

const availabilityText = {
  Morning: "14 morning slots currently open",
  Afternoon: "11 afternoon slots currently open",
  Evening: "8 evening slots currently open",
  Night: "6 night slots currently open",
};

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const summaryApproval = document.querySelector("#summaryApproval");
const summaryBusinessName = document.querySelector("#summaryBusinessName");
const summaryTruck = document.querySelector("#summaryTruck");
const businessNameInput = document.querySelector("#businessName");
const durationRange = document.querySelector("#durationRange");
const durationValue = document.querySelector("#durationValue");
const needsVideo = document.querySelector("#needsVideo");
const creativeChargeLabel = document.querySelector("#creativeChargeLabel");
const creativePathLabel = document.querySelector("#creativePathLabel");
const creativeValidationLabel = document.querySelector("#creativeValidationLabel");
const creativeFormatBadge = document.querySelector("#creativeFormatBadge");
const creativeUpload = document.querySelector("#creativeUpload");
const creativeUploadLabel = document.querySelector("#creativeUploadLabel");
const creativeUploadHelp = document.querySelector("#creativeUploadHelp");
const selectedFiles = document.querySelector("#selectedFiles");
const creativeTypeButtons = [...document.querySelectorAll("[data-creative-type]")];
const durationControl = document.querySelector("#durationControl");
const productionControl = document.querySelector("#productionControl");
const adReadinessButtons = [...document.querySelectorAll("[data-ad-readiness]")];
const radiusRange = document.querySelector("#radiusRange");
const radiusValue = document.querySelector("#radiusValue");
const routeName = document.querySelector("#routeName");
const routeDistance = document.querySelector("#routeDistance");
const hyderabadMap = document.querySelector("#hyderabadMap");
const mapAreaStatus = document.querySelector("#mapAreaStatus");
const openMapLink = document.querySelector("#openMapLink");
const locationPicker = document.querySelector("#locationPicker");
const originInput = document.querySelector("#originInput");
const destinationInput = document.querySelector("#destinationInput");
const mapHelp = document.querySelector("#mapHelp");
const availabilityLabel = document.querySelector("#availabilityLabel");
const approvalToggle = document.querySelector("#approvalToggle");
const approvalStatus = document.querySelector("#approvalStatus");
const accessStatus = document.querySelector("#accessStatus");
const notifyStatus = document.querySelector("#notifyStatus");
const approvalTimelineItem = document.querySelector("#approvalTimelineItem");

const stepButtons = [...document.querySelectorAll(".step-button")];
const panels = [...document.querySelectorAll(".flow-panel")];
const routeButtons = [...document.querySelectorAll(".route-card")];
const packageButtons = [...document.querySelectorAll(".package-card")];
const slotButtons = [...document.querySelectorAll("[data-slot]")];
const liveTruckMarker = document.querySelector("#liveTruckMarker");
const trackerLocation = document.querySelector("#trackerLocation");
const trackerLastUpdate = document.querySelector("#trackerLastUpdate");
const trackerProgressText = document.querySelector("#trackerProgressText");
const trackerSpeed = document.querySelector("#trackerSpeed");
const trackerEta = document.querySelector("#trackerEta");
const trackerProgressBar = document.querySelector("#trackerProgressBar");
const tripProgress = document.querySelector(".trip-progress");
const trackerToggle = document.querySelector("#trackerToggle");
const trackerTruckTitle = document.querySelector("#trackerTruckTitle");
const vehicleButtons = [...document.querySelectorAll("[data-truck]")];
const otpInput = document.querySelector("#otpInput");
const verifyOtp = document.querySelector("#verifyOtp");
const otpBadge = document.querySelector("#otpBadge");
const verificationIcon = document.querySelector("#verificationIcon");
const verificationTitle = document.querySelector("#verificationTitle");
const verificationCopy = document.querySelector("#verificationCopy");
const verificationTruck = document.querySelector("#verificationTruck");
const verificationTracking = document.querySelector("#verificationTracking");
const otpResult = document.querySelector(".otp-result");
const routePage = document.querySelector(".route-page");
const accountNavLink = document.querySelector("#accountNavLink");
const registrationCard = document.querySelector("#registrationCard");
const registrationForm = document.querySelector("#registrationForm");
const emailVerificationCard = document.querySelector("#emailVerificationCard");
const accountSuccessCard = document.querySelector("#accountSuccessCard");
const verificationEmail = document.querySelector("#verificationEmail");
const emailOtpInput = document.querySelector("#emailOtpInput");
const emailOtpHelp = document.querySelector("#emailOtpHelp");
const verifyEmailButton = document.querySelector("#verifyEmailButton");
const changeRegistrationButton = document.querySelector("#changeRegistrationButton");
const verifiedAccountCopy = document.querySelector("#verifiedAccountCopy");
const signOutButton = document.querySelector("#signOutButton");
const copyTripOtp = document.querySelector("#copyTripOtp");
const focusTripOtp = document.querySelector("#focusTripOtp");
const trackingOtpInput = document.querySelector("#trackingOtpInput");
const trackingOtpHelp = document.querySelector("#trackingOtpHelp");
const trackingOtpVerify = document.querySelector("#trackingOtpVerify");

const EMAIL_DEMO_CODE = "418206";
const TRIP_DEMO_CODE = "274891";
let pendingAccount = null;

const trackerStops = [
  { progress: 0, x: 8, y: 67, label: "Leaving HITEC City" },
  { progress: 0.32, x: 32, y: 52, label: "Near Gachibowli Junction" },
  { progress: 0.62, x: 59, y: 61, label: "Travelling on Nehru ORR" },
  { progress: 0.84, x: 79, y: 38, label: "Approaching Airport Road" },
  { progress: 1, x: 92, y: 25, label: "Arrived at RGIA" },
];

let trackerProgress = 0.12;
let trackerRunning = true;

function getVerifiedAccount() {
  try {
    return JSON.parse(sessionStorage.getItem("playmyadzVerifiedAccount") || "null");
  } catch {
    return null;
  }
}

function maskEmail(email) {
  const [name, domain] = email.split("@");
  if (!domain) {
    return email;
  }
  const visible = name.slice(0, Math.min(2, name.length));
  return `${visible}${"*".repeat(Math.max(3, name.length - visible.length))}@${domain}`;
}

function renderPortalAccess() {
  const account = getVerifiedAccount();
  const tripStarted = sessionStorage.getItem("playmyadzTripStarted") === "true";

  state.otpVerified = tripStarted;
  routePage.classList.toggle("portal-access-granted", Boolean(account));
  routePage.classList.toggle("trip-started", tripStarted);
  accountNavLink.textContent = account ? "My Account" : "Customer Access";
  registrationCard.classList.toggle("is-hidden", Boolean(account));
  emailVerificationCard.classList.add("is-hidden");
  accountSuccessCard.classList.toggle("is-hidden", !account);

  if (account) {
    verifiedAccountCopy.textContent = `${account.name}, ${account.email} is verified. Availability, routes, packages, payment, and trip controls are unlocked for this session.`;
  }
}

function startTrip(code, helpElement) {
  if (code !== TRIP_DEMO_CODE) {
    helpElement.textContent = "Incorrect code. Use 274891 for this prototype campaign.";
    return false;
  }

  sessionStorage.setItem("playmyadzTripStarted", "true");
  routePage.classList.add("trip-started");
  state.otpVerified = true;
  renderVerification();
  return true;
}

function formatCurrency(amount) {
  return currency.format(Math.round(amount));
}

function calculatePricing() {
  const selectedPackage = packages[state.package];
  const routeCost = Math.max(routes[state.route].distance - 50, 0) * 220;
  const radiusCost = Math.max(state.radius - 8, 0) * 285;
  const durationCost = Math.max(state.duration - 30, 0) * 110;
  const creativeCost = state.creativeType === "video" && state.needsVideo ? 7000 : 0;
  const slotCost = slotPricing[state.slot];
  const subtotal = selectedPackage.base + routeCost + radiusCost + durationCost + creativeCost + slotCost;
  const gst = subtotal * 0.18;

  return {
    packageCost: selectedPackage.base,
    routeAndRadius: routeCost + radiusCost + durationCost,
    creativeCost,
    slotCost,
    gst,
    total: subtotal + gst,
  };
}

function renderSummary() {
  const pricing = calculatePricing();
  const selectedPackage = packages[state.package];
  const selectedRoute = routes[state.route];

  summaryBusinessName.textContent = state.businessName || "Unnamed campaign";
  summaryTruck.textContent = state.truck;
  summaryApproval.textContent = state.approved ? "Approved to book" : "Awaiting approval";
  summaryApproval.classList.toggle("is-approved", state.approved);

  document.querySelector("#summaryPackage").textContent = selectedPackage.name;
  document.querySelector("#summaryRoute").textContent = selectedRoute.name;
  document.querySelector("#summaryDistance").textContent = `${selectedRoute.distance} km`;
  document.querySelector("#summaryRadius").textContent = `${state.radius} km`;
  document.querySelector("#summaryDuration").textContent = `${state.duration} sec`;
  document.querySelector("#summaryCreative").textContent = state.creativeType === "video"
    ? "Video"
    : state.uploadedImageCount
      ? `${state.uploadedImageCount} image${state.uploadedImageCount === 1 ? "" : "s"}`
      : "Images";
  document.querySelector("#summarySlot").textContent = state.slot;

  document.querySelector("#costPackage").textContent = formatCurrency(pricing.packageCost);
  document.querySelector("#costRoute").textContent = formatCurrency(pricing.routeAndRadius);
  document.querySelector("#costCreative").textContent = formatCurrency(pricing.creativeCost);
  document.querySelector("#costSlot").textContent = formatCurrency(pricing.slotCost);
  document.querySelector("#costTax").textContent = formatCurrency(pricing.gst);
  document.querySelector("#costTotal").textContent = formatCurrency(pricing.total);
}

function showPanel(step) {
  stepButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.step === step);
  });

  panels.forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.panel === step);
  });
}

function renderRoute() {
  const selectedRoute = routes[state.route];
  const origin = state.customRoute ? state.origin : selectedRoute.origin;
  const destination = state.customRoute ? state.destination : selectedRoute.destination;
  const waypoints = state.customRoute ? [] : selectedRoute.waypoints;

  routeName.textContent = state.customRoute ? "Custom Hyderabad route" : selectedRoute.name;
  trackerTruckTitle.textContent = `${state.truck} · ${state.customRoute ? "Custom Hyderabad route" : selectedRoute.name}`;
  routeDistance.textContent = state.customRoute
    ? `Pricing uses ${selectedRoute.distance} km route estimate`
    : `${selectedRoute.distance} km route selected`;
  mapAreaStatus.textContent = `${state.radius} km campaign coverage`;
  mapHelp.textContent = state.customRoute
    ? "Custom map preview applied. Actual distance is finalized when Google Routes API is enabled."
    : "Select a route card or choose your own From and To locations.";
  originInput.value = origin;
  destinationInput.value = destination;

  const apiKey = document.querySelector('meta[name="google-maps-api-key"]').content.trim();
  const directions = new URL("https://www.google.com/maps/dir/");
  directions.searchParams.set("api", "1");
  directions.searchParams.set("origin", origin);
  directions.searchParams.set("destination", destination);
  directions.searchParams.set("travelmode", "driving");
  if (waypoints.length) {
    directions.searchParams.set("waypoints", waypoints.join("|"));
  }
  openMapLink.href = directions.toString();

  if (apiKey) {
    const embed = new URL("https://www.google.com/maps/embed/v1/directions");
    embed.searchParams.set("key", apiKey);
    embed.searchParams.set("origin", origin);
    embed.searchParams.set("destination", destination);
    embed.searchParams.set("mode", "driving");
    if (waypoints.length) {
      embed.searchParams.set("waypoints", waypoints.join("|"));
    }
    hyderabadMap.src = embed.toString();
    return;
  }

  // The no-key view keeps the prototype usable; production should use the restricted Embed API key above.
  const fallback = new URL("https://maps.google.com/maps");
  fallback.searchParams.set("output", "embed");
  fallback.searchParams.set("q", `${origin} to ${destination}`);
  fallback.searchParams.set("z", "12");
  hyderabadMap.src = fallback.toString();
}

function renderApproval() {
  approvalStatus.textContent = state.approved ? "Approved" : "Pending review";
  accessStatus.textContent = state.approved ? "Portal unlocked" : "Portal locked";
  notifyStatus.textContent = state.approved ? "Approval email ready" : "Waiting to send";
  approvalToggle.textContent = state.approved ? "Revert to pending" : "Approve enquiry";
  approvalTimelineItem.classList.toggle("is-live", state.approved);
}

function renderCreativeState() {
  const isVideo = state.creativeType === "video";
  adReadinessButtons.forEach((button) => {
    const selectedReadiness = state.needsVideo ? "create" : "upload";
    button.classList.toggle("is-selected", button.dataset.adReadiness === selectedReadiness);
  });
  creativeTypeButtons.forEach((button) => {
    button.classList.toggle("is-selected", button.dataset.creativeType === state.creativeType);
  });
  creativeFormatBadge.textContent = isVideo ? "Video · MP4, AVI, MOV" : "Image · JPG, PNG, WEBP";
  creativeUpload.accept = isVideo
    ? ".mp4,.avi,.mov,video/mp4,video/quicktime"
    : ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp";
  creativeUpload.multiple = !isVideo;
  creativeUploadLabel.textContent = isVideo
    ? "Drop a video file here or browse to upload"
    : "Drop up to 10 images here or browse to upload";
  creativeUploadHelp.textContent = isVideo
    ? "Choose one video file. Prototype uploads stay local."
    : "Choose 1 to 10 images. JPG, PNG, and WEBP are accepted in this prototype.";
  durationControl.classList.toggle("is-hidden", !isVideo);
  productionControl.classList.toggle("is-hidden", !isVideo);
  creativeValidationLabel.textContent = isVideo
    ? "Duration and resolution checked"
    : "Resolution and aspect ratio checked";
  creativeChargeLabel.textContent = isVideo && state.needsVideo ? "₹7,000 added" : "₹0 added";
  creativePathLabel.textContent = isVideo
    ? state.needsVideo
      ? "Internal video creation job"
      : "Customer video review"
    : "Customer image review";
}

function renderScheduleState() {
  availabilityLabel.textContent = availabilityText[state.slot];
}

function renderVerification() {
  otpBadge.textContent = state.otpVerified ? "Trip verified" : "Verification pending";
  otpBadge.classList.toggle("badge-cool", state.otpVerified);
  otpBadge.classList.toggle("badge-neutral", !state.otpVerified);
  verificationIcon.textContent = state.otpVerified ? "OK" : "6";
  verificationTitle.textContent = state.otpVerified ? "Campaign trip confirmed" : "Waiting for verification";
  verificationCopy.textContent = state.otpVerified
    ? "The campaign has started. Live GPS and playback status are now available in the customer dashboard."
    : "OTP verification confirms that the assigned truck and advertiser are ready at the scheduled start time.";
  verificationTruck.textContent = state.truck;
  verificationTracking.textContent = state.otpVerified ? "Live" : "Locked";
  otpResult.classList.toggle("is-verified", state.otpVerified);
  verifyOtp.textContent = state.otpVerified ? "Verified" : "Verify and start tracking";
}

function renderTracker() {
  const nextIndex = trackerStops.findIndex((stop) => stop.progress >= trackerProgress);
  const endIndex = nextIndex === -1 ? trackerStops.length - 1 : Math.max(nextIndex, 1);
  const start = trackerStops[endIndex - 1];
  const end = trackerStops[endIndex];
  const segmentProgress = (trackerProgress - start.progress) / (end.progress - start.progress || 1);
  const x = start.x + (end.x - start.x) * segmentProgress;
  const y = start.y + (end.y - start.y) * segmentProgress;
  const nearestStop = segmentProgress < 0.58 ? start : end;
  const percent = Math.round(trackerProgress * 100);
  const speed = trackerProgress >= 1 ? 0 : Math.round(34 + Math.sin(trackerProgress * 24) * 7);
  const eta = Math.max(0, Math.round((1 - trackerProgress) * 59));

  liveTruckMarker.style.left = `${x}%`;
  liveTruckMarker.style.top = `${y}%`;
  trackerLocation.textContent = nearestStop.label;
  trackerLastUpdate.textContent = trackerRunning ? "Updated just now" : "Tracking paused";
  trackerProgressText.textContent = `${percent}%`;
  trackerSpeed.textContent = `${speed} km/h`;
  trackerEta.textContent = trackerProgress >= 1 ? "Arrived" : `${eta} min`;
  trackerProgressBar.style.width = `${percent}%`;
  tripProgress.setAttribute("aria-valuenow", percent);
}

function advanceTracker() {
  if (!trackerRunning) {
    return;
  }

  trackerProgress += 0.006;
  if (trackerProgress > 1) {
    trackerProgress = 0;
  }
  renderTracker();
}

function createDateChoices() {
  const dateChoices = document.querySelector("#dateChoices");
  const startDate = new Date("2026-09-10T00:00:00");

  for (let index = 0; index < 6; index += 1) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);

    const button = document.createElement("button");
    button.type = "button";
    button.className = `choice-chip${index === 0 ? " is-selected" : ""}`;
    button.dataset.date = date.toISOString().slice(0, 10);
    button.textContent = date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

    if (index === 0) {
      state.date = button.dataset.date;
    }

    button.addEventListener("click", () => {
      state.date = button.dataset.date;
      [...dateChoices.querySelectorAll(".choice-chip")].forEach((chip) => {
        chip.classList.toggle("is-selected", chip === button);
      });
    });

    dateChoices.appendChild(button);
  }
}

stepButtons.forEach((button) => {
  button.addEventListener("click", () => showPanel(button.dataset.step));
});

businessNameInput.addEventListener("input", (event) => {
  state.businessName = event.target.value.trim();
  renderSummary();
});

durationRange.addEventListener("input", (event) => {
  state.duration = Number(event.target.value);
  durationValue.textContent = state.duration;
  renderSummary();
});

needsVideo.addEventListener("change", (event) => {
  state.needsVideo = event.target.checked;
  renderCreativeState();
  renderSummary();
});

adReadinessButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.needsVideo = button.dataset.adReadiness === "create";
    if (state.needsVideo) {
      state.creativeType = "video";
    }
    needsVideo.checked = state.needsVideo;
    renderCreativeState();
    renderSummary();
  });
});

creativeTypeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.creativeType = button.dataset.creativeType;
    state.uploadedImageCount = 0;
    creativeUpload.value = "";
    selectedFiles.replaceChildren();
    selectedFiles.classList.remove("is-error");
    if (state.creativeType === "image") {
      state.needsVideo = false;
      needsVideo.checked = false;
    }
    renderCreativeState();
    renderSummary();
  });
});

creativeUpload.addEventListener("change", () => {
  const files = [...creativeUpload.files];
  selectedFiles.replaceChildren();
  selectedFiles.classList.remove("is-error");

  if (state.creativeType === "image" && files.length > 10) {
    creativeUpload.value = "";
    state.uploadedImageCount = 0;
    creativeUploadLabel.textContent = "Too many images selected";
    const error = document.createElement("span");
    error.textContent = "Select a maximum of 10 images.";
    selectedFiles.classList.add("is-error");
    selectedFiles.appendChild(error);
    renderSummary();
    return;
  }

  state.uploadedImageCount = state.creativeType === "image" ? files.length : 0;
  creativeUploadLabel.textContent = state.creativeType === "image"
    ? `${files.length} image${files.length === 1 ? "" : "s"} selected`
    : files[0]?.name || "Drop a video file here or browse to upload";

  files.forEach((file) => {
    const item = document.createElement("span");
    item.textContent = file.name;
    selectedFiles.appendChild(item);
  });

  if (files.length) {
    renderSummary();
  }
});

radiusRange.addEventListener("input", (event) => {
  state.radius = Number(event.target.value);
  radiusValue.textContent = state.radius;
  renderRoute();
  renderSummary();
});

approvalToggle.addEventListener("click", () => {
  state.approved = !state.approved;
  renderApproval();
  renderSummary();
});

routeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.route = button.dataset.route;
    state.customRoute = false;
    routeButtons.forEach((card) => {
      card.classList.toggle("is-selected", card === button);
    });
    renderRoute();
    renderSummary();
  });
});

locationPicker.addEventListener("submit", (event) => {
  event.preventDefault();
  state.origin = originInput.value.trim() || routes[state.route].origin;
  state.destination = destinationInput.value.trim() || routes[state.route].destination;
  state.customRoute = true;
  renderRoute();
});

packageButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.package = button.dataset.package;
    packageButtons.forEach((card) => {
      card.classList.toggle("is-selected", card === button);
    });
    renderSummary();
  });
});

vehicleButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.truck = button.dataset.truck;
    state.otpVerified = false;
    vehicleButtons.forEach((card) => {
      card.classList.toggle("is-selected", card === button);
    });
    renderSummary();
    renderVerification();
  });
});

slotButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.slot = button.dataset.slot;
    slotButtons.forEach((chip) => {
      chip.classList.toggle("is-selected", chip === button);
    });
    renderScheduleState();
    renderSummary();
  });
});

trackerToggle.addEventListener("click", () => {
  trackerRunning = !trackerRunning;
  trackerToggle.textContent = trackerRunning ? "Pause live demo" : "Resume live demo";
  renderTracker();
});

otpInput.addEventListener("input", () => {
  otpInput.value = otpInput.value.replace(/\D/g, "").slice(0, 6);
  if (state.otpVerified) {
    state.otpVerified = false;
    renderVerification();
  }
});

verifyOtp.addEventListener("click", () => {
  if (!startTrip(otpInput.value, otpHelp)) {
    otpBadge.textContent = "Incorrect code";
    verificationTitle.textContent = "Try the demo code again";
    verificationCopy.textContent = "Enter 274891 to simulate a verified campaign start.";
    return;
  }
  renderVerification();
});

registrationForm.addEventListener("submit", (event) => {
  event.preventDefault();
  pendingAccount = {
    name: document.querySelector("#registerName").value.trim(),
    business: document.querySelector("#registerBusiness").value.trim(),
    email: document.querySelector("#registerEmail").value.trim().toLowerCase(),
    mobile: document.querySelector("#registerMobile").value.trim(),
  };
  verificationEmail.textContent = maskEmail(pendingAccount.email);
  registrationCard.classList.add("is-hidden");
  emailVerificationCard.classList.remove("is-hidden");
  emailOtpInput.focus();
});

emailOtpInput.addEventListener("input", () => {
  emailOtpInput.value = emailOtpInput.value.replace(/\D/g, "").slice(0, 6);
  emailOtpHelp.textContent = "Prototype code: 418206";
});

verifyEmailButton.addEventListener("click", () => {
  if (!pendingAccount || emailOtpInput.value !== EMAIL_DEMO_CODE) {
    emailOtpHelp.textContent = "Incorrect code. Use 418206 for this prototype registration.";
    return;
  }

  sessionStorage.setItem("playmyadzVerifiedAccount", JSON.stringify(pendingAccount));
  renderPortalAccess();
});

changeRegistrationButton.addEventListener("click", () => {
  emailVerificationCard.classList.add("is-hidden");
  registrationCard.classList.remove("is-hidden");
});

signOutButton.addEventListener("click", () => {
  sessionStorage.removeItem("playmyadzVerifiedAccount");
  sessionStorage.removeItem("playmyadzTripStarted");
  pendingAccount = null;
  registrationForm.reset();
  emailOtpInput.value = "";
  renderPortalAccess();
});

copyTripOtp.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(TRIP_DEMO_CODE);
    copyTripOtp.textContent = "OTP copied for driver";
  } catch {
    copyTripOtp.textContent = `Driver OTP: ${TRIP_DEMO_CODE}`;
  }
});

focusTripOtp.addEventListener("click", () => {
  otpInput.focus();
});

trackingOtpInput.addEventListener("input", () => {
  trackingOtpInput.value = trackingOtpInput.value.replace(/\D/g, "").slice(0, 6);
  trackingOtpHelp.textContent = "Prototype code: 274891";
});

trackingOtpVerify.addEventListener("click", () => {
  if (startTrip(trackingOtpInput.value, trackingOtpHelp)) {
    renderTracker();
  }
});

renderPortalAccess();
createDateChoices();
renderApproval();
renderCreativeState();
renderRoute();
renderScheduleState();
renderSummary();
renderVerification();
renderTracker();
setInterval(advanceTracker, 1000);
