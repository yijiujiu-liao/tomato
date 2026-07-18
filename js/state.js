export const MODES = {
  focus: {
    label: "专注",
    minutes: 50
  },
  rest: {
    label: "休息",
    minutes: 5
  }
};

export const STORAGE_KEY = "kaoyanPomodoroData";
export const DAILY_PLANS_KEY = "kaoyanDailyPlans";
export const AUTH_SESSION_KEY = "kaoyanPomodoroAuth";
export const STUDY_GOALS_KEY = "kaoyanStudyGoals";
export const DELETED_TASKS_KEY = "kaoyanDeletedCloudTasks";
export const DEFAULT_GOAL = 8;
export const DEFAULT_FOCUS_MINUTES = 50;
export const MIN_FOCUS_MINUTES = 1;
export const MAX_FOCUS_MINUTES = 180;

export const REST_DURATIONS = {
  short: 5,
  long: 10
};

export const STATS_RANGES = {
  day: "今日",
  week: "本周",
  month: "本月"
};

export const PET_TYPES = {
  penguin: {
    name: "蓝莓企鹅",
    src: "assets/pets/penguin-v2.png",
    walkSrc: "/assets/pets/penguin-walk-v3.png",
    accent: "#9fc7ea"
  },
  purpleDragon: {
    name: "紫晶小龙",
    src: "assets/pets/purple-dragon-v2.png",
    walkSrc: "/assets/pets/purple-dragon-walk-v3.png",
    walkScale: 1.2,
    accent: "#9b6ee8"
  },
  greenDino: {
    name: "青叶恐龙",
    src: "assets/pets/green-dino-v2.png",
    walkSrc: "/assets/pets/green-dino-walk-v3.png",
    accent: "#94bd55"
  },
  chick: {
    name: "奶油小鸡",
    src: "assets/pets/chick-v2.png",
    walkSrc: "/assets/pets/chick-walk-v3.png",
    accent: "#f3c34a"
  }
};

export const PET_TYPE_KEYS = Object.keys(PET_TYPES);

export const EVOLUTION_STAGES = [
  { id: 1, minLevel: 1, maxLevel: 4, state: "juvenile", label: "幼崽", sprite: "baby" },
  { id: 2, minLevel: 5, maxLevel: 9, state: "growth", label: "成长期", sprite: "young" },
  { id: 3, minLevel: 10, maxLevel: 19, state: "mature", label: "进化体", sprite: "evolved" },
  { id: 4, minLevel: 20, maxLevel: Infinity, state: "complete", label: "完全体", sprite: "complete" }
];

export const MOTIVATION_TEXTS = [
  "稳定学习比猛冲更重要。",
  "你的专注正在让它成长。",
  "距离下一次进化更近了。",
  "今天的每一个番茄钟都会留下经验。"
];
