const sel = { date: null, time: null };
let resched = null;
let editingPet = null;
let cal = { y: new Date().getFullYear(), m: new Date().getMonth() };

function buildStatic() {
  $("#svcCards").innerHTML = SERVICES.map((s) => `<div class="card"><h3>${s.name}</h3><p class="muted">${s.desc}</p>
    <p>${s.pricedBySize ? Object.keys(SIZES).map((k) => `<span class="tag">${SIZES[k]} ${peso(s.price(k))}</span>`).join("") : `<span class="tag">${peso(s.price())} flat</span>`}</p></div>`).join("");
  $("#addonCards").innerHTML = ADDONS.map((a) => `<div class="card"><b>${a.name}</b> <span class="tag">${peso(a.price)}</span><p class="muted">${a.desc}</p></div>`).join("");
  $("#svcList").innerHTML = SERVICES.map((s, i) => `<label class="opt"><input type="radio" name="svc" value="${s.id}" ${i === 0 ? "checked" : ""}><b>${s.name}</b><span class="muted">${s.desc}</span></label>`).join("");
  $("#addons").innerHTML = ADDONS.map((a) => `<label class="opt" data-addon="${a.id}"><input type="checkbox" name="addon" value="${a.id}"><b>${a.name} · ${peso(a.price)}</b><span class="muted">${a.desc}</span></label>`).join("");
  $("#bkGroomer").innerHTML = '<option value="any">No preference</option>';
  $("#payList").innerHTML = PAYMENTS.map((p, i) => `<label class="opt"><input type="radio" name="pay" value="${p}" ${i === 0 ? "checked" : ""}> ${p}</label>`).join("");
}

function initBook() {
  const pets = myPets();
  $("#bkPet").innerHTML = '<option value="">Select a pet</option>' + pets.map((p) => `<option value="${p.id}">${esc(p.label)}</option>`).join("");
  $("#noPets").hidden = pets.length > 0;
  $("#bkBtn").disabled = !pets.length;
  $("#bkBtn").textContent = "Confirm booking";
  $$("#bkPet,#svcList input,#addons input,#bkCut").forEach((x) => (x.disabled = false));
  setMsg("#bkMsg", "");
  sel.date = sel.time = null;
  onPetChange(); renderCal(); renderSlots();
}
const val = (n) => ($(`[name=${n}]:checked`) || {}).value;
const curPet = () => myPets().find((p) => p.id === $("#bkPet").value);

function onPetChange() {
  const p = curPet(), full = val("svc") === "full";
  $("#cutWrap").hidden = !(p && full);
  if (p && full) $("#bkCut").innerHTML = (BREEDS[p.species][p.breed] || ["Groomer's choice"]).map((c) => `<option>${c}</option>`).join("");
  $$("[data-addon]").forEach((l) => {
    const a = ADDONS.find((x) => x.id === l.dataset.addon), off = a.not.includes(val("svc"));
    l.classList.toggle("off", off);
    const c = l.querySelector("input"); c.disabled = off; if (off) c.checked = false;
  });
  $("#bkPetPreview").innerHTML = p ? `<div class="who">${petAvatar(p)}<div><b>${esc(p.name)}</b><br><span class="muted">${esc(p.breed)} · ${SIZES[p.size]} · ${esc(p.temper)}</span></div></div>` : "";
  const pool = groomersFor(p), keep = $("#bkGroomer").value;
  $("#bkGroomer").innerHTML = '<option value="any">No preference</option>' + pool.map((g) => `<option value="${esc(g.name)}">${esc(groomerLabel(g))}</option>`).join("");
  if (pool.some((g) => g.name === keep)) $("#bkGroomer").value = keep;
  $("#groomerNote").textContent = p ? `Showing ${p.species.toLowerCase()} specialists${p.size ? " (" + SIZES[p.size] + ")" : ""}.` : "";
  if (sel.time && slotTaken(sel.time)) sel.time = null;
  renderSlots();
  updateSummary();
}
function calc() {
  const pet = curPet(), svc = SERVICES.find((s) => s.id === val("svc"));
  if (!pet || !svc) return null;
  const lines = [[`${svc.name} (${SIZES[pet.size]})`, svc.price(pet.size)]];
  $$("[name=addon]:checked").forEach((c) => { const a = ADDONS.find((x) => x.id === c.value); lines.push([a.name, a.price]); });
  return { pet, svc, lines, total: lines.reduce((t, l) => t + l[1], 0) };
}
function updateSummary() {
  const c = calc();
  $("#summary").innerHTML = c
    ? c.lines.map((l) => `<div class="line"><span>${esc(l[0])}</span><span>${peso(l[1])}</span></div>`).join("") +
      `<div class="sum">Total: ${peso(c.total)}</div>` +
      (sel.date ? `<p>${new Date(sel.date + "T00:00").toDateString()}${sel.time ? " at " + fmtTime(sel.time) : ""}</p>` : "")
    : "Choose a pet and a service.";
}

