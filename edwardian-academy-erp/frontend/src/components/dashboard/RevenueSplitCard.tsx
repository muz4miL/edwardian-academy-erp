import { DollarSign, TrendingUp, Users } from "lucide-react";

export function RevenueSplitCard() {
  const totalRevenue = 600000;
  const teacherShare = totalRevenue * 0.7;
  const academyShare = totalRevenue * 0.3;

  return (
    <div className="rounded-xl border border-border bg-card p-6 card-shadow">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">
          Revenue Split (70/30)
        </h3>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-light">
          <TrendingUp className="h-5 w-5 text-primary" />
        </div>
      </div>

      <div className="mb-6">
        <p className="text-sm text-muted-foreground">Total Monthly Revenue</p>
        <p className="text-2xl font-bold text-foreground">
          PKR {totalRevenue.toLocaleString()}
        </p>
      </div>

      <div className="space-y-4">
        {/* Teacher Share */}
        <div className="rounded-lg bg-success-light p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-success" />
              <div>
                <p className="text-sm font-medium text-success">Teacher Share (70%)</p>
                <p className="text-lg font-bold text-success">
                  PKR {teacherShare.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-success/20">
            <div className="h-full w-[70%] rounded-full bg-success" />
          </div>
        </div>

        {/* Academy Share */}
        <div className="rounded-lg bg-primary-light p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DollarSign className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium text-primary">Academy Share (30%)</p>
                <p className="text-lg font-bold text-primary">
                  PKR {academyShare.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-primary/20">
            <div className="h-full w-[30%] rounded-full bg-primary" />
          </div>
        </div>
      </div>
    </div>
  );
}
