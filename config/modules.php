<?php

/**
 * Single source of truth for the sidebar "modules" and their internal tabs.
 *
 * Drives: `permissions:sync` (creates a `module.view.{key}` permission per
 * module and a `module.tab.{key}.{tabKey}` permission per non-exempt tab),
 * the Roles & Permissions admin UI's checkbox tree, and the frontend
 * `usePermissions()` nav/tab filtering.
 *
 * `tabs.*.exempt = true` means the tab is never permission-gated (e.g. a
 * user's own Profile/Security settings) — always visible regardless of role.
 */

return [

    'dashboard' => [
        'label' => 'Dashboard',
        'route' => 'dashboard',
        'tabs'  => [],
    ],

    'projects' => [
        'label' => 'Projects',
        'route' => 'dashboard.projects',
        'tabs'  => [],
    ],

    'suppliers' => [
        'label' => 'Suppliers',
        'route' => 'dashboard.suppliers',
        'tabs'  => [],
    ],

    'vendor' => [
        'label' => 'Vendor',
        'route' => 'dashboard.vendors',
        'tabs'  => [],
    ],

    'employees' => [
        'label' => 'Office Management',
        'route' => 'dashboard.employees',
        'tabs'  => [
            'expense'   => ['label' => 'Expense'],
            'employees' => ['label' => 'Employees'],
            'salary'    => ['label' => 'Employee Salary'],
        ],
    ],

    'labour' => [
        'label' => 'Labour Management',
        'route' => 'dashboard.labour',
        'tabs'  => [
            'registry'    => ['label' => 'Labour Registry'],
            'attendance'  => ['label' => 'Daily Labor Attendance'],
            'wages'       => ['label' => 'Labour Wages'],
        ],
    ],

    'materials' => [
        'label' => 'Materials',
        'route' => 'dashboard.materials',
        'tabs'  => [],
    ],

    'transactions' => [
        'label' => 'Transactions',
        'route' => 'dashboard.transactions',
        'tabs'  => [
            'collections' => ['label' => 'Collections / Cash In'],
            'expenses'    => ['label' => 'Expenses / Cash Out'],
        ],
    ],

    'bank-accounts' => [
        'label' => 'Bank Accounts',
        'route' => 'dashboard.bank-accounts',
        'tabs'  => [],
    ],

    'documents' => [
        'label' => 'Documents',
        'route' => 'dashboard.documents',
        'tabs'  => [],
    ],

    'reports' => [
        'label' => 'Reports',
        'route' => 'dashboard.reports',
        'tabs'  => [
            'financial'  => ['label' => 'Financial Statement'],
            'projects'   => ['label' => 'Project Report'],
            'vendors'    => ['label' => 'Vendor Report'],
            'suppliers'  => ['label' => 'Supplier Report'],
            'materials'  => ['label' => 'Material Report'],
            'employees'  => ['label' => 'Employee Report'],
        ],
    ],

    'website' => [
        'label' => 'Website Management',
        'route' => 'dashboard.website',
        'tabs'  => [
            'settings'     => ['label' => 'General Settings'],
            'sections'     => ['label' => 'Hero Section'],
            'pageContent'  => ['label' => 'Page Content'],
            'services'     => ['label' => 'Services'],
            'portfolio'    => ['label' => 'Portfolio'],
            'team'         => ['label' => 'Team'],
            'trust'        => ['label' => 'Trust Badges'],
            'testimonials' => ['label' => 'Testimonials'],
            'faqs'         => ['label' => 'FAQs'],
        ],
    ],

    'users' => [
        'label' => 'User Management',
        'route' => 'dashboard.users',
        'tabs'  => [],
    ],

    'audit-logs' => [
        'label' => 'Audit Logs',
        'route' => 'dashboard.audit-logs',
        'tabs'  => [],
    ],

    'contacts' => [
        'label' => 'Contacts',
        'route' => 'dashboard.contacts',
        'tabs'  => [],
    ],

    'settings' => [
        'label' => 'Settings',
        'route' => 'dashboard.settings',
        'tabs'  => [
            'profile'  => ['label' => 'Profile', 'exempt' => true],
            'security' => ['label' => 'Security', 'exempt' => true],
            'smtp'     => ['label' => 'Email SMTP Config'],
            'about'    => ['label' => 'System Info', 'exempt' => true],
        ],
    ],

];
