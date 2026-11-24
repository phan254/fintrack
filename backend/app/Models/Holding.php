<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Holding extends Model
{
    protected $fillable = [
        'portfolio_id',
        'user_id',
        'asset_name',
        'symbol',
        'asset_type',
        'quantity',
        'purchase_price',
        'current_price',
    ];

    protected $casts = [
        'quantity' => 'decimal:6',
        'purchase_price' => 'decimal:4',
        'current_price' => 'decimal:4',
    ];

    public function portfolio(): BelongsTo
    {
        return $this->belongsTo(Portfolio::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function getCurrentValueAttribute(): float
    {
        return (float) $this->quantity * (float) $this->current_price;
    }

    public function getGainLossAttribute(): float
    {
        return (float) $this->quantity *
            ((float) $this->current_price - (float) $this->purchase_price);
    }
}
