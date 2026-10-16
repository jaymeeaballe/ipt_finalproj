function fillBreeds() {
  const sp = $("#petSpecies").value;
  $("#petBreed").innerHTML = '<option value="">Select breed</option>' + Object.keys(BREEDS[sp]).map((b) => `<option value="${esc(b)}">${esc(b)}</option>`).join("");
  updateOtherBreed();
  updatePetAgeMinimum();
}
function updateOtherBreed() {
  const isOther = $("#petBreed").value === "Other";
  $("#otherBreedWrap").hidden = !isOther;
  $("#otherBreed").required = isOther;
  if (!isOther) $("#otherBreed").value = "";
}
function updatePetAgeMinimum() {
  const isCat = $("#petSpecies").value === "Cat";
  const minimumMonths = isCat ? 4 : 3;
  const inMonths = $("#petAgeUnit").value === "months";
  $("#petAge").min = String(inMonths ? minimumMonths : minimumMonths / 12);
  $("#petAge").max = String(inMonths ? 360 : 30);
  $("#petAge").step = inMonths ? "1" : "any";
  $("#ageHint").textContent = `Minimum grooming age: ${minimumMonths} months.`;
}
function vaccineReminder(p, today = iso(new Date())) {
  if (!p.vaccineDueDate) return "No rabies vaccine expiry date recorded. Please update the vaccine record.";
  if (p.vaccineDueDate < today) return `Rabies vaccine expired on ${p.vaccineDueDate}. Please update the vaccine record.`;
  if (p.vaccineDueDate === today) return "Rabies vaccine is due today. Please update the vaccine record.";
  return "";
}
function renderVaccineReminders() {
  const alerts = myPets()
    .map((p) => ({ pet: p, message: vaccineReminder(p) }))
    .filter((entry) => entry.message);
  const box = $("#vaccineReminder");
  box.hidden = alerts.length === 0;
  box.innerHTML = alerts.length
    ? `<strong>Anti-rabies vaccine reminder</strong><ul>${alerts.map(({ pet, message }) =>
        `<li><b>${esc(pet.name)}</b>: ${esc(message)} <button type="button" class="btn" data-update-vaccine="${esc(pet.id)}">Update vaccine record</button></li>`
      ).join("")}</ul>`
    : "";
}
$("#petSpecies").addEventListener("change", fillBreeds);
$("#petBreed").addEventListener("change", updateOtherBreed);
let previousAgeUnit = $("#petAgeUnit").value;
$("#petAgeUnit").addEventListener("change", () => {
  const age = $("#petAge");
  if (age.value !== "") {
    const value = Number(age.value);
    age.value = String(previousAgeUnit === "years" ? value * 12 : value / 12);
  }
  previousAgeUnit = $("#petAgeUnit").value;
  updatePetAgeMinimum();
});

let vaccineDocument = null, vaccineDocumentChanged = false;
let originalVaccineDate = "", originalVaccineDueDate = "";
function showVaccinePreview() {
  const box = $("#vaccinePreview");
  box.innerHTML = vaccineDocument
    ? `<a href="${esc(vaccineDocument.data)}" target="_blank" rel="noopener">View vaccine record: ${esc(vaccineDocument.name)}</a>
       <button type="button" class="danger" id="removeVaccineDocument">Remove record</button>`
    : "";
}
async function readVaccineDocument(file) {
  if (file.type === "application/pdf") {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("could not read the file"));
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });
  }
  return readPhoto(file, 1400);
}
$("#vaccineFile").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  if (!["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(file.type)) {
    e.target.value = "";
    return setMsg("#petMsg", "Choose a JPG, PNG, WebP, or PDF vaccine record.", "err");
  }
  if (file.size > 5 * 1024 * 1024) {
    e.target.value = "";
    return setMsg("#petMsg", "The vaccine record is larger than 5 MB. Choose a smaller file.", "err");
  }
  $("#petSave").disabled = true;
  try {
    vaccineDocument = {
      name: file.name,
      type: file.type === "application/pdf" ? file.type : "image/jpeg",
      data: await readVaccineDocument(file),
    };
    vaccineDocumentChanged = true;
    showVaccinePreview();
    setMsg("#petMsg", "");
  } catch (err) {
    e.target.value = "";
    setMsg("#petMsg", `Could not read the vaccine record (${err.message}).`, "err");
  } finally {
    $("#petSave").disabled = false;
  }
});
$("#vaccinePreview").addEventListener("click", (e) => {
  if (e.target.id !== "removeVaccineDocument") return;
  vaccineDocument = null;
  vaccineDocumentChanged = true;
  $("#vaccineFile").value = "";
  showVaccinePreview();
});
$("#vaccineReminder").addEventListener("click", (e) => {
  const button = e.target.closest("[data-update-vaccine]");
  if (!button) return;
  show("pets");
  startEditPet(button.dataset.updateVaccine);
});

