import { listStories } from "@/server/content/public";

export default async function Home() {
  const { items } = await listStories();
  return (
    <div className="container-ink py-20">
      <h1 className="text-step-5">Inkinspire</h1>
      <p>{items.length} stories</p>
    </div>
  );
}
