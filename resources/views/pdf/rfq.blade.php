<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Request for Quotation</title>

<style>
@page{
    size:A4 portrait;
    margin:10mm;
}

body{
    font-family:"Times New Roman", serif;
    font-size:10px;
    line-height:1.05;
    color:#000;
    margin:0;
}

h2,h3,p{
    margin:0;
    padding:0;
}

h2{
    font-size:11px;
    font-weight:bold;
    text-transform:uppercase;
}

h3{
    font-size:10px;
    font-weight:bold;
    text-transform:uppercase;
}

.text-center{text-align:center;}
.text-right{text-align:right;}
.text-left{text-align:left;}
.font-bold{font-weight:bold;}

.table{
    width:100%;
    border-collapse:collapse;
    table-layout:fixed;
    font-size:9px;
    margin-top:5px;
}

.table th,
.table td{
    border:1px solid #000;
    padding:2px;
    vertical-align:top;
    word-wrap:break-word;
}

.table th{
    font-size:9px;
}

.item-row td{
    height:16px;
}

.footer{
    width:100%;
    font-size:8px;
    margin-top:10px;
}

.footer td{
    border:none;
}

.no-border{
    border:none !important;
}
</style>
</head>

<body>

<div class="text-center">
    <img src="{{ $logo }}" style="width:45px; margin-bottom:2px;">

    <h2>
        Republic of the Philippines<br>
        Department of Education<br>
        Region II – Cagayan Valley<br>
        Schools Division Office of the City of Ilagan
    </h2>

    <div style="border-top:1px solid #000; margin:3px 0;"></div>

    <h3>Bids and Awards Committee</h3>
    <h3>Request for Quotation</h3>
</div>

<table style="width:100%; font-size:10px; margin-top:4px;">
<tr>
    <td width="70%"></td>
    <td class="text-right">BAC CN: {{ $bac_cn }}</td>
</tr>
<tr>
    <td></td>
    <td class="text-right">Date: __________</td>
</tr>
</table>

<div style="margin-top:5px; font-size:9px;">
    <strong>To all Eligible Suppliers:</strong>
    <ol type="I" style="margin:2px 0 0 15px; padding:0;">
        <li>Please quote your lowest price inclusive of VAT on the items listed below, subject to the Terms and Conditions of this RFQ and submit your quotation IN SEALED ENVELOPE duly signed by your representative not later than scheduled opening of quotation on ________________, to the BAC Secretariat at the DepEd City Division Office, Alibagu, Ilagan, Isabela.</li>
        <li>Prospective Supplier shall be responsible to verify/clarify the quoted item/s services at the address and telephone number cited above.</li>
        <li>Supplier with complete quotation and total quotation price is equal or less than the Approved Budget for the Contract shall only be appreciated.</li>
    </ol>
</div>

@php
$chair = $committee->members->firstWhere('position', 'chair');
@endphp

<div class="text-right" style="margin-top:5px;">
    <span style="display:inline-block; text-decoration:underline; min-width:180px;">
        {{ strtoupper(optional($chair)->name ?? '__________________') }}
    </span><br>
    BAC Chairperson
</div>

<table class="table text-center">

<thead>
<tr>
    <th colspan="5"></th>
    <th>Qty</th>
    <th>Unit</th>
    <th>Estimated Unit Cost</th>
    <th>Bid Price per Unit</th>
    <th>Total Bid Price</th>
</tr>
</thead>

<tbody>

<tr>
<td colspan="5" class="text-left" style="border-bottom:none">Services to be provided: <strong>{{ $services }}</strong></td>
<td style="border-bottom:none; border-top:none"></td><td style="border-bottom:none; border-top:none"></td><td style="border-bottom:none; border-top:none"></td><td style="border-bottom:none; border-top:none"></td><td style="border-bottom:none; border-top:none"></td>
</tr>

<tr>
<td colspan="5" class="text-left" style="border-bottom:none; border-top:none">Location: <strong>{{ $location }}</strong></td>
<td style="border-bottom:none; border-top:none"></td><td style="border-bottom:none; border-top:none"></td><td style="border-bottom:none; border-top:none"></td><td style="border-bottom:none; border-top:none"></td><td style="border-bottom:none; border-top:none"></td>
</tr>

