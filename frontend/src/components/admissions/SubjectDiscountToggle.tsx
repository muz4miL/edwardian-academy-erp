/**
 * SubjectDiscountToggle Component
 * 
 * Displays a subject with optional discount toggle for per-subject discounts.
 * Used in the Admissions form when selecting subjects.
 */
import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tag, Percent, BadgePercent } from "lucide-react";

interface SubjectDiscountToggleProps {
  subjectName: string;
  baseFee: number;
  isSelected: boolean;
  isInClass: boolean;
  discount: number;
  discountEnabled: boolean;
  discountReason: string;
  selectedTeacherId: string;
  effectiveTeacherId: string;
  teachers: Array<{ _id: string; name: string }>;
  onToggleSubject: (subjectName: string) => void;
  onFeeChange: (subjectName: string, fee: string) => void;
  onDiscountChange: (subjectName: string, discount: number) => void;
  onDiscountEnabledChange: (subjectName: string, enabled: boolean) => void;
  onDiscountReasonChange: (subjectName: string, reason: string) => void;
  onTeacherChange: (subjectName: string, teacherId: string) => void;
}

export function SubjectDiscountToggle({
  subjectName,
  baseFee,
  isSelected,
  isInClass,
  discount,
  discountEnabled,
  discountReason,
  selectedTeacherId,
  effectiveTeacherId,
  teachers,
  onToggleSubject,
  onFeeChange,
  onDiscountChange,
  onDiscountEnabledChange,
  onDiscountReasonChange,
  onTeacherChange,
}: SubjectDiscountToggleProps) {
  // Calculate effective fee after discount
  const effectiveDiscount = discountEnabled ? Math.min(discount, baseFee) : 0;
  const effectiveFee = baseFee - effectiveDiscount;

  return (
    <div
      className={`rounded-md border px-3 py-3 text-sm transition-all ${
        isSelected 
          ? discountEnabled 
            ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20" 
            : "border-primary bg-primary/5" 
          : "border-border bg-background hover:border-muted-foreground/30"
      }`}
    >
      {/* Subject Header with Checkbox */}
      <label className="flex items-center gap-2 cursor-pointer">
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggleSubject(subjectName)}
        />
        <span className="font-medium">{subjectName}</span>
        <div className="ml-auto flex items-center gap-2">
          {discountEnabled && effectiveDiscount > 0 && (
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded">
              -{effectiveDiscount.toLocaleString()}
            </span>
          )}
          <span className={`text-xs font-semibold ${discountEnabled && effectiveDiscount > 0 ? "line-through text-slate-400" : "text-slate-600"}`}>
            PKR {baseFee.toLocaleString()}
          </span>
          {discountEnabled && effectiveDiscount > 0 && (
            <span className="text-xs font-bold text-emerald-700">
              PKR {effectiveFee.toLocaleString()}
            </span>
          )}
          {isInClass && (
            <span className="text-[10px] text-emerald-600 font-medium bg-emerald-50 px-1 rounded">
              Class
            </span>
          )}
        </div>
      </label>

      {/* Expanded Options when Selected */}
      {isSelected && (
        <div className="mt-3 space-y-3 pl-6 border-l-2 border-primary/20">
          {/* Fee Override */}
          <div className="flex items-center gap-2">
            <Label className="text-[10px] uppercase tracking-wide text-slate-500 w-12">Fee</Label>
            <Input
              type="number"
              min={0}
              value={baseFee}
              onChange={(e) => onFeeChange(subjectName, e.target.value)}
              className="h-8 w-28"
            />
          </div>

          {/* Discount Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BadgePercent className="h-4 w-4 text-emerald-600" />
              <Label className="text-xs text-slate-600">Discount</Label>
            </div>
            <Switch
              checked={discountEnabled}
              onCheckedChange={(checked) => onDiscountEnabledChange(subjectName, checked)}
              className="data-[state=checked]:bg-emerald-500"
            />
          </div>

          {/* Discount Amount & Reason (when enabled) */}
          {discountEnabled && (
            <div className="space-y-2 p-2 rounded bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200/50">
              <div className="flex items-center gap-2">
                <Label className="text-[10px] uppercase tracking-wide text-emerald-700 w-20">
                  Amount (PKR)
                </Label>
                <Input
                  type="number"
                  min={0}
                  max={baseFee}
                  value={discount}
                  onChange={(e) => onDiscountChange(subjectName, parseInt(e.target.value) || 0)}
                  className="h-8 w-24 border-emerald-300 focus:border-emerald-500"
                  placeholder="0"
                />
                <span className="text-[10px] text-emerald-600">
                  Max: {baseFee.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-[10px] uppercase tracking-wide text-emerald-700 w-20">
                  Reason
                </Label>
                <Input
                  type="text"
                  value={discountReason}
                  onChange={(e) => onDiscountReasonChange(subjectName, e.target.value)}
                  className="h-8 flex-1 border-emerald-300 focus:border-emerald-500"
                  placeholder="e.g., Sibling discount, Merit scholarship"
                />
              </div>
              {effectiveDiscount > 0 && (
                <p className="text-[10px] text-emerald-700 font-medium">
                  ✓ Saving PKR {effectiveDiscount.toLocaleString()} on {subjectName}
                </p>
              )}
            </div>
          )}

          {/* Teacher Selection (for extra subjects not in class) */}
          {!isInClass && (
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wide text-amber-700">
                Extra Subject Teacher *
              </Label>
              {teachers.length === 0 ? (
                <p className="text-[10px] text-red-600">
                  No teacher found with subject specialization: {subjectName}
                </p>
              ) : (
                <Select
                  value={effectiveTeacherId || ""}
                  onValueChange={(value) => onTeacherChange(subjectName, value)}
                >
                  <SelectTrigger className="h-8 bg-background">
                    <SelectValue placeholder="Select teacher" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {teachers.map((teacher) => (
                      <SelectItem key={teacher._id} value={teacher._id}>
                        {teacher.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SubjectDiscountToggle;
