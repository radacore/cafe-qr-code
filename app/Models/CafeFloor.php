<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Model;

class CafeFloor extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'floor_number',
        'indoor_table_count',
        'outdoor_table_count',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'floor_number' => 'integer',
            'indoor_table_count' => 'integer',
            'outdoor_table_count' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    public function tables(): HasMany
    {
        return $this->hasMany(CafeTable::class);
    }
}
