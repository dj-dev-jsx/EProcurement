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
        Schema::table('tbl_po_details', function (Blueprint $table) {
            if (!Schema::hasColumn('tbl_po_details', 'pr_detail_id')) {
                $table->foreignId('pr_detail_id')->nullable()->constrained('tbl_pr_details')->nullOnDelete()->after('po_id');
            }
            if (!Schema::hasColumn('tbl_po_details', 'item')) {
                $table->string('item')->nullable()->after('pr_detail_id');
            }
            if (!Schema::hasColumn('tbl_po_details', 'specs')) {
                $table->text('specs')->nullable()->after('item');
            }
            if (!Schema::hasColumn('tbl_po_details', 'unit')) {
                $table->string('unit')->nullable()->after('specs');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tbl_po_details', function (Blueprint $table) {
            if (Schema::hasColumn('tbl_po_details', 'unit')) {
                $table->dropColumn('unit');
            }
            if (Schema::hasColumn('tbl_po_details', 'specs')) {
                $table->dropColumn('specs');
            }
            if (Schema::hasColumn('tbl_po_details', 'item')) {
                $table->dropColumn('item');
            }
            if (Schema::hasColumn('tbl_po_details', 'pr_detail_id')) {
                $table->dropConstrainedForeignId('pr_detail_id');
            }
        });
    }
};
