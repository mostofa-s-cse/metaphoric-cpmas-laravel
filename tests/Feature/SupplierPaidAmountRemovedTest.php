<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\ProjectSupplier;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SupplierPaidAmountRemovedTest extends TestCase
{
    use RefreshDatabase;

    private function makeProject(string $name = 'Test Project'): Project
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

    private function actingAsAdmin(): User
    {
        $user = User::create([
            'email' => 'admin@example.com',
            'passwordHash' => bcrypt('password'),
            'fullName' => 'Admin User',
            'role' => 'SUPER_ADMIN',
        ]);
        $this->actingAs($user);
        return $user;
    }

    public function test_supplier_create_ignores_paid_amount_input(): void
    {
        $this->actingAsAdmin();
        $project = $this->makeProject();

        $response = $this->postJson('/api/suppliers', [
            'name' => 'Ready Mix Co',
            'phoneNumber' => '555-9',
            'assignments' => [
                ['projectId' => $project->id, 'contractAmount' => 2000, 'paidAmount' => 1500],
            ],
        ]);

        $response->assertStatus(201);
        $response->assertJsonPath('data.supplier.currentDue', 2000);

        $ps = ProjectSupplier::where('projectId', $project->id)->first();
        $this->assertEquals(0.0, (float) $ps->paidAmount);
        $this->assertEquals(2000.0, (float) $ps->dueAmount);
    }

    public function test_supplier_update_without_assignments_does_not_touch_current_due(): void
    {
        $this->actingAsAdmin();
        $project = $this->makeProject();

        $supplier = Supplier::create(['name' => 'Ready Mix Co', 'phoneNumber' => '555-9', 'openingBalance' => 0, 'currentDue' => 600]);
        ProjectSupplier::create(['projectId' => $project->id, 'supplierId' => $supplier->id, 'contractAmount' => 2000, 'paidAmount' => 1400, 'dueAmount' => 600]);

        $response = $this->patchJson("/api/suppliers/{$supplier->id}", [
            'name' => 'Ready Mix Co Renamed',
        ]);

        $response->assertOk();
        $supplier->refresh();
        $this->assertEquals(600.0, (float) $supplier->currentDue);

        $ps = ProjectSupplier::where('supplierId', $supplier->id)->where('projectId', $project->id)->first();
        $this->assertEquals(1400.0, (float) $ps->paidAmount);
    }

    public function test_supplier_update_preserves_existing_paid_amount_on_assignment_edit(): void
    {
        $this->actingAsAdmin();
        $project = $this->makeProject();

        $supplier = Supplier::create(['name' => 'Ready Mix Co', 'phoneNumber' => '555-9', 'openingBalance' => 0, 'currentDue' => 600]);
        ProjectSupplier::create(['projectId' => $project->id, 'supplierId' => $supplier->id, 'contractAmount' => 2000, 'paidAmount' => 1400, 'dueAmount' => 600]);

        $response = $this->patchJson("/api/suppliers/{$supplier->id}", [
            'assignments' => [
                ['projectId' => $project->id, 'contractAmount' => 2200],
            ],
        ]);

        $response->assertOk();
        $ps = ProjectSupplier::where('supplierId', $supplier->id)->where('projectId', $project->id)->first();
        $this->assertEquals(1400.0, (float) $ps->paidAmount);
        $this->assertEquals(800.0, (float) $ps->dueAmount);

        $supplier->refresh();
        // currentDue was 600, contract total moved 2000 -> 2200 (delta +200), so 600 + 200 = 800.
        $this->assertEquals(800.0, (float) $supplier->currentDue);
    }
}
