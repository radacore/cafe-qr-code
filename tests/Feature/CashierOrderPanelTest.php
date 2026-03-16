<?php

namespace Tests\Feature;

use App\Models\CafeTable;
use App\Models\Bill;
use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class CashierOrderPanelTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
    }

    public function test_guest_cannot_access_cashier_panel(): void
    {
        $response = $this->get(route('cashier.orders.index'));

        $response->assertRedirect(route('login'));
    }

    public function test_authenticated_user_can_view_cashier_panel(): void
    {
        $user = User::factory()->create();
        Role::findOrCreate('cashier');
        $user->assignRole('cashier');

        $table = CafeTable::query()->create([
            'code' => 'T10',
            'name' => 'Meja 10',
            'qr_token' => 'meja-t10',
            'is_active' => true,
        ]);

        $bill = Bill::query()->create([
            'bill_number' => 'BILL-TEST-001',
            'status' => Bill::STATUS_OPEN,
            'opened_at' => now(),
        ]);

        $bill->tables()->attach($table->id);

        Order::query()->create([
            'cafe_table_id' => $table->id,
            'bill_id' => $bill->id,
            'order_number' => 'ORD-TEST-001',
            'customer_name' => 'Guest',
            'status' => Order::STATUS_PENDING,
            'total_amount' => 20000,
            'ordered_at' => now(),
        ]);

        $response = $this->actingAs($user)->get(route('cashier.orders.index'));

        $response->assertOk();
    }

    public function test_cashier_cannot_update_order_status_from_cashier_panel(): void
    {
        $user = User::factory()->create();
        Role::findOrCreate('cashier');
        $user->assignRole('cashier');

        $table = CafeTable::query()->create([
            'code' => 'T11',
            'name' => 'Meja 11',
            'qr_token' => 'meja-t11',
            'is_active' => true,
        ]);

        $bill = Bill::query()->create([
            'bill_number' => 'BILL-TEST-002',
            'status' => Bill::STATUS_OPEN,
            'opened_at' => now(),
        ]);

        $bill->tables()->attach($table->id);

        $order = Order::query()->create([
            'cafe_table_id' => $table->id,
            'bill_id' => $bill->id,
            'order_number' => 'ORD-TEST-002',
            'customer_name' => 'Guest',
            'status' => Order::STATUS_PENDING,
            'total_amount' => 35000,
            'ordered_at' => now(),
        ]);

        $response = $this->actingAs($user)->patch(route('cashier.orders.status.update', ['order' => $order->id]), [
            'status' => Order::STATUS_READY,
        ]);

        $response->assertRedirect();

        $this->assertDatabaseHas('orders', [
            'id' => $order->id,
            'status' => Order::STATUS_PENDING,
        ]);
    }

    public function test_admin_can_update_order_status_from_cashier_panel(): void
    {
        $user = User::factory()->create();
        Role::findOrCreate('admin');
        $user->assignRole('admin');

        $table = CafeTable::query()->create([
            'code' => 'T12',
            'name' => 'Meja 12',
            'qr_token' => 'meja-t12',
            'is_active' => true,
        ]);

        $bill = Bill::query()->create([
            'bill_number' => 'BILL-TEST-003',
            'status' => Bill::STATUS_OPEN,
            'opened_at' => now(),
        ]);

        $bill->tables()->attach($table->id);

        $order = Order::query()->create([
            'cafe_table_id' => $table->id,
            'bill_id' => $bill->id,
            'order_number' => 'ORD-TEST-003',
            'customer_name' => 'Guest',
            'status' => Order::STATUS_PENDING,
            'total_amount' => 35000,
            'ordered_at' => now(),
        ]);

        $response = $this->actingAs($user)->patch(route('cashier.orders.status.update', ['order' => $order->id]), [
            'status' => Order::STATUS_READY,
        ]);

        $response->assertRedirect();

        $this->assertDatabaseHas('orders', [
            'id' => $order->id,
            'status' => Order::STATUS_READY,
        ]);
    }

    public function test_authenticated_user_without_cashier_role_cannot_access_cashier_panel(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get(route('cashier.orders.index'));

        $response->assertForbidden();
    }
}
