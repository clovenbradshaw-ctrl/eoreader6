import { gap, isGap } from "../nul/index.js";

const hash = (str) => {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(h ^ str.charCodeAt(i), 16777619) >>> 0);
  }
  return h.toString(16).padStart(8, "0");
};

export const tick = (log, event) => {
  if (!event || typeof event !== "object") return gap("empty_material", { reason: "no event" });
  if (!event.event_type) return gap("undeclared", { what: "event_type" });

  const entry = Object.freeze({
    ...event,
    tick: log.tick,
    event_id: hash(`${event.event_type}:${log.tick}:${JSON.stringify(event)}`),
  });
  log.events.push(entry);
  log.tick++;
  return entry;
};

export const createLog = () => {
  const log = { events: [], tick: 0 };
  return log;
};

export const replay = (log) => log.events;

export const findByType = (log, eventType) =>
  log.events.filter((e) => e.event_type === eventType);


