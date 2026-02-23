import {
  AbilityBuilder,
  createMongoAbility,
  MongoAbility,
  InferSubjects,
} from "@casl/ability";
import { User } from "@prisma/client";

// --- Define your subjects (models) ---
type Post = { id: string; authorId: string; published: boolean };

type Subjects = InferSubjects<Post | User> | "all";
type Actions =
  | "manage"
  | "read"
  | "create"
  | "update"
  | "delete"
  | "generate"
  | "approve";

export type AppAbility = MongoAbility<[Actions, Subjects]>;

// --- Ability factory ---
export function defineAbilityFor(user: User): AppAbility {
  const { can, cannot, build } = new AbilityBuilder<AppAbility>(
    createMongoAbility,
  );

  return build();
}
