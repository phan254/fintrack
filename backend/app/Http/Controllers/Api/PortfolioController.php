<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Portfolio;
use Illuminate\Http\Request;

class PortfolioController extends Controller
{
    // List portfolios belonging to the authenticated user
    public function index(Request $request)
    {
        $portfolios = Portfolio::where('user_id', $request->user()->id)
            ->withCount(['transactions', 'holdings'])
            ->latest()
            ->get();

        return response()->json([
            'message' => 'Portfolios retrieved successfully.',
            'data' => $portfolios,
        ]);
    }

    // Create a new portfolio
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'client_name' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'currency' => 'required|string|size:3',
            'initial_balance' => 'required|numeric|min:0',
        ]);

        $portfolio = Portfolio::create([
            ...$validated,
            'user_id' => $request->user()->id,
        ]);

        return response()->json([
            'message' => 'Portfolio created successfully.',
            'data' => $portfolio,
        ], 201);
    }

    // View one portfolio
    public function show(Request $request, string $id)
    {
        $portfolio = $this->findUserPortfolio($request, $id);

        $portfolio->load(['transactions', 'holdings']);

        return response()->json([
            'message' => 'Portfolio retrieved successfully.',
            'data' => $portfolio,
        ]);
    }

    // Update a portfolio
    public function update(Request $request, string $id)
    {
        $portfolio = $this->findUserPortfolio($request, $id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'client_name' => 'sometimes|nullable|string|max:255',
            'description' => 'sometimes|nullable|string',
            'currency' => 'sometimes|required|string|size:3',
            'initial_balance' => 'sometimes|required|numeric|min:0',
        ]);

        $portfolio->update($validated);

        return response()->json([
            'message' => 'Portfolio updated successfully.',
            'data' => $portfolio->fresh(),
        ]);
    }

    // Delete a portfolio
    public function destroy(Request $request, string $id)
    {
        $portfolio = $this->findUserPortfolio($request, $id);

        $portfolio->delete();

        return response()->json([
            'message' => 'Portfolio deleted successfully.',
        ]);
    }

    // Ensure users can only access their own portfolios
    private function findUserPortfolio(Request $request, string $id): Portfolio
    {
        return Portfolio::where('user_id', $request->user()->id)
            ->findOrFail($id);
    }
}
