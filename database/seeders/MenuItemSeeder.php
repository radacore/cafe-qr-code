<?php

namespace Database\Seeders;

use App\Models\MenuItem;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class MenuItemSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $items = [
            ['name' => 'Espresso', 'category' => 'Coffee', 'description' => 'Shot kopi pekat dengan crema tebal.', 'price' => 18000, 'sort_order' => 10, 'image_url' => 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=640&h=480&q=60&fm=webp'],
            ['name' => 'Cappuccino', 'category' => 'Coffee', 'description' => 'Kopi susu klasik dengan foam lembut.', 'price' => 26000, 'sort_order' => 20, 'image_url' => 'https://images.unsplash.com/photo-1459755486867-b55449bb39ff?auto=format&fit=crop&w=640&h=480&q=60&fm=webp'],
            ['name' => 'Caramel Latte', 'category' => 'Coffee', 'description' => 'Perpaduan espresso, susu, dan karamel.', 'price' => 30000, 'sort_order' => 30, 'image_url' => 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=640&h=480&q=60&fm=webp'],
            ['name' => 'Lemon Tea', 'category' => 'Tea', 'description' => 'Teh segar dengan aroma lemon.', 'price' => 22000, 'sort_order' => 40, 'image_url' => 'https://images.unsplash.com/photo-1499638673689-79a0b5115d87?auto=format&fit=crop&w=640&h=480&q=60&fm=webp'],
            ['name' => 'Matcha Latte', 'category' => 'Tea', 'description' => 'Matcha creamy dengan rasa umami ringan.', 'price' => 28000, 'sort_order' => 50, 'image_url' => 'https://images.unsplash.com/photo-1515823064-d6e0c04616a7?auto=format&fit=crop&w=640&h=480&q=60&fm=webp'],
            ['name' => 'French Fries', 'category' => 'Snack', 'description' => 'Kentang goreng renyah dengan saus sambal.', 'price' => 24000, 'sort_order' => 60, 'image_url' => 'https://images.unsplash.com/photo-1576107232684-1279f390859f?auto=format&fit=crop&w=640&h=480&q=60&fm=webp'],
            ['name' => 'Chicken Wings', 'category' => 'Snack', 'description' => 'Sayap ayam gurih pedas manis.', 'price' => 34000, 'sort_order' => 70, 'image_url' => 'https://images.unsplash.com/photo-1608039755401-742074f0548d?auto=format&fit=crop&w=640&h=480&q=60&fm=webp'],
            ['name' => 'Spaghetti Bolognese', 'category' => 'Main Course', 'description' => 'Spaghetti dengan saus daging tomat.', 'price' => 42000, 'sort_order' => 80, 'image_url' => 'https://images.unsplash.com/photo-1621996346565-e3dbc353d2e5?auto=format&fit=crop&w=640&h=480&q=60&fm=webp'],
            ['name' => 'Nasi Goreng Special', 'category' => 'Main Course', 'description' => 'Nasi goreng komplet dengan topping spesial.', 'price' => 39000, 'sort_order' => 90, 'image_url' => 'https://images.unsplash.com/photo-1569058242567-93de6f36f8eb?auto=format&fit=crop&w=640&h=480&q=60&fm=webp'],
            ['name' => 'Cheesecake Slice', 'category' => 'Dessert', 'description' => 'Cheesecake lembut dengan rasa creamy.', 'price' => 27000, 'sort_order' => 100, 'image_url' => 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=640&h=480&q=60&fm=webp'],
        ];

        foreach ($items as $item) {
            MenuItem::query()->updateOrCreate(
                ['slug' => Str::slug($item['name'])],
                [
                    'name' => $item['name'],
                    'slug' => Str::slug($item['name']),
                    'category' => $item['category'],
                    'description' => $item['description'],
                    'price' => $item['price'],
                    'image_url' => $item['image_url'],
                    'sort_order' => $item['sort_order'],
                    'is_available' => true,
                ],
            );
        }
    }
}
