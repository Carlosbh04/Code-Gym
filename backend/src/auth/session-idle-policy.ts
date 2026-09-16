export interface SessionIdleState {
  readonly lastActivityAt: Date;
}

export function isSessionIdleExpired(
  session: SessionIdleState,
  now: Date,
  idleTimeoutSeconds: number,
): boolean {
  const idleDeadline =
    session.lastActivityAt.getTime()
    + idleTimeoutSeconds * 1_000;

  return idleDeadline <= now.getTime();
}
