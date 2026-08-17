<?php

namespace Ora\Laravel;

use Illuminate\Support\ServiceProvider;

class OraEditorServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->loadViewsFrom(__DIR__.'/../resources/views', 'ora');
        $this->publishes([
            __DIR__.'/../resources/views' => resource_path('views/vendor/ora'),
        ], 'ora-views');
        $this->publishes([
            dirname(__DIR__, 2).'/core/dist' => public_path('vendor/ora-editor'),
        ], 'ora-assets');
    }
}
