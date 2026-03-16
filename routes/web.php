<?php

use App\Http\Controllers\CafeOrderController;
use App\Http\Controllers\CashierOrderController;
use App\Http\Controllers\AdminManagementController;
use App\Http\Controllers\FinanceController;
use App\Http\Controllers\KitchenOrderController;
use App\Models\Bill;
use App\Models\CafeTable;
use App\Models\Order;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;
use Laravel\Fortify\Features;

Route::get('/', function () {
    $sampleTable = Schema::hasTable('cafe_tables')
        ? CafeTable::query()->where('is_active', true)->orderBy('code')->first()
        : null;

    return Inertia::render('welcome', [
        'canRegister' => Features::enabled(Features::registration()),
        'sampleScanUrl' => $sampleTable ? route('cafe.orders.show', ['token' => $sampleTable->qr_token]) : null,
    ]);
})->name('home');

Route::prefix('scan/{token}')->group(function () {
    Route::get('/', [CafeOrderController::class, 'show'])->name('cafe.orders.show');
    Route::post('/cart', [CafeOrderController::class, 'addToCart'])->name('cafe.orders.cart.add');
    Route::patch('/cart/{menuItemId}', [CafeOrderController::class, 'updateCart'])->name('cafe.orders.cart.update');
    Route::post('/checkout', [CafeOrderController::class, 'checkout'])->name('cafe.orders.checkout');
    Route::get('/success/{order}', [CafeOrderController::class, 'success'])->name('cafe.orders.success');
});

Route::get('dashboard', function () {
    $user = request()->user();

    $hasOrdersTable = Schema::hasTable('orders');
    $hasBillsTable = Schema::hasTable('bills');

    $paidBillsBaseQuery = $hasBillsTable
        ? Bill::query()->where('status', Bill::STATUS_PAID)
        : null;

    $todayStart = now()->startOfDay();
    $todayEnd = now()->endOfDay();
    $monthStart = now()->startOfMonth();
    $monthEnd = now()->endOfMonth();

    $revenueToday = $paidBillsBaseQuery
        ? (float) (clone $paidBillsBaseQuery)->whereBetween('closed_at', [$todayStart, $todayEnd])->sum('total_amount')
        : 0.0;

    $revenueMonth = $paidBillsBaseQuery
        ? (float) (clone $paidBillsBaseQuery)->whereBetween('closed_at', [$monthStart, $monthEnd])->sum('total_amount')
        : 0.0;

    $paidBillsToday = $paidBillsBaseQuery
        ? (int) (clone $paidBillsBaseQuery)->whereBetween('closed_at', [$todayStart, $todayEnd])->count()
        : 0;

    $averageTicketMonth = $paidBillsBaseQuery
        ? (float) ((clone $paidBillsBaseQuery)->whereBetween('closed_at', [$monthStart, $monthEnd])->avg('total_amount') ?? 0)
        : 0.0;

    $openExposure = $hasBillsTable
        ? (float) Bill::query()->where('status', Bill::STATUS_OPEN)->sum('total_amount')
        : 0.0;

    $openBillsCount = $hasBillsTable
        ? (int) Bill::query()->where('status', Bill::STATUS_OPEN)->count()
        : 0;

    $paidBillsCount = $hasBillsTable
        ? (int) Bill::query()->where('status', Bill::STATUS_PAID)->count()
        : 0;

    $billSettlementRate = ($openBillsCount + $paidBillsCount) > 0
        ? round(($paidBillsCount / ($openBillsCount + $paidBillsCount)) * 100, 1)
        : 0;

    $outstandingOrders = $hasOrdersTable
        ? Order::query()->whereNotIn('status', [Order::STATUS_COMPLETED, Order::STATUS_CANCELLED])->count()
        : 0;

    $recentPayments = $hasBillsTable
        ? Bill::query()
            ->with(['tables:id,code,name'])
            ->where('status', Bill::STATUS_PAID)
            ->latest('closed_at')
            ->limit(5)
            ->get()
            ->map(fn (Bill $bill) => [
                'id' => $bill->id,
                'billNumber' => $bill->bill_number,
                'totalAmount' => (float) $bill->total_amount,
                'closedAt' => $bill->closed_at?->toISOString(),
                'tableCodes' => $bill->tables->pluck('code')->values()->all(),
            ])
            ->all()
        : [];

    return Inertia::render('dashboard', [
        'cashierUrl' => route('cashier.orders.index'),
        'kitchenUrl' => route('kitchen.orders.index'),
        'financeUrl' => route('finance.index'),
        'adminUrl' => route('admin.management.index'),
        'canAccessCashier' => $user?->hasAnyRole(['admin', 'cashier']) ?? false,
        'canAccessKitchen' => $user?->hasAnyRole(['admin', 'kitchen', 'waiter']) ?? false,
        'canAccessFinance' => $user?->hasAnyRole(['admin', 'cashier']) ?? false,
        'canAccessAdmin' => $user?->hasRole('admin') ?? false,
        'orderStats' => $hasOrdersTable
            ? [
                'pending' => Order::query()->where('status', Order::STATUS_PENDING)->count(),
                'preparing' => Order::query()->where('status', Order::STATUS_PREPARING)->count(),
                'ready' => Order::query()->where('status', Order::STATUS_READY)->count(),
                'served' => Order::query()->where('status', Order::STATUS_SERVED)->count(),
            ]
            : [
                'pending' => 0,
                'preparing' => 0,
                'ready' => 0,
                'served' => 0,
            ],
        'billStats' => $hasBillsTable
            ? [
                'open' => Bill::query()->where('status', Bill::STATUS_OPEN)->count(),
                'paid' => Bill::query()->where('status', Bill::STATUS_PAID)->count(),
            ]
            : [
                'open' => 0,
                'paid' => 0,
            ],
        'financeStats' => [
            'revenueToday' => $revenueToday,
            'revenueMonth' => $revenueMonth,
            'paidBillsToday' => $paidBillsToday,
            'averageTicketMonth' => $averageTicketMonth,
            'openExposure' => $openExposure,
            'billSettlementRate' => $billSettlementRate,
            'outstandingOrders' => $outstandingOrders,
        ],
        'recentPayments' => $recentPayments,
    ]);
})->middleware(['auth', 'verified'])->name('dashboard');

