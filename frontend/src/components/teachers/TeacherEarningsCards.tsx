/**
 * TeacherEarningsCards - Financial header cards for Teacher Profile
 * Displays: Total Earned, Verified Balance, Liability to Owner
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
} from "lucide-react";

interface TeacherEarningsCardsProps {
  teacher: {
    name: string;
    balance?: {
      verified: number;
      floating: number;
    };
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {/* Total Earned (70% share) */}
      <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 dark:border-green-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-green-700 dark:text-green-400 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Total Earned
            {isPartner && (
              <Badge className="ml-auto bg-yellow-100 text-yellow-700 text-xs gap-1">
                <Crown className="h-3 w-3" />
                100%
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400">
            Rs. {totalEarned.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {isPartner
              ? "Full revenue as Academy Partner"
              : "Your share of collected fees (70%)"}
          </p>
        </CardContent>
      </Card>

      {/* Verified Balance */}
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
            Approved for payout
          </p>
        </CardContent>
      </Card>

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
