<?php

namespace App\Http\Controllers;

use App\Models\CafeFloor;
use App\Models\CafeTable;
use App\Models\MenuCategory;
use App\Models\MenuItem;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class AdminManagementController extends Controller
{
    public function index(): Response
    {
        return $this->categories();
    }

    public function categories(): Response
    {
        if (! $this->isManagementSchemaReady()) {
            return Inertia::render('admin/categories', [
                'categories' => [],
                'schemaReady' => false,
                'schemaMessage' => 'Schema admin belum siap. Jalankan `php artisan migrate` lalu refresh halaman ini.',
            ]);
        }

        $categories = MenuCategory::query()
            ->orderBy('sort_order')
            ->orderBy('name')
            ->withCount('menuItems')
            ->get();

        return Inertia::render('admin/categories', [
            'categories' => $categories->map(fn (MenuCategory $category) => [
                'id' => $category->id,
                'name' => $category->name,
                'slug' => $category->slug,
                'description' => $category->description,
                'sortOrder' => $category->sort_order,
                'isActive' => $category->is_active,
                'menuItemsCount' => $category->menu_items_count,
            ]),
            'schemaReady' => true,
            'schemaMessage' => null,
        ]);
    }

    public function menu(): Response
    {
        if (! $this->isManagementSchemaReady()) {
            return Inertia::render('admin/menu', [
                'categories' => [],
                'menuItems' => [],
                'schemaReady' => false,
                'schemaMessage' => 'Schema admin belum siap. Jalankan `php artisan migrate` lalu refresh halaman ini.',
            ]);
        }

        $categories = MenuCategory::query()
            ->orderBy('sort_order')
            ->orderBy('name')
            ->withCount('menuItems')
            ->get();

        $menuItems = MenuItem::query()
            ->with('menuCategory:id,name')
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        return Inertia::render('admin/menu', [
            'categories' => $categories->map(fn (MenuCategory $category) => [
                'id' => $category->id,
                'name' => $category->name,
                'slug' => $category->slug,
                'description' => $category->description,
                'sortOrder' => $category->sort_order,
                'isActive' => $category->is_active,
                'menuItemsCount' => $category->menu_items_count,
            ]),
            'menuItems' => $menuItems->map(fn (MenuItem $item) => [
                'id' => $item->id,
                'menuCategoryId' => $item->menu_category_id,
                'name' => $item->name,
                'category' => $item->category,
                'categoryName' => $item->menuCategory?->name,
                'description' => $item->description,
                'price' => $item->price,
                'isAvailable' => $item->is_available,
                'imageUrl' => $item->image_url,
                'sortOrder' => $item->sort_order,
            ]),
            'schemaReady' => true,
            'schemaMessage' => null,
        ]);
    }

    public function floors(): Response
    {
        if (! $this->isManagementSchemaReady()) {
            return Inertia::render('admin/floors', [
                'floors' => [],
                'schemaReady' => false,
                'schemaMessage' => 'Schema admin belum siap. Jalankan `php artisan migrate` lalu refresh halaman ini.',
            ]);
        }

        $floors = CafeFloor::query()
            ->with(['tables' => fn ($query) => $query->orderBy('code')])
            ->orderBy('floor_number')
            ->get();

        return Inertia::render('admin/floors', [
            'floors' => $floors->map(fn (CafeFloor $floor) => [
                'id' => $floor->id,
                'name' => $floor->name,
                'floorNumber' => $floor->floor_number,
                'isActive' => $floor->is_active,
                'indoorTableCount' => $floor->indoor_table_count,
                'outdoorTableCount' => $floor->outdoor_table_count,
                'tables' => $floor->tables->map(fn (CafeTable $table) => [
                    'id' => $table->id,
                    'code' => $table->code,
                    'name' => $table->name,
                    'areaType' => $table->area_type,
                    'isActive' => $table->is_active,
                    'qrToken' => $table->qr_token,
                    'scanUrl' => route('cafe.orders.show', ['token' => $table->qr_token]),
                ]),
            ]),
            'schemaReady' => true,
            'schemaMessage' => null,
        ]);
    }

    public function printTableQr(CafeTable $table): Response
    {
        if (! $this->isManagementSchemaReady()) {
            return Inertia::render('admin/table-qr-print', [
                'schemaReady' => false,
                'schemaMessage' => 'Schema admin belum siap. Jalankan `php artisan migrate` lalu refresh halaman ini.',
                'table' => null,
                'qrImageUrl' => null,
            ]);
        }

        $scanUrl = route('cafe.orders.show', ['token' => $table->qr_token]);
        $qrImageUrl = 'https://quickchart.io/qr?size=600&format=png&text='.urlencode($scanUrl);

        return Inertia::render('admin/table-qr-print', [
            'schemaReady' => true,
            'schemaMessage' => null,
            'table' => [
                'id' => $table->id,
                'code' => $table->code,
                'name' => $table->name,
                'areaType' => $table->area_type,
                'qrToken' => $table->qr_token,
                'scanUrl' => $scanUrl,
            ],
            'qrImageUrl' => $qrImageUrl,
        ]);
    }

    public function tables(): Response
    {
        if (! $this->isManagementSchemaReady()) {
            return Inertia::render('admin/tables', [
                'floors' => [],
                'schemaReady' => false,
                'schemaMessage' => 'Schema admin belum siap. Jalankan `php artisan migrate` lalu refresh halaman ini.',
            ]);
        }

        $floors = CafeFloor::query()
            ->with(['tables' => fn ($query) => $query->orderBy('code')])
            ->orderBy('floor_number')
            ->get();

        return Inertia::render('admin/tables', [
            'floors' => $floors->map(fn (CafeFloor $floor) => [
                'id' => $floor->id,
                'name' => $floor->name,
                'floorNumber' => $floor->floor_number,
                'isActive' => $floor->is_active,
                'indoorTableCount' => $floor->indoor_table_count,
                'outdoorTableCount' => $floor->outdoor_table_count,
                'tables' => $floor->tables->map(fn (CafeTable $table) => [
                    'id' => $table->id,
                    'code' => $table->code,
                    'name' => $table->name,
                    'areaType' => $table->area_type,
                    'isActive' => $table->is_active,
                    'qrToken' => $table->qr_token,
                    'scanUrl' => route('cafe.orders.show', ['token' => $table->qr_token]),
                ]),
            ]),
            'schemaReady' => true,
            'schemaMessage' => null,
        ]);
    }

    public function storeCategory(Request $request): RedirectResponse
    {
        if (! $this->isManagementSchemaReady()) {
            return back()->with('error', 'Schema admin belum siap. Jalankan php artisan migrate.');
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:80'],
            'description' => ['nullable', 'string', 'max:200'],
            'sort_order' => ['nullable', 'integer', 'min:0', 'max:9999'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $slug = $this->generateUniqueCategorySlug($validated['name']);

        MenuCategory::query()->create([
            'name' => $validated['name'],
            'slug' => $slug,
            'description' => $validated['description'] ?? null,
            'sort_order' => $validated['sort_order'] ?? 0,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return back()->with('success', 'Kategori menu berhasil ditambahkan.');
    }

    public function updateCategory(Request $request, MenuCategory $category): RedirectResponse
    {
        if (! $this->isManagementSchemaReady()) {
            return back()->with('error', 'Schema admin belum siap. Jalankan php artisan migrate.');
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:80'],
            'description' => ['nullable', 'string', 'max:200'],
            'sort_order' => ['nullable', 'integer', 'min:0', 'max:9999'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $slug = $category->name !== $validated['name']
            ? $this->generateUniqueCategorySlug($validated['name'], $category->id)
            : $category->slug;

        $category->update([
            'name' => $validated['name'],
            'slug' => $slug,
            'description' => $validated['description'] ?? null,
            'sort_order' => $validated['sort_order'] ?? 0,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        MenuItem::query()->where('menu_category_id', $category->id)->update([
            'category' => $category->name,
        ]);

        return back()->with('success', 'Kategori menu berhasil diperbarui.');
    }

    public function destroyCategory(MenuCategory $category): RedirectResponse
    {
        if (! $this->isManagementSchemaReady()) {
            return back()->with('error', 'Schema admin belum siap. Jalankan php artisan migrate.');
        }

        if ($category->menuItems()->count() > 0) {
            return back()->with('error', 'Kategori tidak bisa dihapus karena masih memiliki item menu.');
        }

        $category->delete();

        return back()->with('success', 'Kategori menu berhasil dihapus.');
    }

    public function storeMenuItem(Request $request): RedirectResponse
    {
        if (! $this->isManagementSchemaReady()) {
            return back()->with('error', 'Schema admin belum siap. Jalankan php artisan migrate.');
        }

        $validated = $request->validate([
            'menu_category_id' => ['required', 'integer', 'exists:menu_categories,id'],
            'name' => ['required', 'string', 'max:120'],
            'description' => ['nullable', 'string', 'max:500'],
            'price' => ['required', 'numeric', 'min:0'],
            'image_url' => ['nullable', 'url', 'max:400'],
            'sort_order' => ['nullable', 'integer', 'min:0', 'max:9999'],
            'is_available' => ['nullable', 'boolean'],
        ]);

        $category = MenuCategory::query()->findOrFail($validated['menu_category_id']);
        $slug = $this->generateUniqueMenuItemSlug($validated['name']);

        MenuItem::query()->create([
            'menu_category_id' => $category->id,
            'name' => $validated['name'],
            'slug' => $slug,
            'category' => $category->name,
            'description' => $validated['description'] ?? null,
            'price' => $validated['price'],
            'image_url' => $validated['image_url'] ?? null,
            'sort_order' => $validated['sort_order'] ?? 0,
            'is_available' => $validated['is_available'] ?? true,
        ]);

        return back()->with('success', 'Menu baru berhasil ditambahkan.');
    }

    public function updateMenuItem(Request $request, MenuItem $menuItem): RedirectResponse
    {
        if (! $this->isManagementSchemaReady()) {
            return back()->with('error', 'Schema admin belum siap. Jalankan php artisan migrate.');
        }

        $validated = $request->validate([
            'menu_category_id' => ['required', 'integer', 'exists:menu_categories,id'],
            'name' => ['required', 'string', 'max:120'],
            'description' => ['nullable', 'string', 'max:500'],
            'price' => ['required', 'numeric', 'min:0'],
            'image_url' => ['nullable', 'url', 'max:400'],
            'sort_order' => ['nullable', 'integer', 'min:0', 'max:9999'],
            'is_available' => ['nullable', 'boolean'],
        ]);

        $category = MenuCategory::query()->findOrFail($validated['menu_category_id']);
        $slug = $menuItem->name !== $validated['name']
            ? $this->generateUniqueMenuItemSlug($validated['name'], $menuItem->id)
            : $menuItem->slug;

        $menuItem->update([
            'menu_category_id' => $category->id,
            'name' => $validated['name'],
            'slug' => $slug,
            'category' => $category->name,
            'description' => $validated['description'] ?? null,
            'price' => $validated['price'],
            'image_url' => $validated['image_url'] ?? null,
            'sort_order' => $validated['sort_order'] ?? 0,
            'is_available' => $validated['is_available'] ?? true,
        ]);

        return back()->with('success', 'Item menu berhasil diperbarui.');
    }

    public function destroyMenuItem(MenuItem $menuItem): RedirectResponse
    {
        if (! $this->isManagementSchemaReady()) {
            return back()->with('error', 'Schema admin belum siap. Jalankan php artisan migrate.');
        }

        $menuItem->delete();

        return back()->with('success', 'Item menu berhasil dihapus.');
    }

    public function storeFloor(Request $request): RedirectResponse
    {
        if (! $this->isManagementSchemaReady()) {
            return back()->with('error', 'Schema admin belum siap. Jalankan php artisan migrate.');
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:80'],
            'floor_number' => ['required', 'integer', 'min:1', 'max:100', 'unique:cafe_floors,floor_number'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        CafeFloor::query()->create([
            'name' => $validated['name'],
            'floor_number' => $validated['floor_number'],
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return back()->with('success', 'Lantai baru berhasil ditambahkan.');
    }

    public function updateFloor(Request $request, CafeFloor $floor): RedirectResponse
    {
        if (! $this->isManagementSchemaReady()) {
            return back()->with('error', 'Schema admin belum siap. Jalankan php artisan migrate.');
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:80'],
            'floor_number' => [
                'required',
                'integer',
                'min:1',
                'max:100',
                Rule::unique('cafe_floors', 'floor_number')->ignore($floor->id),
            ],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $floor->update([
            'name' => $validated['name'],
            'floor_number' => $validated['floor_number'],
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return back()->with('success', 'Data lantai berhasil diperbarui.');
    }

    public function destroyFloor(CafeFloor $floor): RedirectResponse
    {
        if (! $this->isManagementSchemaReady()) {
            return back()->with('error', 'Schema admin belum siap. Jalankan php artisan migrate.');
        }

        if ($floor->tables()->count() > 0) {
            return back()->with('error', 'Lantai tidak bisa dihapus karena masih memiliki meja.');
        }

        $floor->delete();

        return back()->with('success', 'Lantai berhasil dihapus.');
    }

    public function storeTable(Request $request): RedirectResponse
    {
        if (! $this->isManagementSchemaReady()) {
            return back()->with('error', 'Schema admin belum siap. Jalankan php artisan migrate.');
        }

        $validated = $request->validate([
            'cafe_floor_id' => ['required', 'integer', 'exists:cafe_floors,id'],
            'code' => ['required', 'string', 'max:20', 'unique:cafe_tables,code'],
            'name' => ['required', 'string', 'max:100'],
            'area_type' => ['required', 'string', 'in:indoor,outdoor'],
            'qr_token' => ['nullable', 'string', 'max:100', 'unique:cafe_tables,qr_token'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $table = CafeTable::query()->create([
            'cafe_floor_id' => $validated['cafe_floor_id'],
            'code' => Str::upper($validated['code']),
            'name' => $validated['name'],
            'area_type' => $validated['area_type'],
            'qr_token' => $validated['qr_token'] ?? Str::lower('meja-'.Str::slug($validated['code'])),
            'is_active' => $validated['is_active'] ?? true,
        ]);

        $floor = CafeFloor::query()->findOrFail($table->cafe_floor_id);
        $this->syncFloorTableCounts($floor);

        return back()->with('success', 'Meja baru berhasil ditambahkan.');
    }

    public function updateTable(Request $request, CafeTable $table): RedirectResponse
    {
        if (! $this->isManagementSchemaReady()) {
            return back()->with('error', 'Schema admin belum siap. Jalankan php artisan migrate.');
        }

        $validated = $request->validate([
            'cafe_floor_id' => ['required', 'integer', 'exists:cafe_floors,id'],
            'area_type' => ['required', 'string', 'in:indoor,outdoor'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $previousFloorId = $table->cafe_floor_id;

        $table->update([
            'cafe_floor_id' => $validated['cafe_floor_id'],
            'area_type' => $validated['area_type'],
            'is_active' => $validated['is_active'] ?? $table->is_active,
        ]);

        if ($previousFloorId) {
            $oldFloor = CafeFloor::query()->find($previousFloorId);
            if ($oldFloor) {
                $this->syncFloorTableCounts($oldFloor);
            }
        }

        $newFloor = CafeFloor::query()->findOrFail($validated['cafe_floor_id']);
        $this->syncFloorTableCounts($newFloor);

        return back()->with('success', 'Pengaturan meja berhasil diperbarui.');
    }

    private function syncFloorTableCounts(CafeFloor $floor): void
    {
        $indoorCount = $floor->tables()->where('area_type', 'indoor')->count();
        $outdoorCount = $floor->tables()->where('area_type', 'outdoor')->count();

        $floor->update([
            'indoor_table_count' => $indoorCount,
            'outdoor_table_count' => $outdoorCount,
        ]);
    }

    private function generateUniqueCategorySlug(string $name, ?int $ignoreId = null): string
    {
        $base = Str::slug($name);
        $slug = $base;
        $counter = 2;

        while (MenuCategory::query()
            ->where('slug', $slug)
            ->when($ignoreId, fn ($query) => $query->where('id', '!=', $ignoreId))
            ->exists()) {
            $slug = $base.'-'.$counter;
            $counter++;
        }

        return $slug;
    }

    private function generateUniqueMenuItemSlug(string $name, ?int $ignoreId = null): string
    {
        $base = Str::slug($name);
        $slug = $base;
        $counter = 2;

        while (MenuItem::query()
            ->where('slug', $slug)
            ->when($ignoreId, fn ($query) => $query->where('id', '!=', $ignoreId))
            ->exists()) {
            $slug = $base.'-'.$counter;
            $counter++;
        }

        return $slug;
    }

    private function isManagementSchemaReady(): bool
    {
        if (! Schema::hasTable('menu_categories') || ! Schema::hasTable('cafe_floors')) {
            return false;
        }

        if (! Schema::hasTable('menu_items') || ! Schema::hasColumn('menu_items', 'menu_category_id')) {
            return false;
        }

        if (! Schema::hasTable('cafe_tables')
            || ! Schema::hasColumn('cafe_tables', 'cafe_floor_id')
            || ! Schema::hasColumn('cafe_tables', 'area_type')) {
            return false;
        }

        return true;
    }
}
