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
        Schema::table('orders', function (Blueprint $table) {
            $table->foreignId('bill_id')->nullable()->after('cafe_table_id')->constrained()->nullOnDelete();
            $table->timestamp('served_at')->nullable()->after('ordered_at');
            $table->timestamp('completed_at')->nullable()->after('served_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropConstrainedForeignId('bill_id');
            $table->dropColumn(['served_at', 'completed_at']);
        });
    }
};
