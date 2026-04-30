import { useForm, Head, router } from "@inertiajs/react";
import SupplyOfficerLayout from "@/Layouts/SupplyOfficerLayout";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useState, useMemo } from "react";
import {
  ClipboardSignature,
  CalendarCheck,
  Package,
  Boxes,
  MessageSquareText,
  Save,
  ScanLine,
  Users,
  AlertTriangle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const LabeledInput = ({ label, icon, children, error }) => (
  <div className="space-y-2">
    <Label className="flex items-center gap-2 text-sm font-medium text-slate-700">
      {icon}
      {label}
    </Label>
    {children}
    {error && <p className="text-xs text-red-500">{error}</p>}
  </div>
);

const getTodayDate = () => {
  const d = new Date();
  return d.toISOString().split("T")[0];
};

export default function RecordIar({
  po,
  inspectionCommittee,
  iarNumber,
}) {
  const { toast } = useToast();

  const { data, setData, post, processing, errors } = useForm({
    po_id: po.id,
    iar_number: iarNumber ?? "",
    date_received: getTodayDate(),
    inspection_committee_id: inspectionCommittee?.id || "",
    items: (po.details || []).map((detail) => {
      const prDetail =
        po.rfq?.purchase_request?.details?.find(
          (pr) => pr.id === detail.pr_detail_id
        );

      return {
        pr_details_id: detail.pr_detail_id,
        product_name: prDetail?.item || "Unknown Item",
        specs: prDetail?.specs || "",
        quantity_ordered: Number(detail.quantity || 0),
        unit_price: Number(detail.unit_price || 0),
        quantity_received: "",
        remarks: "",
        total_price: 0,
      };
    }),
    committee_members:
      inspectionCommittee?.members || [],
  });

  const [confirmDialogOpen, setConfirmDialogOpen] =
    useState(false);

  const handleItemChange = (index, field, value) => {
    setData(
      "items",
      data.items.map((item, i) => {
        if (i !== index) return item;

        let updated = { ...item };

        if (field === "quantity_received") {
          let qty = Number(value || 0);

          if (qty < 1) qty = 1;
          if (qty > item.quantity_ordered)
            qty = item.quantity_ordered;

          updated.quantity_received = qty;
          updated.total_price =
            qty * updated.unit_price;
        }

        if (field === "remarks") {
          updated.remarks = value;
        }

        return updated;
      })
    );
  };

  const grandTotal = useMemo(() => {
    return data.items.reduce(
      (sum, item) => sum + item.total_price,
      0
    );
  }, [data.items]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setConfirmDialogOpen(true);
  };

  const handleConfirmSave = () => {
    post(route("supply_officer.store_iar"), {
      preserveScroll: true,
      onSuccess: () => {
        setConfirmDialogOpen(false);
        toast({
          title: "Saved",
          description:
            "Inspection report recorded successfully.",
        });
      },
    });
  };

  return (
    <SupplyOfficerLayout header="Record Inspection and Acceptance">
      <Head title="Record IAR" />

      <div className="min-h-screen bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">

          {/* HEADER */}
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Record Inspection & Acceptance
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Purchase Order #{po.po_number}
            </p>
          </div>

          {/* ERROR BOX */}
          {Object.keys(errors).length > 0 && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4">
              <div className="flex gap-2 text-red-700 font-medium">
                <AlertTriangle size={18} />
                Please review the form.
              </div>
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="space-y-6"
          >
            {/* TOP GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* FORM DETAILS */}
              <Card className="lg:col-span-2 rounded-2xl shadow-sm border-0">
                <CardContent className="p-5 space-y-5">

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                    <LabeledInput
                      label="IAR Number"
                      icon={<ScanLine size={16} />}
                      error={errors.iar_number}
                    >
                      <Input
                        value={data.iar_number}
                        onChange={(e) =>
                          setData(
                            "iar_number",
                            e.target.value
                          )
                        }
                        placeholder="Enter IAR Number"
                        className="h-11 rounded-xl"
                      />
                    </LabeledInput>

                    <LabeledInput
                      label="Date Received"
                      icon={
                        <CalendarCheck size={16} />
                      }
                      error={errors.date_received}
                    >
                      <Input
                        type="date"
                        max={getTodayDate()}
                        value={data.date_received}
                        onChange={(e) =>
                          setData(
                            "date_received",
                            e.target.value
                          )
                        }
                        className="h-11 rounded-xl"
                      />
                    </LabeledInput>
                  </div>
                </CardContent>
              </Card>

              {/* TOTAL */}
              <Card className="rounded-2xl border-0 shadow-sm bg-slate-900 text-white">
                <CardContent className="p-6">
                  <p className="text-sm opacity-70">
                    Grand Total
                  </p>
                  <h2 className="text-3xl font-bold mt-2 break-words">
                    ₱
                    {grandTotal.toLocaleString(
                      "en-US",
                      {
                        minimumFractionDigits: 2,
                      }
                    )}
                  </h2>
                </CardContent>
              </Card>
            </div>

            {/* ITEMS */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-800">
                Received Items
              </h2>

              {data.items.map((item, index) => {
                const discrepancy =
                  Number(
                    item.quantity_received || 0
                  ) !== item.quantity_ordered &&
                  item.quantity_received !== "";

                return (
                  <Card
                    key={item.pr_details_id}
                    className="rounded-2xl shadow-sm border-0"
                  >
                    <CardContent className="p-5 space-y-4">

                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div>
                          <h3 className="font-semibold text-slate-900">
                            {item.product_name}
                          </h3>
                          <p className="text-sm text-slate-500">
                            {item.specs}
                          </p>
                        </div>

                        <div className="text-sm font-medium text-slate-700">
                          ₱
                          {item.unit_price.toLocaleString()}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                        <LabeledInput
                          label="Ordered"
                          icon={<Package size={15} />}
                        >
                          <Input
                            readOnly
                            value={
                              item.quantity_ordered
                            }
                            className="rounded-xl bg-slate-100"
                          />
                        </LabeledInput>

                        <LabeledInput
                          label="Received"
                          icon={<Boxes size={15} />}
                          error={
                            errors[
                              `items.${index}.quantity_received`
                            ]
                          }
                        >
                          <Input
                            type="number"
                            min="1"
                            value={
                              item.quantity_received
                            }
                            onChange={(e) =>
                              handleItemChange(
                                index,
                                "quantity_received",
                                e.target.value
                              )
                            }
                            className="rounded-xl"
                          />
                        </LabeledInput>

                        <LabeledInput
                          label="Total"
                          icon={<ClipboardSignature size={15} />}
                        >
                          <Input
                            readOnly
                            value={`₱${item.total_price.toLocaleString(
                              "en-US",
                              {
                                minimumFractionDigits: 2,
                              }
                            )}`}
                            className="rounded-xl bg-slate-100"
                          />
                        </LabeledInput>
                      </div>

                      <LabeledInput
                        label="Remarks"
                        icon={
                          <MessageSquareText
                            size={15}
                          />
                        }
                      >
                        <Textarea
                          rows={3}
                          placeholder="Optional remarks..."
                          value={item.remarks}
                          onChange={(e) =>
                            handleItemChange(
                              index,
                              "remarks",
                              e.target.value
                            )
                          }
                          className="rounded-xl"
                        />
                      </LabeledInput>

                      {discrepancy && (
                        <p className="text-sm text-amber-600 font-medium">
                          Quantity differs from
                          ordered amount.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* COMMITTEE */}
            <Card className="rounded-2xl shadow-sm border-0">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Users size={18} />
                  <h2 className="font-semibold">
                    Inspection Committee
                  </h2>
                </div>

                <div className="grid gap-3">
                  {data.committee_members
                    ?.filter(
                      (m) =>
                        m.status === "active"
                    )
                    .map((member) => (
                      <div
                        key={member.id}
                        className="rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                      >
                        <div>
                          <p className="font-medium">
                            {member.name}
                          </p>
                          <p className="text-sm text-slate-500">
                            {member.position}
                          </p>
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-xl"
                        >
                          Replace
                        </Button>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            {/* ACTION */}
            <div className="sticky bottom-4 z-20">
              <div className="bg-white border shadow-lg rounded-2xl p-3 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                <p className="text-sm text-slate-500">
                  Review all entries before saving.
                </p>

                <Button
                  type="submit"
                  disabled={processing}
                  className="rounded-xl h-11 px-6 w-full sm:w-auto"
                >
                  <Save size={16} className="mr-2" />
                  {processing
                    ? "Saving..."
                    : "Save Report"}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* CONFIRM */}
      <Dialog
        open={confirmDialogOpen}
        onOpenChange={setConfirmDialogOpen}
      >
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>
              Confirm Save
            </DialogTitle>
            <DialogDescription>
              Save this inspection report?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setConfirmDialogOpen(false)
              }
            >
              Cancel
            </Button>

            <Button
              onClick={handleConfirmSave}
              disabled={processing}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SupplyOfficerLayout>
  );
}