"use client";

import {
  Download01Icon,
  RefreshIcon,
  Search01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useMemo, useState } from "react";
import { DataPage } from "@/components/dashboard/page-wrappers";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CapturedLead } from "@/data/leads";
import { filterLeads, leadsToCsv, listLeads } from "@/lib/leads";

/**
 * The internal leads list for Admins and Staff. It loads leads through `listLeads`,
 * offers a search over name, email, company and job title, filters by event and by
 * Space that combine, and exports the active filtered set to a CSV built by hand.
 *
 * It ships its own loading, load-error (with Retry), empty-Workspace and empty-filter
 * states. Every captured value is rendered through React text nodes only; there is no
 * `dangerouslySetInnerHTML` anywhere.
 */

const ALL = "__all__";

type Load =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; leads: CapturedLead[] };

export function LeadsScreen() {
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const [search, setSearch] = useState("");
  const [event, setEvent] = useState<string>(ALL);
  const [space, setSpace] = useState<string>(ALL);

  function fetchLeads() {
    setLoad({ status: "loading" });
    listLeads().then((result) => {
      setLoad(
        result.ok
          ? { status: "ready", leads: result.data }
          : { status: "error", message: result.message },
      );
    });
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: load once on mount.
  useEffect(() => {
    fetchLeads();
  }, []);

  const leads = load.status === "ready" ? load.leads : [];

  const events = useMemo(
    () => Array.from(new Set(leads.map((lead) => lead.eventName))).sort(),
    [leads],
  );
  const spaces = useMemo(
    () => Array.from(new Set(leads.map((lead) => lead.space))).sort(),
    [leads],
  );

  const filtered = useMemo(
    () =>
      filterLeads(leads, {
        search,
        event: event === ALL ? undefined : event,
        space: space === ALL ? undefined : space,
      }),
    [leads, search, event, space],
  );

  function handleExport() {
    const csv = leadsToCsv(filtered);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "captured-leads.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <DataPage className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-medium tracking-tight">
          Leads
        </h1>
        <p className="text-sm/relaxed text-muted-foreground">
          Prospects captured at your events.
        </p>
      </header>

      {load.status === "loading" ? <LoadingState /> : null}
      {load.status === "error" ? (
        <ErrorState message={load.message} onRetry={fetchLeads} />
      ) : null}

      {load.status === "ready" ? (
        leads.length === 0 ? (
          <EmptyWorkspace />
        ) : (
          <>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative w-full sm:max-w-xs">
                <HugeiconsIcon
                  icon={Search01Icon}
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, email, company, job title"
                  className="pl-9"
                  aria-label="Search leads"
                />
              </div>

              <Select
                value={event}
                onValueChange={(value) => setEvent(value as string)}
              >
                <SelectTrigger
                  className="w-full sm:w-52"
                  aria-label="Filter by event"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All events</SelectItem>
                  {events.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={space}
                onValueChange={(value) => setSpace(value as string)}
              >
                <SelectTrigger
                  className="w-full sm:w-44"
                  aria-label="Filter by Space"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All Spaces</SelectItem>
                  {spaces.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                type="button"
                variant="outline"
                onClick={handleExport}
                disabled={filtered.length === 0}
                className="sm:ml-auto"
              >
                <HugeiconsIcon icon={Download01Icon} />
                Export CSV
              </Button>
            </div>

            {filtered.length === 0 ? (
              <NoMatches />
            ) : (
              <LeadsTable leads={filtered} />
            )}
          </>
        )
      ) : null}
    </DataPage>
  );
}

function LeadsTable({ leads }: { leads: CapturedLead[] }) {
  return (
    <div className="rounded-2xl border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Job title</TableHead>
            <TableHead>Event</TableHead>
            <TableHead>Space</TableHead>
            <TableHead>Notes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead) => (
            <TableRow key={lead.id}>
              <TableCell className="font-medium">{lead.fullName}</TableCell>
              <TableCell>{lead.email ?? "None"}</TableCell>
              <TableCell>{lead.phone ?? "None"}</TableCell>
              <TableCell>{lead.company ?? "None"}</TableCell>
              <TableCell>{lead.jobTitle ?? "None"}</TableCell>
              <TableCell>{lead.eventName}</TableCell>
              <TableCell>{lead.space}</TableCell>
              <TableCell className="max-w-xs whitespace-normal text-muted-foreground">
                {lead.notes ?? "None"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border px-4 py-10 text-sm text-muted-foreground">
      <div className="size-4 animate-spin rounded-full border-2 border-muted border-t-foreground" />
      Loading leads...
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyTitle>We could not load the leads</EmptyTitle>
        <EmptyDescription>{message}</EmptyDescription>
      </EmptyHeader>
      <Button type="button" variant="outline" onClick={onRetry}>
        <HugeiconsIcon icon={RefreshIcon} />
        Retry
      </Button>
    </Empty>
  );
}

function EmptyWorkspace() {
  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <HugeiconsIcon icon={Search01Icon} />
        </EmptyMedia>
        <EmptyTitle>No leads captured yet</EmptyTitle>
        <EmptyDescription>
          Leads captured from an event booth will show up here.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

function NoMatches() {
  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyTitle>No leads match</EmptyTitle>
        <EmptyDescription>
          Try a different search or clear the filters.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
