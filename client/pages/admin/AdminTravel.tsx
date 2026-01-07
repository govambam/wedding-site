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
import Papa from "papaparse";

interface TravelRow {
  guestName: string;
  email: string;
  arrivalDate: string;
  arrivalTime: string;
  arrivalAirline: string;
  arrivalFlightNumber: string;
  departureDate: string;
  departureTime: string;
  departureAirline: string;
  departureFlightNumber: string;
  needsTransfer: boolean;
  notes: string;
}

export default function AdminTravel() {
  const [travel, setTravel] = useState<TravelRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sorting, setSorting] = useState<SortingState>([
    { id: "arrivalDate", desc: false },
  ]);
  const [transferFilter, setTransferFilter] = useState("all");

  useEffect(() => {
    loadTravel();
  }, []);

  const loadTravel = async () => {
    try {
      setLoading(true);

      const { data, error: queryError } = await supabase
        .from("travel_details")
        .select("*, guests(first_name, last_name, email)");

      if (queryError) throw queryError;

      const transformed: TravelRow[] = data?.map((travel: any) => ({
        guestName: `${travel.guests?.first_name || ""} ${travel.guests?.last_name || ""}`.trim(),
        email: travel.guests?.email || "",
        arrivalDate: travel.arrival_date || "",
        arrivalTime: travel.arrival_time || "",
        arrivalAirline: travel.arrival_airline || "",
        arrivalFlightNumber: travel.arrival_flight_number || "",
        departureDate: travel.departure_date || "",
        departureTime: travel.departure_time || "",
        departureAirline: travel.departure_airline || "",
        departureFlightNumber: travel.departure_flight_number || "",
        needsTransfer: travel.needs_transfer || false,
        notes: travel.notes || "",
      })) || [];

      setTravel(transformed);
      setError("");
    } catch (err: any) {
      console.error("Error loading travel:", err);
      setError(err.message || "Failed to load travel details");
    } finally {
      setLoading(false);
    }
  };

  const columns = useMemo<ColumnDef<TravelRow>[]>(
    () => [
      {
        accessorKey: "guestName",
        header: "Guest Name",
      },
      {
        accessorKey: "arrivalDate",
        header: "Arrival Date",
        cell: (info) => {
          const date = info.getValue() as string;
          return date ? new Date(date).toLocaleDateString() : "—";
        },
      },
      {
        accessorKey: "arrivalTime",
        header: "Arrival Time",
        cell: (info) => info.getValue() || "—",
      },
      {
        accessorKey: "arrivalAirline",
        header: "Airline",
        cell: (info) => info.getValue() || "—",
      },
      {
        accessorKey: "arrivalFlightNumber",
        header: "Flight #",
        cell: (info) => info.getValue() || "—",
      },
      {
        accessorKey: "departureDate",
        header: "Departure Date",
        cell: (info) => {
          const date = info.getValue() as string;
          return date ? new Date(date).toLocaleDateString() : "—";
        },
      },
      {
        accessorKey: "needsTransfer",
        header: "Transfer",
        cell: (info) => (info.getValue() ? "✓ Yes" : "—"),
      },
      {
        accessorKey: "notes",
        header: "Notes",
        cell: (info) => info.getValue() || "—",
      },
    ],
    []
  );

  const filteredData = useMemo(() => {
    if (transferFilter === "all") return travel;
    const needsTransfer = transferFilter === "yes";
    return travel.filter((t) => t.needsTransfer === needsTransfer);
  }, [travel, transferFilter]);

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
    const csvData = filteredData.map((t) => ({
      "Guest Name": t.guestName,
      Email: t.email,
      "Arrival Date": t.arrivalDate,
      "Arrival Time": t.arrivalTime,
      "Arrival Airline": t.arrivalAirline,
      "Arrival Flight #": t.arrivalFlightNumber,
      "Departure Date": t.departureDate,
      "Departure Time": t.departureTime,
      "Departure Airline": t.departureAirline,
      "Departure Flight #": t.departureFlightNumber,
      "Needs Transfer": t.needsTransfer ? "Yes" : "No",
      Notes: t.notes,
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `travel-${new Date().toISOString().split("T")[0]}.csv`);
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
        <h1 className="admin-page-title">Travel Coordination</h1>
        <div className="admin-error-box">{error}</div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="page-header">
        <h1 className="admin-page-title">Travel Coordination</h1>
        <button onClick={exportToCSV} className="export-button">
          📥 Export to CSV
        </button>
      </div>

      <div className="filters-row">
        <select
          value={transferFilter}
          onChange={(e) => setTransferFilter(e.target.value)}
          className="filter-select"
        >
          <option value="all">All Guests</option>
          <option value="yes">Needs Transfer</option>
          <option value="no">No Transfer Needed</option>
        </select>
      </div>

      <div className="results-count">
        Showing {filteredData.length} of {travel.length} guests
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
          margin-bottom: 1rem;
        }

        .filter-select {
          padding: 0.625rem;
          border: 1px solid #d5d5d5;
          border-radius: 4px;
          font-size: 0.9rem;
          font-family: "orpheuspro", serif;
          min-width: 200px;
        }

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
