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
            if (!Schema::hasColumn('tbl_purchase_orders', 'requested_by')) {
                $table->string('requested_by')->nullable()->after('supplier_id');
            }

            if (!Schema::hasColumn('tbl_purchase_orders', 'requested_by_office')) {
                $table->string('requested_by_office')->nullable()->after('requested_by');
            }

            if (Schema::hasColumn('tbl_purchase_orders', 'user_id')) {
                $table->dropForeign(['user_id']);
                $table->dropColumn('user_id');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tbl_purchase_orders', function (Blueprint $table) {
            if (!Schema::hasColumn('tbl_purchase_orders', 'user_id')) {
                $table->foreignId('user_id')->constrained('users')->restrictOnDelete()->after('supplier_id');
            }

            if (Schema::hasColumn('tbl_purchase_orders', 'requested_by_office')) {
                $table->dropColumn('requested_by_office');
            }

            if (Schema::hasColumn('tbl_purchase_orders', 'requested_by')) {
                $table->dropColumn('requested_by');
            }
        });
    }
};
