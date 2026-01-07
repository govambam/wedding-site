import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/utils/supabase";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  ColumnDef,
  SortingState,
} from "@tanstack/react-table";
import { useToast } from "@/hooks/use-toast";

interface InviteRow {
  inviteId: number;
  guestNames: string;
  email: string;
  inviteCode: string;
  inviteSent: boolean;
  rsvpSubmitted: boolean;
}

export default function AdminInvites() {
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [selectedInvites, setSelectedInvites] = useState<Set<number>>(new Set());
  const [sendingInvites, setSendingInvites] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadInvites();
  }, []);

  const loadInvites = async () => {
    try {
      setLoading(true);

      const { data, error: queryError } = await supabase
        .from("invites")
        .select("id, invite_code, invite_sent, rsvp_submitted_at, guests(first_name, last_name, email)");

      if (queryError) throw queryError;

      const transformed: InviteRow[] = data?.map((invite: any) => {
        const guests = Array.isArray(invite.guests) ? invite.guests : [invite.guests];
        const guestNames = guests
          .map((g: any) => `${g?.first_name || ""} ${g?.last_name || ""}`.trim())
          .filter(Boolean)
          .join(", ");

        const primaryGuest = guests[0];
        const email = primaryGuest?.email || "";

        return {
          inviteId: invite.id,
          guestNames,
          email,
          inviteCode: invite.invite_code || "",
          inviteSent: invite.invite_sent || false,
          rsvpSubmitted: !!invite.rsvp_submitted_at,
        };
      }) || [];

      setInvites(transformed);
      setError("");
    } catch (err: any) {
      console.error("Error loading invites:", err);
      setError(err.message || "Failed to load invites");
    } finally {
      setLoading(false);
    }
  };

  const toggleInviteSelection = (inviteId: number) => {
    const newSelection = new Set(selectedInvites);
    if (newSelection.has(inviteId)) {
      newSelection.delete(inviteId);
    } else {
      newSelection.add(inviteId);
    }
    setSelectedInvites(newSelection);
  };

  const selectAll = () => {
    const allIds = invites.map((i) => i.inviteId);
    setSelectedInvites(new Set(allIds));
  };

  const deselectAll = () => {
    setSelectedInvites(new Set());
  };

  const sendInvites = async () => {
    if (selectedInvites.size === 0) {
      toast({
        title: "No invites selected",
        description: "Please select at least one invite to send.",
        variant: "destructive",
      });
      return;
    }

    setSendingInvites(true);

    try {
      // Call the edge function to send invites
      const { data, error } = await supabase.functions.invoke("send-invites", {
        body: { inviteIds: Array.from(selectedInvites) },
      });

      if (error) throw error;

      toast({
        title: "Invites sent",
        description: `Successfully sent ${selectedInvites.size} invite(s).`,
      });

      // Reload invites to reflect updated status
      await loadInvites();
      setSelectedInvites(new Set());
    } catch (err: any) {
      console.error("Error sending invites:", err);
      toast({
        title: "Failed to send invites",
        description: err.message || "An error occurred while sending invites.",
        variant: "destructive",
      });
    } finally {
      setSendingInvites(false);
    }
  };

  const columns = useMemo<ColumnDef<InviteRow>[]>(
    () => [
      {
        id: "select",
        header: () => (
          <input
            type="checkbox"
            checked={selectedInvites.size === invites.length && invites.length > 0}
            onChange={(e) => {
              if (e.target.checked) {
                selectAll();
              } else {
                deselectAll();
              }
            }}
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={selectedInvites.has(row.original.inviteId)}
            onChange={() => toggleInviteSelection(row.original.inviteId)}
          />
        ),
      },
      {
        accessorKey: "guestNames",
        header: "Guest(s)",
      },
      {
        accessorKey: "email",
        header: "Email",
        cell: (info) => info.getValue() || "—",
      },
      {
        accessorKey: "inviteCode",
        header: "Invite Code",
      },
      {
        accessorKey: "inviteSent",
        header: "Sent",
        cell: (info) => (info.getValue() ? "✓ Yes" : "✗ No"),
      },
      {
        accessorKey: "rsvpSubmitted",
        header: "RSVP",
        cell: (info) => (info.getValue() ? "✓" : "—"),
      },
    ],
    [selectedInvites, invites]
  );

  const table = useReactTable({
    data: invites,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

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
        <h1 className="admin-page-title">Send Invites</h1>
        <div className="admin-error-box">{error}</div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="page-header">
        <h1 className="admin-page-title">Send Invites</h1>
        <div className="action-buttons">
          <button
            onClick={sendInvites}
            disabled={selectedInvites.size === 0 || sendingInvites}
            className="send-button"
          >
            {sendingInvites ? "Sending..." : `Send ${selectedInvites.size} Invite${selectedInvites.size !== 1 ? "s" : ""}`}
          </button>
        </div>
      </div>

      <div className="results-count">
        {selectedInvites.size} of {invites.length} invites selected
      </div>

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

      <style>{`
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }

        .action-buttons {
          display: flex;
          gap: 1rem;
        }

        .send-button {
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

        .send-button:hover:not(:disabled) {
          opacity: 0.85;
        }

        .send-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
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

        @media (max-width: 768px) {
          .page-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }

          .action-buttons {
            width: 100%;
          }

          .send-button {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
