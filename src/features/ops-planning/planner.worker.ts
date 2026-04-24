import { runPlannerProjection } from "./calculator";
import { PlannerInputs } from "./types";

export {};

self.onmessage = (event: MessageEvent<{ inputs: PlannerInputs; requestId: number }>) => {
  const { inputs, requestId } = event.data;

  try {
    const result = runPlannerProjection(inputs);
    self.postMessage({ type: "result", requestId, result });
  } catch (error) {
    self.postMessage({
      type: "error",
      requestId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
