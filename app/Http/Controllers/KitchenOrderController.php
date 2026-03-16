<?php

namespace App\Http\Controllers;

use App\Events\OrderLifecycleUpdated;
use App\Models\Order;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class KitchenOrderController extends Controller
{
    public function index(Request $request): Response
    {
        $activeTab = $request->string('tab')->toString();
        $validTab = in_array($activeTab, ['pending', 'preparing', 'ready_served'], true) ? $activeTab : 'pending';

        $baseQuery = Order::query()
            ->with([
                'cafeTable:id,code,name',
                'items:id,order_id,menu_item_name,quantity,special_request',
            ])
            ->orderBy('ordered_at')
            ->orderBy('id');

        $pendingQueue = (clone $baseQuery)
            ->where('status', Order::STATUS_PENDING)
            ->paginate(perPage: 12, pageName: 'pending_page')
            ->withQueryString();

        $preparingQueue = (clone $baseQuery)
            ->where('status', Order::STATUS_PREPARING)
            ->paginate(perPage: 12, pageName: 'preparing_page')
            ->withQueryString();

        $readyServedQueue = (clone $baseQuery)
            ->whereIn('status', [Order::STATUS_READY, Order::STATUS_SERVED])
            ->paginate(perPage: 12, pageName: 'ready_page')
            ->withQueryString();

        return Inertia::render('kitchen/orders', [
            'filters' => [
                'tab' => $validTab,
            ],
            'queues' => [
                'pending' => $this->serializeQueue($pendingQueue),
                'preparing' => $this->serializeQueue($preparingQueue),
                'readyServed' => $this->serializeQueue($readyServedQueue),
            ],
            'updatedAt' => now()->toISOString(),
        ]);
    }

    public function updateStatus(Request $request, Order $order): RedirectResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'string', 'in:'.implode(',', [
                Order::STATUS_PENDING,
                Order::STATUS_PREPARING,
                Order::STATUS_READY,
                Order::STATUS_CANCELLED,
            ])],
        ]);

        $newStatus = $validated['status'];

        $allowedTransitions = [
            Order::STATUS_PENDING => [Order::STATUS_PREPARING, Order::STATUS_CANCELLED],
            Order::STATUS_PREPARING => [Order::STATUS_READY, Order::STATUS_CANCELLED],
            Order::STATUS_READY => [Order::STATUS_READY],
            Order::STATUS_SERVED => [Order::STATUS_SERVED],
            Order::STATUS_COMPLETED => [Order::STATUS_COMPLETED],
            Order::STATUS_CANCELLED => [Order::STATUS_CANCELLED],
        ];

        if (! in_array($newStatus, $allowedTransitions[$order->status] ?? [], true)) {
            return back()->with('error', 'Transisi status dari kitchen tidak valid.');
        }

        $order->update([
            'status' => $newStatus,
        ]);

        OrderLifecycleUpdated::dispatch($order->fresh());

        return back()->with('success', "Order {$order->order_number} diubah ke {$newStatus}.");
    }

    public function markServed(Order $order): RedirectResponse
    {
        if (! in_array($order->status, [Order::STATUS_READY, Order::STATUS_SERVED], true)) {
            return back()->with('error', 'Hanya order siap saji yang bisa ditandai delivered.');
        }

        $order->update([
            'status' => Order::STATUS_SERVED,
            'served_at' => now(),
        ]);

        OrderLifecycleUpdated::dispatch($order->fresh());

        return back()->with('success', "Order {$order->order_number} sudah diantar waiter.");
    }

    private function serializeQueue(LengthAwarePaginator $paginator): array
    {
        return [
            'data' => collect($paginator->items())->map(fn (Order $order) => [
                'id' => $order->id,
                'billId' => $order->bill_id,
                'orderNumber' => $order->order_number,
                'status' => $order->status,
                'customerName' => $order->customer_name,
                'customerNote' => $order->customer_note,
                'orderedAt' => optional($order->ordered_at)->toISOString(),
                'table' => [
                    'id' => $order->cafe_table_id,
                    'code' => $order->cafeTable?->code,
                    'name' => $order->cafeTable?->name,
                ],
                'items' => $order->items->map(fn ($item) => [
                    'id' => $item->id,
                    'menuItemName' => $item->menu_item_name,
                    'quantity' => $item->quantity,
                    'specialRequest' => $item->special_request,
                ]),
            ])->values()->all(),
            'meta' => [
                'currentPage' => $paginator->currentPage(),
                'lastPage' => $paginator->lastPage(),
                'perPage' => $paginator->perPage(),
                'total' => $paginator->total(),
                'hasMorePages' => $paginator->hasMorePages(),
            ],
        ];
    }
}
