export type ChunkingStrategy = 'FIXED_SIZE' | 'SLIDING_WINDOW';
export type EmbeddingStatus = 'PENDING' | 'COMPLETED' | 'FAILED';

export interface DocumentSummary {
  id: string;
  title: string;
  tenantId: string;
  department: string | null;
  region: string | null;
  documentType: string | null;
  classification: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentVersion {
  id: string;
  version: number;
  originalFilename: string;
  mediaType: string;
  chunkingStrategy: ChunkingStrategy;
  chunkSize: number;
  chunkOverlap: number;
  createdAt: string;
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  versionId: string;
  chunkIndex: number;
  chunkText: string;
  metadata: Record<string, unknown>;
  embeddingStatus: EmbeddingStatus;
  embeddingModel: string | null;
  embeddingDimension: number | null;
  embeddedAt: string | null;
  active: boolean;
}

export interface IngestionResult {
  documentId: string;
  versionId: string;
  version: number;
  chunkCount: number;
  corpusVersion: number;
}

export interface UploadDocument {
  title: string;
  file: File;
  tenantId: string;
  department: string;
  region: string;
  documentType: string;
  classification: string;
  strategy: ChunkingStrategy;
  chunkSize: number;
  overlap: number;
}

export interface RetrievedChunk {
  documentId: string;
  documentTitle: string;
  versionId: string;
  version: number;
  chunkId: string;
  chunkIndex: number;
  parentSectionId: string;
  parentSectionTitle: string;
  chunkText: string;
  similarityScore: number;
  keywordScore: number;
  combinedScore: number;
  retrievalStrategy: string;
  excerpt: string;
}

export interface RetrievalSearchResponse {
  query: string;
  requestedTopK: number;
  returnedChunks: number;
  embeddingModel: string;
  embeddingDimension: number;
  corpusVersion: number;
  cacheHit: boolean;
  chunks: RetrievedChunk[];
}

export interface ContextMetrics {
  retrievedChunks: number;
  usedChunks: number;
  discardedChunks: number;
  estimatedTokens: number;
  documentDiversity: number;
  duplicateDiscardedChunks: number;
  nearDuplicateDiscardedChunks: number;
  documentQuotaDiscardedChunks: number;
  tokenBudgetDiscardedChunks: number;
  maxChunkDiscardedChunks: number;
}

export interface RetrievalQualityPrediction {
  label: string;
  probability: number;
  modelVersion: string;
}

export interface AdvisorAnswer {
  traceId: string;
  question: string;
  refinedQuery: string;
  answer: string;
  contextMetrics: ContextMetrics;
  qualityPrediction: RetrievalQualityPrediction;
  sources: RetrievedChunk[];
}

export interface RetrievalTraceSummary {
  id: string;
  question: string;
  refinedQuery: string;
  answer: string;
  retrievedChunks: number;
  usedChunks: number;
  discardedChunks: number;
  estimatedTokens: number;
  topSimilarityScore: number | null;
  avgTop5Similarity: number | null;
  documentDiversity: number;
  mlLabel: string | null;
  mlProbability: number | null;
  corpusVersion: number;
  cacheHit: boolean;
  retrievalLatencyMs: number;
  contextBuildLatencyMs: number;
  llmLatencyMs: number;
  mlLatencyMs: number;
  totalLatencyMs: number;
  answerGenerator: string;
  retrievalStrategy: string;
  queryPlan: string | null;
  answerVerified: boolean;
  answerVerificationReason: string | null;
  createdAt: string;
}

export interface RetrievalTraceSourceSummary {
  id: string;
  documentId: string;
  documentTitle: string;
  versionId: string;
  versionNumber: number;
  chunkId: string;
  chunkIndex: number;
  parentSectionId: string | null;
  parentSectionTitle: string | null;
  similarityScore: number;
  excerpt: string;
  usedInContext: boolean;
  sourceRank: number;
  contextRank: number | null;
  discardReason: string | null;
  tokenEstimate: number;
  keywordScore: number;
  combinedScore: number;
  retrievalStrategy: string;
}

export interface RetrievalTraceDetail {
  summary: RetrievalTraceSummary;
  sources: RetrievalTraceSourceSummary[];
}

export interface GoldenQuestion {
  id: string;
  question: string;
  expectedSourceHints: string[];
  expectedAnswerHint: string;
  expectedChunkIds: string[];
  expectedAnswerKeywords: string[];
  expectedDocumentIds: string[];
}

export interface EvaluationResult {
  questionId: string;
  traceId: string;
  recallAt5: number;
  recallAt10: number;
  mrr: number;
  precisionAt5: number;
  citationAccuracy: number;
  answerGroundedness: number;
  faithfulness: number;
  latencyMs: number;
  tokenCount: number;
}

export interface EvaluationRun {
  runId: string;
  results: EvaluationResult[];
  averageLatencyMs: number;
  averageTokenCount: number;
}

export interface AdvisorEvent {
  stage: string;
  message: string;
  occurredAt: string;
  details: Record<string, unknown>;
}

export type AdvisorStreamMessage =
  | { type: 'event'; event: AdvisorEvent }
  | { type: 'answer'; answer: AdvisorAnswer };
