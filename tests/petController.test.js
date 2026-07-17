import assert from "node:assert/strict";
import test from "node:test";
import { createPetController } from "../js/petController.js";
import { createPetProgress } from "../js/pet.js";

test("pet controller preserves growth when switching pets and supports XP updates", () => {
  const data = {
    selectedPet: "penguin",
    petProgress: createPetProgress("penguin"),
    todayPetXP: 0,
    streak: 1,
  };
  let saves = 0;
  const controller = createPetController({ getData: () => data, save: () => { saves += 1; } });
  const firstReward = controller.addXP(50);
  const selected = controller.select("greenDino");
  assert.equal(selected.petId, "greenDino");
  assert.equal(data.petProgress.totalXP, firstReward.totalXP);

  const reward = controller.addXP(50);
  assert.equal(data.petProgress.totalXP, firstReward.totalXP + reward.totalXP);
  assert.equal(data.todayPetXP, firstReward.totalXP + reward.totalXP);
  assert.equal(controller.removeXP(reward.totalXP), reward.totalXP);
  assert.equal(data.petProgress.totalXP, firstReward.totalXP);
  assert.equal(data.todayPetXP, firstReward.totalXP);
  assert.equal(saves, 4);
  assert.match(controller.getDescription(), /成长中/);
});
