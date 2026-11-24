
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('holdings', function (Blueprint $table) {
            $table->id();

            $table->foreignId('portfolio_id')
                ->constrained()
                ->cascadeOnDelete();

            $table->foreignId('user_id')
                ->constrained()
                ->cascadeOnDelete();

            $table->string('asset_name');
            $table->string('symbol')->nullable();

            $table->enum('asset_type', [
                'stock',
                'bond',
                'cash',
                'crypto',
                'other'
            ])->default('other');

            $table->decimal('quantity', 18, 6)->default(0);
            $table->decimal('purchase_price', 15, 2)->default(0);
            $table->decimal('current_price', 15, 2)->default(0);

            $table->timestamps();

            $table->index(['portfolio_id', 'asset_type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('holdings');
    }
};