Route::middleware(['auth', 'verified', 'role:admin|cashier'])->prefix('cashier')->group(function () {
    Route::get('/orders', [CashierOrderController::class, 'index'])->name('cashier.orders.index');
    Route::patch('/orders/{order}/status', [CashierOrderController::class, 'updateStatus'])->name('cashier.orders.status.update');
    Route::post('/bills/{bill}/split', [CashierOrderController::class, 'splitBill'])->name('cashier.bills.split');
    Route::post('/bills/{bill}/payments', [CashierOrderController::class, 'addPayment'])->name('cashier.bills.payments.store');
    Route::post('/bills/merge', [CashierOrderController::class, 'mergeBills'])->name('cashier.bills.merge');
    Route::post('/bills/{bill}/settle', [CashierOrderController::class, 'settle'])->name('cashier.bills.settle');
});

Route::middleware(['auth', 'verified', 'role:admin|cashier'])->prefix('finance')->group(function () {
    Route::get('/', [FinanceController::class, 'index'])->name('finance.index');
});

Route::middleware(['auth', 'verified', 'role:admin|kitchen|waiter'])->prefix('kitchen')->group(function () {
    Route::get('/orders', [KitchenOrderController::class, 'index'])->name('kitchen.orders.index');
});

Route::middleware(['auth', 'verified', 'role:admin|kitchen'])->prefix('kitchen')->group(function () {
    Route::patch('/orders/{order}/status', [KitchenOrderController::class, 'updateStatus'])->name('kitchen.orders.status.update');
});

Route::middleware(['auth', 'verified', 'role:admin|waiter'])->prefix('kitchen')->group(function () {
    Route::post('/orders/{order}/served', [KitchenOrderController::class, 'markServed'])->name('kitchen.orders.served');
});

Route::middleware(['auth', 'verified', 'role:admin'])->prefix('admin/management')->group(function () {
    Route::get('/', [AdminManagementController::class, 'index'])->name('admin.management.index');
    Route::get('/categories', [AdminManagementController::class, 'categories'])->name('admin.management.categories.index');
    Route::get('/menu', [AdminManagementController::class, 'menu'])->name('admin.management.menu.index');
    Route::get('/floors', [AdminManagementController::class, 'floors'])->name('admin.management.floors.index');
    Route::get('/tables', [AdminManagementController::class, 'tables'])->name('admin.management.tables.index');
    Route::get('/tables/{table}/print-qr', [AdminManagementController::class, 'printTableQr'])->name('admin.management.tables.qr-print');
    Route::post('/categories', [AdminManagementController::class, 'storeCategory'])->name('admin.management.categories.store');
    Route::patch('/categories/{category}', [AdminManagementController::class, 'updateCategory'])->name('admin.management.categories.update');
    Route::delete('/categories/{category}', [AdminManagementController::class, 'destroyCategory'])->name('admin.management.categories.destroy');
    Route::post('/menu-items', [AdminManagementController::class, 'storeMenuItem'])->name('admin.management.menu-items.store');
    Route::patch('/menu-items/{menuItem}', [AdminManagementController::class, 'updateMenuItem'])->name('admin.management.menu-items.update');
    Route::delete('/menu-items/{menuItem}', [AdminManagementController::class, 'destroyMenuItem'])->name('admin.management.menu-items.destroy');
    Route::post('/floors', [AdminManagementController::class, 'storeFloor'])->name('admin.management.floors.store');
    Route::patch('/floors/{floor}', [AdminManagementController::class, 'updateFloor'])->name('admin.management.floors.update');
    Route::delete('/floors/{floor}', [AdminManagementController::class, 'destroyFloor'])->name('admin.management.floors.destroy');
    Route::post('/tables', [AdminManagementController::class, 'storeTable'])->name('admin.management.tables.store');
    Route::patch('/tables/{table}', [AdminManagementController::class, 'updateTable'])->name('admin.management.tables.update');
});

require __DIR__.'/settings.php';
