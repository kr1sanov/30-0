import { z } from "zod";
import { ALL_POSITIONS } from "./positions.ts";

const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .refine((s) => !/[\x00-\x1f<>]/.test(s));
export const playerIdentitySchema = z
  .object({
    firstName: text(100).nullable(),
    lastName: text(100).min(1),
    alias: text(50).nullable(),
    firstNameRu: text(100).nullable().optional(),
    lastNameRu: text(100).nullable().optional(),
    aliasRu: text(50).nullable().optional(),
    nationality: text(80).nullable(),
    birthYear: z
      .number()
      .int()
      .min(1900)
      .max(new Date().getUTCFullYear())
      .nullable(),
  })
  .strict();
export const playerCardSchema = z
  .object({
    rating: z.number().int().min(1).max(100),
    primeRating: z.number().int().min(0).max(100),
    primeSeason: text(50).nullable().default(null),
    mainPosition: z.enum(ALL_POSITIONS as [string, ...string[]]),
    otherPositions: text(255).nullable().default(null),
    nationality: text(80).nullable().default(null),
    age: z.number().int().min(14).max(60).nullable().default(null),
    shirtNumber: z.number().int().min(0).max(99).nullable().default(null),
    matches: z.number().int().min(0).max(1000).nullable().default(null),
    goals: z.number().int().min(0).max(1000).nullable().default(null),
    assists: z.number().int().min(0).max(1000).nullable().default(null),
    sourceName: text(255).nullable().default(null),
    sourcePosition: text(50).nullable().default(null),
    sourceUrl: z.string().url().max(1000).nullable().default(null),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.primeRating > 0 && v.primeRating < v.rating)
      ctx.addIssue({
        code: "custom",
        message: "Прайм-рейтинг не может быть ниже сезонного",
        path: ["primeRating"],
      });
    const positions = (v.otherPositions || "")
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    if (
      new Set(positions).size !== positions.length ||
      positions.some(
        (p) =>
          p === v.mainPosition ||
          !ALL_POSITIONS.includes(p as (typeof ALL_POSITIONS)[number]),
      )
    )
      ctx.addIssue({
        code: "custom",
        message: "Проверь дополнительные позиции",
        path: ["otherPositions"],
      });
  });
export {
  normalizePlayerSearch,
  playerDuplicateGroups,
} from "./playerDuplicates.ts";
