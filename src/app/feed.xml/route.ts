import { listStories, getStory } from "@/server/content/public";
import { getSiteSettings } from "@/server/settings";
import { esc } from "@/lib/editor/render";

const base = (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

/**
 * RSS 2.0. Free stories carry their full text; premium stories carry only the public preview and a
 * link (the protected part never appears here).
 */
export async function GET() {
  const [settings, { items }] = await Promise.all([getSiteSettings(), listStories({ page: 1 })]);
  const full = await Promise.all(items.slice(0, 20).map((s) => getStory(s.slug)));
  const entries = full
    .filter((s): s is NonNullable<typeof s> => !!s)
    .map((s) => {
      const url = `${base}/stories/${s.slug}`;
      const absolutised = s.previewHtml.replace(/(src|href)="\//g, `$1="${base}/`);
      const content = s.visibility === "premium" ? `${absolutised}<p><a href="${url}">Continue reading on Inkinspire (members)</a></p>` : absolutised;
      return `<item>
  <title>${esc(s.title)}</title>
  <link>${url}</link>
  <guid isPermaLink="true">${url}</guid>
  <pubDate>${new Date(s.date).toUTCString()}</pubDate>
  ${s.authors.map((a) => `<dc:creator>${esc(a.name)}</dc:creator>`).join("")}
  ${s.category ? `<category>${esc(s.category.name)}</category>` : ""}
  <description>${esc(s.excerpt ?? s.subtitle ?? "")}</description>
  <content:encoded><![CDATA[${content.replace(/]]>/g, "]]&gt;")}]]></content:encoded>
</item>`;
    })
    .join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>${esc(settings.identity.name)}</title>
  <link>${base}</link>
  <atom:link href="${base}/feed.xml" rel="self" type="application/rss+xml" />
  <description>${esc(settings.identity.description)}</description>
  <language>en-gb</language>
  ${entries}
</channel>
</rss>`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, max-age=600, s-maxage=3600" } });
}
