<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Deletes uploaded images/files no longer referenced by any record, every 7
// days. See App\Console\Commands\PruneUnusedMedia for what counts as unused.
Schedule::command('media:prune')->weekly();
