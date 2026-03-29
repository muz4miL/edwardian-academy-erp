/**
 * TeacherEarningsDetails Component
 * 
 * Shows detailed breakdown of a teacher's earnings including:
 * - Pending/verified balances
 * - Earnings by class and subject
 * - Discount impacts on their share
 * - Deposit and payout history
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Banknote,
  TrendingUp,
  TrendingDown,
  Clock,
  BadgeCheck,
  BookOpen,
  Users,
  AlertTriangle,
  Wallet,
  History,
  ArrowDownRight,
  ArrowUpRight,
} from "lucide-react";
import { payrollApi } from "@/lib/api";

interface Teacher {
  _id: string;
  name: string;
  subject: string;
  balance?: {
    floating: number;
    verified: number;
    pending: number;
  };
}

interface TeacherEarningsDetailsProps {
  teacher: Teacher | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TeacherEarningsDetails({
  teacher,
  open,
  onOpenChange,
}: TeacherEarningsDetailsProps) {
  // Fetch earnings breakdown
  const { data: earningsData, isLoading } = useQuery({
    queryKey: ["teacher-earnings", teacher?._id],
    queryFn: () => payrollApi.getTeacherEarningsBreakdown(teacher!._id),
    enabled: !!teacher?._id && open,
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-PK", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  if (!teacher) return null;

  const earnings = earningsData?.data?.earnings;
  const deposits = earningsData?.data?.deposits;
  const payouts = earningsData?.data?.payouts;
  const netPosition = earningsData?.data?.netPosition;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            {teacher.name} - Earnings Details
          </DialogTitle>
          <DialogDescription>
            Complete financial breakdown and history
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Balance Overview Cards */}
            <div className="grid grid-cols-3 gap-3">
              <Card className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
                <CardContent className="p-3 text-center">
                  <Clock className="h-5 w-5 mx-auto mb-1 text-amber-600" />
                  <p className="text-xs text-amber-700 dark:text-amber-400">Floating</p>
                  <p className="text-lg font-bold text-amber-800 dark:text-amber-300">
                    PKR {(teacher.balance?.floating || 0).toLocaleString()}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800">
                <CardContent className="p-3 text-center">
                  <BadgeCheck className="h-5 w-5 mx-auto mb-1 text-emerald-600" />
                  <p className="text-xs text-emerald-700 dark:text-emerald-400">Verified</p>
                  <p className="text-lg font-bold text-emerald-800 dark:text-emerald-300">
                    PKR {(teacher.balance?.verified || 0).toLocaleString()}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
                <CardContent className="p-3 text-center">
                  <Banknote className="h-5 w-5 mx-auto mb-1 text-blue-600" />
                  <p className="text-xs text-blue-700 dark:text-blue-400">Total</p>
                  <p className="text-lg font-bold text-blue-800 dark:text-blue-300">
                    PKR {netPosition?.currentBalance?.toLocaleString() || 0}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Discount Impact Alert */}
            {earnings?.discountImpact > 0 && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                    Discount Impact
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    Student discounts reduced this teacher's share by PKR{" "}
                    {earnings.discountImpact.toLocaleString()}
                  </p>
                </div>
              </div>
            )}

            <Tabs defaultValue="earnings" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="earnings" className="text-xs">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Earnings
                </TabsTrigger>
                <TabsTrigger value="deposits" className="text-xs">
                  <Wallet className="h-3 w-3 mr-1" />
                  Deposits ({deposits?.count || 0})
                </TabsTrigger>
                <TabsTrigger value="payouts" className="text-xs">
                  <History className="h-3 w-3 mr-1" />
                  Payouts ({payouts?.count || 0})
                </TabsTrigger>
              </TabsList>

              {/* Earnings Tab */}
              <TabsContent value="earnings" className="space-y-4 mt-4">
                {/* By Subject Summary */}
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    Earnings by Subject
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {earnings?.bySubject?.map((subj: any) => (
                      <div
                        key={subj.subject}
                        className="p-2 rounded border bg-muted/30 flex items-center justify-between"
                      >
                        <span className="text-sm capitalize">{subj.subject}</span>
                        <span className="text-sm font-bold text-primary">
                          PKR {subj.total.toLocaleString()}
                        </span>
                      </div>
                    )) || (
                      <p className="text-sm text-muted-foreground col-span-2">
                        No earnings data available
                      </p>
                    )}
                  </div>
                </div>

                {/* By Class Breakdown */}
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Earnings by Class
                  </h4>
                  <Accordion type="single" collapsible className="w-full">
                    {earnings?.byClass?.map((cls: any, idx: number) => (
                      <AccordionItem key={idx} value={`class-${idx}`}>
                        <AccordionTrigger className="hover:no-underline py-2">
                          <div className="flex items-center justify-between w-full pr-4">
                            <span className="text-sm">{cls.className}</span>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs">
                                {cls.count} fees
                              </Badge>
                              <span className="text-sm font-bold text-primary">
                                PKR {cls.total.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-1 pl-2 max-h-48 overflow-y-auto">
                            {cls.records.slice(0, 10).map((record: any, i: number) => (
                              <div
                                key={i}
                                className="text-xs p-2 rounded bg-muted/50 flex items-center justify-between"
                              >
                                <div>
                                  <span className="font-medium">{record.studentName}</span>
                                  <span className="text-muted-foreground"> • {record.subject}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {record.discountReduction > 0 && (
                                    <span className="text-amber-600 text-[10px]">
                                      (-{record.discountReduction})
                                    </span>
                                  )}
                                  <span className="font-bold">PKR {record.amount.toLocaleString()}</span>
                                </div>
                              </div>
                            ))}
                            {cls.records.length > 10 && (
                              <p className="text-xs text-muted-foreground text-center py-1">
                                +{cls.records.length - 10} more records
                              </p>
                            )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    )) || (
                      <p className="text-sm text-muted-foreground py-4 text-center">
                        No class earnings data available
                      </p>
                    )}
                  </Accordion>
                </div>
              </TabsContent>

              {/* Deposits Tab */}
              <TabsContent value="deposits" className="mt-4">
                {!deposits?.records?.length ? (
                  <div className="py-8 text-center">
                    <Wallet className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">No deposits recorded</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {deposits.records.map((deposit: any) => (
                      <div
                        key={deposit._id}
                        className="p-3 rounded-lg border bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/50"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <ArrowDownRight className="h-4 w-4 text-emerald-600" />
                            <div>
                              <p className="text-sm font-medium">{deposit.depositType}</p>
                              <p className="text-xs text-muted-foreground">{deposit.reason}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-emerald-600">
                              +PKR {deposit.amount.toLocaleString()}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(deposit.createdAt)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="p-2 text-center border-t">
                      <p className="text-sm">
                        Total Deposited:{" "}
                        <span className="font-bold text-emerald-600">
                          PKR {deposits.total.toLocaleString()}
                        </span>
                      </p>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Payouts Tab */}
              <TabsContent value="payouts" className="mt-4">
                {!payouts?.records?.length ? (
                  <div className="py-8 text-center">
                    <History className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">No payouts recorded</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {payouts.records.map((payout: any) => (
                      <div
                        key={payout._id}
                        className="p-3 rounded-lg border bg-red-50/50 dark:bg-red-950/20 border-red-200/50"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <ArrowUpRight className="h-4 w-4 text-red-500" />
                            <div>
                              <p className="text-sm font-medium">Payout</p>
                              <p className="text-xs text-muted-foreground">
                                {payout.approvalNotes || "Approved payout"}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-red-500">
                              -PKR {payout.amount.toLocaleString()}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(payout.approvedAt)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="p-2 text-center border-t">
                      <p className="text-sm">
                        Total Paid Out:{" "}
                        <span className="font-bold text-red-500">
                          PKR {payouts.total.toLocaleString()}
                        </span>
                      </p>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>

            {/* Net Position Summary */}
            {netPosition && (
              <Card className="bg-muted/30">
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">Net Position Summary</CardTitle>
                </CardHeader>
                <CardContent className="py-0 pb-3">
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Earned</span>
                      <span className="font-medium text-emerald-600">
                        +PKR {netPosition.earned?.toLocaleString() || 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Deposited</span>
                      <span className="font-medium text-blue-600">
                        +PKR {netPosition.deposited?.toLocaleString() || 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Paid Out</span>
                      <span className="font-medium text-red-500">
                        -PKR {netPosition.paidOut?.toLocaleString() || 0}
                      </span>
                    </div>
                    <div className="flex justify-between pt-2 border-t font-bold">
                      <span>Current Balance</span>
                      <span className="text-primary">
                        PKR {netPosition.currentBalance?.toLocaleString() || 0}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default TeacherEarningsDetails;
