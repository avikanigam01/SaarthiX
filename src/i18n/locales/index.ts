import type { LangCode } from "../languages";
import { en, type Messages } from "./en";
import { bn } from "./bn";
import { gu } from "./gu";
import { hi } from "./hi";
import { kn } from "./kn";
import { ml } from "./ml";
import { mr } from "./mr";
import { pa } from "./pa";
import { ta } from "./ta";
import { te } from "./te";

export const MESSAGES: Record<LangCode, Messages> = { en, hi, bn, mr, ta, te, gu, kn, ml, pa };
export { en };
export type { MessageKey, Messages } from "./en";
