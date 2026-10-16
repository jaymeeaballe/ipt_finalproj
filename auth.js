let me = db.get("ps_session", null);
const uidOf = (u) => u.id || u.email;
const user = () => db.get("ps_users").find((u) => uidOf(u) === me);
const isAdmin = () => user()?.role === "admin";
const myPets = () => db.get("ps_pets").filter((p) => p.owner === me).map((p) => Object.setPrototypeOf(p, Pet.prototype));
const myBookings = () => db.get("ps_bookings").filter((b) => b.owner === me);

function seedAdmin() {
  const users = db.get("ps_users");
  if (users.some((u) => u.role === "admin")) return;
  users.push({ id: "admin@pawspa.com", method: "email", role: "admin", name: "PawSpa Admin", email: "admin@pawspa.com", phone: "", pw: "admin123", verified: true });
  db.set("ps_users", users);
}
function renderNav() {
  const admin = isAdmin();
  $("#adminNavBtn").hidden = !admin;
  ["pets", "book", "appts"].forEach((v) => ($(`#nav [data-view=${v}]`).hidden = admin));
}
function renderAuthBox() {
  renderNav();
  $("#authBox").innerHTML = me
    ? `<button class="btn ghost" style="border-color:var(--pri);color:var(--pri)" data-view="profile">${esc(user()?.name.split(" ")[0] || "")}</button> <button class="btn ghost" style="border-color:var(--pri);color:var(--pri)" id="logout">Log out</button>`
    : `<button class="btn" data-view="auth" data-tab="login">Log in</button> <button class="btn ghost" style="border-color:var(--pri);color:var(--pri)" data-view="auth" data-tab="register">Register</button>`;
}
function setTab(tab) {
  $$("#authTabs button").forEach((b) => b.classList.toggle("on", b.dataset.tab === tab));
  $("#loginForm").hidden = tab !== "login";
  $("#regForm").hidden = tab !== "register";
}
function show(v, tab) {
  if (["pets", "book", "appts", "profile", "admin"].includes(v) && !me) { v = "auth"; setMsg("#authMsg", "Please log in or register first.", "err"); }
  if (v === "admin" && !isAdmin()) v = "home";
  if (isAdmin() && ["pets", "book", "appts"].includes(v)) v = "admin";
  $$(".view").forEach((s) => (s.hidden = s.id !== v));
  $$("#nav button").forEach((b) => b.classList.toggle("on", b.dataset.view === v));
  if (tab) setTab(tab);
  if (v !== "book") resched = null;
  if (v === "profile") fillProfile();
  if (v === "admin") renderAdmin();
  if (v === "pets") renderPets();
  if (me) renderVaccineReminders();
  if (v === "book") initBook();
  if (v === "appts") renderAppts();
  window.scrollTo(0, 0);
}

document.addEventListener("click", (e) => {
  const t = e.target.closest("[data-view]");
  if (t) { e.preventDefault(); resched = null; show(t.dataset.view, t.dataset.tab); }
  if (e.target.id === "logout") { me = null; db.set("ps_session", null); renderAuthBox(); show("home"); }
});
$("#authTabs").addEventListener("click", (e) => { const b = e.target.closest("[data-tab]"); if (b) setTab(b.dataset.tab); });

function login(email) {
  me = email; db.set("ps_session", email);
  adminFilter = "All"; $("#adminSearch").value = "";
  renderAuthBox();
}

const regContact = $("#regContact"), regFb = $("#regContactFb");

function validateRegContact() {
  const value = regContact.value.trim().toLowerCase();
  const r = /^\S+@\S+\.\S+$/.test(value)
    ? { ok: true, value }
    : { ok: false, value, msg: "Enter a valid email address." };
  if (r.ok) showValid(regContact, regFb); else showError(regContact, regFb, r.msg);
  return r;
}
["input", "blur"].forEach((ev) => regContact.addEventListener(ev, validateRegContact));

