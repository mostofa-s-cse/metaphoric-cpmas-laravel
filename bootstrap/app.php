<?php

use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Spatie\Permission\Exceptions\UnauthorizedException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->web(append: [
            \App\Http\Middleware\HandleInertiaRequests::class,
            \Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets::class,
        ]);

        $middleware->alias([
            'role' => \App\Http\Middleware\RoleMiddleware::class,
            'permission' => \Spatie\Permission\Middleware\PermissionMiddleware::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*'),
        );

        // Module/tab access denials (permission:module.view.X) on page routes
        // render the Inertia 403 page instead of Laravel's default error view.
        // /api/* requests skip this — shouldRenderJsonWhen above already turns
        // the same exception into a JSON 403 for those.
        $exceptions->render(function (UnauthorizedException|AuthorizationException $e, Request $request) {
            if ($request->is('api/*')) {
                return null;
            }

            return Inertia::render('Errors/403', ['message' => $e->getMessage()])
                ->toResponse($request)
                ->setStatusCode(403);
        });
    })->create();
