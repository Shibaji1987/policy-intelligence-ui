import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../../core/config/api.config';
import {
  DocumentChunk,
  DocumentSummary,
  DocumentVersion,
  IngestionResult,
  AdvisorAnswer,
  RetrievalSearchResponse,
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

  getDocuments(): Observable<DocumentSummary[]> {
    return this.http.get<DocumentSummary[]>(this.endpoint);
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

  getTraces(limit = 10): Observable<RetrievalTraceSummary[]> {
    return this.http.get<RetrievalTraceSummary[]>(this.tracesEndpoint, {
      params: new HttpParams().set('limit', limit)
    });
  }
}