$("#petForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(e.target));
  const errs = [];
  const isCat = f.species === "Cat";
  const minimumMonths = isCat ? 4 : 3;
  const enteredAge = Number(f.age);
  const ageInMonths = f.ageUnit === "months" ? enteredAge : enteredAge * 12;
  if (f.breed === "Other") f.breed = (f.otherBreed || "").trim();
  if (!f.name.trim()) errs.push("Enter your pet's name.");
  if (e.target.elements.breed.value === "Other") {
    if (!f.breed) errs.push("Enter your pet's breed.");
  } else if (!f.breed) {
    errs.push("Select a breed.");
  }
  if (!f.size) errs.push("Select a size.");
  if (f.age === "" || !Number.isFinite(enteredAge) || ageInMonths < minimumMonths || ageInMonths > 360)
    errs.push(`Pets must be at least ${minimumMonths} months old to be groomed.`);
  if (!f.vaccineDate) errs.push("Enter the date of the anti-rabies vaccination.");
  if (!f.vaccineDueDate) errs.push("Enter the vaccine's valid-until / expiry date.");
  if (f.vaccineDate && f.vaccineDate > iso(new Date())) errs.push("The vaccination date cannot be in the future.");
  if (f.vaccineDate && f.vaccineDueDate && f.vaccineDueDate <= f.vaccineDate)
    errs.push("The vaccine expiry date must be after the vaccination date.");
  const datesChanged = editingPet && (f.vaccineDate !== originalVaccineDate || f.vaccineDueDate !== originalVaccineDueDate);
  if (!vaccineDocument) errs.push("Upload the anti-rabies vaccine certificate or record.");
  else if (datesChanged && !vaccineDocumentChanged)
    errs.push("Upload the new vaccine record when updating its vaccination or expiry dates.");
  if (errs.length) return setMsg("#petMsg", errs.join(" "), "err");
  const pets = db.get("ps_pets");
  delete f.otherBreed;
  delete f.ageUnit;
  delete f.vaccineFile;
  f.age = String(ageInMonths / 12);
  const clean = { ...f, name: f.name.trim(), notes: (f.notes || "").trim(), photo: petPhotoData, vaccineDocument };
  const i = pets.findIndex((p) => p.id === editingPet && p.owner === me);
  if (i >= 0) pets[i] = { ...pets[i], ...clean }; else pets.push(new Pet(me, clean));
  if (!db.set("ps_pets", pets)) return setMsg("#petMsg", "Could not save: browser storage is full. Try smaller photos or a smaller vaccine record, or remove a pet.", "err");
  resetPetForm(); renderPets();
  setMsg("#petMsg", i >= 0 ? "Pet updated." : "Pet saved! Add another pet below, or book an appointment.", "ok");
});

function renderPets() {
  renderVaccineReminders();
  const pets = [...myPets()].sort((a, b) => a.name.localeCompare(b.name));
  $("#petList").innerHTML = pets.length
    ? pets.map((p) => `<div class="pet"><div class="who">${petAvatar(p)}<div><b>${esc(p.name)}</b> <span class="muted">(${esc(p.species)})</span><br>
        <span class="tag">${esc(p.breed)}</span><span class="tag">${SIZES[p.size]}</span><span class="tag">${esc(p.coat)} coat</span>
        <span class="tag">${esc(p.sex)}, ${esc(formatPetAge(p.age))}</span><span class="tag">${esc(p.temper)}</span>
        <br><span class="muted">Anti-rabies vaccinated: ${esc(p.vaccineDate || "date not recorded")} · Valid until: ${esc(p.vaccineDueDate || "date not recorded")}</span>
        ${vaccineReminder(p) ? `<br><span class="msg err">${esc(vaccineReminder(p))}</span>` : ""}
        ${p.vaccineDocument ? `<br><a href="${esc(p.vaccineDocument.data)}" target="_blank" rel="noopener">View vaccine record</a>` : ""}
        ${p.notes ? `<br><span class="muted">Notes: ${esc(p.notes)}</span>` : ""}</div></div>
        <div><button class="btn" data-book="${p.id}">Book</button> <button class="danger" style="border-color:var(--pri);color:var(--pri)" data-edit="${p.id}">Edit</button> <button class="danger" data-del="${p.id}">Remove</button></div></div>`).join("")
    : '<p class="muted">No pets yet. Fill in the form to add your first one.</p>';
  if (pets.length) $("#petList").insertAdjacentHTML("afterbegin", `<h3>Your pets (${pets.length})</h3>`);
}
function formatPetAge(age) {
  const years = Number(age);
  if (!Number.isFinite(years) || years < 0) return "Age not recorded";
  const totalMonths = Math.round(years * 12);
  const wholeYears = Math.floor(totalMonths / 12);
  const remainingMonths = totalMonths % 12;
  const parts = [];
  if (wholeYears) parts.push(`${wholeYears} ${wholeYears === 1 ? "year" : "years"}`);
  if (remainingMonths) parts.push(`${remainingMonths} ${remainingMonths === 1 ? "month" : "months"}`);
  return parts.join(" ") || "0 months";
}
$("#petList").addEventListener("click", (e) => {
  const del = e.target.closest("[data-del]"), bk = e.target.closest("[data-book]"), ed = e.target.closest("[data-edit]");
  if (del && confirm("Remove this pet?")) {
    db.set("ps_pets", db.get("ps_pets").filter((p) => p.id !== del.dataset.del));
    renderPets();
  }
  if (ed) return startEditPet(ed.dataset.edit);
  if (bk) { resched = null; show("book"); $("#bkPet").value = bk.dataset.book; onPetChange(); }
});

