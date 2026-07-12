<?php

namespace App\Console\Commands;

use App\Models\Document;
use App\Models\WebsitePortfolio;
use App\Models\WebsiteService;
use App\Models\WebsiteSettings;
use App\Models\WebsiteTeam;
use App\Models\WebsiteTrustBadge;
use App\Models\WebsiteSection;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

/**
 * Every image uploaded via POST /api/upload lands in public/uploads and its
 * URL is only saved onto a real record when the user clicks Save (see
 * DocumentController::upload + the various Website CMS tabs). If a user
 * picks a file and never saves — closes the modal, navigates away — that
 * file is now an orphan nobody references. This command deletes any such
 * orphan once it's old enough that it can't still be a pending, unsaved
 * upload from a form that's still open in someone's browser.
 */
class PruneUnusedMedia extends Command
{
    protected $signature = 'media:prune {--dry-run : List what would be deleted without deleting anything}';

    protected $description = 'Delete uploaded files in public/uploads that are no longer referenced by any record';

    /** Minimum file age before it's even considered for deletion. */
    const MIN_AGE_HOURS = 48;

    public function handle(): int
    {
        $directory = public_path('uploads');

        if (!is_dir($directory)) {
            $this->info('No uploads directory found, nothing to prune.');
            return self::SUCCESS;
        }

        $referenced = $this->referencedFilenames();
        $cutoff = time() - self::MIN_AGE_HOURS * 3600;

        $deleted = [];
        $kept = 0;

        foreach (scandir($directory) as $filename) {
            if ($filename === '.' || $filename === '..' || $filename === '.gitkeep') {
                continue;
            }

            $path = $directory . DIRECTORY_SEPARATOR . $filename;
            if (!is_file($path)) {
                continue;
            }

            if (in_array($filename, $referenced, true)) {
                $kept++;
                continue;
            }

            if (filemtime($path) > $cutoff) {
                // Too young — could still be a pending upload for a form
                // that's open right now. Leave it for next run.
                $kept++;
                continue;
            }

            if ($this->option('dry-run')) {
                $deleted[] = $filename;
                continue;
            }

            if (@unlink($path)) {
                $deleted[] = $filename;
            }
        }

        if ($this->option('dry-run')) {
            $this->info(count($deleted) . ' file(s) would be deleted (dry run), ' . $kept . ' kept.');
        } else {
            $this->info(count($deleted) . ' orphaned file(s) deleted, ' . $kept . ' kept.');
        }

        foreach ($deleted as $filename) {
            $this->line('  - ' . $filename);
        }

        if (!empty($deleted) && !$this->option('dry-run')) {
            Log::info('media:prune deleted ' . count($deleted) . ' orphaned upload(s)', ['files' => $deleted]);
        }

        return self::SUCCESS;
    }

    /**
     * Every filename (basename of a /uploads/... URL) currently referenced
     * by a real record, across every model that can hold an uploaded
     * file/image URL.
     */
    private function referencedFilenames(): array
    {
        $urls = [];

        foreach (Document::pluck('url') as $url) {
            $urls[] = $url;
        }

        foreach (WebsiteSection::query()->get(['imageUrl', 'videoUrl']) as $section) {
            $urls[] = $section->imageUrl;
            $urls[] = $section->videoUrl;
        }

        foreach (WebsiteService::pluck('imageUrl') as $url) {
            $urls[] = $url;
        }

        foreach (WebsiteTeam::pluck('imageUrl') as $url) {
            $urls[] = $url;
        }

        foreach (WebsiteTrustBadge::pluck('imageUrl') as $url) {
            $urls[] = $url;
        }

        foreach (WebsitePortfolio::query()->get(['coverImage', 'beforeImage', 'afterImage', 'images']) as $portfolio) {
            $urls[] = $portfolio->coverImage;
            $urls[] = $portfolio->beforeImage;
            $urls[] = $portfolio->afterImage;
            foreach ((array) $portfolio->images as $img) {
                $urls[] = $img;
            }
        }

        $brandInfo = WebsiteSettings::where('key', 'BRAND_INFO')->first()?->value ?? [];
        $urls[] = $brandInfo['logoUrl'] ?? null;
        $urls[] = $brandInfo['faviconUrl'] ?? null;

        return collect($urls)
            ->filter(fn ($url) => is_string($url) && str_starts_with($url, '/uploads/'))
            ->map(fn ($url) => basename($url))
            ->unique()
            ->values()
            ->all();
    }
}
