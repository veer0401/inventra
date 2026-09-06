import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { LegalContentPage } from "./LegalContentPage";
import { AboutPage } from "./AboutPage";
import { cmsApi } from "../../services/cmsApi";

vi.mock("../../services/cmsApi", () => ({
  cmsApi: {
    getPublicPage: vi.fn(),
  },
}));

describe("Marketing & Legal Compliance Pages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders LegalContentPage for PRIVACY with default fallback content", async () => {
    vi.mocked(cmsApi.getPublicPage).mockResolvedValueOnce({
      pageKey: "PRIVACY",
      title: "Inventra Privacy Policy & Data Governance",
      subtitle: "Commitment to patient data privacy under DPDPA 2023",
      content: {
        lastUpdated: "September 2026",
        contactEmail: "privacy@inventra.in",
        grievanceOfficer: {
          name: "Arjun Sharma",
          designation: "Data Protection & Grievance Officer",
          email: "grievance@inventra.in",
          phone: "+91 80 4567 8905",
          address: "Inventra Cloud Tower, Indiranagar, Bengaluru",
        },
        sections: [
          {
            id: "commitment",
            title: "1. Patient Confidentiality & Medical Records",
            content: "We never monetize or harvest identifiable patient health records.",
          },
        ],
      },
      updatedAt: new Date().toISOString(),
    });

    render(
      <MemoryRouter initialEntries={["/privacy"]}>
        <LegalContentPage pageKey="PRIVACY" />
      </MemoryRouter>
    );

    expect(await screen.findByText("Inventra Privacy Policy & Data Governance")).toBeInTheDocument();
    expect(screen.getByText("1. Patient Confidentiality & Medical Records")).toBeInTheDocument();
    expect(screen.getByText("Arjun Sharma")).toBeInTheDocument();
    expect(screen.getByText("grievance@inventra.in")).toBeInTheDocument();
  });

  it("renders AboutPage with direct contact numbers, email, and Google Space office locations", async () => {
    vi.mocked(cmsApi.getPublicPage).mockResolvedValueOnce({
      pageKey: "ABOUT",
      title: "Transforming Healthcare Logistics",
      subtitle: "Founded by pharmacists",
      content: {
        contactEmail: "support@inventra.in",
        contactPhone: "+91 80 4567 8900",
        supportHours: "Monday to Saturday: 8 AM - 10 PM IST",
        offices: [
          {
            name: "Bengaluru Technology & Innovation Space",
            badge: "Global Headquarters",
            address: "Level 4, Inventra Cloud Tower, Indiranagar, Bengaluru",
            city: "Bengaluru, Karnataka",
            googleSpaceUrl: "https://www.google.com/maps/search/?api=1&query=Inventra+Bengaluru",
            coordinates: "12.9716° N, 77.6412° E",
            phone: "+91 80 4567 8900",
            email: "bengaluru@inventra.in",
          },
        ],
      },
      updatedAt: new Date().toISOString(),
    });

    render(
      <MemoryRouter initialEntries={["/about"]}>
        <AboutPage />
      </MemoryRouter>
    );

    expect(await screen.findByText("Bengaluru Technology & Innovation Space")).toBeInTheDocument();
    expect(screen.getByText("support@inventra.in")).toBeInTheDocument();
    expect(screen.getAllByText("+91 80 4567 8900").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Open in Google Space / Maps")).toBeInTheDocument();
  });
});
