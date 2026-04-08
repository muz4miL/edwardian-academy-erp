/**
 * AcademySettlements Component
 * 
 * Dashboard section for Owner (Waqar) to manage partner academy share settlements.
 * Shows pending settlements by partner with release functionality.
 * Only shows PARTNER settlements — owner's settlements are auto-released.
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
  Gift,
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
  
  // Manual release state
  const [manualReleaseDialogOpen, setManualReleaseDialogOpen] = useState(false);
  const [manualReleaseAmount, setManualReleaseAmount] = useState("");
  const [manualReleaseNotes, setManualReleaseNotes] = useState("");
  const [selectedPartnerForManual, setSelectedPartnerForManual] = useState<PartnerSettlement | null>(null);

  // Fetch settlements summary
  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ["academy-settlements-summary"],
    queryFn: () => financeApi.getAcademySettlementsSummary(),
    refetchInterval: 30000,
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
      financeApi.releasePartnerSettlements(data.partnerId, {
        partial: data.partial,
        amount: data.amount,
        notes: data.notes,
      }),
    onSuccess: (response) => {
      toast.success(`Released PKR ${response.data.releasedAmount.toLocaleString()} to ${response.data.partnerName}`);
      queryClient.invalidateQueries({ queryKey: ["academy-settlements-summary"] });
      queryClient.invalidateQueries({ queryKey: ["academy-settlements-partner"] });
      queryClient.invalidateQueries({ queryKey: ["academy-settlements-history"] });
      queryClient.invalidateQueries({ queryKey: ["owner-breakdown"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
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

  // Manual release mutation (arbitrary amount, not tied to pending settlements)
  const manualReleaseMutation = useMutation({
    mutationFn: (data: { partnerId: string; amount: number; notes?: string }) =>
      financeApi.manualReleaseToPartner(data.partnerId, data.amount, data.notes),
    onSuccess: (response) => {
      toast.success(`Manual release of PKR ${response.data.releasedAmount.toLocaleString()} to ${response.data.partnerName}`);
      queryClient.invalidateQueries({ queryKey: ["academy-settlements-summary"] });
      queryClient.invalidateQueries({ queryKey: ["academy-settlements-partner"] });
      queryClient.invalidateQueries({ queryKey: ["academy-settlements-history"] });
      queryClient.invalidateQueries({ queryKey: ["owner-breakdown"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setManualReleaseDialogOpen(false);
      setSelectedPartnerForManual(null);
      setManualReleaseAmount("");
      setManualReleaseNotes("");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to release to partner");
    },
  });

  // Filter: only show PARTNER settlements (not OWNER — owner's share is auto-released)
  const allPartners = summaryData?.data?.partners || [];
  const partners = allPartners.filter((p: PartnerSettlement) => p.partnerRole !== "OWNER");
  const totalPending = partners.reduce((sum: number, p: PartnerSettlement) => sum + p.totalPendingAmount, 0);

  // Filter history: only show PARTNER releases (not OWNER auto-releases)
  const allHistory = historyData?.data?.history || [];
  const filteredHistory = allHistory.filter((s: any) => s.partnerRole !== "OWNER");

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

  // Manual release handlers
  const handleStartManualRelease = (partner: PartnerSettlement) => {
    setSelectedPartnerForManual(partner);
    setManualReleaseAmount("");
    setManualReleaseNotes("");
    setManualReleaseDialogOpen(true);
  };

  const handleManualRelease = () => {
    if (!selectedPartnerForManual || !manualReleaseAmount) return;
    
    manualReleaseMutation.mutate({
      partnerId: selectedPartnerForManual.partnerId,
      amount: parseInt(manualReleaseAmount),
      notes: manualReleaseNotes || undefined,
    });
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-PK", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-4">
      {/* Header Summary Card */}
      <Card className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-amber-200 dark:border-amber-800 shadow-md">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 shadow-lg">
                <Building2 className="h-5 w-5 text-white" />
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
              <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                Total Pending
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 h-10 bg-muted/60">
          <TabsTrigger value="pending" className="flex items-center gap-2 text-sm font-medium">
            <Clock className="h-4 w-4" />
            Pending ({partners.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2 text-sm font-medium">
            <History className="h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>

        {/* Pending Settlements Tab */}
        <TabsContent value="pending" className="space-y-4">
          {summaryLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-28 w-full rounded-xl" />
              ))}
            </div>
          ) : partners.length === 0 ? (
            <Card className="border-dashed border-2 border-emerald-200 bg-emerald-50/50">
              <CardContent className="py-10 text-center">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-emerald-500" />
                <p className="text-lg font-semibold text-emerald-800">
                  All settlements are cleared!
                </p>
                <p className="text-sm text-emerald-600 mt-1">
                  No pending academy share to release to partners.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {partners.map((partner: PartnerSettlement) => (
                <Card
                  key={partner.partnerId}
                  className="hover:shadow-lg hover:border-primary/40 transition-all duration-200 overflow-hidden"
                >
                  <CardContent className="p-5">
                    {/* Partner Header */}
                    <div className="flex items-center gap-3 mb-4">
                      <Avatar className="h-11 w-11 border-2 border-primary/20">
                        <AvatarImage src={partner.profileImage} />
                        <AvatarFallback className="bg-gradient-to-br from-primary/10 to-primary/20 text-primary font-bold text-sm">
                          {partner.partnerName.split(" ").map(n => n[0]).join("").slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm truncate">{partner.partnerName}</p>
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 font-semibold shrink-0">
                            PARTNER
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {partner.percentage}% share
                        </p>
                      </div>
                    </div>

                    {/* Amount Card */}
                    <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border border-amber-200/50">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-medium text-amber-700">Pending Amount</span>
                        <span className="text-lg font-bold text-amber-800">
                          PKR {partner.totalPendingAmount.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-amber-600">
                        <span>{partner.pendingCount} settlement(s)</span>
                        <span>Since {formatDate(partner.oldestSettlement)}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-4 flex flex-col gap-2">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 h-9 text-xs font-medium"
                          onClick={() => handleViewDetails(partner)}
                        >
                          <Eye className="h-3.5 w-3.5 mr-1.5" />
                          Details
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1 h-9 text-xs font-medium bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => handleStartRelease(partner)}
                          disabled={partner.totalPendingAmount === 0}
                        >
                          <Send className="h-3.5 w-3.5 mr-1.5" />
                          Release
                        </Button>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full h-8 text-xs font-medium border-purple-200 text-purple-700 hover:bg-purple-50 hover:text-purple-800"
                        onClick={() => handleStartManualRelease(partner)}
                      >
                        <Gift className="h-3.5 w-3.5 mr-1.5" />
                        Manual Release
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
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : filteredHistory.length === 0 ? (
            <Card className="border-dashed border-2 border-slate-200">
              <CardContent className="py-10 text-center">
                <History className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-muted-foreground font-medium">No settlement releases yet.</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Releases to partners will appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-4">
                <div className="space-y-2">
                  {filteredHistory.slice(0, 20).map((settlement: any) => (
                    <div
                      key={settlement._id}
                      className="flex items-center justify-between p-3 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{settlement.partnerName}</p>
                          <p className="text-xs text-muted-foreground">
                            Released on {formatDate(settlement.releasedAt)}
                            {settlement.releaseNotes && ` • ${settlement.releaseNotes}`}
                          </p>
                        </div>
                      </div>
                      <span className="font-bold text-emerald-600 text-sm">
                        +PKR {(settlement.amount || 0).toLocaleString()}
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
              {selectedPartner?.partnerName} — Settlement Details
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
            <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-200 dark:border-emerald-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Amount to Release</span>
                <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                  PKR {(releasePartial ? parseInt(releaseAmount) || 0 : selectedPartner?.totalPendingAmount || 0).toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-emerald-600 dark:text-emerald-500">
                This will be added to {selectedPartner?.partnerName}'s floating balance for closing.
              </p>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <label className="text-sm font-medium">Release Partial Amount?</label>
              <input
                type="checkbox"
                checked={releasePartial}
                onChange={(e) => setReleasePartial(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
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

      {/* Manual Release Dialog */}
      <Dialog open={manualReleaseDialogOpen} onOpenChange={setManualReleaseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-purple-600" />
              Manual Release
            </DialogTitle>
            <DialogDescription>
              Release any amount to {selectedPartnerForManual?.partnerName} (bonus, advance, etc.)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-4 rounded-xl bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-950/30 dark:to-violet-950/30 border border-purple-200 dark:border-purple-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-purple-700 dark:text-purple-400">Releasing To</span>
                <span className="text-lg font-bold text-purple-700 dark:text-purple-400">
                  {selectedPartnerForManual?.partnerName}
                </span>
              </div>
              <p className="text-xs text-purple-600 dark:text-purple-500">
                {selectedPartnerForManual?.percentage}% partner share
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Amount (PKR) *</label>
              <Input
                type="number"
                min={1}
                value={manualReleaseAmount}
                onChange={(e) => setManualReleaseAmount(e.target.value)}
                placeholder="Enter amount to release"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Notes (Optional)</label>
              <Textarea
                value={manualReleaseNotes}
                onChange={(e) => setManualReleaseNotes(e.target.value)}
                placeholder="e.g., Bonus for performance, Monthly advance, etc."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setManualReleaseDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-purple-600 hover:bg-purple-700"
              onClick={handleManualRelease}
              disabled={manualReleaseMutation.isPending || !manualReleaseAmount || parseInt(manualReleaseAmount) <= 0}
            >
              {manualReleaseMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Releasing...
                </>
              ) : (
                <>
                  <Gift className="h-4 w-4 mr-1" />
                  Release Amount
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
