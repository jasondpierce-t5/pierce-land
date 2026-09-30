import { describe, expect, it } from "vitest";
import {
  BEYOND_PROTOCOL_MESSAGE,
  metaphylaxisMessage,
  metaphylaxisStatus,
  pullNumber,
  sameClassWarnings,
  suggestTreatment,
  type AdministrationHistoryItem,
  type TreatmentStep,
} from "./treatment";

const VOIDED = "2026-10-10T12:00:00Z";

describe("pullNumber (§5.4)", () => {
  it("is 1 for an animal with no prior treatments", () => {
    expect(pullNumber([], "brd")).toBe(1);
  });

  it("counts only prior treatments with the same diagnosis", () => {
    const prior = [
      { diagnosis: "brd", voidedAt: null },
      { diagnosis: "footrot", voidedAt: null },
      { diagnosis: "brd", voidedAt: null },
    ] as const;
    expect(pullNumber(prior, "brd")).toBe(3);
    expect(pullNumber(prior, "footrot")).toBe(2);
    expect(pullNumber(prior, "pinkeye")).toBe(1);
  });

  it("ignores voided treatments", () => {
    const prior = [
      { diagnosis: "brd", voidedAt: VOIDED },
      { diagnosis: "brd", voidedAt: null },
    ] as const;
    expect(pullNumber(prior, "brd")).toBe(2);
  });
});

const steps: TreatmentStep[] = [
  { id: "s2", sequence: 2, productId: "flunixin", pullNumber: 1, conditional: "temp_gte_threshold" },
  { id: "s1", sequence: 1, productId: "florfenicol", pullNumber: 1, conditional: "none" },
  { id: "s3", sequence: 1, productId: "enrofloxacin", pullNumber: 2, conditional: "none" },
  { id: "p0", sequence: 1, productId: "unrelated", pullNumber: null, conditional: "none" },
];

describe("suggestTreatment (§5.4)", () => {
  it("pull 1 with fever suggests florfenicol then flunixin, in sequence order", () => {
    const s = suggestTreatment(steps, 1, 104.6, 104.0);
    expect(s.kind).toBe("protocol");
    if (s.kind !== "protocol") return;
    expect(s.steps.map((x) => x.productId)).toEqual(["florfenicol", "flunixin"]);
    expect(s.notIndicated).toEqual([]);
  });

  it("pull 1 below the NSAID threshold leaves flunixin out, but reports it", () => {
    const s = suggestTreatment(steps, 1, 103.8, 104.0);
    if (s.kind !== "protocol") throw new Error("expected protocol");
    expect(s.steps.map((x) => x.productId)).toEqual(["florfenicol"]);
    expect(s.notIndicated.map((x) => x.productId)).toEqual(["flunixin"]);
  });

  it("pull 2 suggests enrofloxacin", () => {
    const s = suggestTreatment(steps, 2, 105, 104.0);
    if (s.kind !== "protocol") throw new Error("expected protocol");
    expect(s.steps.map((x) => x.productId)).toEqual(["enrofloxacin"]);
  });

  it("pull 3 is beyond protocol and suggests nothing", () => {
    expect(suggestTreatment(steps, 3, 105, 104.0)).toEqual({
      kind: "beyond_protocol",
      pullNumber: 3,
      maxPullNumber: 2,
      message: BEYOND_PROTOCOL_MESSAGE,
    });
    expect(BEYOND_PROTOCOL_MESSAGE).toBe("Beyond protocol — call vet");
  });

  it("a protocol with no pull steps is beyond protocol from pull 1", () => {
    expect(suggestTreatment([], 1, 104, 104).kind).toBe("beyond_protocol");
  });
});

function admin(p: Partial<AdministrationHistoryItem>): AdministrationHistoryItem {
  return {
    productId: "tula",
    productName: "Tulathromycin",
    drugClass: "macrolide",
    isAntimicrobial: true,
    postMetaphylaxisIntervalDays: 7,
    givenOn: "2026-10-01",
    voidedAt: null,
    skipped: false,
    ...p,
  };
}

