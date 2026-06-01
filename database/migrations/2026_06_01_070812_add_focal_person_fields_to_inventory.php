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
        Schema::table('tbl_inventory', function (Blueprint $table) {
            // Drop the existing foreign key constraint on requested_by if it exists
            try {
                $table->dropForeign(['requested_by']);
            } catch (\Exception $e) {
                // Foreign key might not exist
            }
        });

        Schema::table('tbl_inventory', function (Blueprint $table) {
            // Change requested_by from integer (FK) to string (text field)
            // This will store the PO's requested_by value (name)
            $table->string('requested_by')->nullable()->change();
        });

        Schema::table('tbl_inventory', function (Blueprint $table) {
            // Add requested_by_office field if it doesn't exist
            if (!Schema::hasColumn('tbl_inventory', 'requested_by_office')) {
                $table->string('requested_by_office')->nullable();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tbl_inventory', function (Blueprint $table) {
            if (Schema::hasColumn('tbl_inventory', 'requested_by_office')) {
                $table->dropColumn('requested_by_office');
            }
        });

        Schema::table('tbl_inventory', function (Blueprint $table) {
            // Revert requested_by back to integer (FK)
            $table->foreignId('requested_by')->nullable()->constrained('users')->restrictOnDelete()->change();
        });
    }
};
