import { describe, expect, it } from "vitest";
import { nextPersona, PERSONA_IDS, PERSONAS, toolPersona } from "./personas";

describe("personas", () => {
  it("maps tools to their area and the rest to the general assistant", () => {
    expect(toolPersona("list_bills")).toBe("finance");
    expect(toolPersona("create_calendar_event")).toBe("planner");
    expect(toolPersona("create_email_reply_draft")).toBe("creative");
    expect(toolPersona("get_weather_forecast")).toBe("wellness");
    expect(toolPersona("web_search")).toBe("general");
    expect(toolPersona("unknown_tool")).toBe("general");
  });

  it("lets the first area-specific tool of a reply decide", () => {
    let p = nextPersona(undefined, "get_current_datetime");
    expect(p).toBe("general");
    p = nextPersona(p, "list_bills");
    expect(p).toBe("finance");
    p = nextPersona(p, "list_calendar_events");
    expect(p).toBe("finance");
  });

  it("has a Turkish label for every persona", () => {
    for (const id of PERSONA_IDS) expect(PERSONAS[id].label).toMatch(/Asistan/);
  });
});
