<?php

namespace Tests\Feature;

use App\Models\Portfolio;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class InvestmentApiTest extends TestCase
{
    use RefreshDatabase;

    private function makeUser(): User
    {
        return User::create([
            'name' => 'Test Investor',
            'email' => uniqid('investor_', true) . '@example.test',
            'password' => 'TestPassword@2026',
        ]);
    }

    private function makePortfolio(
        User $user,
        float $initialBalance = 1000
    ): Portfolio {
        return Portfolio::create([
            'user_id' => $user->id,
            'name' => 'Test Investment Portfolio',
            'client_name' => 'Test Client',
            'currency' => 'KES',
            'initial_balance' => $initialBalance,
        ]);
    }

    private function buy(
        int $portfolioId,
        string $instrument = 'KCB',
        float $quantity = 10,
        float $unitPrice = 42.5
    ) {
        return $this->postJson('/api/transactions', [
            'portfolio_id' => $portfolioId,
            'type' => 'buy',
            'instrument' => $instrument,
            'quantity' => $quantity,
            'unit_price' => $unitPrice,
            'trade_date' => '2026-11-24',
        ]);
    }

    public function test_unauthenticated_users_cannot_access_portfolios(): void
    {
        $this->getJson('/api/portfolios')
            ->assertUnauthorized();
    }

    public function test_authenticated_user_can_create_a_portfolio(): void
    {
        $user = $this->makeUser();

        Sanctum::actingAs($user);

        $response = $this->postJson('/api/portfolios', [
            'name' => 'Long Term Investments',
            'client_name' => 'Test Client',
            'currency' => 'KES',
            'initial_balance' => 50000,
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('data.name', 'Long Term Investments')
            ->assertJsonPath('data.currency', 'KES');

        $this->assertDatabaseHas('portfolios', [
            'user_id' => $user->id,
            'name' => 'Long Term Investments',
        ]);
    }

    public function test_users_cannot_access_another_users_portfolio(): void
    {
        $owner = $this->makeUser();
        $anotherUser = $this->makeUser();

        $portfolio = $this->makePortfolio($owner);

        Sanctum::actingAs($anotherUser);

        $this->getJson('/api/portfolios/' . $portfolio->id)
            ->assertNotFound();
    }

    public function test_buying_investments_updates_weighted_average_cost(): void
    {
        $user = $this->makeUser();

        Sanctum::actingAs($user);

        $portfolio = $this->makePortfolio($user);

        $this->buy($portfolio->id, 'KCB', 10, 42.5)
            ->assertCreated();

        $this->buy($portfolio->id, 'KCB', 10, 47.5)
            ->assertCreated();

        $this->assertDatabaseHas('holdings', [
            'portfolio_id' => $portfolio->id,
            'user_id' => $user->id,
            'symbol' => 'KCB',
        ]);

        $holding = $portfolio->holdings()->firstOrFail();

        $this->assertEquals(20, (float) $holding->quantity);
        $this->assertEquals(45, (float) $holding->purchase_price);
        $this->assertEquals(47.5, (float) $holding->current_price);

        $this->assertDatabaseCount('transactions', 2);
    }

    public function test_selling_updates_quantity_and_rejects_excess_sales(): void
    {
        $user = $this->makeUser();

        Sanctum::actingAs($user);

        $portfolio = $this->makePortfolio($user);

        $this->buy($portfolio->id, 'KCB', 10, 42.5)
            ->assertCreated();

        $this->postJson('/api/transactions', [
            'portfolio_id' => $portfolio->id,
            'type' => 'sell',
            'instrument' => 'KCB',
            'quantity' => 2,
            'unit_price' => 45,
            'trade_date' => '2026-11-24',
        ])->assertCreated();

        $holding = $portfolio->holdings()->firstOrFail();

        $this->assertEquals(8, (float) $holding->quantity);

        $this->postJson('/api/transactions', [
            'portfolio_id' => $portfolio->id,
            'type' => 'sell',
            'instrument' => 'KCB',
            'quantity' => 9,
            'unit_price' => 45,
            'trade_date' => '2026-11-24',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['quantity']);

        $holding->refresh();

        $this->assertEquals(8, (float) $holding->quantity);

        // The rejected sale must not create another transaction.
        $this->assertDatabaseCount('transactions', 2);
    }

    public function test_unknown_instruments_are_rejected(): void
    {
        $user = $this->makeUser();

        Sanctum::actingAs($user);

        $portfolio = $this->makePortfolio($user);

        $this->buy($portfolio->id, 'UNKNOWN', 10, 20)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['instrument']);

        $this->assertDatabaseCount('transactions', 0);
        $this->assertDatabaseCount('holdings', 0);
    }

    public function test_portfolio_summary_calculates_investment_values(): void
    {
        $user = $this->makeUser();

        Sanctum::actingAs($user);

        $portfolio = $this->makePortfolio($user, 1000);

        $this->buy($portfolio->id, 'KCB', 10, 42.5)
            ->assertCreated();

        $response = $this->getJson(
            '/api/portfolios/' . $portfolio->id . '/summary'
        );

        $response->assertOk();

        $summary = $response->json('data');

        $this->assertEquals(1000, $summary['initial_balance']);
        $this->assertEquals(425, $summary['investment_purchases']);
        $this->assertEquals(575, $summary['cash_balance']);
        $this->assertEquals(425, $summary['total_investment_cost']);
        $this->assertEquals(425, $summary['holdings_value']);
        $this->assertEquals(1000, $summary['total_portfolio_value']);
        $this->assertEquals(1, $summary['holdings_count']);
    }

    public function test_deleting_a_buy_recalculates_the_holding(): void
    {
        $user = $this->makeUser();

        Sanctum::actingAs($user);

        $portfolio = $this->makePortfolio($user);

        $firstBuy = $this->buy($portfolio->id, 'KCB', 10, 40)
            ->assertCreated()
            ->json('data.id');

        $this->buy($portfolio->id, 'KCB', 10, 50)
            ->assertCreated();

        $holding = $portfolio->holdings()->firstOrFail();

        $this->assertEquals(20, (float) $holding->quantity);
        $this->assertEquals(45, (float) $holding->purchase_price);

        $this->deleteJson('/api/transactions/' . $firstBuy)
            ->assertOk()
            ->assertJson([
                'message' => 'Transaction deleted successfully.',
            ]);

        $holding->refresh();

        $this->assertEquals(10, (float) $holding->quantity);
        $this->assertEquals(50, (float) $holding->purchase_price);

        $this->assertDatabaseMissing('transactions', [
            'id' => $firstBuy,
        ]);

        $this->assertDatabaseCount('transactions', 1);
    }

    public function test_deleting_a_sell_restores_the_holding_quantity(): void
    {
        $user = $this->makeUser();

        Sanctum::actingAs($user);

        $portfolio = $this->makePortfolio($user);

        $this->buy($portfolio->id, 'KCB', 10, 40)
            ->assertCreated();

        $sellId = $this->postJson('/api/transactions', [
            'portfolio_id' => $portfolio->id,
            'type' => 'sell',
            'instrument' => 'KCB',
            'quantity' => 3,
            'unit_price' => 45,
            'trade_date' => '2026-11-24',
        ])
            ->assertCreated()
            ->json('data.id');

        $holding = $portfolio->holdings()->firstOrFail();

        $this->assertEquals(7, (float) $holding->quantity);

        $this->deleteJson('/api/transactions/' . $sellId)
            ->assertOk();

        $holding->refresh();

        $this->assertEquals(10, (float) $holding->quantity);
        $this->assertEquals(40, (float) $holding->purchase_price);

        $this->assertDatabaseMissing('transactions', [
            'id' => $sellId,
        ]);
    }

    public function test_deleting_a_buy_is_rejected_when_it_would_leave_an_excess_sale(): void
    {
        $user = $this->makeUser();

        Sanctum::actingAs($user);

        $portfolio = $this->makePortfolio($user);

        $buyId = $this->buy($portfolio->id, 'KCB', 10, 40)
            ->assertCreated()
            ->json('data.id');

        $this->buy($portfolio->id, 'KCB', 5, 45)
            ->assertCreated();

        $this->postJson('/api/transactions', [
            'portfolio_id' => $portfolio->id,
            'type' => 'sell',
            'instrument' => 'KCB',
            'quantity' => 12,
            'unit_price' => 50,
            'trade_date' => '2026-11-24',
        ])->assertCreated();

        $this->deleteJson('/api/transactions/' . $buyId)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['transaction']);

        $this->assertDatabaseHas('transactions', [
            'id' => $buyId,
        ]);

        $holding = $portfolio->holdings()->firstOrFail();

        $this->assertEquals(3, (float) $holding->quantity);
    }

}
