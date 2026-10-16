function fillProfile() {
  const u = user(), f = $("#profForm").elements;
  f.email.value = u.email; f.name.value = u.name; f.phone.value = u.phone; f.current.value = ""; f.newpw.value = "";
  $$("#profForm [data-toggle-password]").forEach((button) => {
    const input = document.getElementById(button.dataset.togglePassword);
    input.type = "password";
    button.setAttribute("aria-pressed", "false");
    button.setAttribute("aria-label", `Show ${input.name === "current" ? "current" : "new"} password`);
  });
  setMsg("#profMsg", "");
}
$("#profForm").addEventListener("click", (e) => {
  const button = e.target.closest("[data-toggle-password]");
  if (!button) return;
  const input = document.getElementById(button.dataset.togglePassword);
  const visible = input.type === "password";
  input.type = visible ? "text" : "password";
  button.setAttribute("aria-pressed", String(visible));
  button.setAttribute("aria-label", `${visible ? "Hide" : "Show"} ${input.name === "current" ? "current" : "new"} password`);
});
$("#profForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const f = new FormData(e.target), name = f.get("name").trim(), phone = f.get("phone").trim(), nw = f.get("newpw"), errs = [];
  const users = db.get("ps_users"), u = users.find((x) => x.email === me);
  if (name.length < 2) errs.push("Enter your full name.");
  if (!/^(09|\+639)\d{9}$/.test(phone)) errs.push("Mobile must look like 09171234567.");
  if (nw) {
    if (f.get("current") !== u.pw) errs.push("Current password is incorrect.");
    if (!/^(?=.*\d).{8,}$/.test(nw)) errs.push("New password needs 8+ characters including a number.");
  }
  if (errs.length) return setMsg("#profMsg", errs.join(" "), "err");
  u.name = name; u.phone = phone; if (nw) u.pw = nw;
  db.set("ps_users", users); renderAuthBox(); fillProfile();
  setMsg("#profMsg", "Profile updated.", "ok");
});

$("#contactForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const f = new FormData(e.target), name = f.get("name").trim(), email = f.get("email").trim(), message = f.get("message").trim();
  if (name.length < 2 || !/^\S+@\S+\.\S+$/.test(email) || message.length < 10)
    return setMsg("#contactMsg", "Enter your name, a valid email and a message of at least 10 characters.", "err");
  const all = db.get("ps_messages"); all.push({ name, email, message, at: new Date().toISOString() }); db.set("ps_messages", all);
  e.target.reset();
  setMsg("#contactMsg", "Thanks! Your message was saved (demo only, it is not actually emailed).", "ok");
});