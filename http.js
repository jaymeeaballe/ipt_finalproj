const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function requestJSON(url, options = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    if (!response.ok) throw new Error("HTTP " + response.status);
    if (response.status === 204) return null;
    return await response.json();
  } catch (error) {
    if (error.name === "AbortError") throw new Error("Request timed out");
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

const TIP_APIS = {
  dog: { url: "https://dogapi.dog/api/v2/facts", pick: (json) => (json.data || []).map((x) => x.attributes?.body || x.fact) },
  cat: { url: "https://catfact.ninja/facts", pick: (json) => (json.data || []).map((x) => x.fact) },
};
const BACKUP_TIPS = {
  dog: ["Brush your dog several times a week to prevent mats, especially for long or curly coats.", "Trim nails every 3–4 weeks. If you hear clicking on the floor, they are too long.", "Use dog shampoo only; human shampoo can dry out a dog's skin."],
  cat: ["Brush long-haired cats daily to reduce hairballs and tangles.", "Most cats groom themselves, but older cats may need help reaching their back and hindquarters.", "Introduce nail trims gently with treats so grooming stays stress-free."],
};

function loadTips(species = "dog") {
  const source = TIP_APIS[species];
  const params = new URLSearchParams({ limit: "3" });
  $$("[data-tips]").forEach((b) => { b.disabled = true; b.classList.toggle("on", b.dataset.tips === species); });
  setMsg("#tipsMsg", "Loading tips...");
  $("#tips").textContent = "";
  const show = (items) => items.filter(Boolean).forEach((text) => {
    const card = document.createElement("div");
    card.className = "card";
    card.textContent = text;
    $("#tips").append(card);
  });
  return requestJSON(source.url + "?" + params)
    .then((json) => {
      const items = source.pick(json).filter(Boolean);
      if (!items.length) throw new Error("no tips returned");
      show(items);
      setMsg("#tipsMsg", "");
    })
    .catch((error) => {
      show(BACKUP_TIPS[species]);
      setMsg("#tipsMsg", "Could not reach the tips API (" + error.message + "). Showing built-in tips instead.", "err");
    })
    .finally(() => { $$("[data-tips]").forEach((b) => (b.disabled = false)); });
}
$("#tipsBar").addEventListener("click", (e) => {
  const b = e.target.closest("[data-tips]");
  if (b) loadTips(b.dataset.tips);
});