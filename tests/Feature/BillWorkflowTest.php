<?php

namespace Tests\Feature;

use App\Models\Bill;
use App\Models\BillPayment;
use App\Models\CafeTable;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class BillWorkflowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
    }

    public function test_multiple_qr_checkouts_on_same_table_reuse_open_bill(): void
    {
        $table = CafeTable::query()->create([
            'code' => 'T30',
            'name' => 'Meja 30',
            'qr_token' => 'meja-t30',
            'is_active' => true,
        ]);

        $espresso = MenuItem::query()->create([
            'name' => 'Espresso',
            'slug' => 'espresso',
            'price' => 20000,
            'sort_order' => 1,
            'is_available' => true,
        ]);

        $latte = MenuItem::query()->create([
            'name' => 'Latte',
            'slug' => 'latte',
            'price' => 30000,
            'sort_order' => 2,
            'is_available' => true,
        ]);

        $this->post(route('cafe.orders.cart.add', ['token' => $table->qr_token]), [
            'menu_item_id' => $espresso->id,
            'quantity' => 1,
        ])->assertRedirect();

        $this->post(route('cafe.orders.checkout', ['token' => $table->qr_token]), [
            'customer_name' => 'Ari',
        ])->assertRedirect();

        $this->post(route('cafe.orders.cart.add', ['token' => $table->qr_token]), [
            'menu_item_id' => $latte->id,
            'quantity' => 2,
        ])->assertRedirect();

        $this->post(route('cafe.orders.checkout', ['token' => $table->qr_token]), [
            'customer_name' => 'Ari',
        ])->assertRedirect();

        $bill = Bill::query()->first();

        $this->assertNotNull($bill);
        $this->assertDatabaseCount('bills', 1);
        $this->assertDatabaseCount('orders', 2);
        $this->assertDatabaseHas('orders', ['bill_id' => $bill->id]);
        $this->assertDatabaseHas('bills', [
            'id' => $bill->id,
            'status' => Bill::STATUS_OPEN,
            'total_amount' => 80000,
        ]);
    }

    public function test_cashier_can_merge_two_open_bills_and_settle_payment(): void
    {
        Role::findOrCreate('cashier');

        $cashier = User::factory()->create();
        $cashier->assignRole('cashier');

        $tableOne = CafeTable::query()->create([
            'code' => 'T31',
            'name' => 'Meja 31',
            'qr_token' => 'meja-t31',
            'is_active' => true,
        ]);

        $tableTwo = CafeTable::query()->create([
            'code' => 'T32',
            'name' => 'Meja 32',
            'qr_token' => 'meja-t32',
            'is_active' => true,
        ]);

        $billOne = Bill::query()->create([
            'bill_number' => 'BILL-001',
            'status' => Bill::STATUS_OPEN,
            'opened_at' => now(),
            'total_amount' => 40000,
        ]);
        $billOne->tables()->attach($tableOne->id);

        $billTwo = Bill::query()->create([
            'bill_number' => 'BILL-002',
            'status' => Bill::STATUS_OPEN,
            'opened_at' => now(),
            'total_amount' => 60000,
        ]);
        $billTwo->tables()->attach($tableTwo->id);

        Order::query()->create([
            'cafe_table_id' => $tableOne->id,
            'bill_id' => $billOne->id,
            'order_number' => 'ORD-MERGE-001',
            'customer_name' => 'Guest',
            'status' => Order::STATUS_SERVED,
            'total_amount' => 40000,
            'ordered_at' => now(),
            'served_at' => now(),
        ]);

        $mergedOrder = Order::query()->create([
            'cafe_table_id' => $tableTwo->id,
            'bill_id' => $billTwo->id,
            'order_number' => 'ORD-MERGE-002',
            'customer_name' => 'Guest',
            'status' => Order::STATUS_SERVED,
            'total_amount' => 60000,
            'ordered_at' => now(),
            'served_at' => now(),
        ]);

        $this->actingAs($cashier)->post(route('cashier.bills.merge'), [
            'source_bill_id' => $billTwo->id,
            'target_bill_id' => $billOne->id,
        ])->assertRedirect();

        $this->assertDatabaseHas('bills', [
            'id' => $billTwo->id,
            'status' => Bill::STATUS_MERGED,
            'merged_into_bill_id' => $billOne->id,
        ]);

        $this->assertDatabaseHas('orders', [
            'id' => $mergedOrder->id,
            'bill_id' => $billOne->id,
        ]);

        $this->actingAs($cashier)->post(route('cashier.bills.settle', ['bill' => $billOne->id]))->assertRedirect();

        $this->assertDatabaseHas('bills', [
            'id' => $billOne->id,
            'status' => Bill::STATUS_PAID,
            'total_amount' => 100000,
        ]);

        $this->assertDatabaseHas('orders', [
            'order_number' => 'ORD-MERGE-001',
            'status' => Order::STATUS_COMPLETED,
        ]);

        $this->assertDatabaseHas('orders', [
            'order_number' => 'ORD-MERGE-002',
            'status' => Order::STATUS_COMPLETED,
        ]);

        $this->assertDatabaseHas('bill_payments', [
            'bill_id' => $billOne->id,
            'payment_method' => BillPayment::METHOD_CASH,
            'amount' => 100000,
        ]);
    }

    public function test_cashier_can_split_bill_and_record_partial_payment(): void
    {
        Role::findOrCreate('cashier');

        $cashier = User::factory()->create();
        $cashier->assignRole('cashier');

        $table = CafeTable::query()->create([
            'code' => 'T40',
            'name' => 'Meja 40',
            'qr_token' => 'meja-t40',
            'is_active' => true,
        ]);

        $bill = Bill::query()->create([
            'bill_number' => 'BILL-SPLIT-001',
            'status' => Bill::STATUS_OPEN,
            'opened_at' => now(),
            'total_amount' => 90000,
        ]);
        $bill->tables()->attach($table->id);

        $firstOrder = Order::query()->create([
            'cafe_table_id' => $table->id,
            'bill_id' => $bill->id,
            'order_number' => 'ORD-SPLIT-001',
            'customer_name' => 'Guest A',
            'status' => Order::STATUS_SERVED,
            'total_amount' => 40000,
            'ordered_at' => now(),
            'served_at' => now(),
        ]);

        OrderItem::query()->create([
            'order_id' => $firstOrder->id,
            'menu_item_name' => 'Americano',
            'quantity' => 2,
            'unit_price' => 20000,
            'line_total' => 40000,
        ]);

        $secondOrder = Order::query()->create([
            'cafe_table_id' => $table->id,
            'bill_id' => $bill->id,
            'order_number' => 'ORD-SPLIT-002',
            'customer_name' => 'Guest B',
            'status' => Order::STATUS_SERVED,
            'total_amount' => 50000,
            'ordered_at' => now(),
            'served_at' => now(),
        ]);

        $secondOrderItem = OrderItem::query()->create([
            'order_id' => $secondOrder->id,
            'menu_item_name' => 'Es Teh',
            'quantity' => 5,
            'unit_price' => 10000,
            'line_total' => 50000,
        ]);

        $this->actingAs($cashier)->post(route('cashier.bills.split', ['bill' => $bill->id]), [
            'paid_items' => [
                [
                    'order_item_id' => $secondOrderItem->id,
                    'quantity' => 1,
                ],
            ],
            'payment_method' => BillPayment::METHOD_CASH,
        ])->assertRedirect();

        $this->assertDatabaseCount('bills', 1);

        $this->assertDatabaseHas('bills', [
            'id' => $bill->id,
            'total_amount' => 90000,
            'status' => Bill::STATUS_OPEN,
        ]);

        $this->assertDatabaseHas('bill_payments', [
            'bill_id' => $bill->id,
            'amount' => 10000,
            'payment_method' => BillPayment::METHOD_CASH,
        ]);

        $this->assertDatabaseHas('order_items', [
            'id' => $secondOrderItem->id,
            'quantity' => 4,
            'line_total' => 40000,
            'paid_at' => null,
        ]);

        $paidSplitItem = OrderItem::query()
            ->where('order_id', $secondOrder->id)
            ->where('id', '!=', $secondOrderItem->id)
            ->first();

        $this->assertNotNull($paidSplitItem);
        $this->assertSame(1, $paidSplitItem->quantity);
        $this->assertEquals(10000.0, (float) $paidSplitItem->line_total);
        $this->assertNotNull($paidSplitItem->paid_at);

        $this->actingAs($cashier)->post(route('cashier.bills.settle', ['bill' => $bill->id]), [
            'payment_method' => BillPayment::METHOD_TRANSFER,
        ])->assertRedirect();

        $this->assertDatabaseHas('bills', [
            'id' => $bill->id,
            'status' => Bill::STATUS_PAID,
        ]);

        $this->assertDatabaseHas('bill_payments', [
            'bill_id' => $bill->id,
            'amount' => 80000,
            'payment_method' => BillPayment::METHOD_TRANSFER,
        ]);

        $this->assertDatabaseHas('orders', [
            'id' => $secondOrder->id,
            'status' => Order::STATUS_COMPLETED,
        ]);

        $this->assertDatabaseHas('orders', [
            'id' => $firstOrder->id,
            'status' => Order::STATUS_COMPLETED,
        ]);
    }
}
