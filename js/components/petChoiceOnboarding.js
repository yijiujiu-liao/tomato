import { renderPetActivity } from "../pet.js";
import { PET_TYPE_KEYS, PET_TYPES } from "../state.js";

export function createPetChoiceOnboarding({ root, choices, confirmButton, onConfirm }) {
  let selectedPet = "";

  function render() {
    choices.innerHTML = "";
    PET_TYPE_KEYS.forEach((petId) => {
      const pet = PET_TYPES[petId];
      const button = document.createElement("button");
      button.type = "button";
      button.className = "pet-onboarding-choice";
      button.dataset.petId = petId;
      button.setAttribute("role", "radio");
      button.setAttribute("aria-checked", String(selectedPet === petId));
      button.style.setProperty("--pet-onboarding-accent", pet.accent);
      button.innerHTML = `
        <span class="pet-onboarding-art" aria-hidden="true">${renderPetActivity(petId, 1)}</span>
        <span class="pet-onboarding-copy">
          <strong>${pet.name}</strong>
          <small>${pet.role}</small>
          <span>${pet.promise}</span>
        </span>
        <span class="pet-onboarding-check" aria-hidden="true">✓</span>
      `;
      button.addEventListener("click", () => select(petId));
      choices.appendChild(button);
    });
    updateConfirmButton();
  }

  function select(petId) {
    if (!PET_TYPES[petId]) return;
    selectedPet = petId;
    choices.querySelectorAll(".pet-onboarding-choice").forEach((choice) => {
      choice.setAttribute("aria-checked", String(choice.dataset.petId === petId));
    });
    updateConfirmButton();
  }

  function updateConfirmButton() {
    const pet = PET_TYPES[selectedPet];
    confirmButton.disabled = !pet;
    confirmButton.textContent = pet ? `选择 ${pet.name}` : "先选择一位伙伴";
  }

  confirmButton.addEventListener("click", async () => {
    if (!selectedPet) return;
    confirmButton.disabled = true;
    try {
      const accepted = await onConfirm(selectedPet);
      if (accepted !== false) close();
    } finally {
      updateConfirmButton();
    }
  });

  function open(currentPet) {
    selectedPet = PET_TYPES[currentPet] ? currentPet : "";
    render();
    root.hidden = false;
    root.inert = false;
    root.setAttribute("aria-hidden", "false");
    document.body.classList.add("pet-onboarding-active");
    window.setTimeout(() => {
      choices.querySelector(`[data-pet-id="${selectedPet}"]`)?.focus();
    }, 80);
  }

  function close() {
    root.setAttribute("aria-hidden", "true");
    root.inert = true;
    root.hidden = true;
    document.body.classList.remove("pet-onboarding-active");
  }

  return {
    open,
    close,
    isOpen: () => root.getAttribute("aria-hidden") === "false",
  };
}
