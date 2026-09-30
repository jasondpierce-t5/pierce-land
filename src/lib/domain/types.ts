/** Enum values shared with the database (§4). Kept here so the domain layer has no DB imports. */

export const DRUG_CLASSES = [
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
] as const;
export type DrugClass = (typeof DRUG_CLASSES)[number];

export const DIAGNOSES = ["brd", "footrot", "pinkeye", "other"] as const;
export type Diagnosis = (typeof DIAGNOSES)[number];

/** Non-voided records have `voidedAt === null` (§6). */
export type VoidedAt = string | null;
