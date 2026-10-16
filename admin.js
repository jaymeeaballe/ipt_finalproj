
let adminFilter = "All";
const FILTERS = ["All", ...Object.values(STATUS)];
const ACTIONS = { accept: STATUS.ACCEPTED, decline: STATUS.DECLINED, start: STATUS.PROGRESS, ready: STATUS.READY, done: STATUS.DONE, noshow: STATUS.NOSHOW };
const NEXT = {
  [STATUS.PENDING]: ["accept", "decline"],
  [STATUS.ACCEPTED]: ["start", "noshow"],
  [STATUS.PROGRESS]: ["ready"],
  [STATUS.READY]: ["done"],
};

const ownerOf = (b) => db.get("ps_users").find((u) => uidOf(u) === b.owner);
const petOf = (b) => db.get("ps_pets").find((p) => p.id === b.petId);

function renderAdmin() {
  const all = db.get("ps_bookings"), today = iso(new Date());
  const count = (s) => all.filter((b) => b.status === s).length;
  const earned = all.filter((b) => b.status === STATUS.DONE).reduce((t, b) => t + b.total, 0);
  const stats = [
    ["Pending", count(STATUS.PENDING)],
    ["Accepted", count(STATUS.ACCEPTED)],
    ["Cancellation requests", count(STATUS.CANCEL_REQUESTED)],
    ["Today", all.filter((b) => b.date === today && holdsSlot(b)).length],
    ["In progress", count(STATUS.PROGRESS) + count(STATUS.READY)],
    ["Earned", peso(earned)],
  ];
  $("#adminStats").innerHTML = stats.map(([label, value]) => `<div class="card stat"><b>${value}</b><span class="muted">${label}</span></div>`).join("");
  $("#adminTabs").innerHTML = FILTERS.map((f) => `<button type="button" data-filter="${f}" class="${f === adminFilter ? "on" : ""}">${f}${f === "All" ? ` (${all.length})` : ` (${count(f)})`}</button>`).join("");

  const q = $("#adminSearch").value.trim().toLowerCase();
  const list = all
    .filter((b) => adminFilter === "All" || b.status === adminFilter)
    .filter((b) => !q || [b.ref, b.petName, b.service, b.groomer, ownerOf(b)?.name || ""].join(" ").toLowerCase().includes(q))
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  $("#adminList").innerHTML = list.length ? list.map(adminCard).join("") : '<p class="muted">No appointments match.</p>';
}

function adminCard(b) {
  const u = ownerOf(b), p = petOf(b);
  return `<div class="appt"><div>
    <div class="who">${p ? petAvatar(p) : ""}<div><b>${esc(b.petName)}</b> <span class="muted">${p ? esc(p.breed) + " · " + SIZES[p.size] + " · " + esc(p.temper) : ""}</span><br>
      <span class="muted">${esc(u?.name || "Unknown")} · ${esc(u ? u.email || u.phone : "")}</span></div></div>
    <p><span class="tag ${statusClass(b.status)}">${esc(b.status)}</span> <b>${esc(b.service)}</b>${b.cut ? " · " + esc(b.cut) : ""}</p>
    ${new Date(b.date + "T00:00").toDateString()} · ${fmtTime(b.time)} · Groomer: ${esc(b.groomer)}<br>
    ${b.addons.map((a) => `<span class="tag">${esc(a)}</span>`).join("")}
    ${b.status === STATUS.CANCEL_REQUESTED ? `<p class="msg err"><b>Cancellation request:</b> ${esc(b.cancellationRequestReason || "")}</p>` : ""}
    ${p && p.notes ? `<br><span class="muted">Pet notes: ${esc(p.notes)}</span>` : ""}
    ${b.notes ? `<br><span class="muted">Customer request: ${esc(b.notes)}</span>` : ""}
    ${b.note && b.status === STATUS.DECLINED ? `<br><span class="muted">Decline reason: ${esc(b.note)}</span>` : ""}<br>
    <span class="muted">${esc(b.payment)} · Ref ${esc(b.ref)} · ${(b.reminders || []).length} reminder(s)</span></div>
    <div class="actions"><b>${peso(b.total)}</b><br>${adminButtons(b)}</div></div>`;
}

