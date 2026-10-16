
function renderAppts() {
  const pets = myPets();
  const list = myBookings().sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  $("#apptList").innerHTML = list.length
    ? list.map((b) => apptCard(b, pets.find((p) => p.id === b.petId))).join("")
    : '<p class="muted">No appointments yet.</p>';
}

function apptCard(b, pet) {
  const open = [STATUS.PENDING, STATUS.ACCEPTED].includes(b.status);
  const buttons = open
    ? `<button class="btn" data-resched="${esc(b.ref)}">Reschedule</button> <button class="danger" data-cancel="${esc(b.ref)}">Cancel</button>`
    : b.status === STATUS.DECLINED ? `<button class="btn" data-rebook="${esc(b.petId || "")}">Book again</button>` : "";
  const updated = b.updatedAt ? new Date(b.updatedAt).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" }) : "";
  const cancellationInfo = [
    b.status === STATUS.CANCEL_REQUESTED ? `Cancellation reason: ${esc(b.cancellationRequestReason || "")}` : "",
    b.cancellationDecision === "declined" ? `Cancellation request declined. Salon explanation: ${esc(b.cancellationResponse || "")}` : "",
  ].filter(Boolean).join("<br>");
  return `<div class="appt"><div>
    <div class="who">${pet ? petAvatar(pet) : ""}<div><b>${esc(b.service)}</b> for <b>${esc(b.petName)}</b><br>
      <span class="tag ${statusClass(b.status)}">${esc(b.status)}</span>${b.rescheduled ? '<span class="tag">Rescheduled</span>' : ""}</div></div>
    <p class="muted">${esc(STATUS_HELP[b.status] || "")}${b.note && b.status === STATUS.DECLINED ? " Reason: " + esc(b.note) : ""}</p>
    ${cancellationInfo ? `<p class="muted">${cancellationInfo}</p>` : ""}
    ${new Date(b.date + "T00:00").toDateString()} · ${fmtTime(b.time)} · Groomer: ${esc(b.groomer)}<br>
    ${b.cut ? `<span class="tag">Cut: ${esc(b.cut)}</span>` : ""}${b.addons.map((a) => `<span class="tag">${esc(a)}</span>`).join("")}<br>
    <span class="muted">${esc(b.payment)} · Ref ${esc(b.ref)}${updated ? " · Updated " + updated : ""}</span></div>
    <div><b>${peso(b.total)}</b><br>${buttons}</div></div>`;
}

$("#apptList").addEventListener("click", async (e) => {
  const r = e.target.closest("[data-resched]"), rb = e.target.closest("[data-rebook]"), c = e.target.closest("[data-cancel]");
  if (r) return startResched(r.dataset.resched);
  if (rb) {
    resched = null; show("book");
    if (rb.dataset.rebook) { $("#bkPet").value = rb.dataset.rebook; onPetChange(); }
    return;
  }
  if (!c) return;
  const reason = prompt("Why are you requesting to cancel this appointment? (24-hour notice policy applies)");
  if (reason === null) return;
  if (!reason.trim()) return setMsg("#apptMsg", "Please provide a reason for the cancellation request.", "err");
  c.disabled = true;
  setMsg("#apptMsg", "Sending cancellation request...");
  try {
    await requestJSON(API + "/posts/1", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: `Cancellation request ${c.dataset.cancel}` }) });
    const all = db.get("ps_bookings"), b = all.find((x) => x.ref === c.dataset.cancel);
    if (!b || ![STATUS.PENDING, STATUS.ACCEPTED].includes(b.status)) {
      renderAppts();
      return setMsg("#apptMsg", "This appointment was just updated by the salon, so a cancellation request can't be made.", "err");
    }
    b.cancellationPreviousStatus = b.status;
    b.cancellationRequestReason = reason.trim();
    b.cancellationResponse = "";
    b.cancellationDecision = "";
    changeStatus(all, b, STATUS.CANCEL_REQUESTED, reason.trim());
    db.set("ps_bookings", all); renderAppts();
    setMsg("#apptMsg", "Cancellation request sent to the salon. Your appointment remains active until the salon reviews it.", "ok");
  } catch (err) {
    c.disabled = false;
    setMsg("#apptMsg", "Could not send the cancellation request (" + err.message + "). Please try again.", "err");
  }
});