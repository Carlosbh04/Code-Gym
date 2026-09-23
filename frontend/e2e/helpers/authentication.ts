export const AUTHENTICATION_SCENARIOS = [
  'clean',
  'arrays-access',
  'functions-access',
  'main-flow',
  'topic-recovery',
  'dashboard',
  'review-empty',
  'review-progress',
  'technology-results',
] as const;

export type AuthenticationScenario =
  (typeof AUTHENTICATION_SCENARIOS)[number];

export interface E2EAuthenticationState {
  readonly [scenarioKey: string]: string;
}

const TARGET_CONCEPT_BY_SCENARIO:
  Readonly<Record<AuthenticationScenario, string | null>> = {
    clean:
      null,
    'arrays-access':
      'js-array-iteration',
    'functions-access':
      'js-function-basics',
    'main-flow':
      'js-array-iteration',
    'topic-recovery':
      'js-array-iteration',
    dashboard:
      'js-array-iteration',
    'review-empty':
      null,
    'review-progress':
      'js-array-iteration',
    'technology-results':
      'js-array-iteration',
  };

export function authenticationScenarioTargetConcept(
  scenario: AuthenticationScenario,
): string | null {
  return TARGET_CONCEPT_BY_SCENARIO[
    scenario
  ];
}

export function authenticationScenarioKey(
  projectName: string,
  scenario: AuthenticationScenario,
): string {
  return `${projectName}:${scenario}`;
}
