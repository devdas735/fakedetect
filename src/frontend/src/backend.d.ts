import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Metric {
    name: string;
    score: bigint;
}
export interface AnalysisRecord {
    id: bigint;
    fileType: FileType;
    verdict: Verdict;
    filename: string;
    confidenceScore: bigint;
    timestamp: bigint;
    analysisMetrics: Array<Metric>;
}
export enum FileType {
    video = "video",
    image = "image"
}
export enum Verdict {
    fake = "fake",
    real = "real"
}
export interface backendInterface {
    createAnalysisRecord(filename: string, fileType: FileType, verdict: Verdict, confidenceScore: bigint, metrics: Array<Metric>): Promise<bigint>;
    deleteRecordById(id: bigint): Promise<void>;
    getAllRecords(): Promise<Array<AnalysisRecord>>;
}
