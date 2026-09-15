import { AlertTriangle, CheckCircle2, CircleCheck, Lightbulb, ListChecks, Scale } from 'lucide-react';

import { CodeBlock } from '@/components/codegym/CodeBlock';
import type { LearningContent as LearningContentModel, LearningSection } from '@/types/content';

export interface LearningContentProps {
  content: LearningContentModel | undefined;
  fallbackMarkdown: string;
  conceptName: string;
}

const SECTION_STYLES: Partial<Record<LearningSection['type'], { className: string; icon: typeof Lightbulb }>> = {
  intro: { className: 'border-border bg-background', icon: CircleCheck },
  explanation: { className: 'border-border bg-background', icon: CircleCheck },
  'key-point': { className: 'border-primary/40 bg-primary/10', icon: Lightbulb },
  warning: { className: 'border-warning/50 bg-warning/10', icon: AlertTriangle },
};

/** Presenta la teoría versionada sin convertir TopicPage en un page builder. */
export function LearningContent({ content, fallbackMarkdown, conceptName }: LearningContentProps) {
  if (content === undefined || content.sections.length === 0) {
    return (
      <section
        aria-label={`Teoría de ${conceptName}`}
        className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground"
      >
        {fallbackMarkdown}
      </section>
    );
  }

  return (
    <section aria-label={`Teoría de ${conceptName}`} className="mt-4 space-y-4">
      {content.sections.map((section, index) => (
        <LearningSectionView key={`${section.type}-${index}`} section={section} index={index} />
      ))}
    </section>
  );
}

function LearningSectionView({ section, index }: { section: LearningSection; index: number }) {
  const sectionId = `learning-${section.type}-${index}`;

  if (section.type === 'objectives') {
    return (
      <section aria-labelledby={sectionId} className="rounded-xl border border-border/80 bg-background/50 p-4">
        <div className="flex items-center gap-2 text-primary">
          <ListChecks className="size-4" aria-hidden="true" />
          <h4 id={sectionId} className="text-sm font-semibold text-foreground">
          {section.title}
          </h4>
        </div>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">
          {section.items.map((item) => <li key={item} className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />{item}</li>)}
        </ul>
      </section>
    );
  }

  if (section.type === 'code') {
    return (
      <section aria-labelledby={sectionId}>
        <h4 id={sectionId} className="text-sm font-semibold text-foreground">
          {section.title}
        </h4>
        {section.caption && <p className="mt-2 text-sm text-muted-foreground">{section.caption}</p>}
        <CodeBlock code={section.code} language={section.language} className="mt-3" />
      </section>
    );
  }

  if (section.type === 'comparison') {
    return (
      <section aria-labelledby={sectionId} className="rounded-xl border border-border/80 bg-background/50 p-4">
        <div className="flex items-center gap-2">
          <Scale className="size-4 text-primary" aria-hidden="true" />
          <h4 id={sectionId} className="text-sm font-semibold text-foreground">{section.title}</h4>
        </div>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2">
          {[section.left, section.right].map((item) => (
            <div key={item.title} className="rounded-lg border border-border/80 bg-card/70 p-3.5">
              <dt className="font-medium text-foreground">{item.title}</dt>
              <dd className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.body}</dd>
            </div>
          ))}
        </dl>
      </section>
    );
  }

  if (section.type === 'quick-check') {
    return (
      <section aria-labelledby={sectionId} className="rounded-xl border border-primary/20 bg-primary/5 p-4">
        <h4 id={sectionId} className="text-sm font-semibold text-foreground">Mini comprobación</h4>
        <p className="mt-2 text-sm text-muted-foreground">{section.question}</p>
        <details className="mt-3 text-sm">
          <summary className="flex min-h-11 cursor-pointer items-center font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Ver respuesta</summary>
          <p className="mt-2 leading-relaxed text-muted-foreground">{section.answer}</p>
        </details>
      </section>
    );
  }

  const presentation = SECTION_STYLES[section.type] ?? {
    className: 'border-border bg-background',
    icon: CircleCheck,
  };
  const Icon = presentation.icon;
  return <section aria-labelledby={sectionId} className={`rounded-xl border p-4 ${presentation.className}`}><div className="flex gap-3"><Icon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" /><div className="min-w-0"><h4 id={sectionId} className="break-normal whitespace-normal text-sm font-semibold text-foreground">{section.title}</h4><p className="mt-2 break-normal whitespace-normal text-sm leading-relaxed text-muted-foreground">{section.body}</p></div></div></section>;
}
