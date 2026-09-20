import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  Circle,
  CircleCheck,
  FileQuestion,
  Flag,
  LockKeyhole,
  PlayCircle,
} from 'lucide-react';

import {
  Link,
  useSearchParams,
} from 'react-router-dom';

import type {
  Concept,
} from '@/types/content';

import type {
  ExerciseSession,
} from '@/types/exercise';

import {
  LearningContent,
} from '@/features/practice/components/LearningContent';

import {
  TopicSessionList,
  type TopicSessionResult,
} from '@/features/practice/components/TopicSessionList';

import type {
  ConceptLearningState,
  LearningLevelState,
  LearningStage,
  LearningStageState,
  LearningStageStatus,
} from './learning-types';

import {
  canOpenLearningStage,
  canSelectRequestedConceptFromUrl,
  DEFAULT_LEARNING_LEVEL_ID,
  filterLearningContentByLevel,
  getConfiguredLearningLevelIds,
  groupLearningSessions,
  groupLearningSessionsByLevel,
  isStagedLearningConcept,
  type LearningLevelSessionGroups,
  resolveActiveLearningLevelId,
  resolveCurrentLearningStage,
} from './learning-workspace-model';

interface LearningWorkspaceProps {
  readonly technologyName:
    string;
  readonly topicName:
    string;
  readonly concepts:
    readonly Concept[];

  readonly results:
    Readonly<
      Record<
        string,
        TopicSessionResult
      >
    >;

  readonly learningStates:
    Readonly<
      Record<
        string,
        ConceptLearningState
      >
    >;

  readonly levelLearningStates:
    Readonly<
      Record<
        string,
        Partial<
          Record<
            LearningLevelState['levelId'],
            LearningLevelState
          >
        >
      >
    >;

  readonly learningErrors:
    Readonly<
      Record<
        string,
        string
      >
    >;

  readonly completingTheoryId:
    string | null;

  readonly onCompleteTheory:
    (
      conceptId:
        string,

      levelId:
        LearningLevelState['levelId'],
    ) => Promise<void>;
}

const STAGES:
  readonly {
    readonly id:
      LearningStage;

    readonly label:
      string;
  }[] = [
    {
      id:
        'theory',

      label:
        'Teoría',
    },

    {
      id:
        'quiz',

      label:
        'Test',
    },

    {
      id:
        'practice',

      label:
        'Práctica',
    },

    {
      id:
        'checkpoint',

      label:
        'Checkpoint',
    },
  ];

