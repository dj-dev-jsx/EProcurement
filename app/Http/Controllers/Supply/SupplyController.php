<?php

namespace App\Http\Controllers\Supply;

use App\Exports\RISExport;
use App\Exports\RISExportMonthly;
use App\Http\Controllers\Controller;
use App\Models\AuditLogs;
use App\Models\Disposed;
use App\Models\Division;
use App\Models\IAR;
use App\Models\ICS;
use App\Models\InspectionCommittee;
use App\Models\InspectionCommitteeMember;
use App\Models\Inventory;
use App\Models\PAR;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderDetail;
use App\Models\PurchaseRequest;
use App\Models\Reissued;
use App\Models\RFQ;
use App\Models\RIS;
use App\Models\Supplier;
use App\Models\Unit;
use Barryvdh\DomPDF\Facade\Pdf;
use Exception;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Illuminate\Support\Str;
use Maatwebsite\Excel\Facades\Excel;

class SupplyController extends Controller
{
public function dashboard()
{
    $totalStock = Inventory::sum('total_stock');
    $pendingDeliveries = PurchaseOrder::where("status", "Not yet Delivered")->count();
    $totalIcs = ICS::count();
    $totalRis = RIS::count();
    $totalIcsHigh = ICS::whereHas('items', fn($q) => $q->where('type', 'high'))->count();
    $totalIcsLow = ICS::whereHas('items', fn($q) => $q->where('type', 'low'))->count();
    $totalPar = PAR::count();
    $totalIssued = $totalIcs + $totalRis + $totalPar;
    $totalPo = PurchaseOrder::count();
    $user = Auth::user();

    // --------------------------
    // Recent Activity
    // --------------------------
    $risActivity = RIS::with(['requestedBy', 'issuedBy', 'items.inventoryItem'])
        ->latest('created_at')->take(10)->get()
        ->flatMap(fn($r) => $r->items->map(fn($item) => [
            'id' => $r->ris_number,
            'action' => "Issued {$item->quantity} {$item->inventoryItem->item_desc}",
            'status' => 'Processed',
            'date' => $item->created_at->format('M d, Y'),
        ]));

    $icsActivity = ICS::with('items.inventoryItem')
        ->latest('created_at')->take(10)->get()
        ->flatMap(fn($i) => $i->items->map(fn($item) => [
            'id' => $i->ics_number,
            'action' => "Received {$item->quantity} {$item->inventoryItem->item_desc}",
            'status' => 'Processed',
            'date' => $item->created_at->format('M d, Y'),
        ]));

    $parActivity = PAR::with('items.inventoryItem')
        ->latest('created_at')->take(10)->get()
        ->flatMap(fn($p) => $p->items->map(fn($item) => [
            'id' => $p->par_number,
            'action' => "Issued {$item->quantity} {$item->inventoryItem->item_desc}",
            'status' => 'Processed',
            'date' => $item->created_at->format('M d, Y'),
        ]));
    // Use left joins so records without RFQ/PR still appear (manual PO flow)
    $risIssued = DB::table('tbl_ris as ris')
        ->join('tbl_purchase_orders as po', 'po.id', '=', 'ris.po_id')
        ->leftJoin('tbl_rfqs as rfq', 'rfq.id', '=', 'po.rfq_id')
        ->leftJoin('tbl_purchase_requests as pr', 'pr.id', '=', 'rfq.pr_id')
        ->leftJoin('tbl_divisions as d', 'd.id', '=', 'pr.division_id')
        ->select(DB::raw('COALESCE(d.division, "Unassigned") as division'), DB::raw('COUNT(ris.id) as total'))
        ->groupBy('division')
        ->get()
        ->map(fn($r) => [
            'division' => $r->division,
            'total' => $r->total,
            'type' => 'RIS',
        ]);

    // 🟩 ICS-issued per division
    $icsIssued = DB::table('tbl_ics as ics')
        ->join('tbl_purchase_orders as po', 'po.id', '=', 'ics.po_id')
        ->leftJoin('tbl_rfqs as rfq', 'rfq.id', '=', 'po.rfq_id')
        ->leftJoin('tbl_purchase_requests as pr', 'pr.id', '=', 'rfq.pr_id')
        ->leftJoin('tbl_divisions as d', 'd.id', '=', 'pr.division_id')
        ->select(DB::raw('COALESCE(d.division, "Unassigned") as division'), DB::raw('COUNT(ics.id) as total'))
        ->groupBy('division')
        ->get()
        ->map(fn($i) => [
            'division' => $i->division,
            'total' => $i->total,
            'type' => 'ICS',
        ]);

    // 🟨 PAR-issued per division
    $parIssued = DB::table('tbl_par as par')
        ->join('tbl_purchase_orders as po', 'po.id', '=', 'par.po_id')
        ->leftJoin('tbl_rfqs as rfq', 'rfq.id', '=', 'po.rfq_id')
        ->leftJoin('tbl_purchase_requests as pr', 'pr.id', '=', 'rfq.pr_id')
        ->leftJoin('tbl_divisions as d', 'd.id', '=', 'pr.division_id')
        ->select(DB::raw('COALESCE(d.division, "Unassigned") as division'), DB::raw('COUNT(par.id) as total'))
        ->groupBy('division')
        ->get()
        ->map(fn($p) => [
            'division' => $p->division,
            'total' => $p->total,
            'type' => 'PAR',
        ]);

    // 🧩 Combine all 3
    $issuedPerDivision = collect()
        ->merge($risIssued)
        ->merge($icsIssued)
        ->merge($parIssued)
        ->groupBy('division')
        ->map(fn($group) => [
            'division' => $group->first()['division'],
            'total' => $group->sum('total'),
            'breakdown' => [
                'RIS' => $group->where('type', 'RIS')->sum('total'),
                'ICS' => $group->where('type', 'ICS')->sum('total'),
                'PAR' => $group->where('type', 'PAR')->sum('total'),
            ],
        ])
        ->values();

    $recentActivity = $risActivity->concat($icsActivity)->concat($parActivity)
        ->sortByDesc(fn($a) => strtotime($a['date']))
        ->take(5)
        ->values();

    // --------------------------
    // Disposed / Reissued Stats
    // --------------------------
    $disposedCount = Disposed::withCount('items')->get()->sum('items_count');
    $reissuedCount = Reissued::withCount('items')->get()->sum('items_count');

    $disposedTotalCost = Disposed::with('items')->get()
        ->sum(fn($d) => $d->items->sum('total_cost'));

    $reissuedTotalCost = Reissued::with('items')->get()
        ->sum(fn($r) => $r->items->sum('total_cost'));

    // --------------------------
    // Dashboard Render
    // --------------------------
    return Inertia::render('Supply/Dashboard', [
        'stats' => [
            [
                'label' => 'Total Stock Items',
                'value' => $totalStock,
                'icon' => 'Boxes',
                'color' => 'bg-blue-100 text-blue-600'
            ],
            [
                'label' => 'Pending Deliveries',
                'value' => $pendingDeliveries,
                'icon' => 'Truck',
                'color' => 'bg-yellow-100 text-yellow-600'
            ],
            [
                'label' => 'Total Issued Items',
                'value' => $totalIssued,
                'icon' => 'PackageCheck',
                'color' => 'bg-green-100 text-green-600'
            ],
            [
                'label' => 'Disposed Items',
                'value' => $disposedCount,
                'icon' => 'Trash2',
                'color' => 'bg-red-100 text-red-600'
            ],
            [
                'label' => 'Reissued Items',
                'value' => $reissuedCount,
                'icon' => 'RefreshCcw',
                'color' => 'bg-teal-100 text-teal-600'
            ],
        ],

        'documents' => [
            [
                'label' => "RIS (Requisition)",
                'value' => $totalRis,
                'icon' => 'ClipboardList',
                'link' => "supply_officer.ris_issuance",
                'color' => "bg-purple-100 text-purple-600"
            ],
            [
                'label' => "ICS (High)",
                'value' => $totalIcsHigh,
                'icon' => 'FileSpreadsheet',
                'link' => "supply_officer.ics_issuance_high",
                'color' => "bg-pink-100 text-pink-600"
            ],
            [
                'label' => "ICS (Low)",
                'value' => $totalIcsLow,
                'icon' => 'FileSpreadsheet',
                'link' => "supply_officer.ics_issuance_low",
                'color' => "bg-indigo-100 text-indigo-600"
            ],
            [
                'label' => "PAR",
                'value' => $totalPar,
                'icon' => 'FileCheck',
                'link' => "supply_officer.par_issuance",
                'color' => "bg-orange-100 text-orange-600"
            ],
            [
                'label' => "Issuance Logs",
                'value' => $totalIssued,
                'icon' => 'Layers',
                'link' => "supply_officer.ris_issuance",
                'color' => "bg-sky-100 text-sky-600"
            ],
        ],
        'issuedPerDivision' => $issuedPerDivision,
        'recentActivity' => $recentActivity,
        'user' => $user
    ]);
}


public function purchase_orders(Request $request)
{
    $search   = $request->input('search');
    $division = $request->input('division');

    $query = PurchaseOrder::with([
        'supplier',
        'details',
        'rfq.purchaseRequest.division',
        'rfq.purchaseRequest.focal_person',
        'iar'
    ]);

    if ($search) {
        $query->where(function ($q) use ($search) {
            $q->where('po_number', 'like', "%{$search}%")
              ->orWhere('requested_by', 'like', "%{$search}%")
              ->orWhereHas('rfq.purchaseRequest.focal_person', function ($q2) use ($search) {
                  $q2->where('firstname', 'like', "%{$search}%")
                      ->orWhere('lastname', 'like', "%{$search}%");
              });
        });
    }

    if ($division) {
        $query->where(function ($q) use ($division) {
            $q->where(function ($q2) use ($division) {
                $q2->whereHas('rfq.purchaseRequest.division', function ($q3) use ($division) {
                    $q3->where('id', $division);
                })
                ->orWhere('requested_by_office', 'like', "%{$division}%");
            });
        });
    }

    $purchaseOrders = $query->orderByDesc('created_at')->paginate(10)->withQueryString();

    return Inertia::render('Supply/PurchaseOrder', [
        'purchaseRequests' => $purchaseOrders,
        'filters' => [
            'search'   => $search,
            'division' => $division,
            'divisions'=> Division::select('id', 'division')->get(),
        ],
    ]);
}

public function create_po($prId = null)
{
    // If a PR id is provided, use the existing RFQ/PR winners flow.
    if ($prId) {
        $pr = PurchaseRequest::with([
            'details.product.unit',
            'focal_person',
            'division'
        ])->findOrFail($prId);

        $rfq = RFQ::with(['details.supplier'])
            ->where('pr_id', $prId)
            ->firstOrFail();

        // Precompute supplier totals (per awarded items)
        $supplierTotals = $rfq->details
            ->groupBy('supplier_id')
            ->map(function ($details) {
                return $details->sum(function ($d) {
                    $unitPrice = $d->unit_price_edited ?? $d->quoted_price ?? 0;
                    $qty       = $d->pr_detail?->quantity ?? 0;
                    return $unitPrice * $qty;
                });
            });

        $winners = $rfq->details
            ->filter(fn($d) => $d->is_winner_as_calculated)
            ->map(function ($winner) use ($pr, $rfq, $supplierTotals) {
                $prDetail  = $pr->details?->firstWhere('id', $winner->pr_details_id);
                $unitPrice = $winner->unit_price_edited ?? $winner->quoted_price ?? 0;
                $quantity  = $prDetail?->quantity ?? 0;

                return [
                    'pr_detail_id'   => $winner->pr_details_id,
                    'item'           => $prDetail?->item ?? 'N/A',
                    'specs'          => $prDetail?->specs ?? '',
                    'quantity'       => $quantity,
                    'unit'           => $prDetail?->unit ?? '',
                    'unit_price'     => $unitPrice,
                    'total_price'    => $unitPrice * $quantity,
                    'supplier_id'    => $winner->supplier_id,
                    'supplier_name'  => $winner->supplier->company_name ?? '',
                    'mode'           => $rfq->mode ?? 'as-read',
                    'supplier_total' => $supplierTotals[$winner->supplier_id] ?? 0,
                ];
            })
            ->values();

        return inertia('Supply/CreatePurchaseOrder', [
            'pr'        => $pr,
            'rfq'       => $rfq,
            'suppliers' => $rfq->details->pluck('supplier')->unique('id')->values(),
            'winners'   => $winners,
        ]);
    }

    // Manual PO creation (no PR/RFQ). Provide supplier list and empty defaults.
    $suppliers = Supplier::select('id', 'company_name')->orderBy('company_name')->get();

    return inertia('Supply/CreatePurchaseOrder', [
        'pr' => null,
        'rfq' => null,
        'suppliers' => $suppliers,
        'winners' => collect([]),
    ]);
}



public function store_po(Request $request)
{
    $request->validate([
        'rfq_id' => 'nullable|exists:tbl_rfqs,id',
        'po_number' => 'required|string|max:255',
        'requested_by' => 'required|string|max:255',
        'requested_by_id' => 'nullable|exists:users,id',
        'requested_by_office' => 'nullable|string|max:255',
        'mode_of_procurement' => 'required|string|max:255',
        'delivery_term' => 'nullable|string|max:255',
        'items' => 'required|array|min:1',
        'items.*.supplier_id' => 'required|exists:tbl_suppliers,id',
        'items.*.pr_detail_id' => 'nullable|exists:tbl_pr_details,id',
        'items.*.item' => 'required|string|max:255',
        'items.*.specs' => 'nullable|string|max:1000',
        'items.*.unit' => 'nullable|string|max:50',
        'items.*.quantity' => 'required|numeric|min:0',
        'items.*.unit_price' => 'required|numeric|min:0',
        'items.*.total_price' => 'required|numeric|min:0',
    ]);

    DB::transaction(function () use ($request) {
        // Determine whether this PO is linked to a PR (has at least one pr_detail_id)
        $firstPrDetail = collect($request->items)->firstWhere('pr_detail_id', '!=', null);

        $purchaseRequest = null;
        if ($firstPrDetail) {
            $firstPrDetailId = $firstPrDetail['pr_detail_id'];
            $purchaseRequest = PurchaseRequest::with(['focal_person', 'details'])
                ->whereHas('details', fn($q) => $q->where('id', $firstPrDetailId))
                ->firstOrFail();
        }

        $itemsBySupplier = collect($request->items)->groupBy('supplier_id');

        $basePoNumber = $request->po_number ?: ($purchaseRequest?->pr_number ?? null);
        $suffix = 'a';

        $rfq = $request->rfq_id ? RFQ::find($request->rfq_id) : null;

        foreach ($itemsBySupplier as $supplierId => $supplierItems) {
            $poNumber = $itemsBySupplier->count() === 1
                ? $basePoNumber
                : $basePoNumber . $suffix++;

            $po = PurchaseOrder::create([
                'po_number' => $poNumber,
                'rfq_id' => $request->rfq_id,
                'requested_by' => $request->requested_by,
                'requested_by_id' => $request->requested_by_id ?? Auth::id(),
                'requested_by_office' => $request->requested_by_office,
                'mode_of_procurement' => $request->mode_of_procurement,
                'delivery_term' => $request->delivery_term,
                'supplier_id' => $supplierId,
                'recorded_by' => Auth::id(),
                'status' => 'Not yet Delivered',
            ]);

            foreach ($supplierItems as $item) {
                $prDetail = $purchaseRequest?->details->firstWhere('id', $item['pr_detail_id']);
                $user = Auth::user();

                // Audit log if quantity differs from PR
                if ($prDetail && $prDetail->quantity != $item['quantity']) {
                    AuditLogs::create([
                        'action' => 'quantity_changed',
                        'entity_type' => 'PurchaseOrder',
                        'entity_id' => $po->id,
                        'changes' => json_encode([
                            'pr_detail_id' => $prDetail->id,
                            'pr_qty' => $prDetail->quantity,
                            'po_qty' => $item['quantity'],
                        ]),
                        'reason' => $item['change_reason'] ?? null,
                        'user_id' => $user->id,
                    ]);
                }

                PurchaseOrderDetail::create([
                    'po_id' => $po->id,
                    'pr_detail_id' => $item['pr_detail_id'] ?? null,
                    'item' => $item['item'] ?? null,
                    'specs' => $item['specs'] ?? null,
                    'unit' => $item['unit'] ?? null,
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'],  // supports edited price
                    'total_price' => $item['total_price'], // already computed on frontend
                ]);

            }
        }
    });

    return redirect()
        ->route('supply_officer.purchase_orders')
        ->with('success', 'Purchase Order(s) successfully created with auditing.');
}

