import { describe, expect, it } from "vitest";
import { DIAGNOSES, DRUG_CLASSES } from "./types";

// These must match the Postgres enums (§4); the pgTAP suite checks the DB side.
describe("shared enums", () => {
  it("drug classes match §4", () => {
    expect(DRUG_CLASSES).toEqual([
      "macrolide",
      "phenicol",
      "fluoroquinolone",
      "cephalosporin",
      "tetracycline",
      "vaccine_mlv_resp",
      "vaccine_intranasal",
      "vaccine_clostridial",
      "anthelmintic_ml",
      "anthelmintic_bz",
      "prostaglandin",
      "nsaid",
      "implant",
      "other",
    ]);
  });

  it("diagnoses match §4", () => {
    expect(DIAGNOSES).toEqual(["brd", "footrot", "pinkeye", "other"]);
  });
});
