<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Purchase Order</title>

    <style>
        body { 
            font-family: "Times New Roman", Times, serif; 
            font-size: 12px; 
            color: black; 
            border: 1px solid; 
            padding: 10px; 
        }

        .text-center { text-align: center; }
        .text-left { text-align: left; }
        .text-right { text-align: right; }
        .font-bold { font-weight: bold; }
        .font-semibold { font-weight: bold; }
        .underline { text-decoration: underline; }
        .nowrap { white-space: nowrap; }

        table { 
            width: 100%; 
            border-collapse: collapse; 
            font-size: 10px; /* ✅ optimized for 20–30 items */
        }

        td, th { 
            padding: 2px; /* ✅ tighter spacing */
            vertical-align: middle;
            line-height: 1.1; /* ✅ compact rows */
        }

        .with-border td, 
        .with-border th { 
            border: 1px solid black; 
        }

        tr { height: auto; }

        .desc {
            word-wrap: break-word;
            white-space: normal;
            line-height: 1.1;
        }

        .signature-line {
            display:inline-block; 
            border-bottom:1px solid black; 
            min-width:180px; 
            text-align:center;
            padding: 0 10px;
        }
    </style>
</head>

<body>

<div class="text-center font-bold" style="font-size:16px; margin-bottom:30px; margin-top:30px;">
    PURCHASE ORDER
</div>

<table>

    <tr class="with-border">
        <td style="border-bottom: none !important;" colspan="3">
            Supplier: <span class="underline font-semibold">{{ $po->supplier->company_name }}</span>
        </td>
        <td style="border-bottom: none !important;" colspan="3">
            PO No.: <span class="underline font-semibold">{{ $po->po_number }}</span>
        </td>
    </tr>

    <tr class="with-border">
        <td style="border-bottom: none !important; border-top: none !important;" colspan="3">
            Address: <span class="underline font-semibold">{{ $po->supplier->address }}</span>
        </td>
        <td style="border-bottom: none !important; border-top: none !important;" colspan="3">
            Date: <span class="underline font-semibold">{{ \Carbon\Carbon::parse($po->created_at)->format('m/d/Y') }}</span>
        </td>
    </tr>

    <tr class="with-border">
        <td style="border-top: none !important;" colspan="3">
            TIN: <span class="underline font-semibold">{{ $po->supplier->tin_num }}</span>
        </td>
        <td style="border-top: none !important;" colspan="3">
            Mode of Procurement: <span class="underline font-semibold">{{ $po->mode_of_procurement }}</span>
        </td>
    </tr>

    <tr style="font-size:11px; border-left:1px solid; border-right:1px solid;">
        <td colspan="6">
            <span class="font-bold">Gentlemen:</span>
            Please furnish this Office the following articles subject to the terms and conditions contained herein:
        </td>
    </tr>

    <tr class="with-border">
        <td style="border-bottom: none !important;" colspan="3">
            Place of Delivery: <span class="underline font-semibold">SDO CITY OF ILAGAN</span>
        </td>
        <td style="border-bottom: none !important;" colspan="3">
            Delivery Term: <span class="underline font-semibold">{{ $po->delivery_term }}</span>
        </td>
    </tr>

    <tr class="with-border">
        <td colspan="3" style="border-bottom: none !important; border-top: none !important;">
            Date of Delivery: <span class="underline font-semibold"></span>
        </td>
        <td colspan="3" style="border-bottom: none !important; border-top: none !important;">
            Payment Term: <span class="underline font-semibold">n30</span>
        </td>
    </tr>

    <!-- HEADER -->
    <tr class="text-center font-bold with-border">
        <td style="width:2%">Stock/Property No.</td>
        <td>Unit</td>
        <td style="width:42%">Description</td>
        <td>Quantity</td>
        <td>Unit Cost</td>
        <td>Amount</td>
    </tr>

    @php $total = 0; @endphp

    <!-- ITEMS -->
    @foreach($po->details as $item)
        @php
            $prDetail = $po->rfq?->purchaseRequest?->details->firstWhere('id', $item->pr_detail_id);
            $itemName = $prDetail?->item ?? '-';
            $specs = $prDetail?->specs ?? '-';
            $unit = $prDetail?->unit ?? $item->unit ?? '-';
            $total += $item->total_price;
        @endphp

        <tr class="text-center with-border">
            <td></td>
            <td>{{ $unit }}</td>
            <td class="text-left desc">
                {{ $itemName }} - {{ $specs }}
            </td>
            <td>{{ $item->quantity }}</td>
            <td>{{ number_format($item->unit_price, 2) }}</td>
            <td>{{ number_format($item->total_price, 2) }}</td>
        </tr>
    @endforeach

    <!-- TOTAL -->
    <tr class="text-center with-border">
        <td colspan="2">(Total Amount in Words)</td>
        <td colspan="2"></td>
        <td class="font-bold">Total:</td>
        <td>{{ number_format($total, 2) }}</td>
    </tr>

    <!-- FOOTER -->
    <tr class="with-border">
        <td colspan="6">
            <p style="font-size: 10px;">
                In case of failure to make the full delivery within the time specified above,
                a penalty of one-tenth (1/10) of one percent for every day of delay shall be
                imposed on the undelivered item/s.
            </p>
        </td>
    </tr>

    <!-- SIGNATURES (UNCHANGED STRUCTURE) -->
    <tr class="with-border">
        <td colspan="4" style="border-right:none;font-weight:bold; padding-left: 100px; border-bottom: none !important;">
            Conforme <span style="padding-left: 250px">Very truly yours,</span>
        </td>
        <td colspan="2" style="border-left:none; border-bottom: none !important;"></td>
    </tr>

    <tr class="with-border">
        <td colspan="3" class="text-center" style="height: 5%; border-top: none !important; border-right:none !important;">______________________________</td>
        <td colspan="3" class="text-center underline" style="border-top: none !important; border-left:none !important;">
            EDUARDO C. ESCORPISO JR., EdD, CESO V
        </td>
    </tr>

    <tr class="with-border">
        <td colspan="3" class="text-center">Signature Over Printed Name of Supplier</td>
        <td colspan="3" class="text-center">Signature Over Printed Name of Authorized Official</td>
    </tr>

    <tr class="with-border">
        <td colspan="3" class="text-center">______________________________</td>
        <td colspan="3" class="text-center underline">Schools Division Superintendent</td>
    </tr>

    <tr class="with-border">
        <td colspan="3" class="text-center">Date</td>
        <td colspan="3" class="text-center">Designation</td>
    </tr>

    <!-- remaining footer unchanged -->
    <tr class="with-border">
        <td colspan="6" style="font-size:10px;">
            Fund Cluster: ______________________ | ORS/BURS No.: ______________________
        </td>
    </tr>

</table>

</body>
</html>