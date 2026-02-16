/**
 * TeacherPayoutHistory - Bottom section for Teacher Profile
 * Displays: List of payout requests and their status (like Fee History in StudentProfile)
 */

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Receipt, CheckCircle, Clock, XCircle, Banknote } from "lucide-react";

const getApiBaseUrl = () => {
  if (typeof window !== 'undefined' && window.location.hostname.includes('.app.github.dev')) {
    const hostname = window.location.hostname;
    const codespaceBase = hostname.replace(/-\d+\.app\.github\.dev$/, '');
    return `https://${codespaceBase}-5000.app.github.dev/api`;
  }
  return import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
};
const API_BASE_URL = getApiBaseUrl();

interface PayoutRequest {
  _id: string;
  amount: number;
  status: "PENDING" | "APPROVED" | "REJECTED" | "PAID";
  requestDate: string;
  approvedDate?: string;
  paidDate?: string;
  approvedBy?: string;
  notes?: string;
}

interface TeacherPayoutHistoryProps {
  teacherId: string;
}

export function TeacherPayoutHistory({ teacherId }: TeacherPayoutHistoryProps) {
  // Fetch payout requests for this teacher
  const { data: payoutData, isLoading } = useQuery({
    queryKey: ["teacher-payouts", teacherId],
    queryFn: async () => {
      const res = await fetch(
        `${API_BASE_URL}/payroll/my-requests/${teacherId}`,
        {
          credentials: "include",
        },
      );
      if (!res.ok) return { data: [] };
      return res.json();
    },
    enabled: !!teacherId,
  });

  const payouts: PayoutRequest[] = payoutData?.data || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
      case "PAID":
        return (
          <Badge className="bg-green-100 text-green-700 gap-1">
            <CheckCircle className="h-3 w-3" />
            {status}
          </Badge>
        );
      case "PENDING":
        return (
          <Badge className="bg-yellow-100 text-yellow-700 gap-1">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge className="bg-red-100 text-red-700 gap-1">
            <XCircle className="h-3 w-3" />
            Rejected
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Calculate totals
  const totalApproved = payouts
    .filter((p) => p.status === "APPROVED" || p.status === "PAID")
    .reduce((sum, p) => sum + p.amount, 0);

  const totalPending = payouts
    .filter((p) => p.status === "PENDING")
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-lg">
            <Receipt className="h-5 w-5 text-primary" />
            Payout History
          </span>
          <div className="flex items-center gap-4 text-sm font-normal">
            <span className="text-green-600">
              ✓ Received: Rs. {totalApproved.toLocaleString()}
            </span>
            {totalPending > 0 && (
              <span className="text-yellow-600">
                ⏳ Pending: Rs. {totalPending.toLocaleString()}
              </span>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : payouts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Banknote className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No payout requests yet</p>
            <p className="text-sm">
              Request a payout when you have verified balance
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-yellow-400/80 hover:bg-yellow-400">
                  <TableHead className="font-bold text-gray-900">
                    S.No
                  </TableHead>
                  <TableHead className="font-bold text-gray-900">
                    Request Date
                  </TableHead>
                  <TableHead className="font-bold text-gray-900 text-right">
                    Amount
                  </TableHead>
                  <TableHead className="font-bold text-gray-900">
                    Status
                  </TableHead>
                  <TableHead className="font-bold text-gray-900">
                    Approved Date
                  </TableHead>
                  <TableHead className="font-bold text-gray-900">
                    Notes
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payouts.map((payout, index) => (
                  <TableRow
                    key={payout._id}
                    className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                  >
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>
                      {new Date(payout.requestDate).toLocaleDateString(
                        "en-PK",
                        {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        },
                      )}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-green-700">
                      Rs. {payout.amount.toLocaleString()}
                    </TableCell>
                    <TableCell>{getStatusBadge(payout.status)}</TableCell>
                    <TableCell>
                      {payout.approvedDate
                        ? new Date(payout.approvedDate).toLocaleDateString(
                            "en-PK",
                            {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            },
                          )
                        : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {payout.notes || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