describe("metaphylaxisStatus (§5.4)", () => {
  const history = [admin({})];

  it.each([
    ["2026-10-01", 0, true],
    ["2026-10-07", 6, true],
    ["2026-10-08", 7, false],
    ["2026-10-09", 8, false],
  ] as const)("pull on %s is day %d → within interval: %s", (pullDate, day, within) => {
    expect(metaphylaxisStatus(history, pullDate)).toEqual({
      productName: "Tulathromycin",
      givenOn: "2026-10-01",
      intervalDays: 7,
      day,
      withinInterval: within,
    });
  });

  it("formats the blocking dialog text", () => {
    const s = metaphylaxisStatus(history, "2026-10-06");
    expect(s && metaphylaxisMessage(s)).toBe(
      "Within post-metaphylaxis interval (day 5 of 7). Per protocol, this may not be a treatment failure.",
    );
  });

  it("returns null when the animal had no metaphylaxis product", () => {
    expect(metaphylaxisStatus([admin({ postMetaphylaxisIntervalDays: null })], "2026-10-03")).toBeNull();
    expect(metaphylaxisStatus([], "2026-10-03")).toBeNull();
  });

  it("ignores voided and skipped doses, and doses after the pull date", () => {
    expect(metaphylaxisStatus([admin({ voidedAt: VOIDED })], "2026-10-03")).toBeNull();
    expect(metaphylaxisStatus([admin({ skipped: true })], "2026-10-03")).toBeNull();
    expect(metaphylaxisStatus([admin({ givenOn: "2026-10-05" })], "2026-10-03")).toBeNull();
  });

  it("uses the window still covering the pull date over a more recent, shorter one", () => {
    const s = metaphylaxisStatus(
      [
        admin({ productName: "Long", givenOn: "2026-10-01", postMetaphylaxisIntervalDays: 14 }),
        admin({ productName: "Short", givenOn: "2026-10-05", postMetaphylaxisIntervalDays: 3 }),
      ],
      "2026-10-10",
    );
    expect(s).toMatchObject({ productName: "Long", day: 9, withinInterval: true });
  });

  it("when two windows cover the pull date, reports the one that ends later", () => {
    const s = metaphylaxisStatus(
      [
        admin({ productName: "Ends 10-08", givenOn: "2026-10-01", postMetaphylaxisIntervalDays: 7 }),
        admin({ productName: "Ends 10-12", givenOn: "2026-10-02", postMetaphylaxisIntervalDays: 10 }),
        admin({ productName: "Ends 10-06", givenOn: "2026-10-03", postMetaphylaxisIntervalDays: 3 }),
      ],
      "2026-10-05",
    );
    expect(s).toMatchObject({ productName: "Ends 10-12", day: 3, intervalDays: 10 });
  });

  it("reports the most recent metaphylaxis dose when no window covers the pull date", () => {
    const s = metaphylaxisStatus(
      [
        admin({ productName: "Older", givenOn: "2026-09-01" }),
        admin({ productName: "Newer", givenOn: "2026-09-20" }),
      ],
      "2026-10-10",
    );
    expect(s).toMatchObject({ productName: "Newer", day: 20, withinInterval: false });
  });
});

describe("sameClassWarnings (§5.4)", () => {
  const suggested = [
    { productId: "tula2", productName: "Tulathromycin", drugClass: "macrolide", isAntimicrobial: true },
    { productId: "flor", productName: "Florfenicol", drugClass: "phenicol", isAntimicrobial: true },
    { productId: "flun", productName: "Flunixin", drugClass: "nsaid", isAntimicrobial: false },
  ] as const;

  it("warns when a suggested antimicrobial matches the class given in the last 14 days", () => {
    expect(sameClassWarnings(suggested, [admin({ givenOn: "2026-10-01" })], "2026-10-15")).toEqual([
      {
        productId: "tula2",
        drugClass: "macrolide",
        priorProductName: "Tulathromycin",
        priorGivenOn: "2026-10-01",
      },
    ]);
  });

  it("does not warn after 14 days", () => {
    expect(sameClassWarnings(suggested, [admin({ givenOn: "2026-10-01" })], "2026-10-16")).toEqual([]);
  });

  it("ignores voided, skipped, and non-antimicrobial history", () => {
    const history = [
      admin({ voidedAt: VOIDED }),
      admin({ skipped: true }),
      admin({ productName: "Flunixin", drugClass: "nsaid", isAntimicrobial: false }),
    ];
    expect(sameClassWarnings(suggested, history, "2026-10-05")).toEqual([]);
  });

  it("does not warn for non-antimicrobial suggestions even with a class match", () => {
    const history = [admin({ productName: "Flunixin", drugClass: "nsaid", isAntimicrobial: true })];
    expect(sameClassWarnings(suggested, history, "2026-10-05")).toEqual([]);
  });

  it("names the most recent prior product of that class", () => {
    const history = [
      admin({ productName: "Tula A", givenOn: "2026-10-02" }),
      admin({ productName: "Tula B", givenOn: "2026-10-09" }),
      admin({ productName: "Tula C", givenOn: "2026-10-12" }), // after asOf: ignored
    ];
    expect(sameClassWarnings(suggested, history, "2026-10-10")[0]?.priorProductName).toBe("Tula B");
  });
});
