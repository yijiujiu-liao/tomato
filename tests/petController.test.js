import assert from "node:assert/strict";
import test from "node:test";
import { createPetController } from "../js/petController.js";
import { createPetProgress } from "../js/pet.js";

test("pet controller owns selection and reversible XP updates", () => {
  const data = {
    selectedPet: "penguin",
    petProgress: createPetProgress("penguin"),
    todayPetXP: 0,
    streak: 1,
  };
  let saves = 0;
  const controller = createPetController({ getData: () => data, save: () => { saves += 1; } });
  const selected = controller.select("greenDino");
  assert.equal(selected.petId, "greenDino");
  assert.equal(data.petProgress.totalXP, 0);

  const reward = controller.addXP(50);
  assert.equal(data.petProgress.totalXP, reward.totalXP);
  assert.equal(data.todayPetXP, reward.totalXP);
  assert.equal(controller.removeXP(reward.totalXP), reward.totalXP);
  assert.equal(data.petProgress.totalXP, 0);
  assert.equal(data.todayPetXP, 0);
  assert.equal(saves, 3);
  assert.match(controller.getDescription(), /成长中/);
});
