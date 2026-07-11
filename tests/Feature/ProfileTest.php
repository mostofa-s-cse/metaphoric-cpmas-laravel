<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * Profile-related tests adapted for the CPMAS user schema.
 * CPMAS uses `fullName` and `passwordHash` columns instead of `name` and `password`.
 * The app does not expose a public /profile route; account management is in the dashboard.
 */
class ProfileTest extends TestCase
{
    use RefreshDatabase;

    /** Dashboard is reachable while authenticated. */
    public function test_authenticated_user_can_reach_dashboard(): void
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->get('/dashboard');

        $response->assertOk();
    }

    /** User factory creates a user with the correct CPMAS attributes. */
    public function test_user_factory_creates_valid_user(): void
    {
        $user = User::factory()->create();

        $this->assertNotEmpty($user->fullName);
        $this->assertNotEmpty($user->email);
        $this->assertTrue(Hash::check('password', $user->passwordHash));
        $this->assertNotEmpty($user->role);
    }

    /** User can be deleted from the database. */
    public function test_user_can_be_deleted(): void
    {
        $user = User::factory()->create();
        $userId = $user->id;

        $user->delete();

        $this->assertNull(User::find($userId));
    }
}
