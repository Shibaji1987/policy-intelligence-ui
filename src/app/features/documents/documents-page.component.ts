import { DatePipe, DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize, forkJoin } from 'rxjs';

import { ApiError } from '../../core/http/api-error.interceptor';
import { DocumentsApiService } from './documents-api.service';
import {
  AdvisorEvent,
  ChunkingStrategy,
  DocumentChunk,
  DocumentSummary,
  DocumentVersion,
  EvaluationRun,
  AdvisorAnswer,
  GoldenQuestion,
  RetrievalTraceDetail,
  RetrievalTraceSummary,
  RetrievalSearchResponse
} from './documents.models';

@Component({
  selector: 'app-documents-page',
  imports: [DatePipe, DecimalPipe, ReactiveFormsModule],
  templateUrl: './documents-page.component.html',
  styleUrl: './documents-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DocumentsPageComponent implements OnInit {
  private readonly api = inject(DocumentsApiService);

  readonly documents = signal<DocumentSummary[]>([]);
  readonly versions = signal<DocumentVersion[]>([]);
  readonly chunks = signal<DocumentChunk[]>([]);
  readonly selectedDocument = signal<DocumentSummary | null>(null);
  readonly selectedVersion = signal<DocumentVersion | null>(null);
  readonly loading = signal(true);
  readonly uploading = signal(false);
  readonly searching = signal(false);
  readonly asking = signal(false);
  readonly evaluating = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);
  readonly selectedFile = signal<File | null>(null);
  readonly searchResult = signal<RetrievalSearchResponse | null>(null);
  readonly advisorAnswer = signal<AdvisorAnswer | null>(null);
  readonly traces = signal<RetrievalTraceSummary[]>([]);
  readonly selectedTrace = signal<RetrievalTraceDetail | null>(null);
  readonly goldenQuestions = signal<GoldenQuestion[]>([]);
  readonly evaluationRun = signal<EvaluationRun | null>(null);
  readonly advisorEvents = signal<AdvisorEvent[]>([]);

  readonly totalChunks = computed(() => this.chunks().length);
  readonly activeChunks = computed(() => this.chunks().filter((chunk) => chunk.active).length);
  readonly pendingEmbeddings = computed(
    () => this.chunks().filter((chunk) => chunk.embeddingStatus === 'PENDING').length
  );
  readonly completedEmbeddings = computed(
    () => this.chunks().filter((chunk) => chunk.embeddingStatus === 'COMPLETED').length
  );

  readonly uploadForm = new FormGroup({
    title: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(300)]
    }),
    tenantId: new FormControl('default', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(80)]
    }),
    department: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(120)] }),
    region: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(120)] }),
    documentType: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(120)] }),
    classification: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(120)] }),
    strategy: new FormControl<ChunkingStrategy>('SLIDING_WINDOW', {
      nonNullable: true,
      validators: [Validators.required]
    }),
    chunkSize: new FormControl(1000, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(100), Validators.max(20_000)]
    }),
    overlap: new FormControl(200, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0)]
    })
  });

  readonly searchForm = new FormGroup({
    query: new FormControl('Can contractors access production data?', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(500)]
    }),
    topK: new FormControl(5, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(1), Validators.max(20)]
    })
  });

  readonly advisorForm = new FormGroup({
    question: new FormControl('Can contractors access production data?', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(500)]
    })
  });

  ngOnInit(): void {
    this.loadDocuments();
    this.loadTraces();
    this.loadGoldenQuestions();
  }

  loadDocuments(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api
      .getDocuments()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (documents) => {
          this.documents.set(documents);
          if (documents.length > 0) {
            this.selectDocument(documents[0]);
          }
        },
        error: (error: ApiError) => this.error.set(error.message)
      });
  }

  selectDocument(document: DocumentSummary): void {
    this.selectedDocument.set(document);
    this.selectedVersion.set(null);
    this.chunks.set([]);
    this.api.getVersions(document.id).subscribe({
      next: (versions) => {
        this.versions.set(versions);
        if (versions.length > 0) {
          this.selectVersion(versions[0]);
        }
      },
      error: (error: ApiError) => this.error.set(error.message)
    });
  }

  selectVersion(version: DocumentVersion): void {
    this.selectedVersion.set(version);
    this.api.getChunks(version.id).subscribe({
      next: (chunks) => this.chunks.set(chunks),
      error: (error: ApiError) => this.error.set(error.message)
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile.set(input.files?.item(0) ?? null);
  }

  upload(): void {
    const file = this.selectedFile();
    if (this.uploadForm.invalid || !file) {
      this.uploadForm.markAllAsTouched();
      this.error.set('Choose a supported file and complete the ingestion settings.');
      return;
    }

    const value = this.uploadForm.getRawValue();
    if (value.strategy === 'SLIDING_WINDOW' && value.overlap >= value.chunkSize) {
      this.error.set('Overlap must be smaller than chunk size.');
      return;
    }

    this.uploading.set(true);
    this.error.set(null);
    this.success.set(null);
    this.api
      .upload({ ...value, overlap: value.strategy === 'FIXED_SIZE' ? 0 : value.overlap, file })
      .pipe(finalize(() => this.uploading.set(false)))
      .subscribe({
        next: (result) => {
          this.success.set(
            `Version ${result.version} created with ${result.chunkCount} chunks. Corpus ${result.corpusVersion}.`
          );
          this.uploadForm.controls.title.reset('');
          this.selectedFile.set(null);
          this.loadDocuments();
        },
        error: (error: ApiError) => this.error.set(error.message)
      });
  }

  refreshSelection(): void {
    const document = this.selectedDocument();
    if (!document) {
      this.loadDocuments();
      return;
    }
    forkJoin({
      documents: this.api.getDocuments(),
      versions: this.api.getVersions(document.id)
    }).subscribe({
      next: ({ documents, versions }) => {
        this.documents.set(documents);
        this.versions.set(versions);
        if (versions.length > 0) {
          this.selectVersion(versions[0]);
        }
      },
      error: (error: ApiError) => this.error.set(error.message)
    });
  }

  search(): void {
    if (this.searchForm.invalid) {
      this.searchForm.markAllAsTouched();
      this.error.set('Enter a search question before running retrieval.');
      return;
    }

    const value = this.searchForm.getRawValue();
    this.searching.set(true);
    this.error.set(null);
    this.api
      .search(value.query, value.topK)
      .pipe(finalize(() => this.searching.set(false)))
      .subscribe({
        next: (result) => this.searchResult.set(result),
        error: (error: ApiError) => this.error.set(error.message)
      });
  }

  askAdvisor(): void {
    if (this.advisorForm.invalid) {
      this.advisorForm.markAllAsTouched();
      this.error.set('Enter a question before asking the advisor.');
      return;
    }
    this.asking.set(true);
    this.error.set(null);
    this.advisorEvents.set([]);
    this.api
      .streamAdvisor(this.advisorForm.getRawValue().question)
      .pipe(finalize(() => this.asking.set(false)))
      .subscribe({
        next: (message) => {
          if (message.type === 'event') {
            this.advisorEvents.update((events) => [...events, message.event]);
            return;
          }
          this.advisorAnswer.set(message.answer);
          this.loadTraceDetail(message.answer.traceId);
          this.loadTraces();
        },
        error: () => this.error.set('Advisor stream failed. Check API logs for details.')
      });
  }

  loadTraces(): void {
    this.api.getTraces().subscribe({
      next: (traces) => this.traces.set(traces),
      error: () => this.traces.set([])
    });
  }

  loadTraceDetail(traceId: string): void {
    this.api.getTraceDetail(traceId).subscribe({
      next: (detail) => this.selectedTrace.set(detail),
      error: (error: ApiError) => this.error.set(error.message)
    });
  }

  submitFeedback(traceId: string, rating: 'THUMBS_UP' | 'THUMBS_DOWN'): void {
    this.api.submitFeedback(traceId, rating).subscribe({
      next: () => this.success.set(`Feedback saved for trace ${traceId}.`),
      error: (error: ApiError) => this.error.set(error.message)
    });
  }

  useGoldenQuestion(question: string): void {
    this.searchForm.controls.query.setValue(question);
    this.advisorForm.controls.question.setValue(question);
  }

  runGoldenQuestions(): void {
    this.evaluating.set(true);
    this.error.set(null);
    this.api
      .runGoldenQuestions()
      .pipe(finalize(() => this.evaluating.set(false)))
      .subscribe({
        next: (run) => {
          this.evaluationRun.set(run);
          this.loadTraces();
        },
        error: (error: ApiError) => this.error.set(error.message)
      });
  }

  private loadGoldenQuestions(): void {
    this.api.getGoldenQuestions().subscribe({
      next: (questions) => this.goldenQuestions.set(questions),
      error: () => this.goldenQuestions.set([])
    });
  }

  similarityPercent(score: number): string {
    return `${Math.round(score * 100)}%`;
  }
}
