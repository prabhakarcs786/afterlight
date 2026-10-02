import { notFound } from "next/navigation";
import { z } from "zod";
import { objectKinds } from "@/lib/domain";
import { ObjectScene } from "@/components/object-scene";

export const metadata = { robots: { index: false, follow: false } };
export function generateStaticParams() { return objectKinds.map((kind) => ({ kind })); }

export default async function RenderObject({ params }: { params: Promise<{ kind: string }> }) {
  const parsed = z.enum(objectKinds).safeParse((await params).kind);
  if (!parsed.success) notFound();
  return <main className="asset-renderer"><ObjectScene kind={parsed.data} controls={false} renderMode /></main>;
}