<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\WebsiteSection;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WebsiteSectionSeedingTest extends TestCase
{
    use RefreshDatabase;

    private function actingAsAdmin(): User
    {
        $user = User::create([
            'email' => 'admin@example.com',
            'passwordHash' => bcrypt('password'),
            'fullName' => 'Admin User',
            'role' => 'ADMIN',
        ]);
        $this->actingAs($user);
        return $user;
    }

    private const NEW_PAGE_CONTENT_KEYS = [
        'CONTACT_HERO',
        'FOOTER_CTA',
        'SERVICES_HERO',
        'SERVICES_APPROACH',
        'SERVICES_SHOW_CTA',
        'PORTFOLIO_HERO',
        'PORTFOLIO_SHOW_CTA',
        'TEAM_HERO',
        'TEAM_SHOW_QUOTE',
    ];

    public function test_publicData_seeds_all_defaults_on_a_fresh_database(): void
    {
        $response = $this->getJson('/api/website/public');

        $response->assertOk();

        foreach (array_merge(['HERO', 'ABOUT_FIRM'], self::NEW_PAGE_CONTENT_KEYS) as $key) {
            $this->assertDatabaseHas('website_sections', ['sectionKey' => $key]);
        }
    }

    public function test_publicData_backfills_new_keys_on_a_database_that_already_has_hero_and_about_firm(): void
    {
        WebsiteSection::create(['sectionKey' => 'HERO', 'title' => 'Existing', 'isActive' => true]);
        WebsiteSection::create(['sectionKey' => 'ABOUT_FIRM', 'title' => 'Existing', 'isActive' => true]);

        $this->getJson('/api/website/public')->assertOk();

        foreach (self::NEW_PAGE_CONTENT_KEYS as $key) {
            $this->assertDatabaseHas('website_sections', ['sectionKey' => $key]);
        }

        // Pre-existing rows must not be overwritten by the backfill.
        $this->assertDatabaseHas('website_sections', ['sectionKey' => 'HERO', 'title' => 'Existing']);
    }

    public function test_upsertSection_round_trips_extraData_items_array(): void
    {
        $this->actingAsAdmin();

        $items = [
            ['title' => 'Card One', 'description' => 'First card'],
            ['title' => 'Card Two', 'description' => 'Second card'],
        ];

        $response = $this->postJson('/api/website/sections', [
            'sectionKey' => 'SERVICES_APPROACH',
            'title' => 'Our Approach',
            'extraData' => ['items' => $items],
        ]);

        $response->assertOk();

        $section = WebsiteSection::where('sectionKey', 'SERVICES_APPROACH')->first();

        $this->assertNotNull($section);
        $this->assertSame($items, $section->extraData['items']);
    }
}