function renderCal() {
  const first = new Date(cal.y, cal.m, 1), days = new Date(cal.y, cal.m + 1, 0).getDate();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  let h = `<div class="calhead"><button type="button" data-nav="-1">‹</button><b>${first.toLocaleString("en", { month: "long", year: "numeric" })}</b><button type="button" data-nav="1">›</button></div><div class="calgrid">`;
  h += ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => `<span>${d}</span>`).join("") + "<i></i>".repeat(first.getDay());
  for (const d of Array.from({ length: days }, (_, i) => i + 1)) {
    const dt = new Date(cal.y, cal.m, d), off = dt < today || dt.getDay() === 0;
    h += `<button type="button" data-date="${iso(dt)}" class="${sel.date === iso(dt) ? "on" : ""}" ${off ? "disabled" : ""}>${d}</button>`;
  }
  $("#cal").innerHTML = h + "</div><p class='muted'>Closed Sundays.</p>";
}
$("#cal").addEventListener("click", (e) => {
  const n = e.target.closest("[data-nav]"), d = e.target.closest("[data-date]");
  if (n) { cal.m += +n.dataset.nav; if (cal.m < 0) { cal.m = 11; cal.y--; } if (cal.m > 11) { cal.m = 0; cal.y++; } renderCal(); }
  if (d) { sel.date = d.dataset.date; sel.time = null; renderCal(); renderSlots(); updateSummary(); }
});

function slotTaken(t) {
  const g = $("#bkGroomer").value;
  const booked = db.get("ps_bookings").filter((b) => b.date === sel.date && b.time === t && holdsSlot(b) && b.ref !== resched);
  const pool = groomersFor(curPet());
  if (!pool.length) return false;
  return g === "any" ? booked.filter((b) => pool.some((x) => x.name === b.groomer)).length >= pool.length : booked.some((b) => b.groomer === g);
}
function renderSlots() {
  $("#slotTitle").textContent = sel.date ? "Available times · " + new Date(sel.date + "T00:00").toDateString() : "Pick a date";
  const now = new Date();
  $("#slots").innerHTML = sel.date
    ? TIMES.map((t) => {
        const past = new Date(`${sel.date}T${t}`) < now;
        return `<button type="button" data-time="${t}" class="${sel.time === t ? "on" : ""}" ${past || slotTaken(t) ? "disabled" : ""}>${fmtTime(t)}</button>`;
      }).join("")
    : "";
}
$("#slots").addEventListener("click", (e) => {
  const b = e.target.closest("[data-time]");
  if (b) { sel.time = b.dataset.time; renderSlots(); updateSummary(); }
});

$("#bkPet").addEventListener("change", onPetChange);
$("#svcList").addEventListener("change", onPetChange);
$("#addons").addEventListener("change", updateSummary);
$("#bkGroomer").addEventListener("change", () => { sel.time = null; renderSlots(); updateSummary(); });

