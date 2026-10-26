import Link from "next/link";

export default function ConsoleWorkspacesIndex() {
  return (
    <div className="mx-auto w-full max-w-[760px] px-4 py-6">
      <h1 className="font-bold text-[20px] text-ink">Pick a Workspace</h1>
      <Link
        href="/super-admin"
        className="mt-2 inline-flex text-[12.5px] text-ink/60 underline"
      >
        Back to the console
      </Link>
    </div>
  );
}
