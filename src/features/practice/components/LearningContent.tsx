import { CodeBlock } from '@/components/codegym/CodeBlock';
import type { LearningContent as LearningContentModel, LearningSection } from '@/types/content';

export interface LearningContentProps {
  content: LearningContentModel | undefined;
  fallbackMarkdown: string;
  conceptName: string;
}

const SECTION_STYLES: Partial<Record<LearningSection['type'], string>> = {
  'key-point': 'border-primary/50 bg-primary/10',
  warning: 'border-warning/50 bg-warning/10',
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
    <section aria-label={`Teoría de ${conceptName}`} className="mt-5 space-y-5">
      {content.sections.map((section, index) => (
        <LearningSectionView key={`${section.type}-${index}`} section={section} />
      ))}
    </section>
  );
}

function LearningSectionView({ section }: { section: LearningSection }) {
  if (section.type === 'objectives') {
    return (
      <section aria-labelledby={`learning-${section.type}-${section.title}`}>
        <h4 id={`learning-${section.type}-${section.title}`} className="text-sm font-semibold text-foreground">
          {section.title}
        </h4>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-muted-foreground">
          {section.items.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </section>
    );
  }

  if (section.type === 'code') {
    return (
      <section aria-labelledby={`learning-code-${section.title}`}>
        <h4 id={`learning-code-${section.title}`} className="text-sm font-semibold text-foreground">
          {section.title}
        </h4>
        {section.caption && <p className="mt-2 text-sm text-muted-foreground">{section.caption}</p>}
        <CodeBlock code={section.code} language={section.language} className="mt-3" />
      </section>
    );
  }

  if (section.type === 'comparison') {
    return (
      <section aria-labelledby={`learning-comparison-${section.title}`}>
        <h4 id={`learning-comparison-${section.title}`} className="text-sm font-semibold text-foreground">
          {section.title}
        </h4>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2">
          {[section.left, section.right].map((item) => (
            <div key={item.title} className="rounded-md border border-border bg-background p-3">
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
      <section aria-labelledby={`learning-check-${section.question}`} className="rounded-md border border-border bg-background p-4">
        <h4 id={`learning-check-${section.question}`} className="text-sm font-semibold text-foreground">Mini comprobación</h4>
        <p className="mt-2 text-sm text-muted-foreground">{section.question}</p>
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Ver respuesta</summary>
          <p className="mt-2 leading-relaxed text-muted-foreground">{section.answer}</p>
        </details>
      </section>
    );
  }

  return (
    <section
      aria-labelledby={`learning-${section.type}-${section.title}`}
      className={`border-l-4 p-4 ${SECTION_STYLES[section.type] ?? 'border-border bg-background'}`}
    >
      <h4 id={`learning-${section.type}-${section.title}`} className="text-sm font-semibold text-foreground">
        {section.title}
      </h4>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{section.body}</p>
    </section>
  );
}
