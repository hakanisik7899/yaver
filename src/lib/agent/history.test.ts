import { describe, expect, it } from "vitest";
import { toDisplayTurns } from "./history";

describe("toDisplayTurns", () => {
  it("merges a tool loop into one assistant bubble and hides tool results", () => {
    const turns = toDisplayTurns([
      { role: "user", content: "Günümü özetle" },
      {
        role: "assistant",
        content: [
          { type: "thinking", thinking: "" },
          { type: "tool_use", name: "get_current_datetime", id: "1", input: {} },
          { type: "tool_use", name: "list_calendar_events", id: "2", input: {} },
        ],
      },
      { role: "user", content: [{ type: "tool_result", tool_use_id: "1", content: "{}" }] },
      { role: "assistant", content: [{ type: "text", text: "Bugün 2 toplantın var." }] },
      { role: "user", content: "Teşekkürler" },
      { role: "assistant", content: [{ type: "text", text: "Rica ederim!" }] },
    ]);

    expect(turns).toEqual([
      { role: "user", text: "Günümü özetle", tools: [] },
      { role: "assistant", text: "Bugün 2 toplantın var.", tools: ["Tarih kontrol edildi", "Takvim okundu"], persona: "planner" },
      { role: "user", text: "Teşekkürler", tools: [] },
      { role: "assistant", text: "Rica ederim!", tools: [] },
    ]);
  });

  it("handles plain-string assistant replies (refusal / step-limit messages)", () => {
    expect(
      toDisplayTurns([
        { role: "user", content: "x" },
        { role: "assistant", content: "Bu isteğe yardımcı olamıyorum." },
      ]),
    ).toEqual([
      { role: "user", text: "x", tools: [] },
      { role: "assistant", text: "Bu isteğe yardımcı olamıyorum.", tools: [] },
    ]);
  });

  it("joins text from several assistant messages and dedupes tool chips", () => {
    const [, a] = toDisplayTurns([
      { role: "user", content: "plan" },
      { role: "assistant", content: [{ type: "text", text: "Bakıyorum." }, { type: "tool_use", name: "list_tasks" }] },
      { role: "user", content: [{ type: "tool_result" }] },
      { role: "assistant", content: [{ type: "tool_use", name: "list_tasks" }] },
      { role: "user", content: [{ type: "tool_result" }] },
      { role: "assistant", content: [{ type: "text", text: "Hazır." }] },
    ]);
    expect(a).toEqual({ role: "assistant", text: "Bakıyorum.\n\nHazır.", tools: ["Görevler okundu"], persona: "planner" });
  });
});
