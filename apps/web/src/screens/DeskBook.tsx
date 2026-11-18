import type { AppState } from "@campus/shared";

interface Props {
  state: AppState;
  mutate: (fn: () => Promise<AppState>, msg?: string) => Promise<void>;
  setStatus: (msg: string) => void;
}

/** Static club messages that appear at certain phases. */
function getClubMessages(phase: number): { time: string; author: string; body: string }[] {
  const msgs: { time: string; author: string; body: string }[] = [
    {
      time: "Friday · 3:20 pm",
      author: "Isha Rao · Film Society",
      body: "Kabir Sen is picking up our whole screening kit. Please issue it in his name. I'm setting up in the courtyard.",
    },
    {
      time: "Friday · 3:30 pm",
      author: "Tara Shah · Debate Union",
      body: "Our microphone stays with me overnight. I'll return it by 10 am Saturday.",
    },
  ];
  if (phase >= 1) {
    msgs.push({
      time: "Friday · 7:30 pm",
      author: "Kabir Sen · Film Society",
      body: "I brought the projector and speaker. Leela Das has our adapter. She'll be at the counter at 9 am tomorrow.",
    });
  }
  return msgs;
}

export function DeskBookScreen({ state }: Props) {
  const clubMessages = getClubMessages(state.phase);
  const allEntries = [
    ...clubMessages.map((m) => ({ ...m, isNote: false })),
    ...state.notes.map((n) => ({
      time: state.shifts[n.phase]?.time ?? "",
      author: "Counter handover",
      body: n.text,
      isNote: true,
    })),
  ].reverse();

  return (
    <div>
      <div className="sectionhead">
        <div>
          <h2>Desk book</h2>
          <small>Messages from clubs and notes for the next shift</small>
        </div>
      </div>
      {allEntries.map((entry, i) => (
        <article className="record" key={i}>
          <small>{entry.time}</small>
          <h3>{entry.author}</h3>
          <p>{entry.body}</p>
        </article>
      ))}
    </div>
  );
}
