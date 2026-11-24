
<?php

use Illuminate\Support\Facades\Route;

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\PortfolioController;
use App\Http\Controllers\Api\TransactionController;
use App\Http\Controllers\Api\HoldingController;

// Authentication routes
Route::prefix('auth')->group(function () {

    Route::post('/register', [AuthController::class, 'register']);

    Route::post('/login', [AuthController::class, 'login']);

    Route::middleware('auth:sanctum')->group(function () {

        Route::get('/me', [AuthController::class, 'me']);

        Route::post('/logout', [AuthController::class, 'logout']);

    });

});

// Protected application routes
Route::middleware('auth:sanctum')->group(function () {

    // Portfolio management
    Route::apiResource('portfolios', PortfolioController::class);

        // Transaction management
    Route::apiResource('transactions', TransactionController::class);

    // Portfolio-specific transaction routes (Finnet assessment)
    Route::get(
        'portfolios/{portfolio}/transactions',
        [TransactionController::class, 'portfolioIndex']
    );

    Route::post(
        'portfolios/{portfolio}/transactions',
        [TransactionController::class, 'portfolioStore']
    );

    // Investment holdings
    Route::apiResource('holdings', HoldingController::class);

    // Portfolio investment summary
    Route::get(
        'portfolios/{portfolio}/summary',
        [HoldingController::class, 'summary']
    );

});
