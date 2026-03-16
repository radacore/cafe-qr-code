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
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cafe_table_id')->constrained()->cascadeOnDelete();
            $table->string('order_number', 40)->unique();
            $table->string('customer_name', 100)->nullable();
            $table->text('customer_note')->nullable();
            $table->string('status', 30)->default('pending')->index();
            $table->decimal('total_amount', 10, 2)->default(0);
            $table->timestamp('ordered_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
