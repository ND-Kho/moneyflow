import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Brand from "./Brand";

describe("Brand", () => {
  it("renders the approved MoneyFlow wordmark and subtitle", () => {
    render(<Brand subtitle="Quản lý tài chính" />);

    expect(screen.getByLabelText("MoneyFlow")).toHaveTextContent("MONEYFLOW");
    expect(screen.getByText("Quản lý tài chính")).toBeInTheDocument();
  });
});
