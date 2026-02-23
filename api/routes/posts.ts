import Elysia, { t } from "elysia";
import { caslPlugin, guard } from "../middlewares/authz";

const posts = [
  { id: "1", authorId: "user-1", published: true, title: "Hello World" },
  { id: "2", authorId: "user-2", published: false, title: "Draft Post" },
];

export const postsRoute = new Elysia({ prefix: "/posts" })
  .use(caslPlugin)

  // GET /posts — list published posts
  .get("/", () => {
    return posts;
  });
