import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { AnalysisRecord, Metric } from "../backend.d";
import { FileType, Verdict } from "../backend.d";
import { useActor } from "./useActor";

export type { AnalysisRecord, Metric };
export { FileType, Verdict };

export function useGetAllRecords() {
  const { actor, isFetching } = useActor();
  return useQuery<AnalysisRecord[]>({
    queryKey: ["analyses"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllRecords();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreateAnalysis() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      filename: string;
      fileType: FileType;
      verdict: Verdict;
      confidenceScore: number;
      metrics: Array<{ name: string; score: number }>;
    }) => {
      if (!actor) throw new Error("Actor not ready");
      const metrics: Metric[] = params.metrics.map((m) => ({
        name: m.name,
        score: BigInt(Math.round(m.score)),
      }));
      return actor.createAnalysisRecord(
        params.filename,
        params.fileType,
        params.verdict,
        BigInt(Math.round(params.confidenceScore)),
        metrics,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["analyses"] });
    },
    onError: () => {
      toast.error("Failed to save analysis");
    },
  });
}

export function useDeleteRecord() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Actor not ready");
      return actor.deleteRecordById(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["analyses"] });
      toast.success("Record deleted");
    },
    onError: () => {
      toast.error("Failed to delete record");
    },
  });
}
