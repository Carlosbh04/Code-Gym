export const AUTHENTICATION_SCENARIOS = [
  'default',
  'main-flow',
  'dashboard',
  'review',
  'technology-results',
] as const;

export type AuthenticationScenario =
  (typeof AUTHENTICATION_SCENARIOS)[number];

export interface E2EAuthenticationState {
  readonly [scenarioKey: string]: string;
}

export function authenticationScenarioKey(
  projectName: string,
  scenario: AuthenticationScenario,
): string {
  return `${projectName}:${scenario}`;
}
