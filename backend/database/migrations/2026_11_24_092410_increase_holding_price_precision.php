
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('holdings', function (Blueprint $table) {
            $table->decimal('purchase_price', 15, 4)->change();
            $table->decimal('current_price', 15, 4)->change();
        });
    }

    public function down(): void
    {
        Schema::table('holdings', function (Blueprint $table) {
            $table->decimal('purchase_price', 15, 2)->change();
            $table->decimal('current_price', 15, 2)->change();
        });
    }
};
