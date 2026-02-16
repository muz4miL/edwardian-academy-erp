/**
 * TeacherEarningsCards - Financial header cards for Teacher Profile
 * Displays: Total Earned, Pending Commission, Liability to Owner (or Verified Balance for partners)
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Wallet,
  Crown,
  Clock,
  Banknote,
} from "lucide-react";

interface TeacherEarningsCardsProps {
  teacher: {
    name: string;
    balance?: {
      verified: number;
      floating: number;
      pending: number;
    };
    totalPaid?: number;
  };
  totalEarned: number;
  debtToOwner: number;
  isPartner: boolean;
}

export function TeacherEarningsCards({
  teacher,
  totalEarned,
  debtToOwner,
  isPartner,
}: TeacherEarningsCardsProps) {
  const verifiedBalance = teacher?.balance?.verified || 0;
  const floatingBalance = teacher?.balance?.floating || 0;
  const pendingBalance = teacher?.balance?.pending || 0;
  const totalPaid = teacher?.totalPaid || 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {/* Card 1: Total Earned (for Partners) or Pending Commission (for Staff) */}
      {isPartner ? (
        // Partner: Show Total Earned (100%)
        <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 dark:border-green-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-700 dark:text-green-400 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Total Earned
              <Badge className="ml-auto bg-yellow-100 text-yellow-700 text-xs gap-1">
                <Crown className="h-3 w-3" />
                100%
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">
              Rs. {totalEarned.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Full revenue as Academy Partner
            </p>
          </CardContent>
        </Card>
      ) : (
        // Staff: Show Pending Commission
        <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 dark:border-amber-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-700 dark:text-amber-400 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Pending Commission
              {pendingBalance > 0 && (
                <Badge className="ml-auto bg-amber-100 text-amber-700 text-xs">
                  Unpaid
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">
              Rs. {pendingBalance.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Commission owed (paid at session end)
            </p>
          </CardContent>
        </Card>
      )}

      {/* Card 2: For Partners show Verified Balance, for Staff show Total Paid */}
      {isPartner ? (
        <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 dark:border-blue-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-400 flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Verified Balance
              {floatingBalance > 0 && (
                <Badge variant="outline" className="ml-auto text-xs">
                  +{floatingBalance.toLocaleString()} pending
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              Rs. {verifiedBalance.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-green-500" />
              Cash in hand
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 dark:border-green-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-700 dark:text-green-400 flex items-center gap-2">
              <Banknote className="h-4 w-4" />
              Total Paid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">
              Rs. {totalPaid.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-green-500" />
              Lifetime payouts received
            </p>
          </CardContent>
        </Card>
      )}

      {/* Liability to Owner (debtToOwner) */}
      <Card
        className={`border-2 ${
          debtToOwner > 0
            ? "border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 dark:border-amber-800"
            : "border-gray-200 bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-950/30 dark:to-slate-950/30 dark:border-gray-700"
        }`}
      >
        <CardHeader className="pb-2">
          <CardTitle
            className={`text-sm font-medium flex items-center gap-2 ${
              debtToOwner > 0
                ? "text-amber-700 dark:text-amber-400"
                : "text-gray-600 dark:text-gray-400"
            }`}
          >
            <AlertTriangle className="h-4 w-4" />
            Liability to Owner
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p
            className={`text-3xl font-bold ${
              debtToOwner > 0
                ? "text-amber-600 dark:text-amber-400"
                : "text-gray-500 dark:text-gray-400"
            }`}
          >
            Rs. {debtToOwner.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {debtToOwner > 0
              ? "Outstanding from out-of-pocket expenses"
              : "No pending liabilities"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
