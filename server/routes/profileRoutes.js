import {
  clampInteger,
  getCumulativeXPForLevel,
  getEvolutionStage,
  getNextLevelXP,
  getPetProgressFromTotalXP,
  normalizePetId,
  normalizeOptionalString,
} from "../validation.js";

export function registerProfileRoutes(app, {
  db,
  nowIso,
  petFromRow,
  relations,
  requireAuth,
  settingsFromRow,
}) {
  app.get("/api/settings", requireAuth, (req, res) => {
    const row = db.prepare(
      "SELECT * FROM user_settings WHERE user_id = ?",
    ).get(req.auth.user.id);
    res.json({ settings: settingsFromRow(row) });
  });

  app.put("/api/settings", requireAuth, (req, res) => {
    const userId = req.auth.user.id;
    const current = db.prepare(
      "SELECT * FROM user_settings WHERE user_id = ?",
    ).get(userId);
    const expectedUpdatedAt = normalizeOptionalString(req.body?.expectedUpdatedAt, 40);
    if (expectedUpdatedAt && expectedUpdatedAt !== current.updated_at) {
      res.status(409).json({
        error: "Settings changed on another device. Replaying the local change is required.",
        code: "SETTINGS_VERSION_CONFLICT",
        settings: settingsFromRow(current),
      });
      return;
    }
    const next = {
      focusDuration: clampInteger(
        req.body?.focusDuration,
        current.focus_duration,
        1,
        180,
      ),
      dailyGoal: clampInteger(req.body?.dailyGoal, current.daily_goal, 1, 24),
      theme: req.body?.theme === "dark" ? "dark" : "light",
      nextRestType: req.body?.nextRestType === "long" ? "long" : "short",
      currentTaskId: relations.normalizeTaskId(userId, req.body?.currentTaskId),
      currentStudyGoalId: relations.normalizeStudyGoalId(
        userId,
        req.body?.currentStudyGoalId,
      ),
      longGoalOnboardingCompleted:
        req.body?.longGoalOnboardingCompleted === undefined
          ? Boolean(current.long_goal_onboarding_completed)
          : Boolean(req.body.longGoalOnboardingCompleted),
      updatedAt: nowIso(),
    };

    db.prepare(`
      UPDATE user_settings
      SET focus_duration = ?, daily_goal = ?, theme = ?, next_rest_type = ?,
          current_task_id = ?, current_study_goal_id = ?,
          long_goal_onboarding_completed = ?, updated_at = ?
      WHERE user_id = ?
    `).run(
      next.focusDuration,
      next.dailyGoal,
      next.theme,
      next.nextRestType,
      next.currentTaskId,
      next.currentStudyGoalId,
      Number(next.longGoalOnboardingCompleted),
      next.updatedAt,
      userId,
    );
    res.json({ settings: next });
  });

  app.get("/api/pet", requireAuth, (req, res) => {
    const row = db.prepare("SELECT * FROM pets WHERE user_id = ?").get(
      req.auth.user.id,
    );
    res.json({ pet: petFromRow(row) });
  });

  app.put("/api/pet", requireAuth, (req, res) => {
    const userId = req.auth.user.id;
    const current = db.prepare("SELECT * FROM pets WHERE user_id = ?").get(
      userId,
    );
    const expectedUpdatedAt = normalizeOptionalString(req.body?.updatedAt, 40);
    if (expectedUpdatedAt && expectedUpdatedAt !== current.updated_at) {
      res.status(409).json({
        error: "Pet state changed on another device. Sync and try again.",
        code: "PET_VERSION_CONFLICT",
      });
      return;
    }

    const requestedLevel = clampInteger(
      req.body?.level,
      current.level,
      1,
      1000,
    );
    const requestedCurrentXP = clampInteger(
      req.body?.currentXP,
      current.current_xp,
      0,
      getNextLevelXP(requestedLevel),
    );
    const requestedTotalXP = clampInteger(
      req.body?.totalXP,
      current.total_xp,
      0,
      getCumulativeXPForLevel(1000) - 1,
    );
    const progress = getPetProgressFromTotalXP(Math.max(
      current.total_xp,
      requestedTotalXP,
      getCumulativeXPForLevel(requestedLevel) + requestedCurrentXP,
    ));
    const next = {
      petId: normalizePetId(req.body?.petId || current.pet_id),
      choiceCompleted: typeof req.body?.choiceCompleted === "boolean"
        ? req.body.choiceCompleted
        : Boolean(current.pet_choice_completed),
      ...progress,
      evolutionStage: getEvolutionStage(progress.level),
      updatedAt: nowIso(),
    };

    db.prepare(`
      UPDATE pets
      SET pet_id = ?, level = ?, current_xp = ?, next_level_xp = ?,
          total_xp = ?, evolution_stage = ?, pet_choice_completed = ?,
          updated_at = ?
      WHERE user_id = ?
    `).run(
      next.petId,
      next.level,
      next.currentXP,
      next.nextLevelXP,
      next.totalXP,
      next.evolutionStage,
      Number(next.choiceCompleted),
      next.updatedAt,
      userId,
    );
    res.json({ pet: next });
  });
}
