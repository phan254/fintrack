
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('portfolios', function (Blueprint $table) {
            $table->string('client_name')->nullable()->after('name');
        });

        Schema::table('transactions', function (Blueprint $table) {
            $table->string('instrument')->nullable()->after('name');
            $table->decimal('quantity', 18, 6)->nullable();
            $table->decimal('unit_price', 15, 4)->nullable();
            $table->date('trade_date')->nullable();

            $table->index(
                ['portfolio_id', 'instrument', 'trade_date'],
                'transactions_portfolio_instrument_trade_date_index'
            );
        });
    }

    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropIndex(
                'transactions_portfolio_instrument_trade_date_index'
            );

            $table->dropColumn([
                'instrument',
                'quantity',
                'unit_price',
                'trade_date',
            ]);
        });

        Schema::table('portfolios', function (Blueprint $table) {
            $table->dropColumn('client_name');
        });
    }
};
