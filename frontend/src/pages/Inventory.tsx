import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Package, Trash2, Plus, Loader2, DollarSign, Hash, Layers } from "lucide-react";
import { toast } from "sonner";
import { API_BASE_URL } from "@/utils/apiConfig";

const CATEGORIES = [
  "Furniture", "Electronics", "Stationery", "Lab Equipment",
  "Sports Equipment", "Cleaning Supplies", "Books & Materials",
  "IT Equipment", "Office Supplies", "Other",
];

interface InventoryItem {
  _id: string;
  itemName: string;
  itemCode: string;
  category: string;
  totalQuantity: number;
  purchasePrice: number;
  originalCost?: number;
  assignedTo?: string;
  purchaseDate: string;
  notes?: string;
}

const formatCurrency = (n: number) => `PKR ${(n || 0).toLocaleString()}`;
const formatDate = (d: string) =>
  d ? new Date(d).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" }) : "—";

export default function InventoryPage() {
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    itemName: "",
    category: "Other",
    totalQuantity: "1",
    purchasePrice: "",
    assignedTo: "",
    purchaseDate: new Date().toISOString().split("T")[0],
    notes: "",
  });
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["inventory-items", catFilter, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (catFilter !== "all") params.append("category", catFilter);
      if (search) params.append("search", search);
      const res = await fetch(`${API_BASE_URL}/api/inventory/items?${params}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const items: InventoryItem[] = data?.data || [];

  const totalItems = items.length;
  const totalQuantity = items.reduce((s, i) => s + (i.totalQuantity || 0), 0);
  const totalValue = items.reduce((s, i) => s + (i.totalQuantity || 1) * (i.purchasePrice || i.originalCost || 0), 0);

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch(`${API_BASE_URL}/api/inventory/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to add item");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      toast.success("Item added to inventory");
      setForm({
        itemName: "", category: "Other", totalQuantity: "1",
        purchasePrice: "", assignedTo: "",
        purchaseDate: new Date().toISOString().split("T")[0], notes: "",
      });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_BASE_URL}/api/inventory/items/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to delete");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      toast.success("Item removed");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleAdd = () => {
    if (!form.itemName.trim()) return toast.error("Item name is required");
    if (!form.purchasePrice) return toast.error("Price is required");
    createMutation.mutate({
      itemName: form.itemName.trim(),
      category: form.category,
      totalQuantity: Number(form.totalQuantity) || 1,
      purchasePrice: Number(form.purchasePrice),
      assignedTo: form.assignedTo || undefined,
      purchaseDate: form.purchaseDate,
      notes: form.notes || undefined,
    });
  };

  return (
    <DashboardLayout title="Inventory">
      <div className="space-y-6 max-w-6xl">

        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" />
            Inventory
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Track all academy assets, supplies and equipment
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50">
                <Hash className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Items</p>
                <p className="text-2xl font-bold">{totalItems}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-violet-50">
                <Layers className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Quantity</p>
                <p className="text-2xl font-bold">{totalQuantity.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-50">
                <DollarSign className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Value</p>
                <p className="text-xl font-bold">{formatCurrency(totalValue)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Item
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="md:col-span-2">
                <Label>Item Name *</Label>
                <Input
                  placeholder="e.g., Whiteboard, Chair, Projector"
                  value={form.itemName}
                  onChange={(e) => setForm({ ...form, itemName: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Class / Location</Label>
                <Input
                  placeholder="e.g., Room 101, Class 5A, Library"
                  value={form.assignedTo}
                  onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div>
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  value={form.totalQuantity}
                  onChange={(e) => setForm({ ...form, totalQuantity: e.target.value })}
                />
              </div>
              <div>
                <Label>Unit Price (PKR) *</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={form.purchasePrice}
                  onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })}
                />
              </div>
              <div>
                <Label>Purchase Date</Label>
                <Input
                  type="date"
                  value={form.purchaseDate}
                  onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })}
                />
              </div>
              <div className="md:col-span-2">
                <Label>Notes <span className="text-muted-foreground font-normal text-xs">(optional)</span></Label>
                <Input
                  placeholder="Any extra details..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <Button onClick={handleAdd} disabled={createMutation.isPending} className="min-w-[110px]">
                {createMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Add Item
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <div className="flex gap-3 flex-wrap">
            <Input
              placeholder="Search items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
            />
            <Select value={catFilter} onValueChange={setCatFilter}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <Card className="py-14 flex flex-col items-center text-center">
              <Package className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="font-medium text-muted-foreground">No items yet</p>
              <p className="text-sm text-muted-foreground/60 mt-1">Add your first inventory item above</p>
            </Card>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Item</TableHead>
                    <TableHead className="font-semibold">Category</TableHead>
                    <TableHead className="font-semibold text-center">Qty</TableHead>
                    <TableHead className="font-semibold">Unit Price</TableHead>
                    <TableHead className="font-semibold">Total Value</TableHead>
                    <TableHead className="font-semibold">Class / Location</TableHead>
                    <TableHead className="font-semibold">Date</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item._id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.itemName}</p>
                          <p className="text-xs text-muted-foreground">{item.itemCode}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{item.category}</span>
                      </TableCell>
                      <TableCell className="text-center font-semibold">{item.totalQuantity}</TableCell>
                      <TableCell>{formatCurrency(item.purchasePrice || item.originalCost || 0)}</TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency((item.totalQuantity || 1) * (item.purchasePrice || item.originalCost || 0))}
                      </TableCell>
                      <TableCell className="text-sm">
                        {item.assignedTo || <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(item.purchaseDate)}
                      </TableCell>
                      <TableCell>
                        {confirmDeleteId === item._id ? (
                          <div className="flex items-center gap-1.5">
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-7 px-2 text-xs"
                              onClick={() => { deleteMutation.mutate(item._id); setConfirmDeleteId(null); }}
                              disabled={deleteMutation.isPending}
                            >
                              Delete
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs"
                              onClick={() => setConfirmDeleteId(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-red-50"
                            onClick={() => setConfirmDeleteId(item._id)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

      </div>
    </DashboardLayout>
  );
}
