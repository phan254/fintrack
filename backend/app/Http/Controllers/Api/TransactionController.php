<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Portfolio;
use App\Models\Transaction;
use App\Models\Holding;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class TransactionController extends Controller
{
    /**
     * Supported investment instruments.
     */
    private const INSTRUMENTS = [
        'SCOM' => [
            'name' => 'Safaricom PLC',
            'asset_type' => 'stock',
        ],
        'KCB' => [
            'name' => 'KCB Group',
            'asset_type' => 'stock',
        ],
        'EQTY' => [
            'name' => 'Equity Group',
            'asset_type' => 'stock',
        ],
        'T-BILL-91' => [
            'name' => '91-Day Treasury Bill',
            'asset_type' => 'bond',
        ],
    ];

    /**
     * List transactions belonging to a specific portfolio.
     */
    public function portfolioIndex(Request $request, string $portfolio)
    {
        $portfolioRecord = Portfolio::where('user_id', $request->user()->id)
            ->findOrFail($portfolio);

        $request->merge([
            'portfolio_id' => $portfolioRecord->id,
        ]);

        return $this->index($request);
    }

    /**
     * Create a transaction for a specific portfolio.
     */
    public function portfolioStore(Request $request, string $portfolio)
    {
        $portfolioRecord = Portfolio::where('user_id', $request->user()->id)
            ->findOrFail($portfolio);

        $request->merge([
            'portfolio_id' => $portfolioRecord->id,
        ]);

        return $this->store($request);
    }

    /**
     * List the authenticated user's transactions.
     */
    public function index(Request $request)
    {
        $query = Transaction::where('user_id', $request->user()->id)
            ->with('portfolio:id,name');

        if ($request->filled('portfolio_id')) {
            $query->where('portfolio_id', $request->portfolio_id);
        }

        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        if ($request->filled('category')) {
            $query->where('category', $request->category);
        }

        if ($request->filled('search')) {
            $search = $request->search;

            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('category', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%")
                    ->orWhere('instrument', 'like', "%{$search}%");
            });
        }

        $transactions = $query
            ->orderBy('transaction_date', 'desc')
            ->orderBy('created_at', 'desc')
            ->paginate(15);

        return response()->json([
            'message' => 'Transactions retrieved successfully.',
            'data' => $transactions,
        ]);
    }

    /**
     * Create income, expense, BUY or SELL transactions.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'portfolio_id' => 'required|integer|exists:portfolios,id',
            'type' => 'required|in:income,expense,buy,sell',

            'name' => 'nullable|string|max:255',
            'category' => 'nullable|string|max:100',
            'amount' => 'nullable|numeric|gt:0',
            'transaction_date' => 'nullable|date',

            'instrument' => 'required_if:type,buy,sell|nullable|string|in:SCOM,KCB,EQTY,T-BILL-91',
            'quantity' => 'required_if:type,buy,sell|nullable|numeric|gt:0|decimal:0,6',
            'unit_price' => 'required_if:type,buy,sell|nullable|numeric|gt:0|decimal:0,4',
            'trade_date' => 'required_if:type,buy,sell|nullable|date',

            'description' => 'nullable|string',
            'status' => 'nullable|in:pending,completed,failed',
        ]);

        if (in_array($validated['type'], ['income', 'expense'])) {
            $request->validate([
                'name' => 'required|string|max:255',
                'category' => 'required|string|max:100',
                'amount' => 'required|numeric|gt:0',
                'transaction_date' => 'required|date',
            ]);
        }

        if (in_array($validated['type'], ['buy', 'sell'])) {
            if (($validated['status'] ?? 'completed') !== 'completed') {
                throw ValidationException::withMessages([
                    'status' => 'Investment transactions must have completed status.',
                ]);
            }
        }

        $transaction = DB::transaction(function () use ($request, $validated) {
            $portfolio = Portfolio::where('id', $validated['portfolio_id'])
                ->where('user_id', $request->user()->id)
                ->lockForUpdate()
                ->firstOrFail();

            $type = $validated['type'];
            $userId = $request->user()->id;

            if (in_array($type, ['buy', 'sell'])) {
                $symbol = strtoupper(trim($validated['instrument']));
                $quantity = (float) $validated['quantity'];
                $unitPrice = (float) $validated['unit_price'];
                $tradeDate = $validated['trade_date'];

                $instrument = self::INSTRUMENTS[$symbol];

                $holding = Holding::where('portfolio_id', $portfolio->id)
                    ->where('user_id', $userId)
                    ->where('symbol', $symbol)
                    ->lockForUpdate()
                    ->first();

                if ($type === 'buy') {
                    if ($holding) {
                        $oldQuantity = (float) $holding->quantity;
                        $oldAverageCost = (float) $holding->purchase_price;

                        $newQuantity = round($oldQuantity + $quantity, 6);

                        $newAverageCost = (
                            ($oldQuantity * $oldAverageCost) +
                            ($quantity * $unitPrice)
                        ) / $newQuantity;

                        $holding->update([
                            'quantity' => $newQuantity,
                            'purchase_price' => round($newAverageCost, 4),
                            'current_price' => round($unitPrice, 4),
                        ]);
                    } else {
                        Holding::create([
                            'portfolio_id' => $portfolio->id,
                            'user_id' => $userId,
                            'asset_name' => $instrument['name'],
                            'symbol' => $symbol,
                            'asset_type' => $instrument['asset_type'],
                            'quantity' => $quantity,
                            'purchase_price' => round($unitPrice, 4),
                            'current_price' => round($unitPrice, 4),
                        ]);
                    }
                }

                if ($type === 'sell') {
                    if (!$holding) {
                        throw ValidationException::withMessages([
                            'instrument' => "You cannot sell {$symbol} because you do not hold it in this portfolio.",
                        ]);
                    }

                    $availableQuantity = (float) $holding->quantity;

                    if ($quantity > $availableQuantity) {
                        throw ValidationException::withMessages([
                            'quantity' => "Insufficient holdings. You have {$availableQuantity} units of {$symbol} available.",
                        ]);
                    }

                    $newQuantity = round($availableQuantity - $quantity, 6);

                    $holding->update([
                        'quantity' => $newQuantity,
                    ]);
                }

                $data = [
                    'portfolio_id' => $portfolio->id,
                    'user_id' => $userId,
                    'name' => $validated['name'] ?? strtoupper($type) . ' ' . $instrument['name'],
                    'category' => $validated['category'] ?? (
                        $instrument['asset_type'] === 'bond' ? 'Treasury Bill' : 'Shares'
                    ),
                    'type' => $type,
                    'amount' => round($quantity * $unitPrice, 2),
                    'transaction_date' => $tradeDate,
                    'description' => $validated['description'] ?? null,
                    'status' => 'completed',
                    'instrument' => $symbol,
                    'quantity' => $quantity,
                    'unit_price' => $unitPrice,
                    'trade_date' => $tradeDate,
                ];
            } else {
                $data = [
                    'portfolio_id' => $portfolio->id,
                    'user_id' => $userId,
                    'name' => $validated['name'],
                    'category' => $validated['category'],
                    'type' => $type,
                    'amount' => $validated['amount'],
                    'transaction_date' => $validated['transaction_date'],
                    'description' => $validated['description'] ?? null,
                    'status' => $validated['status'] ?? 'completed',
                ];
            }

            return Transaction::create($data);
        });

        return response()->json([
            'message' => 'Transaction created successfully.',
            'data' => $transaction->load('portfolio:id,name'),
        ], 201);
    }

    /**
     * View one transaction.
     */
    public function show(Request $request, string $id)
    {
        $transaction = $this->findUserTransaction($request, $id);

        return response()->json([
            'message' => 'Transaction retrieved successfully.',
            'data' => $transaction->load('portfolio:id,name'),
        ]);
    }

    /**
     * Update legacy income and expense transactions.
     */
    public function update(Request $request, string $id)
    {
        $transaction = $this->findUserTransaction($request, $id);

        if (in_array($transaction->type, ['buy', 'sell'])) {
            return response()->json([
                'message' => 'Investment trades cannot be edited. Record a correcting transaction instead.',
            ], 422);
        }

        $validated = $request->validate([
            'portfolio_id' => 'sometimes|required|integer|exists:portfolios,id',
            'name' => 'sometimes|required|string|max:255',
            'category' => 'sometimes|required|string|max:100',
            'type' => 'sometimes|required|in:income,expense',
            'amount' => 'sometimes|required|numeric|gt:0',
            'transaction_date' => 'sometimes|required|date',
            'description' => 'nullable|string',
            'status' => 'sometimes|required|in:pending,completed,failed',
        ]);

        if (isset($validated['portfolio_id'])) {
            Portfolio::where('id', $validated['portfolio_id'])
                ->where('user_id', $request->user()->id)
                ->firstOrFail();
        }

        $transaction->update($validated);

        return response()->json([
            'message' => 'Transaction updated successfully.',
            'data' => $transaction->fresh()->load('portfolio:id,name'),
        ]);
    }

    /**
     * Delete a transaction and recalculate investment holdings.
     */
    public function destroy(Request $request, string $id)
    {
        DB::transaction(function () use ($request, $id) {
            $transaction = Transaction::where('user_id', $request->user()->id)
                ->lockForUpdate()
                ->findOrFail($id);

            if (in_array($transaction->type, ['buy', 'sell'])) {
                $portfolio = Portfolio::where('id', $transaction->portfolio_id)
                    ->where('user_id', $request->user()->id)
                    ->lockForUpdate()
                    ->firstOrFail();

                $symbol = $transaction->instrument;

                $holding = Holding::where('portfolio_id', $portfolio->id)
                    ->where('user_id', $request->user()->id)
                    ->where('symbol', $symbol)
                    ->lockForUpdate()
                    ->first();

                $remainingTransactions = Transaction::where('user_id', $request->user()->id)
                    ->where('portfolio_id', $portfolio->id)
                    ->where('instrument', $symbol)
                    ->whereIn('type', ['buy', 'sell'])
                    ->where('id', '!=', $transaction->id)
                    ->orderBy('trade_date')
                    ->orderBy('id')
                    ->get();

                $this->recalculateHolding(
                    $portfolio,
                    $symbol,
                    $remainingTransactions,
                    $holding
                );
            }

            $transaction->delete();
        });

        return response()->json([
            'message' => 'Transaction deleted successfully.',
        ]);
    }

    /**
     * Rebuild a holding from its remaining BUY and SELL history.
     */
    private function recalculateHolding(
        Portfolio $portfolio,
        string $symbol,
        $transactions,
        ?Holding $holding
    ): void {
        $quantity = 0.0;
        $totalCost = 0.0;
        $lastBuyPrice = null;

        foreach ($transactions as $transaction) {
            $tradeQuantity = (float) $transaction->quantity;
            $unitPrice = (float) $transaction->unit_price;

            if ($transaction->type === 'buy') {
                $quantity += $tradeQuantity;
                $totalCost += $tradeQuantity * $unitPrice;
                $lastBuyPrice = $unitPrice;
            } elseif ($transaction->type === 'sell') {
                if ($tradeQuantity > $quantity + 0.000001) {
                    throw ValidationException::withMessages([
                        'transaction' => 'This transaction cannot be deleted because the remaining sales would exceed the available holdings.',
                    ]);
                }

                $averageCost = $quantity > 0
                    ? $totalCost / $quantity
                    : 0;

                $totalCost -= $averageCost * $tradeQuantity;
                $quantity -= $tradeQuantity;

                if ($quantity < 0.000001) {
                    $quantity = 0.0;
                    $totalCost = 0.0;
                }
            }
        }

        $quantity = round($quantity, 6);

        if ($quantity <= 0) {
            if ($holding) {
                $holding->delete();
            }

            return;
        }

        $averageCost = round($totalCost / $quantity, 4);

        if ($holding) {
            $holding->update([
                'quantity' => $quantity,
                'purchase_price' => $averageCost,
            ]);

            return;
        }

        $instrument = self::INSTRUMENTS[$symbol] ?? null;

        if (!$instrument) {
            throw ValidationException::withMessages([
                'instrument' => 'The investment instrument is not supported.',
            ]);
        }

        Holding::create([
            'portfolio_id' => $portfolio->id,
            'user_id' => $portfolio->user_id,
            'asset_name' => $instrument['name'],
            'symbol' => $symbol,
            'asset_type' => $instrument['asset_type'],
            'quantity' => $quantity,
            'purchase_price' => $averageCost,
            'current_price' => round($lastBuyPrice ?? $averageCost, 4),
        ]);
    }

    /**
     * Find a transaction belonging to the authenticated user.
     */
    private function findUserTransaction(Request $request, string $id): Transaction
    {
        return Transaction::where('user_id', $request->user()->id)
            ->findOrFail($id);
    }
}