<tr>
<td colspan="5" class="text-left" style="border-bottom:none; border-top:none">Subject: <strong>{{ $subject }}</strong></td>
<td style="border-bottom:none; border-top:none"></td><td style="border-bottom:none; border-top:none"></td><td style="border-bottom:none; border-top:none"></td><td style="border-bottom:none; border-top:none"></td><td style="border-bottom:none; border-top:none"></td>
</tr>

<tr>
<td colspan="5" class="text-left" style="border-bottom:none; border-top:none">Delivery Period: <strong>{{ $delivery_period }}</strong></td>
<td style="border-bottom:none; border-top:none"></td><td style="border-bottom:none; border-top:none"></td><td style="border-bottom:none; border-top:none"></td><td style="border-bottom:none; border-top:none"></td><td style="border-bottom:none; border-top:none"></td>
</tr>

<tr>
<td colspan="5" class="text-left" style="border-bottom:none; border-top:none">Approved Budget for the Contract (ABC): <strong>{{ $abc }}</strong></td>
<td style="border-bottom:none; border-top:none"></td><td style="border-bottom:none; border-top:none"></td><td style="border-bottom:none; border-top:none"></td><td style="border-bottom:none; border-top:none"></td><td style="border-bottom:none; border-top:none"></td>
</tr>

{{-- ITEMS --}}
@foreach($details as $item)
<tr class="item-row">
    <td colspan="5" class="font-bold text-left">
        {{ $item['item'] . ' ' . ($item['specs'] ?? '') }}
    </td>
    <td>
        {{ isset($item['quantity']) 
            ? (fmod($item['quantity'], 1) == 0 
                ? number_format($item['quantity'], 0) 
                : rtrim(rtrim(number_format($item['quantity'], 2), '0'), '.'))
            : '' }}
    </td>
    <td>{{ $item['unit'] ?? '' }}</td>
    <td></td>
    <!-- {{ number_format($item['unit_price'],2) }} -->
    <td>&nbsp;</td>
    <td>&nbsp;</td>
</tr>
@endforeach

<tr>
<td colspan="9" class="font-bold text-center">TOTAL:</td>
<td></td>
</tr>

<tr>
<td colspan="10" class="text-left font-bold">SDO City Of Ilagan</td>
</tr>

<tr>
<td colspan="2" class="text-left">Supplier's Company Name:</td>
<td colspan="4"></td>
<td colspan="2">TIN</td>
<td colspan="2"></td>
</tr>

<tr>
<td colspan="2" class="text-left">Address:</td>
<td colspan="8"></td>
</tr>

<tr>
<td colspan="2" class="text-left">Contact Number:</td>
<td colspan="4"></td>
<td colspan="2">Fax No.</td>
<td colspan="2">E-mail</td>
</tr>

<tr>
<td colspan="2" class="text-left">Supplier's Authorized Representative Signature Over Printed Name:</td>
<td colspan="4"></td>
<td colspan="2">Date:</td>
<td colspan="2"></td>
</tr>

<tr>
<td colspan="2" class="text-left">Canvasser:</td>
<td colspan="8"></td>
</tr>

</tbody>
</table>

<p style="margin-top:8px; text-align:center; font-style:italic; font-size:9px;">
This is to submit our price quotations as indicated above subject to the terms and conditions of this RFQ.
</p>

<table class="footer">
<tr>

<td style="width:40%;">
    <img src="file://{{ public_path('deped-matatag.png') }}" style="height:45px;">
    <img src="file://{{ public_path('bagong-pilipinas.png') }}" style="height:45px;">
    <img src="file://{{ public_path('ilagan.png') }}" style="height:45px;">
    <div>ASDS-QF-003</div>
</td>

<td style="width:60%; text-align:right;">
    <strong>INHS Compound, Claravall St., San Vicente, City of Ilagan, Isabela</strong><br>
    Telephone Nos: (078) 624-0077<br>
    www.facebook.com/sdoilagan &nbsp; ilagan@deped.gov.ph &nbsp; www.sdoilagan.gov.ph<br>
    Rev:00
</td>

</tr>
</table>

</body>
</html>