<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Transaction extends Model
{
    protected $fillable = [
        'portfolio_id',
        'user_id',
        'name',
        'category',
        'type',
        'amount',
        'transaction_date',
        'description',
        'status',
        'instrument',
        'quantity',
        'unit_price',
        'trade_date',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'transaction_date' => 'date',
        'trade_date' => 'date',
        'quantity' => 'decimal:6',
        'unit_price' => 'decimal:4',
    ];

    public function portfolio(): BelongsTo
    {
        return $this->belongsTo(Portfolio::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