$("#bookForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const c = calc(), errs = [];
  if (!c) errs.push("Select a pet first.");
  if (!sel.date) errs.push("Pick a date.");
  else if (!sel.time) errs.push("Pick a time slot.");
  if (errs.length) return setMsg("#bkMsg", errs.join(" "), "err");
  if (slotTaken(sel.time)) { renderSlots(); return setMsg("#bkMsg", "Sorry, that slot was just taken. Please pick another.", "err"); }

  const btn = $("#bkBtn");
  btn.disabled = true;
  setMsg("#bkMsg", "Booking your appointment...");
  try {
    const gSel = $("#bkGroomer").value;
    const taken = db.get("ps_bookings").filter((b) => b.date === sel.date && b.time === sel.time && holdsSlot(b) && b.ref !== resched).map((b) => b.groomer);
    const groomer = gSel === "any" ? groomersFor(c.pet).find((g) => !taken.includes(g.name))?.name : gSel;
    if (!groomer) throw new Error("no groomer is free at that time");
    if (resched) {
      await requestJSON(API + "/posts/1", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: "Rescheduled " + resched }) });
      const all = db.get("ps_bookings"), bk = all.find((x) => x.ref === resched);
      Object.assign(bk, { date: sel.date, time: sel.time, groomer, reminders: $$("[name=rem]:checked").map((r) => r.value), notes: $("#bkNotes").value.trim(), payment: val("pay"), rescheduled: true });
      delete bk.cancellationPreviousStatus;
      delete bk.cancellationRequestReason;
      delete bk.cancellationResponse;
      delete bk.cancellationDecision;
      changeStatus(all, bk, STATUS.PENDING, "Rescheduled by you. Waiting for the salon to approve the new time.");
      db.set("ps_bookings", all);
      const ref = resched; resched = null;
      show("appts");
      setMsg("#apptMsg", `Appointment ${ref} rescheduled. It is Pending again until the salon approves the new time.`, "ok");
      return;
    }
    const res = await requestJSON(API + "/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "PawSpa booking", body: `${c.pet.name} ${c.svc.name} ${sel.date} ${sel.time}`, userId: 1 }),
    });
    const booking = new Booking({
      ref: "PS-" + Date.now().toString(36).toUpperCase().slice(-5) + res.id,
      owner: me, petId: c.pet.id, petName: c.pet.name, petLabel: c.pet.label, service: c.svc.name,
      cut: c.svc.id === "full" ? $("#bkCut").value : "",
      addons: c.lines.slice(1).map((l) => l[0]), date: sel.date, time: sel.time, groomer,
      reminders: $$("[name=rem]:checked").map((r) => r.value), payment: val("pay"),
      notes: $("#bkNotes").value.trim(), total: c.total,
    });
    const all = db.get("ps_bookings"); all.push(booking); db.set("ps_bookings", all);
    show("appts");
    setMsg("#apptMsg", `Request sent! Reference ${booking.ref}. Status: Pending until the salon accepts it.`, "ok");
  } catch (err) {
    setMsg("#bkMsg", "Could not complete booking (" + err.message + "). Nothing was saved, please try again.", "err");
  } finally {
    btn.disabled = false;
  }
});

function startResched(ref) {
  const b = myBookings().find((x) => x.ref === ref);
  if (!b) return;
  resched = ref;
  show("book");
  const pet = myPets().find((p) => p.id === b.petId) || myPets().find((p) => p.name === b.petName);
  if (!pet) { resched = null; show("appts"); return setMsg("#apptMsg", "That pet was removed, so this booking can't be rescheduled. Cancel it and book again.", "err"); }
  $("#bkPet").value = pet.id;
  $(`[name=svc][value=${SERVICES.find((s) => s.name === b.service).id}]`).checked = true;
  onPetChange();
  if (b.cut) $("#bkCut").value = b.cut;
  $$("[name=addon]").forEach((c) => (c.checked = b.addons.includes(ADDONS.find((a) => a.id === c.value).name)));
  $$("[name=rem]").forEach((c) => (c.checked = b.reminders.includes(c.value)));
  $$("[name=pay]").forEach((r) => (r.checked = r.value === b.payment));
  $("#bkGroomer").value = [...$("#bkGroomer").options].some((o) => o.value === b.groomer) ? b.groomer : "any";
  $("#bkNotes").value = b.notes || "";
  $$("#bkPet,#svcList input,#addons input,#bkCut").forEach((x) => (x.disabled = true));
  $("#bkBtn").textContent = "Save new schedule";
  updateSummary();
  setMsg("#bkMsg", `Rescheduling ${ref}: pick a new date, time or groomer.`, "ok");
}