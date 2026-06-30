import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

import { API_BASE_URL } from '../../core/config/api.config';
import {
  DocumentChunk,
  DocumentSummary,
  DocumentVersion,
  PageResponse,
  EvaluationRun,
  IngestionResult,
  AdvisorAnswer,
  AdvisorEvent,
  AdvisorStreamMessage,
  AdvisorStreamSession,
  GoldenQuestion,
  RetrievalSearchResponse,
  RetrievalTraceDetail,
  RetrievalTraceSummary,
  UploadDocument
} from './documents.models';

@Injectable({ providedIn: 'root' })
export class DocumentsApiService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${API_BASE_URL}/documents`;
  private readonly retrievalEndpoint = `${API_BASE_URL}/retrieval`;
  private readonly advisorEndpoint = `${API_BASE_URL}/advisor`;
  private readonly tracesEndpoint = `${API_BASE_URL}/retrieval-traces`;
  private readonly evaluationsEndpoint = `${API_BASE_URL}/evaluations`;

  getDocuments(): Observable<DocumentSummary[]> {
    return this.http
      .get<PageResponse<DocumentSummary>>(this.endpoint)
      .pipe(map((response) => response.content));
  }

  getVersions(documentId: string): Observable<DocumentVersion[]> {
    return this.http.get<DocumentVersion[]>(`${this.endpoint}/${documentId}/versions`);
  }

  getChunks(versionId: string): Observable<DocumentChunk[]> {
    return this.http.get<DocumentChunk[]>(`${this.endpoint}/versions/${versionId}/chunks`);
  }

  upload(payload: UploadDocument): Observable<IngestionResult> {
    const formData = new FormData();
    formData.append('title', payload.title);
    formData.append('file', payload.file);

    const params = new HttpParams()
      .set('tenantId', payload.tenantId)
      .set('department', payload.department)
      .set('region', payload.region)
      .set('documentType', payload.documentType)
      .set('classification', payload.classification)
      .set('strategy', payload.strategy)
      .set('chunkSize', payload.chunkSize)
      .set('overlap', payload.overlap);

    return this.http.post<IngestionResult>(this.endpoint, formData, { params });
  }

  search(query: string, topK: number): Observable<RetrievalSearchResponse> {
    const params = new HttpParams().set('query', query).set('topK', topK);
    return this.http.get<RetrievalSearchResponse>(`${this.retrievalEndpoint}/search`, { params });
  }

  askAdvisor(question: string): Observable<AdvisorAnswer> {
    return this.http.post<AdvisorAnswer>(this.advisorEndpoint, { question });
  }

  streamAdvisor(question: string): Observable<AdvisorStreamMessage> {
    return this.http.post<AdvisorStreamSession>(`${this.advisorEndpoint}/stream`, { question }).pipe(
      switchMap((session) => new Observable<AdvisorStreamMessage>((subscriber) => {
      const source = new EventSource(`${this.advisorEndpoint}/stream/${session.streamId}`);
      const stages = [
        'QUESTION_RECEIVED',
        'QUERY_REFINED',
        'VECTOR_SEARCH_STARTED',
        'CHUNKS_RETRIEVED',
        'CONTEXT_FILTERING_STARTED',
        'CONTEXT_BUILT',
        'LLM_STARTED',
        'ANSWER_VERIFIED',
        'SOURCE_ATTRIBUTION_CREATED',
        'ANSWER_COMPLETED',
        'ANSWER_FAILED'
      ];

      for (const stage of stages) {
        source.addEventListener(stage, (message) => {
          subscriber.next({ type: 'event', event: JSON.parse((message as MessageEvent).data) as AdvisorEvent });
        });
      }
      source.addEventListener('ANSWER', (message) => {
        subscriber.next({ type: 'answer', answer: JSON.parse((message as MessageEvent).data) as AdvisorAnswer });
        subscriber.complete();
        source.close();
      });
      source.onerror = (error) => {
        subscriber.error(error);
        source.close();
      };
      return () => source.close();
    }))
    );
  }

  getTraces(limit = 10): Observable<RetrievalTraceSummary[]> {
    return this.http.get<RetrievalTraceSummary[]>(this.tracesEndpoint, {
      params: new HttpParams().set('limit', limit)
    });
  }

  getTraceDetail(traceId: string): Observable<RetrievalTraceDetail> {
    return this.http.get<RetrievalTraceDetail>(`${this.tracesEndpoint}/${traceId}`);
  }

  submitFeedback(traceId: string, rating: 'THUMBS_UP' | 'THUMBS_DOWN', comment = ''): Observable<{ feedbackId: string }> {
    return this.http.post<{ feedbackId: string }>(`${this.tracesEndpoint}/${traceId}/feedback`, { rating, comment });
  }

  getGoldenQuestions(): Observable<GoldenQuestion[]> {
    return this.http.get<GoldenQuestion[]>(`${this.evaluationsEndpoint}/golden-questions`);
  }

  runGoldenQuestions(): Observable<EvaluationRun> {
    return this.http.post<EvaluationRun>(`${this.evaluationsEndpoint}/run-golden-questions`, {});
  }
}
