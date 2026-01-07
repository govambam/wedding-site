import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/utils/supabase";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  FilterFn,
} from "@tanstack/react-table";
import Papa from "papaparse";

interface GuestRow {
  id: string;
  inviteId: string;
  firstName: string;
  lastName: string;
  email: string;
  inviteType: string;
  accommodationGroup: string;
  rsvpStatus: string;
  attending: boolean | null;
  invitedToAtitlan: boolean;
}

export default function AdminGuests() {
  const navigate = useNavigate();
  const [guests, setGuests] = useState<GuestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [accommodationFilter, setAccommodationFilter] = useState("all");
  const [attendingFilter, setAttendingFilter] = useState("all");

  // Edit modal state
  const [editingGuest, setEditingGuest] = useState<GuestRow | null>(null);
  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    inviteType: "",
    accommodationGroup: "",
  });
  const [saving, setSaving] = useState(false);
  const [inviteId, setInviteId] = useState<string | null>(null);

  // Delete confirmation state
  const [deletingGuest, setDeletingGuest] = useState<GuestRow | null>(null);

  useEffect(() => {
    loadGuests();
  }, []);

  const loadGuests = async () => {
    try {
      setLoading(true);

      // Fetch all guests with their invite data
      const { data: guestsData, error: guestsError } = await supabase
        .from("guests")
        .select("*, invites(*), rsvp_responses(*)");

      if (guestsError) throw guestsError;

      // Transform data
      const transformed: GuestRow[] = guestsData?.map((guest: any) => ({
        id: guest.id,
        inviteId: guest.invite_id || "",
        firstName: guest.first_name || "",
        lastName: guest.last_name || "",
        email: guest.email || "",
        inviteType: guest.invites?.invite_type || "",
        accommodationGroup: guest.invites?.accommodation_group || "",
        rsvpStatus: guest.invites?.rsvp_status || "pending",
        attending: guest.rsvp_responses?.[0]?.attending ?? null,
        invitedToAtitlan: guest.invites?.invited_to_atitlan || false,
      })) || [];

      setGuests(transformed);
      setError("");
    } catch (err: any) {
      console.error("Error loading guests:", err);
      setError(err.message || "Failed to load guests");
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (guest: GuestRow) => {
    setEditingGuest(guest);
    setInviteId(guest.inviteId);
    setEditForm({
      firstName: guest.firstName,
      lastName: guest.lastName,
      email: guest.email,
      inviteType: guest.inviteType,
      accommodationGroup: guest.accommodationGroup,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingGuest || !inviteId) return;

    setSaving(true);
    try {
      // Update guest information
      const { error: guestUpdateError } = await supabase
        .from("guests")
        .update({
          first_name: editForm.firstName,
          last_name: editForm.lastName,
          email: editForm.email || null,
        })
        .eq("id", editingGuest.id);

      if (guestUpdateError) throw guestUpdateError;

      // Update invite information
      const { error: inviteUpdateError } = await supabase
        .from("invites")
        .update({
          invite_type: editForm.inviteType,
          accommodation_group: editForm.accommodationGroup,
        })
        .eq("id", inviteId);

      if (inviteUpdateError) throw inviteUpdateError;

      // Reload guests
      await loadGuests();
      setEditingGuest(null);
      setInviteId(null);
      setError("");
    } catch (err: any) {
      console.error("Error updating guest:", err);
      setError(err.message || "Failed to update guest");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (guest: GuestRow) => {
    setDeletingGuest(guest);
  };

  const handleConfirmDelete = async () => {
    if (!deletingGuest) return;

    setSaving(true);
    try {
      // Delete RSVP responses first
      await supabase
        .from("rsvp_responses")
        .delete()
        .eq("guest_id", deletingGuest.id);

      // Delete guest
      const { error: deleteError } = await supabase
        .from("guests")
        .delete()
        .eq("id", deletingGuest.id);

      if (deleteError) throw deleteError;

      // Reload guests
      await loadGuests();
      setDeletingGuest(null);
      setError("");
    } catch (err: any) {
      console.error("Error deleting guest:", err);
      setError(err.message || "Failed to delete guest");
    } finally {
      setSaving(false);
    }
  };

  const columns = useMemo<ColumnDef<GuestRow>[]>(
    () => [
      {
        accessorKey: "firstName",
        header: "First Name",
        cell: (info) => info.getValue(),
      },
      {
        accessorKey: "lastName",
        header: "Last Name",
        cell: (info) => info.getValue(),
      },
      {
        accessorKey: "email",
        header: "Email",
        cell: (info) => info.getValue() || "—",
      },
      {
        accessorKey: "inviteType",
        header: "Invite Type",
        cell: (info) => {
          const value = info.getValue() as string;
          return value ? value.charAt(0).toUpperCase() + value.slice(1) : "—";
        },
      },
      {
        accessorKey: "accommodationGroup",
        header: "Accommodation",
        cell: (info) => info.getValue() || "—",
      },
      {
        accessorKey: "rsvpStatus",
        header: "RSVP Status",
        cell: (info) => {
          const value = info.getValue() as string;
          return (
            <span className={`status-badge status-${value}`}>
              {value.charAt(0).toUpperCase() + value.slice(1)}
            </span>
          );
        },
      },
      {
        accessorKey: "attending",
        header: "Attending",
        cell: (info) => {
          const value = info.getValue();
          if (value === null) return "—";
          return value ? "✓ Yes" : "✗ No";
        },
      },
      {
        accessorKey: "invitedToAtitlan",
        header: "Atitlan",
        cell: (info) => (info.getValue() ? "✓" : "—"),
      },
      {
        id: "actions",
        header: "Actions",
        cell: (info) => {
          const guest = info.row.original;
          return (
            <div className="action-buttons">
              <button
                onClick={() => handleEditClick(guest)}
                className="action-btn edit-btn"
                title="Edit guest"
              >
                ✏️
              </button>
              <button
                onClick={() => handleDeleteClick(guest)}
                className="action-btn delete-btn"
                title="Delete guest"
              >
                🗑️
              </button>
            </div>
          );
        },
      },
    ],
    [handleEditClick, handleDeleteClick]
  );

  const customFilterFn: FilterFn<GuestRow> = (row, columnId, filterValue) => {
    const value = row.getValue(columnId);
    if (typeof value === "string") {
      return value.toLowerCase().includes(filterValue.toLowerCase());
    }
    return false;
  };

  const filteredData = useMemo(() => {
    let filtered = guests;

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((guest) => guest.rsvpStatus === statusFilter);
    }

    // Accommodation filter
    if (accommodationFilter !== "all") {
      filtered = filtered.filter(
        (guest) => guest.accommodationGroup === accommodationFilter
      );
    }

    // Attending filter
    if (attendingFilter !== "all") {
      const attendingValue = attendingFilter === "yes";
      filtered = filtered.filter((guest) => guest.attending === attendingValue);
    }

    // Global search
    if (globalFilter) {
      filtered = filtered.filter(
        (guest) =>
          guest.firstName.toLowerCase().includes(globalFilter.toLowerCase()) ||
          guest.lastName.toLowerCase().includes(globalFilter.toLowerCase()) ||
          guest.email?.toLowerCase().includes(globalFilter.toLowerCase())
      );
    }

    return filtered;
  }, [guests, statusFilter, accommodationFilter, attendingFilter, globalFilter]);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const exportToCSV = () => {
    const csvData = filteredData.map((guest) => ({
      "First Name": guest.firstName,
      "Last Name": guest.lastName,
      Email: guest.email,
      "Invite Type": guest.inviteType,
      "Accommodation Group": guest.accommodationGroup,
      "RSVP Status": guest.rsvpStatus,
      Attending: guest.attending === null ? "" : guest.attending ? "Yes" : "No",
      "Invited to Atitlan": guest.invitedToAtitlan ? "Yes" : "No",
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `guests-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Get unique accommodation groups for filter
  const accommodationGroups = useMemo(() => {
    const groups = new Set(guests.map((g) => g.accommodationGroup).filter(Boolean));
    return Array.from(groups);
  }, [guests]);

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
        <h1 className="admin-page-title">Guests</h1>
        <div className="admin-error-box">{error}</div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="page-header">
        <h1 className="admin-page-title">Guests</h1>
        <div className="header-actions">
          <button
            onClick={() => navigate("/admin/invitations/new")}
            className="new-invitation-button"
          >
            + New Invitation
          </button>
          <button onClick={exportToCSV} className="export-button">
            📥 Export to CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-row">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="filter-input search-input"
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="filter-select"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="declined">Declined</option>
          <option value="partial">Partial</option>
        </select>

        <select
          value={accommodationFilter}
          onChange={(e) => setAccommodationFilter(e.target.value)}
          className="filter-select"
        >
          <option value="all">All Accommodations</option>
          {accommodationGroups.map((group) => (
            <option key={group} value={group}>
              {group}
            </option>
          ))}
        </select>

        <select
          value={attendingFilter}
          onChange={(e) => setAttendingFilter(e.target.value)}
          className="filter-select"
        >
          <option value="all">All Attending Status</option>
          <option value="yes">Attending</option>
          <option value="no">Not Attending</option>
        </select>
      </div>

      <div className="results-count">
        Showing {filteredData.length} of {guests.length} guests
      </div>

      {/* Table */}
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
      {editingGuest && (
        <div className="modal-overlay" onClick={() => setEditingGuest(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Edit Guest</h2>
            <div className="modal-form">
              <div className="form-group">
                <label>First Name</label>
                <input
                  type="text"
                  value={editForm.firstName}
                  onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Last Name</label>
                <input
                  type="text"
                  value={editForm.lastName}
                  onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Invitation Type</label>
                <select
                  value={editForm.inviteType}
                  onChange={(e) => setEditForm({ ...editForm, inviteType: e.target.value })}
                  className="form-input"
                >
                  <option value="single">Single</option>
                  <option value="couple">Couple</option>
                  <option value="plusone">Plus One</option>
                </select>
              </div>
              <div className="form-group">
                <label>Accommodation Group</label>
                <select
                  value={editForm.accommodationGroup}
                  onChange={(e) => setEditForm({ ...editForm, accommodationGroup: e.target.value })}
                  className="form-input"
                >
                  <option value="bokeh">Villa Bokeh</option>
                  <option value="convento">El Convento Boutique Hotel</option>
                  <option value="santadomingo">Casa Santo Domingo</option>
                </select>
              </div>
            </div>
            <div className="modal-actions">
              <button
                onClick={() => setEditingGuest(null)}
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

      {/* Delete Confirmation Modal */}
      {deletingGuest && (
        <div className="modal-overlay" onClick={() => setDeletingGuest(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Delete Guest</h2>
            <p className="modal-text">
              Are you sure you want to delete <strong>{deletingGuest.firstName} {deletingGuest.lastName}</strong>?
              This action cannot be undone.
            </p>
            <div className="modal-actions">
              <button
                onClick={() => setDeletingGuest(null)}
                className="modal-btn cancel-btn"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="modal-btn delete-confirm-btn"
                disabled={saving}
              >
                {saving ? "Deleting..." : "Delete"}
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

        .header-actions {
          display: flex;
          gap: 1rem;
        }

        .new-invitation-button {
          padding: 0.75rem 1.5rem;
          background-color: #2e7d32;
          color: #ffffff;
          border: none;
          border-radius: 4px;
          font-size: 0.9rem;
          font-family: "orpheuspro", serif;
          font-weight: 500;
          cursor: pointer;
          transition: opacity 0.2s;
        }

        .new-invitation-button:hover {
          opacity: 0.85;
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

        .filters-row {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .filter-input,
        .filter-select {
          padding: 0.625rem;
          border: 1px solid #d5d5d5;
          border-radius: 4px;
          font-size: 0.9rem;
          font-family: "orpheuspro", serif;
        }

        .filter-input:focus,
        .filter-select:focus {
          outline: none;
          border-color: #000000;
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

        .status-badge {
          padding: 0.25rem 0.75rem;
          border-radius: 12px;
          font-size: 0.8rem;
          font-weight: 500;
          display: inline-block;
        }

        .status-pending {
          background-color: #fff3e0;
          color: #e65100;
        }

        .status-confirmed {
          background-color: #e8f5e9;
          color: #2e7d32;
        }

        .status-declined {
          background-color: #ffebee;
          color: #c62828;
        }

        .status-partial {
          background-color: #e3f2fd;
          color: #1565c0;
        }

        .action-buttons {
          display: flex;
          gap: 0.5rem;
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
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .modal-title {
          font-size: 1.5rem;
          font-weight: 600;
          margin: 0 0 1.5rem 0;
          font-family: "orpheuspro", serif;
        }

        .modal-text {
          font-size: 1rem;
          line-height: 1.5;
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

        .form-input,
        .form-input select {
          padding: 0.625rem;
          border: 1px solid #d5d5d5;
          border-radius: 4px;
          font-size: 0.9rem;
          font-family: "orpheuspro", serif;
          width: 100%;
        }

        .form-input:focus,
        select.form-input:focus {
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

        .delete-confirm-btn {
          background-color: #c62828;
          color: white;
        }

        .delete-confirm-btn:hover:not(:disabled) {
          opacity: 0.85;
        }

        @media (max-width: 768px) {
          .filters-row {
            grid-template-columns: 1fr;
          }

          .page-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }

          .header-actions {
            width: 100%;
            flex-direction: column;
          }

          .new-invitation-button,
          .export-button {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
