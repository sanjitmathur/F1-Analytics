import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "./App";

describe("App", () => {
  it("renders the landing page by default", () => {
    render(<App />);
    // Landing page should have the launch button
    expect(screen.getByText(/enter simulator/i)).toBeInTheDocument();
  });

  it("renders the F1 Simulator brand link on inner pages", () => {
    window.history.pushState({}, "", "/dashboard");
    render(<App />);
    expect(screen.getByText("F1 Simulator")).toBeInTheDocument();
  });

  it("renders navigation links on inner pages", () => {
    window.history.pushState({}, "", "/dashboard");
    render(<App />);
    expect(screen.getByText("2026 Season")).toBeInTheDocument();
    expect(screen.getByText("Championship")).toBeInTheDocument();
    expect(screen.getByText("Head-to-Head")).toBeInTheDocument();
    expect(screen.getByText("Simulate")).toBeInTheDocument();
    expect(screen.getByText("Drivers")).toBeInTheDocument();
    expect(screen.getByText("Circuits")).toBeInTheDocument();
    expect(screen.getByText("Compare")).toBeInTheDocument();
  });
});