    public function bac_purchase_orders_table(Request $request){
        $search = $request->input('search');
        $division = $request->input('division');

        $query = PurchaseOrder::with([
            'supplier',
            'rfq.purchaseRequest.division',
            'rfq.purchaseRequest.focal_person',
            'iar'
        ]);

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('po_number', 'like', "%{$search}%")
                ->orWhere('requested_by', 'like', "%{$search}%")
                ->orWhereHas('rfq.purchaseRequest.focal_person', function ($q2) use ($search) {
                    $q2->where('firstname', 'like', "%{$search}%")
                        ->orWhere('lastname', 'like', "%{$search}%");
                });
            });
        }

        if ($division) {
            $query->where(function ($q) use ($division) {
                $q->whereHas('rfq.purchaseRequest.division', function ($q2) use ($division) {
                    $q2->where('id', $division);
                })
                ->orWhere('requested_by_office', 'like', "%{$division}%");
            });
        }

        $purchaseOrders = $query->orderByDesc('created_at')->paginate(10)->withQueryString();

        return Inertia::render('BacApprover/PurchaseOrdersTable', [
            'purchaseOrders' => $purchaseOrders,
            'filters' => [
                'search' => $search,
                'division' => $division,
                'divisions' => Division::select('id', 'division')->get(),
            ],
        ]);
    }

        public function purchase_orders_table(Request $request){
        $search = $request->input('search');
        $division = $request->input('division');

        $query = PurchaseOrder::with([
            'supplier',
            'rfq.purchaseRequest.division',
            'rfq.purchaseRequest.focal_person',
            'iar'
        ]);

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('po_number', 'like', "%{$search}%")
                  ->orWhere('requested_by', 'like', "%{$search}%")
                  ->orWhereHas('rfq.purchaseRequest.focal_person', function ($q2) use ($search) {
                      $q2->where('firstname', 'like', "%{$search}%")
                          ->orWhere('lastname', 'like', "%{$search}%");
                  });
            });
        }

        if ($division) {
            $query->where(function ($q) use ($division) {
                $q->where(function ($q2) use ($division) {
                    $q2->whereHas('rfq.purchaseRequest.division', function ($q3) use ($division) {
                        $q3->where('id', $division);
                    })
                    ->orWhere('requested_by_office', 'like', "%{$division}%");
                });
            });
        }

        $purchaseOrders = $query->orderByDesc('created_at')->paginate(10)->withQueryString();

        return Inertia::render('Supply/PurchaseOrdersTable', [
            'purchaseOrders' => $purchaseOrders,
            'filters' => [
                'search' => $search,
                'division' => $division,
                'divisions' => Division::select('id', 'division')->get(),
            ],
        ]);
    }

    public function print_po($id)
    {
        $po = PurchaseOrder::with([
            'rfq.purchaseRequest.focal_person',
            'rfq.purchaseRequest.details.product.unit',
            'supplier',
            'details'
        ])->findOrFail($id);

        $pdf = Pdf::loadView('pdf.purchase_order', compact('po'))
            ->setPaper('A4', 'portrait'); // or 'landscape' if needed

        return $pdf->stream('purchase_order_' . $po->po_number . '.pdf');
    }


    public function record_iar($id){
        $committee = InspectionCommittee::with('members')
        ->where('inspection_committee_status', 'active')
        ->first();
        
        $po = PurchaseOrder::with([
            'supplier',
            'details',
            'rfq.purchaseRequest.details.product.unit'
        ])->findOrFail($id);
        
        $iarNumber = $this->generateIARNumber();
        return Inertia::render('Supply/RecordIar', [
            'po' => $po,
            'inspectionCommittee' => $committee,
            'iarNumber' => $iarNumber
        ]);
    }

