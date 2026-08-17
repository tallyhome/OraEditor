<?php

namespace Ora\Laravel\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Storage;

class UploadController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $file = $request->file('file');
        if (!$file) {
            return response()->json(['error' => 'Fichier manquant'], 422);
        }

        $path = $file->store('ora-editor', 'public');

        return response()->json([
            'url' => Storage::disk('public')->url($path),
            'alt' => $file->getClientOriginalName(),
        ]);
    }
}