function adminButtons(b) {
  const btn = (act, label, cls = "btn") => `<button class="${cls}" data-act="${act}" data-ref="${esc(b.ref)}">${label}</button>`;
  const labels = { accept: ["Accept"], decline: ["Decline", "danger"], start: ["Start grooming"], ready: ["Ready for pick-up"], done: ["Mark completed"], noshow: ["No-show", "danger"] };
  if (b.status === STATUS.CANCEL_REQUESTED)
    return `${btn("approve-cancel", "Approve cancellation")} ${btn("reject-cancel", "Reject cancellation", "danger")}`;
  return (NEXT[b.status] || []).map((act) => btn(act, ...labels[act])).join(" ");
}

$("#adminList").addEventListener("click", async (e) => {
  const b = e.target.closest("[data-act]");
  if (!b) return;
  const act = b.dataset.act, ref = b.dataset.ref;
  let note = "";
  if (act === "decline" || act === "reject-cancel") {
    const isCancel = act === "reject-cancel";
    note = prompt(isCancel ? "Explain why the cancellation request is declined (the customer will see this):" : "Reason for declining (the customer will see this):", isCancel ? "" : "No groomer available at that time");
    if (note === null) return;
    if (!note.trim()) return setMsg("#adminMsg", "Please provide an explanation for the customer.", "err");
  }
  b.disabled = true;
  setMsg("#adminMsg", act === "approve-cancel" || act === "reject-cancel" ? "Reviewing cancellation request..." : "Updating...");
  try {
    await requestJSON(API + "/posts/1", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: `${ref} ${act}` }) });
    const all = db.get("ps_bookings"), bk = all.find((x) => x.ref === ref);
    const isCancellationAction = act === "approve-cancel" || act === "reject-cancel";
    if (!bk || (isCancellationAction ? bk.status !== STATUS.CANCEL_REQUESTED : !(NEXT[bk.status] || []).includes(act))) {
      renderAdmin();
      return setMsg("#adminMsg", "That appointment was already changed (maybe the customer cancelled). The list is refreshed.", "err");
    }
    if (act === "approve-cancel") {
      bk.cancellationDecision = "approved";
      changeStatus(all, bk, STATUS.CANCELLED, "Cancellation approved by the salon");
    } else if (act === "reject-cancel") {
      const previousStatus = [STATUS.PENDING, STATUS.ACCEPTED].includes(bk.cancellationPreviousStatus)
        ? bk.cancellationPreviousStatus
        : STATUS.ACCEPTED;
      bk.cancellationDecision = "declined";
      bk.cancellationResponse = note.trim();
      changeStatus(all, bk, previousStatus, note.trim());
    } else {
      changeStatus(all, bk, ACTIONS[act], note);
    }
    db.set("ps_bookings", all);
    renderAdmin();
    const result = act === "approve-cancel" ? "cancellation approved" : act === "reject-cancel" ? "cancellation declined" : `now "${ACTIONS[act]}"`;
    setMsg("#adminMsg", `Appointment ${ref} ${result}.`, "ok");
  } catch (err) {
    b.disabled = false;
    setMsg("#adminMsg", "Could not update (" + err.message + "). Please try again.", "err");
  }
});

$("#adminTabs").addEventListener("click", (e) => {
  const f = e.target.closest("[data-filter]");
  if (f) { adminFilter = f.dataset.filter; renderAdmin(); }
});
$("#adminSearch").addEventListener("input", renderAdmin);
window.addEventListener("storage", (e) => {
  if (e.key === "ps_bookings" && isAdmin() && !$("#admin").hidden) renderAdmin();
});