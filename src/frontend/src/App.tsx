import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Toaster } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  ChevronRight,
  Clock,
  Cpu,
  Film,
  ImageIcon,
  RefreshCw,
  Scan,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import {
  FileType,
  Verdict,
  useCreateAnalysis,
  useDeleteRecord,
  useGetAllRecords,
} from "./hooks/useQueries";
import {
  METRIC_NAMES,
  analyzeFile,
  formatTimestamp,
} from "./utils/analysisUtils";
import type { AnalysisResult } from "./utils/analysisUtils";

const queryClient = new QueryClient();

function AppContent() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [phase, setPhase] = useState<"idle" | "analyzing" | "done">("idle");
  const [metricProgress, setMetricProgress] = useState<number[]>([]);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: records = [], isLoading: recordsLoading } = useGetAllRecords();
  const createMutation = useCreateAnalysis();
  const deleteMutation = useDeleteRecord();

  const isImage = file?.type.startsWith("image/");
  const isVideo = file?.type.startsWith("video/");

  const handleFileSelect = useCallback(
    (selected: File) => {
      const allowed = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "video/mp4",
        "video/quicktime",
        "video/x-msvideo",
        "video/webm",
      ];
      if (!allowed.includes(selected.type)) {
        toast.error("Unsupported file type. Please upload an image or video.");
        return;
      }
      setFile(selected);
      setPhase("idle");
      setResult(null);
      setMetricProgress([]);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      if (selected.type.startsWith("image/")) {
        setPreviewUrl(URL.createObjectURL(selected));
      } else {
        setPreviewUrl(null);
      }
    },
    [previewUrl],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const dropped = e.dataTransfer.files[0];
      if (dropped) handleFileSelect(dropped);
    },
    [handleFileSelect],
  );

  const handleAnalyze = async () => {
    if (!file) return;
    setPhase("analyzing");
    setMetricProgress([]);
    const analysisResult = analyzeFile(file.name, file.size);

    // Animate metrics one by one
    for (let i = 0; i < METRIC_NAMES.length; i++) {
      await new Promise<void>((resolve) => setTimeout(resolve, 600));
      setMetricProgress((prev) => [...prev, analysisResult.metrics[i].score]);
    }

    await new Promise<void>((resolve) => setTimeout(resolve, 400));
    setResult(analysisResult);
    setPhase("done");

    // Save to backend
    try {
      await createMutation.mutateAsync({
        filename: file.name,
        fileType: isVideo ? FileType.video : FileType.image,
        verdict:
          analysisResult.verdict === "fake" ? Verdict.fake : Verdict.real,
        confidenceScore: analysisResult.confidenceScore,
        metrics: analysisResult.metrics,
      });
    } catch {
      // silently ignore backend save errors
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreviewUrl(null);
    setPhase("idle");
    setResult(null);
    setMetricProgress([]);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded border border-primary/50 flex items-center justify-center bg-primary/10 animate-pulse-glow">
              <Scan className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h1 className="font-display font-bold text-base tracking-widest text-foreground uppercase">
                ForensicAI
              </h1>
              <p className="font-mono text-[10px] text-muted-foreground tracking-wider">
                DEEPFAKE DETECTION SYSTEM v2.4.1
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[oklch(0.68_0.2_145)] animate-pulse" />
            <span className="font-mono text-xs text-muted-foreground">
              ONLINE
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 container max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Analyzer */}
          <div className="lg:col-span-2 space-y-6">
            {/* Upload Zone */}
            <AnimatePresence mode="wait">
              {phase === "idle" && (
                <motion.div
                  key="upload"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="border-border/60 bg-card/80">
                    <CardHeader className="pb-3">
                      <CardTitle className="font-display text-sm tracking-widest uppercase text-muted-foreground flex items-center gap-2">
                        <Upload className="w-4 h-4" />
                        Evidence Upload
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {!file ? (
                        <div
                          data-ocid="upload.dropzone"
                          className={`relative border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all duration-300 ${
                            isDragging
                              ? "border-primary bg-primary/10 glow-blue"
                              : "border-border hover:border-primary/50 hover:bg-primary/5"
                          }`}
                          onDragOver={(e) => {
                            e.preventDefault();
                            setIsDragging(true);
                          }}
                          onDragLeave={() => setIsDragging(false)}
                          onDrop={handleDrop}
                          onClick={() => fileInputRef.current?.click()}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ")
                              fileInputRef.current?.click();
                          }}
                        >
                          <div className="flex flex-col items-center gap-4">
                            <div className="w-16 h-16 rounded-full border border-primary/30 bg-primary/10 flex items-center justify-center">
                              <Cpu className="w-8 h-8 text-primary" />
                            </div>
                            <div>
                              <p className="font-display font-semibold text-foreground mb-1">
                                Drop file to analyze
                              </p>
                              <p className="font-mono text-xs text-muted-foreground">
                                JPG · PNG · GIF · WEBP · MP4 · MOV · AVI · WEBM
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              data-ocid="upload.button"
                              className="font-mono text-xs border-primary/40 text-primary hover:bg-primary/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                fileInputRef.current?.click();
                              }}
                            >
                              SELECT FILE
                            </Button>
                          </div>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime,video/x-msvideo,video/webm"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleFileSelect(f);
                            }}
                          />
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {/* File Preview */}
                          <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/30 border border-border/50">
                            {isImage && previewUrl ? (
                              <img
                                src={previewUrl}
                                alt="Preview"
                                className="w-20 h-20 object-cover rounded border border-border"
                              />
                            ) : (
                              <div className="w-20 h-20 rounded border border-border bg-muted/50 flex items-center justify-center flex-shrink-0">
                                {isVideo ? (
                                  <Film className="w-8 h-8 text-muted-foreground" />
                                ) : (
                                  <ImageIcon className="w-8 h-8 text-muted-foreground" />
                                )}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-mono text-sm text-foreground truncate">
                                {file.name}
                              </p>
                              <p className="font-mono text-xs text-muted-foreground mt-1">
                                {(file.size / 1024).toFixed(1)} KB ·{" "}
                                {isVideo ? "VIDEO" : "IMAGE"}
                              </p>
                              <Badge
                                variant="outline"
                                className="mt-2 font-mono text-[10px] border-primary/40 text-primary"
                              >
                                READY FOR ANALYSIS
                              </Badge>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              data-ocid="analyze.primary_button"
                              className="flex-1 font-mono font-semibold tracking-widest bg-primary text-primary-foreground hover:bg-primary/90"
                              onClick={handleAnalyze}
                            >
                              <Scan className="w-4 h-4 mr-2" />
                              INITIATE ANALYSIS
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={handleReset}
                              className="border-border/60 text-muted-foreground hover:text-foreground"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {phase === "analyzing" && (
                <motion.div
                  key="analyzing"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.3 }}
                  data-ocid="analysis.loading_state"
                >
                  <Card className="border-primary/30 bg-card/80 scanline-overlay glow-blue">
                    <CardHeader className="pb-3">
                      <CardTitle className="font-display text-sm tracking-widest uppercase text-primary flex items-center gap-2">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{
                            duration: 1.5,
                            repeat: Number.POSITIVE_INFINITY,
                            ease: "linear",
                          }}
                        >
                          <Scan className="w-4 h-4" />
                        </motion.div>
                        Forensic Analysis In Progress
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="font-mono text-xs text-muted-foreground flex items-center gap-2 mb-4">
                        <span className="text-primary animate-pulse">▶</span>
                        Scanning:{" "}
                        <span className="text-primary truncate max-w-[200px]">
                          {file?.name}
                        </span>
                      </div>
                      {METRIC_NAMES.map((name, i) => (
                        <MetricRow
                          key={name}
                          name={name}
                          index={i}
                          score={metricProgress[i]}
                          isActive={i === metricProgress.length}
                          isComplete={i < metricProgress.length}
                        />
                      ))}
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {phase === "done" && result && (
                <motion.div
                  key="done"
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, type: "spring", bounce: 0.2 }}
                  data-ocid="analysis.success_state"
                >
                  <VerdictCard
                    result={result}
                    file={file!}
                    onReset={handleReset}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right: History */}
          <div>
            <Card className="border-border/60 bg-card/80 h-full">
              <CardHeader className="pb-3">
                <CardTitle className="font-display text-sm tracking-widest uppercase text-muted-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Analysis History
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[500px]">
                  <div className="px-4 pb-4 space-y-2" data-ocid="history.list">
                    {recordsLoading ? (
                      <div className="py-8 text-center">
                        <div className="font-mono text-xs text-muted-foreground animate-pulse">
                          LOADING RECORDS...
                        </div>
                      </div>
                    ) : records.length === 0 ? (
                      <div
                        data-ocid="history.empty_state"
                        className="py-12 text-center"
                      >
                        <div className="w-12 h-12 rounded-full border border-border/50 bg-muted/30 flex items-center justify-center mx-auto mb-3">
                          <Clock className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <p className="font-mono text-xs text-muted-foreground">
                          NO RECORDS FOUND
                        </p>
                        <p className="font-mono text-[10px] text-muted-foreground/60 mt-1">
                          Analyze a file to begin
                        </p>
                      </div>
                    ) : (
                      records.map((rec, idx) => (
                        <HistoryItem
                          key={String(rec.id)}
                          record={rec}
                          index={idx + 1}
                          onDelete={() => deleteMutation.mutate(rec.id)}
                          isDeleting={deleteMutation.isPending}
                        />
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <footer className="border-t border-border/30 mt-8">
        <div className="container max-w-6xl mx-auto px-4 py-4 text-center">
          <p className="font-mono text-[11px] text-muted-foreground">
            © {new Date().getFullYear()} · Built with love using{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              caffeine.ai
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}

function MetricRow({
  name,
  index,
  score,
  isActive,
  isComplete,
}: {
  name: string;
  index: number;
  score: number | undefined;
  isActive: boolean;
  isComplete: boolean;
}) {
  const scoreColor =
    score === undefined
      ? "text-muted-foreground"
      : score > 60
        ? "text-[oklch(0.62_0.22_25)]"
        : "text-[oklch(0.68_0.2_145)]";

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{
        opacity: isComplete || isActive ? 1 : 0.3,
        x: 0,
      }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="space-y-1.5"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-muted-foreground/60">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="font-mono text-xs text-foreground/80">{name}</span>
        </div>
        <div className="flex items-center gap-2">
          {isActive && (
            <motion.span
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.5, repeat: Number.POSITIVE_INFINITY }}
              className="font-mono text-[10px] text-primary"
            >
              SCANNING...
            </motion.span>
          )}
          {isComplete && score !== undefined && (
            <span className={`font-mono text-xs font-bold ${scoreColor}`}>
              {score}
            </span>
          )}
          {!isActive && !isComplete && (
            <ChevronRight className="w-3 h-3 text-muted-foreground/40" />
          )}
        </div>
      </div>
      <div className="h-1 bg-muted/50 rounded-full overflow-hidden">
        {isActive && (
          <motion.div
            className="h-full bg-primary/60 rounded-full"
            animate={{ width: ["0%", "60%", "40%", "70%"] }}
            transition={{
              duration: 0.6,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
            }}
          />
        )}
        {isComplete && score !== undefined && (
          <motion.div
            className={`h-full rounded-full ${
              score > 60
                ? "bg-[oklch(0.62_0.22_25)]"
                : "bg-[oklch(0.68_0.2_145)]"
            }`}
            initial={{ width: "0%" }}
            animate={{ width: `${score}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        )}
      </div>
    </motion.div>
  );
}

function VerdictCard({
  result,
  file,
  onReset,
}: {
  result: AnalysisResult;
  file: File;
  onReset: () => void;
}) {
  const isFake = result.verdict === "fake";

  return (
    <Card
      data-ocid="verdict.card"
      className={`border-2 ${
        isFake
          ? "border-verdict-fake bg-verdict-fake glow-fake"
          : "border-verdict-real bg-verdict-real glow-real"
      }`}
    >
      <CardContent className="pt-6">
        {/* Verdict Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center mb-3">
            {isFake ? (
              <ShieldAlert className="w-12 h-12 text-verdict-fake" />
            ) : (
              <ShieldCheck className="w-12 h-12 text-verdict-real" />
            )}
          </div>
          <motion.h2
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", bounce: 0.4, duration: 0.6 }}
            className={`font-display font-black text-6xl tracking-widest mb-2 ${
              isFake ? "text-verdict-fake" : "text-verdict-real"
            }`}
          >
            {isFake ? "FAKE" : "REAL"}
          </motion.h2>
          <div className="font-mono text-2xl font-bold text-foreground">
            {result.confidenceScore}%
            <span className="text-sm text-muted-foreground ml-2 font-normal">
              CONFIDENCE
            </span>
          </div>
          <p className="font-mono text-xs text-muted-foreground mt-2 truncate max-w-xs mx-auto">
            {file.name}
          </p>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
          {result.metrics.map((metric) => {
            const high = metric.score > 60;
            return (
              <div
                key={metric.name}
                className="p-3 rounded-lg bg-background/50 border border-border/40 space-y-2"
              >
                <p className="font-mono text-[10px] text-muted-foreground leading-tight">
                  {metric.name}
                </p>
                <div className="flex items-end justify-between">
                  <span
                    className={`font-mono text-xl font-bold ${
                      high ? "text-verdict-fake" : "text-verdict-real"
                    }`}
                  >
                    {metric.score}
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    /100
                  </span>
                </div>
                <div className="h-1 bg-muted/30 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${metric.score}%` }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className={`h-full rounded-full ${
                      high
                        ? "bg-[oklch(0.62_0.22_25)]"
                        : "bg-[oklch(0.68_0.2_145)]"
                    }`}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <Button
          data-ocid="reset.button"
          variant="outline"
          className="w-full font-mono font-semibold tracking-widest border-border/60"
          onClick={onReset}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          ANALYZE ANOTHER FILE
        </Button>
      </CardContent>
    </Card>
  );
}

function HistoryItem({
  record,
  index,
  onDelete,
  isDeleting,
}: {
  record: import("./hooks/useQueries").AnalysisRecord;
  index: number;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const isFake = record.verdict === "fake";
  const idx = index as 1 | 2 | 3 | 4 | 5;

  return (
    <motion.div
      data-ocid={`history.item.${idx}`}
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, delay: index * 0.05 }}
      className="group flex items-start gap-3 p-3 rounded-lg border border-border/40 bg-muted/20 hover:bg-muted/30 transition-colors"
    >
      <div className="flex-1 min-w-0">
        <p className="font-mono text-xs text-foreground truncate">
          {record.filename}
        </p>
        <div className="flex items-center gap-2 mt-1.5">
          <Badge
            className={`font-mono text-[10px] px-1.5 py-0 ${
              isFake
                ? "bg-verdict-fake text-verdict-fake border-verdict-fake"
                : "bg-verdict-real text-verdict-real border-verdict-real"
            }`}
            variant="outline"
          >
            {isFake ? "FAKE" : "REAL"}
          </Badge>
          <span className="font-mono text-[10px] text-muted-foreground">
            {String(record.confidenceScore)}% conf
          </span>
        </div>
        <p className="font-mono text-[10px] text-muted-foreground/60 mt-1">
          {formatTimestamp(record.timestamp)}
        </p>
      </div>
      <button
        type="button"
        data-ocid={`history.delete_button.${idx}`}
        onClick={onDelete}
        disabled={isDeleting}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 disabled:opacity-30"
        aria-label="Delete record"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
      <Toaster
        theme="dark"
        toastOptions={{
          classNames: {
            toast: "bg-card border-border font-mono text-xs",
          },
        }}
      />
    </QueryClientProvider>
  );
}
