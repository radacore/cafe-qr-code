<?php

namespace App\Http\Controllers;

use App\Models\Bill;
use App\Models\BillPayment;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;
use Inertia\Response;

class FinanceController extends Controller
{
    public function index(Request $request): Response
    {
        if (! Schema::hasTable('bills') || ! Schema::hasTable('bill_payments')) {
            return Inertia::render('finance/index', [
                'filters' => [
                    'method' => 'all',
                ],
                'methodOptions' => ['all', ...BillPayment::AVAILABLE_METHODS],
                'summary' => [
                    'collectedToday' => 0,
                    'collectedMonth' => 0,
                    'cashToday' => 0,
                    'transferToday' => 0,
                    'openReceivables' => 0,
                    'collectionRate' => 0,
                ],
                'charts' => [
                    'dailyRevenue' => [],
                    'methodMixMonth' => [],
                ],
                'payments' => [
                    'data' => [],
                    'meta' => [
                        'currentPage' => 1,
                        'lastPage' => 1,
                        'perPage' => 10,
                        'total' => 0,
                        'hasMorePages' => false,
                    ],
                ],
                'openBills' => [],
                'schemaReady' => false,
                'schemaMessage' => 'Schema pembayaran belum siap. Jalankan `php artisan migrate` lalu refresh halaman ini.',
            ]);
        }

        $methodFilter = $request->string('method')->toString();
        $validMethod = in_array($methodFilter, BillPayment::AVAILABLE_METHODS, true) ? $methodFilter : 'all';

        $todayStart = now()->startOfDay();
        $todayEnd = now()->endOfDay();
        $monthStart = now()->startOfMonth();
        $monthEnd = now()->endOfMonth();

        $paymentsQuery = BillPayment::query()
            ->with(['bill:id,bill_number,total_amount,status', 'cashier:id,name'])
            ->latest('paid_at')
            ->latest('id');

        if ($validMethod !== 'all') {
            $paymentsQuery->where('payment_method', $validMethod);
        }

        $payments = $paymentsQuery
            ->paginate(perPage: 10, pageName: 'payments_page')
            ->withQueryString();

        $todayByMethod = BillPayment::query()
            ->selectRaw('payment_method, SUM(amount) as total')
            ->whereBetween('paid_at', [$todayStart, $todayEnd])
            ->groupBy('payment_method')
            ->pluck('total', 'payment_method');

        $cashToday = (float) ($todayByMethod[BillPayment::METHOD_CASH] ?? 0);
        $transferToday = (float) ($todayByMethod[BillPayment::METHOD_TRANSFER] ?? 0);
        $collectedToday = $cashToday + $transferToday;

        $collectedMonth = (float) BillPayment::query()
            ->whereBetween('paid_at', [$monthStart, $monthEnd])
            ->sum('amount');

        $methodMixMonthRaw = BillPayment::query()
            ->selectRaw('payment_method, SUM(amount) as total')
            ->whereBetween('paid_at', [$monthStart, $monthEnd])
            ->groupBy('payment_method')
            ->pluck('total', 'payment_method');

        $openReceivables = (float) Bill::query()
            ->where('status', Bill::STATUS_OPEN)
            ->sum('total_amount');

        $paidBills = (int) Bill::query()
            ->where('status', Bill::STATUS_PAID)
            ->count();

        $openBills = (int) Bill::query()
            ->where('status', Bill::STATUS_OPEN)
            ->count();

        $collectionRate = ($paidBills + $openBills) > 0
            ? round(($paidBills / ($paidBills + $openBills)) * 100, 1)
            : 0;

        $dailyRows = BillPayment::query()
            ->selectRaw('DATE(paid_at) as date_key, SUM(amount) as total')
            ->whereBetween('paid_at', [now()->subDays(6)->startOfDay(), $todayEnd])
            ->groupBy('date_key')
            ->orderBy('date_key')
            ->get();

        $dailyMap = $dailyRows
            ->mapWithKeys(fn ($row) => [(string) $row->date_key => (float) $row->total]);

        $hariBerjalan = max((int) now()->day, 1);
        $targetHarian = round($collectedMonth / $hariBerjalan, 2);

        $dailyRevenue = collect(range(6, 0))
            ->map(function (int $daysAgo) use ($dailyMap, $targetHarian) {
                $date = now()->subDays($daysAgo);
                $key = $date->toDateString();

                return [
                    'date' => $key,
                    'label' => $date->translatedFormat('D'),
                    'total' => round((float) ($dailyMap[$key] ?? 0), 2),
                    'target' => $targetHarian,
                ];
            })
            ->values();

        $methodMixMonth = collect(BillPayment::AVAILABLE_METHODS)
            ->map(function (string $method) use ($methodMixMonthRaw, $collectedMonth) {
                $total = round((float) ($methodMixMonthRaw[$method] ?? 0), 2);

                return [
                    'method' => $method,
                    'total' => $total,
                    'percentage' => $collectedMonth > 0 ? round(($total / $collectedMonth) * 100, 1) : 0,
                ];
            })
            ->values();

        $openBillsData = Bill::query()
            ->with('tables:id,code,name')
            ->where('status', Bill::STATUS_OPEN)
            ->whereNull('merged_into_bill_id')
            ->latest('opened_at')
            ->limit(20)
            ->get()
            ->map(fn (Bill $bill) => [
                'id' => $bill->id,
                'billNumber' => $bill->bill_number,
                'totalAmount' => (float) $bill->total_amount,
                'openedAt' => $bill->opened_at?->toISOString(),
                'tableCodes' => $bill->tables->pluck('code')->values()->all(),
            ]);

        return Inertia::render('finance/index', [
            'filters' => [
                'method' => $validMethod,
            ],
            'methodOptions' => ['all', ...BillPayment::AVAILABLE_METHODS],
            'summary' => [
                'collectedToday' => round($collectedToday, 2),
                'collectedMonth' => round($collectedMonth, 2),
                'cashToday' => round($cashToday, 2),
                'transferToday' => round($transferToday, 2),
                'openReceivables' => round($openReceivables, 2),
                'collectionRate' => $collectionRate,
            ],
            'charts' => [
                'dailyRevenue' => $dailyRevenue,
                'methodMixMonth' => $methodMixMonth,
            ],
            'payments' => $this->serializePaymentPaginator($payments),
            'openBills' => $openBillsData,
            'schemaReady' => true,
            'schemaMessage' => null,
        ]);
    }

    private function serializePaymentPaginator(LengthAwarePaginator $paginator): array
    {
        return [
            'data' => collect($paginator->items())->map(fn (BillPayment $payment) => [
                'id' => $payment->id,
                'amount' => (float) $payment->amount,
                'paymentMethod' => $payment->payment_method,
                'note' => $payment->note,
                'paidAt' => $payment->paid_at?->toISOString(),
                'bill' => [
                    'id' => $payment->bill?->id,
                    'billNumber' => $payment->bill?->bill_number,
                    'status' => $payment->bill?->status,
                    'totalAmount' => (float) ($payment->bill?->total_amount ?? 0),
                ],
                'cashierName' => $payment->cashier?->name,
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
