import type { Permission } from "./permissions";

/** Which permission each Studio area needs. Used by the proxy (early 403) and mirrored in each page. */
const rules: Array<[RegExp, Permission]> = [
  [/^\/studio\/(write|preview)(\/|$)/, "post.create"],
  [/^\/studio\/library(\/|$)/, "post.create"],
  [/^\/studio\/calendar(\/|$)/, "post.publish"],
  [/^\/studio\/media(\/|$)/, "media.upload"],
  [/^\/studio\/taxonomy(\/|$)/, "taxonomy.manage"],
  [/^\/studio\/authors(\/|$)/, "author.manage"],
  [/^\/studio\/homepage(\/|$)/, "homepage.manage"],
  [/^\/studio\/pages(\/|$)/, "page.manage"],
  [/^\/studio\/inbox(\/|$)/, "reader.view"],
  [/^\/studio\/settings(\/|$)/, "settings.manage"],
  [/^\/studio\/audit(\/|$)/, "audit.view"],
];

export function permissionFor(pathname: string): Permission {
  return rules.find(([re]) => re.test(pathname))?.[1] ?? "studio.access";
}
