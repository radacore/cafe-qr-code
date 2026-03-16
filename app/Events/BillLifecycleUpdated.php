<?php

namespace App\Events;

use App\Models\Bill;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class BillLifecycleUpdated implements ShouldBroadcastNow
{
    use Dispatchable;
    use SerializesModels;

    public function __construct(public Bill $bill)
    {
    }

    public function broadcastOn(): array
    {
        $channels = [
            new PrivateChannel('cashier.orders'),
            new PrivateChannel('kitchen.orders'),
        ];

        foreach ($this->bill->tables()->pluck('cafe_tables.id') as $tableId) {
            $channels[] = new PrivateChannel("table.{$tableId}");
        }

        return $channels;
    }

    public function broadcastAs(): string
    {
        return 'bill.lifecycle.updated';
    }

    public function broadcastWith(): array
    {
        return [
            'billId' => $this->bill->id,
            'billNumber' => $this->bill->bill_number,
            'status' => $this->bill->status,
            'mergedIntoBillId' => $this->bill->merged_into_bill_id,
            'totalAmount' => (float) $this->bill->total_amount,
            'closedAt' => optional($this->bill->closed_at)?->toISOString(),
            'updatedAt' => optional($this->bill->updated_at)?->toISOString(),
        ];
    }
}