$("#regForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const f = new FormData(e.target), name = f.get("name").trim(), pw = f.get("password"), errs = [];
  const c = validateRegContact();
  if (name.length < 2) errs.push("Enter your full name.");
  if (!c.ok) errs.push(c.msg);
  if (!/^(?=.*\d).{8,}$/.test(pw)) errs.push("Password needs 8+ characters including a number.");
  if (pw !== f.get("confirm")) errs.push("Passwords do not match.");
  if (c.ok && db.get("ps_users").some((u) => u.email?.toLowerCase() === c.value))
    errs.push("That email is already registered.");
  if (errs.length) return setMsg("#authMsg", errs.join(" "), "err");
  const users = db.get("ps_users");
  users.push({ id: c.value, method: "email", name, email: c.value, phone: "", pw });
  db.set("ps_users", users);
  e.target.reset();
  regContact.classList.remove("valid", "invalid"); regFb.textContent = "";
  login(c.value);
  show("pets");
  setMsg("#petMsg", "Account created! Now register your pet so you can book.", "ok");
});

const emailInput = $("#loginEmail"), pwInput = $("#loginPassword");
const emailFb = $("#loginEmailFb"), pwFb = $("#loginPasswordFb");

function showError(input, fb, message) {
  fb.textContent = message;
  fb.className = "fb error";
  input.classList.remove("valid");
  input.classList.add("invalid");
}
function showValid(input, fb) {
  fb.textContent = "Looks good.";
  fb.className = "fb ok";
  input.classList.remove("invalid");
  input.classList.add("valid");
}
function validateLoginEmail() {
  const value = emailInput.value.trim();
  if (value === "") { showError(emailInput, emailFb, "Email address is required."); return false; }
  if (!/^\S+@\S+\.\S+$/.test(value)) { showError(emailInput, emailFb, "Enter a valid email address."); return false; }
  showValid(emailInput, emailFb);
  return true;
}
function validateLoginPassword() {
  const value = pwInput.value;
  if (value === "") { showError(pwInput, pwFb, "Password is required."); return false; }
  if (value.length < 6) { showError(pwInput, pwFb, "Password must have at least 6 characters."); return false; }
  showValid(pwInput, pwFb);
  return true;
}
["input", "blur"].forEach((ev) => {
  emailInput.addEventListener(ev, validateLoginEmail);
  pwInput.addEventListener(ev, validateLoginPassword);
});
$("#showPw").addEventListener("change", (e) => { pwInput.type = e.target.checked ? "text" : "password"; });

const savedEmail = db.get("ps_remember", "");
if (savedEmail) { emailInput.value = savedEmail; $("#rememberMe").checked = true; }

$("#loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const emailOk = validateLoginEmail(), pwOk = validateLoginPassword();
  if (!emailOk || !pwOk) return setMsg("#authMsg", "Please fix the highlighted fields.", "err");
  const btn = $("#loginBtn");
  btn.disabled = true;
  setMsg("#authMsg", "Checking your account...");
  await delay(800);
  const id = emailInput.value.trim().toLowerCase();
  const u = db.get("ps_users").find((x) => x.email?.toLowerCase() === id && x.pw === pwInput.value);
  btn.disabled = false;
  if (!u) return setMsg("#authMsg", "Incorrect email or password.", "err");
  db.set("ps_remember", $("#rememberMe").checked ? id : "");
  login(uidOf(u));
  setMsg("#authMsg", "✓ Login successful! Redirecting...", "ok");
  setTimeout(() => {
    pwInput.value = ""; pwInput.type = "password"; $("#showPw").checked = false;
    [emailInput, pwInput].forEach((x) => x.classList.remove("valid", "invalid"));
    emailFb.textContent = pwFb.textContent = "";
    setMsg("#authMsg", "");
    show(isAdmin() ? "admin" : myPets().length ? "book" : "pets");
  }, 800);
});