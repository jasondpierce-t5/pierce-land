import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { OUTPUT, renderFixtureSql } from "../../scripts/fixture-sql.mjs";

describe("supabase/tests/_fixtures.psql", () => {
  it("is regenerated from tests/fixtures/*.json (run `npm run gen:fixtures`)", () => {
    expect(fs.readFileSync(OUTPUT, "utf8").replaceAll("\r\n", "\n")).toBe(renderFixtureSql());
  });
});
