<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cafe_tables', function (Blueprint $table) {
            $table->foreignId('cafe_floor_id')->nullable()->after('id')->constrained('cafe_floors')->nullOnDelete();
            $table->string('area_type', 20)->default('indoor')->after('name')->index();
        });

        $defaultFloorId = DB::table('cafe_floors')->where('floor_number', 1)->value('id');

        if (! $defaultFloorId) {
            $defaultFloorId = DB::table('cafe_floors')->insertGetId([
                'name' => 'Lantai 1',
                'floor_number' => 1,
                'indoor_table_count' => 0,
                'outdoor_table_count' => 0,
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        DB::table('cafe_tables')->whereNull('cafe_floor_id')->update([
            'cafe_floor_id' => $defaultFloorId,
            'area_type' => 'indoor',
            'updated_at' => now(),
        ]);

        $indoorCount = DB::table('cafe_tables')->where('cafe_floor_id', $defaultFloorId)->where('area_type', 'indoor')->count();
        $outdoorCount = DB::table('cafe_tables')->where('cafe_floor_id', $defaultFloorId)->where('area_type', 'outdoor')->count();

        DB::table('cafe_floors')->where('id', $defaultFloorId)->update([
            'indoor_table_count' => $indoorCount,
            'outdoor_table_count' => $outdoorCount,
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        Schema::table('cafe_tables', function (Blueprint $table) {
            $table->dropConstrainedForeignId('cafe_floor_id');
            $table->dropColumn('area_type');
        });
    }
};
