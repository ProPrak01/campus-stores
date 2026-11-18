import { useEffect, useState } from "react";
import type { AppState } from "@campus/shared";
import { api } from "./api";

export function App() {
  const [state, setState] = useState<AppState | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getState().then(setState).catch((e: Error) => setError(e.message));
  }, []);

  if (error) return <p role="alert">Could not reach the API: {error}</p>;
  if (!state) return <p>Loading…</p>;

  return (
    <main>
      <h1>Campus Stores</h1>
      <p>
        Boilerplate is running. {state.requests.length} requests, {state.assets.length} units,{" "}
        {state.loans.length} open loans.
      </p>
    </main>
  );
}
