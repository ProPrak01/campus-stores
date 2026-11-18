import type { AppState } from "@campus/shared";

interface Props {
  state: AppState;
  mutate: (fn: () => Promise<AppState>, msg?: string) => Promise<void>;
  setStatus: (msg: string) => void;
}

export function RequestsScreen({ state }: Props) {
  return (
    <div>
      <div className="sectionhead">
        <div>
          <h2>Approved requests</h2>
          <small>Student Activities Office · {state.requests.length} approved forms</small>
        </div>
      </div>
      {state.requests.map((r) => (
        <div className="row" key={r.id}>
          <div>
            <strong>{r.event}</strong>
            <small>{r.id} · {r.club}</small>
          </div>
          <div>
            <button type="button">View form</button>
          </div>
        </div>
      ))}
    </div>
  );
}
