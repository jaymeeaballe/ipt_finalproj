const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const peso = (n) => "₱" + n.toLocaleString("en-PH");
const db = {
  get(k, d = []) { try { return JSON.parse(localStorage.getItem(k)) || d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { } },
};
function setMsg(sel, text, type = "") { const el = $(sel); el.textContent = text; el.className = "msg " + type; }

const API = "https://jsonplaceholder.typicode.com";
const SIZES = { S: "Small", M: "Medium", L: "Large", XL: "X-Large" };
const SIZE_IDX = { S: 0, M: 1, L: 2, XL: 3 };
const SERVICES = [
  { id: "full", name: "Full Groom", prices: [650, 900, 1200, 1600], desc: "Bath, blow dry, haircut/styling, nail trim, ear cleaning, sanitary trim, cologne." },
  { id: "bath", name: "Bath & Blow Dry", prices: [400, 550, 750, 1000], desc: "Shampoo, conditioner, blow dry, brush-out and ear cleaning. No haircut." },
  { id: "nail", name: "Nail Trim Only", prices: [200], desc: "Nail trim and paw pad tidy. Walk-in friendly, flat rate." },
  { id: "ear", name: "Ear Cleaning Only", prices: [180], desc: "Gentle ear cleaning and hair removal from the ear canal. Flat rate." },
];
const ADDONS = [
  { id: "mat", name: "De-matting", price: 300, desc: "Per session; heavy matting may need a short shave-down.", not: [] },
  { id: "shed", name: "De-shedding Treatment", price: 350, desc: "Reduces loose undercoat.", not: ["nail", "ear"] },
  { id: "teeth", name: "Teeth Brushing", price: 150, desc: "Pet-safe toothpaste.", not: [] },
  { id: "flea", name: "Flea & Tick Treatment", price: 250, desc: "Medicated bath treatment.", not: ["nail", "ear"] },
  { id: "nailadd", name: "Nail Trim", price: 150, desc: "Add to Bath & Blow Dry.", not: ["full", "nail"] },
];
const BREEDS = {
  Dog: {
    "Shih Tzu": ["Puppy Cut", "Teddy Bear Cut", "Summer Cut", "Lion Cut"],
    "Poodle": ["Teddy Bear Cut", "Puppy Cut", "Continental Clip", "Lamb Cut"],
    "Maltese": ["Puppy Cut", "Show Coat Trim", "Summer Cut"],
    "Pomeranian": ["Teddy Bear Cut", "Lion Cut", "Neat Trim"],
    "Golden Retriever": ["Neat Trim (feathers)", "Sanitary Trim"],
    "Labrador": ["Sanitary Trim", "Neat Trim"],
    "Siberian Husky": ["Sanitary Trim", "Neat Trim"],
    "Corgi": ["Sanitary Trim", "Neat Trim"],
    "Pug": ["Sanitary Trim"],
    "Aspin (Mixed)": ["Sanitary Trim", "Short Trim"],
    "Other dog": ["Sanitary Trim", "Short Trim", "Groomer's choice"],
  },
  Cat: {
    "Persian": ["Lion Cut", "Sanitary Trim", "Belly Shave"],
    "Maine Coon": ["Lion Cut", "Sanitary Trim"],
    "Puspin (Domestic)": ["Sanitary Trim"],
    "Other cat": ["Sanitary Trim", "Lion Cut"],
  },
};
const GROOMERS = ["Ana (dog specialist)", "Marco (large breeds)", "Lia (cat friendly)"];
const PAYMENTS = ["Cash (pay at salon)", "GCash", "Maya", "Credit / Debit card (at salon)"];
const TIMES = ["09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00"];
const fmtTime = (t) => { const [h, m] = t.split(":").map(Number); return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`; };
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

class Pet {
  constructor(owner, f) {
    this.id = "p" + Date.now();
    this.owner = owner;
    Object.assign(this, f);
  }
  get label() { return `${this.name} · ${this.breed} · ${SIZES[this.size]}`; }
}
class Booking {
  constructor(o) { Object.assign(this, o); this.status = "Confirmed"; }
}

let me = db.get("ps_session", null);
const user = () => db.get("ps_users").find((u) => u.email === me);
const myPets = () => db.get("ps_pets").filter((p) => p.owner === me);
const myBookings = () => db.get("ps_bookings").filter((b) => b.owner === me);

function renderAuthBox() {
  $("#authBox").innerHTML = me
    ? `<span class="muted">Hi, ${esc(user()?.name.split(" ")[0] || "")}</span> <button class="btn ghost" style="border-color:var(--pri);color:var(--pri)" id="logout">Log out</button>`
    : `<button class="btn" data-view="auth" data-tab="login">Log in</button> <button class="btn ghost" style="border-color:var(--pri);color:var(--pri)" data-view="auth" data-tab="register">Register</button>`;
}
function setTab(tab) {
  $$(".tabs button").forEach((b) => b.classList.toggle("on", b.dataset.tab === tab));
  $("#loginForm").hidden = tab !== "login";
  $("#regForm").hidden = tab !== "register";
}
function show(v, tab) {
  if (["pets", "book", "appts"].includes(v) && !me) { v = "auth"; setMsg("#authMsg", "Please log in or register first.", "err"); }
  $$(".view").forEach((s) => (s.hidden = s.id !== v));
  $$("#nav button").forEach((b) => b.classList.toggle("on", b.dataset.view === v));
  if (tab) setTab(tab);
  if (v === "pets") renderPets();
  if (v === "book") initBook();
  if (v === "appts") renderAppts();
  window.scrollTo(0, 0);
}

document.addEventListener("click", (e) => {
  const t = e.target.closest("[data-view]");
  if (t) { e.preventDefault(); show(t.dataset.view, t.dataset.tab); }
  if (e.target.id === "logout") { me = null; db.set("ps_session", null); renderAuthBox(); show("home"); }
});
$(".tabs").addEventListener("click", (e) => { const b = e.target.closest("[data-tab]"); if (b) setTab(b.dataset.tab); });

function login(email) { me = email; db.set("ps_session", email); renderAuthBox(); }

$("#regForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  const name = f.get("name").trim(), email = f.get("email").trim().toLowerCase(), phone = f.get("phone").trim();
  const pw = f.get("password"), users = db.get("ps_users"), errs = [];
  if (name.length < 2) errs.push("Enter your full name.");
  if (!/^\S+@\S+\.\S+$/.test(email)) errs.push("Enter a valid email.");
  if (!/^(09|\+639)\d{9}$/.test(phone)) errs.push("Mobile must look like 09171234567.");
  if (!/^(?=.*\d).{8,}$/.test(pw)) errs.push("Password needs 8+ characters including a number.");
  if (pw !== f.get("confirm")) errs.push("Passwords do not match.");
  if (users.some((u) => u.email === email)) errs.push("That email is already registered.");
  if (errs.length) return setMsg("#authMsg", errs.join(" "), "err");
  users.push({ name, email, phone, pw });
  db.set("ps_users", users);
  login(email); e.target.reset();
  show("pets");
  setMsg("#petMsg", "Account created! Now register your pet so you can book.", "ok");
});
$("#loginForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  const u = db.get("ps_users").find((x) => x.email === f.get("email").trim().toLowerCase() && x.pw === f.get("password"));
  if (!u) return setMsg("#authMsg", "Incorrect email or password.", "err");
  login(u.email); e.target.reset(); setMsg("#authMsg", "");
  show(myPets().length ? "book" : "pets");
});

function fillBreeds() {
  const sp = $("#petSpecies").value;
  $("#petBreed").innerHTML = '<option value="">Select breed</option>' + Object.keys(BREEDS[sp]).map((b) => `<option>${b}</option>`).join("");
}
$("#petSpecies").addEventListener("change", fillBreeds);

$("#petForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(e.target));
  const errs = [];
  if (!f.name.trim()) errs.push("Enter your pet's name.");
  if (!f.breed) errs.push("Select a breed.");
  if (!f.size) errs.push("Select a size.");
  if (f.age === "" || f.age < 0 || f.age > 30) errs.push("Enter a valid age (0–30).");
  if (!f.vax) errs.push("Vaccinations must be up to date (rabies required) to be groomed.");
  if (errs.length) return setMsg("#petMsg", errs.join(" "), "err");
  const pets = db.get("ps_pets");
  pets.push(new Pet(me, { ...f, name: f.name.trim(), notes: (f.notes || "").trim() }));
  db.set("ps_pets", pets);
  e.target.reset(); fillBreeds(); renderPets();
  setMsg("#petMsg", "Pet saved! You can now book an appointment.", "ok");
});

function renderPets() {
  const pets = myPets();
  $("#petList").innerHTML = pets.length
    ? pets.map((p) => `<div class="pet"><div><b>${esc(p.name)}</b> <span class="muted">(${esc(p.species)})</span><br>
        <span class="tag">${esc(p.breed)}</span><span class="tag">${SIZES[p.size]}</span><span class="tag">${esc(p.coat)} coat</span>
        <span class="tag">${esc(p.sex)}, ${esc(p.age)} yr</span><span class="tag">${esc(p.temper)}</span>
        ${p.notes ? `<br><span class="muted">Notes: ${esc(p.notes)}</span>` : ""}</div>
        <div><button class="btn" data-book="${p.id}">Book</button> <button class="danger" data-del="${p.id}">Remove</button></div></div>`).join("")
    : '<p class="muted">No pets yet. Fill in the form to add your first one.</p>';
}
$("#petList").addEventListener("click", (e) => {
  const del = e.target.closest("[data-del]"), bk = e.target.closest("[data-book]");
  if (del && confirm("Remove this pet?")) {
    db.set("ps_pets", db.get("ps_pets").filter((p) => p.id !== del.dataset.del));
    renderPets();
  }
  if (bk) { show("book"); $("#bkPet").value = bk.dataset.book; onPetChange(); }
});

const sel = { date: null, time: null };
let cal = { y: new Date().getFullYear(), m: new Date().getMonth() };

function buildStatic() {
  $("#svcCards").innerHTML = SERVICES.map((s) => `<div class="card"><h3>${s.name}</h3><p class="muted">${s.desc}</p>
    <p>${s.prices.length > 1 ? Object.keys(SIZES).map((k, i) => `<span class="tag">${SIZES[k]} ${peso(s.prices[i])}</span>`).join("") : `<span class="tag">${peso(s.prices[0])} flat</span>`}</p></div>`).join("");
  $("#addonCards").innerHTML = ADDONS.map((a) => `<div class="card"><b>${a.name}</b> <span class="tag">${peso(a.price)}</span><p class="muted">${a.desc}</p></div>`).join("");
  $("#svcList").innerHTML = SERVICES.map((s, i) => `<label class="opt"><input type="radio" name="svc" value="${s.id}" ${i === 0 ? "checked" : ""}><b>${s.name}</b><span class="muted">${s.desc}</span></label>`).join("");
  $("#addons").innerHTML = ADDONS.map((a) => `<label class="opt" data-addon="${a.id}"><input type="checkbox" name="addon" value="${a.id}"><b>${a.name} · ${peso(a.price)}</b><span class="muted">${a.desc}</span></label>`).join("");
  $("#bkGroomer").innerHTML = '<option value="any">No preference</option>' + GROOMERS.map((g) => `<option>${g}</option>`).join("");
  $("#payList").innerHTML = PAYMENTS.map((p, i) => `<label class="opt"><input type="radio" name="pay" value="${p}" ${i === 0 ? "checked" : ""}> ${p}</label>`).join("");
}

function initBook() {
  const pets = myPets();
  $("#bkPet").innerHTML = pets.map((p) => `<option value="${p.id}">${esc(p.label)}</option>`).join("");
  $("#noPets").hidden = pets.length > 0;
  $("#bkBtn").disabled = !pets.length;
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
  updateSummary();
}
function calc() {
  const pet = curPet(), svc = SERVICES.find((s) => s.id === val("svc"));
  if (!pet || !svc) return null;
  const lines = [[`${svc.name} (${SIZES[pet.size]})`, svc.prices[SIZE_IDX[pet.size]] ?? svc.prices[0]]];
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
  for (let d = 1; d <= days; d++) {
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
  const booked = db.get("ps_bookings").filter((b) => b.date === sel.date && b.time === t && b.status === "Confirmed");
  return g === "any" ? booked.length >= GROOMERS.length : booked.some((b) => b.groomer === g);
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

async function requestJSON(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error("HTTP " + res.status);
  if (res.status === 204) return null;
  return res.json();
}

$("#bookForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const c = calc(), errs = [];
  if (!c) errs.push("Select a pet and a service.");
  if (!sel.date) errs.push("Pick a date.");
  else if (!sel.time) errs.push("Pick a time slot.");
  if (errs.length) return setMsg("#bkMsg", errs.join(" "), "err");
  if (slotTaken(sel.time)) { renderSlots(); return setMsg("#bkMsg", "Sorry, that slot was just taken. Please pick another.", "err"); }

  const btn = $("#bkBtn");
  btn.disabled = true;
  setMsg("#bkMsg", "Booking your appointment...");
  try {
    const gSel = $("#bkGroomer").value;
    const taken = db.get("ps_bookings").filter((b) => b.date === sel.date && b.time === sel.time).map((b) => b.groomer);
    const groomer = gSel === "any" ? GROOMERS.find((g) => !taken.includes(g)) : gSel;
    const res = await requestJSON(API + "/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "PawSpa booking", body: `${c.pet.name} ${c.svc.name} ${sel.date} ${sel.time}`, userId: 1 }),
    });
    const booking = new Booking({
      ref: "PS-" + Date.now().toString(36).toUpperCase().slice(-5) + res.id,
      owner: me, petName: c.pet.name, petLabel: c.pet.label, service: c.svc.name,
      cut: c.svc.id === "full" ? $("#bkCut").value : "",
      addons: c.lines.slice(1).map((l) => l[0]), date: sel.date, time: sel.time, groomer,
      reminders: $$("[name=rem]:checked").map((r) => r.value), payment: val("pay"),
      notes: $("#bkNotes").value.trim(), total: c.total,
    });
    const all = db.get("ps_bookings"); all.push(booking); db.set("ps_bookings", all);
    show("appts");
    setMsg("#apptMsg", `Booked! Reference ${booking.ref}.`, "ok");
  } catch (err) {
    setMsg("#bkMsg", "Could not complete booking (" + err.message + "). Nothing was saved, please try again.", "err");
  } finally {
    btn.disabled = false;
  }
});

function renderAppts() {
  const list = myBookings().sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  $("#apptList").innerHTML = list.length
    ? list.map((b) => `<div class="appt"><div><b>${esc(b.service)}</b> for <b>${esc(b.petName)}</b>
        <span class="tag ${b.status === "Cancelled" ? "x" : ""}">${b.status}</span><br>
        ${new Date(b.date + "T00:00").toDateString()} · ${fmtTime(b.time)} · Groomer: ${esc(b.groomer)}<br>
        ${b.cut ? `<span class="tag">Cut: ${esc(b.cut)}</span>` : ""}${b.addons.map((a) => `<span class="tag">${esc(a)}</span>`).join("")}<br>
        <span class="muted">${esc(b.payment)} · Ref ${esc(b.ref)}${b.reminders.length ? " · " + b.reminders.length + " reminder(s)" : ""}</span></div>
        <div><b>${peso(b.total)}</b><br>${b.status === "Confirmed" ? `<button class="danger" data-cancel="${b.ref}">Cancel</button>` : ""}</div></div>`).join("")
    : '<p class="muted">No appointments yet.</p>';
}
$("#apptList").addEventListener("click", (e) => {
  const c = e.target.closest("[data-cancel]");
  if (c && confirm("Cancel this appointment? (24-hour notice policy applies)")) {
    const all = db.get("ps_bookings"), b = all.find((x) => x.ref === c.dataset.cancel);
    if (b) b.status = "Cancelled";
    db.set("ps_bookings", all); renderAppts();
  }
});

buildStatic(); fillBreeds(); renderAuthBox(); show("home");