private function generateIARNumber()
{
    $year = now()->format('y');
    $month = now()->format('m');

    // Get the latest IAR record for the current year and month
    $lastIAR = IAR::whereYear('created_at', now()->year)
        ->latest('id')
        ->first();

    if ($lastIAR && preg_match('/\d{2}-\d{2}-(\d{3})$/', $lastIAR->iar_number, $matches)) {
        // Extract the last 3 digits and increment by 1
        $lastSeries = (int) $matches[1];
        $nextSeries = $lastSeries + 1;
    } else {
        // No existing record for this month/year
        $nextSeries = 1;
    }

    // Pad with zeros (e.g., 001, 002, 010)
    $series = str_pad($nextSeries, 3, '0', STR_PAD_LEFT);

    // Final format e.g. "25-11-002"
    return "{$year}-{$month}-{$series}";
}

public function store_iar(Request $request)
{
    $po = PurchaseOrder::with([
        'rfq',
        'rfq.purchaseRequest',
        'rfq.purchaseRequest.focal_person',
        'details.prDetail',
    ])->findOrFail($request->po_id);

    $validated = $request->validate([
        'po_id'                      => 'required|exists:tbl_purchase_orders,id',
        'iar_number'                 => 'required|string|max:20',
        'date_received'              => 'required|date',
        'inspection_committee_id'    => 'required|exists:tbl_inspection_committees,id',
        'items'                      => 'required|array|min:1',
        'items.*.po_detail_id'       => 'required|exists:tbl_po_details,id',
        'items.*.pr_details_id'      => 'nullable|exists:tbl_pr_details,id',
        'items.*.product_name'       => 'required|string|max:255',
        'items.*.specs'              => 'required|string|max:255',
        'items.*.unit'               => 'nullable|string|max:50',
        'items.*.quantity_ordered'   => 'required|numeric|min:0',
        'items.*.quantity_received'  => 'required|numeric|min:0',
        'items.*.unit_price'         => 'required|numeric|min:0',
        'items.*.total_price'        => 'required|numeric|min:0',
        'items.*.remarks'            => 'nullable|string|max:255',
    ]);


    $userId = Auth::id();
    // Use requested_by and requested_by_office from PO (the focal person who requested it)
    $requestedByName = $po->requested_by;
    $requestedByOffice = $po->requested_by_office;

    DB::transaction(function () use ($validated, $po, $userId, $requestedByName, $requestedByOffice) {
        $po->update([
            'status' => 'Inspected and Delivered',
        ]);

        foreach ($validated['items'] as $item) {
            $poDetail = $po->details->firstWhere('id', $item['po_detail_id']);
            if (!$poDetail) {
                throw new Exception("Unable to locate PO detail row for item: {$item['product_name']}");
            }

            $prDetail = $poDetail->prDetail;
            $unitName = $poDetail->unit ?? $prDetail?->unit ?? $item['unit'] ?? null;
            if (!$unitName) {
                throw new Exception("Unable to determine unit for item: {$item['product_name']}");
            }

            $unit = Unit::firstOrCreate(['unit' => $unitName]);
            $itemName = trim($item['product_name'] ?: ($poDetail->item ?? $prDetail?->item ?? 'Unknown Item'));
            $specs = trim($item['specs'] ?: ($poDetail->specs ?? $prDetail?->specs ?? ''));
            $description = $specs ? "{$itemName} - {$specs}" : $itemName;
            $quantityReceived = $item['quantity_received'];
            $unitPrice = $item['unit_price'];
            $totalPrice = $quantityReceived * $unitPrice;

            IAR::create([
                'po_id'                   => $validated['po_id'],
                'iar_number'              => $validated['iar_number'],
                'specs'                   => $description,
                'quantity_ordered'        => $item['quantity_ordered'],
                'quantity_received'       => $quantityReceived,
                'unit_id'                 => $unit->id,
                'unit_price'              => $unitPrice,
                'total_price'             => $totalPrice,
                'remarks'                 => $item['remarks'] ?? "",
                'inspection_committee_id' => $validated['inspection_committee_id'],
                'date_received'           => $validated['date_received'],
                'recorded_by'             => $userId,
                'source_type'             => 'po',
            ]);

            Inventory::create([
                'po_detail_id'       => $poDetail->id,
                'recorded_by'        => $userId,
                'requested_by'       => $requestedByName,
                'requested_by_office' => $requestedByOffice,
                'quantity'           => $quantityReceived,
                'unit_id'            => $unit->id,
                'unit_cost'          => $unitPrice,
                'last_received'      => $validated['date_received'],
                'status'             => 'Available',
                'item_desc'          => $description,
                'total_stock'        => $quantityReceived,
                'source_type'        => 'po',
            ]);
        }
    });

    return redirect()
        ->route('supply_officer.iar_table')
        ->with('success', 'Inventory updated successfully.');
}

