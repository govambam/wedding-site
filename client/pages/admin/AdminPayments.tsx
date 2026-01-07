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

interface PaymentRow {
  guestNames: string;
  paymentType: string;
  amountCommitted: number;
  amountPaid: number;
  balance: number;
  paymentMethod: string;
  notes: string;
}

interface PaymentSummary {
  totalAccommodationCommitted: number;
  totalAtitlanCommitted: number;
  totalPaid: number;
  totalOutstanding: number;
}

export default function AdminPayments() {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    try {
      setLoading(true);

      const { data, error: queryError } = await supabase
        .from("payments")
        .select("*, invites(guests(first_name, last_name))");

      if (queryError) throw queryError;

      const transformed: PaymentRow[] = data?.map((payment: any) => {
        const guests = payment.invites?.guests || [];
        const guestNames = guests
          .map((g: any) => `${g.first_name || ""} ${g.last_name || ""}`.trim())
          .filter(Boolean)
          .join(", ");

        return {
          guestNames,
          paymentType: payment.payment_type || "",
          amountCommitted: payment.amount_committed || 0,
          amountPaid: payment.amount_paid || 0,
          balance: (payment.amount_committed || 0) - (payment.amount_paid || 0),
          paymentMethod: payment.payment_method || "",
          notes: payment.notes || "",
        };
      }) || [];

      setPayments(transformed);

      // Calculate summary
      const summaryData: PaymentSummary = {
        totalAccommodationCommitted: 0,
        totalAtitlanCommitted: 0,
        totalPaid: 0,
        totalOutstanding: 0,
      };

      transformed.forEach((p) => {
        if (p.paymentType === "accommodation") {
          summaryData.totalAccommodationCommitted += p.amountCommitted;
        } else if (p.paymentType === "atitlan") {
          summaryData.totalAtitlanCommitted += p.amountCommitted;
        }
        summaryData.totalPaid += p.amountPaid;
        summaryData.totalOutstanding += p.balance;
      });

      setSummary(summaryData);
      setError("");
    } catch (err: any) {
      console.error("Error loading payments:", err);
      setError(err.message || "Failed to load payments");
    } finally {
      setLoading(false);
    }
  };

  const columns = useMemo<ColumnDef<PaymentRow>[]>(
    () => [
      {
        accessorKey: "guestNames",
        header: "Guest(s)",
      },
      {
        accessorKey: "paymentType",
        header: "Type",
        cell: (info) => {
          const value = info.getValue() as string;
          return value ? value.charAt(0).toUpperCase() + value.slice(1) : "—";
        },
      },
      {
        accessorKey: "amountCommitted",
        header: "Committed",
        cell: (info) => `$${(info.getValue() as number).toFixed(2)}`,
      },
      {
        accessorKey: "amountPaid",
        header: "Paid",
        cell: (info) => `$${(info.getValue() as number).toFixed(2)}`,
      },
      {
        accessorKey: "balance",
        header: "Balance",
        cell: (info) => {
          const value = info.getValue() as number;
          return (
            <span className={value > 0 ? "balance-outstanding" : "balance-paid"}>
              ${value.toFixed(2)}
            </span>
          );
        },
      },
      {
        accessorKey: "paymentMethod",
        header: "Method",
        cell: (info) => info.getValue() || "—",
      },
      {
        accessorKey: "notes",
        header: "Notes",
        cell: (info) => info.getValue() || "—",
      },
    ],
    []
  );

  const table = useReactTable({
    data: payments,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const exportToCSV = () => {
    const csvData = payments.map((p) => ({
      "Guest(s)": p.guestNames,
      Type: p.paymentType,
      "Amount Committed": p.amountCommitted,
      "Amount Paid": p.amountPaid,
      Balance: p.balance,
      "Payment Method": p.paymentMethod,
      Notes: p.notes,
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `payments-${new Date().toISOString().split("T")[0]}.csv`);
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
        <h1 className="admin-page-title">Payment Tracking</h1>
        <div className="admin-error-box">{error}</div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="page-header">
        <h1 className="admin-page-title">Payment Tracking</h1>
        <button onClick={exportToCSV} className="export-button">
          📥 Export to CSV
        </button>
      </div>

      {summary && (
        <div className="summary-grid">
          <div className="summary-card">
            <div className="summary-label">Accommodation Committed</div>
            <div className="summary-value">${summary.totalAccommodationCommitted.toFixed(2)}</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">Atitlan Committed</div>
            <div className="summary-value">${summary.totalAtitlanCommitted.toFixed(2)}</div>
          </div>
          <div className="summary-card summary-paid">
            <div className="summary-label">Total Paid</div>
            <div className="summary-value">${summary.totalPaid.toFixed(2)}</div>
          </div>
          <div className="summary-card summary-outstanding">
            <div className="summary-label">Total Outstanding</div>
            <div className="summary-value">${summary.totalOutstanding.toFixed(2)}</div>
          </div>
        </div>
      )}

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

        .summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .summary-card {
          background: white;
          padding: 1.5rem;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          border-left: 4px solid #000000;
        }

        .summary-card.summary-paid {
          border-left-color: #2e7d32;
        }

        .summary-card.summary-outstanding {
          border-left-color: #c62828;
        }

        .summary-label {
          font-size: 0.9rem;
          color: #666666;
          margin-bottom: 0.5rem;
        }

        .summary-value {
          font-size: 1.75rem;
          font-weight: 600;
          color: #000000;
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

        .balance-outstanding {
          color: #c62828;
          font-weight: 600;
        }

        .balance-paid {
          color: #2e7d32;
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
