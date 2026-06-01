<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('tbl_purchase_orders', function (Blueprint $table) {
            if (!Schema::hasColumn('tbl_purchase_orders', 'rfq_id')) {
                $table->foreignId('rfq_id')->nullable()->constrained('tbl_rfqs')->nullOnDelete()->after('po_number');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tbl_purchase_orders', function (Blueprint $table) {
            if (Schema::hasColumn('tbl_purchase_orders', 'rfq_id')) {
                $table->dropConstrainedForeignId('rfq_id');
            }
        });
    }
};
