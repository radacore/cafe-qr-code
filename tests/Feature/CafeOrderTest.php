<?php

namespace Tests\Feature;

use App\Models\CafeTable;
use App\Models\MenuItem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CafeOrderTest extends TestCase
{
    use RefreshDatabase;

    public function test_customer_can_open_qr_order_page_without_login(): void
    {
        $table = CafeTable::query()->create([
            'code' => 'T01',
            'name' => 'Meja 1',
            'qr_token' => 'meja-t01',
            'is_active' => true,
        ]);

        MenuItem::query()->create([
            'name' => 'Espresso',
            'slug' => 'espresso',
            'price' => 18000,
            'sort_order' => 10,
            'is_available' => true,
        ]);

        $response = $this->get(route('cafe.orders.show', ['token' => $table->qr_token]));

        $response->assertOk();
    }

    public function test_customer_can_add_to_cart_and_checkout_without_login(): void
    {
        $table = CafeTable::query()->create([
            'code' => 'T02',
            'name' => 'Meja 2',
            'qr_token' => 'meja-t02',
            'is_active' => true,
        ]);

        $menuItem = MenuItem::query()->create([
            'name' => 'Cappuccino',
            'slug' => 'cappuccino',
            'price' => 26000,
            'sort_order' => 20,
            'is_available' => true,
        ]);

        $this->post(route('cafe.orders.cart.add', ['token' => $table->qr_token]), [
            'menu_item_id' => $menuItem->id,
            'quantity' => 2,
        ])->assertRedirect();

        $checkout = $this->post(route('cafe.orders.checkout', ['token' => $table->qr_token]), [
            'customer_name' => 'Budi',
            'customer_note' => 'Tanpa gula',
        ]);

        $checkout->assertRedirect();

        $this->assertDatabaseHas('orders', [
            'cafe_table_id' => $table->id,
            'customer_name' => 'Budi',
            'total_amount' => 52000,
        ]);

        $this->assertDatabaseHas('order_items', [
            'menu_item_id' => $menuItem->id,
            'menu_item_name' => 'Cappuccino',
            'quantity' => 2,
            'line_total' => 52000,
        ]);
    }

    public function test_invalid_qr_token_returns_not_found(): void
    {
        $this->get(route('cafe.orders.show', ['token' => 'not-found']))->assertNotFound();
    }
}
