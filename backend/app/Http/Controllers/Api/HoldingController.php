<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Holding;
use App\Models\Portfolio;
use App\Models\Transaction;
use Illuminate\Http\Request;

class HoldingController extends Controller
{
    // List holdings belonging to the authenticated user.
    public function index(Request $request)
    {
        $query = Holding::where('user_id', $request->user()->id)
            ->with('portfolio:id,name');

        if ($request->filled('portfolio_id')) {
            $query->where('portfolio_id', $request->portfolio_id);
        }

        $holdings = $query->latest()->get();

        return response()->json([
            'message' => 'Holdings retrieved successfully.',
            'data' => $holdings,
        ]);
    }

    // Create a holding.
    public function store(Request $request)
    {
        $validated = $request->validate([
            'portfolio_id' => 'required|integer|exists:portfolios,id',
            'asset_name' => 'required|string|max:255',
            'symbol' => 'nullable|string|max:50',
            'asset_type' => 'required|in:stock,bond,cash,crypto,other',
            'quantity' => 'required|numeric|gt:0',
            'purchase_price' => 'required|numeric|min:0',
            'current_price' => 'nullable|numeric|min:0',
        ]);

        Portfolio::where('id', $validated['portfolio_id'])
            ->where('user_id', $request->user()->id)
            ->firstOrFail();

        $holding = Holding::create([
            ...$validated,
            'user_id' => $request->user()->id,
            'current_price' => $validated['current_price']
                ?? $validated['purchase_price'],
        ]);

        return response()->json([
            'message' => 'Holding created successfully.',
            'data' => $holding->load('portfolio:id,name'),
        ], 201);
    }

    // View one holding.
    public function show(Request $request, string $id)
    {
        $holding = $this->findUserHolding($request, $id);

        return response()->json([
            'message' => 'Holding retrieved successfully.',
            'data' => $holding->load('portfolio:id,name'),
        ]);
    }

    // Update a holding.
    public function update(Request $request, string $id)
    {
        $holding = $this->findUserHolding($request, $id);

        $validated = $request->validate([
            'portfolio_id' => 'sometimes|required|integer|exists:portfolios,id',
            'asset_name' => 'sometimes|required|string|max:255',
            'symbol' => 'nullable|string|max:50',
            'asset_type' => 'sometimes|required|in:stock,bond,cash,crypto,other',
            'quantity' => 'sometimes|required|numeric|gt:0',
            'purchase_price' => 'sometimes|required|numeric|min:0',
            'current_price' => 'sometimes|required|numeric|min:0',
        ]);

        if (isset($validated['portfolio_id'])) {
            Portfolio::where('id', $validated['portfolio_id'])
                ->where('user_id', $request->user()->id)
                ->firstOrFail();
        }

        $holding->update($validated);

        return response()->json([
            'message' => 'Holding updated successfully.',
            'data' => $holding->fresh()->load('portfolio:id,name'),
        ]);
    }

    // Delete a holding.
    public function destroy(Request $request, string $id)
    {
        $holding = $this->findUserHolding($request, $id);

        $holding->delete();

        return response()->json([
            'message' => 'Holding deleted successfully.',
        ]);
    }

    // Portfolio investment summary.
    public function summary(Request $request, string $portfolioId)
    {
        $portfolio = Portfolio::where('user_id', $request->user()->id)
            ->findOrFail($portfolioId);

        $holdings = Holding::where('user_id', $request->user()->id)
            ->where('portfolio_id', $portfolio->id)
            ->get();

        $transactions = Transaction::where('user_id', $request->user()->id)
            ->where('portfolio_id', $portfolio->id)
            ->where('status', 'completed')
            ->get();

        // Cash transactions.
        $income = $transactions->where('type', 'income')->sum('amount');
        $expenses = $transactions->where('type', 'expense')->sum('amount');

        // Investment transaction totals.
        $purchases = $transactions->where('type', 'buy')->sum('amount');
        $sales = $transactions->where('type', 'sell')->sum('amount');

        $cashBalance = (float) $portfolio->initial_balance
            + (float) $income
            - (float) $expenses
            - (float) $purchases
            + (float) $sales;

        // Individual instrument summaries.
        $instrumentSummary = $holdings->map(function ($holding) {
            $quantity = (float) $holding->quantity;
            $averageCost = (float) $holding->purchase_price;
            $currentPrice = (float) $holding->current_price;

            $totalInvested = $quantity * $averageCost;
            $totalValue = $quantity * $currentPrice;

            return [
                'instrument' => $holding->symbol ?: $holding->asset_name,
                'asset_name' => $holding->asset_name,
                'asset_type' => $holding->asset_type,
                'quantity' => round($quantity, 6),
                'average_cost' => round($averageCost, 4),
                'current_price' => round($currentPrice, 4),
                'total_invested' => round($totalInvested, 2),
                'total_value' => round($totalValue, 2),
                'unrealized_gain_loss' => round(
                    $totalValue - $totalInvested,
                    2
                ),
            ];
        })->values();

        // Portfolio totals.
        $totalCost = $instrumentSummary->sum('total_invested');
        $holdingsValue = $instrumentSummary->sum('total_value');
        $gainLoss = $holdingsValue - $totalCost;

        // Asset allocation.
        $allocation = $holdings->groupBy('asset_type')->map(
            function ($items, $type) {
                return [
                    'asset_type' => $type,
                    'value' => round($items->sum(
                        fn ($holding) =>
                            (float) $holding->quantity
                            * (float) $holding->current_price
                    ), 2),
                ];
            }
        )->values();

        return response()->json([
            'message' => 'Portfolio summary retrieved successfully.',
            'data' => [
                'portfolio' => $portfolio,
                'currency' => $portfolio->currency,

                'initial_balance' => round(
                    (float) $portfolio->initial_balance,
                    2
                ),

                'income' => round((float) $income, 2),
                'expenses' => round((float) $expenses, 2),

                'investment_purchases' => round((float) $purchases, 2),
                'investment_sales' => round((float) $sales, 2),

                'cash_balance' => round($cashBalance, 2),

                'total_investment_cost' => round($totalCost, 2),
                'holdings_value' => round($holdingsValue, 2),
                'unrealized_gain_loss' => round($gainLoss, 2),

                'total_portfolio_value' => round(
                    $cashBalance + $holdingsValue,
                    2
                ),

                'holdings_count' => $holdings->count(),

                'instruments' => $instrumentSummary,
                'allocation' => $allocation,
            ],
        ]);
    }

    // Restrict access to the authenticated user's holdings.
    private function findUserHolding(
        Request $request,
        string $id
    ): Holding {
        return Holding::where('user_id', $request->user()->id)
            ->findOrFail($id);
    }
}
