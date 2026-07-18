<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\ProjectSupplier;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class VendorSupplierSyncTest extends TestCase
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

    public function test_supplier_payment_cash_out_updates_project_supplier_row(): void
    {
        $this->actingAsAdmin();
        $project = $this->makeProject();
        $supplier = Supplier::create(['name' => 'ACME Supply', 'phoneNumber' => '555-1']);
        ProjectSupplier::create([
            'projectId' => $project->id, 'supplierId' => $supplier->id,
            'contractAmount' => 1000, 'paidAmount' => 0, 'dueAmount' => 1000,
        ]);

        // Fund the project so the SUPPLIER_PAYMENT (project-wise) has balance.
        \App\Models\CashIn::create([
            'date' => now(), 'projectId' => $project->id, 'clientName' => 'Client A',
            'amount' => 5000, 'paymentMethod' => 'CASH', 'bankOrCash' => 'Cash Box', 'source' => 'CLIENT_PAYMENT',
        ]);

        $response = $this->postJson('/api/transactions/cash-out', [
            'date' => now()->toDateString(),
            'projectId' => $project->id,
            'expenseCategory' => 'SUPPLIER_PAYMENT',
            'paidTo' => 'ACME Supply',
            'amount' => 400,
            'paymentMethod' => 'CASH',
            'supplierId' => $supplier->id,
        ]);

        $response->assertStatus(201);

        $supplier->refresh();
        $this->assertEquals(-400.0, (float) $supplier->currentDue);

        $projectSupplier = ProjectSupplier::where('supplierId', $supplier->id)
            ->where('projectId', $project->id)->first();
        $this->assertEquals(400.0, (float) $projectSupplier->paidAmount);
        $this->assertEquals(600.0, (float) $projectSupplier->dueAmount);
    }
}
