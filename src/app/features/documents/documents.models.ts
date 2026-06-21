export type ChunkingStrategy = 'FIXED_SIZE' | 'SLIDING_WINDOW';
export type EmbeddingStatus = 'PENDING' | 'COMPLETED' | 'FAILED';

export interface DocumentSummary {
  id: string;
  title: string;
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
  chunkText: string;
  similarityScore: number;
  excerpt: string;
}

export interface RetrievalSearchResponse {
  query: string;
  requestedTopK: number;
  returnedChunks: number;
  embeddingModel: string;
  embeddingDimension: number;
  chunks: RetrievedChunk[];
}

export interface ContextMetrics {
  retrievedChunks: number;
  usedChunks: number;
  discardedChunks: number;
  estimatedTokens: number;
  documentDiversity: number;
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
  createdAt: string;
}
