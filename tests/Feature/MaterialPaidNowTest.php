<?php

namespace Tests\Feature;

use App\Models\CashIn;
use App\Models\CashOut;
use App\Models\Project;
use App\Models\ProjectSupplier;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MaterialPaidNowTest extends TestCase
{
    use RefreshDatabase;

    private function makeProject(): Project
    {
        return Project::create([
            'name' => 'Project B',
            'code' => 'PRO_B',
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

    private function makeSupplier(Project $project, float $contract = 200): Supplier
    {
        $supplier = Supplier::create(['name' => 'ACME Supply', 'phoneNumber' => '555-1', 'currentDue' => $contract]);
        ProjectSupplier::create([
            'projectId' => $project->id, 'supplierId' => $supplier->id,
            'contractAmount' => $contract, 'paidAmount' => 0, 'dueAmount' => $contract,
        ]);

        return $supplier;
    }

    public function test_credit_purchase_increases_due_without_creating_a_cash_out_or_touching_paid(): void
    {
        $this->actingAsAdmin();
        $project = $this->makeProject();
        $supplier = $this->makeSupplier($project, 200);

        $response = $this->postJson('/api/materials', [
            'name' => 'Demo', 'category' => 'General', 'quantity' => 20, 'unit' => 'pcs',
            'unitPrice' => 10, 'supplierId' => $supplier->id, 'projectId' => $project->id,
            'purchaseDate' => now()->toDateString(), 'invoiceNumber' => '0990',
            'paidNow' => false,
        ]);

        $response->assertStatus(201);
        $materialId = $response->json('data.material.id');

        $this->assertEquals(0, CashOut::where('materialId', $materialId)->count());

        $projectSupplier = ProjectSupplier::where('supplierId', $supplier->id)
            ->where('projectId', $project->id)->first();
        $this->assertEquals(0.0, (float) $projectSupplier->paidAmount);
        $this->assertEquals(400.0, (float) $projectSupplier->dueAmount);

        $supplier->refresh();
        $this->assertEquals(400.0, (float) $supplier->currentDue);
    }

    public function test_credit_purchase_does_not_require_project_cash_balance(): void
    {
        $this->actingAsAdmin();
        $project = $this->makeProject();
        $supplier = $this->makeSupplier($project, 200);
        // No CashIn funded for this project — a paidNow purchase would be rejected.

        $response = $this->postJson('/api/materials', [
            'name' => 'Demo', 'category' => 'General', 'quantity' => 20, 'unit' => 'pcs',
            'unitPrice' => 10, 'supplierId' => $supplier->id, 'projectId' => $project->id,
            'purchaseDate' => now()->toDateString(), 'invoiceNumber' => '0990',
            'paidNow' => false,
        ]);

        $response->assertStatus(201);
    }

    public function test_editing_a_credit_purchase_to_paid_creates_cash_out_and_moves_due_to_paid(): void
    {
        $this->actingAsAdmin();
        $project = $this->makeProject();
        $supplier = $this->makeSupplier($project, 200);

        CashIn::create([
            'date' => now(), 'projectId' => $project->id, 'clientName' => 'Client A',
            'amount' => 5000, 'paymentMethod' => 'CASH', 'bankOrCash' => 'Cash Box', 'source' => 'CLIENT_PAYMENT',
        ]);

        $created = $this->postJson('/api/materials', [
            'name' => 'Demo', 'category' => 'General', 'quantity' => 20, 'unit' => 'pcs',
            'unitPrice' => 10, 'supplierId' => $supplier->id, 'projectId' => $project->id,
            'purchaseDate' => now()->toDateString(), 'invoiceNumber' => '0990',
            'paidNow' => false,
        ]);
        $materialId = $created->json('data.material.id');

        $update = $this->patchJson("/api/materials/{$materialId}", ['paidNow' => true]);
        $update->assertStatus(200);

        $this->assertEquals(1, CashOut::where('materialId', $materialId)->count());

        $projectSupplier = ProjectSupplier::where('supplierId', $supplier->id)
            ->where('projectId', $project->id)->first();
        $this->assertEquals(200.0, (float) $projectSupplier->paidAmount);
        $this->assertEquals(0.0, (float) $projectSupplier->dueAmount);

        $supplier->refresh();
        $this->assertEquals(0.0, (float) $supplier->currentDue);
    }

    public function test_deleting_a_credit_purchase_reverses_the_due_increase(): void
    {
        $this->actingAsAdmin();
        $project = $this->makeProject();
        $supplier = $this->makeSupplier($project, 200);

        $created = $this->postJson('/api/materials', [
            'name' => 'Demo', 'category' => 'General', 'quantity' => 20, 'unit' => 'pcs',
            'unitPrice' => 10, 'supplierId' => $supplier->id, 'projectId' => $project->id,
            'purchaseDate' => now()->toDateString(), 'invoiceNumber' => '0990',
            'paidNow' => false,
        ]);
        $materialId = $created->json('data.material.id');

        $this->deleteJson("/api/materials/{$materialId}")->assertStatus(200);

        $projectSupplier = ProjectSupplier::where('supplierId', $supplier->id)
            ->where('projectId', $project->id)->first();
        $this->assertEquals(0.0, (float) $projectSupplier->paidAmount);
        $this->assertEquals(200.0, (float) $projectSupplier->dueAmount);

        $supplier->refresh();
        $this->assertEquals(200.0, (float) $supplier->currentDue);
    }
}
