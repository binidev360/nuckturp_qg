import { describe, it, expect } from "vitest";
import { slugify } from "./utils";

describe("slugify", () => {
  it("remove acentos e gera kebab-case", () => {
    expect(slugify("Aventura no Reino Élfico")).toBe("aventura-no-reino-elfico");
  });

  it("colapsa separadores e apara as pontas", () => {
    expect(slugify("  D&D 5e — Guia!  ")).toBe("d-d-5e-guia");
  });

  it("é idempotente sobre um slug já válido", () => {
    expect(slugify("dicionario-d20")).toBe("dicionario-d20");
  });
});
