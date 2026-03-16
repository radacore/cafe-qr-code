<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cafe_floors', function (Blueprint $table) {
            $table->id();
            $table->string('name', 80);
            $table->unsignedInteger('floor_number')->unique();
            $table->unsignedInteger('indoor_table_count')->default(0);
            $table->unsignedInteger('outdoor_table_count')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cafe_floors');
    }
};
