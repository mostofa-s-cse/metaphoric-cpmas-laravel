<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\ProjectSupplier;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SupplierProjectFilterTest extends TestCase
{
    use RefreshDatabase;

    private function makeProject(string $name): Project
    {
        return Project::create([
            'name' => $name,
            'code' => strtoupper(substr(md5($name . microtime()), 0, 8)),
            'clientName' => 'Acme Co',
            'clientContactNumber' => '555-0100',
            'projectLocation' => 'Test City',
            'startDate' => now(),
            'expectedCompletionDate' => now()->addMonths(6),
            'estimatedBudget' => 100000,
            'status' => 'RUNNING',
        ]);
    }

    public function test_project_filter_only_returns_assigned_suppliers(): void
    {
        $user = User::create([
            'email' => 'admin@example.com', 'passwordHash' => bcrypt('password'),
            'fullName' => 'Admin', 'role' => 'SUPER_ADMIN',
        ]);
        $this->actingAs($user);

        $projectA = $this->makeProject('Project A');
        $projectB = $this->makeProject('Project B');

        $supplierAssignedToA = Supplier::create(['name' => 'Assigned Supplier', 'phoneNumber' => '555-1']);
        $supplierAssignedToB = Supplier::create(['name' => 'Other Supplier', 'phoneNumber' => '555-2']);

        ProjectSupplier::create([
            'projectId' => $projectA->id, 'supplierId' => $supplierAssignedToA->id,
            'contractAmount' => 1000, 'paidAmount' => 0, 'dueAmount' => 1000,
        ]);
        ProjectSupplier::create([
            'projectId' => $projectB->id, 'supplierId' => $supplierAssignedToB->id,
            'contractAmount' => 500, 'paidAmount' => 0, 'dueAmount' => 500,
        ]);

        $response = $this->getJson('/api/suppliers?projectId=' . $projectA->id);

        $response->assertOk();
        $names = collect($response->json('data.suppliers'))->pluck('name')->all();
        $this->assertContains('Assigned Supplier', $names);
        $this->assertNotContains('Other Supplier', $names);
    }

    public function test_no_project_filter_returns_all_suppliers(): void
    {
        $user = User::create([
            'email' => 'admin2@example.com', 'passwordHash' => bcrypt('password'),
            'fullName' => 'Admin', 'role' => 'SUPER_ADMIN',
        ]);
        $this->actingAs($user);

        Supplier::create(['name' => 'Supplier One', 'phoneNumber' => '555-1']);
        Supplier::create(['name' => 'Supplier Two', 'phoneNumber' => '555-2']);

        $response = $this->getJson('/api/suppliers');

        $response->assertOk();
        $this->assertCount(2, $response->json('data.suppliers'));
    }
}