public function replaceMember(Request $request, $id)
{
    $validated = $request->validate([
        'member_id' => 'required|exists:tbl_inspection_committee_members,id',
        'replacementName' => 'required|string|max:255',
    ]);

    $committee = InspectionCommittee::findOrFail($id);

    $member = InspectionCommitteeMember::where('id', $validated['member_id'])
        ->where('inspection_committee_id', $committee->id)
        ->where('status', 'active')
        ->firstOrFail();

    // deactivate old member
    $member->update(['status' => 'inactive']);

    // create new member
    $newMember = InspectionCommitteeMember::create([
        'inspection_committee_id' => $committee->id,
        'position' => $member->position,
        'name' => $validated['replacementName'],
        'status' => 'active',
    ]);

    return back()->with('success', 'Inspection Committee updated successfully!');
}




public function iar_table(Request $request)
{
    $search = $request->input('search');

    // Fetch all matching IAR rows with relationships
    $iarItems = IAR::with([
        'purchaseOrder.supplier',
        'purchaseOrder.rfq.purchaseRequest.division',
    ])
    ->when($search, function ($query, $search) {
        $query->where('iar_number', 'like', "%$search%")
              ->orWhereHas('purchaseOrder.supplier', function ($q) use ($search) {
                  $q->where('company_name', 'like', "%$search%")
                    ->orWhere('representative_name', 'like', "%$search%");
              });
    })
    ->orderBy('created_at', 'desc')
    ->get();

    // Group by IAR number
    $grouped = $iarItems->groupBy('iar_number')->map(function($group) {
        $first = $group->first();
        return [
            'iar_number'            => $first->iar_number,
            'supplier'              => $first->purchaseOrder->supplier->company_name ?? 'N/A',
            'division'              => $first->purchaseOrder->requested_by_office ?? $first->purchaseOrder->rfq?->purchaseRequest->division->division ?? 'N/A',
            'inspection_committee'  => $first->inspection_committee_id ?? 'N/A',
            'items'                 => $group->pluck('specs')->toArray(), // ✅ send all specs
            'totalPrice'            => $group->sum(fn($item) => ($item->quantity_received ?? 0) * ($item->unit_price ?? 0)),
            'id'                    => $first->id,
        ];
    })->values();

    // Manual pagination
    $page = $request->input('page', 1);
    $perPage = 10;
    $paginated = new \Illuminate\Pagination\LengthAwarePaginator(
        $grouped->forPage($page, $perPage),
        $grouped->count(),
        $perPage,
        $page,
        ['path' => url()->current(), 'query' => $request->query()]
    );

    return Inertia::render('Supply/TableIar', [
        'iarData' => $paginated,
        'filters' => ['search' => $search],
    ]);
}



