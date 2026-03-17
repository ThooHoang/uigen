import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolCallBadge } from "../ToolCallBadge";
import type { ToolInvocation } from "ai";

afterEach(() => {
  cleanup();
});

function makeTool(
  toolName: string,
  command: string,
  path: string,
  state: "call" | "result" = "result"
): ToolInvocation {
  const base = { toolCallId: "test", toolName, args: { command, path } };
  if (state === "result") {
    return { ...base, state: "result", result: "Success" };
  }
  return { ...base, state: "call" };
}

test("create command shows Creating <filename>", () => {
  render(<ToolCallBadge toolInvocation={makeTool("str_replace_editor", "create", "src/App.tsx")} />);
  expect(screen.getByText("Creating App.tsx")).toBeDefined();
});

test("str_replace command shows Editing <filename>", () => {
  render(<ToolCallBadge toolInvocation={makeTool("str_replace_editor", "str_replace", "src/components/Button.tsx")} />);
  expect(screen.getByText("Editing Button.tsx")).toBeDefined();
});

test("insert command shows Editing <filename>", () => {
  render(<ToolCallBadge toolInvocation={makeTool("str_replace_editor", "insert", "src/index.tsx")} />);
  expect(screen.getByText("Editing index.tsx")).toBeDefined();
});

test("view command shows Reading <filename>", () => {
  render(<ToolCallBadge toolInvocation={makeTool("str_replace_editor", "view", "src/index.tsx")} />);
  expect(screen.getByText("Reading index.tsx")).toBeDefined();
});

test("file_manager rename shows Renaming <filename>", () => {
  render(<ToolCallBadge toolInvocation={makeTool("file_manager", "rename", "src/Card.tsx")} />);
  expect(screen.getByText("Renaming Card.tsx")).toBeDefined();
});

test("file_manager delete shows Deleting <filename>", () => {
  render(<ToolCallBadge toolInvocation={makeTool("file_manager", "delete", "src/utils.ts")} />);
  expect(screen.getByText("Deleting utils.ts")).toBeDefined();
});

test("unknown tool falls back to raw tool name", () => {
  const tool: ToolInvocation = {
    toolCallId: "test",
    toolName: "unknown_tool",
    args: {},
    state: "result",
    result: "ok",
  };
  render(<ToolCallBadge toolInvocation={tool} />);
  expect(screen.getByText("unknown_tool")).toBeDefined();
});

test("pending state shows Loader2, no green dot", () => {
  const tool = makeTool("str_replace_editor", "create", "src/App.tsx", "call");
  const { container } = render(<ToolCallBadge toolInvocation={tool} />);
  expect(container.querySelector(".animate-spin")).toBeDefined();
  expect(container.querySelector(".bg-emerald-500")).toBeNull();
});

test("done state shows green dot, no Loader2", () => {
  const tool = makeTool("str_replace_editor", "create", "src/App.tsx", "result");
  const { container } = render(<ToolCallBadge toolInvocation={tool} />);
  expect(container.querySelector(".bg-emerald-500")).toBeDefined();
  expect(container.querySelector(".animate-spin")).toBeNull();
});
