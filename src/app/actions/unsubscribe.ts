"use server";

import { redirect } from "next/navigation";
import { unsubscribe } from "@/server/newsletter";

export async function unsubscribeAction(form: FormData) {
  const token = String(form.get("token") ?? "");
  const r = await unsubscribe(token);
  redirect(`/newsletter/unsubscribe?done=${r === "unsubscribed" ? "1" : "0"}`);
}
