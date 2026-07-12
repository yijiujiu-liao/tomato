import { createAiSummaryState } from "./aiReview.js";

export function createAiReviewController({ getRepository, isEnabled, onChange }) {
  let state = createAiSummaryState();

  function notify() {
    onChange?.(state);
  }

  function reset() {
    state = createAiSummaryState();
    notify();
  }

  async function load(dateKey) {
    if (!isEnabled()) return false;
    try {
      const data = await getRepository().getDailySummary(dateKey);
      state = { status: "ready", data: data.summary, error: "", generatedAt: data.generatedAt || "" };
      notify();
      return true;
    } catch (error) {
      if (error.code !== "AI_SUMMARY_NOT_FOUND" && error.status !== 404) console.warn(error);
      return false;
    }
  }

  async function generate(dateKey, { force = false, auto = false } = {}) {
    if (!isEnabled()) {
      reset();
      return false;
    }
    state = {
      ...state,
      status: "loading",
      error: auto ? "专注完成，正在生成今天的 AI 复盘..." : "",
    };
    notify();
    try {
      const data = await getRepository().generateDailySummary(dateKey, force);
      state = {
        status: "ready",
        data: data.summary,
        error: "",
        generatedAt: data.generatedAt || new Date().toISOString(),
      };
      notify();
      return true;
    } catch (error) {
      state = {
        ...state,
        status: "error",
        error: error.code === "AI_NOT_CONFIGURED"
          ? "AI 复盘尚未开启。配置好服务端 AI Key 后，这里会自动生成当天总结和明日建议。"
          : error.message,
      };
      notify();
      return false;
    }
  }

  return { getState: () => state, reset, load, generate };
}
