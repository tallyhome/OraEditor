<?php

namespace Ora\Laravel\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Http;

class AiProxyController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $payload = $request->validate([
            'op' => 'required|string',
            'scope' => 'required|string',
            'fragments' => 'required|array',
        ]);

        $endpoint = config('services.openai.url', 'https://api.openai.com/v1/chat/completions');
        $key = config('services.openai.key');
        if (!$key) {
            return response()->json(['error' => 'Clé IA absente côté hôte'], 503);
        }

        $response = Http::withToken($key)->post($endpoint, [
            'model' => config('services.openai.model', 'gpt-4o-mini'),
            'messages' => [
                ['role' => 'system', 'content' => 'Transforme les fragments texte. Renvoie un JSON {patches:[{path,text}]}.'],
                ['role' => 'user', 'content' => json_encode($payload, JSON_THROW_ON_ERROR)],
            ],
        ]);

        return response()->json($response->json());
    }
}