function resetPetForm() {
  editingPet = null; petPhotoData = null; vaccineDocument = null; vaccineDocumentChanged = false;
  originalVaccineDate = originalVaccineDueDate = "";
  showPhotoPreview(null); showVaccinePreview();
  $("#petForm").reset(); previousAgeUnit = "years"; fillBreeds();
  $("#petFormTitle").textContent = "Register a pet";
  $("#petSave").textContent = "Save pet";
  $("#petCancel").hidden = true;
}
function startEditPet(id) {
  const p = myPets().find((x) => x.id === id);
  if (!p) return;
  editingPet = id;
  const f = $("#petForm").elements;
  f.species.value = p.species; fillBreeds();
  ["name", "size", "sex", "coat", "temper", "notes"].forEach((k) => (f[k].value = p[k] ?? ""));
  f.ageUnit.value = "years";
  previousAgeUnit = "years";
  f.age.value = p.age ?? "";
  updatePetAgeMinimum();
  f.vaccineDate.value = p.vaccineDate || "";
  f.vaccineDueDate.value = p.vaccineDueDate || "";
  originalVaccineDate = f.vaccineDate.value;
  originalVaccineDueDate = f.vaccineDueDate.value;
  f.vaccineFile.value = "";
  if ([...f.breed.options].some((option) => option.value === p.breed)) {
    f.breed.value = p.breed;
  } else {
    f.breed.value = "Other";
    $("#otherBreed").value = p.breed;
  }
  updateOtherBreed();
  vaccineDocument = p.vaccineDocument || null;
  vaccineDocumentChanged = false;
  showVaccinePreview();
  petPhotoData = p.photo || null; showPhotoPreview(petPhotoData);
  $("#petFormTitle").textContent = "Edit " + p.name;
  $("#petSave").textContent = "Update pet";
  $("#petCancel").hidden = false;
  setMsg("#petMsg", "");
  $("#petForm").scrollIntoView({ behavior: "smooth" });
}
$("#petCancel").addEventListener("click", resetPetForm);

let petPhotoData = null;

function readPhoto(file, maxSize = 320) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("could not read the file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("that file is not a valid image"));
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.8));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
function showPhotoPreview(src) {
  $("#photoPreview").innerHTML = src ? `<img class="avatar big" src="${src}" alt="Pet photo preview"><button type="button" class="danger" id="photoRemove">Remove photo</button>` : "";
}
$("#petPhoto").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) { e.target.value = ""; return setMsg("#petMsg", "Please choose an image file (JPG or PNG).", "err"); }
  if (file.size > 5 * 1024 * 1024) { e.target.value = ""; return setMsg("#petMsg", "That picture is bigger than 5 MB. Please choose a smaller one.", "err"); }
  $("#petSave").disabled = true;
  try {
    petPhotoData = await readPhoto(file);
    showPhotoPreview(petPhotoData);
    setMsg("#petMsg", "");
  } catch (err) {
    e.target.value = "";
    setMsg("#petMsg", "Could not use that picture (" + err.message + ").", "err");
  } finally {
    $("#petSave").disabled = false;
  }
});
$("#photoPreview").addEventListener("click", (e) => {
  if (e.target.id === "photoRemove") { petPhotoData = null; $("#petPhoto").value = ""; showPhotoPreview(null); }
});