import {
  AbilityBuilder,
  createMongoAbility,
  MongoAbility,
  InferSubjects,
} from "@casl/ability";

// --- Define your subjects (models) ---
type Post = { id: string; authorId: string; published: boolean };
type User = { id: string; role: "admin" | "user" };

type Subjects = InferSubjects<Post | User> | "all";
type Actions = "create" | "read" | "update" | "delete" | "manage";

export type AppAbility = MongoAbility<[Actions, Subjects]>;

export interface AuthUser {
  id: string;
  role: "admin" | "user";
}

// --- Ability factory ---
export function defineAbilityFor(user: AuthUser | null): AppAbility {
  const { can, cannot, build } = new AbilityBuilder<AppAbility>(
    createMongoAbility,
  );

  return build();
}
