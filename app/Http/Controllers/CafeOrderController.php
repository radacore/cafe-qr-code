<?php

namespace App\Http\Controllers;

use App\Events\BillLifecycleUpdated;
use App\Events\OrderLifecycleUpdated;
use App\Models\Bill;
use App\Models\CafeTable;
use App\Models\MenuItem;
use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class CafeOrderController extends Controller
{
    public function show(string $token): Response
    {
        $table = $this->resolveTable($token);

        $menuItems = MenuItem::query()
            ->where('is_available', true)
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get(['id', 'name', 'slug', 'category', 'description', 'price', 'image_url']);

        return Inertia::render('cafe/order', [
            'table' => [
                'id' => $table->id,
                'name' => $table->name,
                'code' => $table->code,
                'qrToken' => $table->qr_token,
            ],
            'menuItems' => $menuItems,
            'cart' => $this->buildCartSummary($table->qr_token),
            'openBill' => $this->buildOpenBillSummary($table),
        ]);
    }

    public function addToCart(Request $request, string $token): RedirectResponse
    {
        $table = $this->resolveTable($token);

        $validated = $request->validate([
            'menu_item_id' => ['required', 'integer', 'exists:menu_items,id'],
            'quantity' => ['nullable', 'integer', 'min:1', 'max:20'],
        ]);

        $menuItem = MenuItem::query()
            ->whereKey($validated['menu_item_id'])
            ->where('is_available', true)
            ->firstOrFail();

        $quantity = $validated['quantity'] ?? 1;
        $sessionKey = $this->cartSessionKey($table->qr_token);
        $cart = collect(session($sessionKey, []))
            ->map(fn ($value) => (int) $value)
            ->filter(fn ($value) => $value > 0)
            ->toArray();

        $itemKey = (string) $menuItem->id;
        $cart[$itemKey] = min(($cart[$itemKey] ?? 0) + $quantity, 50);

        session([$sessionKey => $cart]);

        return back()->with('success', "{$menuItem->name} ditambahkan ke keranjang.");
    }

    public function updateCart(Request $request, string $token, int $menuItemId): RedirectResponse
    {
        $table = $this->resolveTable($token);

        $validated = $request->validate([
            'quantity' => ['required', 'integer', 'min:0', 'max:50'],
        ]);

        $sessionKey = $this->cartSessionKey($table->qr_token);
        $cart = collect(session($sessionKey, []))
            ->map(fn ($value) => (int) $value)
            ->filter(fn ($value) => $value > 0)
            ->toArray();

        $itemKey = (string) $menuItemId;

        if ($validated['quantity'] === 0) {
            unset($cart[$itemKey]);
        } else {
            $cart[$itemKey] = $validated['quantity'];
        }

        session([$sessionKey => $cart]);

        return back();
    }

    public function checkout(Request $request, string $token): RedirectResponse
    {
        $table = $this->resolveTable($token);

        $validated = $request->validate([
            'customer_name' => ['nullable', 'string', 'max:100'],
            'customer_note' => ['nullable', 'string', 'max:500'],
        ]);

        $sessionKey = $this->cartSessionKey($table->qr_token);
        $rawCart = collect(session($sessionKey, []))
            ->map(fn ($value) => (int) $value)
            ->filter(fn ($value) => $value > 0)
            ->toArray();

        if ($rawCart === []) {
            return back()->withErrors(['cart' => 'Keranjang masih kosong.']);
        }

        $menuItems = MenuItem::query()
            ->whereIn('id', array_map('intval', array_keys($rawCart)))
            ->where('is_available', true)
            ->get(['id', 'name', 'price'])
            ->keyBy('id');

        if ($menuItems->isEmpty()) {
            return back()->withErrors(['cart' => 'Semua item dalam keranjang tidak tersedia.']);
        }

        [$order, $bill] = DB::transaction(function () use ($table, $validated, $rawCart, $menuItems) {
            $bill = $this->resolveOrCreateOpenBill($table);

            $order = Order::query()->create([
                'cafe_table_id' => $table->id,
                'bill_id' => $bill->id,
                'order_number' => $this->generateOrderNumber(),
                'customer_name' => $validated['customer_name'] ?: 'Guest',
                'customer_note' => $validated['customer_note'] ?? null,
                'status' => Order::STATUS_PENDING,
                'ordered_at' => now(),
            ]);

            $total = 0.0;

            foreach ($rawCart as $menuItemId => $quantity) {
                $item = $menuItems->get((int) $menuItemId);

                if (! $item) {
                    continue;
                }

                $lineTotal = round($item->price * $quantity, 2);
                $total += $lineTotal;

                $order->items()->create([
                    'menu_item_id' => $item->id,
                    'menu_item_name' => $item->name,
                    'quantity' => $quantity,
                    'unit_price' => $item->price,
                    'line_total' => $lineTotal,
                ]);
            }

            if ($order->items()->count() === 0) {
                abort(422, 'Keranjang tidak memiliki item valid.');
            }

            $order->update([
                'total_amount' => round($total, 2),
            ]);

            $this->syncBillTotal($bill);

            return [$order->fresh(), $bill->fresh()];
        });

        session()->forget($sessionKey);

        OrderLifecycleUpdated::dispatch($order);
        BillLifecycleUpdated::dispatch($bill);

        return redirect()
            ->route('cafe.orders.success', ['token' => $table->qr_token, 'order' => $order->id])
            ->with('success', 'Pesanan berhasil dikirim. Silakan tunggu pelayan datang.');
    }

    public function success(string $token, int $orderId): Response
    {
        $table = $this->resolveTable($token);

        $order = Order::query()
            ->whereKey($orderId)
            ->where('cafe_table_id', $table->id)
            ->with('items:id,order_id,menu_item_name,quantity,unit_price,line_total')
            ->firstOrFail();

        return Inertia::render('cafe/success', [
            'table' => [
                'name' => $table->name,
                'code' => $table->code,
                'qrToken' => $table->qr_token,
            ],
            'order' => [
                'id' => $order->id,
                'billId' => $order->bill_id,
                'orderNumber' => $order->order_number,
                'status' => $order->status,
                'customerName' => $order->customer_name,
                'customerNote' => $order->customer_note,
                'totalAmount' => $order->total_amount,
                'orderedAt' => optional($order->ordered_at)->toISOString(),
                'items' => $order->items,
            ],
            'openBill' => $this->buildOpenBillSummary($table),
        ]);
    }

    private function resolveTable(string $token): CafeTable
    {
        return CafeTable::query()
            ->where('qr_token', $token)
            ->where('is_active', true)
            ->firstOrFail();
    }

    private function cartSessionKey(string $token): string
    {
        return "cafe_cart.{$token}";
    }

    private function buildCartSummary(string $token): array
    {
        $sessionKey = $this->cartSessionKey($token);
        $rawCart = collect(session($sessionKey, []))
            ->map(fn ($value) => (int) $value)
            ->filter(fn ($value) => $value > 0)
            ->toArray();

        if ($rawCart === []) {
            return [
                'items' => [],
                'totalQuantity' => 0,
                'totalAmount' => 0,
            ];
        }

        $menuItems = MenuItem::query()
            ->whereIn('id', array_map('intval', array_keys($rawCart)))
            ->where('is_available', true)
            ->get(['id', 'name', 'price'])
            ->keyBy('id');

        $items = [];
        $cleanCart = [];
        $totalQuantity = 0;
        $totalAmount = 0.0;

        foreach ($rawCart as $menuItemId => $quantity) {
            $item = $menuItems->get((int) $menuItemId);

            if (! $item) {
                continue;
            }

            $lineTotal = round($item->price * $quantity, 2);
            $totalQuantity += $quantity;
            $totalAmount += $lineTotal;
            $cleanCart[(string) $item->id] = $quantity;

            $items[] = [
                'menuItemId' => $item->id,
                'name' => $item->name,
                'price' => $item->price,
                'quantity' => $quantity,
                'lineTotal' => $lineTotal,
            ];
        }

        session([$sessionKey => $cleanCart]);

        return [
            'items' => $items,
            'totalQuantity' => $totalQuantity,
            'totalAmount' => round($totalAmount, 2),
        ];
    }

    private function generateOrderNumber(): string
    {
        return 'ORD-'.now()->format('YmdHis').'-'.Str::upper(Str::random(4));
    }

    private function buildOpenBillSummary(CafeTable $table): ?array
    {
        $bill = Bill::query()
            ->where('status', Bill::STATUS_OPEN)
            ->whereHas('tables', fn ($query) => $query->where('cafe_tables.id', $table->id))
            ->withCount('orders')
            ->first();

        if (! $bill) {
            return null;
        }

        return [
            'id' => $bill->id,
            'billNumber' => $bill->bill_number,
            'status' => $bill->status,
            'totalAmount' => $bill->total_amount,
            'ordersCount' => $bill->orders_count,
        ];
    }

    private function resolveOrCreateOpenBill(CafeTable $table): Bill
    {
        $openBill = Bill::query()
            ->where('status', Bill::STATUS_OPEN)
            ->whereHas('tables', fn ($query) => $query->where('cafe_tables.id', $table->id))
            ->lockForUpdate()
            ->first();

        if ($openBill) {
            return $openBill;
        }

        $newBill = Bill::query()->create([
            'bill_number' => $this->generateBillNumber(),
            'status' => Bill::STATUS_OPEN,
            'opened_at' => now(),
        ]);

        $newBill->tables()->attach($table->id);

        return $newBill;
    }

    private function syncBillTotal(Bill $bill): void
    {
        $activeTotal = (float) $bill->orders()
            ->where('status', '!=', Order::STATUS_CANCELLED)
            ->sum('total_amount');

        $bill->update([
            'total_amount' => round($activeTotal, 2),
        ]);
    }

    private function generateBillNumber(): string
    {
        return 'BILL-'.now()->format('YmdHis').'-'.Str::upper(Str::random(4));
    }
}
