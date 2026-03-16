<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class StaffUserSeeder extends Seeder
{
    public function run(): void
    {
        $staffUsers = [
            [
                'name' => 'Cafe Admin',
                'email' => 'admin@cafeqr.test',
                'role' => 'admin',
            ],
            [
                'name' => 'Cafe Cashier',
                'email' => 'cashier@cafeqr.test',
                'role' => 'cashier',
            ],
            [
                'name' => 'Cafe Kitchen',
                'email' => 'kitchen@cafeqr.test',
                'role' => 'kitchen',
            ],
            [
                'name' => 'Cafe Waiter',
                'email' => 'waiter@cafeqr.test',
                'role' => 'waiter',
            ],
        ];

        foreach ($staffUsers as $staffUser) {
            $user = User::query()->updateOrCreate(
                ['email' => $staffUser['email']],
                [
                    'name' => $staffUser['name'],
                    'password' => Hash::make('password'),
                    'email_verified_at' => now(),
                ],
            );

            $user->syncRoles([$staffUser['role']]);
        }
    }
}
