<div
    class="ora-laravel"
    @if(isset($wireModel))
        wire:ignore
    @endif
>
    <div id="{{ $id ?? 'ora-editor' }}"></div>
</div>

@once
    <link rel="stylesheet" href="{{ asset('vendor/ora-editor/ora-editor.css') }}">
    <script src="{{ asset('vendor/ora-editor/ora-editor.js') }}"></script>
@endonce

<script>
    document.addEventListener('DOMContentLoaded', function () {
        const editor = new OraEditor({
            element: '#{{ $id ?? "ora-editor" }}',
            preset: '{{ $preset ?? "full" }}',
            toolbar: true,
            content: @json($content ?? ''),
            uploadImage: async function (file) {
                const body = new FormData();
                body.append('file', file);
                const res = await fetch('{{ $uploadUrl ?? url("/ora-editor/upload") }}', {
                    method: 'POST',
                    headers: { 'X-CSRF-TOKEN': '{{ csrf_token() }}' },
                    body,
                });
                return res.json();
            },
            aiProxyUrl: '{{ $aiProxyUrl ?? url("/ora-editor/ai") }}',
        });
        @if(isset($wireModel))
        editor.on('change', function () {
            @this.set('{{ $wireModel }}', editor.getJSON());
        });
        @endif
        window.{{ $jsVar ?? "oraEditor" }} = editor;
    });
</script>
