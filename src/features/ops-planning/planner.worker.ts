/**
 * Web Worker: executa runPlannerProjection em thread separada.
 *
 * Mensagem recebida (postMessage):
 *   { inputs: PlannerInputs, requestId: number }
 *
 * Mensagem enviada (onmessage):
 *   { type: "result", requestId: number, result: ProjectionResult }  (sucesso)
 *   { type: "error",  requestId: number, error: string            }  (falha)
 *
 * O requestId permite ao consumidor ignorar respostas obsoletas
 * (requests mais antigos que o pendente atual).
 */

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
      error: error instanceof Error ? error.message : "Erro desconhecido",
    });
  }
};