export function LearningWorkspace({
  technologyName,
  topicName,
  concepts,
  results,
  learningStates,
  levelLearningStates,
  learningErrors,
  completingTheoryId,
  onCompleteTheory,
}: LearningWorkspaceProps) {
  // CONCEPT_URL_SELECTION
  const [
    searchParams,
    setSearchParams,
  ] = useSearchParams();

  const requestedConceptId =
    searchParams.get(
      'concept',
    );

  const requestedStageParam =
    searchParams.get(
      'stage',
    );

  const requestedStage:
    LearningStage
    | null =
      requestedStageParam === 'theory'
      || requestedStageParam === 'quiz'
      || requestedStageParam === 'practice'
      || requestedStageParam === 'checkpoint'
        ? requestedStageParam
        : null;

  // LOCKED_CONCEPT_URL_GATE
  const requestedConcept =
    requestedConceptId === null
      ? undefined
      : concepts.find(
          concept =>
            concept.id
            === requestedConceptId,
        );

  const requestedConceptCanOpen =
    requestedConcept !== undefined
    && canSelectRequestedConceptFromUrl(
      isStagedLearningConcept(
        requestedConcept,
      ),
      learningStates[
        requestedConcept.id
      ],
    );

  const [
    selectedConceptId,
    setSelectedConceptId,
  ] = useState(
    () =>
      requestedConceptCanOpen
        ? requestedConcept.id
        : concepts[0]?.id
          ?? '',
  );

  useEffect(
    () => {
      let active = true;

      void Promise.resolve().then(() => {
        if (!active) {
          return;
        }

        /*
         * Una URL válida solo puede seleccionar
         * contenido staged después de que el
         * backend confirme locked === false.
         */
        if (
          requestedConceptCanOpen
          && requestedConcept
            !== undefined
        ) {
          if (
            requestedConcept.id
            !== selectedConceptId
          ) {
            setSelectedConceptId(
              requestedConcept.id,
            );
          }

          return;
        }

        /*
         * Si un concepto que había sido seleccionado
         * mediante URL pasa a estar bloqueado, no
         * conservamos esa selección.
         */
        if (
          requestedConcept
            !== undefined
          && requestedConcept.id
            === selectedConceptId
          && isStagedLearningConcept(
            requestedConcept,
          )
          && learningStates[
            requestedConcept.id
          ]?.locked
            === true
        ) {
          setSelectedConceptId(
            concepts[0]?.id
            ?? '',
          );

          return;
        }

        /*
         * Query inexistente, bloqueada o aún pendiente:
         * conservar una selección local válida.
         */
        if (
          concepts.some(
            concept =>
              concept.id
              === selectedConceptId,
          )
        ) {
          return;
        }

        setSelectedConceptId(
          concepts[0]?.id
          ?? '',
        );
      });

      return () => {
        active = false;
      };
    },
    [
      concepts,
      learningStates,
      requestedConcept,
      requestedConceptCanOpen,
      selectedConceptId,
    ],
  );

  const selectConcept =
    (
      conceptId:
        string,
    ) => {
      setSelectedConceptId(
        conceptId,
      );

      setSearchParams(
        current => {
          const next =
            new URLSearchParams(
              current,
            );

          next.set(
            'concept',
            conceptId,
          );

          next.delete(
            'stage',
          );

          return next;
        },
        {
          replace:
            true,
        },
      );
    };

  const selectedConcept =
    concepts.find(
      concept =>
        concept.id
        === selectedConceptId,
    )
    ?? concepts[0];

  const selectedResult =
    selectedConcept === undefined
      ? undefined
      : results[
          selectedConcept.id
        ];

  const selectedSessions =
    useMemo(
      () =>
        selectedResult?.status
          === 'success'
          ? selectedResult.sessions
          : [],
      [selectedResult],
    );

  const selectedConceptIsStaged =
    selectedConcept !== undefined
    && isStagedLearningConcept(
      selectedConcept,
    );

  const configuredLevelIds =
    useMemo(
      () =>
        getConfiguredLearningLevelIds(
          selectedConcept
          ?? {},
        ),
      [
        selectedConcept,
      ],
    );

  const groupedByLevel =
    useMemo(
      () =>
        groupLearningSessionsByLevel(
          selectedSessions,
          configuredLevelIds,
        ),
      [
        selectedSessions,
        configuredLevelIds,
      ],
    );

  const selectedLevelStates =
    selectedConcept === undefined
      ? {}
      : levelLearningStates[
          selectedConcept.id
        ]
        ?? {};

  const activeLevelId =
    selectedConcept === undefined
      ? DEFAULT_LEARNING_LEVEL_ID
      : resolveActiveLearningLevelId(
          selectedConcept.levels,
          selectedLevelStates,
        );

  const grouped =
    groupedByLevel[
      activeLevelId
    ]
    ?? Object.freeze({
      levelId:
        activeLevelId,

      ...groupLearningSessions(
        [],
      ),
    });

  const levelState =
    selectedLevelStates[
      activeLevelId
    ];

  const levelContent =
    selectedConcept === undefined
      ? undefined
      : filterLearningContentByLevel(
          selectedConcept.content,
          activeLevelId,
        );

  const [
    selectedStage,
    setSelectedStage,
  ] = useState<
    LearningStage
  >(
    'theory',
  );

  useEffect(
    () => {
      let active = true;

      void Promise.resolve().then(() => {
        if (!active) {
          return;
        }

        if (
          selectedConceptIsStaged
          && levelState
            !== undefined
        ) {
          if (
            requestedStage !== null
            && canOpenLearningStage(
              levelState,
              requestedStage,
            )
          ) {
            setSelectedStage(
              requestedStage,
            );

            return;
          }

          setSelectedStage(
            resolveCurrentLearningStage(
              levelState,
            ),
          );

          return;
        }

        setSelectedStage(
          'theory',
        );
      });

      return () => {
        active = false;
      };
    },
    [
      activeLevelId,
      levelState,
      requestedStage,
      selectedConceptIsStaged,
      selectedConcept?.id,
    ],
  );

  const selectStage =
    (
      stage:
        LearningStage,
    ) => {
      setSelectedStage(
        stage,
      );

      setSearchParams(
        current => {
          const next =
            new URLSearchParams(
              current,
            );

          next.delete(
            'stage',
          );

          return next;
        },
        {
          replace:
            true,
        },
      );
    };

  if (
    selectedConcept
    === undefined
  ) {
    return null;
  }

  const learningError =
    learningErrors[
      selectedConcept.id
    ];

  const canonicalPending =
    selectedConceptIsStaged
    && levelState
      === undefined
    && learningError
      === undefined;

  const activeLevelUnavailable =
    selectedConcept.levels
      !== undefined
    && selectedConcept.levels.length
      > 0
    && levelContent
      === undefined
    && grouped.quiz
      === null
    && grouped.practices.length
      === 0
    && grouped.checkpoint
      === null;

  const filteredPracticeResult:
    TopicSessionResult = {
      status:
        'success',

      sessions:
        [
          ...grouped.practices,
        ],
    };

  return (
    <section
      aria-label="Teoría y conceptos"
      className="
        grid
        min-w-0
        gap-4
        xl:grid-cols-[17rem_minmax(0,1fr)]
        xl:items-start
        xl:gap-5
      "
    >
      <aside
        className="
          min-w-0
          overflow-hidden
          rounded-[1.15rem]
          border
          border-border/70
          bg-card/90
          p-2
          shadow-sm
          xl:sticky
          xl:top-20
        "
      >
        <div
          className="
            border-b
            border-border
            px-2
            pb-4
            pt-1
          "
        >
          <p
            className="
              text-[0.68rem]
              font-semibold
              uppercase
              tracking-[0.18em]
              text-primary
            "
          >
            Ruta de aprendizaje
          </p>

          <h2
            className="
              mt-1
              text-base
              font-semibold
              text-foreground
            "
          >
            {topicName}
          </h2>

          <p
            className="
              mt-1
              text-xs
              leading-relaxed
              text-muted-foreground
            "
          >
            {concepts.length} conceptos disponibles
          </p>
        </div>

        <ol
          className="
            mt-2
            space-y-1
          "
        >
          {concepts.map(
            (
              concept,
              index,
            ) => {
              const state =
                learningStates[
                  concept.id
                ];

              // STAGED_CONCEPT_PENDING_CLICK_GATE
              const staged =
                isStagedLearningConcept(
                  concept,
                );

              const pending =
                staged
                && state === undefined;

              const locked =
                state?.locked
                ?? false;

              const unavailable =
                pending
                || locked;

              const completed =
                state?.completed
                ?? false;

              const selected =
                concept.id
                === selectedConcept.id;

              return (
                <li
                  key={
                    concept.id
                  }
                >
                  <button
                    type="button"
                    disabled={
                      unavailable
                    }
                    onClick={
                      () =>
                        selectConcept(
                          concept.id,
                        )
                    }
                    aria-current={
                      selected
                        ? 'step'
                        : undefined
                    }
                    className={`
                      group
                      grid
                      w-full
                      min-w-0
                      grid-cols-[2rem_minmax(0,1fr)_auto]
                      items-center
                      gap-2.5
                      rounded-xl
                      px-2.5
                      py-3
                      text-left
                      transition-colors
                      ${
                        selected
                          ? 'bg-primary/10'
                          : 'hover:bg-muted/60'
                      }
                      ${
                        unavailable
                          ? 'cursor-not-allowed opacity-50'
                          : ''
                      }
                    `}
                  >
                    <span
                      className={`
                        flex
                        size-8
                        items-center
                        justify-center
                        rounded-lg
                        border
                        text-xs
                        font-semibold
                        tabular-nums
                        ${
                          completed
                            ? 'border-success/30 bg-success/10 text-success'
                            : selected
                              ? 'border-primary/30 bg-primary/10 text-primary'
                              : 'border-border bg-background text-muted-foreground'
                        }
                      `}
                    >
                      {
                        completed
                          ? (
                            <Check
                              className="size-4"
                            />
                          )
                          : String(
                              index + 1,
                            ).padStart(
                              2,
                              '0',
                            )
                      }
                    </span>

                    <span
                      className="
                        min-w-0
                      "
                    >
                      <h3
                        className="
                          break-normal
                          whitespace-normal
                          text-sm
                          font-semibold
                          leading-snug
                          text-foreground
                        "
                      >
                        {
                          concept.name
                        }
                      </h3>

                      <span
                        className="
                          mt-0.5
                          block
                          text-xs
                          text-muted-foreground
                        "
                      >
                        {
                          completed
                            ? 'Completado'
                            : pending
                              ? 'Verificando'
                              : locked
                                ? 'Bloqueado'
                                : selected
                                  ? 'En curso'
                                  : 'Pendiente'
                        }
                      </span>
                    </span>

                    {
                      unavailable
                        ? (
                          <LockKeyhole
                            className="
                              size-4
                              text-muted-foreground
                            "
                            aria-hidden="true"
                          />
                        )
                        : (
                          <ChevronRight
                            className="
                              size-4
                              text-muted-foreground
                              transition-transform
                              group-hover:translate-x-0.5
                            "
                            aria-hidden="true"
                          />
                        )
                    }
                  </button>
                </li>
              );
            },
          )}
        </ol>

        <ChapterProgress
          concepts={
            concepts
          }
          states={
            learningStates
          }
        />
      </aside>

      <div
        className="
          min-w-0
        "
      >
                <nav
          aria-label="Ruta de navegación"
          className="
            mb-3
            flex
            min-w-0
            items-center
            gap-1.5
            overflow-hidden
            px-1
            text-xs
            text-muted-foreground
          "
        >
          <span>Entrenar</span>

          <ChevronRight
            className="size-3.5 shrink-0 opacity-60"
            aria-hidden="true"
          />

          <span className="truncate">
            {technologyName}
          </span>

          <ChevronRight
            className="size-3.5 shrink-0 opacity-60"
            aria-hidden="true"
          />

          <span
            className="
              truncate
              font-medium
              text-foreground
            "
          >
            {topicName}
          </span>
        </nav>

<header
          className="
            rounded-[1.15rem]
            border
            border-border/70
            bg-card/90
            px-5
            py-5
            shadow-sm
            sm:px-6
          "
        >
          <div
            className="
              flex
              min-w-0
              items-start
              gap-3
            "
          >
            <span
              className="
                flex
                size-10
                shrink-0
                items-center
                justify-center
                rounded-xl
                border
                border-primary/20
                bg-primary/10
                text-primary
              "
              aria-hidden="true"
            >
              <BookOpen
                className="size-5"
              />
            </span>

            <div
              className="min-w-0"
            >
              <p
                className="
                  text-xs
                  font-semibold
                  uppercase
                  tracking-[0.16em]
                  text-primary
                "
              >
                Concepto actual
              </p>

              <h2
                className="
                  mt-1
                  break-normal
                  whitespace-normal
                  text-2xl
                  font-bold
                  tracking-tight
                  text-foreground
                  sm:text-3xl
                "
              >
                {
                  selectedConcept.name
                }
              </h2>
            </div>
          </div>
          {selectedConceptIsStaged
            && selectedConcept.levels !== undefined
            && selectedConcept.levels.length > 0 ? (
              <LearningLevelProgress
                levels={selectedConcept.levels}
                states={selectedLevelStates}
                activeLevelId={activeLevelId}
              />
            ) : null}


          {
            activeLevelUnavailable
              ? null
              : selectedConceptIsStaged
                ? (
                  <StageNavigation
                    state={
                      levelState
                    }
                    selectedStage={
                      selectedStage
                    }
                    onSelect={
                      selectStage
                    }
                    pending={
                      canonicalPending
                    }
                  />
                )
                : selectedResult === undefined
                  ? (
                    <div
                      role="status"
                      aria-live="polite"
                      className="
                        mt-5
                        rounded-xl
                        border
                        border-border
                        bg-muted/30
                        px-4
                        py-3
                        text-sm
                        text-muted-foreground
                      "
                    >
                      Cargando ruta de aprendizaje…
                    </div>
                  )
                  : (
                    <div
                      className="
                        mt-5
                        flex
                        flex-wrap
                        items-center
                        gap-2
                      "
                      aria-label="Etapas del aprendizaje"
                    >
                  <LegacyStageBadge
                    active
                    label="Teoría"
                  />

                  <ArrowRight
                    className="
                      size-4
                      text-muted-foreground
                    "
                    aria-hidden="true"
                  />

                  <LegacyStageBadge
                    label="Práctica"
                  />
                </div>
              )
          }
        </header>

        {
          selectedResult
            ?.status
            === 'error'
            ? (
              <p
                role="alert"
                className="
                  mt-4
                  rounded-xl
                  border
                  border-destructive/40
                  bg-destructive/10
                  p-4
                  text-sm
                  text-destructive
                "
              >
                No pudimos cargar las sesiones de {
                  selectedConcept.name
                }. {
                  selectedResult.message
                }
              </p>
            )
            : null
        }

        {
          learningError
          !== undefined
            ? (
              <p
                role="alert"
                className="
                  mt-4
                  rounded-xl
                  border
                  border-destructive/40
                  bg-destructive/10
                  p-4
                  text-sm
                  text-destructive
                "
              >
                No pudimos verificar tu progreso de aprendizaje. {
                  learningError
                }
              </p>
            )
            : null
        }

        {
          selectedResult === undefined
            ? (
              <div
                role="status"
                aria-live="polite"
                className="
                  mt-5
                  rounded-2xl
                  border
                  border-border
                  bg-card
                  p-6
                  text-sm
                  text-muted-foreground
                  shadow-sm
                "
              >
                Cargando contenido de aprendizaje…
              </div>
            )
            : activeLevelUnavailable
              ? (
                <LearningLevelUnavailable
                  levelName={
                    selectedConcept.levels
                      ?.find(
                        level =>
                          level.id
                          === activeLevelId,
                      )
                      ?.name
                    ?? activeLevelId
                  }
                />
              )
              : selectedConceptIsStaged
                ? (
                  <StagedConceptContent
                concept={
                  selectedConcept
                }
                content={
                  levelContent
                }
                grouped={
                  grouped
                }
                state={
                  levelState
                }
                selectedStage={
                  selectedStage
                }
                pending={
                  canonicalPending
                }
                completingTheory={
                  completingTheoryId
                  === selectedConcept.id
                }
                onCompleteTheory={
                  async () => {
                    await onCompleteTheory(
                      selectedConcept.id,
                      activeLevelId,
                    );

                    setSelectedStage(
                      'quiz',
                    );
                  }
                }
                practiceResult={
                  filteredPracticeResult
                }
              />
            )
            : (
              <LegacyConceptContent
                concept={
                  selectedConcept
                }
                concepts={
                  concepts
                }
                results={
                  results
                }
              />
            )
        }
      </div>
    </section>
  );
}


