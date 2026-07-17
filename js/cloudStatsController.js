import { STATS_RANGES } from "./state.js";

export function createCloudStatsController({
  isEnabled,
  fetchStats,
  getView,
  getLocalTotals,
}) {
  let state = {
    range: "week",
    status: "idle",
    data: null,
    error: "",
  };

  function render() {
    getView()?.renderStats({
      cloudEnabled: isEnabled(),
      stats: state,
      localTotals: getLocalTotals(),
    });
  }

  function reset() {
    state = {
      range: state.range,
      status: "idle",
      data: null,
      error: "",
    };
    render();
  }

  async function load(range = state.range, options = {}) {
    state.range = STATS_RANGES[range] ? range : "week";

    if (!isEnabled()) {
      reset();
      return false;
    }

    try {
      state.status = options.silent ? state.status : "loading";
      state.error = "";
      render();
      const data = await fetchStats(state.range);
      state = {
        range: state.range,
        status: "ready",
        data,
        error: "",
      };
      render();
      return true;
    } catch (error) {
      state = {
        range: state.range,
        status: "error",
        data: state.data,
        error: error.message,
      };
      render();
      return false;
    }
  }

  return {
    getState: () => state,
    getRange: () => state.range,
    isIdle: () => state.status === "idle",
    load,
    render,
    reset,
  };
}