public function print_iar($id)
{
    $committee = InspectionCommittee::with('members')
        ->where('inspection_committee_status', 'active')
        ->first();

    $sampleIar = IAR::with([
        'purchaseOrder.supplier',
        'purchaseOrder.rfq.purchaseRequest.division',
    ])->findOrFail($id);

    $iarItems = IAR::with(['unit'])
        ->where('iar_number', $sampleIar->iar_number)
        ->get();

    $pdf = Pdf::loadView('pdf.print_iar', [
        'iarData' => $sampleIar,
        'iarItems' => $iarItems,
        'inspectors' => $committee,
    ])->setPaper('A4', 'portrait');

    return $pdf->stream('IAR-'.$sampleIar->iar_number.'.pdf');
}
public function inventory(Request $request)
{
    $search = $request->input('search');
    $status = $request->input('status');
    $dateReceived = $request->input('date_received');

    $inventory = Inventory::with([
        'recordedBy',
        'unit',
        'poDetail.purchaseOrder.supplier', // ✅ load purchase order & supplier
        'poDetail.prDetail.product',
    ])->latest('created_at')->when($search, function ($query, $search) {
        $query->where(function ($q) use ($search) {
            $q->where('item_desc', 'like', "%$search%")
              ->orWhere('requested_by', 'like', "%$search%")
              ->orWhere('requested_by_office', 'like', "%$search%");
        });
    })
    ->when($status, fn($q) => $q->where('status', $status))
    ->when($dateReceived, fn($q) => $q->whereDate('last_received', $dateReceived))
    ->paginate(10)
    ->withQueryString();
    return Inertia::render('Supply/Inventory', [
        'inventoryData' => $inventory,
        'filters' => [
            'search' => $search,
            'status' => $status,
            'date_received' => $dateReceived,
        ],
    ]);
}

