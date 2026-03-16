<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Model;

class Bill extends Model
{
    use HasFactory;

    public const STATUS_OPEN = 'open';
    public const STATUS_MERGED = 'merged';
    public const STATUS_PAID = 'paid';

    public const AVAILABLE_STATUSES = [
        self::STATUS_OPEN,
        self::STATUS_MERGED,
        self::STATUS_PAID,
    ];

    protected $fillable = [
        'bill_number',
        'status',
        'merged_into_bill_id',
        'total_amount',
        'opened_at',
        'closed_at',
    ];

    protected function casts(): array
    {
        return [
            'total_amount' => 'float',
            'opened_at' => 'datetime',
            'closed_at' => 'datetime',
        ];
    }

    public function tables(): BelongsToMany
    {
        return $this->belongsToMany(CafeTable::class, 'bill_tables')->withTimestamps();
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(BillPayment::class);
    }

    public function mergedInto(): BelongsTo
    {
        return $this->belongsTo(self::class, 'merged_into_bill_id');
    }

    public function mergedBills(): HasMany
    {
        return $this->hasMany(self::class, 'merged_into_bill_id');
    }

    public function paidAmount(): float
    {
        return round((float) $this->payments()->sum('amount'), 2);
    }

    public function remainingAmount(): float
    {
        return round(max((float) $this->total_amount - $this->paidAmount(), 0), 2);
    }
}
