<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Model;

class BillPayment extends Model
{
    use HasFactory;

    public const METHOD_CASH = 'cash';
    public const METHOD_TRANSFER = 'transfer';

    public const AVAILABLE_METHODS = [
        self::METHOD_CASH,
        self::METHOD_TRANSFER,
    ];

    protected $fillable = [
        'bill_id',
        'cashier_id',
        'amount',
        'payment_method',
        'reference_number',
        'note',
        'paid_at',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'float',
            'paid_at' => 'datetime',
        ];
    }

    public function bill(): BelongsTo
    {
        return $this->belongsTo(Bill::class);
    }

    public function cashier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cashier_id');
    }
}
