import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase";
import Papa from "papaparse";

interface DietarySummary {
  restriction: string;
  count: number;
  guests: { name: string; notes: string }[];
}

export default function AdminDietary() {
  const [summary, setSummary] = useState<DietarySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadDietary();
  }, []);

  const loadDietary = async () => {
    try {
      setLoading(true);

      const { data, error: queryError } = await supabase
        .from("rsvp_responses")
        .select("dietary_restrictions, dietary_notes, guests(first_name, last_name)");

      if (queryError) throw queryError;

      // Aggregate dietary restrictions
      const restrictionMap: Record<string, { name: string; notes: string }[]> = {};

      data?.forEach((rsvp: any) => {
        const guestName = `${rsvp.guests?.first_name || ""} ${rsvp.guests?.last_name || ""}`.trim();
        const notes = rsvp.dietary_notes || "";

        if (Array.isArray(rsvp.dietary_restrictions)) {
          rsvp.dietary_restrictions.forEach((restriction: string) => {
            if (restriction && restriction !== "none") {
              if (!restrictionMap[restriction]) {
                restrictionMap[restriction] = [];
              }
              restrictionMap[restriction].push({ name: guestName, notes });
            }
          });
        }
      });

      const summaryData: DietarySummary[] = Object.entries(restrictionMap).map(
        ([restriction, guests]) => ({
          restriction: restriction.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
          count: guests.length,
          guests,
        })
      ).sort((a, b) => b.count - a.count);

      setSummary(summaryData);
      setError("");
    } catch (err: any) {
      console.error("Error loading dietary info:", err);
      setError(err.message || "Failed to load dietary restrictions");
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const csvData: any[] = [];

    summary.forEach((item) => {
      item.guests.forEach((guest) => {
        csvData.push({
          "Guest Name": guest.name,
          Restriction: item.restriction,
          Notes: guest.notes,
        });
      });
    });

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `dietary-${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="admin-page">
        <div className="admin-loading">
          <div className="admin-spinner"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-page">
        <h1 className="admin-page-title">Dietary Restrictions</h1>
        <div className="admin-error-box">{error}</div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="page-header">
        <h1 className="admin-page-title">Dietary Restrictions</h1>
        <button onClick={exportToCSV} className="export-button">
          📥 Export for Caterer
        </button>
      </div>

      <div className="dietary-summary">
        {summary.length === 0 && (
          <div className="empty-state">No dietary restrictions reported.</div>
        )}

        {summary.map((item) => (
          <div key={item.restriction} className="dietary-card">
            <div className="dietary-header">
              <h3 className="dietary-restriction">{item.restriction}</h3>
              <span className="dietary-count">{item.count} guest{item.count !== 1 ? "s" : ""}</span>
            </div>
            <div className="dietary-guests">
              {item.guests.map((guest, idx) => (
                <div key={idx} className="guest-item">
                  <span className="guest-name">{guest.name}</span>
                  {guest.notes && <span className="guest-notes">{guest.notes}</span>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }

        .export-button {
          padding: 0.75rem 1.5rem;
          background-color: #000000;
          color: #ffffff;
          border: none;
          border-radius: 4px;
          font-size: 0.9rem;
          font-family: "orpheuspro", serif;
          cursor: pointer;
          transition: opacity 0.2s;
        }

        .export-button:hover {
          opacity: 0.85;
        }

        .dietary-summary {
          display: grid;
          gap: 1.5rem;
        }

        .empty-state {
          padding: 3rem;
          text-align: center;
          background: white;
          border-radius: 8px;
          color: #666666;
        }

        .dietary-card {
          background: white;
          padding: 1.5rem;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .dietary-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          padding-bottom: 1rem;
          border-bottom: 2px solid #e5e5e5;
        }

        .dietary-restriction {
          font-size: 1.25rem;
          font-weight: 500;
          margin: 0;
          color: #000000;
        }

        .dietary-count {
          font-size: 0.9rem;
          color: #666666;
          background-color: #f5f5f5;
          padding: 0.25rem 0.75rem;
          border-radius: 12px;
        }

        .dietary-guests {
          display: grid;
          gap: 0.75rem;
        }

        .guest-item {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .guest-name {
          font-weight: 500;
          color: #333333;
        }

        .guest-notes {
          font-size: 0.85rem;
          color: #666666;
          font-style: italic;
        }

        @media (max-width: 768px) {
          .page-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }

          .export-button {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
