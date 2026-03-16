<?php

namespace App\Http\Controllers;

use DomainException;
use App\Events\BillLifecycleUpdated;
use App\Events\OrderLifecycleUpdated;
use App\Models\Bill;
use App\Models\BillPayment;
use App\Models\Order;
use App\Models\OrderItem;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class CashierOrderController extends Controller
{
    public function index(Request $request): Response
    {
        $activeTab = $request->string('tab')->toString();
        $validTab = in_array($activeTab, ['open', 'paid'], true) ? $activeTab : 'open';
        $paidRange = $this->resolvePaidRangeFilter($request);

        $baseBillsQuery = Bill::query()
            ->with([
                'tables:id,code,name',
                'payments' => fn ($query) => $query
                    ->with('cashier:id,name')
                    ->latest('paid_at')
                    ->latest('id'),
                'orders' => fn ($query) => $query
                    ->with(['cafeTable:id,code,name', 'items:id,order_id,menu_item_name,quantity,unit_price,line_total,special_request,paid_at'])
                    ->orderBy('ordered_at')
                    ->orderBy('id'),
            ])
            ->withSum('payments as paid_amount', 'amount')
            ->whereNull('merged_into_bill_id')
            ->latest('opened_at')
            ->latest('id');

        $openBills = (clone $baseBillsQuery)
            ->where('status', Bill::STATUS_OPEN)
            ->paginate(perPage: 12, pageName: 'open_page')
            ->withQueryString();

        $paidBills = (clone $baseBillsQuery)
            ->where('status', Bill::STATUS_PAID)
            ->when(
                $paidRange['from'] && $paidRange['to'],
                fn ($query) => $query->whereBetween('closed_at', [$paidRange['from'], $paidRange['to']])
            )
            ->paginate(perPage: 10, pageName: 'paid_page')
            ->withQueryString();

        $mergeCandidates = Bill::query()
            ->where('status', Bill::STATUS_OPEN)
            ->whereNull('merged_into_bill_id')
            ->with('tables:id,code,name')
            ->latest('opened_at')
            ->limit(200)
            ->get()
            ->map(fn (Bill $bill) => [
                'id' => $bill->id,
                'billNumber' => $bill->bill_number,
                'tableCodes' => $bill->tables->pluck('code')->values(),
            ]);

        return Inertia::render('cashier/orders', [
            'filters' => [
                'tab' => $validTab,
                'period' => $paidRange['period'],
                'startDate' => $paidRange['startDate'],
                'endDate' => $paidRange['endDate'],
            ],
            'orderStatusOptions' => Order::AVAILABLE_STATUSES,
            'paymentMethodOptions' => BillPayment::AVAILABLE_METHODS,
            'mergeCandidates' => $mergeCandidates,
            'openBills' => $this->serializeBillPaginator($openBills),
            'paidBills' => $this->serializeBillPaginator($paidBills),
            'updatedAt' => now()->toISOString(),
        ]);
    }

    private function resolvePaidRangeFilter(Request $request): array
    {
        $period = $request->string('period')->toString();
        $validPeriod = in_array($period, ['day', 'week', 'month', 'custom'], true) ? $period : 'day';

        $startDate = $request->string('start_date')->toString() ?: null;
        $endDate = $request->string('end_date')->toString() ?: null;

        $from = null;
        $to = null;

        if ($validPeriod === 'day') {
            $from = now()->startOfDay();
            $to = now()->endOfDay();
        }

        if ($validPeriod === 'week') {
            $from = now()->subDays(6)->startOfDay();
            $to = now()->endOfDay();
        }

        if ($validPeriod === 'month') {
            $from = now()->subDays(29)->startOfDay();
            $to = now()->endOfDay();
        }

        if ($validPeriod === 'custom' && $startDate && $endDate) {
            try {
                $parsedStart = Carbon::parse($startDate)->startOfDay();
                $parsedEnd = Carbon::parse($endDate)->endOfDay();

                if ($parsedStart->lessThanOrEqualTo($parsedEnd)) {
                    $from = $parsedStart;
                    $to = $parsedEnd;
                }
            } catch (\Throwable) {
                $from = null;
                $to = null;
            }
        }

        return [
            'period' => $validPeriod,
            'startDate' => $startDate,
            'endDate' => $endDate,
            'from' => $from,
            'to' => $to,
        ];
    }

    public function updateStatus(Request $request, Order $order): RedirectResponse
    {
        $user = $request->user();

        if ($user && $user->hasRole('cashier') && ! $user->hasRole('admin')) {
            return back()->with('error', 'Role kasir tidak diizinkan mengubah status pesanan.');
        }

        $validated = $request->validate([
            'status' => ['required', 'string', 'in:'.implode(',', Order::AVAILABLE_STATUSES)],
        ]);

        if ($order->bill && $order->bill->status === Bill::STATUS_PAID) {
            return back()->with('error', 'Status order pada bill yang sudah lunas tidak dapat diubah.');
        }

        $newStatus = $validated['status'];
        $payload = [
            'status' => $newStatus,
        ];

        if ($newStatus === Order::STATUS_SERVED && ! $order->served_at) {
            $payload['served_at'] = now();
        }

        if ($newStatus === Order::STATUS_COMPLETED && ! $order->completed_at) {
            $payload['completed_at'] = now();
        }

        $order->update($payload);

        $bill = $order->bill;

        if ($bill) {
            $this->syncBillTotal($bill);
        }

        OrderLifecycleUpdated::dispatch($order->fresh());

        if ($bill) {
            BillLifecycleUpdated::dispatch($bill->fresh());
        }

        return back()->with('success', "Status order {$order->order_number} diperbarui ke {$newStatus}.");
    }

    public function mergeBills(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'source_bill_id' => ['required', 'integer', 'exists:bills,id'],
            'target_bill_id' => ['required', 'integer', 'exists:bills,id', 'different:source_bill_id'],
        ]);

        [$sourceBill, $targetBill] = DB::transaction(function () use ($validated) {
            $source = Bill::query()->lockForUpdate()->findOrFail($validated['source_bill_id']);
            $target = Bill::query()->lockForUpdate()->findOrFail($validated['target_bill_id']);

            if ($source->status !== Bill::STATUS_OPEN || $target->status !== Bill::STATUS_OPEN) {
                abort(422, 'Hanya bill open yang bisa di-merge.');
            }

            $source->orders()->update(['bill_id' => $target->id]);
            $target->tables()->syncWithoutDetaching($source->tables()->pluck('cafe_tables.id')->all());

            $source->update([
                'status' => Bill::STATUS_MERGED,
                'merged_into_bill_id' => $target->id,
                'closed_at' => now(),
                'total_amount' => 0,
            ]);

            $this->syncBillTotal($target);

            return [$source->fresh(), $target->fresh()];
        });

        BillLifecycleUpdated::dispatch($sourceBill);
        BillLifecycleUpdated::dispatch($targetBill);

        return back()->with('success', "Bill {$sourceBill->bill_number} digabung ke {$targetBill->bill_number}.");
    }

    public function splitBill(Request $request, Bill $bill): RedirectResponse
    {
        $validated = $request->validate([
            'paid_items' => ['required', 'array', 'min:1'],
            'paid_items.*.order_item_id' => ['required', 'integer', 'distinct'],
            'paid_items.*.quantity' => ['required', 'integer', 'min:1'],
            'payment_method' => ['nullable', 'string', 'in:'.implode(',', BillPayment::AVAILABLE_METHODS)],
        ]);

        try {
            $updatedBill = DB::transaction(function () use ($bill, $request, $validated) {
                $lockedSourceBill = Bill::query()->lockForUpdate()->findOrFail($bill->id);

                if ($lockedSourceBill->status !== Bill::STATUS_OPEN) {
                    throw new DomainException('Hanya bill aktif yang bisa dipisah.');
                }

                $selectedItemsPayload = collect($validated['paid_items'])
                    ->map(fn (array $item) => [
                        'order_item_id' => (int) $item['order_item_id'],
                        'quantity' => (int) $item['quantity'],
                    ])
                    ->keyBy('order_item_id');

                $selectedItemIds = $selectedItemsPayload->keys()->map(fn ($id) => (int) $id)->values();

                $selectedItems = OrderItem::query()
                    ->whereIn('id', $selectedItemIds)
                    ->whereNull('paid_at')
                    ->whereHas('order', fn ($query) => $query
                        ->where('bill_id', $lockedSourceBill->id)
                        ->where('status', '!=', Order::STATUS_CANCELLED))
                    ->with('order:id,status,served_at,completed_at')
                    ->lockForUpdate()
                    ->get();

                if ($selectedItems->count() !== $selectedItemIds->count()) {
                    throw new DomainException('Sebagian item pesanan tidak valid untuk pemisahan pembayaran.');
                }

                $totalUnpaidQuantity = (int) OrderItem::query()
                    ->whereNull('paid_at')
                    ->whereHas('order', fn ($query) => $query
                        ->where('bill_id', $lockedSourceBill->id)
                        ->where('status', '!=', Order::STATUS_CANCELLED))
                    ->sum('quantity');

                if ($totalUnpaidQuantity < 2) {
                    throw new DomainException('Split pembayaran butuh minimal kuantitas item belum dibayar sebanyak 2.');
                }

                $selectedQuantityTotal = 0;
                $paymentAmount = 0.0;

                foreach ($selectedItems as $selectedItem) {
                    $requestedQuantity = (int) ($selectedItemsPayload->get($selectedItem->id)['quantity'] ?? 0);

                    if ($requestedQuantity < 1 || $requestedQuantity > (int) $selectedItem->quantity) {
                        throw new DomainException('Kuantitas item yang dipilih tidak valid untuk split pembayaran.');
                    }

                    $selectedQuantityTotal += $requestedQuantity;
                    $paymentAmount += $requestedQuantity * (float) $selectedItem->unit_price;
                }

                if ($selectedQuantityTotal >= $totalUnpaidQuantity) {
                    throw new DomainException('Pilih sebagian kuantitas item saja agar tetap dianggap split pembayaran.');
                }

                $paymentAmount = round($paymentAmount, 2);

                if ($paymentAmount <= 0) {
                    throw new DomainException('Nominal split pembayaran tidak valid.');
                }

                $payment = $lockedSourceBill->payments()->create([
                    'cashier_id' => $request->user()?->id,
                    'amount' => $paymentAmount,
                    'payment_method' => $validated['payment_method'] ?? BillPayment::METHOD_CASH,
                    'note' => 'Split pembayaran item bill',
                    'paid_at' => now(),
                ]);

                $paymentTimestamp = $payment->paid_at;

                foreach ($selectedItems as $selectedItem) {
                    $requestedQuantity = (int) ($selectedItemsPayload->get($selectedItem->id)['quantity'] ?? 0);

                    if ($requestedQuantity === (int) $selectedItem->quantity) {
                        $selectedItem->update([
                            'paid_at' => $paymentTimestamp,
                        ]);

                        continue;
                    }

                    $remainingQuantity = (int) $selectedItem->quantity - $requestedQuantity;

                    $selectedItem->update([
                        'quantity' => $remainingQuantity,
                        'line_total' => round($remainingQuantity * (float) $selectedItem->unit_price, 2),
                    ]);

                    OrderItem::query()->create([
                        'order_id' => $selectedItem->order_id,
                        'menu_item_id' => $selectedItem->menu_item_id,
                        'menu_item_name' => $selectedItem->menu_item_name,
                        'quantity' => $requestedQuantity,
                        'unit_price' => $selectedItem->unit_price,
                        'line_total' => round($requestedQuantity * (float) $selectedItem->unit_price, 2),
                        'special_request' => $selectedItem->special_request,
                        'paid_at' => $paymentTimestamp,
                    ]);
                }

                $relatedOrderIds = $selectedItems->pluck('order_id')->unique()->values();

                foreach ($relatedOrderIds as $orderId) {
                    $order = Order::query()->lockForUpdate()->find($orderId);

                    if (! $order) {
                        continue;
                    }

                    $orderTotal = (float) $order->items()->sum('line_total');
                    $remainingUnpaid = (int) $order->items()->whereNull('paid_at')->count();

                    if ($remainingUnpaid > 0) {
                        $order->update([
                            'total_amount' => round($orderTotal, 2),
                        ]);

                        continue;
                    }

                    $order->update([
                        'status' => Order::STATUS_COMPLETED,
                        'total_amount' => round($orderTotal, 2),
                        'served_at' => $order->served_at ?? now(),
                        'completed_at' => $order->completed_at ?? now(),
                    ]);

                    OrderLifecycleUpdated::dispatch($order->fresh());
                }

                $paidAfterPayment = (float) $lockedSourceBill->payments()->sum('amount');
                $remainingAmount = round(max((float) $lockedSourceBill->total_amount - $paidAfterPayment, 0), 2);

                if ($remainingAmount <= 0) {
                    $updatedOrderIds = $this->completeOrdersForBill($lockedSourceBill);

                    Order::query()->whereIn('id', $updatedOrderIds)->get()->each(function (Order $order): void {
                        OrderLifecycleUpdated::dispatch($order);
                    });

                    $lockedSourceBill->update([
                        'status' => Bill::STATUS_PAID,
                        'closed_at' => now(),
                    ]);
                }

                $this->syncBillTotal($lockedSourceBill);

                return $lockedSourceBill->fresh();
            });
        } catch (DomainException $exception) {
            return back()->with('error', $exception->getMessage());
        }

        BillLifecycleUpdated::dispatch($updatedBill);

        return back()->with('success', "Split pembayaran item pada bill {$updatedBill->bill_number} berhasil dicatat.");
    }

    public function addPayment(Request $request, Bill $bill): RedirectResponse
    {
        $validated = $request->validate([
            'amount' => ['required', 'numeric', 'min:0.01'],
            'payment_method' => ['required', 'string', 'in:'.implode(',', BillPayment::AVAILABLE_METHODS)],
            'note' => ['nullable', 'string', 'max:250'],
        ]);

        [$updatedBill, $updatedOrderIds, $isFullyPaid] = DB::transaction(function () use ($bill, $request, $validated) {
            $lockedBill = Bill::query()->lockForUpdate()->findOrFail($bill->id);

            if ($lockedBill->status !== Bill::STATUS_OPEN) {
                abort(422, 'Bill ini sudah tidak open.');
            }

            $this->syncBillTotal($lockedBill);

            $currentPaidAmount = (float) $lockedBill->payments()->sum('amount');
            $remainingAmount = round(max((float) $lockedBill->total_amount - $currentPaidAmount, 0), 2);

            if ($remainingAmount <= 0) {
                abort(422, 'Bill ini sudah lunas.');
            }

            $paymentAmount = round((float) $validated['amount'], 2);

            if ($paymentAmount > $remainingAmount) {
                abort(422, 'Jumlah pembayaran melebihi sisa tagihan.');
            }

            $lockedBill->payments()->create([
                'cashier_id' => $request->user()?->id,
                'amount' => $paymentAmount,
                'payment_method' => $validated['payment_method'],
                'note' => $validated['note'] ?? null,
                'paid_at' => now(),
            ]);

            $paidAfterPayment = (float) $lockedBill->payments()->sum('amount');
            $remainingAfterPayment = round(max((float) $lockedBill->total_amount - $paidAfterPayment, 0), 2);

            $updatedOrderIds = [];
            $isFullyPaid = $remainingAfterPayment <= 0;

            if ($isFullyPaid) {
                $updatedOrderIds = $this->completeOrdersForBill($lockedBill);
                $this->markAllUnpaidItemsAsPaid($lockedBill, now());

                $lockedBill->update([
                    'status' => Bill::STATUS_PAID,
                    'closed_at' => now(),
                ]);
            }

            return [$lockedBill->fresh(), $updatedOrderIds, $isFullyPaid];
        });

        Order::query()->whereIn('id', $updatedOrderIds)->get()->each(function (Order $order): void {
            OrderLifecycleUpdated::dispatch($order);
        });

        BillLifecycleUpdated::dispatch($updatedBill);

        if ($isFullyPaid) {
            return back()->with('success', "Pembayaran diterima. Bill {$updatedBill->bill_number} sudah lunas.");
        }

        return back()->with('success', "Pembayaran split untuk bill {$updatedBill->bill_number} berhasil dicatat.");
    }

    public function settle(Request $request, Bill $bill): RedirectResponse
    {
        $validated = $request->validate([
            'payment_method' => ['nullable', 'string', 'in:'.implode(',', BillPayment::AVAILABLE_METHODS)],
            'note' => ['nullable', 'string', 'max:250'],
        ]);

        if ($bill->status !== Bill::STATUS_OPEN) {
            return back()->with('error', 'Bill ini sudah tidak open.');
        }

        [$paidBill, $updatedOrderIds] = DB::transaction(function () use ($bill, $request, $validated) {
            $lockedBill = Bill::query()->lockForUpdate()->findOrFail($bill->id);

            if ($lockedBill->status !== Bill::STATUS_OPEN) {
                abort(422, 'Bill ini sudah tidak open.');
            }

            $this->syncBillTotal($lockedBill);

            $alreadyPaid = (float) $lockedBill->payments()->sum('amount');
            $remainingAmount = round(max((float) $lockedBill->total_amount - $alreadyPaid, 0), 2);

            if ($remainingAmount > 0) {
                $lockedBill->payments()->create([
                    'cashier_id' => $request->user()?->id,
                    'amount' => $remainingAmount,
                    'payment_method' => $validated['payment_method'] ?? BillPayment::METHOD_CASH,
                    'note' => $validated['note'] ?? 'Pelunasan akhir bill',
                    'paid_at' => now(),
                ]);
            }

            $updatedOrderIds = $this->completeOrdersForBill($lockedBill);
            $this->markAllUnpaidItemsAsPaid($lockedBill, now());

            $lockedBill->update([
                'status' => Bill::STATUS_PAID,
                'closed_at' => now(),
            ]);

            return [$lockedBill->fresh(), $updatedOrderIds];
        });

        Order::query()->whereIn('id', $updatedOrderIds)->get()->each(function (Order $order): void {
            OrderLifecycleUpdated::dispatch($order);
        });

        BillLifecycleUpdated::dispatch($paidBill);

        return back()->with('success', "Bill {$paidBill->bill_number} telah dilunasi.");
    }

    private function syncBillTotal(Bill $bill): void
    {
        $total = (float) $bill->orders()
            ->where('status', '!=', Order::STATUS_CANCELLED)
            ->sum('total_amount');

        $bill->update([
            'total_amount' => round($total, 2),
        ]);
    }

    private function completeOrdersForBill(Bill $bill): array
    {
        $timestamp = now();

        $updatedOrderIds = $bill->orders()
            ->whereNotIn('status', [Order::STATUS_COMPLETED, Order::STATUS_CANCELLED])
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->all();

        if ($updatedOrderIds === []) {
            return [];
        }

        Order::query()
            ->whereIn('id', $updatedOrderIds)
            ->whereNull('served_at')
            ->update([
                'served_at' => $timestamp,
            ]);

        Order::query()
            ->whereIn('id', $updatedOrderIds)
            ->update([
                'status' => Order::STATUS_COMPLETED,
                'completed_at' => $timestamp,
            ]);

        return $updatedOrderIds;
    }

    private function markAllUnpaidItemsAsPaid(Bill $bill, $timestamp): void
    {
        OrderItem::query()
            ->whereNull('paid_at')
            ->whereHas('order', fn ($query) => $query->where('bill_id', $bill->id))
            ->update(['paid_at' => $timestamp]);
    }

    private function generateBillNumber(): string
    {
        $date = now()->format('Ymd');
        $random = str_pad((string) random_int(1, 9999), 4, '0', STR_PAD_LEFT);

        return "BLL-{$date}-{$random}";
    }

    private function serializeBillPaginator(LengthAwarePaginator $paginator): array
    {
        return [
            'data' => collect($paginator->items())->map(fn (Bill $bill) => [
                'id' => $bill->id,
                'billNumber' => $bill->bill_number,
                'status' => $bill->status,
                'totalAmount' => $bill->total_amount,
                'paidAmount' => round((float) ($bill->paid_amount ?? 0), 2),
                'remainingAmount' => round(max((float) $bill->total_amount - (float) ($bill->paid_amount ?? 0), 0), 2),
                'openedAt' => optional($bill->opened_at)->toISOString(),
                'closedAt' => optional($bill->closed_at)->toISOString(),
                'tables' => $bill->tables->map(fn ($table) => [
                    'id' => $table->id,
                    'code' => $table->code,
                    'name' => $table->name,
                ]),
                'payments' => $bill->payments->map(fn (BillPayment $payment) => [
                    'id' => $payment->id,
                    'amount' => $payment->amount,
                    'paymentMethod' => $payment->payment_method,
                    'note' => $payment->note,
                    'cashierName' => $payment->cashier?->name,
                    'paidAt' => optional($payment->paid_at)->toISOString(),
                ]),
                'orders' => $bill->orders->map(fn (Order $order) => [
                    'id' => $order->id,
                    'orderNumber' => $order->order_number,
                    'status' => $order->status,
                    'customerName' => $order->customer_name,
                    'customerNote' => $order->customer_note,
                    'totalAmount' => $order->total_amount,
                    'canSplit' => $order->status !== Order::STATUS_CANCELLED,
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
                        'unitPrice' => $item->unit_price,
                        'lineTotal' => $item->line_total,
                        'paidAt' => optional($item->paid_at)->toISOString(),
                        'specialRequest' => $item->special_request,
                    ]),
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
