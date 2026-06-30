import { DatePipe, DecimalPipe } from '@angular/common';
import {
  AfterViewChecked,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  OnInit,
  signal,
  ViewChild
} from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { ApiError } from '../../core/http/api-error.interceptor';
import { DocumentsApiService } from '../documents/documents-api.service';
import { AdvisorAnswer, AdvisorEvent } from '../documents/documents.models';

interface ChatMessage {
  id: number;
  role: 'assistant' | 'user';
  text: string;
  createdAt: Date;
  answer?: AdvisorAnswer;
  events?: AdvisorEvent[];
  failed?: boolean;
}

interface ChatThread {
  id: number;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messages: ChatMessage[];
}

type ChatMode = 'ASK_POLICY' | 'COMPARE_POLICIES' | 'FIND_EXCEPTIONS' | 'EVIDENCE_CHECKLIST';
type FeedbackRating = 'THUMBS_UP' | 'THUMBS_DOWN';

interface StoredChatThread {
  id: number;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: Array<Omit<ChatMessage, 'createdAt'> & { createdAt: string }>;
}

@Component({
  selector: 'app-chat-page',
  imports: [DatePipe, DecimalPipe, ReactiveFormsModule, RouterLink],
  templateUrl: './chat-page.component.html',
  styleUrl: './chat-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChatPageComponent implements AfterViewChecked, OnInit {
  private static readonly STORAGE_KEY = 'policy-intelligence.chatThreads.v1';
  private readonly api = inject(DocumentsApiService);
  private nextMessageId = 1;
  private nextThreadId = 2;
  private shouldScroll = true;

  @ViewChild('messageLog') private readonly messageLog?: ElementRef<HTMLElement>;

  readonly asking = signal(false);
  readonly error = signal<string | null>(null);
  readonly activeEvents = signal<AdvisorEvent[]>([]);
  readonly feedbackStatus = signal<Record<string, string>>({});
  readonly activeMode = signal<ChatMode>('ASK_POLICY');
  readonly activeThreadId = signal(1);
  readonly threads = signal<ChatThread[]>([
    {
      id: 1,
      title: 'New Chat',
      createdAt: new Date(),
      updatedAt: new Date(),
      messages: [this.welcomeMessage()]
    }
  ]);
  readonly messages = computed(() => this.activeThread()?.messages ?? []);
  readonly latestAnswer = computed(
    () => [...this.messages()].reverse().find((message) => message.answer)?.answer ?? null
  );
  readonly latestUserQuestion = computed(
    () => [...this.messages()].reverse().find((message) => message.role === 'user')?.text ?? 'No question asked yet'
  );
  readonly conversationThreads = computed(() =>
    [...this.threads()]
      .filter((thread) => thread.messages.some((message) => message.role === 'user') || thread.id === this.activeThreadId())
      .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())
  );

  readonly question = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(500)]
  });

  readonly suggestions = [
    'Can contractors access production data?',
    'What evidence is required for privileged access?',
    'Who approves exceptions for customer data access?'
  ];
  readonly modes: Array<{ id: ChatMode; label: string }> = [
    { id: 'ASK_POLICY', label: 'Ask Policy' },
    { id: 'COMPARE_POLICIES', label: 'Compare' },
    { id: 'FIND_EXCEPTIONS', label: 'Exceptions' },
    { id: 'EVIDENCE_CHECKLIST', label: 'Evidence' }
  ];

  ngOnInit(): void {
    this.restoreThreads();
  }

  ngAfterViewChecked(): void {
    if (!this.shouldScroll) {
      return;
    }
    this.messageLog?.nativeElement.scrollTo({
      top: this.messageLog.nativeElement.scrollHeight,
      behavior: 'smooth'
    });
    this.shouldScroll = false;
  }

  ask(event?: Event): void {
    event?.preventDefault();

    const text = this.question.value.trim();
    if (this.question.invalid || !text || this.asking()) {
      this.question.markAsTouched();
      return;
    }

    this.error.set(null);
    this.activeEvents.set([]);
    this.asking.set(true);
    this.append({ role: 'user', text, createdAt: new Date() });
    this.question.reset('');

    this.api
      .streamAdvisor(text)
      .pipe(finalize(() => this.asking.set(false)))
      .subscribe({
        next: (message) => {
          if (message.type === 'event') {
            this.activeEvents.update((events) => [...events, message.event]);
            this.shouldScroll = true;
            return;
          }
          this.append({
            role: 'assistant',
            text: message.answer.answer,
            createdAt: new Date(),
            answer: message.answer,
            events: this.activeEvents()
          });
          this.activeEvents.set([]);
        },
        error: (error: ApiError | Event) => {
          const message = 'I could not complete that request. Check that the API is running and documents are embedded.';
          this.error.set(error instanceof Error ? error.message : message);
          this.append({
            role: 'assistant',
            text: message,
            createdAt: new Date(),
            failed: true,
            events: this.activeEvents()
          });
          this.activeEvents.set([]);
        }
      });
  }

  useSuggestion(suggestion: string): void {
    this.question.setValue(suggestion);
    this.ask();
  }

  setMode(mode: ChatMode): void {
    this.activeMode.set(mode);
  }

  newChat(): void {
    if (this.asking()) {
      return;
    }
    const thread = this.createThread();
    this.threads.update((threads) => [thread, ...threads]);
    this.activeThreadId.set(thread.id);
    this.activeEvents.set([]);
    this.error.set(null);
    this.question.reset('');
    this.shouldScroll = true;
    this.persistThreads();
  }

  selectThread(threadId: number): void {
    if (this.asking() || threadId === this.activeThreadId()) {
      return;
    }
    this.activeThreadId.set(threadId);
    this.activeEvents.set([]);
    this.error.set(null);
    this.question.reset('');
    this.shouldScroll = true;
    this.persistThreads();
  }

  clearChat(): void {
    if (this.asking()) {
      return;
    }
    this.activeEvents.set([]);
    this.error.set(null);
    this.replaceActiveThread({
      title: 'New Chat',
      updatedAt: new Date(),
      messages: [this.welcomeMessage()]
    });
    this.shouldScroll = true;
    this.persistThreads();
  }

  submitOnEnter(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    if (keyboardEvent.shiftKey) {
      return;
    }
    keyboardEvent.preventDefault();
    this.ask();
  }

  trackMessage(_: number, message: ChatMessage): number {
    return message.id;
  }

  trackThread(_: number, thread: ChatThread): number {
    return thread.id;
  }

  trustLabel(answer: AdvisorAnswer): string {
    if (answer.sources.length === 0) {
      return 'No policy context';
    }
    if (answer.qualityPrediction.label === 'GOOD_RETRIEVAL' && answer.contextMetrics.usedChunks > 0) {
      return 'Grounded';
    }
    if (answer.contextMetrics.usedChunks > 0) {
      return 'Partial';
    }
    return 'Insufficient context';
  }

  trustDetail(answer: AdvisorAnswer): string {
    if (answer.sources.length === 0) {
      return 'No retrieval sources were used for this response.';
    }
    return `${answer.contextMetrics.usedChunks} source chunks from ${answer.contextMetrics.documentDiversity} document(s), ${answer.contextMetrics.estimatedTokens} estimated context tokens.`;
  }

  submitAnswerFeedback(answer: AdvisorAnswer, rating: FeedbackRating): void {
    const comment = `${this.trustLabel(answer)} | ${answer.qualityPrediction.label}`;
    this.feedbackStatus.update((state) => ({ ...state, [answer.traceId]: 'Saving feedback...' }));
    this.api.submitFeedback(answer.traceId, rating, comment).subscribe({
      next: () => this.feedbackStatus.update((state) => ({ ...state, [answer.traceId]: 'Feedback saved' })),
      error: () => this.feedbackStatus.update((state) => ({ ...state, [answer.traceId]: 'Could not save feedback' }))
    });
  }

  downloadMarkdown(message: ChatMessage): void {
    if (!message.answer) {
      return;
    }
    this.downloadFile(
      this.fileName(message.answer.question, 'md'),
      'text/markdown;charset=utf-8',
      this.toMarkdown(message.answer)
    );
  }

  downloadJson(message: ChatMessage): void {
    if (!message.answer) {
      return;
    }
    this.downloadFile(
      this.fileName(message.answer.question, 'json'),
      'application/json;charset=utf-8',
      JSON.stringify(message.answer, null, 2)
    );
  }

  printPdf(message: ChatMessage): void {
    if (!message.answer) {
      return;
    }
    const report = window.open('', '_blank', 'noopener,noreferrer,width=900,height=1100');
    if (!report) {
      this.error.set('Your browser blocked the PDF export window.');
      return;
    }
    report.document.write(this.toPrintableHtml(message.answer));
    report.document.close();
    report.focus();
    report.print();
  }

  private append(message: Omit<ChatMessage, 'id'>): void {
    const nextMessage = { ...message, id: this.nextMessageId++ };
    this.threads.update((threads) =>
      threads.map((thread) => {
        if (thread.id !== this.activeThreadId()) {
          return thread;
        }
        const title = thread.title === 'New Chat' && nextMessage.role === 'user'
          ? this.threadTitle(nextMessage.text)
          : thread.title;
        return {
          ...thread,
          title,
          updatedAt: nextMessage.createdAt,
          messages: [...thread.messages, nextMessage]
        };
      })
    );
    this.shouldScroll = true;
    this.persistThreads();
  }

  private activeThread(): ChatThread | undefined {
    return this.threads().find((thread) => thread.id === this.activeThreadId());
  }

  private createThread(): ChatThread {
    const now = new Date();
    return {
      id: this.nextThreadId++,
      title: 'New Chat',
      createdAt: now,
      updatedAt: now,
      messages: [this.welcomeMessage()]
    };
  }

  private replaceActiveThread(update: Pick<ChatThread, 'title' | 'updatedAt' | 'messages'>): void {
    this.threads.update((threads) =>
      threads.map((thread) => thread.id === this.activeThreadId() ? { ...thread, ...update } : thread)
    );
  }

  private welcomeMessage(): ChatMessage {
    return {
      id: this.nextMessageId++,
      role: 'assistant',
      text: 'Ask me a policy question and I will answer from the uploaded knowledge base with citations.',
      createdAt: new Date()
    };
  }

  private threadTitle(question: string): string {
    return question.length <= 42 ? question : `${question.slice(0, 39).trimEnd()}...`;
  }

  private restoreThreads(): void {
    try {
      const raw = localStorage.getItem(ChatPageComponent.STORAGE_KEY);
      if (!raw) {
        return;
      }
      const stored = JSON.parse(raw) as { activeThreadId: number; nextThreadId: number; nextMessageId: number; threads: StoredChatThread[] };
      const threads = stored.threads.map((thread) => ({
        ...thread,
        createdAt: new Date(thread.createdAt),
        updatedAt: new Date(thread.updatedAt),
        messages: thread.messages.map((message) => ({ ...message, createdAt: new Date(message.createdAt) }))
      }));
      if (threads.length === 0) {
        return;
      }
      this.threads.set(threads);
      this.activeThreadId.set(stored.activeThreadId);
      this.nextThreadId = Math.max(stored.nextThreadId ?? 1, ...threads.map((thread) => thread.id + 1));
      this.nextMessageId = Math.max(stored.nextMessageId ?? 1, ...threads.flatMap((thread) => thread.messages.map((message) => message.id + 1)));
    } catch {
      localStorage.removeItem(ChatPageComponent.STORAGE_KEY);
    }
  }

  private persistThreads(): void {
    const payload = {
      activeThreadId: this.activeThreadId(),
      nextThreadId: this.nextThreadId,
      nextMessageId: this.nextMessageId,
      threads: this.threads()
    };
    localStorage.setItem(ChatPageComponent.STORAGE_KEY, JSON.stringify(payload));
  }

  private downloadFile(fileName: string, type: string, content: string): void {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  private fileName(question: string, extension: string): string {
    const slug = question
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 54);
    return `policy-answer-${slug || 'response'}.${extension}`;
  }

  private toMarkdown(answer: AdvisorAnswer): string {
    const sources = answer.sources
      .map(
        (source, index) => `${index + 1}. ${source.documentTitle}, chunk ${source.chunkIndex + 1}
   Score: ${source.combinedScore.toFixed(2)}
   Excerpt: ${source.excerpt || source.chunkText}`
      )
      .join('\n\n');
    return `# Policy Intelligence Answer

## Question
${answer.question}

## Answer
${answer.answer}

## Retrieval Summary
- Trace ID: ${answer.traceId}
- Refined query: ${answer.refinedQuery}
- Sources used: ${answer.contextMetrics.usedChunks}
- Estimated context tokens: ${answer.contextMetrics.estimatedTokens}
- Quality: ${answer.qualityPrediction.label} (${answer.qualityPrediction.probability})

## Sources
${sources || 'No sources returned.'}
`;
  }

  private toPrintableHtml(answer: AdvisorAnswer): string {
    const escapedAnswer = this.escapeHtml(answer.answer).replace(/\n/g, '<br>');
    const sources = answer.sources
      .map(
        (source, index) => `<li>
          <strong>${index + 1}. ${this.escapeHtml(source.documentTitle)}</strong>
          <span>Chunk ${source.chunkIndex + 1} · Score ${source.combinedScore.toFixed(2)}</span>
          <p>${this.escapeHtml(source.excerpt || source.chunkText)}</p>
        </li>`
      )
      .join('');
    return `<!doctype html>
      <html>
        <head>
          <title>Policy Intelligence Answer</title>
          <style>
            body { color: #111827; font: 14px/1.6 Arial, sans-serif; margin: 40px; }
            h1 { font-size: 24px; margin-bottom: 4px; }
            h2 { border-top: 1px solid #d1d5db; font-size: 16px; margin-top: 28px; padding-top: 18px; }
            .meta { color: #4b5563; font-size: 12px; }
            .answer { background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; }
            li { margin-bottom: 14px; }
            li span { color: #4b5563; display: block; font-size: 12px; }
          </style>
        </head>
        <body>
          <h1>Policy Intelligence Answer</h1>
          <div class="meta">Trace ${this.escapeHtml(answer.traceId)}</div>
          <h2>Question</h2>
          <p>${this.escapeHtml(answer.question)}</p>
          <h2>Answer</h2>
          <div class="answer">${escapedAnswer}</div>
          <h2>Retrieval Summary</h2>
          <p>Refined query: ${this.escapeHtml(answer.refinedQuery)}<br>
          Sources used: ${answer.contextMetrics.usedChunks}<br>
          Estimated tokens: ${answer.contextMetrics.estimatedTokens}<br>
          Quality: ${this.escapeHtml(answer.qualityPrediction.label)}</p>
          <h2>Sources</h2>
          <ol>${sources || '<li>No sources returned.</li>'}</ol>
        </body>
      </html>`;
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
