<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 1. Create Default Users for each role
        $roles = [
            ['email' => 'superadmin@cpmas.com', 'fullName' => 'Super Admin User', 'role' => 'SUPER_ADMIN'],
            ['email' => 'admin@cpmas.com', 'fullName' => 'Admin User', 'role' => 'ADMIN'],
            ['email' => 'accountant@cpmas.com', 'fullName' => 'Accountant User', 'role' => 'ACCOUNTANT'],
            ['email' => 'pm@cpmas.com', 'fullName' => 'Project Manager User', 'role' => 'PROJECT_MANAGER'],
            ['email' => 'operator@cpmas.com', 'fullName' => 'Data Entry Operator User', 'role' => 'DATA_ENTRY_OPERATOR'],
        ];

        // bcrypt with cost 10
        $passwordHash = Hash::make('Password123!', ['rounds' => 10]);

        foreach ($roles as $u) {
            User::updateOrCreate(
                ['email' => $u['email']],
                [
                    'fullName' => $u['fullName'],
                    'role' => $u['role'],
                    'passwordHash' => $passwordHash,
                ]
            );
        }

        // 2. Website CMS Seed Data (services, portfolio, team, trust badges, testimonials, FAQs)
        $this->call(WebsiteCmsSeeder::class);
    }
}
