<?php

namespace App\Providers;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Vite::prefetch(concurrency: 3);

        // This app's DB columns and relation names are camelCase throughout.
        // Eloquent snake_cases relation keys (not plain columns) when arrays/JSON
        // are built, so e.g. Supplier::projectAssignments() serialized as
        // "project_assignments" — silently breaking every frontend read of
        // camelCase relation keys (projectAssignments, cashOuts, cashIns, etc).
        Model::$snakeAttributes = false;
    }
}
