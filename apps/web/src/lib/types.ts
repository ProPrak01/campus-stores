import type { AppState } from "@campus/shared";
export type Mutate = (fn: () => Promise<AppState>, msg?: string) => Promise<boolean>;
