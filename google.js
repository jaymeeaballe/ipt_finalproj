function decodeJwt(token) {
  const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
  const json = decodeURIComponent(atob(base64).split("").map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)).join(""));
  return JSON.parse(json);
}

function handleGoogle(response) {
  try {
    const p = decodeJwt(response.credential);
    if (p.aud !== GOOGLE_CLIENT_ID) throw new Error("token is for a different app");
    if (!["accounts.google.com", "https://accounts.google.com"].includes(p.iss)) throw new Error("token is not from Google");
    if (p.exp * 1000 < Date.now()) throw new Error("token expired");
    if (!p.email || p.email_verified === false) throw new Error("your Google email is not verified");

    const email = p.email.toLowerCase(), users = db.get("ps_users");
    let u = users.find((x) => x.email === email);
    if (u && u.role === "admin") throw new Error("admin accounts must log in with email and password");
    if (!u) {
      u = { id: email, method: "google", name: p.name || email.split("@")[0], email, phone: "", pw: "", verified: true };
      users.push(u);
      db.set("ps_users", users);
    }
    login(uidOf(u));
    setMsg("#authMsg", "");
    show(myPets().length ? "book" : "pets");
    if (!myPets().length) setMsg("#petMsg", "Signed in with Google! Now register your pet so you can book.", "ok");
  } catch (err) {
    setMsg("#authMsg", "Google sign-in failed (" + err.message + "). Please try again.", "err");
  }
}

function startGoogle() {
  google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: handleGoogle });
  google.accounts.id.renderButton($("#googleBtn"), { theme: "outline", size: "large", shape: "pill", text: "continue_with", width: 280 });
}

function setupGoogle() {
  if (!GOOGLE_CLIENT_ID) {
    $("#googleBtn").innerHTML = '<button type="button" class="gbtn" id="googleSetup"><b>G</b> Continue with Google</button>';
    $("#googleSetup").addEventListener("click", () => setMsg("#authMsg", "Google sign-in is not set up yet. Add your Client ID in config.js (see README.md).", "err"));
    return;
  }
  if (window.google?.accounts?.id) return startGoogle();
  const script = document.createElement("script");
  script.src = "https://accounts.google.com/gsi/client";
  script.async = true;
  script.onload = startGoogle;
  script.onerror = () => { $("#googleNote").textContent = "Could not load Google sign-in. Check your internet connection."; };
  document.head.append(script);
}
setupGoogle();