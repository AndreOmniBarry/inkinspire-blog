/** `pnpm demo:remove`: deletes all demo content (same as Studio › Settings › Demo content). */
import "dotenv/config";
import { removeDemoContent } from "../src/server/demo";

const r = await removeDemoContent();
console.log(`Removed ${r.stories} demo stories and ${r.media} demo images. Your categories, pages and settings are untouched.`);
process.exit(0);
