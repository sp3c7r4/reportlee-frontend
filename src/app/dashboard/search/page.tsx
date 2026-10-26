import type { Metadata } from "next";
import { SearchPage } from "@/components/search/search-page";

export const metadata: Metadata = {
  title: "Search | Reportlee",
  description: "Find a Report, a person or a Space you can already open.",
};

export default function SearchRoute() {
  return <SearchPage />;
}
