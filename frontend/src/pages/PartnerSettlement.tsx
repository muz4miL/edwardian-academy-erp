/**
 * Partner Settlement Hub - Financial Sovereignty Module
 *
 * This page allows Sir Waqar (OWNER) to:
 * 1. View total receivables from each partner
 * 2. See expense history with partner debt status
 * 3. Record cash repayments from partners
 * 4. Track settlement history
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { HeaderBanner } from "@/components/dashboard/HeaderBanner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Loader2,
  Wallet,
  ArrowDownRight,
  History,
  Banknote,
} from "lucide-react";

// Import the shared SettlementModal component
import { SettlementModal } from "@/components/finance/SettlementModal";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

interface PartnerStats {
  partnerId: string;
  partnerName: string;
  debtToOwner: number;
  unpaidTotal: number;
  paidTotal: number;
  unpaidCount: number;
  paidCount: number;
  unpaidExpenses: Array<{
    expenseId: string;
    title: string;
    amount: number;
    date: string;
  }>;
}

interface SettlementOverview {
  totalReceivable: number;
  partners: {
    zahid?: PartnerStats;
    saud?: PartnerStats;
  };
  recentSettlements: Array<{
    _id: string;
    partnerName: string;
    amount: number;
    date: string;
    method: string;
  }>;
}

export default function PartnerSettlement() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Fetch settlement overview
  const { data: overview, isLoading: overviewLoading } = useQuery<{
    data: SettlementOverview;
  }>({
    queryKey: ["settlements", "overview"],
    queryFn: async () => {
      const res = await fetch(
        `${API_BASE_URL}/api/expenses/settlements/overview`,
      );
      if (!res.ok) throw new Error("Failed to fetch settlement overview");
      return res.json();
    },
    staleTime: 1000 * 30, // Cache for 30 seconds
  });

  const overviewData = overview?.data;

  // Get partner list for display
  const partners = overviewData?.partners || {};

  return (
    <DashboardLayout title="Partner Settlement">
      <HeaderBanner
        title="💰 Partner Settlement Hub"
        subtitle="Track partner debts and record cash repayments to Sir Waqar"
      >
        <Button
          onClick={() => setIsDialogOpen(true)}
          className="bg-green-600 hover:bg-green-700 h-10 px-6"
        >
          <Banknote className="mr-2 h-4 w-4" />
          Record Cash Received
        </Button>
      </HeaderBanner>

      {/* Use the shared SettlementModal component */}
      <SettlementModal
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      />

      {overviewLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-3 text-muted-foreground">
            Loading settlement data...
          </span>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {/* Total Owed Banner */}
          <Card className="border-2 border-green-300 bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50">
            <CardContent className="py-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                    <Wallet className="h-8 w-8 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-green-700 font-medium">
                      Total Owed to Sir Waqar
                    </p>
                    <p className="text-4xl font-bold text-green-600">
                      PKR{" "}
                      {(overviewData?.totalReceivable || 0).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground text-center md:text-right">
                  <p>From out-of-pocket expenses</p>
                  <p className="text-xs">
                    paid by Sir Waqar on behalf of partners
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Partner Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Dr. Zahid's Debt */}
            <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-bold text-blue-800 flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-blue-600 font-bold">Z</span>
                  </div>
                  Dr. Zahid
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-blue-600 mb-2">
                  PKR {(partners.zahid?.unpaidTotal || 0).toLocaleString()}
                </p>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs border-blue-300">
                    {partners.zahid?.unpaidCount || 0} pending expenses
                  </Badge>
                  {(partners.zahid?.paidCount || 0) > 0 && (
                    <Badge className="bg-green-100 text-green-700 text-xs">
                      {partners.zahid?.paidCount} settled
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Sir Saud's Debt */}
            <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-bold text-purple-800 flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                    <span className="text-purple-600 font-bold">S</span>
                  </div>
                  Sir Saud
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-purple-600 mb-2">
                  PKR {(partners.saud?.unpaidTotal || 0).toLocaleString()}
                </p>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="text-xs border-purple-300"
                  >
                    {partners.saud?.unpaidCount || 0} pending expenses
                  </Badge>
                  {(partners.saud?.paidCount || 0) > 0 && (
                    <Badge className="bg-green-100 text-green-700 text-xs">
                      {partners.saud?.paidCount} settled
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Settlements */}
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-green-600" />
                Recent Cash Payments Received
              </CardTitle>
            </CardHeader>
            <CardContent>
              {overviewData?.recentSettlements &&
                overviewData.recentSettlements.length > 0 ? (
                <div className="space-y-3">
                  {overviewData.recentSettlements.map((settlement) => (
                    <div
                      key={settlement._id}
                      className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-200"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                          <ArrowDownRight className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium text-green-800">
                            {settlement.partnerName}
                          </p>
                          <p className="text-xs text-green-600">
                            {new Date(settlement.date).toLocaleDateString(
                              "en-PK",
                              {
                                month: "long",
                                day: "numeric",
                                year: "numeric",
                              },
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-700">
                          +PKR {settlement.amount.toLocaleString()}
                        </p>
                        <Badge variant="outline" className="text-xs">
                          {settlement.method}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No cash payments recorded yet.</p>
                  <p className="text-sm">
                    When partners pay Sir Waqar back, record it here.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}
