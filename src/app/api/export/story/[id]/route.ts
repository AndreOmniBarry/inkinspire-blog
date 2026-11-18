import { eq } from "drizzle-orm";
import { db, schema } from "@/server/db";
import { getSessionUser } from "@/server/auth/session";
import { can } from "@/server/auth/permissions";
import { toMarkdown, type Doc } from "@/lib/editor/render";
import { mediaResolverFor } from "@/server/content/derive";

/** Portability: every story downloads as Markdown or JSON, so the owner is never trapped. */
export async function GET(req: Request, ctx: RouteContext<"/api/export/story/[id]">) {
  const user = await getSessionUser();
  const { id } = await ctx.params;
  if (!user || !/^[0-9a-f-]{36}$/i.test(id)) return new Response("Not allowed", { status: 403 });
  const post = await db.query.posts.findFirst({ where: eq(schema.posts.id, id) });
  if (!post || !(can(user.role, "post.edit.any") || (post.createdById === user.id && can(user.role, "post.edit.own")))) return new Response("Not allowed", { status: 403 });
  const format = new URL(req.url).searchParams.get("format") === "json" ? "json" : "md";
  const name = (post.slug || "story").replace(/[^a-z0-9-]/g, "");
  if (format === "json") {
    const body = JSON.stringify({ title: post.title, subtitle: post.subtitle, slug: post.slug, excerpt: post.excerpt, visibility: post.visibility, status: post.status, publishedAt: post.publishedAt, content: post.contentJson }, null, 2);
    return new Response(body, { headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="${name}.json"` } });
  }
  const doc = post.contentJson as Doc;
  const md = `---\ntitle: ${JSON.stringify(post.title)}\n${post.subtitle ? `subtitle: ${JSON.stringify(post.subtitle)}\n` : ""}slug: ${post.slug}\nvisibility: ${post.visibility}\n${post.publishedAt ? `published: ${post.publishedAt.toISOString()}\n` : ""}---\n\n# ${post.title}\n\n${toMarkdown(doc, { resolveMedia: await mediaResolverFor(doc) })}`;
  return new Response(md, { headers: { "Content-Type": "text/markdown; charset=utf-8", "Content-Disposition": `attachment; filename="${name}.md"` } });
}
