<?php

namespace App\Events;

use App\Models\Order;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class OrderLifecycleUpdated implements ShouldBroadcastNow
{
    use Dispatchable;
    use SerializesModels;

    public function __construct(public Order $order)
    {
    }

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('kitchen.orders'),
            new PrivateChannel('cashier.orders'),
            new PrivateChannel("table.{$this->order->cafe_table_id}"),
        ];
    }

    public function broadcastAs(): string
    {
        return 'order.lifecycle.updated';
    }

    public function broadcastWith(): array
    {
        return [
            'orderId' => $this->order->id,
            'orderNumber' => $this->order->order_number,
            'status' => $this->order->status,
            'billId' => $this->order->bill_id,
            'tableId' => $this->order->cafe_table_id,
            'totalAmount' => (float) $this->order->total_amount,
            'servedAt' => optional($this->order->served_at)?->toISOString(),
            'completedAt' => optional($this->order->completed_at)?->toISOString(),
            'updatedAt' => optional($this->order->updated_at)?->toISOString(),
        ];
    }
}
