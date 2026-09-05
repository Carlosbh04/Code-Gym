const SUCCESS_MESSAGES = [
  '¡Correcto!',
  '¡Muy bien!',
  '¡Buen trabajo!',
  '¡Perfecto!',
  '¡Excelente!',
];

export interface SuccessCelebration {
  eventId: string;
  message: string;
}

function indexFor(eventId: string) {
  return Array.from(eventId).reduce((total, character) => total + character.charCodeAt(0), 0) % SUCCESS_MESSAGES.length;
}

/** Da un mensaje estable a cada éxito canónico; la capa visual deduplica el evento. */
export function useSuccessCelebration(eventId: string | null): SuccessCelebration | null {
  return eventId === null ? null : { eventId, message: SUCCESS_MESSAGES[indexFor(eventId)] };
}