function LearningLevelProgress({
  levels,
  states,
  activeLevelId,
}: {
  readonly levels: NonNullable<Concept['levels']>;
  readonly states: Readonly<
    Partial<
      Record<
        LearningLevelState['levelId'],
        LearningLevelState
      >
    >
  >;
  readonly activeLevelId: LearningLevelState['levelId'];
}) {
  const orderedLevels = [...levels].sort(
    (left, right) => left.position - right.position,
  );

  return (
    <nav
      aria-label="Niveles del concepto"
      className="
        mt-5
        rounded-xl
        border
        border-border/70
        bg-background/40
        p-2
      "
    >
      <ol
        className="
          grid
          min-w-0
          gap-2
          sm:grid-cols-3
        "
      >
        {orderedLevels.map((level, index) => {
          const state = states[level.id];

          const completed =
            state?.completed === true;

          const locked =
            state?.locked === true;

          const active =
            level.id === activeLevelId;

          const pending =
            state === undefined;

          const status =
            completed
              ? 'Completado'
              : pending
                ? 'Verificando'
                : active
                  ? 'En curso'
                  : locked
                    ? 'Bloqueado'
                    : 'Disponible';

          return (
            <li
              key={level.id}
              aria-current={
                active
                  ? 'step'
                  : undefined
              }
              data-learning-level={level.id}
              data-learning-level-state={
                completed
                  ? 'completed'
                  : pending
                    ? 'pending'
                    : active
                      ? 'active'
                      : locked
                        ? 'locked'
                        : 'available'
              }
              className={`
                relative
                min-w-0
                rounded-lg
                border
                px-3
                py-3
                ${
                  completed
                    ? 'border-success/25 bg-success/[0.06]'
                    : active
                      ? 'border-primary/30 bg-primary/[0.08]'
                      : 'border-border/70 bg-card/60'
                }
                ${
                  locked
                    ? 'opacity-60'
                    : ''
                }
              `}
            >
              <div
                className="
                  flex
                  min-w-0
                  items-start
                  gap-3
                "
              >
                <span
                  className={`
                    flex
                    size-8
                    shrink-0
                    items-center
                    justify-center
                    rounded-full
                    border
                    text-xs
                    font-bold
                    tabular-nums
                    ${
                      completed
                        ? 'border-success/30 bg-success/10 text-success'
                        : active
                          ? 'border-primary/35 bg-primary/10 text-primary'
                          : 'border-border bg-background text-muted-foreground'
                    }
                  `}
                  aria-hidden="true"
                >
                  {completed ? (
                    <Check className="size-4" />
                  ) : locked ? (
                    <LockKeyhole className="size-3.5" />
                  ) : (
                    index + 1
                  )}
                </span>

                <span className="min-w-0">
                  <span
                    className="
                      block
                      truncate
                      text-sm
                      font-semibold
                      text-foreground
                    "
                  >
                    {level.name}
                  </span>

                  <span
                    className={`
                      mt-0.5
                      block
                      text-xs
                      ${
                        active
                          ? 'font-medium text-primary'
                          : 'text-muted-foreground'
                      }
                    `}
                  >
                    {status}
                  </span>
                </span>
              </div>

              <p
                className="
                  mt-2
                  line-clamp-2
                  text-xs
                  leading-relaxed
                  text-muted-foreground
                "
              >
                {level.description}
              </p>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function LegacyConceptContent({
  concept,
  concepts,
  results,
}: {
  readonly concept:
    Concept;

  readonly concepts:
    readonly Concept[];

  readonly results:
    Readonly<
      Record<
        string,
        TopicSessionResult
      >
    >;
}) {
  return (
    <div
      className="
        mt-5
        grid
        min-w-0
        gap-5
        xl:grid-cols-[minmax(0,1fr)_minmax(24rem,0.72fr)]
      "
    >
      <section
        className="
          min-w-0
          rounded-2xl
          border
          border-border
          bg-card
          p-5
          shadow-sm
          sm:p-6
        "
      >
        <LearningContent
          content={
            concept.content
          }
          fallbackMarkdown={
            concept.contentMarkdown
          }
          conceptName={
            concept.name
          }
        />
      </section>

      <aside
        className="
          min-w-0
          xl:sticky
          xl:top-20
        "
      >
        <TopicSessionList
          concepts={
            [
              ...concepts,
            ]
          }
          results={
            results
          }
        />
      </aside>
    </div>
  );
}

function LearningLevelUnavailable({
  levelName,
}: {
  readonly levelName:
    string;
}) {
  return (
    <section
      className="
        mt-5
        rounded-2xl
        border
        border-border
        bg-card
        p-6
        shadow-sm
      "
    >
      <h3
        className="
          text-base
          font-semibold
          text-foreground
        "
      >
        Contenido de nivel no disponible
      </h3>

      <p
        className="
          mt-2
          text-sm
          leading-relaxed
          text-muted-foreground
        "
      >
        El nivel {levelName} todavía no tiene contenido publicado.
      </p>
    </section>
  );
}

function StagedConceptContent({
  concept,
  content,
  grouped,
  state,
  selectedStage,
  pending,
  completingTheory,
  onCompleteTheory,
  practiceResult,
}: {
  readonly concept:
    Concept;

  readonly content:
    Concept['content'];

  readonly grouped:
    LearningLevelSessionGroups;

  readonly state:
    LearningLevelState
    | undefined;

  readonly selectedStage:
    LearningStage;

  readonly pending:
    boolean;

  readonly completingTheory:
    boolean;

  readonly onCompleteTheory:
    () => Promise<void>;

  readonly practiceResult:
    TopicSessionResult;
}) {
  if (pending) {
    return (
      <div
        role="status"
        className="
          mt-5
          rounded-2xl
          border
          border-border
          bg-card
          p-6
          text-sm
          text-muted-foreground
        "
      >
        Verificando tu progreso…
      </div>
    );
  }

  if (
    state === undefined
    || state.locked
  ) {
    return (
      <section
        className="
          mt-5
          rounded-2xl
          border
          border-border
          bg-card
          p-6
          shadow-sm
        "
      >
        <div
          className="
            flex
            items-start
            gap-3
          "
        >
          <LockKeyhole
            className="
              mt-0.5
              size-5
              shrink-0
              text-muted-foreground
            "
            aria-hidden="true"
          />

          <div>
            <h3
              className="
                text-base
                font-semibold
                text-foreground
              "
            >
              Concepto bloqueado
            </h3>

            <p
              className="
                mt-1
                text-sm
                leading-relaxed
                text-muted-foreground
              "
            >
              Completa el concepto anterior para continuar.
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (
    selectedStage
    === 'theory'
  ) {
    return (
      <section
        className="
          mt-5
          min-w-0
          rounded-2xl
          border
          border-border
          bg-card
          p-5
          shadow-sm
          sm:p-6
        "
      >
        <LearningContent
          content={
            content
          }
          fallbackMarkdown={
            concept.contentMarkdown
          }
          conceptName={
            concept.name
          }
        />

        {
          state.stages.theory
            .status
          !== 'completed'
            ? (
              <div
                className="
                  mt-7
                  flex
                  justify-end
                  border-t
                  border-border
                  pt-5
                "
              >
                <button
                  type="button"
                  disabled={
                    completingTheory
                  }
                  onClick={
                    () => {
                      void onCompleteTheory();
                    }
                  }
                  className="
                    inline-flex
                    min-h-11
                    items-center
                    justify-center
                    gap-2
                    rounded-xl
                    bg-primary
                    px-5
                    py-2.5
                    text-sm
                    font-semibold
                    text-primary-foreground
                    transition-colors
                    hover:bg-primary/90
                    focus-visible:outline-none
                    focus-visible:ring-2
                    focus-visible:ring-ring
                    focus-visible:ring-offset-2
                    disabled:pointer-events-none
                    disabled:opacity-50
                  "
                >
                  {
                    completingTheory
                      ? 'Guardando…'
                      : 'He entendido esto'
                  }

                  <ArrowRight
                    className="size-4"
                    aria-hidden="true"
                  />
                </button>
              </div>
            )
            : null
        }
      </section>
    );
  }

  if (
    selectedStage
    === 'quiz'
  ) {
    return (
      <StageSessionPanel
        eyebrow="Test"
        title="Comprueba lo aprendido"
        description="Supera el test para desbloquear la práctica."
        icon={
          FileQuestion
        }
        session={
          grouped.quiz
        }
        locked={
          state.stages.quiz
            .status
          === 'locked'
        }
        actionLabel="Empezar test"
      />
    );
  }

  if (
    selectedStage
    === 'practice'
  ) {
    if (
      state.stages.practice
        .status
      === 'locked'
    ) {
      return (
        <LockedStage
          title="Práctica bloqueada"
          description="Primero debes superar el test."
        />
      );
    }

    return (
      <div
        className="
          mt-5
          min-w-0
        "
      >
        <TopicSessionList
          concepts={[
            concept,
          ]}
          results={{
            [concept.id]:
              practiceResult,
          }}
        />
      </div>
    );
  }

  return (
    <StageSessionPanel
      eyebrow="Checkpoint"
      title="Demuestra que dominas este nivel"
      description="Completa correctamente todo el checkpoint para superar este nivel."
      icon={
        Flag
      }
      session={
        grouped.checkpoint
      }
      locked={
        state.stages.checkpoint
          .status
        === 'locked'
      }
      actionLabel="Empezar checkpoint"
    />
  );
}

function StageNavigation({
  state,
  selectedStage,
  onSelect,
  pending,
}: {
  readonly state:
    LearningStageState
    | undefined;

  readonly selectedStage:
    LearningStage;

  readonly onSelect:
    (
      stage:
        LearningStage,
    ) => void;

  readonly pending:
    boolean;
}) {
  return (
    <nav
      aria-label="Etapas del aprendizaje"
      className="
        mt-6
        grid
        gap-2
        border-t
        border-border/60
        pt-5
        sm:grid-cols-4
      "
    >
      {STAGES.map(
        (
          stage,
          index,
        ) => {
          const status:
            LearningStageStatus =
              state?.stages[
                stage.id
              ].status
              ?? 'locked';

          const selected =
            stage.id
            === selectedStage;

          const disabled =
            pending
            || state
              === undefined
            || !canOpenLearningStage(
              state,
              stage.id,
            );

          const statusLabel =
            pending
            || state === undefined
              ? 'Verificando'
              : status === 'completed'
                ? 'Completado'
                : status === 'locked'
                  ? 'Bloqueado'
                  : selected
                    ? 'Actual'
                    : 'Disponible';

          return (
            <button
              key={stage.id}
              type="button"
              disabled={disabled}
              onClick={
                () =>
                  onSelect(
                    stage.id,
                  )
              }
              aria-current={
                selected
                  ? 'step'
                  : undefined
              }
              data-learning-stage={
                stage.id
              }
              data-learning-stage-status={
                status
              }
              className={`
                relative
                flex
                min-w-0
                items-center
                gap-2.5
                rounded-xl
                border
                px-3
                py-3
                text-left
                transition-[border-color,background-color,opacity]
                ${
                  selected
                    ? 'border-primary/40 bg-primary/10'
                    : status === 'completed'
                      ? 'border-success/25 bg-success/[0.05]'
                      : 'border-border bg-background/50'
                }
                ${
                  disabled
                    ? 'cursor-not-allowed opacity-50'
                    : 'hover:border-primary/30 hover:bg-muted/50'
                }
              `}
            >
              <StageIcon
                status={status}
                index={index}
              />

              <span className="min-w-0 flex-1">
                <span
                  className="
                    block
                    text-[0.66rem]
                    font-semibold
                    uppercase
                    tracking-[0.12em]
                    text-muted-foreground
                  "
                >
                  Paso {index + 1}
                </span>

                <span
                  className="
                    mt-0.5
                    block
                    text-sm
                    font-semibold
                    text-foreground
                  "
                >
                  {stage.label}
                </span>

                <span
                  className={`
                    mt-1
                    block
                    text-[0.68rem]
                    font-medium
                    ${
                      status === 'completed'
                        ? 'text-success'
                        : selected
                          && status === 'available'
                          ? 'text-primary'
                          : 'text-muted-foreground'
                    }
                  `}
                >
                  {statusLabel}
                </span>
              </span>

              {index
                < STAGES.length - 1 ? (
                  <span
                    aria-hidden="true"
                    className="
                      pointer-events-none
                      absolute
                      -right-2
                      top-1/2
                      hidden
                      h-px
                      w-2
                      bg-border
                      sm:block
                    "
                  />
                ) : null}
            </button>
          );
        },
      )}
    </nav>
  );
}

function StageIcon({
  status,
  index,
}: {
  readonly status:
    LearningStageStatus;

  readonly index:
    number;
}) {
  if (
    status
    === 'completed'
  ) {
    return (
      <span
        className="
          flex
          size-8
          shrink-0
          items-center
          justify-center
          rounded-full
          bg-success/10
          text-success
        "
      >
        <CircleCheck
          className="size-4"
        />
      </span>
    );
  }

  if (
    status
    === 'locked'
  ) {
    return (
      <span
        className="
          flex
          size-8
          shrink-0
          items-center
          justify-center
          rounded-full
          bg-muted
          text-muted-foreground
        "
      >
        <LockKeyhole
          className="size-3.5"
        />
      </span>
    );
  }

  return (
    <span
      className="
        flex
        size-8
        shrink-0
        items-center
        justify-center
        rounded-full
        border
        border-primary/30
        bg-primary/10
        text-xs
        font-semibold
        text-primary
      "
    >
      {
        index + 1
      }
    </span>
  );
}

function StageSessionPanel({
  eyebrow,
  title,
  description,
  icon: Icon,
  session,
  locked,
  actionLabel,
}: {
  readonly eyebrow:
    string;

  readonly title:
    string;

  readonly description:
    string;

  readonly icon:
    typeof FileQuestion;

  readonly session:
    ExerciseSession | null;

  readonly locked:
    boolean;

  readonly actionLabel:
    string;
}) {
  if (locked) {
    return (
      <LockedStage
        title={`${eyebrow} bloqueado`}
        description={
          eyebrow
          === 'Test'
            ? 'Completa primero la teoría.'
            : 'Completa primero todas las prácticas requeridas.'
        }
      />
    );
  }

  return (
    <section
      className="
        mt-5
        rounded-2xl
        border
        border-border
        bg-card
        p-5
        shadow-sm
        sm:p-6
      "
    >
      <div
        className="
          flex
          items-start
          gap-3
        "
      >
        <span
          className="
            flex
            size-10
            shrink-0
            items-center
            justify-center
            rounded-xl
            border
            border-primary/20
            bg-primary/10
            text-primary
          "
        >
          <Icon
            className="size-5"
          />
        </span>

        <div
          className="min-w-0"
        >
          <p
            className="
              text-xs
              font-semibold
              uppercase
              tracking-[0.16em]
              text-primary
            "
          >
            {
              eyebrow
            }
          </p>

          <h3
            className="
              mt-1
              text-xl
              font-bold
              tracking-tight
              text-foreground
            "
          >
            {
              title
            }
          </h3>

          <p
            className="
              mt-2
              max-w-2xl
              text-sm
              leading-relaxed
              text-muted-foreground
            "
          >
            {
              description
            }
          </p>
        </div>
      </div>

      {
        session === null
          ? (
            <p
              className="
                mt-5
                rounded-xl
                border
                border-border
                bg-background/50
                p-4
                text-sm
                text-muted-foreground
              "
            >
              Esta etapa todavía no tiene contenido publicado.
            </p>
          )
          : (
            <div
              className="
                mt-5
                flex
                flex-col
                gap-4
                rounded-xl
                border
                border-border
                bg-background/50
                p-4
                sm:flex-row
                sm:items-center
                sm:justify-between
              "
            >
              <div
                className="min-w-0"
              >
                <p
                  className="
                    text-sm
                    font-semibold
                    text-foreground
                  "
                >
                  {
                    session.title
                  }
                </p>

                <p
                  className="
                    mt-1
                    text-xs
                    text-muted-foreground
                  "
                >
                  {
                    session.steps.length
                  } {
                    session.steps.length
                    === 1
                      ? 'ejercicio'
                      : 'ejercicios'
                  }
                </p>
              </div>

              <Link
                to={
                  `/practice/${session.id}`
                }
                className="
                  inline-flex
                  min-h-11
                  shrink-0
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  bg-primary
                  px-4
                  py-2.5
                  text-sm
                  font-semibold
                  text-primary-foreground
                  transition-colors
                  hover:bg-primary/90
                  focus-visible:outline-none
                  focus-visible:ring-2
                  focus-visible:ring-ring
                  focus-visible:ring-offset-2
                "
              >
                <PlayCircle
                  className="size-4"
                  aria-hidden="true"
                />

                {
                  actionLabel
                }
              </Link>
            </div>
          )
      }
    </section>
  );
}

function LockedStage({
  title,
  description,
}: {
  readonly title:
    string;

  readonly description:
    string;
}) {
  return (
    <section
      className="
        mt-5
        rounded-2xl
        border
        border-border
        bg-card
        p-6
        shadow-sm
      "
    >
      <div
        className="
          flex
          items-start
          gap-3
        "
      >
        <LockKeyhole
          className="
            mt-0.5
            size-5
            shrink-0
            text-muted-foreground
          "
        />

        <div>
          <h3
            className="
              text-base
              font-semibold
              text-foreground
            "
          >
            {
              title
            }
          </h3>

          <p
            className="
              mt-1
              text-sm
              leading-relaxed
              text-muted-foreground
            "
          >
            {
              description
            }
          </p>
        </div>
      </div>
    </section>
  );
}

function LegacyStageBadge({
  label,
  active = false,
}: {
  readonly label:
    string;

  readonly active?:
    boolean;
}) {
  return (
    <span
      className={`
        inline-flex
        items-center
        gap-2
        rounded-full
        border
        px-3
        py-1.5
        text-xs
        font-semibold
        ${
          active
            ? 'border-primary/30 bg-primary/10 text-primary'
            : 'border-border bg-background text-muted-foreground'
        }
      `}
    >
      <Circle
        className="size-2.5"
        fill={
          active
            ? 'currentColor'
            : 'none'
        }
      />

      {
        label
      }
    </span>
  );
}

function ChapterProgress({
  concepts,
  states,
}: {
  readonly concepts:
    readonly Concept[];

  readonly states:
    Readonly<
      Record<
        string,
        ConceptLearningState
      >
    >;
}) {
  const staged =
    concepts.filter(
      concept =>
        states[
          concept.id
        ] !== undefined,
    );

  if (
    staged.length === 0
  ) {
    return null;
  }

  const completed =
    staged.filter(
      concept =>
        states[
          concept.id
        ]?.completed,
    ).length;

  const percentage =
    staged.length === 0
      ? 0
      : Math.round(
          (
            completed
            / staged.length
          )
          * 100,
        );

  return (
    <div
      className="
        mt-4
        border-t
        border-border
        px-2
        pt-4
      "
    >
      <div
        className="
          flex
          items-center
          justify-between
          gap-3
          text-xs
        "
      >
        <span
          className="
            font-medium
            text-muted-foreground
          "
        >
          Progreso
        </span>

        <span
          className="
            font-semibold
            tabular-nums
            text-foreground
          "
        >
          {
            percentage
          }%
        </span>
      </div>

      <div
        className="
          mt-2
          h-1.5
          overflow-hidden
          rounded-full
          bg-muted
        "
      >
        <div
          className="
            h-full
            rounded-full
            bg-primary
            transition-[width]
          "
          style={{
            width:
              `${percentage}%`,
          }}
        />
      </div>

      <p
        className="
          mt-2
          text-[0.7rem]
          text-muted-foreground
        "
      >
        {
          completed
        } de {
          staged.length
        } completados
      </p>
    </div>
  );
}
