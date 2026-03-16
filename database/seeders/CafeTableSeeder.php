<?php

namespace Database\Seeders;

use App\Models\CafeTable;
use Illuminate\Database\Seeder;

class CafeTableSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        for ($i = 1; $i <= 12; $i++) {
            $code = 'T'.str_pad((string) $i, 2, '0', STR_PAD_LEFT);

            CafeTable::query()->updateOrCreate(
                ['code' => $code],
                [
                    'name' => "Meja {$i}",
                    'qr_token' => strtolower("meja-{$code}"),
                    'is_active' => true,
                ],
            );
        }
    }
}
