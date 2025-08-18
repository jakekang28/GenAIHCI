export const CP = {
  ROOM_START: 'room:start',
  POV_RESULTS_CONTINUE: 'pov:results:continue',
  AI_POV_FEEDBACK_CONTINUE: 'ai:pov_feedback:continue',
  HMW_RESULTS_CONTINUE: 'hmw:results:continue',
  INTERVIEW_RESULTS_CONTINUE: 'interview:results:continue',
} as const;


export const roundKey = (base: string, round: number) => `${base}:round-${round}`;