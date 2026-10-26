"use client";

import { SearchPanel } from "@/components/search/search-panel";

export function SearchPage() {
  return (
    <div className="w-full px-4 py-6 sm:px-6">
      <header className="mb-4">
        <h1 className="font-bold text-[24px] text-ink tracking-[-0.03em]">
          Search
        </h1>
        <p className="mt-1 text-[13px] text-ink/60">
          Nothing appears here that you could not open through a normal screen.
        </p>
      </header>
      <div className="max-w-[720px]">
        <SearchPanel variant="page" />
      </div>
    </div>
  );
}
