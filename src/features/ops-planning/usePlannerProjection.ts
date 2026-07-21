import { useState, useEffect, useRef, useCallback } from "react";
import { runPlannerProjection } from "./calculator";
import { resolveContactRate } from "./capacity";
import { PlannerInputs, ProjectionResult } from "./types";

let worker: Worker | null = null;

const getWorker = () => {
  if (!worker) {
    try {
      worker = new Worker(new URL("./planner.worker.ts", import.meta.url), { type: "module" });
    } catch {
      return null;
    }
  }
  return worker;
};

export const usePlannerProjection = (inputs: PlannerInputs) => {
  const [projection, setProjection] = useState<ProjectionResult>(() => runPlannerProjection(inputs));
  const [isComputing, setIsComputing] = useState(false);
  const [workerStatus, setWorkerStatus] = useState<"idle" | "computing" | "fallback">("idle");
  const pendingRef = useRef<number>(0);
  const workerRef = useRef<Worker | null>(null);

  const computeSync = useCallback((inp: PlannerInputs) => {
    const result = runPlannerProjection(inp);
    setProjection(result);
    setIsComputing(false);
    setWorkerStatus("fallback");
  }, []);

  useEffect(() => {
    workerRef.current = getWorker();

    if (!workerRef.current) {
      setWorkerStatus("fallback");
      return;
    }

    const handleMessage = (event: MessageEvent) => {
      const { type, requestId: respId, result } = event.data;

      if (type === "result" && respId === pendingRef.current) {
        setProjection(result);
        setIsComputing(false);
        setWorkerStatus("idle");
      }
    };

    const handleWorkerError = () => {
      setIsComputing(false);
    };

    workerRef.current.addEventListener("message", handleMessage);
    workerRef.current.addEventListener("error", handleWorkerError);

    return () => {
      workerRef.current?.removeEventListener("message", handleMessage);
      workerRef.current?.removeEventListener("error", handleWorkerError);
    };
  }, [computeSync]);

  useEffect(() => {
    pendingRef.current += 1;
    const currentId = pendingRef.current;
    setIsComputing(true);
    setWorkerStatus("computing");
    let cancelled = false;

    if (!workerRef.current) {
      computeSync(inputs);
      return;
    }

    try {
      workerRef.current.postMessage({
        inputs,
        requestId: currentId,
      });
    } catch {
      if (!cancelled) computeSync(inputs);
    }

    return () => {
      cancelled = true;
    };
  }, [inputs, computeSync]);

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
    workerStatus,
  };
};
