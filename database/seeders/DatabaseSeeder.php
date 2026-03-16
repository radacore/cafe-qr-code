<?php

namespace Database\Seeders;

// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        foreach (['admin', 'cashier', 'kitchen', 'waiter'] as $roleName) {
            Role::findOrCreate($roleName);
        }

        $this->call([
            CafeTableSeeder::class,
            MenuItemSeeder::class,
            StaffUserSeeder::class,
        ]);
    }
}
