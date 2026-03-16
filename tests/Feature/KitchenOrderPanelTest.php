<?php

namespace Tests\Feature;

use App\Models\Bill;
use App\Models\CafeTable;
use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class KitchenOrderPanelTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
    }

    public function test_kitchen_role_can_view_kitchen_board(): void
    {
        $user = User::factory()->create();
        Role::findOrCreate('kitchen');
        $user->assignRole('kitchen');

        $response = $this->actingAs($user)->get(route('kitchen.orders.index'));

        $response->assertOk();
    }

    public function test_kitchen_role_can_mark_order_ready(): void
    {
        $user = User::factory()->create();
        Role::findOrCreate('kitchen');
        $user->assignRole('kitchen');

        $table = CafeTable::query()->create([
            'code' => 'T20',
            'name' => 'Meja 20',
            'qr_token' => 'meja-t20',
            'is_active' => true,
        ]);

        $bill = Bill::query()->create([
            'bill_number' => 'BILL-KITCHEN-001',
            'status' => Bill::STATUS_OPEN,
            'opened_at' => now(),
        ]);

        $bill->tables()->attach($table->id);

        $order = Order::query()->create([
            'cafe_table_id' => $table->id,
            'bill_id' => $bill->id,
            'order_number' => 'ORD-KITCHEN-001',
            'customer_name' => 'Guest',
            'status' => Order::STATUS_PREPARING,
            'total_amount' => 28000,
            'ordered_at' => now(),
        ]);

        $response = $this->actingAs($user)->patch(route('kitchen.orders.status.update', ['order' => $order->id]), [
            'status' => Order::STATUS_READY,
        ]);

        $response->assertRedirect();

        $this->assertDatabaseHas('orders', [
            'id' => $order->id,
            'status' => Order::STATUS_READY,
        ]);
    }

    public function test_waiter_role_can_mark_ready_order_as_served(): void
    {
        $user = User::factory()->create();
        Role::findOrCreate('waiter');
        $user->assignRole('waiter');

        $table = CafeTable::query()->create([
            'code' => 'T21',
            'name' => 'Meja 21',
            'qr_token' => 'meja-t21',
            'is_active' => true,
        ]);

        $bill = Bill::query()->create([
            'bill_number' => 'BILL-KITCHEN-002',
            'status' => Bill::STATUS_OPEN,
            'opened_at' => now(),
        ]);

        $bill->tables()->attach($table->id);

        $order = Order::query()->create([
            'cafe_table_id' => $table->id,
            'bill_id' => $bill->id,
            'order_number' => 'ORD-KITCHEN-002',
            'customer_name' => 'Guest',
            'status' => Order::STATUS_READY,
            'total_amount' => 32000,
            'ordered_at' => now(),
        ]);

        $response = $this->actingAs($user)->post(route('kitchen.orders.served', ['order' => $order->id]));

        $response->assertRedirect();

        $this->assertDatabaseHas('orders', [
            'id' => $order->id,
            'status' => Order::STATUS_SERVED,
        ]);
    }

    public function test_kitchen_board_lists_oldest_orders_first(): void
    {
        $user = User::factory()->create();
        Role::findOrCreate('kitchen');
        $user->assignRole('kitchen');

        $table = CafeTable::query()->create([
            'code' => 'T22',
            'name' => 'Meja 22',
            'qr_token' => 'meja-t22',
            'is_active' => true,
        ]);

        $bill = Bill::query()->create([
            'bill_number' => 'BILL-KITCHEN-003',
            'status' => Bill::STATUS_OPEN,
            'opened_at' => now(),
        ]);

        $bill->tables()->attach($table->id);

        Order::query()->create([
            'cafe_table_id' => $table->id,
            'bill_id' => $bill->id,
            'order_number' => 'ORD-KITCHEN-OLD',
            'customer_name' => 'Guest A',
            'status' => Order::STATUS_PENDING,
            'total_amount' => 25000,
            'ordered_at' => now()->subMinutes(10),
        ]);

        Order::query()->create([
            'cafe_table_id' => $table->id,
            'bill_id' => $bill->id,
            'order_number' => 'ORD-KITCHEN-NEW',
            'customer_name' => 'Guest B',
            'status' => Order::STATUS_PENDING,
            'total_amount' => 30000,
            'ordered_at' => now(),
        ]);

        $response = $this->actingAs($user)->get(route('kitchen.orders.index'));

        $response->assertOk();

        $response->assertInertia(fn (Assert $page) => $page
            ->component('kitchen/orders')
            ->where('filters.tab', 'pending')
            ->has('queues.pending.data', 2)
            ->where('queues.pending.data.0.orderNumber', 'ORD-KITCHEN-OLD')
            ->where('queues.pending.data.1.orderNumber', 'ORD-KITCHEN-NEW'));
    }
}
