import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/utils/supabase";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  ColumnDef,
  SortingState,
} from "@tanstack/react-table";
import Papa from "papaparse";

interface RSVPRow {
  guestId: string;
  rsvpId: string;
  guestName: string;
  email: string;
  submittedAt: string;
  attending: boolean;
  dietaryRestrictions: string;
  dietaryNotes: string;
  accommodationNeeded: boolean;
  atitlanAttending: boolean;
  rsvpStatus: string;
}

export default function AdminRSVP() {
  const [rsvps, setRSVPs] = useState<RSVPRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sorting, setSorting] = useState<SortingState>([
    { id: "submittedAt", desc: true },
  ]);

  // Edit modal state
  const [editingRSVP, setEditingRSVP] = useState<RSVPRow | null>(null);
  const [editForm, setEditForm] = useState({
    attending: false,
    dietaryRestrictions: "",
    dietaryNotes: "",
    accommodationNeeded: false,
    atitlanAttending: false,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadRSVPs();
  }, []);

  const loadRSVPs = async () => {
    try {
      setLoading(true);

      const { data, error: queryError } = await supabase
        .from("rsvp_responses")
        .select("*, guests(id, first_name, last_name, email, invites(rsvp_submitted_at, rsvp_status))");

      if (queryError) throw queryError;

      // Filter to only show confirmed guests (where rsvp_status is 'confirmed')
      const confirmed = data?.filter((rsvp: any) =>
        rsvp.guests?.invites?.rsvp_status === 'confirmed' && rsvp.attending === true
      ) || [];

      const transformed: RSVPRow[] = confirmed.map((rsvp: any) => ({
        guestId: rsvp.guest_id,
        rsvpId: rsvp.id,
        guestName: `${rsvp.guests?.first_name || ""} ${rsvp.guests?.last_name || ""}`.trim(),
        email: rsvp.guests?.email || "",
        submittedAt: rsvp.guests?.invites?.rsvp_submitted_at || "",
        attending: rsvp.attending || false,
        dietaryRestrictions: Array.isArray(rsvp.dietary_restrictions)
          ? rsvp.dietary_restrictions.map((r: string) => r.replace(/_/g, " ")).join(", ")
          : "",
        dietaryNotes: rsvp.dietary_notes || "",
        accommodationNeeded: rsvp.accommodation_needed || false,
        atitlanAttending: rsvp.atitlan_attending || false,
        rsvpStatus: rsvp.guests?.invites?.rsvp_status || "",
      }));

      setRSVPs(transformed);
      setError("");
    } catch (err: any) {
      console.error("Error loading RSVPs:", err);
      setError(err.message || "Failed to load RSVPs");
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (rsvp: RSVPRow) => {
    setEditingRSVP(rsvp);
    setEditForm({
      attending: rsvp.attending,
      dietaryRestrictions: rsvp.dietaryRestrictions,
      dietaryNotes: rsvp.dietaryNotes,
      accommodationNeeded: rsvp.accommodationNeeded,
      atitlanAttending: rsvp.atitlanAttending,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingRSVP) return;

    setSaving(true);
    try {
      // Convert dietary restrictions back to array format
      const dietaryArray = editForm.dietaryRestrictions
        ? editForm.dietaryRestrictions.split(",").map(r => r.trim().toLowerCase().replace(/\s+/g, "_"))
        : [];

      const { error: updateError } = await supabase
        .from("rsvp_responses")
        .update({
          attending: editForm.attending,
          dietary_restrictions: dietaryArray,
          dietary_notes: editForm.dietaryNotes || null,
          accommodation_needed: editForm.accommodationNeeded,
          atitlan_attending: editForm.atitlanAttending,
        })
        .eq("id", editingRSVP.rsvpId);

      if (updateError) throw updateError;

      // Reload RSVPs
      await loadRSVPs();
      setEditingRSVP(null);
      setError("");
    } catch (err: any) {
      console.error("Error updating RSVP:", err);
      setError(err.message || "Failed to update RSVP");
    } finally {
      setSaving(false);
    }
  };

  const columns = useMemo<ColumnDef<RSVPRow>[]>(
    () => [
      {
        accessorKey: "guestName",
        header: "Guest Name",
      },
      {
        accessorKey: "email",
        header: "Email",
        cell: (info) => info.getValue() || "—",
      },
      {
        accessorKey: "submittedAt",
        header: "Submitted",
        cell: (info) => {
          const date = info.getValue() as string;
          return date ? new Date(date).toLocaleDateString() : "—";
        },
      },
      {
        accessorKey: "attending",
        header: "Attending",
        cell: (info) => (info.getValue() ? "✓ Yes" : "✗ No"),
      },
      {
        accessorKey: "dietaryRestrictions",
        header: "Dietary Restrictions",
        cell: (info) => info.getValue() || "None",
      },
      {
        accessorKey: "dietaryNotes",
        header: "Dietary Notes",
        cell: (info) => info.getValue() || "—",
      },
      {
        accessorKey: "accommodationNeeded",
        header: "Accommodation",
        cell: (info) => (info.getValue() ? "✓" : "—"),
      },
      {
        accessorKey: "atitlanAttending",
        header: "Atitlan",
        cell: (info) => (info.getValue() ? "✓" : "—"),
      },
      {
        id: "actions",
        header: "Actions",
        cell: (info) => {
          const rsvp = info.row.original;
          return (
            <button
              onClick={() => handleEditClick(rsvp)}
              className="action-btn edit-btn"
              title="Edit RSVP"
            >
              ✏️
            </button>
          );
        },
      },
    ],
    [handleEditClick]
  );

  const table = useReactTable({
    data: rsvps,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const exportToCSV = () => {
    const csvData = rsvps.map((rsvp) => ({
      "Guest Name": rsvp.guestName,
      Email: rsvp.email,
      "Submitted At": rsvp.submittedAt
        ? new Date(rsvp.submittedAt).toLocaleString()
        : "",
      Attending: rsvp.attending ? "Yes" : "No",
      "Dietary Restrictions": rsvp.dietaryRestrictions,
      "Dietary Notes": rsvp.dietaryNotes,
      "Accommodation Needed": rsvp.accommodationNeeded ? "Yes" : "No",
      "Atitlan Attending": rsvp.atitlanAttending ? "Yes" : "No",
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `rsvps-${new Date().toISOString().split("T")[0]}.csv`);
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
        <h1 className="admin-page-title">RSVP Tracking</h1>
        <div className="admin-error-box">{error}</div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="page-header">
        <h1 className="admin-page-title">RSVP Tracking</h1>
        <button onClick={exportToCSV} className="export-button">
          📥 Export to CSV
        </button>
      </div>

      <div className="results-count">Confirmed Attending: {rsvps.length}</div>

      <div className="table-container">
        <table className="admin-table">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    className={header.column.getCanSort() ? "sortable" : ""}
                  >
                    <div className="th-content">
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                      {{
                        asc: " ↑",
                        desc: " ↓",
                      }[header.column.getIsSorted() as string] ?? null}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editingRSVP && (
        <div className="modal-overlay" onClick={() => setEditingRSVP(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Edit RSVP - {editingRSVP.guestName}</h2>
            <div className="modal-form">
              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={editForm.attending}
                    onChange={(e) => setEditForm({ ...editForm, attending: e.target.checked })}
                  />
                  <span>Attending</span>
                </label>
              </div>
              <div className="form-group">
                <label>Dietary Restrictions (comma-separated)</label>
                <input
                  type="text"
                  value={editForm.dietaryRestrictions}
                  onChange={(e) => setEditForm({ ...editForm, dietaryRestrictions: e.target.value })}
                  className="form-input"
                  placeholder="vegetarian, gluten free, etc."
                />
              </div>
              <div className="form-group">
                <label>Dietary Notes</label>
                <textarea
                  value={editForm.dietaryNotes}
                  onChange={(e) => setEditForm({ ...editForm, dietaryNotes: e.target.value })}
                  className="form-textarea"
                  placeholder="Additional dietary information..."
                />
              </div>
              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={editForm.accommodationNeeded}
                    onChange={(e) => setEditForm({ ...editForm, accommodationNeeded: e.target.checked })}
                  />
                  <span>Accommodation Needed</span>
                </label>
              </div>
              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={editForm.atitlanAttending}
                    onChange={(e) => setEditForm({ ...editForm, atitlanAttending: e.target.checked })}
                  />
                  <span>Atitlan Attending</span>
                </label>
              </div>
            </div>
            <div className="modal-actions">
              <button
                onClick={() => setEditingRSVP(null)}
                className="modal-btn cancel-btn"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="modal-btn save-btn"
                disabled={saving}
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

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

        .results-count {
          font-size: 0.9rem;
          color: #666666;
          margin-bottom: 1rem;
        }

        .table-container {
          background: white;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          overflow-x: auto;
        }

        .admin-table {
          width: 100%;
          border-collapse: collapse;
        }

        .admin-table thead {
          background-color: #f5f5f5;
          border-bottom: 2px solid #e5e5e5;
        }

        .admin-table th {
          padding: 1rem;
          text-align: left;
          font-weight: 600;
          color: #333333;
          font-size: 0.9rem;
          white-space: nowrap;
        }

        .admin-table th.sortable {
          cursor: pointer;
          user-select: none;
        }

        .admin-table th.sortable:hover {
          background-color: #ececec;
        }

        .th-content {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .admin-table td {
          padding: 1rem;
          border-bottom: 1px solid #e5e5e5;
          font-size: 0.9rem;
          color: #333333;
        }

        .admin-table tbody tr:hover {
          background-color: #fafafa;
        }

        .action-btn {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 1.2rem;
          padding: 0.25rem;
          opacity: 0.7;
          transition: opacity 0.2s;
        }

        .action-btn:hover {
          opacity: 1;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: white;
          border-radius: 8px;
          padding: 2rem;
          max-width: 500px;
          width: 90%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .modal-title {
          font-size: 1.5rem;
          font-weight: 600;
          margin: 0 0 1.5rem 0;
          font-family: "orpheuspro", serif;
        }

        .modal-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-group label {
          font-size: 0.9rem;
          font-weight: 500;
          color: #333;
          font-family: "orpheuspro", serif;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
        }

        .checkbox-label input[type="checkbox"] {
          width: 18px;
          height: 18px;
          cursor: pointer;
        }

        .form-input,
        .form-textarea {
          padding: 0.625rem;
          border: 1px solid #d5d5d5;
          border-radius: 4px;
          font-size: 0.9rem;
          font-family: "orpheuspro", serif;
        }

        .form-textarea {
          min-height: 80px;
          resize: vertical;
        }

        .form-input:focus,
        .form-textarea:focus {
          outline: none;
          border-color: #000000;
        }

        .modal-actions {
          display: flex;
          gap: 1rem;
          justify-content: flex-end;
        }

        .modal-btn {
          padding: 0.625rem 1.25rem;
          border: none;
          border-radius: 4px;
          font-size: 0.9rem;
          font-family: "orpheuspro", serif;
          font-weight: 500;
          cursor: pointer;
          transition: opacity 0.2s;
        }

        .modal-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .cancel-btn {
          background-color: #f5f5f5;
          color: #333;
        }

        .cancel-btn:hover:not(:disabled) {
          background-color: #e5e5e5;
        }

        .save-btn {
          background-color: #2e7d32;
          color: white;
        }

        .save-btn:hover:not(:disabled) {
          opacity: 0.85;
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
