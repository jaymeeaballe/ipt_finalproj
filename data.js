const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const peso = (n) => "₱" + n.toLocaleString("en-PH");
const db = {
  get(k, d = []) { try { return JSON.parse(localStorage.getItem(k)) || d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } },
};
function setMsg(sel, text, type = "") { const el = $(sel); el.textContent = text; el.className = "msg " + type; }

const API = "https://jsonplaceholder.typicode.com";
const SIZES = { S: "Small", M: "Medium", L: "Large", XL: "X-Large" };
const SIZE_IDX = { S: 0, M: 1, L: 2, XL: 3 };
class Service {
  #name;
  constructor(id, name, desc) { this.id = id; this.#name = name; this.desc = desc; }
  get name() { return this.#name; }
  get pricedBySize() { return false; }
  price() { return 0; }
}
class SizedService extends Service {
  constructor(id, name, desc, prices) { super(id, name, desc); this.prices = prices; }
  get pricedBySize() { return true; }
  price(size) { return this.prices[SIZE_IDX[size]]; }
}
class FlatService extends Service {
  constructor(id, name, desc, amount) { super(id, name, desc); this.amount = amount; }
  price() { return this.amount; }
}
const SERVICES = [
  new SizedService("full", "Full Groom", "Bath, blow dry, haircut/styling, nail trim, ear cleaning, sanitary trim, cologne.", [650, 900, 1200, 1600]),
  new SizedService("bath", "Bath & Blow Dry", "Shampoo, conditioner, blow dry, brush-out and ear cleaning. No haircut.", [400, 550, 750, 1000]),
  new FlatService("nail", "Nail Trim Only", "Nail trim and paw pad tidy. Walk-in friendly, flat rate.", 200),
  new FlatService("ear", "Ear Cleaning Only", "Gentle ear cleaning and hair removal from the ear canal. Flat rate.", 180),
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
    Other: ["Groomer's choice"],
  },
  Cat: {
    "Persian": ["Lion Cut", "Sanitary Trim", "Belly Shave"],
    "Maine Coon": ["Lion Cut", "Sanitary Trim"],
    "Puspin (Domestic)": ["Sanitary Trim"],
    Other: ["Groomer's choice"],
  },
};
const GROOMERS = [
  { name: "Ana (dog specialist)", species: ["Dog"], sizes: ["S", "M", "L", "XL"] },
  { name: "Marco (dog specialist)", species: ["Dog"], sizes: ["S", "M", "L", "XL"] },
  { name: "Diego (dog specialist)", species: ["Dog"], sizes: ["S", "M", "L", "XL"] },
  { name: "Sofia (dog specialist)", species: ["Dog"], sizes: ["S", "M", "L", "XL"] },
  { name: "Lia (cat specialist)", species: ["Cat"], sizes: ["S", "M", "L", "XL"] },
  { name: "Pia (cat specialist)", species: ["Cat"], sizes: ["S", "M", "L", "XL"] },
  { name: "Nica (cat specialist)", species: ["Cat"], sizes: ["S", "M", "L", "XL"] },
  { name: "Bea (cat specialist)", species: ["Cat"], sizes: ["S", "M", "L", "XL"] },
];
const groomersFor = (pet) => (pet ? GROOMERS.filter((g) => g.species.includes(pet.species) && g.sizes.includes(pet.size)) : []);
const groomerLabel = (g) => `${g.name.replace(/\s*\([^)]*\)$/, "")} — ${g.species[0]} specialist`;
const PAYMENTS = ["Cash (pay at salon)", "GCash", "Maya", "Credit / Debit card (at salon)"];
const TIMES = [9, 10, 11, 13, 14, 15, 16].map((h) => String(h).padStart(2, "0") + ":00");
const fmtTime = (t) => { const [h, m] = t.split(":").map(Number); return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`; };
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

class Pet {
  constructor(owner, f) {
    this.id = "p" + Date.now() + Math.random().toString(36).slice(2, 6);
    this.owner = owner;
    Object.assign(this, f);
  }
  get label() { return `${this.name} · ${this.breed} · ${SIZES[this.size]}`; }
}
class Booking {
  constructor(o) {
    Object.assign(this, o);
    this.status = STATUS.PENDING;
    this.updatedAt = new Date().toISOString();
    this.history = [{ status: this.status, at: this.updatedAt, note: "Booking requested" }];
  }
}

const STATUS = {
  PENDING: "Pending", ACCEPTED: "Accepted", DECLINED: "Declined", PROGRESS: "In Progress",
  READY: "Ready for Pick-up", DONE: "Completed", CANCEL_REQUESTED: "Cancellation Requested",
  CANCELLED: "Cancelled", NOSHOW: "No Show",
};
const STATUS_HELP = {
  "Pending": "Waiting for the salon to review your request.",
  "Accepted": "Your appointment is confirmed. Please arrive 10 minutes early.",
  "Cancellation Requested": "Your cancellation request is waiting for the salon's decision.",
  "Declined": "Sorry, the salon could not take this booking.",
  "In Progress": "Your pet is being groomed right now.",
  "Ready for Pick-up": "Your pet is ready! Please come pick them up.",
  "Completed": "All done. Thank you for visiting PawSpa!",
  "Cancelled": "This appointment was cancelled.",
  "No Show": "The pet did not arrive for this appointment.",
};
const statusClass = (s) => "st-" + s.toLowerCase().replace(/[^a-z]+/g, "-");
const holdsSlot = (b) => ![STATUS.DECLINED, STATUS.CANCELLED, STATUS.NOSHOW].includes(b.status);
function changeStatus(all, b, status, note = "") {
  b.status = status; b.note = note; b.updatedAt = new Date().toISOString();
  b.history = [...(b.history || []), { status, at: b.updatedAt, note }];
}

const petAvatar = (p) => p.photo && String(p.photo).startsWith("data:image/")
  ? `<img class="avatar" src="${p.photo}" alt="Photo of ${esc(p.name)}">`
  : `<span class="avatar emoji">${esc(p.species)}</span>`;