public function suppliers(Request $request)
{
    $search = $request->input('search');

    $suppliers = Supplier::when($search, function ($query, $search) {
        $query->where('company_name', 'like', "%$search%")
              ->orWhere('representative_name', 'like', "%$search%");
    })
    ->orderBy('company_name')
    ->paginate(10)
    ->withQueryString();

    return Inertia::render('Supply/Suppliers', [
        'records' => $suppliers,
        'filters' => [
            'search' => $search,
        ],
    ]);
}

    public function update_supplier(Request $request, $id)
    {
        // Validate the incoming data
        $validatedData = $request->validate([
            'company_name' => 'required|string|max:255',
            'address' => 'required|string|max:255',
            'tin_num' => 'required|string|max:50',
            'representative_name' => 'required|string|max:255',
            'contact_number' => 'nullable|string|max:15',
            'email' => 'nullable|email|max:255',
        ]);

        // Find the supplier by ID
        $supplier = Supplier::find($id);

        if (!$supplier) {
            return redirect()->back()->with('error', 'Supplier not found.');
        }

        // Update supplier data
        $supplier->company_name = $validatedData['company_name'];
        $supplier->address = $validatedData['address'];
        $supplier->tin_num = $validatedData['tin_num'];
        $supplier->representative_name = $validatedData['representative_name'];
        $supplier->contact_number = $validatedData['contact_number'] ?? $supplier->contact_number;
        $supplier->email = $validatedData['email'] ?? $supplier->email;

        // Save the changes
        $supplier->save();

        // Return success response
        return redirect()->route('supply_officer.suppliers')->with('success', 'Supplier updated successfully!');
    }
        public function delete_supplier($id)
    {
        // Find the supplier by ID
        $supplier = Supplier::find($id);

        if (!$supplier) {
            return redirect()->back()->with('error', 'Supplier not found.');
        }

        // Mark supplier as inactive
        $supplier->status = 'inactive';  // Assuming you have a 'status' field in your suppliers table
        $supplier->save();

        // Return success response
        return redirect()->route('supply_officer.suppliers')->with('success', 'Supplier marked as inactive.');
    }

    public function activate_supplier($id)
    {
        // Find the supplier by ID
        $supplier = Supplier::find($id);

        if (!$supplier) {
            return redirect()->back()->with('error', 'Supplier not found.');
        }

        // Mark supplier as inactive
        $supplier->status = 'active';  // Assuming you have a 'status' field in your suppliers table
        $supplier->save();

        // Return success response
        return redirect()->route('supply_officer.suppliers')->with('success', 'Supplier marked as active.');
    }

    public function add_supplier(Request $request)
    {
        // ✅ Validate inputs
        $validated = $request->validate([
            'company_name' => 'required|string|max:255',
            'address' => 'required|string|max:255',
            'tin_num' => 'required|string|max:50|unique:tbl_suppliers,tin_num',
            'representative_name' => 'required|string|max:255',
            'contact_number' => 'nullable|string|max:15',
            'email' => 'nullable|email|max:255|unique:tbl_suppliers,email',
        ]);

        // ✅ Use Eloquent create() method (mass assignment)
        $supplier = Supplier::create([
            'company_name' => $validated['company_name'],
            'address' => $validated['address'],
            'tin_num' => $validated['tin_num'],
            'representative_name' => $validated['representative_name'],
            'contact_number' => $validated['contact_number'] ?? null,
            'email' => $validated['email'] ?? null,
            'status' => 'active', // default active
        ]);

        // ✅ Redirect with message
        return redirect()
            ->route('supply_officer.suppliers')
            ->with('success', "{$supplier->company_name} has been successfully added.");
    }



}
