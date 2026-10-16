db.set("ps_bookings", db.get("ps_bookings").map((b) => (b.status === "Confirmed" ? { ...b, status: STATUS.ACCEPTED } : b)));
seedAdmin();
buildStatic(); fillBreeds(); renderAuthBox(); show("home");

document.addEventListener("click", (e) => {
  if (e.target.closest("button")) $$(".msg").forEach((x) => { x.textContent = ""; x.className = "msg"; });
}, true);

function updateOpenStatus() {
  const now = new Date(), hour = now.getHours() + now.getMinutes() / 60;
  const open = now.getDay() !== 0 && hour >= 9 && hour < 17;
  $("#openStatus").textContent = open ? "We're open now until 5:00 PM" : "We're closed right now (Mon–Sat, 9:00 AM – 5:00 PM)";
}
updateOpenStatus();
setInterval(updateOpenStatus, 30000);

loadTips("dog");
window.pawspaReady = true;