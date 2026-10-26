import { ConsoleWorkspace } from "@/components/console/console-workspace";

/* @info - A console view depends on the visitor's session and on a local audit log, so it
   is never prerendered. */
export const instant = false;

export default async function ConsoleWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ConsoleWorkspace id={id} />;
}
