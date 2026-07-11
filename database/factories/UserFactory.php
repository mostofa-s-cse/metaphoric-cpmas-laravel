<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    /**
     * The current password being used by the factory.
     */
    protected static ?string $password;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'fullName' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'passwordHash' => static::$password ??= Hash::make('password'),
            'role' => 'DATA_ENTRY_OPERATOR',
            'remember_token' => Str::random(10),
        ];
    }

}
