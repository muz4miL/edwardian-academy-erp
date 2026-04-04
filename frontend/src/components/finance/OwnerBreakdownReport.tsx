/**
 * OwnerBreakdownReport Component
 * 
 * Real-time dashboard showing Owner (Waqar) a complete breakdown of:
 * - Own earnings (tuition share + academy share)
 * - Teacher collections (amounts owed to teachers)
 * - Partner settlements (pending academy share for partners)
 * - Today's fee collection summary
 */
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Banknote,
  TrendingUp,
  Users,
  Building2,
  Clock,
  BadgeCheck,
  Wallet,
  ArrowRight,
  RefreshCw,
  Eye,
} from "lucide-react";
import { financeApi } from "@/lib/api";

interface OwnerBreakdownReportProps {
  onViewSettlements?: () => void;
  onViewPayroll?: () => void;
  onCloseDay?: () => void;
}

export function OwnerBreakdownReport({
  onViewSettlements,
  onViewPayroll,
  onCloseDay,
}: OwnerBreakdownReportProps) {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["owner-breakdown"],
    queryFn: () => financeApi.getOwnerBreakdown(),
    refetchInterval: 60000, // Refresh every minute
  });

  const breakdown = data?.data;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!breakdown) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">Unable to load breakdown data</p>
        </CardContent>
      </Card>
    );
  }

  const { ownEarnings, teacherCollections, partnerSettlements, todaySummary, availableToClose } = breakdown;

  // Calculate totals
  const totalOwed = teacherCollections.totalOwed + partnerSettlements.totalPending;
  const grossCollection = availableToClose + totalOwed;

  return (
    <div className="space-y-4">
      {/* Header with Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Financial Breakdown</h3>
          <p className="text-sm text-muted-foreground">Real-time view of your finances</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={`h-4 w-4 mr-1 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Main Summary Card */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Available to Close</p>
              <p className="text-3xl font-bold text-primary">
                PKR {availableToClose.toLocaleString()}
              </p>
              <Badge variant="secondary" className="mt-1">
                {ownEarnings.entryCount} entries
              </Badge>
            </div>
            <div className="text-center border-l border-r border-border/50">
              <p className="text-sm text-muted-foreground mb-1">Owed to Others</p>
              <p className="text-2xl font-bold text-amber-600">
                PKR {totalOwed.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Teachers + Partners
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Today's Collection</p>
              <p className="text-2xl font-bold text-emerald-600">
                PKR {todaySummary.feeCollected.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {todaySummary.recordCount} fee records
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">Your share of total</span>
              <span className="font-medium">
                {grossCollection > 0 ? Math.round((availableToClose / grossCollection) * 100) : 0}%
              </span>
            </div>
            <Progress
              value={grossCollection > 0 ? (availableToClose / grossCollection) * 100 : 0}
              className="h-2"
            />
          </div>
        </CardContent>
      </Card>

      {/* Own Earnings Breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            Your Earnings Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 rounded bg-emerald-50 dark:bg-emerald-950/30">
              <div className="flex items-center gap-2">
                <Banknote className="h-4 w-4 text-emerald-600" />
                <span className="text-sm">Tuition Share</span>
              </div>
              <span className="font-bold text-emerald-600">
                PKR {ownEarnings.tuitionShare.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-blue-50 dark:bg-blue-950/30">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-blue-600" />
                <span className="text-sm">Academy Share</span>
              </div>
              <span className="font-bold text-blue-600">
                PKR {ownEarnings.academyShare.toLocaleString()}
              </span>
            </div>
            {ownEarnings.adjustments !== 0 && (
              <div className="flex items-center justify-between p-2 rounded bg-red-50 dark:bg-red-950/30">
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 text-red-500" />
                  <span className="text-sm">Adjustments (Refunds)</span>
                </div>
                <span className="font-bold text-red-500">
                  PKR {ownEarnings.adjustments.toLocaleString()}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between p-2 rounded bg-primary/10 font-semibold">
              <span className="text-sm">Net Total</span>
              <span className="text-primary">
                PKR {ownEarnings.netTotal.toLocaleString()}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        {/* Teacher Collections */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4 text-amber-500" />
                Teacher Payables
              </CardTitle>
              {onViewPayroll && (
                <Button variant="ghost" size="sm" onClick={onViewPayroll}>
                  <Eye className="h-3 w-3 mr-1" />
                  View
                </Button>
              )}
            </div>
            <CardDescription className="text-xs">
              Amounts owed to teachers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-2">
              <p className="text-2xl font-bold text-amber-600">
                PKR {teacherCollections.totalOwed.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {teacherCollections.teacherCount} teachers
              </p>
            </div>
            <div className="mt-3 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-amber-500" />
                  Floating
                </span>
                <span>PKR {teacherCollections.totalFloating.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1">
                  <BadgeCheck className="h-3 w-3 text-emerald-500" />
                  Verified
                </span>
                <span>PKR {teacherCollections.totalVerified.toLocaleString()}</span>
              </div>
            </div>
            {teacherCollections.teachers.length > 0 && (
              <div className="mt-3 pt-3 border-t max-h-32 overflow-y-auto">
                {teacherCollections.teachers.slice(0, 5).map((t: any) => (
                  <div
                    key={t.teacherId}
                    className="flex items-center justify-between py-1 text-xs"
                  >
                    <span className="truncate">{t.teacherName}</span>
                    <span className="font-medium">
                      PKR {t.total.toLocaleString()}
                    </span>
                  </div>
                ))}
                {teacherCollections.teachers.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center">
                    +{teacherCollections.teachers.length - 5} more
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Partner Settlements */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Building2 className="h-4 w-4 text-purple-500" />
                Partner Settlements
              </CardTitle>
              {onViewSettlements && (
                <Button variant="ghost" size="sm" onClick={onViewSettlements}>
                  <Eye className="h-3 w-3 mr-1" />
                  View
                </Button>
              )}
            </div>
            <CardDescription className="text-xs">
              Pending academy share for partners
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-2">
              <p className="text-2xl font-bold text-purple-600">
                PKR {partnerSettlements.totalPending.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {partnerSettlements.partnerCount} partners
              </p>
            </div>
            {partnerSettlements.partners.length > 0 && (
              <div className="mt-3 pt-3 border-t space-y-2">
                {partnerSettlements.partners.map((p: any) => (
                  <div
                    key={p.partnerId}
                    className="flex items-center justify-between p-2 rounded bg-muted/50"
                  >
                    <div>
                      <p className="text-sm font-medium">{p.partnerName}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.pendingCount} settlements
                      </p>
                    </div>
                    <span className="font-bold text-purple-600">
                      PKR {p.pendingAmount.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {partnerSettlements.partnerCount === 0 && (
              <div className="text-center py-4 text-xs text-muted-foreground">
                No pending settlements
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions - Points to main Close Day section */}
      <Card className="bg-muted/30">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Ready to close?</p>
              <p className="text-sm text-muted-foreground">
                You have PKR {availableToClose.toLocaleString()} available
              </p>
            </div>
            <Button className="gap-2" onClick={() => {
              // Scroll to main Close Day section at top
              const closeSection = document.querySelector('[data-close-day-section]');
              if (closeSection) {
                closeSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
              onCloseDay?.();
            }}>
              Close Day
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default OwnerBreakdownReport;
