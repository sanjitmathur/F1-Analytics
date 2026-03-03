import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import StatusBadge from "./StatusBadge";

describe("StatusBadge", () => {
  it("renders completed status", () => {
    render(<StatusBadge status="completed" />);
    expect(screen.getByText("Completed")).toBeInTheDocument();
  });

  it("renders pending status", () => {
    render(<StatusBadge status="pending" />);
    expect(screen.getByText("Pending")).toBeInTheDocument();
  });

  it("renders processing status", () => {
    render(<StatusBadge status="processing" />);
    expect(screen.getByText("Processing")).toBeInTheDocument();
  });

  it("renders failed status", () => {
    render(<StatusBadge status="failed" />);
    expect(screen.getByText("Failed")).toBeInTheDocument();
  });

  it("renders reprocessing status", () => {
    render(<StatusBadge status="reprocessing" />);
    expect(screen.getByText("Reprocessing")).toBeInTheDocument();
  });

  it("renders downloading status", () => {
    render(<StatusBadge status="downloading" />);
    expect(screen.getByText("Downloading")).toBeInTheDocument();
  });

  it("defaults to pending style for unknown status", () => {
    render(<StatusBadge status="unknown_status" />);
    expect(screen.getByText("Pending")).toBeInTheDocument();
  });
});
