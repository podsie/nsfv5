import { expect, test } from "vitest";
import { hashOf, locationOf } from "./usePageLocation";

test("an empty address is the summary", () => {
  expect(locationOf("")).toEqual({
    tab: "summary",
    enrollmentId: null,
    sessionId: null,
  });
});

test("a session's address reads back as the same place", () => {
  const place = {
    tab: "students" as const,
    enrollmentId: "521",
    sessionId: "review 7/a",
  };
  expect(locationOf(hashOf(place))).toEqual(place);
});

test("a student's address has no session", () => {
  expect(
    hashOf({ tab: "students", enrollmentId: "521", sessionId: null }),
  ).toBe("#/students/521");
});
