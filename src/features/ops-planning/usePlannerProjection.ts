import { useState, useEffect, useRef } from "react";
import { runPlannerProjection } from "./calculator";
import { resolveContactRate } from "./capacity";
import { PlannerInputs, ProjectionResult } from "./types";

let worker: Worker | null = null;

const getWorker = () => {
  if (!worker) {
    worker = new Worker(new URL("./planner.worker.ts", import.meta.url), { type: "module" });
  }
  return worker;
};

export const usePlannerProjection = (inputs: PlannerInputs) => {
  const [projection, setProjection] = useState<ProjectionResult>(() => runPlannerProjection(inputs));
  const [isComputing, setIsComputing] = useState(false);
  const pendingRef = useRef<number>(0);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    workerRef.current = getWorker();

    const handleMessage = (event: MessageEvent) => {
      const { type, requestId: respId, result, error } = event.data;

      if (type === "result" && respId === pendingRef.current) {
        setProjection(result);
        setIsComputing(false);
      } else if (type === "error") {
        console.error("Worker error:", error);
        setIsComputing(false);
      }
    };

    const handleError = (error: ErrorEvent) => {
      console.error("Worker error:", error);
      setIsComputing(false);
    };

    workerRef.current.addEventListener("message", handleMessage);
    workerRef.current.addEventListener("error", handleError);

    return () => {
      workerRef.current?.removeEventListener("message", handleMessage);
      workerRef.current?.removeEventListener("error", handleError);
    };
  }, []);

  useEffect(() => {
    pendingRef.current += 1;
    const currentId = pendingRef.current;
    setIsComputing(true);

    workerRef.current?.postMessage({
      inputs,
      requestId: currentId,
    });
  }, [inputs]);

  const inferredContactRate = inputs.currentClients > 0
    ? inputs.currentVolume / inputs.currentClients
    : 0;
  const resolvedCR = resolveContactRate(inputs);
  const contactRateSource = (inputs.contactRate > 0 ? "manual" : "inferido") as "manual" | "inferido";
  const contactRateDriftPct = inferredContactRate > 0
    ? Math.abs(inputs.contactRate - inferredContactRate) / inferredContactRate * 100
    : 0;

  return {
    projection,
    inferredContactRate,
    resolvedContactRate: resolvedCR,
    contactRateSource,
    contactRateDriftPct,
    isComputing,
  };
};
