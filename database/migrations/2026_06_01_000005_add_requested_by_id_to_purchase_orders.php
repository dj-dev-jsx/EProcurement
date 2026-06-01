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
            $table->unsignedBigInteger('requested_by_id')->nullable()->after('requested_by');
            $table->foreign('requested_by_id')->references('id')->on('users')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tbl_purchase_orders', function (Blueprint $table) {
            $table->dropForeign(['requested_by_id']);
            $table->dropColumn('requested_by_id');
        });
    }
};
