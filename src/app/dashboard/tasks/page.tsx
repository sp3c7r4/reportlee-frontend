import type { Metadata } from "next";
import { TaskBoard } from "@/components/tasks/task-board";

export const metadata: Metadata = {
  title: "Tasks | Reportlee",
  description: "Follow-up tasks raised from review comments, with due dates and owners.",
};

export default function TasksPage() {
  return <TaskBoard />;
}
