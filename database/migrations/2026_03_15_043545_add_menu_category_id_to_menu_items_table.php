<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('menu_items', function (Blueprint $table) {
            $table->foreignId('menu_category_id')->nullable()->after('id')->constrained('menu_categories')->nullOnDelete();
        });

        $categories = DB::table('menu_items')
            ->select('category')
            ->whereNotNull('category')
            ->distinct()
            ->pluck('category')
            ->filter(fn ($value) => is_string($value) && trim($value) !== '');

        foreach ($categories as $name) {
            $slug = Str::slug($name);

            $categoryId = DB::table('menu_categories')->where('slug', $slug)->value('id');

            if (! $categoryId) {
                $categoryId = DB::table('menu_categories')->insertGetId([
                    'name' => $name,
                    'slug' => $slug,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            DB::table('menu_items')->where('category', $name)->update([
                'menu_category_id' => $categoryId,
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        Schema::table('menu_items', function (Blueprint $table) {
            $table->dropConstrainedForeignId('menu_category_id');
        });
    }
};
