/**
 * AcademySettlements Component
 * 
 * Dashboard section for Owner (Waqar) to manage partner academy share settlements.
 * Shows pending settlements by partner with release functionality.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Wallet,
  Building2,
  History,
  Send,
  Loader2,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { financeApi } from "@/lib/api";

interface PartnerSettlement {
  partnerId: string;
  partnerName: string;
  partnerRole: string;
  percentage: number;
  totalPendingAmount: number;
  pendingCount: number;
  oldestSettlement: string;
  newestSettlement: string;
  profileImage?: string;
}

interface SettlementDetail {
  _id: string;
  amount: number;
  percentage: number;
  sourceDate: string;
  studentName: string;
  subject: string;
  teacherName: string;
  totalAcademyShare: number;
  calculationProof: string;
}

interface ClassBreakdown {
  className: string;
  settlements: SettlementDetail[];
  total: number;
}

export function AcademySettlements() {
  const queryClient = useQueryClient();
  const [selectedPartner, setSelectedPartner] = useState<PartnerSettlement | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [releaseDialogOpen, setReleaseDialogOpen] = useState(false);
  const [releasePartial, setReleasePartial] = useState(false);
  const [releaseAmount, setReleaseAmount] = useState("");
  const [releaseNotes, setReleaseNotes] = useState("");

  // Fetch settlements summary
  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ["academy-settlements-summary"],
    queryFn: () => financeApi.getAcademySettlementsSummary(),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch partner details when selected
  const { data: partnerDetails, isLoading: detailsLoading } = useQuery({
    queryKey: ["academy-settlements-partner", selectedPartner?.partnerId],
    queryFn: () => financeApi.getPartnerSettlementDetails(selectedPartner!.partnerId),
    enabled: !!selectedPartner?.partnerId,
  });

  // Fetch settlement history
  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ["academy-settlements-history"],
    queryFn: () => financeApi.getSettlementHistory(),
  });

  // Release mutation
  const releaseMutation = useMutation({
    mutationFn: (data: { partnerId: string; partial?: boolean; amount?: number; notes?: string }) =>
      financeApi.releasePartnerSettlements(data.partnerId, data),
    onSuccess: (response) => {
      toast.success(`Released PKR ${response.data.releasedAmount.toLocaleString()} to ${response.data.partnerName}`);
      queryClient.invalidateQueries({ queryKey: ["academy-settlements-summary"] });
      queryClient.invalidateQueries({ queryKey: ["academy-settlements-partner"] });
      queryClient.invalidateQueries({ queryKey: ["academy-settlements-history"] });
      setReleaseDialogOpen(false);
      setSelectedPartner(null);
      setReleaseAmount("");
      setReleaseNotes("");
      setReleasePartial(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to release settlement");
    },
  });

  const partners = summaryData?.data?.partners || [];
  const totalPending = summaryData?.data?.totalPending || 0;

  const handleViewDetails = (partner: PartnerSettlement) => {
    setSelectedPartner(partner);
    setDetailsOpen(true);
  };

  const handleStartRelease = (partner: PartnerSettlement) => {
    setSelectedPartner(partner);
    setReleaseAmount(partner.totalPendingAmount.toString());
    setReleaseDialogOpen(true);
  };

  const handleRelease = () => {
    if (!selectedPartner) return;

    releaseMutation.mutate({
      partnerId: selectedPartner.partnerId,
      partial: releasePartial,
      amount: releasePartial ? parseInt(releaseAmount) : undefined,
      notes: releaseNotes,
    });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-PK", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Summary Card */}
      <Card className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-amber-200 dark:border-amber-800">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/50">
                <Building2 className="h-6 w-6 text-amber-700" />
              </div>
              <div>
                <CardTitle className="text-lg text-amber-900 dark:text-amber-100">
                  Academy Settlements
                </CardTitle>
                <CardDescription className="text-amber-700 dark:text-amber-400">
                  Partner academy share waiting for release
                </CardDescription>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">
                PKR {totalPending.toLocaleString()}
              </p>
              <p className="text-sm text-amber-600 dark:text-amber-400">
                Total Pending
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Pending ({partners.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>

        {/* Pending Settlements Tab */}
        <TabsContent value="pending" className="space-y-4">
          {summaryLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : partners.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-emerald-500" />
                <p className="text-lg font-medium text-muted-foreground">
                  All settlements are cleared!
                </p>
                <p className="text-sm text-muted-foreground">
                  No pending academy share to release to partners.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {partners.map((partner: PartnerSettlement) => (
                <Card
                  key={partner.partnerId}
                  className="hover:border-primary/50 transition-colors"
                >
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={partner.profileImage} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {partner.partnerName.split(" ").map(n => n[0]).join("").slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold truncate">{partner.partnerName}</p>
                          <Badge variant={partner.partnerRole === "OWNER" ? "default" : "secondary"} className="text-[10px]">
                            {partner.partnerRole}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {partner.percentage}% share
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Pending Amount</span>
                        <span className="text-lg font-bold text-primary">
                          PKR {partner.totalPendingAmount.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{partner.pendingCount} settlement(s)</span>
                        <span>Since {formatDate(partner.oldestSettlement)}</span>
                      </div>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleViewDetails(partner)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Details
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => handleStartRelease(partner)}
                      >
                        <Send className="h-4 w-4 mr-1" />
                        Release
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          {historyLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !historyData?.data?.history?.length ? (
            <Card>
              <CardContent className="py-12 text-center">
                <History className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No settlement history yet.</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-4">
                <div className="space-y-3">
                  {historyData.data.history.slice(0, 20).map((settlement: any) => (
                    <div
                      key={settlement._id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        <div>
                          <p className="font-medium">{settlement.partnerName}</p>
                          <p className="text-xs text-muted-foreground">
                            Released on {formatDate(settlement.releasedAt)}
                            {settlement.releaseNotes && ` • ${settlement.releaseNotes}`}
                          </p>
                        </div>
                      </div>
                      <span className="font-bold text-emerald-600">
                        +PKR {settlement.amount.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={selectedPartner?.profileImage} />
                <AvatarFallback className="text-xs">
                  {selectedPartner?.partnerName?.split(" ").map(n => n[0]).join("").slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              {selectedPartner?.partnerName} - Settlement Details
            </DialogTitle>
            <DialogDescription>
              Breakdown of pending academy share from student fees
            </DialogDescription>
          </DialogHeader>

          {detailsLoading ? (
            <div className="space-y-3 py-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-primary/5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Pending</span>
                  <span className="text-xl font-bold text-primary">
                    PKR {partnerDetails?.data?.summary?.totalPending?.toLocaleString() || 0}
                  </span>
                </div>
              </div>

              <Accordion type="single" collapsible className="w-full">
                {partnerDetails?.data?.byClass?.map((cls: ClassBreakdown, idx: number) => (
                  <AccordionItem key={idx} value={`class-${idx}`}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center justify-between w-full pr-4">
                        <span className="font-medium">{cls.className}</span>
                        <span className="text-sm text-primary font-bold">
                          PKR {cls.total.toLocaleString()}
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2 pl-2">
                        {cls.settlements.map((s: SettlementDetail) => (
                          <div
                            key={s._id}
                            className="p-2 rounded border border-border/50 bg-muted/30 text-sm"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{s.studentName}</span>
                              <span className="font-bold text-primary">
                                PKR {s.amount.toLocaleString()}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              <span>{s.subject}</span>
                              {s.teacherName && <span> • Teacher: {s.teacherName}</span>}
                              <span> • {formatDate(s.sourceDate)}</span>
                            </div>
                            {s.calculationProof && (
                              <p className="text-[10px] mt-1 text-muted-foreground font-mono">
                                {s.calculationProof}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>
              Close
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => {
                setDetailsOpen(false);
                if (selectedPartner) handleStartRelease(selectedPartner);
              }}
            >
              <Send className="h-4 w-4 mr-1" />
              Release All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Release Confirmation Dialog */}
      <Dialog open={releaseDialogOpen} onOpenChange={setReleaseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-emerald-600" />
              Release Settlement
            </DialogTitle>
            <DialogDescription>
              Transfer academy share to {selectedPartner?.partnerName}'s closing dashboard
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-emerald-700 dark:text-emerald-400">Amount to Release</span>
                <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                  PKR {(releasePartial ? parseInt(releaseAmount) || 0 : selectedPartner?.totalPendingAmount || 0).toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-emerald-600 dark:text-emerald-500">
                This will be added to {selectedPartner?.partnerName}'s floating balance for closing.
              </p>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Release Partial Amount?</label>
              <input
                type="checkbox"
                checked={releasePartial}
                onChange={(e) => setReleasePartial(e.target.checked)}
                className="h-4 w-4"
              />
            </div>

            {releasePartial && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Amount (PKR)</label>
                <Input
                  type="number"
                  min={1}
                  max={selectedPartner?.totalPendingAmount || 0}
                  value={releaseAmount}
                  onChange={(e) => setReleaseAmount(e.target.value)}
                  placeholder="Enter amount"
                />
                <p className="text-xs text-muted-foreground">
                  Max: PKR {selectedPartner?.totalPendingAmount?.toLocaleString() || 0}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Notes (Optional)</label>
              <Textarea
                value={releaseNotes}
                onChange={(e) => setReleaseNotes(e.target.value)}
                placeholder="Add any notes about this release..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReleaseDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handleRelease}
              disabled={releaseMutation.isPending || (releasePartial && (!releaseAmount || parseInt(releaseAmount) <= 0))}
            >
              {releaseMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Releasing...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-1" />
                  Confirm Release
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AcademySettlements;
