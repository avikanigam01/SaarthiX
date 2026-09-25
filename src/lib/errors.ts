/**
 * §44 — Never expose raw database errors to users.
 * Services throw ServiceError; the UI only ever shows `userMessage`.
 */
export class ServiceError extends Error {
  readonly userMessage: string;
  readonly code: string | undefined;

  constructor(userMessage: string, code?: string) {
    super(userMessage);
    this.name = "ServiceError";
    this.userMessage = userMessage;
    this.code = code;
  }
}

type ErrorLike = { code?: string; message?: string; status?: number } | null | undefined;

/** Known, safe-to-show database messages (raised on purpose by our own functions). */
const KNOWN_MESSAGES: Array<[RegExp, string]> = [
  [/stock cannot go negative/i, "This would make the stock negative. Please check the quantity."],
  [/exceed the configured maximum/i, "This would exceed the maximum stock level set for this medicine."],
  [/reason is required for stock/i, "Please give a reason for this stock adjustment."],
  [/quantity must be greater/i, "Enter a quantity greater than zero."],
  [/invalid referral status transition|no longer be re-routed|can no longer be modified/i, "This referral can no longer be modified."],
  [/scheduled_at is required/i, "Choose a date and time to schedule this referral."],
  [/already have an open visit/i, "You already have an open visit at this facility."],
  [/confirm availability before/i, "Please confirm availability before requesting a visit."],
  [/select a facility first/i, "Please select a facility first."],
  [/no longer available|not available/i, "This facility or service is no longer available."],
  [/reports no available service/i, "The selected facility currently reports no available service for this need."],
  [/visit date within the next 90 days/i, "Choose a visit date within the next 90 days."],
  [/cannot change the active state of your own/i, "You cannot deactivate your own account."],
  [/last super administrator/i, "The last super administrator cannot be removed."],
  [/only a super administrator/i, "Only a super administrator can do this."],
  [/cannot assign a role to your own/i, "You cannot assign a role to your own account."],
  [/invalid follow-up status transition|invalid visit status transition/i, "This status change is not allowed."],
  [/journey is no longer active|no longer be changed for this journey/i, "This journey can no longer be changed."],
];

export function toUserMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (error instanceof ServiceError) return error.userMessage;

  const e = (error ?? null) as ErrorLike;
  const message = typeof e?.message === "string" ? e.message : "";

  for (const [pattern, text] of KNOWN_MESSAGES) {
    if (pattern.test(message)) return text;
  }

  switch (e?.code) {
    case "42501":
      return "You are not authorized to perform this action.";
    case "23505":
      return "This record already exists.";
    case "23503":
      return "This record is linked to other information and cannot be changed.";
    case "23514":
    case "22003":
    case "22004":
    case "22007":
    case "22P02":
      return "Some of the information provided is not valid. Please check and try again.";
    case "55000":
      return "This action is not allowed in the current state.";
    case "P0002":
      return "We couldn't find that record.";
    case "PGRST301":
    case "PGRST303":
      return "Your session has expired. Please sign in again.";
    default:
      break;
  }

  if (/failed to fetch|network|load failed/i.test(message)) {
    return "We couldn't reach the server. Check your connection and try again.";
  }
  if (/jwt|token/i.test(message) && /expired|invalid/i.test(message)) {
    return "Your session has expired. Please sign in again.";
  }
  return fallback;
}

/** Logs technical detail during development only; never in production builds. */
export function devLog(scope: string, error: unknown): void {
  if (import.meta.env.DEV) {
    console.error(`[${scope}]`, error);
  }
}
