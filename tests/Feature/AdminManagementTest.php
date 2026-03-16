<?php

namespace Tests\Feature;

use App\Models\CafeFloor;
use App\Models\CafeTable;
use App\Models\MenuCategory;
use App\Models\MenuItem;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class AdminManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
    }

    public function test_guest_cannot_access_admin_management_page(): void
    {
        $response = $this->get(route('admin.management.index'));

        $response->assertRedirect(route('login'));
    }

    public function test_non_admin_user_cannot_access_admin_management_page(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get(route('admin.management.index'));

        $response->assertForbidden();
    }

    public function test_admin_can_open_admin_management_page(): void
    {
        Role::findOrCreate('admin');

        $admin = User::factory()->create();
        $admin->assignRole('admin');

        $response = $this->actingAs($admin)->get(route('admin.management.index'));

        $response->assertOk();
    }

    public function test_admin_can_create_category_and_menu_item(): void
    {
        Role::findOrCreate('admin');

        $admin = User::factory()->create();
        $admin->assignRole('admin');

        $this->actingAs($admin)->post(route('admin.management.categories.store'), [
            'name' => 'Mocktail',
            'description' => 'Minuman non alkohol',
            'sort_order' => 15,
            'is_active' => true,
        ])->assertRedirect();

        $category = MenuCategory::query()->where('name', 'Mocktail')->first();

        $this->assertNotNull($category);

        $this->actingAs($admin)->post(route('admin.management.menu-items.store'), [
            'menu_category_id' => $category->id,
            'name' => 'Orange Mojito',
            'description' => 'Segar dan dingin',
            'price' => 29000,
            'image_url' => 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?auto=format&fit=crop&w=640&q=60',
            'sort_order' => 20,
            'is_available' => true,
        ])->assertRedirect();

        $this->assertDatabaseHas('menu_items', [
            'name' => 'Orange Mojito',
            'menu_category_id' => $category->id,
            'category' => 'Mocktail',
            'price' => 29000,
        ]);
    }

    public function test_admin_can_create_floor_and_table_then_update_table_area(): void
    {
        Role::findOrCreate('admin');

        $admin = User::factory()->create();
        $admin->assignRole('admin');

        $this->actingAs($admin)->post(route('admin.management.floors.store'), [
            'name' => 'Rooftop',
            'floor_number' => 3,
            'is_active' => true,
        ])->assertRedirect();

        $floor = CafeFloor::query()->where('name', 'Rooftop')->first();

        $this->assertNotNull($floor);

        $this->actingAs($admin)->post(route('admin.management.tables.store'), [
            'cafe_floor_id' => $floor->id,
            'code' => 'T99',
            'name' => 'Meja Rooftop 99',
            'area_type' => 'indoor',
            'is_active' => true,
        ])->assertRedirect();

        $table = CafeTable::query()->where('code', 'T99')->first();

        $this->assertNotNull($table);

        $this->actingAs($admin)->patch(route('admin.management.tables.update', ['table' => $table->id]), [
            'cafe_floor_id' => $floor->id,
            'area_type' => 'outdoor',
            'is_active' => true,
        ])->assertRedirect();

        $this->assertDatabaseHas('cafe_tables', [
            'id' => $table->id,
            'area_type' => 'outdoor',
        ]);

        $this->assertDatabaseHas('cafe_floors', [
            'id' => $floor->id,
            'indoor_table_count' => 0,
            'outdoor_table_count' => 1,
        ]);
    }

    public function test_admin_can_open_table_qr_print_page(): void
    {
        Role::findOrCreate('admin');

        $admin = User::factory()->create();
        $admin->assignRole('admin');

        $floor = CafeFloor::query()->create([
            'name' => 'Lantai QR',
            'floor_number' => 9,
            'is_active' => true,
        ]);

        $table = CafeTable::query()->create([
            'cafe_floor_id' => $floor->id,
            'code' => 'TQR-01',
            'name' => 'Meja QR 01',
            'area_type' => 'indoor',
            'qr_token' => 'meja-tqr-01',
            'is_active' => true,
        ]);

        $response = $this->actingAs($admin)->get(route('admin.management.tables.qr-print', ['table' => $table->id]));

        $response->assertInertia(fn (AssertableInertia $page) => $page
            ->component('admin/table-qr-print')
            ->where('table.code', 'TQR-01')
            ->where('table.qrToken', 'meja-tqr-01')
        );
    }
}
