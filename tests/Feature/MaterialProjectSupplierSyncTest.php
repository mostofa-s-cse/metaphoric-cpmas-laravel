<?php

namespace Tests\Feature;

use App\Models\CashIn;
use App\Models\Project;
use App\Models\ProjectSupplier;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MaterialProjectSupplierSyncTest extends TestCase
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

    public function test_material_purchase_updates_project_supplier_paid_and_due(): void
    {
        $this->actingAsAdmin();
        $project = $this->makeProject();
        // Mirrors SupplierController::store(), which seeds currentDue from the
        // assigned contract total at creation time.
        $supplier = Supplier::create(['name' => 'Mohammad Mostofa', 'phoneNumber' => '555-1', 'currentDue' => 200]);
        ProjectSupplier::create([
            'projectId' => $project->id, 'supplierId' => $supplier->id,
            'contractAmount' => 200, 'paidAmount' => 0, 'dueAmount' => 200,
        ]);

        CashIn::create([
            'date' => now(), 'projectId' => $project->id, 'clientName' => 'Client A',
            'amount' => 5000, 'paymentMethod' => 'CASH', 'bankOrCash' => 'Cash Box', 'source' => 'CLIENT_PAYMENT',
        ]);

        $makePurchase = fn (string $invoice) => $this->postJson('/api/materials', [
            'name' => 'Demo', 'category' => 'General', 'quantity' => 20, 'unit' => 'pcs',
            'unitPrice' => 10, 'supplierId' => $supplier->id, 'projectId' => $project->id,
            'purchaseDate' => now()->toDateString(), 'invoiceNumber' => $invoice,
        ]);

        $makePurchase('0990')->assertStatus(201);
        $makePurchase('8998')->assertStatus(201);

        $projectSupplier = ProjectSupplier::where('supplierId', $supplier->id)
            ->where('projectId', $project->id)->first();

        // Two $200 purchases, both auto-paid via cash, against a $200 contract:
        // paid tracks the full $400 actually disbursed, due reflects the overpayment.
        $this->assertEquals(400.0, (float) $projectSupplier->paidAmount);
        $this->assertEquals(-200.0, (float) $projectSupplier->dueAmount);

        // currentDue started at 200 (the contract) and both purchases were
        // paid in cash on the spot, so it nets down by the full $400 paid.
        $supplier->refresh();
        $this->assertEquals(-200.0, (float) $supplier->currentDue);
    }
}
