<?php

namespace Tests\Feature;

use App\Models\Bill;
use App\Models\BillPayment;
use App\Models\CafeTable;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class FinanceModuleTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
    }

    public function test_guest_cannot_access_finance_page(): void
    {
        $this->get(route('finance.index'))->assertRedirect(route('login'));
    }

    public function test_cashier_can_view_finance_page_with_payment_data(): void
    {
        Role::findOrCreate('cashier');

        $cashier = User::factory()->create();
        $cashier->assignRole('cashier');

        $table = CafeTable::query()->create([
            'code' => 'TF-01',
            'name' => 'Meja Finance 1',
            'qr_token' => 'meja-finance-1',
            'is_active' => true,
        ]);

        $bill = Bill::query()->create([
            'bill_number' => 'BILL-FIN-001',
            'status' => Bill::STATUS_PAID,
            'total_amount' => 120000,
            'opened_at' => now()->subHour(),
            'closed_at' => now(),
        ]);

        $bill->tables()->attach($table->id);

        BillPayment::query()->create([
            'bill_id' => $bill->id,
            'cashier_id' => $cashier->id,
            'amount' => 120000,
            'payment_method' => BillPayment::METHOD_TRANSFER,
            'reference_number' => 'TRF-1001',
            'paid_at' => now(),
        ]);

        $response = $this->actingAs($cashier)->get(route('finance.index', ['method' => 'transfer']));

        $response->assertInertia(fn (AssertableInertia $page) => $page
            ->component('finance/index')
            ->where('filters.method', 'transfer')
            ->where('payments.data.0.paymentMethod', BillPayment::METHOD_TRANSFER)
        );
    }

    public function test_authenticated_user_without_cashier_role_cannot_access_finance_page(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->get(route('finance.index'))->assertForbidden();
    }
}
